import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, HeartHandshake, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DailyTasks } from "@/components/DailyTasks";
import { HealingProgress } from "@/components/HealingProgress";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  badgeRepo,
  flagRepo,
  letterRepo,
  moodRepo,
  profileRepo,
  streakRepo,
  winRepo,
} from "@/data/repository";
import { MoodCheckIn, type MoodCheckInResult } from "@/components/MoodCheckIn";
import { useAuth } from "@/hooks/useAuth";
import { useDailyQuote } from "@/hooks/useDailyQuote";
import { analytics, humanizeError } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";
import { actionByKey, BADGES, earnedBadgeKeys, moodByKey } from "@/lib/content";
import { haptic } from "@/lib/native/haptics";
import { celebrateMilestone } from "@/lib/notifications";
import { daysSince, elapsedSince } from "@/lib/streak";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your streak | No Contact Tracker" },
      {
        name: "description",
        content: "Watch your no-contact streak grow second by second and see your next milestone.",
      },
      { property: "og:title", content: "Your streak | No Contact Tracker" },
      { property: "og:description", content: "Every second here is a second you didn't reach out." },
    ],
  }),
  component: HomeScreen,
});

function useTick(intervalMs = 1000) {
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-semibold tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">{label}</span>
    </div>
  );
}

/** Display-only capitalization of the stored display name. */
function capitalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function HomeScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useTick();
  const dailyQuote = useDailyQuote();

  useEffect(() => {
    analytics.screen("home");
  }, []);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileRepo.get(userId),
    enabled: Boolean(userId),
  });
  const streak = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.ensure(userId),
    enabled: Boolean(userId),
  });
  const flags = useQuery({
    queryKey: ["flags", userId],
    queryFn: () => flagRepo.list(userId),
    enabled: Boolean(userId),
  });
  const wins = useQuery({
    queryKey: ["wins", userId],
    queryFn: () => winRepo.list(userId),
    enabled: Boolean(userId),
  });
  const letters = useQuery({
    queryKey: ["letters", userId],
    queryFn: () => letterRepo.list(userId),
    enabled: Boolean(userId),
  });
  const todayMood = useQuery({
    queryKey: ["mood-today", userId],
    queryFn: () => moodRepo.today(userId),
    enabled: Boolean(userId),
  });

  const [checkInOpen, setCheckInOpen] = useState(false);

  const saveCheckIn = useMutation({
    mutationFn: async (result: MoodCheckInResult) => {
      if (!userId) return;
      await moodRepo.save(userId, result);
    },
    onSuccess: async () => {
      analytics.track("mood_checkin_saved");
      await queryClient.invalidateQueries({ queryKey: ["mood-today", userId] });
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const resetCheckIn = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await moodRepo.removeToday(userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mood-today", userId] });
      toast("Check-in cleared. You can check in again.");
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const checkin = todayMood.data ?? null;
  const checkinMood = moodByKey(checkin?.mood);
  const checkinAction = actionByKey(checkin?.action);

  useEffect(() => {
    if (profile.isLoading || profile.isFetching || !profile.data) return;
    if (!profile.data.questionnaire_completed) void navigate({ to: "/questionnaire" });
  }, [profile.isLoading, profile.isFetching, profile.data, navigate]);

  const startedAt = streak.data?.started_at;
  const elapsed = elapsedSince(startedAt ?? new Date().toISOString());
  const days = startedAt ? daysSince(startedAt) : 0;

  useEffect(() => {
    if (!userId || !startedAt) return;
    let sosUsed = false;
    try {
      sosUsed = window.localStorage.getItem("nc:sos-used") === "1";
    } catch {
      sosUsed = false;
    }
    const keys = earnedBadgeKeys({
      days,
      flags: flags.data?.length ?? 0,
      wins: wins.data?.length ?? 0,
      letters: letters.data?.length ?? 0,
      sosUsed,
    });
    if (keys.length === 0) return;
    void badgeRepo.unlock(userId, keys).then((rows) => {
      queryClient.setQueryData(["badges", userId], rows);
    });
  }, [userId, startedAt, days, flags.data, wins.data, letters.data, queryClient]);

  const reset = useMutation({
    mutationFn: async () => {
      if (!userId || !streak.data) return;
      await streakRepo.reset(userId, streak.data, days);
    },
    onSuccess: async () => {
      haptic.warning();
      analytics.track("streak_reset", { days });
      toast("Your streak has been reset. Today is a new beginning.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["streak", userId] }),
        queryClient.invalidateQueries({ queryKey: ["badges", userId] }),
        queryClient.invalidateQueries({ queryKey: ["wins", userId] }),
        queryClient.invalidateQueries({ queryKey: ["flags", userId] }),
      ]);
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const milestoneHit = BADGES.find((badge) => badge.days === days);
  useEffect(() => {
    if (!milestoneHit || days === 0) return;
    const key = `nc:milestone:${milestoneHit.key}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      return;
    }
    void celebrate();
    toast(`🎉 Badge Unlocked: ${milestoneHit.label}`);
    void celebrateMilestone(milestoneHit.label);
  }, [milestoneHit, days]);

  const rawName = profile.data?.display_name;
  const name = rawName ? capitalizeName(rawName) : "";

  return (
    <AppShell
      title={name ? `Hi ${name}` : "Your reset"}
      subtitle={
        <span key={dailyQuote} className="animate-fade-in block">
          {dailyQuote}
        </span>
      }
    >
      <div className="space-y-4">
        <SoftCard className="bg-mint text-center">
          <p className="text-sm font-medium text-on-tint/70">No contact for</p>
          <p className="mt-1 text-6xl font-semibold tabular-nums text-on-tint">{elapsed.days}</p>
          <p className="text-sm font-medium text-on-tint/70">
            {elapsed.days === 1 ? "day" : "days"}
          </p>
          <div className="mt-5 flex items-center justify-center gap-6 text-on-tint">
            <Unit value={elapsed.hours} label="hrs" />
            <Unit value={elapsed.minutes} label="min" />
            <Unit value={elapsed.seconds} label="sec" />
          </div>
        </SoftCard>

        <HealingProgress startedAt={startedAt} bestDays={streak.data?.best_days ?? 0} />

        <DailyTasks />

        <div className="grid grid-cols-3 gap-3">
          <Link to="/flags" className="press">
            <SoftCard className="bg-coral h-full text-center">
              <p className="text-2xl font-semibold text-on-tint">{flags.data?.length ?? 0}</p>
              <p className="text-xs text-on-tint/70">Flags</p>
            </SoftCard>
          </Link>
          <Link to="/wins" className="press">
            <SoftCard className="bg-mint h-full text-center">
              <p className="text-2xl font-semibold text-on-tint">{wins.data?.length ?? 0}</p>
              <p className="text-xs text-on-tint/70">Wins</p>
            </SoftCard>
          </Link>
          <Link to="/badges" className="press">
            <SoftCard className="bg-lavender h-full text-center">
              <p className="text-2xl font-semibold text-on-tint">
                {earnedBadgeKeys({
                  days,
                  flags: flags.data?.length ?? 0,
                  wins: wins.data?.length ?? 0,
                  letters: letters.data?.length ?? 0,
                  sosUsed: false,
                }).length}
              </p>
              <p className="text-xs text-on-tint/70">Badges</p>
            </SoftCard>
          </Link>
        </div>

        <Link to="/letters" className="press block">
          <SoftCard className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-lavender">
              <Mail className="size-5 text-on-tint" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-medium">Unsent letters</p>
              <p className="text-sm text-muted-foreground">
                Say everything — without sending it.
              </p>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
          </SoftCard>
        </Link>

        <SoftCard className="bg-sky">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-on-tint" aria-hidden />
            <p className="text-sm text-on-tint">
              The urge to reach out fades faster every single day.
            </p>
          </div>
        </SoftCard>


        {checkin ? (
          <SoftCard className="animate-rise space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">Today's mood</p>
                <p className="mt-1 font-medium">
                  <span aria-hidden>{checkinMood?.emoji ?? "🫶"}</span>{" "}
                  {checkinMood?.label ?? checkin.mood}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Today's intention
                </p>
                <p className="mt-1 font-medium">
                  {checkinAction ? (
                    <>
                      <span aria-hidden>{checkinAction.emoji}</span> {checkinAction.label}
                    </>
                  ) : (
                    (checkin.custom_intention ?? "—")
                  )}
                </p>
              </div>
            </div>
            {checkinAction && checkin.custom_intention ? (
              <p className="text-sm text-muted-foreground">{checkin.custom_intention}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Completed at{" "}
              {new Date(checkin.completed_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="press h-11 flex-1 rounded-2xl"
                onClick={() => {
                  haptic.light();
                  setCheckInOpen(true);
                }}
              >
                View today's check-in
              </Button>
              <Button
                variant="ghost"
                className="press h-11 rounded-2xl text-muted-foreground"
                disabled={resetCheckIn.isPending}
                onClick={() => resetCheckIn.mutate()}
              >
                Reset
              </Button>
            </div>
          </SoftCard>
        ) : (
          <SoftCard className="animate-rise">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lavender">
                <HeartHandshake className="size-5 text-on-tint" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="font-medium">🫶 Daily Mood Check-In</p>
                <p className="text-sm text-muted-foreground">
                  Pause for a minute. Check in with yourself.
                </p>
              </div>
            </div>
            <Button
              className="press mt-4 h-12 w-full rounded-2xl"
              onClick={() => {
                haptic.light();
                setCheckInOpen(true);
              }}
            >
              Check In
            </Button>
          </SoftCard>
        )}

        <MoodCheckIn
          open={checkInOpen}
          onOpenChange={setCheckInOpen}
          saving={saveCheckIn.isPending}
          viewOnly={Boolean(checkin)}
          summary={
            checkin ? (
              <div className="space-y-1">
                <p>
                  <span aria-hidden>{checkinMood?.emoji ?? "🫶"}</span>{" "}
                  {checkinMood?.label ?? checkin.mood}
                </p>
                <p>
                  {checkinAction ? (
                    <>
                      <span aria-hidden>{checkinAction.emoji}</span> {checkinAction.label}
                    </>
                  ) : null}
                </p>
                {checkin.custom_intention ? (
                  <p className="text-muted-foreground">{checkin.custom_intention}</p>
                ) : null}
              </div>
            ) : null
          }
          onComplete={async (result) => {
            await saveCheckIn.mutateAsync(result);
          }}
        />

        <div className="space-y-2 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={reset.isPending}
                className="press h-12 w-full rounded-2xl"
                onClick={() => haptic.light()}
              >
                <AlertTriangle className="size-4" aria-hidden />I broke no contact
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset No Contact?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset your current streak back to Day 0. This action cannot be undone.
                  Are you sure you want to continue? Your best streak of{" "}
                  {Math.max(streak.data?.best_days ?? 0, days)} days is kept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => reset.mutate()}
                >
                  Yes, Reset Streak
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-center text-xs text-muted-foreground">Resets your streak to Day 0</p>
        </div>
      </div>
    </AppShell>
  );
}
