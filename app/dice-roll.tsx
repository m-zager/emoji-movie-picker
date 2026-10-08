"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { WARM_ORB } from "./brand";
import { useBrand } from "./use-brand";

const DIE = 48; // die diameter in px: the same 48px circle as the Pick three chips
const R = DIE / 2;
const CUP_W = 88;
const CUP_H = 104;
const MOUTH_OFFSET = 38; // distance from the bucket's center to its opening

type Body = { x: number; y: number; vx: number; vy: number; angle: number; va: number };
type Phase = "idle" | "holding" | "tumbling" | "done";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Brand tokens, so the bucket follows the active brand. SVG presentation attributes don't resolve var(), so these go in `style`.
const LIME = "var(--lime)";
const INK = "var(--ink)";
const STRIPE_DARK = "var(--bucket-stripe)";
const KERNEL = "#f2f4ea";

// Popcorn heaped above the rim: [cx, cy, r].
const KERNELS = [
  [21, 21, 7], [32, 14, 8], [44, 11, 9], [56, 14, 8], [67, 21, 7],
  [27, 23, 6], [39, 20, 7], [50, 20, 7], [61, 23, 6],
];

// Five tapered stripes from the rim (y=26) down to the base (y=100).
const STRIPE_TOP = [10, 23.6, 37.2, 50.8, 64.4, 78];
const STRIPE_BOTTOM = [20, 29.6, 39.2, 48.8, 58.4, 68];

/** Striped movie-theater popcorn bucket in the brand colors. Its opening (the "mouth") faces up. */
function PopcornBucket() {
  return (
    <svg viewBox="0 0 88 104" width={CUP_W} height={CUP_H} aria-hidden>
      {KERNELS.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={KERNEL} stroke="#c9cdb5" strokeWidth="1" />
      ))}
      {STRIPE_TOP.slice(0, -1).map((x, i) => (
        <polygon
          key={i}
          points={`${x},26 ${STRIPE_TOP[i + 1]},26 ${STRIPE_BOTTOM[i + 1]},100 ${STRIPE_BOTTOM[i]},100`}
          style={{ fill: i % 2 === 0 ? LIME : STRIPE_DARK }}
        />
      ))}
      <path d="M10 26 L78 26 L68 100 L20 100 Z" fill="none" style={{ stroke: LIME }} strokeWidth="2" strokeLinejoin="round" />
      <rect x="6" y="21" width="76" height="9" rx="3" style={{ fill: LIME, stroke: INK }} strokeWidth="1.5" />
    </svg>
  );
}

/** Brand 02's shaker: a warm gradient orb, centered in the bucket's box so the dice spill from its edge. */
function ShakeOrb() {
  return (
    <span
      aria-hidden
      className="mt-2 block size-[88px] animate-[orb-breathe_4s_ease-in-out_infinite] rounded-full shadow-[inset_-8px_-12px_22px_rgb(0_0_0/0.16),0_14px_30px_-12px_rgb(0_0_0/0.35)]"
      style={{ background: WARM_ORB }}
    />
  );
}

/** One physics step for dice sliding on a tabletop: friction, wall bounces and die-to-die collisions. */
function step(bodies: Body[], dt: number, width: number, height: number) {
  const drag = Math.exp(-1.4 * dt);
  const spinDrag = Math.exp(-2.4 * dt);
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.va * dt;
    b.vx *= drag;
    b.vy *= drag;
    b.va *= spinDrag;
    // Constant sliding friction so dice come to a clean stop instead of creeping forever.
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const slowed = Math.max(0, speed - 220 * dt) / speed;
      b.vx *= slowed;
      b.vy *= slowed;
    }
    if (b.x < R) [b.x, b.vx, b.va] = [R, Math.abs(b.vx) * 0.55, b.va + b.vy * 0.4];
    if (b.x > width - R) [b.x, b.vx, b.va] = [width - R, -Math.abs(b.vx) * 0.55, b.va - b.vy * 0.4];
    if (b.y < R) [b.y, b.vy, b.va] = [R, Math.abs(b.vy) * 0.55, b.va - b.vx * 0.4];
    if (b.y > height - R) [b.y, b.vy, b.va] = [height - R, -Math.abs(b.vy) * 0.55, b.va + b.vx * 0.4];
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      if (dist >= DIE) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const push = (DIE - dist) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (closing < 0) {
        const impulse = (-(1 + 0.7) * closing) / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        a.va += rand(-200, 200);
        b.va += rand(-200, 200);
      }
    }
  }
}

const isMoving = (bodies: Body[]) => bodies.some((b) => Math.hypot(b.vx, b.vy) > 10 || Math.abs(b.va) > 25);

/**
 * A tabletop with a popcorn bucket (a gradient orb in Brand 02): pick it up, shake it, let go, and three emoji
 * dice tumble out.
 * When they settle, `onRolled` receives the three emojis.
 */
export default function DiceRoll({
  pickEmojis,
  onRolled,
  disabled,
}: {
  pickEmojis: () => string[];
  onRolled: (emojis: string[]) => void;
  disabled: boolean;
}) {
  const tableRef = useRef<HTMLDivElement>(null);
  const cupRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const diceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodies = useRef<Body[]>([]);
  const cup = useRef({ x: 0, y: 0 });
  const grab = useRef({ x: 0, y: 0 });
  const samples = useRef<{ t: number; x: number; y: number }[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [dice, setDice] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const brand = useBrand();
  const shaker = brand === "02" ? "orb" : "popcorn";

  function setPhase(next: Phase) {
    phaseRef.current = next;
    setPhaseState(next);
  }

  function tableSize() {
    const t = tableRef.current;
    return { w: t?.clientWidth ?? 0, h: t?.clientHeight ?? 0 };
  }

  function placeCup(x: number, y: number) {
    const { w, h } = tableSize();
    cup.current = {
      x: Math.min(Math.max(x, CUP_W / 2), w - CUP_W / 2),
      y: Math.min(Math.max(y, CUP_H / 2), h - CUP_H / 2),
    };
    if (cupRef.current) {
      cupRef.current.style.transform = `translate(${cup.current.x - CUP_W / 2}px, ${cup.current.y - CUP_H / 2}px)`;
    }
  }

  function resetCup() {
    const { w, h } = tableSize();
    if (tipRef.current) tipRef.current.style.transform = "";
    placeCup(w * 0.18, h / 2);
  }

  // Park the cup on the left of the table once it has a size, and keep it there on resize while idle.
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const observer = new ResizeObserver(() => {
      if (phaseRef.current === "idle") resetCup();
      setReady(true);
    });
    observer.observe(table);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetCup only reads refs
  }, []);

  function pointerOnTable(e: PointerEvent) {
    const rect = tableRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function canPickUp() {
    return !disabled && (phaseRef.current === "idle" || phaseRef.current === "done");
  }

  function pickUp(e: PointerEvent<HTMLButtonElement>) {
    if (!canPickUp()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDice([]);
    bodies.current = [];
    if (tipRef.current) tipRef.current.style.transform = "";
    const p = pointerOnTable(e);
    grab.current = { x: cup.current.x - p.x, y: cup.current.y - p.y };
    samples.current = [{ t: performance.now(), ...p }];
    setPhase("holding");
  }

  function shake(e: PointerEvent) {
    if (phaseRef.current !== "holding") return;
    const p = pointerOnTable(e);
    placeCup(p.x + grab.current.x, p.y + grab.current.y);
    const now = performance.now();
    samples.current.push({ t: now, ...p });
    samples.current = samples.current.filter((s) => now - s.t < 100);
  }

  /** Tip the cup in the direction it was flicked and spill three dice out of its mouth. */
  function release() {
    if (phaseRef.current !== "holding" && phaseRef.current !== "idle" && phaseRef.current !== "done") return;
    const { w, h } = tableSize();
    const s = samples.current;
    let vx = 0;
    let vy = 0;
    if (s.length >= 2 && s[s.length - 1].t - s[0].t > 16) {
      const dt = (s[s.length - 1].t - s[0].t) / 1000;
      vx = (s[s.length - 1].x - s[0].x) / dt;
      vy = (s[s.length - 1].y - s[0].y) / dt;
    }
    let speed = Math.hypot(vx, vy);
    let dir = Math.atan2(vy, vx);
    if (speed < 150) {
      // A gentle let-go or a click: toss toward the middle of the table with a little randomness.
      dir = Math.atan2(h / 2 - cup.current.y, w / 2 - cup.current.x) + rand(-0.5, 0.5);
      speed = 750;
    }
    speed = Math.min(Math.max(speed, 600), 1800);

    // The bucket tips toward the throw; the orb stays upright (a sphere's highlight shouldn't spin).
    if (tipRef.current && brand !== "02") tipRef.current.style.transform = `rotate(${(dir * 180) / Math.PI + 90}deg)`;
    const mouth = {
      x: cup.current.x + Math.cos(dir) * (MOUTH_OFFSET + R),
      y: cup.current.y + Math.sin(dir) * (MOUTH_OFFSET + R),
    };
    const emojis = pickEmojis();
    bodies.current = emojis.map(() => {
      const spread = dir + rand(-0.45, 0.45);
      const v = speed * rand(0.75, 1.15);
      return {
        x: Math.min(Math.max(mouth.x + rand(-12, 12), R), w - R),
        y: Math.min(Math.max(mouth.y + rand(-12, 12), R), h - R),
        vx: Math.cos(spread) * v,
        vy: Math.sin(spread) * v,
        angle: rand(0, 360),
        va: rand(-900, 900),
      };
    });
    setDice(emojis);
    setPhase("tumbling");
  }

  function keyToss(e: KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && canPickUp()) {
      e.preventDefault();
      samples.current = [];
      release();
    }
  }

  // Run the tumble once the dice are on the table.
  useEffect(() => {
    if (phase !== "tumbling") return;
    const { w, h } = tableSize();
    const render = () =>
      bodies.current.forEach((b, i) => {
        const el = diceRefs.current[i];
        if (el) el.style.transform = `translate(${b.x - R}px, ${b.y - R}px) rotate(${b.angle}deg)`;
      });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let t = 0; t < 6 && isMoving(bodies.current); t += 1 / 120) step(bodies.current, 1 / 120, w, h);
      render();
      const frame = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(frame);
    }

    let frame = 0;
    let last = performance.now();
    let stillFor = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      step(bodies.current, dt / 2, w, h);
      step(bodies.current, dt / 2, w, h);
      render();
      stillFor = isMoving(bodies.current) ? 0 : stillFor + dt;
      if (stillFor > 0.25) setPhase("done");
      else frame = requestAnimationFrame(tick);
    };
    render();
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // Hand the result over a beat after the dice stop, so you can see what you rolled.
  useEffect(() => {
    if (phase !== "done" || dice.length === 0) return;
    const timer = setTimeout(() => onRolled(dice), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per settled roll
  }, [phase]);

  const hint = {
    idle: `Pick up the ${shaker}, give it a shake, and let go.`,
    holding: "Shake it… now let go!",
    tumbling: "Rolling…",
    done: disabled ? "Picking your movie…" : `Pick up the ${shaker} to roll again.`,
  }[phase];

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-4">
      <div
        ref={tableRef}
        className="relative h-72 w-full overflow-hidden rounded-2xl bg-veil/[0.04] sm:h-80"
      >
        {dice.map((emoji, i) => (
          // Each die is a Pick three chip: a circle with the veil tint over the inset color, so it reads the same
          // on the tinted table as on the emoji field.
          <div
            key={`${emoji}-${i}`}
            ref={(el) => {
              diceRefs.current[i] = el;
            }}
            aria-hidden
            className="absolute top-0 left-0 overflow-hidden rounded-full bg-ink"
            style={{ width: DIE, height: DIE, transform: "translate(-200px, -200px)" }}
          >
            <span className="flex size-full items-center justify-center bg-veil/[0.06] text-[28px] leading-none">{emoji}</span>
          </div>
        ))}

        <button
          ref={cupRef}
          type="button"
          aria-label={brand === "02" ? "Gradient orb. Press Enter to roll." : "Popcorn bucket. Press Enter to roll."}
          disabled={disabled}
          onPointerDown={pickUp}
          onPointerMove={shake}
          onPointerUp={() => phaseRef.current === "holding" && release()}
          onPointerCancel={() => phaseRef.current === "holding" && release()}
          onKeyDown={keyToss}
          className={`absolute top-0 left-0 cursor-grab touch-none rounded-2xl outline-offset-4 transition-opacity active:cursor-grabbing disabled:cursor-not-allowed ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          style={{ width: CUP_W, height: CUP_H }}
        >
          <div
            className={
              phase === "holding"
                ? brand === "02"
                  ? "animate-[orb-shake_140ms_ease-in-out_infinite]"
                  : "animate-[cup-shake_120ms_ease-in-out_infinite]"
                : ""
            }
          >
            <div ref={tipRef} className="transition-transform duration-300 ease-out">
              {brand === "02" ? <ShakeOrb /> : <PopcornBucket />}
            </div>
          </div>
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
        {/* While the movie is being picked, a spinner like the Pick my movie button's. */}
        {phase === "done" && disabled && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {hint}
      </p>
    </div>
  );
}
