import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BellRing, HeartCrack, ShieldCheck, Sparkles, Sprout, Waves } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import { STORAGE_KEYS, storage } from "@/lib/native/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Getting started | No Contact Tracker" },
      { name: "description", content: "A short guided setup for your no-contact recovery journey." },
      { property: "og:title", content: "Getting started | No Contact Tracker" },
      { property: "og:description", content: "Learn why no contact works before you begin." },
    ],
  }),
  component: Onboarding,
});

const PAGES = [
  {
    icon: HeartCrack,
    title: "You're not starting over",
    body: "You're starting fresh. This app keeps one promise: help you get through today without reaching out.",
  },
  {
    icon: Waves,
    title: "Why no contact works",
    body: "Every time you resist contact, the craving loop weakens. Distance gives your nervous system room to settle.",
  },
  {
    icon: Sprout,
    title: "Your healing journey",
    body: "Track your streak, log moods and urges, journal honestly, and build four small daily habits.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Journals are stored encrypted on your device and synced to your private account only. Nobody else can read them.",
  },
  {
    icon: BellRing,
    title: "Gentle reminders",
    body: "Optional nudges when urges usually peak — evenings, weekends and anniversaries.",
    action: "notifications",
  },
  {
    icon: Sparkles,
    title: "Premium, when you're ready",
    body: "Unlimited journals, deep analytics, habit challenges, cloud backup and premium themes. Free for 7 days.",
  },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const page = PAGES[index]!;
  const Icon = page.icon;
  const isLast = index === PAGES.length - 1;

  const finish = async () => {
    await storage.set(STORAGE_KEYS.onboarded, true);
    analytics.track("onboarding_complete", { step: index });
    void navigate({ to: "/auth" });
  };

  const askNotifications = async () => {
    haptic.light();
    if (!isNative()) return;
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const status = await PushNotifications.requestPermissions();
      if (status.receive === "granted") await PushNotifications.register();
    } catch (error) {
      analytics.error(error, { stage: "push_permission" });
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" role="presentation">
          {PAGES.map((item, i) => (
            <span
              key={item.title}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>
        <button type="button" onClick={finish} className="press text-sm text-muted-foreground">
          Skip
        </button>
      </div>

      <div key={page.title} className="flex flex-1 flex-col justify-center animate-rise">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/15">
          <Icon className="size-7 text-primary" aria-hidden />
        </span>
        <h1 className="mt-7 text-3xl leading-tight font-semibold tracking-tight">{page.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{page.body}</p>

        {"action" in page && page.action === "notifications" ? (
          <Button variant="secondary" className="press mt-6 rounded-2xl" onClick={askNotifications}>
            Enable reminders
          </Button>
        ) : null}
      </div>

      <Button
        className="press h-13 w-full rounded-2xl text-base"
        onClick={() => {
          haptic.light();
          if (isLast) void finish();
          else setIndex((value) => value + 1);
        }}
      >
        {isLast ? "Create my account" : "Continue"}
      </Button>
    </div>
  );
}