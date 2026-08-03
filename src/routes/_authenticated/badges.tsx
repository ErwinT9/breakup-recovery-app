import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { badgeRepo, streakRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { BADGES } from "@/lib/content";
import { daysSince } from "@/lib/streak";
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
  const { user } = useAuth();
  const userId = user?.id ?? "";

  useEffect(() => {
    analytics.screen("badges");
  }, []);

  const badges = useQuery({
    queryKey: ["badges", userId],
    queryFn: () => badgeRepo.list(userId),
    enabled: Boolean(userId),
  });
  const streak = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.get(userId),
    enabled: Boolean(userId),
  });

  const owned = new Set((badges.data ?? []).map((badge) => badge.badge_key));
  const days = streak.data?.started_at ? daysSince(streak.data.started_at) : 0;

  return (
    <AppShell
      title="Badges"
      subtitle={`${owned.size} of ${BADGES.length} unlocked`}
    >
      <div className="grid grid-cols-2 gap-3">
        {BADGES.map((badge) => {
          const unlocked = owned.has(badge.key);
          return (
            <SoftCard
              key={badge.key}
              className={cn(
                "h-full",
                unlocked ? badge.tint : "bg-muted/60 opacity-70",
              )}
            >
              <div className="flex items-center justify-between">
                <p className={cn("font-semibold", unlocked && "text-on-tint")}>{badge.label}</p>
                {unlocked ? null : <Lock className="size-4 text-muted-foreground" aria-hidden />}
              </div>
              <p
                className={cn(
                  "mt-1 text-sm",
                  unlocked ? "text-on-tint/75" : "text-muted-foreground",
                )}
              >
                {badge.description}
              </p>
              {!unlocked && badge.days ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {Math.max(0, badge.days - days)} days to go
                </p>
              ) : null}
            </SoftCard>
          );
        })}
      </div>
    </AppShell>
  );
}
