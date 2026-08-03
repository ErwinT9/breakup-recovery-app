import { platformName } from "./native/platform";

type Props = Record<string, string | number | boolean | null | undefined>;

const MAX_EVENTS = 200;
const events: { name: string; props?: Props | undefined; at: string }[] = [];

/**
 * Minimal analytics + crash reporting sink. Buffers locally so screens can be
 * instrumented today; swap the transport for your provider without touching
 * any call site.
 */
export const analytics = {
  track(name: string, props?: Props) {
    events.push({ name, props, at: new Date().toISOString() });
    if (events.length > MAX_EVENTS) events.shift();
    if (import.meta.env.DEV) console.debug("[analytics]", name, props ?? {});
  },
  screen(name: string) {
    analytics.track("screen_view", { name, platform: platformName() });
  },
  error(error: unknown, context?: Props) {
    const message = error instanceof Error ? error.message : String(error);
    analytics.track("app_error", { ...context, message });
    console.error("[crash]", message, context ?? {});
  },
  drain() {
    return [...events];
  },
};

export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => analytics.error(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => analytics.error(event.reason));
}

/** Turns any thrown value into a calm, user-facing sentence. */
export function humanizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/fetch|network|offline|Failed to fetch/i.test(message))
    return "You're offline. Your changes are saved on this device and will sync automatically.";
  if (/invalid login|credential/i.test(message)) return "That email or password doesn't match.";
  if (/already registered|already exists/i.test(message))
    return "That email already has an account. Try signing in instead.";
  if (/email not confirmed/i.test(message))
    return "Please confirm your email address, then sign in.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a moment.";
  return message || "Something went wrong. Please try again.";
}