import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, Camera, CheckCircle2, ChevronDown, Circle, Flame } from "lucide-react";
import { useState } from "react";

import { SoftCard } from "@/components/SoftCard";
import { journalRepo, localDayKey, pictureRepo, triggerRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

type Row = { created_at: string };

function doneToday(rows: Row[] | undefined) {
  const today = localDayKey();
  return (rows ?? []).some((row) => localDayKey(new Date(row.created_at)) === today);
}

export function DailyTasks() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const enabled = Boolean(userId);
  const [open, setOpen] = useState(true);

  const journal = useQuery({
    queryKey: ["journal", userId],
    queryFn: () => journalRepo.list(userId),
    enabled,
  });
  const pictures = useQuery({
    queryKey: ["pictures", userId],
    queryFn: () => pictureRepo.list(userId),
    enabled,
  });
  const triggers = useQuery({
    queryKey: ["triggers", userId],
    queryFn: () => triggerRepo.list(userId),
    enabled,
  });

  const tasks = [
    {
      key: "journal",
      to: "/journal" as const,
      title: "Daily Journal",
      subtitle: "Write about today's thoughts and feelings.",
      icon: BookOpen,
      tint: "bg-lavender",
      done: doneToday(journal.data),
    },
    {
      key: "picture",
      to: "/pictures" as const,
      title: "Add a Picture",
      subtitle: "Save a photo of your healing journey.",
      icon: Camera,
      tint: "bg-sky",
      done: doneToday(pictures.data),
    },
    {
      key: "trigger",
      to: "/triggers" as const,
      title: "Log a Trigger",
      subtitle: "Record what made you want to reach out today.",
      icon: Flame,
      tint: "bg-coral",
      done: doneToday(triggers.data),
    },
  ];

  const completed = tasks.filter((task) => task.done).length;
  const progress = Math.round((completed / tasks.length) * 100);

  return (
    <SoftCard as="section">
      <button
        type="button"
        className="press flex w-full items-start justify-between gap-3 text-left"
        onClick={() => {
          haptic.light();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
      >
        <div>
          <p className="font-medium">Daily Tasks</p>
          <p className="text-sm text-muted-foreground">Complete today's healing activities.</p>
        </div>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {completed} / {tasks.length}
          <ChevronDown
            className={cn("size-4 transition-transform duration-300", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{completed} / {tasks.length} completed</p>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.key}>
                <Link to={task.to} className="press block" onClick={() => haptic.select()}>
                  <SoftCard className="flex items-center gap-3 p-4">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        task.tint,
                      )}
                    >
                      <task.icon className="size-5 text-on-tint" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.subtitle}</p>
                    </div>
                    {task.done ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Completed
                      </span>
                    ) : (
                      <Circle className="size-4 text-muted-foreground" aria-hidden />
                    )}
                  </SoftCard>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SoftCard>
  );
}
