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
import { flagRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { activity } from "@/lib/badgeActivity";
import { analytics, humanizeError } from "@/lib/analytics";
import { FLAG_CATEGORIES, FLAG_SUGGESTIONS } from "@/lib/content";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/flags")({
  head: () => ({
    meta: [
      { title: "Red flags | No Contact Tracker" },
      {
        name: "description",
        content: "Keep a private list of the reasons you left, ready for the moments you forget.",
      },
      { property: "og:title", content: "Red flags | No Contact Tracker" },
      { property: "og:description", content: "Remember why you left, in your own words." },
    ],
  }),
  component: FlagsScreen,
});

function FlagsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<string>(FLAG_CATEGORIES[0]?.key ?? "other");

  useEffect(() => {
    analytics.screen("flags");
  }, []);

  const flags = useQuery({
    queryKey: ["flags", userId],
    queryFn: () => flagRepo.list(userId),
    enabled: Boolean(userId),
  });

  const add = useMutation({
    mutationFn: async () => flagRepo.save(userId, { title: title.trim(), note: note.trim() || null, category }),
    onSuccess: (rows) => {
      activity.featureUsed("flags");
      queryClient.setQueryData(["flags", userId], rows);
      haptic.success();
      setTitle("");
      setNote("");
      setOpen(false);
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => flagRepo.remove(userId, id),
    onSuccess: (rows) => queryClient.setQueryData(["flags", userId], rows),
    onError: (error) => toast.error(humanizeError(error)),
  });

  return (
    <AppShell
      title="Red flags"
      subtitle="The reasons you left, in your own words."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="press size-11 rounded-full" aria-label="Add a flag">
              <Plus className="size-5" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Add a flag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flag-title">What happened?</Label>
                <Input
                  id="flag-title"
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="They dismissed how I felt"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FLAG_CATEGORIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCategory(item.key)}
                    className={cn(
                      "press rounded-full border border-border px-3 py-1.5 text-sm",
                      category === item.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-note">Details (optional)</Label>
                <Textarea
                  id="flag-note"
                  maxLength={600}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-24 rounded-2xl"
                />
              </div>
              <Button
                className="press h-12 w-full rounded-2xl"
                disabled={!title.trim() || add.isPending}
                onClick={() => add.mutate()}
              >
                Save flag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-3">
        {(flags.data ?? []).length === 0 ? (
          <>
            <SoftCard className="bg-coral">
              <p className="font-medium text-on-tint">Start with one honest memory</p>
              <p className="mt-1 text-sm text-on-tint/75">
                On day 12 at 1am, this list is what stops the text.
              </p>
            </SoftCard>
            <p className="pt-2 text-sm font-medium text-muted-foreground">Common ones</p>
            {FLAG_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="press w-full text-left"
                onClick={() => {
                  setTitle(suggestion);
                  setOpen(true);
                }}
              >
                <SoftCard>
                  <p className="text-sm">{suggestion}</p>
                </SoftCard>
              </button>
            ))}
          </>
        ) : (
          (flags.data ?? []).map((flag) => (
            <SoftCard key={flag.id} className="bg-coral flex items-start gap-3">
              <div className="flex-1">
                <p className="font-medium text-on-tint">{flag.title}</p>
                {flag.note ? (
                  <p className="mt-1 text-sm text-on-tint/75">{flag.note}</p>
                ) : null}
                <p className="mt-2 text-xs text-on-tint/60 uppercase">
                  {FLAG_CATEGORIES.find((item) => item.key === flag.category)?.label ?? "Other"}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete flag ${flag.title}`}
                className="press text-on-tint/60"
                onClick={() => {
                  haptic.light();
                  remove.mutate(flag.id);
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
