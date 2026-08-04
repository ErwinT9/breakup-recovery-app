import { useQuery } from "@tanstack/react-query";
import { CircleDot, Flag as FlagIcon, Mail, Sparkles, Trophy, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SoftCard } from "@/components/SoftCard";
import { PopIt } from "@/components/PopIt";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { flagRepo, letterRepo, winRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { AFFIRMATIONS, GROUNDING_STEPS } from "@/lib/content";
import { getSupportQuoteOfTheDay } from "@/lib/dailyQuote";
import { haptic } from "@/lib/native/haptics";
import { sosEncouragement } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Tool = "menu" | "breathe" | "ground" | "flags" | "wins" | "letters" | "words" | "urge";

const MENU: { key: Tool; label: string; hint: string; icon: typeof Wind; tint: string }[] = [
  { key: "breathe", label: "Breathe", hint: "60 seconds, guided", icon: Wind, tint: "bg-sky" },
  { key: "ground", label: "5-4-3-2-1", hint: "Come back to now", icon: Sparkles, tint: "bg-lavender" },
  { key: "flags", label: "Read my flags", hint: "Why you left", icon: FlagIcon, tint: "bg-coral" },
  { key: "wins", label: "Read my wins", hint: "How far you've come", icon: Trophy, tint: "bg-mint" },
  { key: "letters", label: "My letters", hint: "Say it here instead", icon: Mail, tint: "bg-lavender" },
  { key: "urge", label: "Fight the Urge", hint: "Ride it out", icon: CircleDot, tint: "bg-mint" },
];

function useCountdown(seconds: number, active: boolean) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!active) return;
    setLeft(seconds);
    const id = window.setInterval(() => setLeft((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [active, seconds]);
  return left;
}

export function SosToolkit({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [tool, setTool] = useState<Tool>("menu");

  useEffect(() => {
    if (open) {
      setTool("menu");
      analytics.track("sos_opened");
      void sosEncouragement();
      try {
        window.localStorage.setItem("nc:sos-used", "1");
      } catch {
        /* storage is optional */
      }
    }
  }, [open]);

  const flags = useQuery({
    queryKey: ["flags", userId],
    queryFn: () => flagRepo.list(userId),
    enabled: Boolean(userId) && open,
  });
  const wins = useQuery({
    queryKey: ["wins", userId],
    queryFn: () => winRepo.list(userId),
    enabled: Boolean(userId) && open,
  });
  const letters = useQuery({
    queryKey: ["letters", userId],
    queryFn: () => letterRepo.list(userId),
    enabled: Boolean(userId) && open,
  });

  const breatheLeft = useCountdown(60, open && tool === "breathe");
  const affirmation = useMemo(
    () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)],
    [tool],
  );
  const [quote, setQuote] = useState<string | null>(null);
  useEffect(() => {
    if (open) setQuote(getSupportQuoteOfTheDay());
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border-0 bg-background pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
      >
        <SheetHeader className="px-1 text-left">
          <SheetTitle className="text-2xl">Emergency toolkit</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Most urges pass if you give them a little time. Let&apos;s get through this together.
          </p>
        </SheetHeader>

        {tool !== "menu" ? (
          <Button
            variant="ghost"
            className="press mt-2 w-fit rounded-2xl"
            onClick={() => {
              haptic.select();
              setTool("menu");
            }}
          >
            ← All tools
          </Button>
        ) : null}

        <div className="mt-3 space-y-3">
          {tool === "menu" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {MENU.map(({ key, label, hint, icon: Icon, tint }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setTool(key);
                    }}
                    className={cn(
                      "press rounded-3xl p-4 text-left text-on-tint",
                      tint,
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    <p className="mt-2 font-semibold">{label}</p>
                    <p className="text-xs opacity-70">{hint}</p>
                  </button>
                ))}
              </div>
              <SoftCard className="bg-mint">
                <p className="text-sm font-semibold">Don't text your ex</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nothing they could say right now would feel as good as waking up tomorrow with
                  your streak intact.
                </p>
              </SoftCard>
            </>
          ) : null}

          {tool === "breathe" ? (
            <SoftCard className="flex flex-col items-center py-10">
              <div className="animate-breathe flex size-40 items-center justify-center rounded-full bg-mint">
                <span className="text-sm font-medium text-on-tint">
                  {breatheLeft % 8 < 4 ? "Breathe in" : "Breathe out"}
                </span>
              </div>
              <p className="mt-6 text-3xl font-semibold tabular-nums">{breatheLeft}s</p>
              <p className="mt-1 text-sm text-muted-foreground">Follow the circle. In 4, out 4.</p>
            </SoftCard>
          ) : null}

          {tool === "ground" ? (
            <div className="space-y-3">
              {GROUNDING_STEPS.map((step) => (
                <SoftCard key={step.sense} className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lavender text-lg font-semibold text-on-tint">
                    {step.count}
                  </span>
                  <div>
                    <p className="font-medium">{step.sense}</p>
                    <p className="text-sm text-muted-foreground">{step.hint}</p>
                  </div>
                </SoftCard>
              ))}
            </div>
          ) : null}

          {tool === "flags" ? (
            <div className="space-y-3">
              {(flags.data ?? []).length === 0 ? (
                <SoftCard>
                  <p className="text-sm text-muted-foreground">
                    No flags yet. Add a few on the Flags tab so future you has this list.
                  </p>
                </SoftCard>
              ) : (
                (flags.data ?? []).map((flag) => (
                  <SoftCard key={flag.id} className="bg-coral">
                    <p className="font-medium">{flag.title}</p>
                    {flag.note ? <p className="mt-1 text-sm opacity-75">{flag.note}</p> : null}
                  </SoftCard>
                ))
              )}
            </div>
          ) : null}

          {tool === "wins" ? (
            <div className="space-y-3">
              {(wins.data ?? []).length === 0 ? (
                <SoftCard>
                  <p className="text-sm text-muted-foreground">Log your first win on the Wins tab.</p>
                </SoftCard>
              ) : (
                (wins.data ?? []).map((win) => (
                  <SoftCard key={win.id} className="bg-mint">
                    <p className="font-medium">{win.title}</p>
                    <p className="mt-1 text-xs opacity-70">{win.achieved_on}</p>
                  </SoftCard>
                ))
              )}
            </div>
          ) : null}

          {tool === "letters" ? (
            <div className="space-y-3">
              {(letters.data ?? []).length === 0 ? (
                <SoftCard>
                  <p className="text-sm text-muted-foreground">
                    Write what you want to send — into a letter they'll never read.
                  </p>
                </SoftCard>
              ) : (
                (letters.data ?? []).map((letter) => (
                  <SoftCard key={letter.id}>
                    <p className="font-medium">{letter.title ?? "Untitled letter"}</p>
                    <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{letter.body}</p>
                  </SoftCard>
                ))
              )}
            </div>
          ) : null}

          {tool === "urge" ? (
            <SoftCard className="py-4">
              <PopIt onDone={() => onOpenChange(false)} />
              <p className="mt-4 rounded-2xl bg-lavender p-4 text-center text-sm text-on-tint">
                {affirmation}
              </p>
            </SoftCard>
          ) : null}

          {tool === "menu" && quote ? (
            <SoftCard className="bg-sky">
              <p className="animate-fade-in text-sm italic text-on-tint">“{quote}”</p>
            </SoftCard>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
