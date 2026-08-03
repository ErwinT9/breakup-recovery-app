import { Network } from "@capacitor/network";

import { isNative } from "../native/platform";

type Listener = (online: boolean) => void;

const listeners = new Set<Listener>();
let online = true;
let started = false;

function emit(next: boolean) {
  if (next === online) return;
  online = next;
  listeners.forEach((listener) => listener(next));
}

export function startNetworkWatcher(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  if (isNative()) {
    void Network.getStatus().then((status) => emit(status.connected));
    void Network.addListener("networkStatusChange", (status) => emit(status.connected));
    return;
  }

  online = window.navigator.onLine;
  window.addEventListener("online", () => emit(true));
  window.addEventListener("offline", () => emit(false));
}

export function isOnline(): boolean {
  return online;
}

export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}