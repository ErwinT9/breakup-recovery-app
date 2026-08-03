import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { BrokenHeart } from "@/components/BrokenHeart";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { STORAGE_KEYS, storage } from "@/lib/native/storage";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "No Contact Tracker: Breakup Reset" },
      {
        name: "description",
        content:
          "Start your no-contact streak, track moods and urges, and rebuild healthy habits after a breakup.",
      },
      { property: "og:title", content: "No Contact Tracker: Breakup Reset" },
      {
        property: "og:description",
        content: "Every day without contact is a step toward healing.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    analytics.screen("splash");
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (loading || cancelled) return;
      const onboarded = await storage.get<boolean>(STORAGE_KEYS.onboarded, false);
      if (cancelled) return;
      if (!onboarded) void navigate({ to: "/onboarding" });
      else if (!session) void navigate({ to: "/auth" });
      else void navigate({ to: "/home" });
    }, 2400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 animate-pulse-glow rounded-full bg-primary/25 blur-3xl"
        />
        <BrokenHeart animate className="size-28" />
      </div>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-gradient animate-rise">
        No Contact Tracker
      </h1>
      <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
        Breakup Reset
      </p>
      <p className="mt-6 max-w-xs text-sm text-muted-foreground animate-rise">
        Every day without contact is a step toward healing.
      </p>
    </div>
  );
}
