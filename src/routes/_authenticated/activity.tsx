import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Camera,
  HeartHandshake,
  Repeat,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import {
  affirmationRepo,
  journalRepo,
  pictureRepo,
  promiseRepo,
  ritualRepo,
  triggerRepo,
} from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { humanizeError } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity workbook | No Contact Tracker" },
      {
        name: "description",
        content: "Your workbook: pictures, journal, triggers, rituals and affirmations.",
      },
      { property: "og:title", content: "Activity workbook | No Contact Tracker" },
      {
        property: "og:description",
        content: "Daily recovery work in one calm place — track it, don't just feel it.",
      },
    ],
  }),
  component: Activity,
});

const QUICK_ACTIONS = [
  {
    to: "/pictures",
    icon: Camera,
    title: "Add a picture",
    body: "Save a photo of the life you're building.",
    tint: "bg-mint",
  },
  {
    to: "/journal",
    icon: BookOpen,
    title: "Write in your journal",
    body: "Empty your head before it spills into a text.",
    tint: "bg-sky",
  },
  {
    to: "/triggers",
    icon: TriangleAlert,
    title: "Log a trigger",
    body: "Name what pulled at you today.",
    tint: "bg-blush",
  },
  {
    to: "/rituals",
    icon: Repeat,
    title: "Set a ritual",
    body: "One small routine you can repeat tomorrow.",
    tint: "bg-sand",
  },
  {
    to: "/affirmations",
    icon: Sparkles,
    title: "Write an affirmation",
    body: "The line you'll need at 2am.",
    tint: "bg-mint",
  },
] as const;

function Activity() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const use = (key: string, fn: (id: string) => Promise<unknown[]>) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: [key, userId], queryFn: () => fn(userId), enabled: Boolean(userId) });

  const pictures = use("pictures", pictureRepo.list);
  const journal = use("journal", journalRepo.list);
  const triggers = use("triggers", triggerRepo.list);
  const rituals = use("rituals", ritualRepo.list);
  const affirmations = use("affirmations", affirmationRepo.list);
  const promises = use("promises", promiseRepo.list);

  const today = new Date().toISOString().slice(0, 10);
  const promisedToday = (promises.data ?? []).some(
    (row) => (row as { promised_on: string }).promised_on === today,
  );

  const promise = useMutation({
    mutationFn: () => promiseRepo.makeToday(userId),
    onSuccess: (rows) => {
      queryClient.setQueryData(["promises", userId], rows);
      haptic.success();
      void celebrate();
      toast.success("Promise made. One more day of you choosing you.");
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const counters = [
    { label: "Pictures", value: pictures.data?.length ?? 0, icon: Camera },
    { label: "Journal", value: journal.data?.length ?? 0, icon: BookOpen },
    { label: "Triggers", value: triggers.data?.length ?? 0, icon: TriangleAlert },
    { label: "Rituals", value: rituals.data?.length ?? 0, icon: Repeat },
    { label: "Affirmations", value: affirmations.data?.length ?? 0, icon: Sparkles },
  ];

  return (
    <AppShell title="Workbook" subtitle="The daily work that rebuilds you">
      <section aria-labelledby="overview">
        <h2 id="overview" className="px-1 text-sm font-medium text-muted-foreground">
          Activity overview
        </h2>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {counters.map(({ label, value, icon: Icon }) => (
            <SoftCard as="li" key={label} className="p-4 text-center">
              <Icon className="mx-auto size-5 text-primary" aria-hidden />
              <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </SoftCard>
          ))}
        </ul>
      </section>

      <SoftCard className="mt-5 bg-mint">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-0.5 size-5 text-on-tint" aria-hidden />
          <div className="flex-1">
            <p className="font-medium text-on-tint">Today&apos;s promise</p>
            <p className="mt-1 text-sm text-on-tint/80">
              {promisedToday
                ? "You've promised no contact today. Come back tomorrow."
                : "Promise yourself: no contact for the next 24 hours."}
            </p>
            {promisedToday ? null : (
              <Button
                className="press mt-3 h-11 w-full rounded-2xl"
                disabled={promise.isPending}
                onClick={() => promise.mutate()}
              >
                I promise
              </Button>
            )}
          </div>
        </div>
      </SoftCard>

      <section aria-labelledby="quick" className="mt-6">
        <h2 id="quick" className="px-1 text-sm font-medium text-muted-foreground">
          Quick actions
        </h2>
        <ul className="mt-3 space-y-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, title, body, tint }) => (
            <li key={to}>
              <Link
                to={to}
                onClick={() => haptic.select()}
                className="press soft-card flex items-center gap-4 rounded-3xl p-4"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tint}`}
                >
                  <Icon className="size-5 text-on-tint" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-sm text-muted-foreground">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
