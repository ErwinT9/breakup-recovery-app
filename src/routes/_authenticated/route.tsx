import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { waitForOAuthSession } from "@/lib/auth/oauthHash";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // If we landed here straight from an OAuth redirect, let supabase-js finish
    // parsing the URL fragment (and clean it up) before checking the session.
    await waitForOAuthSession();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});