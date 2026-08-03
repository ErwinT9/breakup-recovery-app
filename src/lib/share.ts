import { toast } from "sonner";

import { isNative } from "@/lib/native/platform";

const MESSAGE =
  "I'm using No Contact Tracker: Breakup Reset to stay strong through no contact — streaks, red flags, wins and an SOS toolkit. Join me:";

function appUrl(): string {
  if (typeof window === "undefined") return "https://nocontacttracker.app";
  return window.location.origin;
}

/** Opens the Android share sheet (or the web share API), with a clipboard fallback. */
export async function shareApp(): Promise<void> {
  const text = `${MESSAGE} ${appUrl()}`;

  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: "No Contact Tracker", text, dialogTitle: "Invite a friend" });
      return;
    } catch {
      // fall through to web handling
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "No Contact Tracker", text, url: appUrl() });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Invite copied — paste it anywhere.");
  } catch {
    toast("Sharing isn't available here.");
  }
}
