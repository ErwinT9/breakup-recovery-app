import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Flame, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
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
} from "@/components/ui/alert-dialog";
import { habitRepo, localId, moodRepo, streakRepo } from "@/data/repository";
import type { Streak } from "@/data/types";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { AFFIRMATIONS, HABITS, daysSince, hoursIntoDay, nextMilestone } from "@/lib/streak";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your streak | No Contact Tracker" },
      { name: "description", content: "See how long you've kept no contact and check in with today's habits." },
      { property: "og:title", content: "Your streak | No Contact Tracker" },
      { property: "og:description", content: "Every day without contact is a step toward healing." },
    ],
  }),
  component: Home,
});

const MOODS = [
  { score: 1, label: "Awful", emoji: "😞" },
  { score: 2, label: "Low", emoji: "😕" },
  { score: 3, label: "Okay", emoji: "😐" },
  { score: 4, label: "Good", emoji: "🙂" },
  { score: 5, label: "Strong", emoji: "😊" },
];

function Home() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => analytics.screen("home"), []);

  const { data: streak } = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.get(userId),
    enabled: Boolean(userId),
  });

  const { data: habits = [] } = useQuery({
    queryKey: ["habits", userId],
    queryFn: () => habitRepo.list(userId),
    enabled: Boolean(userId),
  });

  const { data: moods = [] } = useQuery({
    queryKey: ["moods", userId],
    queryFn: () => moodRepo.list(userId),
    enabled: Boolean(userId),
  });

  const effective: Streak = useMemo(
    () =>
      streak ?? {
        id: localId(),
        user_id: userId,
        started_at: new Date().toISOString(),
        best_days: 0,
        relapse_count: 0,
        ex_name: null,
      },
    [streak, userId],
  );

  const days = daysSince(effective.started_at);
  const hours = hoursIntoDay(effective.started_at);
  const target = nextMilestone(days);
  const progress = Math.min(1, days / target);
  const affirmation = AFFIRMATIONS[days % AFFIRMATIONS.length]!;
  const todaysMood = moods.find((entry) => entry.logged_on === today);

  const logMood = async (score: number) => {
    haptic.light();
    await moodRepo.log(userId, score);
    await queryClient.invalidateQueries({ queryKey: ["moods", userId] });
  };

  const toggleHabit = async (key: string) => {
    haptic.select();
    await habitRepo.toggle(userId, key);
    await queryClient.invalidateQueries({ queryKey: ["habits", userId] });
  };

  const resetStreak = async () => {
    haptic.warning();
    await streakRepo.reset(userId, effective, "Reached out", days);
    await queryClient.invalidateQueries({ queryKey: ["streak", userId] });
    setConfirmReset(false);
    toast("Streak reset. A slip isn't a failure — day one starts now.");
  };

  const radius = 78;
  const circumference = 2 * Math.PI * radius;

  return (
    <AppShell title="Your streak">
      <GlassCard className="flex flex-col items-center py-8 animate-rise">
        <div className="relative">
          <svg viewBox="0 0 180 180" className="size-48 -rotate-90" aria-hidden>
            <circle cx="90" cy="90" r={radius} stroke="var(--muted)" strokeWidth="10" fill="none" />
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="var(--primary)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: "stroke-dashoffset 900ms var(--ease-native)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-semibold tracking-tight">{days}</span>
            <span className="text-sm text-muted-foreground">
              {days === 1 ? "day" : "days"} · {hours}h
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Next milestone: <span className="text-foreground">{target} days</span> · Best:{" "}
          <span className="text-foreground">{Math.max(effective.best_days, days)}</span>
        </p>
      </GlassCard>

      <GlassCard className="mt-4 animate-rise">
        <p className="text-base leading-relaxed">"{affirmation}"</p>
      </GlassCard>

      <section className="mt-4" aria-labelledby="mood-heading">
        <h2 id="mood-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          How are you feeling today?
        </h2>
        <GlassCard className="flex justify-between gap-1">
          {MOODS.map((mood) => (
            <button
              key={mood.score}
              type="button"
              onClick={() => logMood(mood.score)}
              aria-label={mood.label}
              aria-pressed={todaysMood?.score === mood.score}
              className={cn(
                "press flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-xs",
                todaysMood?.score === mood.score
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span className="text-2xl">{mood.emoji}</span>
              {mood.label}
            </button>
          ))}
        </GlassCard>
      </section>

      <section className="mt-4" aria-labelledby="habits-heading">
        <h2 id="habits-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          Today's recovery habits
        </h2>
        <GlassCard className="space-y-1 p-2">
          {HABITS.map((habit) => {
            const done = habits.some(
              (entry) => entry.habit_key === habit.key && entry.checked_on === today,
            );
            return (
              <button
                key={habit.key}
                type="button"
                onClick={() => toggleHabit(habit.key)}
                aria-pressed={done}
                className="press flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left"
              >
                {done ? (
                  <CheckCircle2 className="size-5 text-success" aria-hidden />
                ) : (
                  <Circle className="size-5 text-muted-foreground" aria-hidden />
                )}
                <span className="flex-1">
                  <span className={cn("block text-sm", done && "text-muted-foreground line-through")}>
                    {habit.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{habit.hint}</span>
                </span>
              </button>
            );
          })}
        </GlassCard>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button asChild variant="secondary" className="press h-13 rounded-2xl">
          <Link to="/journal">
            <Flame className="size-4" aria-hidden /> Urge hit
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="press h-13 rounded-2xl text-destructive"
          onClick={() => setConfirmReset(true)}
        >
          <ShieldAlert className="size-4" aria-hidden /> I broke it
        </Button>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your streak?</AlertDialogTitle>
            <AlertDialogDescription>
              Your {days}-day record is kept as your personal best. Day one starts again right now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Not yet</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl" onClick={resetStreak}>
              Reset honestly
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}