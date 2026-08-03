import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { STORAGE_KEYS, storage } from "@/lib/native/storage";
import { isOnline } from "@/lib/offline/network";
import { enqueue, type SyncTable } from "@/lib/offline/syncQueue";

import type { HabitCheckin, JournalEntry, MoodLog, Profile, Streak } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const localId = newId;

async function cacheRead<T>(name: string, userId: string, fallback: T): Promise<T> {
  return storage.get<T>(STORAGE_KEYS.cache(name, userId), fallback);
}

async function cacheWrite(name: string, userId: string, value: unknown): Promise<void> {
  await storage.set(STORAGE_KEYS.cache(name, userId), value);
}

/**
 * Offline-first read: always resolve from cache instantly, then refresh from
 * the server when a connection exists. Never throws to the UI.
 */
async function readThrough<T>(
  name: string,
  userId: string,
  fallback: T,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheRead<T>(name, userId, fallback);
  if (!isOnline()) return cached;
  try {
    const fresh = await fetcher();
    await cacheWrite(name, userId, fresh);
    return fresh;
  } catch (error) {
    analytics.error(error, { stage: "read_through", name });
    return cached;
  }
}

async function writeThrough(
  table: SyncTable,
  id: string,
  payload: Record<string, unknown>,
  onConflict?: string,
): Promise<void> {
  await enqueue(onConflict ? { id, table, op: "upsert", payload, onConflict } : { id, table, op: "upsert", payload });
}

export const profileRepo = {
  async get(userId: string): Promise<Profile | null> {
    return readThrough<Profile | null>("profile", userId, null, async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return (data as Profile) ?? null;
    });
  },
  async update(userId: string, patch: Partial<Profile>): Promise<Profile | null> {
    const current = await cacheRead<Profile | null>("profile", userId, null);
    const next = { ...(current ?? { id: userId, display_name: null, avatar_url: null, onboarded: false, is_premium: false }), ...patch } as Profile;
    await cacheWrite("profile", userId, next);
    await writeThrough("profiles", userId, { ...next, id: userId });
    return next;
  },
};

export const streakRepo = {
  async get(userId: string): Promise<Streak | null> {
    return readThrough<Streak | null>("streak", userId, null, async () => {
      const { data, error } = await supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return (data as Streak) ?? null;
    });
  },
  async save(userId: string, streak: Streak): Promise<Streak> {
    await cacheWrite("streak", userId, streak);
    await writeThrough("streaks", streak.id, { ...streak, user_id: userId }, "user_id");
    return streak;
  },
  async reset(userId: string, current: Streak, reason: string, daysLasted: number): Promise<Streak> {
    const next: Streak = {
      ...current,
      started_at: new Date().toISOString(),
      best_days: Math.max(current.best_days, daysLasted),
      relapse_count: current.relapse_count + 1,
    };
    await streakRepo.save(userId, next);
    const relapseId = newId();
    await writeThrough("relapses", relapseId, {
      id: relapseId,
      user_id: userId,
      reason,
      days_lasted: daysLasted,
      occurred_at: new Date().toISOString(),
    });
    return next;
  },
};

export const journalRepo = {
  async list(userId: string): Promise<JournalEntry[]> {
    return readThrough<JournalEntry[]>("journal", userId, [], async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    });
  },
  async create(userId: string, input: Pick<JournalEntry, "title" | "body" | "mood" | "urge_level">) {
    const entry: JournalEntry = {
      id: newId(),
      user_id: userId,
      created_at: new Date().toISOString(),
      ...input,
    };
    const list = await cacheRead<JournalEntry[]>("journal", userId, []);
    await cacheWrite("journal", userId, [entry, ...list]);
    await writeThrough("journal_entries", entry.id, entry);
    return entry;
  },
  async remove(userId: string, id: string) {
    const list = await cacheRead<JournalEntry[]>("journal", userId, []);
    await cacheWrite("journal", userId, list.filter((entry) => entry.id !== id));
    await enqueue({ id, table: "journal_entries", op: "delete", payload: { id } });
  },
};

export const moodRepo = {
  async list(userId: string): Promise<MoodLog[]> {
    return readThrough<MoodLog[]>("moods", userId, [], async () => {
      const { data, error } = await supabase
        .from("mood_logs")
        .select("*")
        .eq("user_id", userId)
        .order("logged_on", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as MoodLog[];
    });
  },
  async log(userId: string, score: number, note?: string): Promise<MoodLog> {
    const today = new Date().toISOString().slice(0, 10);
    const list = await cacheRead<MoodLog[]>("moods", userId, []);
    const existing = list.find((entry) => entry.logged_on === today);
    const entry: MoodLog = {
      id: existing?.id ?? newId(),
      user_id: userId,
      score,
      note: note ?? null,
      logged_on: today,
    };
    await cacheWrite("moods", userId, [entry, ...list.filter((item) => item.logged_on !== today)]);
    await writeThrough("mood_logs", entry.id, entry, "user_id,logged_on");
    return entry;
  },
};

export const habitRepo = {
  async list(userId: string): Promise<HabitCheckin[]> {
    return readThrough<HabitCheckin[]>("habits", userId, [], async () => {
      const { data, error } = await supabase
        .from("habit_checkins")
        .select("*")
        .eq("user_id", userId)
        .order("checked_on", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as HabitCheckin[];
    });
  },
  async toggle(userId: string, habitKey: string): Promise<HabitCheckin[]> {
    const today = new Date().toISOString().slice(0, 10);
    const list = await cacheRead<HabitCheckin[]>("habits", userId, []);
    const existing = list.find((item) => item.habit_key === habitKey && item.checked_on === today);

    if (existing) {
      const next = list.filter((item) => item.id !== existing.id);
      await cacheWrite("habits", userId, next);
      await enqueue({ id: existing.id, table: "habit_checkins", op: "delete", payload: { id: existing.id } });
      return next;
    }

    const entry: HabitCheckin = { id: newId(), user_id: userId, habit_key: habitKey, checked_on: today };
    const next = [entry, ...list];
    await cacheWrite("habits", userId, next);
    await writeThrough("habit_checkins", entry.id, entry, "user_id,habit_key,checked_on");
    return next;
  },
};

export async function clearUserCache(userId: string): Promise<void> {
  await Promise.all(
    ["profile", "streak", "journal", "moods", "habits"].map((name) =>
      storage.remove(STORAGE_KEYS.cache(name, userId)),
    ),
  );
}