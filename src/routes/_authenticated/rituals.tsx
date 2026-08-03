import { createFileRoute } from "@tanstack/react-router";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { ritualRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/rituals")({
  head: () => ({
    meta: [
      { title: "Rituals | No Contact Tracker" },
      { name: "description", content: "Small daily rituals that keep your recovery steady." },
      { property: "og:title", content: "Rituals | No Contact Tracker" },
      { property: "og:description", content: "Build the routine that carries you through no contact." },
    ],
  }),
  component: () => (
    <ActivityListScreen
      title="Rituals"
      subtitle="The small routines that hold you up"
      cacheKey="rituals"
      repo={ritualRepo}
      mainField="title"
      mainPlaceholder="Morning walk without my phone"
      noteField="note"
      notePlaceholder="Why it helps (optional)"
      suggestions={["Morning walk", "Journal before bed", "Phone away after 9pm"]}
      emptyText="No rituals yet — add one you can repeat tomorrow."
    />
  ),
});
