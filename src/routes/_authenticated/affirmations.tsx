import { createFileRoute } from "@tanstack/react-router";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { affirmationRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/affirmations")({
  head: () => ({
    meta: [
      { title: "Affirmations | No Contact Tracker" },
      { name: "description", content: "Write the lines you want to hear on the hard days." },
      { property: "og:title", content: "Affirmations | No Contact Tracker" },
      { property: "og:description", content: "Your own words, saved for the moments you need them." },
    ],
  }),
  component: () => (
    <ActivityListScreen
      title="Affirmations"
      subtitle="Words that pull you back to yourself"
      cacheKey="affirmations"
      repo={affirmationRepo}
      mainField="body"
      mainPlaceholder="I am not going backwards today."
      multiline
      suggestions={["I deserve peace.", "This ache is temporary.", "I choose me."]}
      emptyText="No affirmations yet — write the first one above."
    />
  ),
});
