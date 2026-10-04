"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";

/*
 * A poster that gives under the pointer, adapted from the Tilt card pattern.
 *
 * It SINKS rather than lifts: the point you're over goes away from you and the far side comes up,
 * the opposite of the usual tilt card. A surface that rises to your finger is being displayed; one
 * that gives under it is being touched. Hence rx = -ny and ry = +nx, the negation of the usual pair.
 *
 * The rotation alone reads as pivoting, so two gradients sell the press: shadow pools at the deepest
 * point (under the pointer) and light catches the rim opposite. The drop shadow also tightens, since
 * a pressed card has less air under it.
 *
 * One pair of sprung numbers is the whole state: where the pointer is, normalised to -1..1. The
 * rotation, both gradients and the shadow are all read off them, so they can never disagree.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0..100 into stiffness and per-frame decay, chosen by damping ratio: 0 heavy, 50 balanced, 100 lively. */
const springOf = (tune: number) => ({ k: 0.08 + (tune / 100) * 0.16, d: 0.62 + (tune / 100) * 0.2 });

/**
 * A frame-based spring toward `target`. Damping is raised to dt rather than multiplied by it, so a
 * dropped frame loses the same energy as the two frames it replaced. The loop parks itself once settled.
 * With `instant` (reduced motion) it simply returns the target.
 */
function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    let frame = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        return;
      }
      setAt(cur.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Restarting picks up from the refs, so a target change mid-flight continues instead of snapping.
    return () => cancelAnimationFrame(frame);
  }, [target, tune, instant]);

  return instant ? target : at;
}

/** Perspective: about two and a half card heights back, so corners differ in size without a fisheye. */
const DEPTH = 800;
/** How far the card retreats while touched. Past ~20px it stops being a press and becomes a zoom. */
const SINK = 14;

export default function PosterTilt({
  src,
  alt,
  /** the most either axis turns, in degrees */
  tilt = 10,
  /** corner radius, px */
  corner = 20,
  /** how dark the dent gets, 0..100 */
  shade = 60,
}: {
  src: string;
  alt: string;
  tilt?: number;
  corner?: number;
  shade?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);
  const [still] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Sprung on the pointer POSITION, not the rotation, so the transform and gradients are three readings of one number.
  const sx = useSpring(on ? at.x : 0, 50, still);
  const sy = useSpring(on ? at.y : 0, 50, still);
  const lit = useSpring(on ? 1 : 0, 50, still); // how much of the effect applies, so shadow and sheen fade in

  const max = clamp(tilt, 0, 20);
  const rx = -sy * max;
  const ry = sx * max;
  // Gradient positions as percentages, so they land in the same place at any rendered size.
  const px = ((sx + 1) / 2) * 100;
  const py = ((sy + 1) / 2) * 100;
  const dark = (clamp(shade, 0, 100) / 100) * 0.55 * lit;
  const rim = (clamp(shade, 0, 100) / 100) * 0.34 * lit;

  const track = (e: PointerEvent) => {
    const el = frame.current;
    if (!el) return;
    // Measured from the frame, which never moves; the card itself has already turned away near the edges.
    const r = el.getBoundingClientRect();
    setAt({
      x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
      y: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
    });
    setOn(true);
  };

  return (
    <div
      ref={frame}
      className="relative h-72 w-48 shrink-0 sm:h-[336px] sm:w-56"
      style={{ perspective: DEPTH }}
      onPointerMove={track}
      // `out` with a containment test rather than `leave`, so leaving to nothing (relatedTarget null) still releases.
      onPointerOut={(e) => {
        const to = e.relatedTarget as Node | null;
        if (!frame.current || !to || !frame.current.contains(to)) setOn(false);
      }}
      onPointerCancel={() => setOn(false)} // a touch taken over by a scroll never reports leaving
    >
      <div
        className="relative size-full overflow-hidden will-change-transform"
        style={{
          borderRadius: clamp(corner, 0, 40),
          // translateZ first, so the retreat is in the room's axes; after a rotation the card's own z points sideways.
          transform: `translateZ(${-SINK * lit}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
          // The shadow tightens as the card is pressed: less air under it.
          boxShadow: `0 ${mix(20, 9, lit)}px ${mix(44, 24, lit)}px -8px rgba(0, 0, 0, ${mix(0.55, 0.4, lit)})`,
        }}
      >
        <Image src={src} alt={alt} fill sizes="(min-width: 640px) 224px, 192px" className="object-cover" draggable={false} />
        {/* The dent under the pointer and the lit rim opposite: the layer that makes the tilt read as a press. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(42% 34% at ${px}% ${py}%, rgba(9, 14, 28, ${dark}) 0%, rgba(9, 14, 28, 0) 100%), radial-gradient(52% 42% at ${100 - px}% ${100 - py}%, rgba(255, 255, 255, ${rim}) 0%, rgba(255, 255, 255, 0) 100%)`,
          }}
        />
      </div>
    </div>
  );
}
