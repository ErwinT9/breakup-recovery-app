const DAY = 24 * 60 * 60 * 1000;

export function daysSince(iso: string): number {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / DAY));
}

export function hoursIntoDay(iso: string): number {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.floor(((Date.now() - start) % DAY) / (60 * 60 * 1000));
}

export const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

export function nextMilestone(days: number): number {
  return MILESTONES.find((milestone) => milestone > days) ?? days + 30;
}

export const AFFIRMATIONS = [
  "Silence is not rejection. It is protection.",
  "You are allowed to heal at your own pace.",
  "The urge will pass whether you act on it or not.",
  "Every unanswered message is a boundary kept.",
  "You are rebuilding a life that fits you.",
  "Missing someone is not a reason to return.",
  "Today you choose peace over closure.",
  "Your future self is already grateful.",
];

export const HABITS = [
  { key: "movement", label: "Move your body", hint: "A walk counts" },
  { key: "sleep", label: "Sleep before midnight", hint: "Recovery fuel" },
  { key: "connect", label: "Reach out to a friend", hint: "Not to them" },
  { key: "no-check", label: "No profile checking", hint: "Stay off their page" },
];