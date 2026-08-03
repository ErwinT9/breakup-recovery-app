import { CloudOff, RefreshCw } from "lucide-react";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { online, pending } = useNetworkStatus();

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="glass mx-4 mt-3 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm animate-rise"
    >
      {online ? (
        <RefreshCw className="size-4 shrink-0 animate-spin text-accent" aria-hidden />
      ) : (
        <CloudOff className="size-4 shrink-0 text-primary" aria-hidden />
      )}
      <p className="text-muted-foreground">
        {online
          ? `Syncing ${pending} saved change${pending === 1 ? "" : "s"}…`
          : "Offline — everything is saved on this device and syncs later."}
      </p>
    </div>
  );
}