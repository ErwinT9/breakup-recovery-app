import { supabase } from "@/integrations/supabase/client";

/** True when the URL still carries a Supabase OAuth/recovery fragment. */
export function hasAuthFragment(hash: string): boolean {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return false;
  const params = new URLSearchParams(raw);
  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("error_description") ||
    params.has("provider_token")
  );
}

/** Strip a leftover "#" (or auth fragment) without reloading the page. */
export function cleanAuthFragment() {
  if (typeof window === "undefined") return;
  const { hash, pathname, search } = window.location;
  if (!hash) return;
  if (hash === "#" || hasAuthFragment(hash)) {
    window.history.replaceState(window.history.state, "", `${pathname}${search}`);
  }
}

/**
 * Waits for supabase-js to finish parsing an OAuth fragment into a session.
 * Resolves immediately when there is no fragment to process.
 */
export async function waitForOAuthSession(timeoutMs = 5000) {
  if (typeof window === "undefined") return null;
  const fragmentPresent = hasAuthFragment(window.location.hash);

  const { data } = await supabase.auth.getSession();
  if (data.session || !fragmentPresent) {
    cleanAuthFragment();
    return data.session;
  }

  const session = await new Promise<null | Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"]>((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next) {
        sub.subscription.unsubscribe();
        window.clearTimeout(timer);
        resolve(next);
      }
    });
    const timer = window.setTimeout(() => {
      sub.subscription.unsubscribe();
      resolve(null);
    }, timeoutMs);
  });

  cleanAuthFragment();
  return session;
}
