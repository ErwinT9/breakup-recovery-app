import { haptic } from "@/lib/native/haptics";

/** Confetti burst + haptic used for badge unlocks. Never throws. */
export async function celebrate(): Promise<void> {
  haptic.success();
  if (typeof window === "undefined") return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    void confetti({
      particleCount: 90,
      spread: 78,
      startVelocity: 38,
      origin: { y: 0.7 },
      colors: ["#6BCB77", "#DDF8E8", "#EAF6FF", "#F3EDFF", "#FFEAEA"],
      disableForReducedMotion: true,
    });
  } catch {
    /* confetti is decorative only */
  }
}
