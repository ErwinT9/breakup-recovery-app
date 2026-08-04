import { Link } from "@tanstack/react-router";
import { Award, ChevronRight, Target } from "lucide-react";

import { SoftCard } from "@/components/SoftCard";
import { currentMilestoneBadge, nextMilestoneBadge } from "@/lib/content";
import { elapsedSince } from "@/lib/streak";
import { cn } from "@/lib/utils";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Hours+minutes under 2 days, days+hours beyond. Never months. */
function formatDuration(ms: number, compactUnderDays = 2): string {
  const safe = Math.max(0, ms);
  if (safe < compactUnderDays * DAY_MS) {
    const hours = Math.floor(safe / HOUR_MS);
    const minutes = Math.floor((safe % HOUR_MS) / (60 * 1000));
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }
  const days = Math.floor(safe / DAY_MS);
  const hours = Math.floor((safe % DAY_MS) / HOUR_MS);
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}

function progressMessage(percent: number, remainingMs: number, label: string): string {
  const remaining = formatDuration(remainingMs);
  if (percent >= 75) return `You're almost there — ${remaining} to go.`;
  if (percent >= 45) return `You're ${percent}% of the way to ${label}.`;
  return `Keep going. ${remaining} left to unlock your next badge.`;
}

/** Streak progress toward the next milestone badge. Badge system is the source of truth. */
export function HealingProgress({
  startedAt,
  bestDays,
}: {
  startedAt: string | undefined;
  bestDays: number;
}) {
  const elapsed = elapsedSince(startedAt ?? new Date().toISOString());
  const elapsedMs = elapsed.totalMs;
  const exactDays = elapsedMs / DAY_MS;

  const next = nextMilestoneBadge(exactDays);
  const previous = currentMilestoneBadge(exactDays);
  const floorMs = (previous?.days ?? 0) * DAY_MS;
  const targetMs = next ? next.days * DAY_MS : 0;
  const spanMs = next ? Math.max(1, targetMs - floorMs) : 1;
  const ratio = next ? (elapsedMs - floorMs) / spanMs : 1;
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const remainingMs = next ? Math.max(0, targetMs - elapsedMs) : 0;
  const compactUnder = next && next.days <= 2 ? 2 : 2;

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
                {formatDuration(elapsedMs, compactUnder)} /{" "}
                {next.days < 2 ? `${next.days * 24}h` : `${next.days}d`}
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                  className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                style={{ width: `${percent}%` }}
              />
            </div>
              <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
            </div>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {formatDuration(remainingMs)} remaining
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {progressMessage(percent, remainingMs, `${next.days}-Day Badge`)}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Every milestone badge unlocked. You are writing your own chapter now.
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Best streak so far: {Math.max(bestDays, Math.floor(exactDays))} days
        </p>
      </SoftCard>
    </Link>
  );
}