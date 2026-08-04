import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { isNative, platformName, safeNative } from "@/lib/native/platform";
import { storage } from "@/lib/native/storage";

/**
 * Firebase Cloud Messaging registration.
 *
 * Runs only on native builds. Every failure path (denied permission, missing
 * google-services.json, offline Supabase) is swallowed so notifications can
 * never crash the app.
 */

const DEVICE_KEY = "nc:device-id";
const TOKEN_KEY = "nc:push-token";

let listenersWired = false;
let currentUserId: string | null = null;

async function deviceId(): Promise<string> {
  const existing = await storage.get<string | null>(DEVICE_KEY, null);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await storage.set(DEVICE_KEY, generated);
  return generated;
}

/** Upserts the token for this user+device, reactivating an existing row. */
async function saveToken(userId: string, token: string): Promise<void> {
  try {
    const device = await deviceId();
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform: platformName(),
        device_id: device,
        is_active: true,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,token" },
    );
    if (error) throw error;
    // Any other token previously stored for this device is stale.
    await supabase
      .from("push_tokens")
      .update({ is_active: false } as never)
      .eq("user_id", userId)
      .eq("device_id", device)
      .neq("token", token);
    await storage.set(TOKEN_KEY, token);
  } catch (error) {
    analytics.error(error, { stage: "push_token_save" });
  }
}

async function wireListeners(): Promise<void> {
  if (listenersWired) return;
  listenersWired = true;
  await safeNative(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.addListener("registration", (value) => {
      if (currentUserId) void saveToken(currentUserId, value.value);
    });
    await PushNotifications.addListener("registrationError", (error) => {
      analytics.error(error, { stage: "push_registration" });
    });
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      analytics.track("push_received", { title: notification.title ?? "" });
    });
  });
}

/**
 * Requests permission (Android 13+ POST_NOTIFICATIONS), registers with FCM and
 * stores the resulting token against the signed-in user.
 * Returns the token, or null when unsupported/denied/failed.
 */
export async function registerPush(userId: string): Promise<string | null> {
  if (!isNative() || !userId) return null;
  currentUserId = userId;
  await wireListeners();

  const token = await safeNative<string | null>(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== "granted") return null;

    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10_000);
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

  if (token) await saveToken(userId, token);
  return token ?? null;
}

/** Called on sign-in / app start with an existing session. Never throws. */
export async function syncPushRegistration(userId: string): Promise<void> {
  try {
    await registerPush(userId);
  } catch (error) {
    analytics.error(error, { stage: "push_sync" });
  }
}

/** Marks this device's token inactive so logged-out devices stop receiving pushes. */
export async function deactivatePushToken(userId: string | null): Promise<void> {
  currentUserId = null;
  try {
    const token = await storage.get<string | null>(TOKEN_KEY, null);
    if (userId && token) {
      await supabase
        .from("push_tokens")
        .update({ is_active: false } as never)
        .eq("user_id", userId)
        .eq("token", token);
    }
    await storage.remove(TOKEN_KEY);
    await safeNative(async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
      listenersWired = false;
    });
  } catch (error) {
    analytics.error(error, { stage: "push_deactivate" });
  }
}
