import { activity } from "@/lib/badgeActivity";
import { isNative, safeNative } from "@/lib/native/platform";

import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  type NotificationPrefs,
} from "./categories";

/**
 * Notification service.
 *
 * Local notifications drive the daily reminders, streak nudges and milestone
 * celebrations — they work fully offline and never touch Supabase or Firebase.
 * Remote push lives in ./push.ts and is native-only.
 */

const CHANNEL_ID = "no-contact-reminders";

let tapsWired = false;

/** Credits the "Never Missed" badge when a reminder brings the user back. */
export async function wireNotificationTaps(): Promise<void> {
  if (tapsWired || !isNative()) return;
  tapsWired = true;
  await safeNative(async () => {
    const LocalNotifications = await localPlugin();
    await LocalNotifications.addListener("localNotificationActionPerformed", () => {
      activity.notificationReturn();
    });
  });
}

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
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
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
  categories?: Partial<NotificationPrefs>;
};

/** Re-schedules every recurring reminder from scratch. Safe to call often. */
export async function syncReminders(prefs: ReminderPrefs): Promise<void> {
  const categories: NotificationPrefs = {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(prefs.categories ?? (await loadNotificationPrefs())),
  };

  await safeNative(async () => {
    const LocalNotifications = await localPlugin();
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    if (!prefs.enabled) return;

    await ensureChannel();
    const notifications = [];
    if (prefs.morning && categories.morning) {
      notifications.push({
        id: 1001,
        channelId: CHANNEL_ID,
        title: "Good morning",
        body: "A new quiet day. You've got this.",
        schedule: { at: atHour(9), repeats: true, every: "day" as const },
      });
    }
    if (prefs.evening && categories.evening) {
      notifications.push({
        id: 1002,
        channelId: CHANNEL_ID,
        title: "Evening check-in",
        body: "How did today go? Log a win before bed.",
        schedule: { at: atHour(20), repeats: true, every: "day" as const },
      });
    }
    if (categories.inactivity) {
      notifications.push({
        id: 1003,
        channelId: CHANNEL_ID,
        title: "Still here?",
        body: "We haven't seen you today — your streak is still running.",
        schedule: { at: atHour(13), repeats: true, every: "day" as const },
      });
    }
    if (categories.daily_motivation) {
      notifications.push({
        id: 1004,
        channelId: CHANNEL_ID,
        title: "One line for today",
        body: "Healing isn't linear. Staying no-contact is still progress.",
        schedule: { at: atHour(11), repeats: true, every: "day" as const },
      });
    }
    if (categories.streak) {
      notifications.push({
        id: 1005,
        channelId: CHANNEL_ID,
        title: "Your streak is alive",
        body: "Open the app and see how far you've come.",
        schedule: { at: atHour(18), repeats: true, every: "day" as const },
      });
    }

    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
  });
}

export async function celebrateMilestone(label: string): Promise<void> {
  const categories = await loadNotificationPrefs();
  if (!categories.milestone) return;
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
  const categories = await loadNotificationPrefs();
  if (!categories.sos) return;
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

export {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_CATEGORIES,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from "./categories";
export type { NotificationCategory, NotificationPrefs } from "./categories";
export { deactivatePushToken, registerPush, syncPushRegistration } from "./push";
