/**
 * Local, offline-first activity counters that back the badges which cannot be
 * derived from Supabase rows (toolkit usage, app opens, tab exploration...).
 * Stored in localStorage so it works identically on web and in the Android
 * WebView, and exposed through a tiny store so React can re-render on change.
 */
import { localDayKey } from "@/data/repository";

export const TRACKED_TABS = ["home", "flags", "wins", "badges", "activity"] as const;
export const TRACKED_FEATURES = [
  "journal",
  "pictures",
  "triggers",
  "rituals",
  "affirmations",
  "letters",
  "mood",
  "flags",
  "wins",
  "sos",
] as const;

export type ActivityState = {
  sosUses: number;
  sosSessions: number;
  popItSessions: number;
  notificationReturns: number;
  dailyTaskDays: string[];
  openDays: string[];
  morningDays: string[];
  tabs: string[];
  features: string[];
  lastOpenDay: string | null;
  returnedAfterGap: boolean;
  profileSetup: boolean;
  onboarded: boolean;
};

const KEY = "nc:activity-v1";

const EMPTY: ActivityState = {
  sosUses: 0,
  sosSessions: 0,
  popItSessions: 0,
  notificationReturns: 0,
  dailyTaskDays: [],
  openDays: [],
  morningDays: [],
  tabs: [],
  features: [],
  lastOpenDay: null,
  returnedAfterGap: false,
  profileSetup: false,
  onboarded: false,
};

let cached: ActivityState | null = null;
const listeners = new Set<() => void>();

function read(): ActivityState {
  if (cached) return cached;
  let next: ActivityState = { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) next = { ...EMPTY, ...(JSON.parse(raw) as Partial<ActivityState>) };
    // Migrate the pre-registry SOS flag.
    if (next.sosUses === 0 && window.localStorage.getItem("nc:sos-used") === "1") {
      next.sosUses = 1;
    }
  } catch {
    next = { ...EMPTY };
  }
  cached = next;
  return next;
}

function write(next: ActivityState): void {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — counters stay in memory for this session */
  }
  for (const listener of listeners) listener();
}

export function getActivity(): ActivityState {
  if (typeof window === "undefined") return EMPTY;
  return read();
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(patch: (state: ActivityState) => ActivityState): void {
  if (typeof window === "undefined") return;
  write(patch(read()));
}

function pushDay(days: string[], day: string): string[] {
  return days.includes(day) ? days : [...days, day].slice(-500);
}

function pushUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

export const activity = {
  sosOpened() {
    update((state) => ({ ...state, sosUses: state.sosUses + 1 }));
  },
  sosSessionCompleted() {
    update((state) => ({ ...state, sosSessions: state.sosSessions + 1 }));
  },
  popItCompleted() {
    update((state) => ({
      ...state,
      popItSessions: state.popItSessions + 1,
      sosSessions: state.sosSessions + 1,
    }));
  },
  dailyTasksCompleted() {
    const day = localDayKey();
    update((state) => ({ ...state, dailyTaskDays: pushDay(state.dailyTaskDays, day) }));
  },
  notificationReturn() {
    update((state) => ({ ...state, notificationReturns: state.notificationReturns + 1 }));
  },
  tabVisited(tab: string) {
    update((state) => ({ ...state, tabs: pushUnique(state.tabs, tab) }));
  },
  featureUsed(feature: (typeof TRACKED_FEATURES)[number]) {
    update((state) => ({ ...state, features: pushUnique(state.features, feature) }));
  },
  profileSetupDone() {
    update((state) => (state.profileSetup ? state : { ...state, profileSetup: true }));
  },
  onboardingDone() {
    update((state) => (state.onboarded ? state : { ...state, onboarded: true }));
  },
  appOpened() {
    const now = new Date();
    const day = localDayKey(now);
    update((state) => {
      const gap =
        state.returnedAfterGap ||
        (state.lastOpenDay !== null && state.lastOpenDay !== day && dayGap(state.lastOpenDay, day) > 1);
      return {
        ...state,
        openDays: pushDay(state.openDays, day),
        morningDays: now.getHours() < 11 ? pushDay(state.morningDays, day) : state.morningDays,
        lastOpenDay: day,
        returnedAfterGap: gap,
      };
    });
  },
};

function dayGap(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00`);
  const b = Date.parse(`${to}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** Longest run of consecutive days ending today (or yesterday) in a day-key list. */
export function consecutiveDayStreak(days: string[], today = localDayKey()): number {
  const set = new Set(days);
  if (set.size === 0) return 0;
  let cursor = new Date(`${today}T00:00:00`);
  if (!set.has(today)) cursor = new Date(cursor.getTime() - 86_400_000);
  let count = 0;
  while (set.has(localDayKey(cursor))) {
    count += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return count;
}
