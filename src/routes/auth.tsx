import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { HeartLeaf } from "@/components/HeartLeaf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { analytics, humanizeError } from "@/lib/analytics";
import { cleanAuthFragment, waitForOAuthSession } from "@/lib/auth/oauthHash";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | No Contact Tracker" },
      { name: "description", content: "Create your private account or sign in to continue your streak." },
      { property: "og:title", content: "Sign in | No Contact Tracker" },
      { property: "og:description", content: "Your streak, flags, wins and letters stay private to you." },
    ],
  }),
  component: AuthScreen,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

type Mode = "welcome" | "signup" | "signin" | "forgot";

function AuthScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analytics.screen("auth");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void waitForOAuthSession().then((oauthSession) => {
      if (cancelled) return;
      if (oauthSession) void navigate({ to: "/home", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (session) void navigate({ to: "/home", replace: true });
  }, [session, navigate]);

  const google = async () => {
    haptic.light();
    setBusy(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    setBusy(false);
    if (oauthError) {
      cleanAuthFragment();
      toast.error(humanizeError(oauthError));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "forgot") {
      const parsed = z.string().email().safeParse(email.trim());
      if (!parsed.success) return setError("Enter a valid email");
      setBusy(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (resetError) return setError(humanizeError(resetError));
      toast.success("Password reset link sent. Check your inbox.");
      setMode("signin");
      return;
    }

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check your details");

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          setMode("signin");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signInError) throw signInError;
        haptic.success();
      }
    } catch (caught) {
      analytics.error(caught, { stage: "auth", mode });
      setError(humanizeError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <HeartLeaf animate={false} className="size-16" />
      <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-tight">
        {mode === "welcome" ? "Welcome. You made it here." : null}
        {mode === "signup" ? "Create your account" : null}
        {mode === "signin" ? "Welcome back" : null}
        {mode === "forgot" ? "Reset your password" : null}
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        {mode === "welcome"
          ? "Your streak, flags, wins and letters stay private to you — synced securely and available offline."
          : "Everything you write is encrypted on your device and tied to your account only."}
      </p>

      <div className="mt-8 flex flex-1 flex-col justify-between">
        {mode === "welcome" ? (
          <div className="flex flex-col gap-3 animate-rise">
            <Button className="press h-13 rounded-2xl text-base" disabled={busy} onClick={google}>
              Continue with Google
            </Button>
            <Button
              variant="secondary"
              className="press h-13 rounded-2xl text-base"
              onClick={() => setMode("signup")}
            >
              Sign up with email
            </Button>
            <Button
              variant="ghost"
              className="press h-13 rounded-2xl text-base"
              onClick={() => setMode("signin")}
            >
              I already have an account
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4 animate-rise" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-13 rounded-2xl"
                required
              />
            </div>

            {mode !== "forgot" ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-13 rounded-2xl"
                  required
                />
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy} className="press h-13 rounded-2xl text-base">
              {mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"}
            </Button>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <button type="button" className="press" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? "Create an account" : "I have an account"}
              </button>
              <button type="button" className="press" onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}