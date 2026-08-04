export const TAGLINE = "Every day without contact is one step closer to yourself.";

export const QUOTES = [
  "Silence is not rejection. It is protection.",
  "You are allowed to heal at your own pace.",
  "The urge will pass whether you act on it or not.",
  "Every unanswered message is a boundary kept.",
  "You are rebuilding a life that fits you.",
  "Missing someone is not a reason to return.",
  "Today you choose peace over closure.",
  "Your future self is already grateful.",
  "Closure is something you give yourself.",
  "You are not starting over. You are starting wiser.",
];

export const AFFIRMATIONS = [
  "I am safe in this moment.",
  "My peace is worth more than an answer.",
  "I can feel this and still not text.",
  "I am becoming someone I respect.",
  "This feeling is a wave, not a wall.",
  "I choose my future over my past.",
];

export const ENCOURAGEMENTS = [
  "One quiet day at a time — that's the whole method.",
  "Nothing you need is on their profile.",
  "You've already done the hardest part: starting.",
  "Rest counts as progress today.",
  "Your nervous system is learning safety again.",
];

/** Deterministic daily pick so the copy is stable across a day and across SSR. */
export function pickForDay<T>(items: T[], date = new Date()): T {
  const day = Math.floor(date.getTime() / 86_400_000);
  return items[day % items.length] as T;
}

export const FLAG_CATEGORIES = [
  { key: "dishonesty", label: "Dishonesty", tint: "bg-coral" },
  { key: "betrayal", label: "Betrayal", tint: "bg-coral" },
  { key: "neglect", label: "Neglect", tint: "bg-sky" },
  { key: "control", label: "Control", tint: "bg-lavender" },
  { key: "boundaries", label: "Boundaries", tint: "bg-lavender" },
  { key: "other", label: "Other", tint: "bg-mint" },
] as const;

export const FLAG_SUGGESTIONS = [
  "Lied to me",
  "Cheated",
  "Ghosted me",
  "Manipulated me",
  "Gaslighted me",
  "Ignored my boundaries",
  "Broke promises",
];

export const WIN_SUGGESTIONS = [
  "Didn't text today",
  "Ignored an urge",
  "Deleted old photos",
  "Went to the gym",
  "Focused on work",
  "Slept properly",
  "Saw a friend",
];

export const EMOTIONS = ["Angry", "Sad", "Hopeful", "Grateful", "Confused", "Relieved"];

export type BadgeDef = {
  key: string;
  label: string;
  description: string;
  days?: number;
  tint: string;
};

export const BADGES: BadgeDef[] = [
  { key: "day-1", label: "Day 1", description: "The first quiet day.", days: 1, tint: "bg-mint" },
  { key: "day-3", label: "Day 3", description: "Past the first spike.", days: 3, tint: "bg-mint" },
  { key: "day-7", label: "Day 7", description: "One full week.", days: 7, tint: "bg-sky" },
  { key: "day-14", label: "Day 14", description: "Two weeks strong.", days: 14, tint: "bg-sky" },
  { key: "day-21", label: "Day 21", description: "Three weeks of quiet.", days: 21, tint: "bg-sky" },
  { key: "day-30", label: "Day 30", description: "A whole month.", days: 30, tint: "bg-lavender" },
  { key: "day-60", label: "Day 60", description: "Sixty days of you.", days: 60, tint: "bg-lavender" },
  { key: "day-90", label: "Day 90", description: "The classic milestone.", days: 90, tint: "bg-coral" },
  { key: "day-180", label: "180 Days", description: "Half a year free.", days: 180, tint: "bg-coral" },
  { key: "day-365", label: "365 Days", description: "A full year of peace.", days: 365, tint: "bg-mint" },
  { key: "healing-begins", label: "Healing Begins", description: "Logged your first flag.", tint: "bg-sky" },
  { key: "strong-mind", label: "Strong Mind", description: "Recorded 5 wins.", tint: "bg-mint" },
  { key: "fresh-start", label: "Fresh Start", description: "Wrote your first unsent letter.", tint: "bg-lavender" },
  { key: "resilient", label: "Resilient", description: "Used the SOS toolkit and stayed strong.", tint: "bg-coral" },
];

/** Milestone badges are the single source of truth for streak milestones. */
export type MilestoneBadge = BadgeDef & { days: number };

export const MILESTONE_BADGES: MilestoneBadge[] = BADGES.filter(
  (badge): badge is MilestoneBadge => typeof badge.days === "number",
).sort((a, b) => a.days - b.days);

export function earnedBadgeKeys(input: {
  days: number;
  flags: number;
  wins: number;
  letters: number;
  sosUsed: boolean;
}): string[] {
  const keys = MILESTONE_BADGES.filter((badge) => input.days >= badge.days).map(
    (badge) => badge.key,
  );
  if (input.flags >= 1) keys.push("healing-begins");
  if (input.wins >= 5) keys.push("strong-mind");
  if (input.letters >= 1) keys.push("fresh-start");
  if (input.sosUsed) keys.push("resilient");
  return keys;
}

/** The next milestone badge the user is working toward, if any. */
export function nextMilestoneBadge(days: number): MilestoneBadge | null {
  return MILESTONE_BADGES.find((badge) => badge.days > days) ?? null;
}

/** The most recent milestone badge already unlocked. */
export function currentMilestoneBadge(days: number): MilestoneBadge | null {
  return [...MILESTONE_BADGES].reverse().find((badge) => badge.days <= days) ?? null;
}

export const GROUNDING_STEPS = [
  { count: 5, sense: "things you can see", hint: "Name them slowly, out loud if you can." },
  { count: 4, sense: "things you can touch", hint: "Feel the texture of each one." },
  { count: 3, sense: "things you can hear", hint: "Near sounds, then far ones." },
  { count: 2, sense: "things you can smell", hint: "Or two smells you love." },
  { count: 1, sense: "thing you can taste", hint: "Take a sip of water." },
];

export const MOODS = [
  { key: "anxious", emoji: "😰", label: "Anxious" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "heavy", emoji: "😔", label: "Heavy" },
  { key: "numb", emoji: "😶", label: "Numb" },
  { key: "tired", emoji: "😴", label: "Tired" },
  { key: "restless", emoji: "😤", label: "Restless" },
  { key: "peaceful", emoji: "😌", label: "Peaceful" },
  { key: "okay", emoji: "🙂", label: "Okay" },
  { key: "hopeful", emoji: "😊", label: "Hopeful" },
  { key: "strong", emoji: "💪", label: "Strong" },
] as const;

export const MOOD_ACTIONS = [
  { key: "walk", emoji: "🚶", label: "Take a walk" },
  { key: "breathe", emoji: "🌬", label: "Take 3 deep breaths" },
  { key: "journal", emoji: "📖", label: "Journal" },
  { key: "music", emoji: "🎵", label: "Listen to music" },
  { key: "water", emoji: "☕", label: "Drink water" },
  { key: "offline", emoji: "📵", label: "Stay off social media" },
  { key: "friend", emoji: "📞", label: "Call a friend" },
  { key: "meditate", emoji: "🧘", label: "Meditate" },
] as const;

export function moodByKey(key: string | null | undefined) {
  return MOODS.find((mood) => mood.key === key) ?? null;
}

export function actionByKey(key: string | null | undefined) {
  return MOOD_ACTIONS.find((action) => action.key === key) ?? null;
}
