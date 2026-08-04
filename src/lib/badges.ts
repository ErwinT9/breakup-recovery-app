import {
  Award,
  BookOpen,
  Brain,
  Calendar,
  CalendarCheck,
  CalendarHeart,
  Camera,
  CheckCircle2,
  Compass,
  Crown,
  Feather,
  Flag,
  Flame,
  Footprints,
  Gem,
  Heart,
  HeartHandshake,
  Images,
  Leaf,
  Lightbulb,
  ListChecks,
  Mail,
  MailOpen,
  Medal,
  Moon,
  Mountain,
  PartyPopper,
  PenLine,
  Repeat,
  Rocket,
  Scale,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Target,
  Timer,
  Trophy,
  UserCheck,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Everything the badge engine can evaluate against. */
export type BadgeStats = {
  days: number;
  journalEntries: number;
  journalStreak: number;
  pictures: number;
  triggers: number;
  moods: number;
  wins: number;
  flags: number;
  letters: number;
  sosUses: number;
  sosSessions: number;
  popItSessions: number;
  dailyTaskDays: number;
  dailyTaskStreak: number;
  notificationReturns: number;
  returnedAfterGap: boolean;
  morningStreak: number;
  tabsVisited: number;
  featuresUsed: number;
  appOpenDays: number;
  relapses: number;
  onboarded: boolean;
  profileSetup: boolean;
};

export const EMPTY_BADGE_STATS: BadgeStats = {
  days: 0,
  journalEntries: 0,
  journalStreak: 0,
  pictures: 0,
  triggers: 0,
  moods: 0,
  wins: 0,
  flags: 0,
  letters: 0,
  sosUses: 0,
  sosSessions: 0,
  popItSessions: 0,
  dailyTaskDays: 0,
  dailyTaskStreak: 0,
  notificationReturns: 0,
  returnedAfterGap: false,
  morningStreak: 0,
  tabsVisited: 0,
  featuresUsed: 0,
  appOpenDays: 0,
  relapses: 0,
  onboarded: false,
  profileSetup: false,
};

export type BadgeCategory =
  | "Streak"
  | "Journal"
  | "Memories"
  | "Triggers"
  | "Mood Check-Ins"
  | "Wins"
  | "Flags"
  | "Unsent Letters"
  | "Emergency Toolkit"
  | "Pop It"
  | "Daily Tasks"
  | "Reminders"
  | "Engagement"
  | "Special";

export type BadgeDef = {
  key: string;
  label: string;
  description: string;
  category: BadgeCategory;
  icon: LucideIcon;
  tint: string;
  /** Streak milestone badges only. */
  days?: number;
  /** Counting badges: metric + target render a progress bar. */
  metric?: keyof BadgeStats;
  target?: number;
  /** Unit shown next to progress, e.g. "Entries", "Days". */
  unit?: string;
  /** Non-counting badges resolve through a predicate instead. */
  earned?: (stats: BadgeStats) => boolean;
};

const MINT = "bg-mint";
const SKY = "bg-sky";
const LAV = "bg-lavender";
const CORAL = "bg-coral";

export const BADGES: BadgeDef[] = [
  // Streak milestones — also the single source of truth for Healing Progress.
  { key: "day-1", label: "Day 1", description: "The first quiet day.", days: 1, category: "Streak", icon: Leaf, tint: MINT },
  { key: "day-3", label: "Day 3", description: "Past the first spike.", days: 3, category: "Streak", icon: Leaf, tint: MINT },
  { key: "day-7", label: "Day 7", description: "One full week.", days: 7, category: "Streak", icon: Flame, tint: SKY },
  { key: "day-14", label: "Day 14", description: "Two weeks strong.", days: 14, category: "Streak", icon: Flame, tint: SKY },
  { key: "day-21", label: "Day 21", description: "Three weeks of quiet.", days: 21, category: "Streak", icon: Flame, tint: SKY },
  { key: "day-30", label: "Day 30", description: "A whole month.", days: 30, category: "Streak", icon: Calendar, tint: LAV },
  { key: "day-60", label: "Day 60", description: "Sixty days of you.", days: 60, category: "Streak", icon: Calendar, tint: LAV },
  { key: "day-90", label: "Day 90", description: "The classic milestone.", days: 90, category: "Streak", icon: Trophy, tint: CORAL },
  { key: "day-180", label: "180 Days", description: "Half a year free.", days: 180, category: "Streak", icon: Medal, tint: CORAL },
  { key: "day-365", label: "365 Days", description: "A full year of peace.", days: 365, category: "Streak", icon: Crown, tint: MINT },

  // Journal
  { key: "journal-first", label: "First Words", description: "Wrote your first journal entry.", category: "Journal", icon: PenLine, tint: SKY, metric: "journalEntries", target: 1, unit: "Entries" },
  { key: "journal-streak-3", label: "Daily Writer", description: "Journaled 3 days in a row.", category: "Journal", icon: BookOpen, tint: SKY, metric: "journalStreak", target: 3, unit: "Days" },
  { key: "journal-streak-7", label: "Reflection Habit", description: "Journaled 7 days in a row.", category: "Journal", icon: CalendarCheck, tint: SKY, metric: "journalStreak", target: 7, unit: "Days" },
  { key: "journal-25", label: "Deep Reflection", description: "Wrote 25 journal entries.", category: "Journal", icon: Brain, tint: LAV, metric: "journalEntries", target: 25, unit: "Entries" },
  { key: "journal-100", label: "Healing Through Words", description: "Wrote 100 journal entries.", category: "Journal", icon: Feather, tint: LAV, metric: "journalEntries", target: 100, unit: "Entries" },

  // Memories
  { key: "picture-first", label: "First Memory", description: "Added your first picture.", category: "Memories", icon: Camera, tint: MINT, metric: "pictures", target: 1, unit: "Pictures" },
  { key: "picture-10", label: "Memory Keeper", description: "Added 10 pictures.", category: "Memories", icon: Images, tint: MINT, metric: "pictures", target: 10, unit: "Pictures" },
  { key: "picture-25", label: "New Perspective", description: "Added 25 pictures.", category: "Memories", icon: Sparkles, tint: MINT, metric: "pictures", target: 25, unit: "Pictures" },

  // Triggers
  { key: "trigger-first", label: "Self Aware", description: "Logged your first trigger.", category: "Triggers", icon: Lightbulb, tint: CORAL, metric: "triggers", target: 1, unit: "Triggers" },
  { key: "trigger-10", label: "Pattern Finder", description: "Logged 10 triggers.", category: "Triggers", icon: Search, tint: CORAL, metric: "triggers", target: 10, unit: "Triggers" },
  { key: "trigger-50", label: "Trigger Master", description: "Logged 50 triggers.", category: "Triggers", icon: Target, tint: CORAL, metric: "triggers", target: 50, unit: "Triggers" },

  // Mood check-ins
  { key: "mood-first", label: "First Check-In", description: "Completed your first mood check-in.", category: "Mood Check-Ins", icon: Smile, tint: SKY, metric: "moods", target: 1, unit: "Check-ins" },
  { key: "mood-7", label: "Present Today", description: "Completed 7 mood check-ins.", category: "Mood Check-Ins", icon: Sun, tint: SKY, metric: "moods", target: 7, unit: "Check-ins" },
  { key: "mood-30", label: "Emotion Explorer", description: "Completed 30 mood check-ins.", category: "Mood Check-Ins", icon: Compass, tint: SKY, metric: "moods", target: 30, unit: "Check-ins" },
  { key: "mood-100", label: "Inner Balance", description: "Completed 100 mood check-ins.", category: "Mood Check-Ins", icon: Scale, tint: SKY, metric: "moods", target: 100, unit: "Check-ins" },

  // Wins
  { key: "win-first", label: "First Win", description: "Recorded your first win.", category: "Wins", icon: Star, tint: MINT, metric: "wins", target: 1, unit: "Wins" },
  { key: "strong-mind", label: "Strong Mind", description: "Recorded 5 wins.", category: "Wins", icon: Shield, tint: MINT, metric: "wins", target: 5, unit: "Wins" },
  { key: "win-10", label: "Momentum", description: "Recorded 10 wins.", category: "Wins", icon: Zap, tint: MINT, metric: "wins", target: 10, unit: "Wins" },
  { key: "win-50", label: "Stronger Every Day", description: "Recorded 50 wins.", category: "Wins", icon: Mountain, tint: MINT, metric: "wins", target: 50, unit: "Wins" },

  // Flags
  { key: "healing-begins", label: "Healing Begins", description: "Logged your first red flag.", category: "Flags", icon: Flag, tint: CORAL, metric: "flags", target: 1, unit: "Flags" },
  { key: "flag-10", label: "Lesson Learned", description: "Logged 10 flags.", category: "Flags", icon: BookOpen, tint: CORAL, metric: "flags", target: 10, unit: "Flags" },
  { key: "flag-50", label: "Pattern Breaker", description: "Logged 50 flags.", category: "Flags", icon: Repeat, tint: CORAL, metric: "flags", target: 50, unit: "Flags" },

  // Letters
  { key: "fresh-start", label: "Fresh Start", description: "Wrote your first unsent letter.", category: "Unsent Letters", icon: Mail, tint: LAV, metric: "letters", target: 1, unit: "Letters" },
  { key: "letter-10", label: "Let It Out", description: "Wrote 10 unsent letters.", category: "Unsent Letters", icon: MailOpen, tint: LAV, metric: "letters", target: 10, unit: "Letters" },
  { key: "letter-50", label: "Heart Unloaded", description: "Wrote 50 unsent letters.", category: "Unsent Letters", icon: Send, tint: LAV, metric: "letters", target: 50, unit: "Letters" },

  // Emergency toolkit
  { key: "resilient", label: "Resilient", description: "Used the Emergency Toolkit once.", category: "Emergency Toolkit", icon: ShieldCheck, tint: CORAL, metric: "sosUses", target: 1, unit: "Times" },
  { key: "sos-10", label: "Stayed Strong", description: "Used the toolkit 10 times instead of breaking no contact.", category: "Emergency Toolkit", icon: HeartHandshake, tint: CORAL, metric: "sosUses", target: 10, unit: "Times" },
  { key: "sos-sessions-25", label: "One More Minute", description: "Completed 25 calming sessions.", category: "Emergency Toolkit", icon: Timer, tint: CORAL, metric: "sosSessions", target: 25, unit: "Sessions" },

  // Pop It
  { key: "popit-first", label: "Deep Breath", description: "Completed your first Pop It session.", category: "Pop It", icon: Wind, tint: LAV, metric: "popItSessions", target: 1, unit: "Sessions" },
  { key: "popit-10", label: "Ride It Out", description: "Completed 10 Pop It sessions.", category: "Pop It", icon: Waves, tint: LAV, metric: "popItSessions", target: 10, unit: "Sessions" },
  { key: "popit-50", label: "Calm Mind", description: "Completed 50 Pop It sessions.", category: "Pop It", icon: Moon, tint: LAV, metric: "popItSessions", target: 50, unit: "Sessions" },

  // Daily tasks
  { key: "tasks-first", label: "Productive Day", description: "Completed all daily tasks once.", category: "Daily Tasks", icon: CheckCircle2, tint: MINT, metric: "dailyTaskDays", target: 1, unit: "Days" },
  { key: "tasks-streak-7", label: "Daily Discipline", description: "Completed all daily tasks 7 days in a row.", category: "Daily Tasks", icon: ListChecks, tint: MINT, metric: "dailyTaskStreak", target: 7, unit: "Days" },
  { key: "tasks-30", label: "Consistency Wins", description: "Completed daily tasks on 30 days.", category: "Daily Tasks", icon: CalendarHeart, tint: MINT, metric: "dailyTaskDays", target: 30, unit: "Days" },

  // Reminders
  { key: "reminder-return", label: "Never Missed", description: "Opened a reminder and came back to the app.", category: "Reminders", icon: Award, tint: SKY, metric: "notificationReturns", target: 1, unit: "Returns" },
  { key: "back-on-track", label: "Back on Track", description: "Came back after missing a day.", category: "Reminders", icon: Rocket, tint: SKY, earned: (s) => s.returnedAfterGap },
  { key: "morning-7", label: "Morning Routine", description: "Opened the app 7 mornings in a row.", category: "Reminders", icon: Sunrise, tint: SKY, metric: "morningStreak", target: 7, unit: "Mornings" },

  // Engagement
  { key: "explorer", label: "Explorer", description: "Visited every tab.", category: "Engagement", icon: Compass, tint: LAV, metric: "tabsVisited", target: 5, unit: "Tabs" },
  { key: "curious-mind", label: "Curious Mind", description: "Used every feature at least once.", category: "Engagement", icon: Sparkles, tint: LAV, metric: "featuresUsed", target: 10, unit: "Features" },
  { key: "loyal-companion", label: "Loyal Companion", description: "Opened the app on 30 different days.", category: "Engagement", icon: Heart, tint: LAV, metric: "appOpenDays", target: 30, unit: "Days" },
  { key: "dedicated", label: "Dedicated", description: "Opened the app on 100 different days.", category: "Engagement", icon: Gem, tint: LAV, metric: "appOpenDays", target: 100, unit: "Days" },

  // Special
  { key: "phoenix", label: "Phoenix", description: "Reached 90 days of no contact.", category: "Special", icon: Flame, tint: CORAL, metric: "days", target: 90, unit: "Days" },
  { key: "unbreakable", label: "Unbreakable", description: "Reached 365 days of no contact.", category: "Special", icon: Crown, tint: CORAL, metric: "days", target: 365, unit: "Days" },
  { key: "comeback", label: "Comeback", description: "Restarted after a relapse and reached Day 7 again.", category: "Special", icon: Repeat, tint: MINT, earned: (s) => s.relapses >= 1 && s.days >= 7 },
  { key: "hope-lives", label: "Hope Lives", description: "Kept going after breaking a streak.", category: "Special", icon: PartyPopper, tint: MINT, earned: (s) => s.relapses >= 1 },
  { key: "one-step", label: "One Step at a Time", description: "Completed the onboarding journey.", category: "Special", icon: Footprints, tint: SKY, earned: (s) => s.onboarded },
  { key: "new-chapter", label: "New Chapter", description: "Completed your profile setup.", category: "Special", icon: UserCheck, tint: SKY, earned: (s) => s.profileSetup },
];

export const BADGE_CATEGORIES: BadgeCategory[] = [
  "Streak",
  "Journal",
  "Memories",
  "Triggers",
  "Mood Check-Ins",
  "Wins",
  "Flags",
  "Unsent Letters",
  "Emergency Toolkit",
  "Pop It",
  "Daily Tasks",
  "Reminders",
  "Engagement",
  "Special",
];

/** Milestone badges are the single source of truth for streak milestones. */
export type MilestoneBadge = BadgeDef & { days: number };

export const MILESTONE_BADGES: MilestoneBadge[] = BADGES.filter(
  (badge): badge is MilestoneBadge => typeof badge.days === "number",
).sort((a, b) => a.days - b.days);

export type BadgeProgress = {
  badge: BadgeDef;
  unlocked: boolean;
  current: number;
  target: number;
  /** 0..1 */
  ratio: number;
};

export function badgeProgress(badge: BadgeDef, stats: BadgeStats): BadgeProgress {
  if (typeof badge.days === "number") {
    const current = Math.min(stats.days, badge.days);
    return {
      badge,
      unlocked: stats.days >= badge.days,
      current,
      target: badge.days,
      ratio: Math.min(1, stats.days / badge.days),
    };
  }
  if (badge.metric && badge.target) {
    const raw = stats[badge.metric];
    const value = typeof raw === "number" ? raw : raw ? 1 : 0;
    return {
      badge,
      unlocked: value >= badge.target,
      current: Math.min(value, badge.target),
      target: badge.target,
      ratio: Math.min(1, value / badge.target),
    };
  }
  const unlocked = badge.earned ? badge.earned(stats) : false;
  return { badge, unlocked, current: unlocked ? 1 : 0, target: 1, ratio: unlocked ? 1 : 0 };
}

export function evaluateBadges(stats: BadgeStats): BadgeProgress[] {
  return BADGES.map((badge) => badgeProgress(badge, stats));
}

/** Keys the user currently qualifies for — fed straight into badgeRepo.unlock. */
export function earnedBadgeKeys(stats: BadgeStats): string[] {
  return evaluateBadges(stats)
    .filter((item) => item.unlocked)
    .map((item) => item.badge.key);
}

export function nextMilestoneBadge(days: number): MilestoneBadge | null {
  return MILESTONE_BADGES.find((badge) => badge.days > days) ?? null;
}

export function currentMilestoneBadge(days: number): MilestoneBadge | null {
  return [...MILESTONE_BADGES].reverse().find((badge) => badge.days <= days) ?? null;
}

export function badgeByKey(key: string): BadgeDef | undefined {
  return BADGES.find((badge) => badge.key === key);
}
