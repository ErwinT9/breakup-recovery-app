import { useEffect, useState } from "react";

import { isOnline, startNetworkWatcher, subscribeNetwork } from "@/lib/offline/network";
import { pendingCount, subscribeQueue } from "@/lib/offline/syncQueue";

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    startNetworkWatcher();
    setOnline(isOnline());
    void pendingCount().then(setPending);
    const offNetwork = subscribeNetwork(setOnline);
    const offQueue = subscribeQueue(setPending);
    return () => {
      offNetwork();
      offQueue();
    };
  }, []);

  return { online, pending };
}