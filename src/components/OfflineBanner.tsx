import { CloudOff, RefreshCw } from "lucide-react";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { online, pending } = useNetworkStatus();

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-sky px-4 py-2.5 text-sm text-on-tint"
    >
      {online ? (
        <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <CloudOff className="size-4 shrink-0" aria-hidden />
      )}
      <p>
        {online
          ? `Syncing ${pending} saved change${pending === 1 ? "" : "s"}…`
          : "Offline — everything is saved on this device and syncs later."}
      </p>
    </div>
  );
}
