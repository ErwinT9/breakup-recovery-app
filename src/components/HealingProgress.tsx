import { Link } from "@tanstack/react-router";
import { Award, ChevronRight, Target } from "lucide-react";

import { SoftCard } from "@/components/SoftCard";
import { currentMilestoneBadge, nextMilestoneBadge } from "@/lib/content";
import { cn } from "@/lib/utils";

function progressMessage(percent: number, remaining: number, label: string): string {
  if (remaining <= 1) return `1 day left to unlock ${label}.`;
  if (percent >= 75) return `You're almost there — ${remaining} days to go.`;
  if (percent >= 45) return `You're ${percent}% of the way there.`;
  return `Keep going. ${remaining} days left to unlock your next badge.`;
}

/** Streak progress toward the next milestone badge. Badge system is the source of truth. */
export function HealingProgress({ days, bestDays }: { days: number; bestDays: number }) {
  const next = nextMilestoneBadge(days);
  const previous = currentMilestoneBadge(days);
  const floor = previous?.days ?? 0;
  const span = next ? Math.max(1, next.days - floor) : 1;
  const percent = next ? Math.min(100, Math.max(0, Math.round(((days - floor) / span) * 100))) : 100;
  const remaining = next ? Math.max(0, next.days - days) : 0;

  return (
    <Link to="/badges" className="press block">
      <SoftCard>
        <div className="flex items-center justify-between">
          <p className="font-medium">Healing Progress</p>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </div>

        {next ? (
          <>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                  next.tint,
                )}
              >
                <Award className="size-5 text-on-tint" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="size-3.5" aria-hidden />
                  Next goal
                </p>
                <p className="truncate font-semibold">{next.days}-Day Badge</p>
              </div>
              <p className="ml-auto text-sm tabular-nums text-muted-foreground">
                {days} / {next.days} days
              </p>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {progressMessage(percent, remaining, `${next.days}-Day Badge`)}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Every milestone badge unlocked. You are writing your own chapter now.
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Best streak so far: {Math.max(bestDays, days)} days
        </p>
      </SoftCard>
    </Link>
  );
}