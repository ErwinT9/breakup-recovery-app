import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { STORAGE_KEYS, storage } from "@/lib/native/storage";
import { isOnline } from "@/lib/offline/network";
import { enqueue, type SyncTable } from "@/lib/offline/syncQueue";

import type {
  Affirmation,
  BadgeRow,
  DailyPromise,
  Flag,
  JournalEntry,
  Letter,
  Picture,
  Profile,
  QuestionnaireAnswers,
  Ritual,
  Streak,
  Trigger,
  Win,
} from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const localId = newId;

const CACHES = [
  "profile",
  "streak",
  "questionnaire",
  "flags",
  "wins",
  "badges",
  "letters",
  "promises",
  "pictures",
  "affirmations",
  "rituals",
  "triggers",
  "journal",
] as const;

async function cacheRead<T>(name: string, userId: string, fallback: T): Promise<T> {
  return storage.get<T>(STORAGE_KEYS.cache(name, userId), fallback);
}

async function cacheWrite(name: string, userId: string, value: unknown): Promise<void> {
  await storage.set(STORAGE_KEYS.cache(name, userId), value);
}

/**
 * Offline-first read: resolve from the local cache instantly, then refresh from
 * Supabase when a connection exists. Never throws to the UI.
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
  await enqueue(
    onConflict
      ? { id, table, op: "upsert", payload, onConflict }
      : { id, table, op: "upsert", payload },
  );
}

export function emptyProfile(userId: string): Profile {
  return {
    id: userId,
    display_name: null,
    bio: null,
    avatar_url: null,
    recovery_started_at: new Date().toISOString(),
    notifications_enabled: false,
    morning_reminder: true,
    evening_reminder: true,
    push_token: null,
    questionnaire_completed: false,
    is_premium: false,
  };
}

export const profileRepo = {
  async get(userId: string): Promise<Profile | null> {
    return readThrough<Profile | null>("profile", userId, null, async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? (data as unknown as Profile) : null;
    });
  },
  async update(userId: string, patch: Partial<Profile>): Promise<Profile> {
    const current = await cacheRead<Profile | null>("profile", userId, null);
    const next: Profile = { ...(current ?? emptyProfile(userId)), ...patch, id: userId };
    await cacheWrite("profile", userId, next);
    await writeThrough("profiles", userId, { ...next });
    return next;
  },
};

export const streakRepo = {
  async get(userId: string): Promise<Streak | null> {
    return readThrough<Streak | null>("streak", userId, null, async () => {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? (data as unknown as Streak) : null;
    });
  },
  async save(userId: string, streak: Streak): Promise<Streak> {
    await cacheWrite("streak", userId, streak);
    await writeThrough("streaks", streak.id, { ...streak, user_id: userId }, "user_id");
    return streak;
  },
  async ensure(userId: string, startedAt?: string): Promise<Streak> {
    const existing = await streakRepo.get(userId);
    if (existing) return existing;
    const created: Streak = {
      id: newId(),
      user_id: userId,
      started_at: startedAt ?? new Date().toISOString(),
      best_days: 0,
      relapse_count: 0,
      ex_name: null,
    };
    return streakRepo.save(userId, created);
  },
  async reset(userId: string, current: Streak, daysLasted: number): Promise<Streak> {
    const next: Streak = {
      ...current,
      started_at: new Date().toISOString(),
      best_days: Math.max(current.best_days, daysLasted),
      relapse_count: current.relapse_count + 1,
    };
    return streakRepo.save(userId, next);
  },
  async setStart(userId: string, current: Streak, startedAt: string): Promise<Streak> {
    return streakRepo.save(userId, { ...current, started_at: startedAt });
  },
};

export const questionnaireRepo = {
  async get(userId: string): Promise<QuestionnaireAnswers | null> {
    return readThrough<QuestionnaireAnswers | null>("questionnaire", userId, null, async () => {
      const { data, error } = await supabase
        .from("questionnaire_answers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? (data as unknown as QuestionnaireAnswers) : null;
    });
  },
  async save(
    userId: string,
    patch: Partial<QuestionnaireAnswers>,
  ): Promise<QuestionnaireAnswers> {
    const current = await cacheRead<QuestionnaireAnswers | null>("questionnaire", userId, null);
    const next: QuestionnaireAnswers = {
      id: current?.id ?? newId(),
      user_id: userId,
      nickname: null,
      age_range: null,
      gender: null,
      relationship_length: null,
      who_ended: null,
      last_contact_at: null,
      reasons: [],
      checks_social: null,
      difficulty_today: null,
      biggest_goal: null,
      wants_reminders: null,
      referral_source: null,
      completed: false,
      ...(current ?? {}),
      ...patch,
    };
    await cacheWrite("questionnaire", userId, next);
    await writeThrough("questionnaire_answers", next.id, { ...next }, "user_id");
    return next;
  },
};

export const flagRepo = {
  async list(userId: string): Promise<Flag[]> {
    return readThrough<Flag[]>("flags", userId, [], async () => {
      const { data, error } = await supabase
        .from("flags")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Flag[];
    });
  },
  async save(userId: string, input: Partial<Flag> & { title: string }): Promise<Flag[]> {
    const list = await cacheRead<Flag[]>("flags", userId, []);
    const flag: Flag = {
      id: input.id ?? newId(),
      user_id: userId,
      title: input.title,
      category: input.category ?? "other",
      note: input.note ?? null,
      created_at: input.created_at ?? new Date().toISOString(),
    };
    const next = [flag, ...list.filter((item) => item.id !== flag.id)];
    await cacheWrite("flags", userId, next);
    await writeThrough("flags", flag.id, { ...flag });
    return next;
  },
  async remove(userId: string, id: string): Promise<Flag[]> {
    const list = await cacheRead<Flag[]>("flags", userId, []);
    const next = list.filter((item) => item.id !== id);
    await cacheWrite("flags", userId, next);
    await enqueue({ id, table: "flags", op: "delete", payload: { id } });
    return next;
  },
};

export const winRepo = {
  async list(userId: string): Promise<Win[]> {
    return readThrough<Win[]>("wins", userId, [], async () => {
      const { data, error } = await supabase
        .from("wins")
        .select("*")
        .eq("user_id", userId)
        .order("achieved_on", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []) as unknown as Win[];
    });
  },
  async save(userId: string, input: Partial<Win> & { title: string }): Promise<Win[]> {
    const list = await cacheRead<Win[]>("wins", userId, []);
    const win: Win = {
      id: input.id ?? newId(),
      user_id: userId,
      title: input.title,
      note: input.note ?? null,
      achieved_on: input.achieved_on ?? new Date().toISOString().slice(0, 10),
      created_at: input.created_at ?? new Date().toISOString(),
    };
    const next = [win, ...list.filter((item) => item.id !== win.id)];
    await cacheWrite("wins", userId, next);
    await writeThrough("wins", win.id, { ...win });
    return next;
  },
  async remove(userId: string, id: string): Promise<Win[]> {
    const list = await cacheRead<Win[]>("wins", userId, []);
    const next = list.filter((item) => item.id !== id);
    await cacheWrite("wins", userId, next);
    await enqueue({ id, table: "wins", op: "delete", payload: { id } });
    return next;
  },
};

export const badgeRepo = {
  async list(userId: string): Promise<BadgeRow[]> {
    return readThrough<BadgeRow[]>("badges", userId, [], async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BadgeRow[];
    });
  },
  async unlock(userId: string, badgeKeys: string[]): Promise<BadgeRow[]> {
    const list = await cacheRead<BadgeRow[]>("badges", userId, []);
    const owned = new Set(list.map((badge) => badge.badge_key));
    const fresh = badgeKeys.filter((key) => !owned.has(key));
    if (fresh.length === 0) return list;

    const rows: BadgeRow[] = fresh.map((key) => ({
      id: newId(),
      user_id: userId,
      badge_key: key,
      unlocked_at: new Date().toISOString(),
    }));
    const next = [...rows, ...list];
    await cacheWrite("badges", userId, next);
    for (const row of rows) {
      await writeThrough("badges", row.id, { ...row }, "user_id,badge_key");
    }
    return next;
  },
};

export const letterRepo = {
  async list(userId: string): Promise<Letter[]> {
    return readThrough<Letter[]>("letters", userId, [], async () => {
      const { data, error } = await supabase
        .from("letters")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Letter[];
    });
  },
  async save(userId: string, input: Partial<Letter> & { body: string }): Promise<Letter[]> {
    const list = await cacheRead<Letter[]>("letters", userId, []);
    const now = new Date().toISOString();
    const letter: Letter = {
      id: input.id ?? newId(),
      user_id: userId,
      title: input.title ?? null,
      body: input.body,
      emotion: input.emotion ?? null,
      is_draft: input.is_draft ?? false,
      created_at: input.created_at ?? now,
      updated_at: now,
    };
    const next = [letter, ...list.filter((item) => item.id !== letter.id)];
    await cacheWrite("letters", userId, next);
    await writeThrough("letters", letter.id, { ...letter });
    return next;
  },
  async remove(userId: string, id: string): Promise<Letter[]> {
    const list = await cacheRead<Letter[]>("letters", userId, []);
    const next = list.filter((item) => item.id !== id);
    await cacheWrite("letters", userId, next);
    await enqueue({ id, table: "letters", op: "delete", payload: { id } });
    return next;
  },
};

export async function clearUserCache(userId: string): Promise<void> {
  await Promise.all(CACHES.map((name) => storage.remove(STORAGE_KEYS.cache(name, userId))));
}
