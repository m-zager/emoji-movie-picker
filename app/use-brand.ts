"use client";

import { useSyncExternalStore } from "react";
import type { Brand } from "./brand";

// The brand lives on <html data-brand>, set in the server HTML by layout.tsx.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-brand"] });
  return () => observer.disconnect();
}

const read = (): Brand => (document.documentElement.dataset.brand === "01" ? "01" : "02");

/** The active brand, for the few places that need different words or markup rather than different CSS tokens. */
export function useBrand(): Brand {
  // Brand 02 on the server too, so the first render already has its modes, wording and orb.
  return useSyncExternalStore(subscribe, read, () => "02");
}
