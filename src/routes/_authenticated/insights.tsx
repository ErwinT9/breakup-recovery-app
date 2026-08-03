import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { PremiumLock } from "@/components/PremiumLock";
import { habitRepo, journalRepo, moodRepo, streakRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { MILESTONES, daysSince } from "@/lib/streak";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights | No Contact Tracker" },
      { name: "description", content: "See your mood trend, milestones and habit consistency over time." },
      { property: "og:title", content: "Insights | No Contact Tracker" },
      { property: "og:description", content: "Proof that your recovery is moving forward." },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  useEffect(() => analytics.screen("insights"), []);

  const { data: streak } = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.get(userId),
    enabled: Boolean(userId),
  });
  const { data: moods = [] } = useQuery({
    queryKey: ["moods", userId],
    queryFn: () => moodRepo.list(userId),
    enabled: Boolean(userId),
  });
  const { data: habits = [] } = useQuery({
    queryKey: ["habits", userId],
    queryFn: () => habitRepo.list(userId),
    enabled: Boolean(userId),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["journal", userId],
    queryFn: () => journalRepo.list(userId),
    enabled: Boolean(userId),
  });

  const days = streak ? daysSince(streak.started_at) : 0;
  const recent = useMemo(() => moods.slice(0, 14).reverse(), [moods]);
  const average = recent.length
    ? (recent.reduce((total, entry) => total + entry.score, 0) / recent.length).toFixed(1)
    : "—";

  return (
    <AppShell title="Insights">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Current streak" value={`${days}d`} />
        <Stat label="Personal best" value={`${Math.max(streak?.best_days ?? 0, days)}d`} />
        <Stat label="Journal entries" value={String(entries.length)} />
        <Stat label="Habit check-ins" value={String(habits.length)} />
      </div>

      <section className="mt-5" aria-labelledby="milestones-heading">
        <h2 id="milestones-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          Milestones
        </h2>
        <GlassCard className="flex flex-wrap gap-2">
          {MILESTONES.map((milestone) => (
            <span
              key={milestone}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                days >= milestone ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {milestone}d
            </span>
          ))}
        </GlassCard>
      </section>

      <section className="mt-5" aria-labelledby="mood-trend-heading">
        <h2 id="mood-trend-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          Mood trend
        </h2>
        <PremiumLock
          title="Deep analytics"
          description="Track mood and urge patterns over weeks to see what actually helps."
        >
          <GlassCard>
            <p className="text-sm text-muted-foreground">
              14-day average mood: <span className="text-foreground">{average}</span>
            </p>
            <div className="mt-4 flex h-28 items-end gap-1.5" role="img" aria-label="Mood over the last 14 logs">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Log a mood to start your trend.</p>
              ) : (
                recent.map((entry) => (
                  <span
                    key={entry.id}
                    className="flex-1 rounded-t-md bg-primary/70"
                    style={{ height: `${(entry.score / 5) * 100}%` }}
                  />
                ))
              )}
            </div>
          </GlassCard>
        </PremiumLock>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </GlassCard>
  );
}