import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | No Contact Tracker" },
      { name: "description", content: "The terms that apply when you use No Contact Tracker: Breakup Reset." },
      { property: "og:title", content: "Terms of Service | No Contact Tracker" },
      { property: "og:description", content: "Subscription, trial and acceptable-use terms." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <article className="mx-auto w-full max-w-md space-y-4 px-6 py-[calc(env(safe-area-inset-top)+3rem)] text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-2xl font-semibold text-foreground">Terms of Service</h1>
      <h2 className="pt-2 text-base font-medium text-foreground">Not medical advice</h2>
      <p>
        No Contact Tracker is a self-help tool, not therapy or crisis support. If you are in danger or
        having thoughts of self-harm, contact local emergency services.
      </p>
      <h2 className="pt-2 text-base font-medium text-foreground">Your account</h2>
      <p>You are responsible for keeping your login credentials secure and for the content you store.</p>
      <h2 className="pt-2 text-base font-medium text-foreground">Subscriptions</h2>
      <p>
        Premium starts with a 7-day free trial and renews automatically unless cancelled at least 24
        hours before the period ends. Manage or cancel in your Google Play subscriptions.
      </p>
      <h2 className="pt-2 text-base font-medium text-foreground">Availability</h2>
      <p>
        The app works offline and syncs when you reconnect. We aim for reliable service but cannot
        guarantee uninterrupted availability.
      </p>
      <Link to="/" className="inline-block pt-4 text-foreground underline">
        Back to the app
      </Link>
    </article>
  );
}