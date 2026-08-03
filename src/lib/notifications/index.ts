import { analytics } from "@/lib/analytics";
import { isNative, safeNative } from "@/lib/native/platform";

/**
 * Notification service.
 *
 * Local notifications drive the daily reminders and milestone celebrations and
 * work fully offline. Firebase push notifications are registered on native
 * builds only; the returned token is stored on the user's profile.
 * All plugins are imported lazily so server rendering and the web preview never
 * touch native code.
 */

const CHANNEL_ID = "no-contact-reminders";

async function localPlugin() {
  const mod = await import("@capacitor/local-notifications");
  return mod.LocalNotifications;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) {
    if (typeof Notification === "undefined") return false;
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }
  const granted = await safeNative(async () => {
    const LocalNotifications = await localPlugin();
    const status = await LocalNotifications.requestPermissions();
    return status.display === "granted";
  }, false);
  return Boolean(granted);
}

async function ensureChannel(): Promise<void> {
  await safeNative(async () => {
    const LocalNotifications = await localPlugin();
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Daily support",
      description: "Reminders, encouragement and milestone celebrations",
      importance: 4,
      visibility: 1,
    });
  });
}

function atHour(hour: number): Date {
  const when = new Date();
  when.setHours(hour, 0, 0, 0);
  if (when.getTime() <= Date.now()) when.setDate(when.getDate() + 1);
  return when;
}

export type ReminderPrefs = {
  enabled: boolean;
  morning: boolean;
  evening: boolean;
};

/** Re-schedules every recurring reminder from scratch. Safe to call often. */
export async function syncReminders(prefs: ReminderPrefs): Promise<void> {
  await safeNative(async () => {
    const LocalNotifications = await localPlugin();
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    if (!prefs.enabled) return;

    await ensureChannel();
    const notifications = [];
    if (prefs.morning) {
      notifications.push({
        id: 1001,
        channelId: CHANNEL_ID,
        title: "Good morning",
        body: "A new quiet day. You've got this.",
        schedule: { at: atHour(9), repeats: true, every: "day" as const },
      });
    }
    if (prefs.evening) {
      notifications.push({
        id: 1002,
        channelId: CHANNEL_ID,
        title: "Evening check-in",
        body: "How did today go? Log a win before bed.",
        schedule: { at: atHour(20), repeats: true, every: "day" as const },
      });
    }
    notifications.push({
      id: 1003,
      channelId: CHANNEL_ID,
      title: "Still here?",
      body: "We haven't seen you today — your streak is still running.",
      schedule: { at: atHour(13), repeats: true, every: "day" as const },
    });

    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
  });
}

export async function celebrateMilestone(label: string): Promise<void> {
  await safeNative(async () => {
    const LocalNotifications = await localPlugin();
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000) + 2000,
          channelId: CHANNEL_ID,
          title: `${label} unlocked`,
          body: "That's real progress. Take a moment to notice it.",
          schedule: { at: new Date(Date.now() + 2000) },
        },
      ],
    });
  });
}

export async function sosEncouragement(): Promise<void> {
  await safeNative(async () => {
    const LocalNotifications = await localPlugin();
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 3001,
          channelId: CHANNEL_ID,
          title: "The urge is passing",
          body: "You made it through the hardest minutes. Don't text your ex.",
          schedule: { at: new Date(Date.now() + 20 * 60 * 1000) },
        },
      ],
    });
  });
}

/** Registers for Firebase push and resolves with the device token. */
export async function registerPush(): Promise<string | null> {
  if (!isNative()) return null;
  const token = await safeNative<string | null>(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return null;

    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 8000);
      void PushNotifications.addListener("registration", (value) => {
        clearTimeout(timeout);
        resolve(value.value);
      });
      void PushNotifications.addListener("registrationError", (error) => {
        clearTimeout(timeout);
        analytics.error(error, { stage: "push_registration" });
        resolve(null);
      });
      void PushNotifications.register();
    });
  }, null);
  return token ?? null;
}
