import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localId, pictureRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { humanizeError } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/native/haptics";

const BUCKET = "activity-pictures";

export const Route = createFileRoute("/_authenticated/pictures")({
  head: () => ({
    meta: [
      { title: "Pictures | No Contact Tracker" },
      { name: "description", content: "Save the photos that remind you why you're staying strong." },
      { property: "og:title", content: "Pictures | No Contact Tracker" },
      { property: "og:description", content: "A private album for your reset." },
    ],
  }),
  component: Pictures,
});

function Pictures() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");

  const pictures = useQuery({
    queryKey: ["pictures", userId],
    queryFn: () => pictureRepo.list(userId),
    enabled: Boolean(userId),
  });

  const rows = pictures.data ?? [];

  const signed = useQuery({
    queryKey: ["pictures-signed", userId, rows.map((row) => row.image_url).join("|")],
    enabled: Boolean(userId) && rows.length > 0,
    queryFn: async () => {
      const paths = rows.map((row) => row.image_url).filter(Boolean);
      if (paths.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${localId()}.${extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      return pictureRepo.save(userId, { image_url: path, caption: caption.trim() || null });
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["pictures", userId], next);
      setCaption("");
      haptic.success();
      toast.success("Saved to your private album.");
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from(BUCKET).remove([path]);
      return pictureRepo.remove(userId, id);
    },
    onSuccess: (next) => queryClient.setQueryData(["pictures", userId], next),
    onError: (error) => toast.error(humanizeError(error)),
  });

  return (
    <AppShell title="Pictures" subtitle="A private album, visible only to you">
      <SoftCard className="space-y-3">
        <Input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Caption (optional)"
          className="h-12 rounded-2xl"
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) upload.mutate(file);
          }}
        />
        <Button
          className="press h-12 w-full rounded-2xl"
          disabled={upload.isPending}
          onClick={() => {
            haptic.light();
            fileInput.current?.click();
          }}
        >
          <ImagePlus className="mr-2 size-4" aria-hidden />
          {upload.isPending ? "Uploading…" : "Add a picture"}
        </Button>
      </SoftCard>

      {rows.length === 0 ? (
        <p className="mt-5 px-1 text-sm text-muted-foreground">
          No pictures yet — add one that reminds you of your own life.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {rows.map((picture) => (
            <li key={picture.id} className="soft-card overflow-hidden rounded-3xl">
              {signed.data?.[picture.image_url] ? (
                <img
                  src={signed.data[picture.image_url]}
                  alt={picture.caption ?? "Saved picture"}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="aspect-square w-full bg-muted" />
              )}
              <div className="flex items-start justify-between gap-2 p-3">
                <p className="min-w-0 text-xs break-words text-muted-foreground">
                  {picture.caption ?? new Date(picture.created_at).toLocaleDateString()}
                </p>
                <button
                  type="button"
                  aria-label="Delete picture"
                  onClick={() => remove.mutate({ id: picture.id, path: picture.image_url })}
                  className="press text-muted-foreground"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
