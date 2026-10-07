"use client";

import { useEffect, useState } from "react";
import { BRAND_STORAGE_KEY, BRANDS, type Brand } from "./brand";

/** Bottom-left switch between the two brands. The layout's inline script applies the saved one before paint. */
export default function BrandSwitch() {
  const [brand, setBrand] = useState<Brand>("01");

  // Sync with whatever the inline script already put on <html>; it isn't known during server render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the attribute only exists after mount
    if (document.documentElement.dataset.brand === "02") setBrand("02");
  }, []);

  function choose(next: Brand) {
    setBrand(next);
    document.documentElement.setAttribute("data-brand", next);
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, next);
    } catch {}
  }

  return (
    <div
      role="radiogroup"
      aria-label="Brand"
      className="fixed bottom-4 left-4 z-40 flex items-center rounded-full border border-border bg-olive p-1 text-sm"
    >
      {BRANDS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={brand === value}
          onClick={() => choose(value)}
          className={`h-8 rounded-full px-3 transition-colors ${
            brand === value ? "bg-ink text-paper shadow-sm" : "text-muted-foreground hover:text-paper"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
