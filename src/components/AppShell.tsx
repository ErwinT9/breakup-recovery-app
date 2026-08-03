import { Link, useRouterState } from "@tanstack/react-router";
import { BookHeart, Flame, Settings, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { OfflineBanner } from "@/components/OfflineBanner";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/home", label: "Streak", icon: Flame },
  { to: "/journal", label: "Journal", icon: BookHeart },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/settings", label: "You", icon: Settings },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      <OfflineBanner />
      <main className="flex-1 px-5 pt-4 pb-32">{children}</main>

      <nav
        aria-label="Primary"
        className="glass fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around rounded-t-3xl px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
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
                "press flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary/15",
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