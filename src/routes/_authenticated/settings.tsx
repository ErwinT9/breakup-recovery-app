import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CloudUpload, LogOut, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { clearUserCache } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics } from "@/lib/analytics";
import { flushQueue } from "@/lib/offline/syncQueue";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "You | No Contact Tracker" },
      { name: "description", content: "Manage your subscription, cloud backup and account settings." },
      { property: "og:title", content: "You | No Contact Tracker" },
      { property: "og:description", content: "Your account, backup and privacy controls." },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isPremium, restore, busy } = useSubscription();
  const { online, pending } = useNetworkStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => analytics.screen("settings"), []);

  const backupNow = async () => {
    if (!online) return toast("You're offline — changes will sync automatically.");
    setSyncing(true);
    await flushQueue();
    await queryClient.invalidateQueries();
    setSyncing(false);
    toast.success("Backup complete.");
  };

  return (
    <AppShell title="You">
      <GlassCard>
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-1 truncate text-base font-medium">{user?.email ?? "Your account"}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Plan: <span className="text-foreground">{isPremium ? "Premium" : "Free"}</span>
        </p>
      </GlassCard>

      {!isPremium ? (
        <Button asChild className="press mt-4 h-13 w-full rounded-2xl text-base">
          <Link to="/paywall">
            <Sparkles className="size-4" aria-hidden /> Start 7-day free trial
          </Link>
        </Button>
      ) : null}

      <div className="mt-4 space-y-3">
        <Row
          icon={CloudUpload}
          label="Back up now"
          hint={pending > 0 ? `${pending} change${pending === 1 ? "" : "s"} waiting` : "Everything is synced"}
          onClick={backupNow}
          disabled={syncing}
        />
        <Row icon={RefreshCw} label="Restore purchases" hint="Recover a previous subscription" onClick={restore} disabled={busy} />
        <Row
          icon={ShieldCheck}
          label="Privacy policy"
          hint="How your data is handled"
          onClick={() => void navigate({ to: "/privacy" })}
        />
        <Row
          icon={LogOut}
          label="Sign out"
          hint="Cached data on this device is cleared"
          onClick={async () => {
            if (user) await clearUserCache(user.id);
            await signOut();
            void navigate({ to: "/auth" });
          }}
        />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/terms" className="underline">
          Terms of service
        </Link>
      </p>
    </AppShell>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="press glass flex w-full items-center gap-3 rounded-3xl px-4 py-4 text-left disabled:opacity-60"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-primary/15">
        <Icon className="size-4" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}