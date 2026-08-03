const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type Elapsed = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

export function elapsedSince(iso: string, now = Date.now()): Elapsed {
  const start = new Date(iso).getTime();
  const totalMs = Number.isNaN(start) ? 0 : Math.max(0, now - start);
  return {
    days: Math.floor(totalMs / DAY),
    hours: Math.floor((totalMs % DAY) / HOUR),
    minutes: Math.floor((totalMs % HOUR) / MINUTE),
    seconds: Math.floor((totalMs % MINUTE) / SECOND),
    totalMs,
  };
}

export function daysSince(iso: string, now = Date.now()): number {
  return elapsedSince(iso, now).days;
}

export const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

export function nextMilestone(days: number): number {
  return MILESTONES.find((milestone) => milestone > days) ?? days + 30;
}

export function milestoneProgress(days: number): number {
  const next = nextMilestone(days);
  const previous = [...MILESTONES].reverse().find((milestone) => milestone <= days) ?? 0;
  const span = next - previous || 1;
  return Math.min(1, Math.max(0, (days - previous) / span));
}
