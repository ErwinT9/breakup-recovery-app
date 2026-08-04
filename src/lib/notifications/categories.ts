import { storage } from "@/lib/native/storage";

/** Every notification category the user can control individually. */
export type NotificationCategory =
  | "daily_motivation"
  | "morning"
  | "evening"
  | "milestone"
  | "streak"
  | "sos"
  | "inactivity";

export type NotificationPrefs = Record<NotificationCategory, boolean>;

export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: "daily_motivation", label: "Daily motivation" },
  { key: "morning", label: "Morning reminder (9:00)" },
  { key: "evening", label: "Evening reminder (20:00)" },
  { key: "milestone", label: "No contact milestone" },
  { key: "streak", label: "Streak reminder" },
  { key: "sos", label: "SOS encouragement" },
  { key: "inactivity", label: "Inactivity reminder" },
];

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  daily_motivation: true,
  morning: true,
  evening: true,
  milestone: true,
  streak: true,
  sos: true,
  inactivity: true,
};

const KEY = "nc:notif-prefs";

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const stored = await storage.get<Partial<NotificationPrefs>>(KEY, {});
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await storage.set(KEY, prefs);
}
