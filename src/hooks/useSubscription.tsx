import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { analytics } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import {
  getCachedEntitlement,
  presentPaywall,
  refreshEntitlement,
  restorePurchases,
  type EntitlementState,
} from "@/lib/subscription/revenuecat";

type SubscriptionValue = {
  entitlement: EntitlementState | null;
  isPremium: boolean;
  busy: boolean;
  subscribe: () => Promise<void>;
  restore: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionValue>({
  entitlement: null,
  isPremium: false,
  busy: false,
  subscribe: async () => {},
  restore: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [entitlement, setEntitlement] = useState<EntitlementState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getCachedEntitlement().then(setEntitlement);
    void refreshEntitlement().then(setEntitlement);
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    try {
      const result = await presentPaywall();
      if (result.status === "success") {
        setEntitlement(result.state);
        haptic.success();
        toast.success("Welcome to Premium. Your trial has started.");
      } else if (result.status === "cancelled") {
        toast("No worries — the free tools are still yours.");
      } else if (result.status === "pending") {
        toast("Purchase pending. We'll unlock Premium as soon as it clears.");
      } else if (result.status === "unavailable") {
        toast(
          isNative()
            ? "No subscription offering is available right now."
            : "Purchases run in the Android build — this preview shows the paywall UI only.",
        );
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      analytics.error(error, { stage: "subscribe" });
      toast.error("We couldn't reach the store. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setBusy(true);
    try {
      const result = await restorePurchases();
      if (result.status === "success") {
        setEntitlement(result.state);
        toast.success(result.state.isPremium ? "Premium restored." : "No previous purchases found.");
      } else if (result.status === "unavailable") {
        toast("Restore runs in the Android build.");
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{ entitlement, isPremium: Boolean(entitlement?.isPremium), busy, subscribe, restore }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);