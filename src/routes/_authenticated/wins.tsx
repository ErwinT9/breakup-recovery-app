import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { winRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { activity } from "@/lib/badgeActivity";
import { analytics, humanizeError } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";
import { WIN_SUGGESTIONS } from "@/lib/content";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/wins")({
  head: () => ({
    meta: [
      { title: "Wins | No Contact Tracker" },
      {
        name: "description",
        content: "Celebrate the small wins that add up to a life without them.",
      },
      { property: "og:title", content: "Wins | No Contact Tracker" },
      { property: "og:description", content: "Proof that you are moving forward." },
    ],
  }),
  component: WinsScreen,
});

function WinsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    analytics.screen("wins");
  }, []);

  const wins = useQuery({
    queryKey: ["wins", userId],
    queryFn: () => winRepo.list(userId),
    enabled: Boolean(userId),
  });

  const add = useMutation({
    mutationFn: async (value: string) =>
      winRepo.save(userId, { title: value.trim(), note: note.trim() || null }),
    onSuccess: (rows) => {
      activity.featureUsed("wins");
      queryClient.setQueryData(["wins", userId], rows);
      haptic.success();
      void celebrate();
      setTitle("");
      setNote("");
      setOpen(false);
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => winRepo.remove(userId, id),
    onSuccess: (rows) => queryClient.setQueryData(["wins", userId], rows),
    onError: (error) => toast.error(humanizeError(error)),
  });

  return (
    <AppShell
      title="Wins"
      subtitle="Every small thing counts. Log it."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="press size-11 rounded-full" aria-label="Add a win">
              <Plus className="size-5" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Log a win</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="win-title">What went well?</Label>
                <Input
                  id="win-title"
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Didn't check their profile all day"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="win-note">How did it feel? (optional)</Label>
                <Textarea
                  id="win-note"
                  maxLength={600}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-24 rounded-2xl"
                />
              </div>
              <Button
                className="press h-12 w-full rounded-2xl"
                disabled={!title.trim() || add.isPending}
                onClick={() => add.mutate(title)}
              >
                Celebrate it
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-3">
        {(wins.data ?? []).length === 0 ? (
          <>
            <SoftCard className="bg-mint">
              <p className="font-medium text-on-tint">Your first win is already here</p>
              <p className="mt-1 text-sm text-on-tint/75">
                You opened this app instead of their chat.
              </p>
            </SoftCard>
            <p className="pt-2 text-sm font-medium text-muted-foreground">Tap to log</p>
            {WIN_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="press w-full text-left"
                onClick={() => add.mutate(suggestion)}
              >
                <SoftCard>
                  <p className="text-sm">{suggestion}</p>
                </SoftCard>
              </button>
            ))}
          </>
        ) : (
          (wins.data ?? []).map((win) => (
            <SoftCard key={win.id} className="bg-mint flex items-start gap-3">
              <div className="flex-1">
                <p className="font-medium text-on-tint">{win.title}</p>
                {win.note ? <p className="mt-1 text-sm text-on-tint/75">{win.note}</p> : null}
                <p className="mt-2 text-xs text-on-tint/60">{win.achieved_on}</p>
              </div>
              <button
                type="button"
                aria-label={`Delete win ${win.title}`}
                className="press text-on-tint/60"
                onClick={() => {
                  haptic.light();
                  remove.mutate(win.id);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </SoftCard>
          ))
        )}
      </div>
    </AppShell>
  );
}
