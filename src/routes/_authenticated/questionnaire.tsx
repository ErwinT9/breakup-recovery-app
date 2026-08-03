import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { profileRepo, questionnaireRepo, streakRepo } from "@/data/repository";
import type { QuestionnaireAnswers } from "@/data/types";
import { useAuth } from "@/hooks/useAuth";
import { analytics, humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { requestNotificationPermission, syncReminders } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/questionnaire")({
  head: () => ({
    meta: [
      { title: "Your reset plan | No Contact Tracker" },
      {
        name: "description",
        content: "Twelve quick questions so your no-contact plan fits your breakup.",
      },
      { property: "og:title", content: "Your reset plan | No Contact Tracker" },
      { property: "og:description", content: "Personalise your no-contact recovery in two minutes." },
    ],
  }),
  component: Questionnaire,
});

type Answers = Partial<QuestionnaireAnswers>;

const REASONS = [
  "They lied to me",
  "Constant arguing",
  "I was disrespected",
  "Cheating",
  "They pulled away",
  "We wanted different things",
  "It drained me",
  "I lost myself",
];

const STEPS = 12;

function Choice({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value?: string | null;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            haptic.select();
            onSelect(option);
          }}
          className={cn(
            "press soft-card rounded-3xl px-5 py-4 text-left text-base",
            value === option && "ring-2 ring-primary",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Questionnaire() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    analytics.screen("questionnaire");
    if (!userId) return;
    void questionnaireRepo.get(userId).then((existing) => {
      if (existing) setAnswers(existing);
    });
  }, [userId]);

  const set = (patch: Answers) => setAnswers((current) => ({ ...current, ...patch }));

  const advance = (patch?: Answers) => {
    if (patch) set(patch);
    haptic.light();
    setStep((current) => Math.min(STEPS - 1, current + 1));
  };

  const finish = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await questionnaireRepo.save(userId, { ...answers, completed: true });
      await profileRepo.update(userId, {
        questionnaire_completed: true,
        display_name: answers.nickname ?? null,
        notifications_enabled: Boolean(answers.wants_reminders),
      });
      const startedAt = answers.last_contact_at ?? new Date().toISOString();
      const streak = await streakRepo.ensure(userId, startedAt);
      if (streak.started_at !== startedAt) await streakRepo.setStart(userId, streak, startedAt);
      if (answers.wants_reminders) {
        const granted = await requestNotificationPermission();
        await syncReminders({ enabled: granted, morning: true, evening: true });
      }
      await queryClient.invalidateQueries();
      haptic.success();
      analytics.track("questionnaire_completed");
      void navigate({ to: "/home" });
    } catch (error) {
      analytics.error(error, { stage: "questionnaire" });
      toast.error(humanizeError(error));
    } finally {
      setSaving(false);
    }
  };

  const reasons = answers.reasons ?? [];

  const content = useMemo(() => {
    switch (step) {
      case 0:
        return {
          title: "What should we call you?",
          hint: "Only you will ever see this.",
          body: (
            <div className="space-y-3">
              <Label htmlFor="nickname">Your name or nickname</Label>
              <Input
                id="nickname"
                maxLength={40}
                value={answers.nickname ?? ""}
                onChange={(event) => set({ nickname: event.target.value })}
                className="h-13 rounded-2xl"
                placeholder="Alex"
              />
            </div>
          ),
        };
      case 1:
        return {
          title: "How old are you?",
          hint: "This tunes the tone of your daily messages.",
          body: (
            <Choice
              options={["Under 18", "18-24", "25-34", "35-44", "45+"]}
              value={answers.age_range}
              onSelect={(age_range) => advance({ age_range })}
            />
          ),
        };
      case 2:
        return {
          title: "How do you identify?",
          hint: "Optional — it helps us write to you, not at you.",
          body: (
            <Choice
              options={["Woman", "Man", "Non-binary", "Prefer not to say"]}
              value={answers.gender}
              onSelect={(gender) => advance({ gender })}
            />
          ),
        };
      case 3:
        return {
          title: "How long were you together?",
          hint: "Longer relationships often need a longer runway.",
          body: (
            <Choice
              options={["Under 3 months", "3-12 months", "1-3 years", "3-5 years", "5+ years"]}
              value={answers.relationship_length}
              onSelect={(relationship_length) => advance({ relationship_length })}
            />
          ),
        };
      case 4:
        return {
          title: "Who ended it?",
          hint: "There's no wrong answer here.",
          body: (
            <Choice
              options={["I did", "They did", "It was mutual", "It just faded"]}
              value={answers.who_ended}
              onSelect={(who_ended) => advance({ who_ended })}
            />
          ),
        };
      case 5:
        return {
          title: "When did you last have contact?",
          hint: "Your streak timer starts from this moment.",
          body: (
            <div className="space-y-3">
              <Label htmlFor="last-contact">Date and time</Label>
              <Input
                id="last-contact"
                type="datetime-local"
                value={
                  answers.last_contact_at
                    ? new Date(answers.last_contact_at).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(event) =>
                  set({
                    last_contact_at: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : null,
                  })
                }
                className="h-13 rounded-2xl"
              />
              <button
                type="button"
                className="press text-sm text-primary"
                onClick={() => set({ last_contact_at: new Date().toISOString() })}
              >
                It was just now
              </button>
            </div>
          ),
        };
      case 6:
        return {
          title: "Why did it end?",
          hint: "Pick as many as fit — these become your flags.",
          body: (
            <div className="flex flex-wrap gap-2">
              {REASONS.map((reason) => {
                const active = reasons.includes(reason);
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      haptic.select();
                      set({
                        reasons: active
                          ? reasons.filter((item) => item !== reason)
                          : [...reasons, reason],
                      });
                    }}
                    className={cn(
                      "press rounded-full border border-border px-4 py-2 text-sm",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card",
                    )}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          ),
        };
      case 7:
        return {
          title: "How often do you check their socials?",
          hint: "Honesty helps — nobody sees this.",
          body: (
            <Choice
              options={["Many times a day", "Once a day", "A few times a week", "Rarely", "Never"]}
              value={answers.checks_social}
              onSelect={(checks_social) => advance({ checks_social })}
            />
          ),
        };
      case 8:
        return {
          title: "How hard does today feel?",
          hint: "1 is calm, 10 is unbearable.",
          body: (
            <div className="space-y-6 py-4">
              <p className="text-center text-5xl font-semibold tabular-nums">
                {answers.difficulty_today ?? 5}
              </p>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[answers.difficulty_today ?? 5]}
                onValueChange={([value]) => set({ difficulty_today: value ?? 5 })}
              />
            </div>
          ),
        };
      case 9:
        return {
          title: "What's your biggest goal?",
          hint: "We'll bring this back on the hard days.",
          body: (
            <Textarea
              maxLength={280}
              value={answers.biggest_goal ?? ""}
              onChange={(event) => set({ biggest_goal: event.target.value })}
              placeholder="Stop checking their profile and feel like myself again."
              className="min-h-32 rounded-3xl"
            />
          ),
        };
      case 10:
        return {
          title: "Want gentle reminders?",
          hint: "A morning nudge and an evening check-in. No spam, ever.",
          body: (
            <Choice
              options: undefined as never,
              value: undefined as never,
              onSelect: undefined as never,
            } as never,
        };
      default:
        return {
          title: "Last one — how did you find us?",
          hint: "It helps us reach more people who need this.",
          body: (
            <Choice
              options={["TikTok", "Instagram", "Google Play", "A friend", "Somewhere else"]}
              value={answers.referral_source}
              onSelect={(referral_source) => set({ referral_source })}
            />
          ),
        };
    }
  }, [step, answers, reasons]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {step + 1}/{STEPS}
        </span>
      </div>

      <div key={step} className="animate-step-in mt-10 flex-1">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
          {content.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{content.hint}</p>
        <div className="mt-8">{content.body}</div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        {step > 0 ? (
          <Button
            variant="ghost"
            className="press h-13 rounded-2xl"
            onClick={() => setStep((current) => current - 1)}
          >
            Back
          </Button>
        ) : null}
        <Button
          className="press h-13 flex-1 rounded-2xl text-base"
          disabled={saving}
          onClick={() => (step === STEPS - 1 ? void finish() : advance())}
        >
          {step === STEPS - 1 ? "Start my reset" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
