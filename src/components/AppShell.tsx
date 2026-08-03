import { Link, useRouterState } from "@tanstack/react-router";
import { Award, Flag, Home, LifeBuoy, Trophy, User } from "lucide-react";
import { useState, type ReactNode } from "react";

import { OfflineBanner } from "@/components/OfflineBanner";
import { SosToolkit } from "@/components/SosToolkit";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/flags", label: "Flags", icon: Flag },
  { to: "/wins", label: "Wins", icon: Trophy },
  { to: "/badges", label: "Badges", icon: Award },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode | undefined;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="flex items-start justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </header>

      <OfflineBanner />
      <main className="flex-1 px-5 pt-5 pb-36">{children}</main>

      <button
        type="button"
        onClick={() => {
          haptic.heavy();
          setSosOpen(true);
        }}
        aria-label="Open emergency toolkit"
        className="press fixed bottom-28 right-[max(1.25rem,calc(50%-11rem))] z-50 flex size-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-[var(--shadow-lift)]"
      >
        <LifeBuoy className="size-6" aria-hidden />
      </button>

      <SosToolkit open={sosOpen} onOpenChange={setSosOpen} />

      <nav
        aria-label="Primary"
        className="surface-blur fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around border-t border-border px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      >
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => haptic.select()}
              aria-current={active ? "page" : undefined}
              className={cn(
                "press flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[0.7rem] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  active && "bg-mint",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
