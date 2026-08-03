import { Capacitor } from "@capacitor/core";

/** Central place to ask: are we running inside the Android/iOS shell? */
export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const platformName = (): string => {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
};

/** Runs a native-only routine and never lets a missing plugin break the UI. */
export async function safeNative<T>(fn: () => Promise<T>, fallback?: T): Promise<T | undefined> {
  if (!isNative()) return fallback;
  try {
    return await fn();
  } catch (error) {
    console.warn("[native] call failed", error);
    return fallback;
  }
}