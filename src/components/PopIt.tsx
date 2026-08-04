import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { activity } from "@/lib/badgeActivity";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

const DURATION = 60;
const TINTS = ["bg-mint", "bg-sky", "bg-lavender", "bg-blush", "bg-sand"];
const ENCOURAGEMENTS = [
  "Keep going.",
  "You're doing great.",
  "Stay with this moment.",
  "Breathe. You're safe here.",
  "This feeling is passing.",
];

/** Calming, non-competitive pop-it. Full-screen, ~60 seconds. */
export function PopIt({ onDone }: { onDone: () => void }) {
  const [left, setLeft] = useState(DURATION);
  const [popped, setPopped] = useState<Record<number, boolean>>({});
  const [count, setCount] = useState(0);

  const cells = useMemo(
    () => Array.from({ length: 36 }, (_, i) => TINTS[i % TINTS.length] as string),
    [],
  );

  useEffect(() => {
    const id = window.setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const finished = left === 0;
  const recorded = useRef(false);
  useEffect(() => {
    if (!finished || recorded.current) return;
    recorded.current = true;
    activity.popItCompleted();
  }, [finished]);
  const message = ENCOURAGEMENTS[Math.floor((DURATION - left) / 12) % ENCOURAGEMENTS.length];

  const pop = (index: number) => {
    if (finished) return;
    haptic.light();
    setPopped((prev) => {
      if (prev[index]) return prev;
      return { ...prev, [index]: true };
    });
    setCount((c) => c + 1);
    window.setTimeout(() => setPopped((prev) => ({ ...prev, [index]: false })), 900);
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-fade-in">
        <p className="text-2xl font-semibold">You made it through this moment.</p>
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? "pop" : "pops"} — and the urge is quieter than it was.
        </p>
        <Button className="press mt-2 h-12 rounded-2xl px-8" onClick={onDone}>
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-2">
      <div className="flex w-full items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">Popped</p>
        <p className="text-sm font-medium tabular-nums">
          0:{String(left).padStart(2, "0")}
        </p>
      </div>
      <p className="w-full px-1 text-left text-2xl font-semibold tabular-nums">{count}</p>

      <div className="mt-4 grid w-full grid-cols-6 gap-2 rounded-3xl bg-muted/40 p-3">
        {cells.map((tint, index) => (
          <button
            key={index}
            type="button"
            aria-label="Pop"
            onPointerDown={() => pop(index)}
            className={cn(
              "aspect-square rounded-full transition-transform duration-200 ease-out",
              tint,
              popped[index]
                ? "scale-90 opacity-50 shadow-inner"
                : "scale-100 shadow-sm hover:scale-105",
            )}
          />
        ))}
      </div>

      <p className="mt-5 text-sm text-muted-foreground animate-fade-in" key={message}>
        {message}
      </p>
    </div>
  );
}