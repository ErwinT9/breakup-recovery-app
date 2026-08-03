import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { journalRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal | No Contact Tracker" },
      { name: "description", content: "Write through urges privately and track how strong they felt." },
      { property: "og:title", content: "Journal | No Contact Tracker" },
      { property: "og:description", content: "Private, encrypted journaling for your no-contact journey." },
    ],
  }),
  component: Journal,
});

const FREE_LIMIT = 10;

const schema = z.object({
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1, "Write a few words first").max(5000),
});

function Journal() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { isPremium } = useSubscription();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urge, setUrge] = useState([5]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => analytics.screen("journal"), []);

  const { data: entries = [] } = useQuery({
    queryKey: ["journal", userId],
    queryFn: () => journalRepo.list(userId),
    enabled: Boolean(userId),
  });

  const atLimit = !isPremium && entries.length >= FREE_LIMIT;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse({ title, body });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check your entry");

    await journalRepo.create(userId, {
      title: parsed.data.title?.length ? parsed.data.title : null,
      body: parsed.data.body,
      mood: null,
      urge_level: urge[0] ?? 5,
    });
    await queryClient.invalidateQueries({ queryKey: ["journal", userId] });
    haptic.success();
    setOpen(false);
    setTitle("");
    setBody("");
    setUrge([5]);
    setError(null);
    toast.success("Saved. That urge just lost some power.");
  };

  const remove = async (id: string) => {
    await journalRepo.remove(userId, id);
    await queryClient.invalidateQueries({ queryKey: ["journal", userId] });
  };

  return (
    <AppShell title="Journal">
      <Button
        className="press h-13 w-full rounded-2xl text-base"
        onClick={() => {
          haptic.light();
          if (atLimit) {
            toast("Free plan keeps your latest 10 entries. Start your trial for unlimited journaling.");
            return;
          }
          setOpen(true);
        }}
      >
        <Plus className="size-4" aria-hidden /> New entry
      </Button>

      {!isPremium ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {entries.length}/{FREE_LIMIT} free entries used
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {entries.length === 0 ? (
          <GlassCard className="text-center text-sm text-muted-foreground">
            Nothing here yet. When the urge to reach out hits, write it here instead.
          </GlassCard>
        ) : null}

        {entries.map((entry) => (
          <GlassCard key={entry.id} as="article" className="animate-rise">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-medium">{entry.title ?? "Untitled entry"}</h2>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                  {entry.urge_level != null ? ` · urge ${entry.urge_level}/10` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Delete entry"
                className="press text-muted-foreground"
                onClick={() => remove(entry.id)}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {entry.body}
            </p>
          </GlassCard>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Write it out</SheetTitle>
            <SheetDescription>Only you can read this. Be honest.</SheetDescription>
          </SheetHeader>
          <form onSubmit={save} className="space-y-4 px-4 pb-8">
            <div className="space-y-2">
              <Label htmlFor="journal-title">Title (optional)</Label>
              <Input
                id="journal-title"
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="journal-body">What's coming up?</Label>
              <Textarea
                id="journal-body"
                rows={6}
                maxLength={5000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="rounded-2xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="journal-urge">Urge strength: {urge[0]}/10</Label>
              <Slider id="journal-urge" min={0} max={10} step={1} value={urge} onValueChange={setUrge} />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="press h-13 w-full rounded-2xl text-base">
              Save entry
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}