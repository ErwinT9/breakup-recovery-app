import { createFileRoute } from "@tanstack/react-router";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { journalRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal | No Contact Tracker" },
      { name: "description", content: "A private place to empty your head, one day at a time." },
      { property: "og:title", content: "Journal | No Contact Tracker" },
      { property: "og:description", content: "Private daily entries that stay on your device first." },
    ],
  }),
  component: () => (
    <ActivityListScreen
      title="Journal"
      subtitle="Private, unfiltered, only yours"
      cacheKey="journal"
      repo={journalRepo}
      mainField="body"
      mainPlaceholder="Today felt..."
      noteField="title"
      notePlaceholder="Title (optional)"
      multiline
      emptyText="No entries yet — start with how today felt."
    />
  ),
});
