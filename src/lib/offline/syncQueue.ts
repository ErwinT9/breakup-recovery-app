import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { STORAGE_KEYS, storage } from "@/lib/native/storage";

import { isOnline, subscribeNetwork } from "./network";

export type SyncTable =
  | "profiles"
  | "streaks"
  | "questionnaire_answers"
  | "flags"
  | "wins"
  | "badges"
  | "letters"
  | "daily_promises"
  | "pictures"
  | "affirmations"
  | "rituals"
  | "triggers"
  | "journal_entries";

export type QueueItem = {
  id: string;
  table: SyncTable;
  op: "upsert" | "delete";
  payload: Record<string, unknown>;
  onConflict?: string;
  attempts: number;
  createdAt: string;
};

const MAX_ATTEMPTS = 8;

type Listener = (pending: number) => void;
const listeners = new Set<Listener>();

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readQueue(): Promise<QueueItem[]> {
  return storage.get<QueueItem[]>(STORAGE_KEYS.syncQueue, []);
}

async function writeQueue(items: QueueItem[]): Promise<void> {
  await storage.set(STORAGE_KEYS.syncQueue, items);
  listeners.forEach((listener) => listener(items.length));
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length;
}

export async function enqueue(item: Omit<QueueItem, "attempts" | "createdAt">): Promise<void> {
  const queue = await readQueue();
  const deduped = queue.filter((entry) => !(entry.id === item.id && entry.table === item.table));
  deduped.push({ ...item, attempts: 0, createdAt: new Date().toISOString() });
  await writeQueue(deduped);
  void flushQueue();
}

let flushing = false;

/** Drains queued mutations. Safe to call often — it no-ops while offline. */
export async function flushQueue(): Promise<void> {
  if (flushing || !isOnline()) return;
  const queue = await readQueue();
  if (queue.length === 0) return;

  flushing = true;
  const remaining: QueueItem[] = [];

  try {
    for (const item of queue) {
      try {
        const query = supabase.from(item.table);
        const { error } =
          item.op === "delete"
            ? await query.delete().eq("id", item.id)
            : await query.upsert(item.payload as never, {
                onConflict: item.onConflict ?? "id",
              });
        if (error) throw error;
      } catch (error) {
        const attempts = item.attempts + 1;
        analytics.error(error, { stage: "sync_flush", table: item.table, attempts });
        if (attempts < MAX_ATTEMPTS) remaining.push({ ...item, attempts });
        if (!isOnline()) {
          remaining.push(...queue.slice(queue.indexOf(item) + 1));
          break;
        }
      }
    }
  } finally {
    await writeQueue(remaining);
    flushing = false;
  }
}

let wired = false;

export function startSyncEngine(): void {
  if (wired || typeof window === "undefined") return;
  wired = true;
  subscribeNetwork((online) => {
    if (online) void flushQueue();
  });
  window.setInterval(() => void flushQueue(), 30_000);
  void flushQueue();
}