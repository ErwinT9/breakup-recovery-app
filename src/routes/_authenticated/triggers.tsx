import { createFileRoute } from "@tanstack/react-router";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { triggerRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/triggers")({
  head: () => ({
    meta: [
      { title: "Triggers | No Contact Tracker" },
      { name: "description", content: "Name the moments that make you want to reach out." },
      { property: "og:title", content: "Triggers | No Contact Tracker" },
      { property: "og:description", content: "Spot your patterns so they stop catching you off guard." },
    ],
  }),
  component: () => (
    <ActivityListScreen
      title="Triggers"
      subtitle="Name them so they lose their grip"
      cacheKey="triggers"
      repo={triggerRepo}
      mainField="title"
      mainPlaceholder="Late nights alone"
      noteField="note"
      notePlaceholder="What you'll do instead (optional)"
      suggestions={["Late nights", "Old photos", "Their song", "Drinking"]}
      emptyText="No triggers logged yet."
    />
  ),
});
