import { useEffect, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MOOD_ACTIONS, MOODS } from "@/lib/content";
import { celebrate } from "@/lib/celebrate";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export type MoodCheckInResult = {
  mood: string;
  action: string | null;
  custom_intention: string | null;
};

const HOLD_MS = 5000;
const RADIUS = 66;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "press rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/12 text-foreground"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function HoldCircle({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState(done ? 1 : 0);
  const [holding, setHolding] = useState(false);
  const frame = useRef<number | null>(null);
  const start = useRef(0);
  const finished = useRef(done);

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const stop = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    setHolding(false);
    if (!finished.current) setProgress(0);
  };

  const tick = () => {
    const value = Math.min(1, (Date.now() - start.current) / HOLD_MS);
    setProgress(value);
    if (value >= 1) {
      finished.current = true;
      setHolding(false);
      haptic.success();
      onDone();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (finished.current) return;
    haptic.light();
    setHolding(true);
    start.current = Date.now();
    frame.current = requestAnimationFrame(tick);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        aria-label="Press and hold for five seconds"
        onPointerDown={begin}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(event) => event.preventDefault()}
        className="relative flex size-44 touch-none items-center justify-center rounded-full select-none"
      >
        <span
          className={cn(
            "absolute inset-3 rounded-full bg-mint transition-transform duration-700",
            holding ? "scale-105" : "scale-100",
            !finished.current && !holding && "animate-ring-glow",
          )}
        />
        <svg viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            strokeWidth="7"
            className="stroke-muted"
          />
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-100 ease-linear"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <span className="relative text-sm font-medium text-on-tint">
          {finished.current ? <Check className="size-7" aria-hidden /> : holding ? "Keep holding…" : "Hold me"}
        </span>
      </button>
      <p className="min-h-10 text-center text-sm text-muted-foreground">
        {finished.current
          ? "You stayed with your feelings. That takes courage."
          : "Press and hold the circle for 5 seconds."}
      </p>
    </div>
  );
}

export function MoodCheckIn({
  open,
  onOpenChange,
  onComplete,
  saving,
  viewOnly = false,
  summary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: MoodCheckInResult) => Promise<void> | void;
  saving?: boolean;
  viewOnly?: boolean;
  summary?: React.ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(viewOnly ? 3 : 0);
    setMood(null);
    setAction(null);
    setCustom("");
    setHeld(false);
  }, [open, viewOnly]);

  const canFinish = Boolean(action) || custom.trim().length > 0;

  const finish = async () => {
    if (!mood || !canFinish) return;
    await onComplete({
      mood,
      action: action,
      custom_intention: custom.trim() ? custom.trim() : null,
    });
    haptic.success();
    void celebrate();
    setStep(3);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-md">
        {step === 0 && (
          <div key="step-0" className="animate-step-in space-y-5">
            <div className="space-y-1.5">
              <DialogTitle className="text-xl">How does today feel?</DialogTitle>
              <DialogDescription>
                Choose the emotion that best matches how you're feeling right now.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((item) => (
                <Chip
                  key={item.key}
                  selected={mood === item.key}
                  onClick={() => {
                    haptic.select();
                    setMood(item.key);
                  }}
                >
                  <span aria-hidden>{item.emoji}</span> {item.label}
                </Chip>
              ))}
            </div>
            <Button
              className="press h-12 w-full rounded-2xl"
              disabled={!mood}
              onClick={() => setStep(1)}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 1 && (
          <div key="step-1" className="animate-step-in space-y-5">
            <div className="space-y-1.5">
              <DialogTitle className="text-xl">Take a moment to witness this feeling.</DialogTitle>
              <DialogDescription>You don't have to fix it. Just notice it.</DialogDescription>
            </div>
            <HoldCircle done={held} onDone={() => setHeld(true)} />
            <Button
              className="press h-12 w-full rounded-2xl"
              disabled={!held}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="animate-step-in space-y-5">
            <div className="space-y-1.5">
              <DialogTitle className="text-xl">How do you want to respond today?</DialogTitle>
              <DialogDescription>
                Choose one small action that will help you stay strong.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOOD_ACTIONS.map((item) => (
                <Chip
                  key={item.key}
                  selected={action === item.key}
                  onClick={() => {
                    haptic.select();
                    setAction(action === item.key ? null : item.key);
                  }}
                >
                  <span aria-hidden>{item.emoji}</span> {item.label}
                </Chip>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Custom intention</p>
              <Textarea
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                placeholder="Write your own intention for today…"
                rows={3}
                maxLength={280}
                className="rounded-2xl"
              />
            </div>
            <Button
              className="press h-12 w-full rounded-2xl"
              disabled={!canFinish || saving}
              onClick={() => void finish()}
            >
              {saving ? "Saving…" : "Finish check-in"}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="animate-rise space-y-5 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-mint">
              <Sparkles className="size-7 text-on-tint" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <DialogTitle className="text-xl">
                {viewOnly ? "Today's check-in" : "We are Proud of You!"}
              </DialogTitle>
              <DialogDescription>
                You checked in with yourself and chose how you want to move forward. Every small
                step strengthens your healing.
              </DialogDescription>
            </div>
            {viewOnly && summary ? <div className="text-sm">{summary}</div> : null}
            <Button className="press h-12 w-full rounded-2xl" onClick={() => onOpenChange(false)}>
              Return Home
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
