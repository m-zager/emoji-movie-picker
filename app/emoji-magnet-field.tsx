"use client";

import { MotionConfig, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { VIBES } from "./movies";

/*
 * A magnetic emoji picker, adapted from the MagneticSelect pattern: every emoji sits on a regular
 * honeycomb, and each one you pick becomes a magnet. It swells and takes the lime, and its
 * neighbours are shoved outward along their real bearing from it, hardest next to it and fading
 * with distance. With several picks the fields add up. The regular lattice is the point: a field
 * opening a hole in a honeycomb reads as a force, where the same push on a scatter would just
 * look like a different scatter.
 */

const CHIP = 48;
/** Lattice pitch. 10px of rest gap, so overlapping fields from up to three magnets never make chips touch. */
const PITCH = 58;
const ROW = (PITCH * Math.sqrt(3)) / 2;
/** Room around the lattice for the field to spend itself in without clipping. */
const PAD = 28;
/** How quickly the shove fades, in lattice steps. */
const SPREAD = 2.8;
/** How far past the visible box the cursor lean survives, in px. */
const FADE = 44;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Spot = { x: number; y: number };

/** Lay `count` chips on a honeycomb that fits `width`, odd rows offset by half a step, last row centred. */
function lattice(count: number, width: number): { spots: Spot[]; height: number } {
  const cols = Math.max(1, Math.floor((width - PAD * 2 - CHIP - PITCH / 2) / PITCH) + 1);
  const rows = Math.ceil(count / cols);
  const latticeWidth = (cols - 1) * PITCH + PITCH / 2 + CHIP;
  const left = (width - latticeWidth) / 2 + CHIP / 2;
  const spots: Spot[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = row === rows - 1 ? count - row * cols : cols;
    const centring = ((cols - inRow) * PITCH) / 2;
    spots.push({ x: left + col * PITCH + (row % 2) * (PITCH / 2) + centring, y: PAD + CHIP / 2 + row * ROW });
  }
  return { spots, height: (rows - 1) * ROW + CHIP + PAD * 2 };
}

export default function EmojiMagnetField({
  selected,
  onToggle,
  max,
  disabled = false,
  /** strength of the whole field, 0-100 */
  pull = 55,
  /** how much the springs overshoot on the way to rest, 0-100 */
  bounce = 55,
  /** how far the field leans toward the cursor, 0-100 */
  give = 50,
}: {
  selected: string[];
  onToggle: (emoji: string) => void;
  max: number;
  disabled?: boolean;
  pull?: number;
  bounce?: number;
  give?: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Everything falls out of one decision: how far a picked chip grows. ──
  const p = clamp(pull, 0, 100) / 100;
  const grow = 1.16 + 0.22 * p;
  const room = (CHIP * (grow - 1)) / 2; // the space the swell physically takes on every side
  const aura = 3 + 9 * p; // the push beyond what the geometry demands: making room vs. being repelled
  const tilt = 5 * p;
  const cower = 0.04 + 0.09 * p; // neighbours give up a little size as well as ground

  // Bounce is a damping ratio, so it means the same thing at every stiffness: 0.9 arrives and stops, 0.42 rings.
  const zeta = 0.9 - 0.48 * (clamp(bounce, 0, 100) / 100);
  const swing = (k: number, mass: number) => ({
    type: "spring" as const,
    stiffness: k,
    damping: 2 * Math.sqrt(k * mass) * zeta,
    mass,
  });

  const { spots, height } = width ? lattice(VIBES.length, width) : { spots: [] as Spot[], height: 320 };
  const magnets = selected.map((e) => VIBES.findIndex((v) => v.emoji === e)).filter((i) => i >= 0);
  const full = selected.length >= max;

  // The cursor lean belongs to the group: every chip shifts by one shared vector, so the gaps never change.
  // It's written straight to CSS variables on the field, so moving the mouse doesn't re-render 104 buttons.
  useEffect(() => {
    const box = viewport.current;
    const el = field.current;
    if (!box || !el || !give || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let next = { x: 0, y: 0 };
    const publish = () => {
      frame = 0;
      el.style.setProperty("--lx", `${next.x.toFixed(2)}px`);
      el.style.setProperty("--ly", `${next.y.toFixed(2)}px`);
    };
    const read = (e: PointerEvent) => {
      // Measured from the visible box's centre: zero there (where the direction is undefined), full at its edge,
      // gone FADE px past it.
      const b = box.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2);
      const dy = e.clientY - (b.top + b.height / 2);
      const d = Math.hypot(dx, dy);
      const r = Math.hypot(b.width, b.height) / 2;
      const rise = Math.min(1, d / r);
      const away = d <= r ? 1 : Math.max(0, 1 - (d - r) / FADE);
      const drawn = rise * away * (2 + (clamp(give, 0, 100) / 100) * 5);
      next = drawn > 0 ? { x: (dx / (d || 1)) * drawn, y: (dy / (d || 1)) * drawn } : { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(publish);
    };
    document.addEventListener("pointermove", read, { passive: true });
    return () => {
      document.removeEventListener("pointermove", read);
      cancelAnimationFrame(frame);
    };
  }, [give]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full max-w-4xl">
        <div ref={viewport} className="scroll-fade max-h-80 overflow-y-auto overscroll-contain sm:max-h-[28rem]">
          <div ref={field} role="group" aria-label={`Pick ${max} emojis`} className="relative w-full" style={{ height }}>
            {spots.map((spot, i) => {
              const { emoji, label } = VIBES[i];
              const on = magnets.includes(i);

              // Sum the shove from every other magnet. Each pushes along its own bearing, fading with distance.
              // Picked chips feel it too, so two picks side by side shove each other apart instead of swelling
              // into one another.
              let x = 0;
              let y = 0;
              let rotate = 0;
              let fall = 0;
              let near = Infinity;
              {
                for (const m of magnets) {
                  if (m === i) continue;
                  const dx = spot.x - spots[m].x;
                  const dy = spot.y - spots[m].y;
                  const gap = Math.hypot(dx, dy) || 1;
                  const far = gap / PITCH;
                  near = Math.min(near, far);
                  const f = Math.min(1, Math.exp(-(far - 1) / SPREAD));
                  if (f < 0.05) continue;
                  const push = (room + aura) * f;
                  x += (dx / gap) * push;
                  y += (dy / gap) * push;
                  rotate += (dx / gap) * tilt * f; // only the sideways part of a shove tips a chip
                  fall = Math.max(fall, f);
                }
                // Overlapping fields can't fling a chip further than a single magnet would.
                const moved = Math.hypot(x, y);
                const cap = room + aura;
                if (moved > cap) [x, y] = [(x * cap) / moved, (y * cap) / moved];
              }

              // Near chips spring stiffer, and far ones start later, so the shove visibly travels outward.
              const k = 300 + 280 * (1 - Math.min(near, 3) / 4);
              const wait = (Number.isFinite(near) ? Math.min(near, 8) : 0) * 0.022;
              const scale = on ? grow : 1 - cower * fall;

              return (
                <motion.button
                  key={emoji}
                  type="button"
                  data-on={on || undefined}
                  aria-pressed={on}
                  aria-label={label}
                  title={label}
                  disabled={disabled || (full && !on)}
                  onClick={() => onToggle(emoji)}
                  className="mag-chip group absolute rounded-full outline-offset-2 disabled:cursor-not-allowed disabled:opacity-25"
                  style={{ left: spot.x - CHIP / 2, top: spot.y - CHIP / 2, width: CHIP, height: CHIP }}
                  initial={false}
                  animate={{ x, y, scaleX: scale, scaleY: scale, rotate }}
                  transition={{
                    // X leads and Y follows a beat behind, so a chip flattens and rounds up on its way to size.
                    x: { ...swing(k, 0.9), delay: wait },
                    y: { ...swing(k, 0.9), delay: wait },
                    scaleX: { ...swing(k * 1.24, 0.8), delay: wait },
                    scaleY: { ...swing(k * 0.86, 0.95), delay: wait },
                    rotate: { ...swing(k * 0.8, 1), delay: wait },
                  }}
                >
                  {/* The hover and the lean live on this inner skin, so their CSS transform never fights the spring. */}
                  <span className="mag-skin flex size-full items-center justify-center rounded-full bg-white/[0.06] text-[28px] leading-none group-data-[on]:bg-lime group-data-[on]:shadow-[0_0_0_4px_rgb(229_254_147/0.18)]">
                    {emoji}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
