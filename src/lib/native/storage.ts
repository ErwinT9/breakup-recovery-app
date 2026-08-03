import { Preferences } from "@capacitor/preferences";

import { isNative } from "./platform";

/**
 * Lightweight reversible obfuscation for locally cached user content.
 * Device storage is sandboxed already; this keeps plain-text journals from
 * being readable by casual inspection of app storage or devtools.
 */
const CIPHER_KEY = "nc-tracker-v1";

function xor(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    out += String.fromCharCode(input.charCodeAt(i) ^ CIPHER_KEY.charCodeAt(i % CIPHER_KEY.length));
  }
  return out;
}

function encode(value: string): string {
  try {
    return btoa(unescape(encodeURIComponent(xor(value))));
  } catch {
    return value;
  }
}

function decode(value: string): string {
  try {
    return xor(decodeURIComponent(escape(atob(value))));
  } catch {
    return value;
  }
}

async function rawGet(key: string): Promise<string | null> {
  if (isNative()) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

async function rawSet(key: string, value: string): Promise<void> {
  if (isNative()) {
    await Preferences.set({ key, value });
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

async function rawRemove(key: string): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key });
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await rawGet(key);
      if (!raw) return fallback;
      return JSON.parse(decode(raw)) as T;
    } catch (error) {
      console.warn("[storage] read failed", key, error);
      return fallback;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    try {
      await rawSet(key, encode(JSON.stringify(value)));
    } catch (error) {
      console.warn("[storage] write failed", key, error);
    }
  },
  async remove(key: string): Promise<void> {
    await rawRemove(key).catch(() => undefined);
  },
};

export const STORAGE_KEYS = {
  onboarded: "nc:onboarded",
  entitlement: "nc:entitlement",
  syncQueue: "nc:sync-queue",
  cache: (name: string, userId: string) => `nc:cache:${name}:${userId}`,
} as const;