import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | No Contact Tracker" },
      { name: "description", content: "How No Contact Tracker stores, protects and deletes your personal data." },
      { property: "og:title", content: "Privacy Policy | No Contact Tracker" },
      { property: "og:description", content: "Your journals are private to your account and encrypted in transit." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <article className="mx-auto w-full max-w-md space-y-4 px-6 py-[calc(env(safe-area-inset-top)+3rem)] text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-2xl font-semibold text-foreground">Privacy Policy</h1>
      <p>
        This page is maintained by the app owner to answer common privacy questions about No Contact
        Tracker. It is not an independent certification.
      </p>
      <h2 className="pt-2 text-base font-medium text-foreground">What we store</h2>
      <p>
        Your email address, streak dates, mood scores, habit check-ins and journal entries. Journal
        content is cached on your device and synced to your private account.
      </p>
      <h2 className="pt-2 text-base font-medium text-foreground">Who can access it</h2>
      <p>
        Only you. Database access rules scope every row to your authenticated account, so other users
        cannot read your data.
      </p>
      <h2 className="pt-2 text-base font-medium text-foreground">Deletion</h2>
      <p>
        Signing out clears the cache on your device. To delete your account and all synced data,
        contact the app owner from the email on your account.
      </p>
      <h2 className="pt-2 text-base font-medium text-foreground">Payments</h2>
      <p>
        Subscriptions are processed by Google Play through RevenueCat. We never see or store your
        payment details.
      </p>
      <Link to="/" className="inline-block pt-4 text-foreground underline">
        Back to the app
      </Link>
    </article>
  );
}