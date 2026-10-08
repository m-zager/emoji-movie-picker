"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { WARM_ORB } from "./brand";
import { useBrand } from "./use-brand";

/** How far down (as lever travel) a drag must reach before letting go counts as a pull. */
const CATCH = -0.35;

/**
 * A slot-machine lever, the height of the slots beside it. Drag the knob down (or tap it, or press Enter or Space)
 * and it swings through toward you; at the bottom `onPull` fires and the arm springs back up with a bounce.
 *
 * The arm is drawn side-on and foreshortened: `t` runs from 1 (up) to -1 (down). The rod scales from the pivot
 * by `t`, and the knob grows as it passes the middle, where it's closest to you.
 */
export default function SlotLever({ onPull, disabled }: { onPull: () => void; disabled: boolean }) {
  const brand = useBrand();
  const t = useMotionValue(1);
  const knobTop = useTransform(t, (v) => `${50 - 40 * v}%`);
  const knobScale = useTransform(t, (v) => 1 + 0.25 * (1 - Math.abs(v)));
  const drag = useRef<{ y0: number; h: number; moved: boolean } | null>(null);
  const busy = useRef(false);

  // Spring back from rest: the drag's own velocity can be huge and would fling the knob off the lever.
  const springBack = () => animate(t, 1, { type: "spring", stiffness: 320, damping: 11, velocity: 0 });

  /** Swing the rest of the way down, fire, then spring back. */
  function pull() {
    if (busy.current) return;
    busy.current = true;
    const done = () => {
      onPull();
      springBack();
      busy.current = false;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      t.set(1);
      done();
      return;
    }
    animate(t, -1, { duration: 0.22 * ((t.get() + 1) / 2) + 0.05, ease: "easeIn" }).then(done);
  }

  function down(e: PointerEvent<HTMLButtonElement>) {
    if (disabled || busy.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    t.stop(); // grabbing mid-bounce takes over from the spring
    drag.current = { y0: e.clientY, h: e.currentTarget.clientHeight, moved: false };
  }

  function move(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y0;
    if (Math.abs(dy) > 4) d.moved = true;
    // The knob's full travel is 80% of the lever's height, which is two units of t.
    if (d.moved) t.set(Math.min(1, Math.max(-1, 1 - (dy / (0.8 * d.h)) * 2)));
  }

  function up() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved || t.get() < CATCH) pull();
    else springBack();
  }

  function key(e: KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      pull();
    }
  }

  return (
    <button
      type="button"
      aria-label="Pull the lever to spin"
      disabled={disabled}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      className="relative h-[88px] w-7 shrink-0 cursor-grab touch-none rounded-full outline-offset-4 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60 sm:h-[150px] sm:w-10"
    >
      {/* The housing the arm swings out of, and its pivot. */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-veil/10 sm:h-7" />
      {/* The rod: from the pivot to the knob, scaled by t (negative flips it below the pivot). */}
      <motion.span
        aria-hidden
        className="absolute top-[10%] left-1/2 h-[40%] w-1 -translate-x-1/2 origin-bottom rounded-full bg-muted-foreground sm:w-1.5"
        style={{ scaleY: t }}
      />
      <span aria-hidden className="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-full bg-paper sm:size-3" />
      {/* The knob: the lime ball in Brand 01, the orange orb in Brand 02. */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 size-7 rounded-full bg-lime shadow-[inset_-4px_-6px_10px_rgb(0_0_0/0.18),0_8px_16px_-8px_rgb(0_0_0/0.45)] sm:size-10"
        style={{
          top: knobTop,
          scale: knobScale,
          x: "-50%",
          y: "-50%",
          background: brand === "02" ? WARM_ORB : undefined,
        }}
      />
    </button>
  );
}
