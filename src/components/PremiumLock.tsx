import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

export function PremiumLock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { isPremium } = useSubscription();

  if (isPremium) return <>{children}</>;

  return (
    <SoftCard className="text-center">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-mint">
        <Lock className="size-5 text-primary" aria-hidden />
      </span>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Button asChild className="press mt-4 w-full rounded-2xl">
        <Link to="/paywall">Start 7-day free trial</Link>
      </Button>
    </SoftCard>
  );
}
