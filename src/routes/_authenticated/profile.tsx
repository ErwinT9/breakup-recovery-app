import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Cloud,
  Crown,
  Download,
  Globe,
  Image as ImageIcon,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SoftCard } from "@/components/SoftCard";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { clearUserCache, profileRepo, streakRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics, humanizeError } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/native/haptics";
import { storage } from "@/lib/native/storage";
import { requestNotificationPermission, syncReminders } from "@/lib/notifications";
import { flushQueue } from "@/lib/offline/syncQueue";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Settings | No Contact Tracker" },
      {
        name: "description",
        content: "Manage your profile, reminders, language, backup and account.",
      },
      { property: "og:title", content: "Settings | No Contact Tracker" },
      { property: "og:description", content: "Your account, reminders and privacy settings." },
    ],
  }),
  component: SettingsScreen,
});

type NotifPrefs = {
  daily_motivation: boolean;
  milestone: boolean;
  sos: boolean;
  streak: boolean;
  offline: boolean;
};

const DEFAULT_NOTIFS: NotifPrefs = {
  daily_motivation: true,
  milestone: true,
  sos: true,
  streak: true,
  offline: false,
};

function Row({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SettingsScreen() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { online, pending } = useNetworkStatus();
  const { isPremium, restore, busy } = useSubscription();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [recovery, setRecovery] = useState("");
  const [language, setLanguage] = useState("en");
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    analytics.screen("settings");
    void storage.get<NotifPrefs>("nc:notif-prefs", DEFAULT_NOTIFS).then(setNotifs);
    void storage.get<string>("nc:language", "en").then(setLanguage);
    void storage.get<string | null>("nc:last-sync", null).then(setLastSync);
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
    if (!profile.data) return;
    setName(profile.data.display_name ?? "");
    setBio(profile.data.bio ?? "");
    setAvatar(profile.data.avatar_url ?? "");
  }, [profile.data]);

  useEffect(() => {
    if (streak.data?.started_at) setRecovery(streak.data.started_at.slice(0, 16));
  }, [streak.data?.started_at]);

  const update = useMutation({
    mutationFn: async (patch: Parameters<typeof profileRepo.update>[1]) =>
      profileRepo.update(userId, patch),
    onSuccess: (next) => queryClient.setQueryData(["profile", userId], next),
    onError: (error) => toast.error(humanizeError(error)),
  });

  const saveNotifs = async (patch: Partial<NotifPrefs>) => {
    const next = { ...notifs, ...patch };
    setNotifs(next);
    haptic.select();
    await storage.set("nc:notif-prefs", next);
  };

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

  const saveProfile = async () => {
    haptic.light();
    await update.mutateAsync({
      display_name: name.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatar.trim() || null,
    });
    if (recovery && streak.data) {
      const next = await streakRepo.setStart(
        userId,
        streak.data,
        new Date(recovery).toISOString(),
      );
      queryClient.setQueryData(["streak", userId], next);
    }
    toast.success("Saved. It syncs automatically when you're online.");
  };

  const syncNow = async () => {
    haptic.light();
    await flushQueue();
    const stamp = new Date().toISOString();
    await storage.set("nc:last-sync", stamp);
    setLastSync(stamp);
    toast.success("Backup complete.");
  };

  const exportData = async () => {
    haptic.light();
    const payload = {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      streak: streak.data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "no-contact-tracker-data.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Your data was exported.");
  };

  const deleteAccount = async () => {
    if (!user?.email) return;
    setDeleting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) throw error;
      await Promise.all([
        supabase.from("flags").delete().eq("user_id", userId),
        supabase.from("wins").delete().eq("user_id", userId),
        supabase.from("badges").delete().eq("user_id", userId),
        supabase.from("letters").delete().eq("user_id", userId),
        supabase.from("streaks").delete().eq("user_id", userId),
        supabase.from("questionnaire_answers").delete().eq("user_id", userId),
      ]);
      await supabase.from("profiles").delete().eq("id", userId);
      await clearUserCache(userId);
      queryClient.clear();
      await signOut();
      toast.success("Your account data was deleted.");
      void navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(humanizeError(error));
    } finally {
      setDeleting(false);
      setPassword("");
    }
  };

  return (
    <div className="animate-in slide-in-from-right-6 fade-in mx-auto flex min-h-screen w-full max-w-md flex-col duration-300">
      <header className="rounded-b-[2rem] bg-muted/60 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6">
        <button
          type="button"
          aria-label="Back"
          onClick={() => {
            haptic.light();
            router.history.back();
          }}
          className="press flex size-10 items-center justify-center rounded-full bg-background"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="mt-4 text-[2rem] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <main className="flex-1 space-y-4 px-5 py-5">
        <SoftCard className="space-y-4">
          <Row icon={UserRound} title="Edit profile" description="Name, bio and photo." />
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              {avatar ? <AvatarImage src={avatar} alt="Profile picture" /> : null}
              <AvatarFallback className="bg-mint text-on-tint">
                {(name || "N").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <Label htmlFor="avatar-url" className="flex items-center gap-2">
                <ImageIcon className="size-4" aria-hidden /> Profile picture URL
              </Label>
              <Input
                id="avatar-url"
                value={avatar}
                placeholder="https://…"
                onChange={(event) => setAvatar(event.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              maxLength={200}
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="recovery-date" className="flex items-center gap-2">
              <CalendarDays className="size-4" aria-hidden /> Recovery start date
            </Label>
            <Input
              id="recovery-date"
              type="datetime-local"
              value={recovery}
              max={new Date().toISOString().slice(0, 16)}
              onChange={(event) => setRecovery(event.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
          <Button
            className="press h-12 w-full rounded-2xl"
            disabled={update.isPending}
            onClick={() => void saveProfile()}
          >
            Save changes
          </Button>
        </SoftCard>

        <SoftCard className="space-y-4">
          <Row icon={Bell} title="Notifications" description="Choose what you want to hear about.">
            <Switch
              checked={profile.data?.notifications_enabled ?? false}
              onCheckedChange={(checked) => void toggleReminders(checked)}
              aria-label="Notifications"
            />
          </Row>
          {profile.data?.notifications_enabled ? (
            <div className="space-y-3">
              {[
                { key: "daily_motivation" as const, label: "Daily motivation" },
                { key: "milestone" as const, label: "Milestone reminder" },
                { key: "sos" as const, label: "SOS reminder" },
                { key: "streak" as const, label: "Streak reminder" },
                { key: "offline" as const, label: "Offline reminder" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={notifs[key]}
                    onCheckedChange={(checked) => void saveNotifs({ [key]: checked })}
                    aria-label={label}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-sm">Morning reminder (9:00)</span>
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
                <span className="text-sm">Evening reminder (20:00)</span>
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
            </div>
          ) : null}
        </SoftCard>

        <SoftCard className="space-y-3">
          <Row icon={Globe} title="Language" description="App language" />
          <Select
            value={language}
            onValueChange={(value) => {
              setLanguage(value);
              void storage.set("nc:language", value);
              toast.success("Language preference saved.");
            }}
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="hi">हिन्दी</SelectItem>
            </SelectContent>
          </Select>
        </SoftCard>

        <SoftCard className="space-y-3">
          <Row icon={Download} title="Export my data" description="Download a copy as JSON." />
          <Button
            variant="secondary"
            className="press h-11 w-full rounded-2xl"
            onClick={() => void exportData()}
          >
            Export
          </Button>
        </SoftCard>

        <SoftCard className="space-y-3">
          <Row
            icon={Cloud}
            title="Backup & sync"
            description={online ? "Connected" : "Offline mode — changes save on this device"}
          />
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Status: {online ? (pending > 0 ? "Syncing" : "Up to date") : "Waiting for network"}</li>
            <li>Pending uploads: {pending}</li>
            <li>Last sync: {lastSync ? new Date(lastSync).toLocaleString() : "Not yet"}</li>
          </ul>
          <Button
            variant="secondary"
            className="press h-11 w-full rounded-2xl"
            onClick={() => void syncNow()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Sync now
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
          <button
            type="button"
            className="press flex w-full items-center gap-3 py-2 text-left"
            onClick={() => {
              haptic.light();
              setLogoutOpen(true);
            }}
          >
            <LogOut className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-sm font-medium">Log out</span>
          </button>
        </SoftCard>

        <Button
          variant="ghost"
          className="press h-12 w-full rounded-2xl text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete account
        </Button>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              All of your cloud data — streak, flags, wins, badges and letters — will be deleted
              permanently. Confirm with your password to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            value={password}
            placeholder="Your password"
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-2xl"
            aria-label="Password"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-2xl"
              disabled={deleting || password.length < 6}
              onClick={() => void deleteAccount()}
            >
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Your data stays safely backed up to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <Button
              className="rounded-2xl"
              onClick={async () => {
                haptic.light();
                await clearUserCache(userId);
                queryClient.clear();
                await signOut();
                void navigate({ to: "/auth", replace: true });
              }}
            >
              Log out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
