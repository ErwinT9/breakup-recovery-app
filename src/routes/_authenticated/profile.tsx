import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Crown, LogOut, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clearUserCache, profileRepo, streakRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics, humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { requestNotificationPermission, syncReminders } from "@/lib/notifications";
import { flushQueue } from "@/lib/offline/syncQueue";
import { daysSince } from "@/lib/streak";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile | No Contact Tracker" },
      {
        name: "description",
        content: "Manage your reminders, backup, premium plan and account details.",
      },
      { property: "og:title", content: "Profile | No Contact Tracker" },
      { property: "og:description", content: "Your account, reminders and privacy settings." },
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { online, pending } = useNetworkStatus();
  const { isPremium, restore, busy } = useSubscription();
  const [name, setName] = useState("");

  useEffect(() => {
    analytics.screen("profile");
  }, []);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileRepo.get(userId),
    enabled: Boolean(userId),
  });
  const streak = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.get(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (profile.data?.display_name) setName(profile.data.display_name);
  }, [profile.data?.display_name]);

  const update = useMutation({
    mutationFn: async (patch: Parameters<typeof profileRepo.update>[1]) =>
      profileRepo.update(userId, patch),
    onSuccess: (next) => {
      queryClient.setQueryData(["profile", userId], next);
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const toggleReminders = async (enabled: boolean) => {
    haptic.select();
    const granted = enabled ? await requestNotificationPermission() : false;
    await update.mutateAsync({ notifications_enabled: enabled && granted });
    await syncReminders({
      enabled: enabled && granted,
      morning: profile.data?.morning_reminder ?? true,
      evening: profile.data?.evening_reminder ?? true,
    });
    if (enabled && !granted) toast("Enable notifications in your phone settings to get reminders.");
  };

  const days = streak.data?.started_at ? daysSince(streak.data.started_at) : 0;

  return (
    <AppShell title="Profile" subtitle={user?.email ?? undefined}>
      <div className="space-y-4">
        <SoftCard className="bg-mint text-center">
          <p className="text-4xl font-semibold text-on-tint">{days}</p>
          <p className="text-sm text-on-tint/75">days of no contact</p>
          <p className="mt-1 text-xs text-on-tint/60">
            Best: {Math.max(streak.data?.best_days ?? 0, days)} days · Restarts:{" "}
            {streak.data?.relapse_count ?? 0}
          </p>
        </SoftCard>

        <SoftCard className="space-y-3">
          <Label htmlFor="display-name">Your name</Label>
          <Input
            id="display-name"
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-12 rounded-2xl"
          />
          <Button
            variant="secondary"
            className="press h-11 w-full rounded-2xl"
            disabled={update.isPending}
            onClick={() => update.mutate({ display_name: name.trim() || null })}
          >
            Save
          </Button>
        </SoftCard>

        <SoftCard className="space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="size-5 text-muted-foreground" aria-hidden />
            <div className="flex-1">
              <p className="font-medium">Daily reminders</p>
              <p className="text-sm text-muted-foreground">Morning nudge and evening check-in.</p>
            </div>
            <Switch
              checked={profile.data?.notifications_enabled ?? false}
              onCheckedChange={(checked) => void toggleReminders(checked)}
              aria-label="Daily reminders"
            />
          </div>
          {profile.data?.notifications_enabled ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm">Morning (9:00)</span>
                <Switch
                  checked={profile.data?.morning_reminder ?? true}
                  onCheckedChange={(checked) => {
                    void update.mutateAsync({ morning_reminder: checked }).then(() =>
                      syncReminders({
                        enabled: true,
                        morning: checked,
                        evening: profile.data?.evening_reminder ?? true,
                      }),
                    );
                  }}
                  aria-label="Morning reminder"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Evening (20:00)</span>
                <Switch
                  checked={profile.data?.evening_reminder ?? true}
                  onCheckedChange={(checked) => {
                    void update.mutateAsync({ evening_reminder: checked }).then(() =>
                      syncReminders({
                        enabled: true,
                        morning: profile.data?.morning_reminder ?? true,
                        evening: checked,
                      }),
                    );
                  }}
                  aria-label="Evening reminder"
                />
              </div>
            </>
          ) : null}
        </SoftCard>

        <SoftCard className="space-y-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="size-5 text-muted-foreground" aria-hidden />
            <div className="flex-1">
              <p className="font-medium">Cloud backup</p>
              <p className="text-sm text-muted-foreground">
                {online
                  ? pending > 0
                    ? `${pending} change${pending === 1 ? "" : "s"} waiting to sync`
                    : "Everything is backed up"
                  : "Offline — changes are saved on this device"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="press h-11 w-full rounded-2xl"
            onClick={() => {
              haptic.light();
              void flushQueue().then(() => toast.success("Backup complete."));
            }}
          >
            Back up now
          </Button>
        </SoftCard>

        {!isPremium ? (
          <Link to="/paywall" className="press block">
            <SoftCard className="bg-lavender flex items-center gap-3">
              <Crown className="size-5 text-on-tint" aria-hidden />
              <div className="flex-1">
                <p className="font-medium text-on-tint">Go Premium</p>
                <p className="text-sm text-on-tint/75">7 days free, then unlock everything.</p>
              </div>
            </SoftCard>
          </Link>
        ) : (
          <SoftCard className="bg-lavender flex items-center gap-3">
            <Crown className="size-5 text-on-tint" aria-hidden />
            <p className="font-medium text-on-tint">Premium active</p>
          </SoftCard>
        )}

        <SoftCard className="space-y-2">
          <Link to="/letters" className="press flex items-center gap-3 py-2">
            <Mail className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-sm font-medium">Unsent letters</span>
          </Link>
          <Link to="/privacy" className="press flex items-center gap-3 py-2">
            <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-sm font-medium">Privacy policy</span>
          </Link>
          <Link to="/terms" className="press flex items-center gap-3 py-2">
            <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-sm font-medium">Terms of service</span>
          </Link>
          <button
            type="button"
            className="press flex w-full items-center gap-3 py-2 text-left"
            disabled={busy}
            onClick={() => void restore()}
          >
            <RefreshCw className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-sm font-medium">Restore purchases</span>
          </button>
        </SoftCard>

        <Button
          variant="ghost"
          className="press h-12 w-full rounded-2xl text-destructive"
          onClick={async () => {
            haptic.light();
            await clearUserCache(userId);
            queryClient.clear();
            await signOut();
            void navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </AppShell>
  );
}
