import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  badgeRepo,
  flagRepo,
  journalRepo,
  letterRepo,
  localDayKey,
  moodRepo,
  pictureRepo,
  profileRepo,
  streakRepo,
  triggerRepo,
  winRepo,
} from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import {
  consecutiveDayStreak,
  getActivity,
  subscribeActivity,
  TRACKED_FEATURES,
  TRACKED_TABS,
  type ActivityState,
} from "@/lib/badgeActivity";
import {
  BADGES,
  earnedBadgeKeys,
  evaluateBadges,
  EMPTY_BADGE_STATS,
  badgeByKey,
  type BadgeProgress,
  type BadgeStats,
} from "@/lib/badges";
import { celebrate } from "@/lib/celebrate";
import { daysSince } from "@/lib/streak";

const EMPTY_ACTIVITY = getActivity();

/** Reactive view of the local activity counters. */
export function useActivity(): ActivityState {
  return useSyncExternalStore(
    subscribeActivity,
    getActivity,
    () => EMPTY_ACTIVITY,
  );
}

export type BadgeState = {
  stats: BadgeStats;
  progress: BadgeProgress[];
  owned: Set<string>;
  unlockedCount: number;
  total: number;
};

/**
 * Single place where badge stats are gathered, evaluated, and persisted.
 * Any screen can call this; the unlock side-effect is idempotent.
 */
export function useBadges(options: { autoUnlock?: boolean } = {}): BadgeState {
  const { autoUnlock = false } = options;
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const enabled = Boolean(userId);
  const queryClient = useQueryClient();
  const activity = useActivity();

  const q = <T,>(key: string, fn: () => Promise<T>, fallback: T) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: [key, userId], queryFn: fn, enabled }).data ?? fallback;

  const streak = q("streak", () => streakRepo.get(userId), null);
  const profile = q("profile", () => profileRepo.get(userId), null);
  const flags = q("flags", () => flagRepo.list(userId), []);
  const wins = q("wins", () => winRepo.list(userId), []);
  const letters = q("letters", () => letterRepo.list(userId), []);
  const journal = q("journal", () => journalRepo.list(userId), []);
  const pictures = q("pictures", () => pictureRepo.list(userId), []);
  const triggers = q("triggers", () => triggerRepo.list(userId), []);
  const moods = q("moods", () => moodRepo.list(userId), []);
  const badges = q("badges", () => badgeRepo.list(userId), []);

  const stats = useMemo<BadgeStats>(() => {
    if (!enabled) return EMPTY_BADGE_STATS;
    const journalDays = journal.map((entry) => localDayKey(new Date(entry.created_at)));
    return {
      days: streak?.started_at ? daysSince(streak.started_at) : 0,
      journalEntries: journal.length,
      journalStreak: consecutiveDayStreak(journalDays),
      pictures: pictures.length,
      triggers: triggers.length,
      moods: moods.length,
      wins: wins.length,
      flags: flags.length,
      letters: letters.length,
      sosUses: activity.sosUses,
      sosSessions: activity.sosSessions,
      popItSessions: activity.popItSessions,
      dailyTaskDays: activity.dailyTaskDays.length,
      dailyTaskStreak: consecutiveDayStreak(activity.dailyTaskDays),
      notificationReturns: activity.notificationReturns,
      returnedAfterGap: activity.returnedAfterGap,
      morningStreak: consecutiveDayStreak(activity.morningDays),
      tabsVisited: activity.tabs.filter((tab) =>
        (TRACKED_TABS as readonly string[]).includes(tab),
      ).length,
      featuresUsed: activity.features.filter((feature) =>
        (TRACKED_FEATURES as readonly string[]).includes(feature),
      ).length,
      appOpenDays: activity.openDays.length,
      relapses: streak?.relapse_count ?? 0,
      onboarded: activity.onboarded || Boolean(profile?.questionnaire_completed),
      profileSetup: activity.profileSetup || Boolean(profile?.display_name),
    };
  }, [enabled, streak, profile, flags, wins, letters, journal, pictures, triggers, moods, activity]);

  const progress = useMemo(() => evaluateBadges(stats), [stats]);
  const owned = useMemo(
    () => new Set(badges.map((row) => row.badge_key)),
    [badges],
  );

  const announced = useRef(false);
  useEffect(() => {
    if (!autoUnlock || !enabled) return;
    const keys = earnedBadgeKeys(stats);
    const fresh = keys.filter((key) => !owned.has(key));
    if (fresh.length === 0) {
      announced.current = true;
      return;
    }
    const isFirstLoad = !announced.current && owned.size === 0;
    announced.current = true;
    void badgeRepo.unlock(userId, keys).then((rows) => {
      queryClient.setQueryData(["badges", userId], rows);
      if (isFirstLoad) return;
      const named = fresh.map((key) => badgeByKey(key)?.label).filter(Boolean) as string[];
      if (named.length === 0) return;
      void celebrate();
      toast(
        named.length === 1
          ? `🎉 Badge unlocked: ${named[0]}`
          : `🎉 ${named.length} badges unlocked: ${named.join(", ")}`,
      );
    });
  }, [autoUnlock, enabled, stats, owned, userId, queryClient]);

  const unlockedCount = progress.filter(
    (item) => item.unlocked || owned.has(item.badge.key),
  ).length;

  return { stats, progress, owned, unlockedCount, total: BADGES.length };
}
