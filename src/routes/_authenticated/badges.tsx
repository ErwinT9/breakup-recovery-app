import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { useBadges } from "@/hooks/useBadges";
import { analytics } from "@/lib/analytics";
import { BADGE_CATEGORIES, type BadgeProgress } from "@/lib/badges";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/badges")({
  head: () => ({
    meta: [
      { title: "Badges | No Contact Tracker" },
      {
        name: "description",
        content: "Unlock badges as your no-contact streak grows, from day one to a full year.",
      },
      { property: "og:title", content: "Badges | No Contact Tracker" },
      { property: "og:description", content: "Milestones that prove how far you've come." },
    ],
  }),
  component: BadgesScreen,
});

function BadgesScreen() {
  useEffect(() => {
    analytics.screen("badges");
  }, []);

  const { progress, owned, unlockedCount, total } = useBadges({ autoUnlock: true });

  const groups = BADGE_CATEGORIES.map((category) => ({
    category,
    items: progress.filter((item) => item.badge.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <AppShell title="Badges" subtitle={`${unlockedCount} of ${total} unlocked`}>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.category} className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-sm font-semibold tracking-wide text-foreground/80">
                {group.category}
              </h2>
              <span className="text-xs text-muted-foreground">
                {group.items.filter((item) => item.unlocked || owned.has(item.badge.key)).length}/
                {group.items.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((item) => (
                <BadgeCard
                  key={item.badge.key}
                  item={item}
                  unlocked={item.unlocked || owned.has(item.badge.key)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function BadgeCard({ item, unlocked }: { item: BadgeProgress; unlocked: boolean }) {
  const { badge, current, target, ratio } = item;
  const Icon = badge.icon;
  const showProgress = !unlocked && target > 1;

  return (
    <SoftCard className={cn("h-full", unlocked ? badge.tint : "bg-muted/60")}>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            unlocked ? "bg-white/35" : "bg-background/70",
          )}
        >
          <Icon
            className={cn("size-4.5", unlocked ? "text-on-tint" : "text-muted-foreground")}
            aria-hidden
          />
        </span>
        {unlocked ? null : <Lock className="size-4 text-muted-foreground" aria-hidden />}
      </div>

      <p className={cn("mt-2 font-semibold leading-tight", unlocked && "text-on-tint")}>
        {badge.label}
      </p>
      <p
        className={cn(
          "mt-1 text-xs leading-snug",
          unlocked ? "text-on-tint/75" : "text-muted-foreground",
        )}
      >
        {badge.description}
      </p>

      {showProgress ? (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-foreground/40 transition-[width] duration-500"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {current} / {target}
            {badge.unit ? ` ${badge.unit}` : badge.days ? " Days" : ""}
          </p>
        </div>
      ) : null}
    </SoftCard>
  );
}
