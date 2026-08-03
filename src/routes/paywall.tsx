import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3, BookHeart, CloudUpload, Palette, Target, X } from "lucide-react";
import { useEffect } from "react";

import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics } from "@/lib/analytics";

export const Route = createFileRoute("/paywall")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Premium | No Contact Tracker" },
      { name: "description", content: "Unlock unlimited flags and letters, every badge, advanced reminders and cloud backup." },
      { property: "og:title", content: "Premium | No Contact Tracker" },
      { property: "og:description", content: "7 days free, then cancel anytime." },
    ],
  }),
  component: Paywall,
});

const BENEFITS = [
  { icon: BookHeart, label: "Unlimited flags, wins and letters" },
  { icon: BarChart3, label: "Mood and urge analytics" },
  { icon: Target, label: "Full emergency toolkit and badges" },
  { icon: CloudUpload, label: "Encrypted cloud backup" },
  { icon: Palette, label: "Premium themes and widgets" },
];

function Paywall() {
  const navigate = useNavigate();
  const { subscribe, restore, busy, isPremium } = useSubscription();

  useEffect(() => analytics.screen("paywall"), []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <button
        type="button"
        aria-label="Close"
        className="press self-end text-muted-foreground"
        onClick={() => void navigate({ to: "/home" })}
      >
        <X className="size-5" aria-hidden />
      </button>

      <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-gradient">
        Heal with the full toolkit
      </h1>
      <p className="mt-3 text-muted-foreground">
        7 days free. Cancel anytime before the trial ends and you won't be charged.
      </p>

      <SoftCard className="mt-6 space-y-4 animate-rise">
        {BENEFITS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/15">
              <Icon className="size-4 text-primary" aria-hidden />
            </span>
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </SoftCard>

      <div className="mt-auto pt-8">
        <Button
          className="press h-14 w-full rounded-2xl text-base"
          disabled={busy || isPremium}
          onClick={() => void subscribe()}
        >
          {isPremium ? "You're Premium" : "Start 7-day free trial"}
        </Button>
        <button
          type="button"
          className="press mt-4 w-full text-sm text-muted-foreground"
          onClick={() => void restore()}
          disabled={busy}
        >
          Restore purchases
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Billed through Google Play after the trial. Manage or cancel in Play Store subscriptions.
        </p>
      </div>
    </div>
  );
}