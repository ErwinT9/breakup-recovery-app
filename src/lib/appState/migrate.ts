import { Preferences } from "@capacitor/preferences";

import { isNative } from "@/lib/native/platform";

/**
 * Bump whenever cached client state could be shaped by an older release.
 * On a mismatch every locally cached read-model is dropped so the UI is always
 * driven by the current code + a fresh Supabase read, never by legacy state.
 */
export const APP_STATE_VERSION = 3;

const VERSION_KEY = "nc:app-state-version";

/** Disposable keys: cached server reads + derived UI state. */
function isStaleKey(key: string): boolean {
  return (
    key.startsWith("nc:cache:") ||
    key.startsWith("nc:ui:") ||
    key.startsWith("nc:flags:") ||
    key === "nc:entitlement"
  );
}

async function listKeys(): Promise<string[]> {
  if (isNative()) {
    const { keys } = await Preferences.keys();
    return keys;
  }
  if (typeof window === "undefined") return [];
  return Object.keys(window.localStorage);
}

async function readVersion(): Promise<number> {
  if (isNative()) {
    const { value } = await Preferences.get({ key: VERSION_KEY });
    return Number(value ?? 0) || 0;
  }
  if (typeof window === "undefined") return APP_STATE_VERSION;
  return Number(window.localStorage.getItem(VERSION_KEY) ?? 0) || 0;
}

async function writeVersion(version: number): Promise<void> {
  if (isNative()) {
    await Preferences.set({ key: VERSION_KEY, value: String(version) });
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VERSION_KEY, String(version));
}

async function removeKey(key: string): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key });
    return;
  }
  window.localStorage.removeItem(key);
}

/**
 * Runs once per app start. Never touches the offline sync queue (unsent user
 * writes) or auth tokens — only disposable caches Supabase can re-fill.
 */
export async function migrateAppState(): Promise<void> {
  try {
    const current = await readVersion();
    if (current === APP_STATE_VERSION) return;

    const keys = await listKeys();
    await Promise.all(keys.filter(isStaleKey).map((key) => removeKey(key)));
    await writeVersion(APP_STATE_VERSION);
  } catch (error) {
    console.warn("[app-state] migration skipped", error);
  }
}
