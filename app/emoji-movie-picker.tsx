"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import DiceRoll from "./dice-roll";
import EmojiMagnetField from "./emoji-magnet-field";
import GrainBurst from "./grain-burst";
import PosterTilt from "./poster-tilt";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PICK_COUNT,
  SERVICE_LOGO_BASE,
  SERVICES,
  VIBES,
  providerIdsFor,
  type MoviePick,
  type Provider,
  type ServiceKey,
} from "./movies";

const SERVICES_STORAGE_KEY = "roll-for-movie:services";

const MIN_SPIN_MS = 1200;
const REEL_STOP_GAP_MS = 400;
const REEL_LENGTH = 16;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function labelFor(emoji: string) {
  return VIBES.find((v) => v.emoji === emoji)?.label ?? emoji;
}

/**
 * A slot-machine reel: a looping strip of emojis, each reel starting at a different spot.
 * The strip starts on the picked emoji, so with reduced motion the reel rests on it.
 */
function Reel({ emoji, index }: { emoji: string; index: number }) {
  const strip = [
    emoji,
    ...Array.from({ length: REEL_LENGTH - 1 }, (_, i) => VIBES[(i * 5 + index * 17) % VIBES.length].emoji),
  ];
  return (
    <span
      aria-hidden
      className="absolute inset-x-0 top-0 flex animate-[reel_linear_infinite] flex-col blur-[1px]"
      style={{ animationDuration: `${0.7 + index * 0.1}s` }}
    >
      {[...strip, ...strip].map((e, i) => (
        <span key={i} className="flex h-[88px] w-full shrink-0 items-center justify-center sm:h-[150px]">
          {e}
        </span>
      ))}
    </span>
  );
}

function ProviderRow({
  label,
  providers,
  link,
  mine,
}: {
  label: string;
  providers: Provider[];
  link: string;
  mine: Set<number>;
}) {
  if (providers.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <ul className="flex flex-wrap justify-center gap-2 sm:justify-start">
        {providers.map((p) => (
          <li key={p.name}>
            <a href={link} target="_blank" rel="noopener noreferrer" title={mine.has(p.id) ? `${p.name} (you have this)` : p.name}>
              <Image
                src={p.logoUrl}
                alt={p.name}
                width={44}
                height={44}
                className={`rounded-lg shadow-sm transition hover:scale-110 ${
                  mine.has(p.id) ? "ring-2 ring-lime ring-offset-2 ring-offset-ink" : ""
                }`}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhereToWatch({ pick, services }: { pick: MoviePick; services: ServiceKey[] }) {
  const { watch, onYourServices } = pick;
  const mine = providerIdsFor(services);
  const notOnYours = onYourServices === false && (
    <p className="mt-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
      ⚠️ Couldn&apos;t find a match streaming on your services, so here&apos;s the best overall pick.
    </p>
  );
  if (!watch || (watch.stream.length === 0 && watch.rentOrBuy.length === 0)) {
    return (
      <>
        {notOnYours}
        <p className="mt-6 text-sm text-zinc-400">No streaming info found for the US.</p>
      </>
    );
  }
  return (
    <div className="mt-6 flex w-full flex-col gap-4">
      {notOnYours}
      <ProviderRow label="Stream" providers={watch.stream} link={watch.link} mine={mine} />
      <ProviderRow label="Rent or buy" providers={watch.rentOrBuy} link={watch.link} mine={mine} />
      <p className="text-xs text-zinc-400">
        Streaming data by{" "}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline">
          JustWatch
        </a>{" "}
        via{" "}
        <a href={watch.link} target="_blank" rel="noopener noreferrer" className="underline">
          TMDB
        </a>
        .
      </p>
    </div>
  );
}

function ServicePicker({
  services,
  onChange,
  disabled,
}: {
  services: ServiceKey[];
  onChange: (update: (prev: ServiceKey[]) => ServiceKey[]) => void;
  disabled: boolean;
}) {
  function toggleService(key: ServiceKey) {
    onChange((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <ul className="flex flex-wrap justify-center gap-2" aria-label="My streaming services">
        {SERVICES.map(({ key, name, logo }) => {
          const on = services.includes(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggleService(key)}
                disabled={disabled}
                aria-pressed={on}
                title={name}
                className={`block rounded-lg transition disabled:cursor-not-allowed ${
                  on
                    ? "ring-2 ring-lime ring-offset-2 ring-offset-ink"
                    : "opacity-40 grayscale hover:opacity-80 hover:grayscale-0"
                }`}
              >
                <Image src={`${SERVICE_LOGO_BASE}${logo}`} alt={name} width={36} height={36} className="rounded-lg" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-zinc-400">
        {services.length === 0 ? (
          "Tap the streaming services you have, or leave them all off for any movie."
        ) : (
          <>
            Only picking movies streaming on your {services.length === 1 ? "service" : `${services.length} services`}.{" "}
            <button type="button" onClick={() => onChange(() => [])} disabled={disabled} className="underline">
              Clear
            </button>
          </>
        )}
      </p>
    </div>
  );
}

type Mode = "describe" | "manual" | "auto" | "roll";

/** The four ways to pick, in the order of the Figma switcher. `label` heads the container and names the button. */
const MODES: { value: Mode; icon: string; label: string }[] = [
  { value: "describe", icon: "✍️", label: "Describe your movie" },
  { value: "manual", icon: "👆", label: "Pick three emojis" },
  { value: "auto", icon: "🎰", label: "Spin the slots" },
  { value: "roll", icon: "🎲", label: "Shake the popcorn" },
];

/** A spring for the container growing and shrinking: quick, with no overshoot to wobble the page. */
const GROW = { type: "spring" as const, stiffness: 260, damping: 34 };

function randomEmojis() {
  const pool = VIBES.map((v) => v.emoji);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICK_COUNT);
}

/** Tracks an element's rendered height, so the container can spring to fit whatever is inside it. */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

/** The Figma switcher: four emoji buttons on an inset dark track, with the selection sliding between them. */
function ModeSwitch({ mode, onChange, disabled }: { mode: Mode; onChange: (m: Mode) => void; disabled: boolean }) {
  return (
    <div role="radiogroup" aria-label="How to pick" className="relative flex shrink-0 items-center rounded-full bg-ink p-1">
      {MODES.map(({ value, icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          disabled={disabled}
          onClick={() => onChange(value)}
          className="relative grid size-9 place-items-center rounded-full text-base transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === value && <motion.span layoutId="mode-selected" transition={GROW} className="absolute inset-0 rounded-full bg-olive" />}
          <span className="relative">{icon}</span>
        </button>
      ))}
    </div>
  );
}

export default function EmojiMoviePicker({ footer }: { footer: ReactNode }) {
  const [mode, setMode] = useState<Mode>("describe");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pick, setPick] = useState<MoviePick | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reelsStopped, setReelsStopped] = useState(0);
  const [reelsOn, setReelsOn] = useState(false); // whether this pick runs the slot-machine spin
  const [services, setServices] = useState<ServiceKey[]>([]);
  const [bodyRef, bodyHeight] = useHeight<HTMLDivElement>();

  // Remember the viewer's services in this browser. Storage can be unavailable (private mode), so guard it.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SERVICES_STORAGE_KEY) ?? "[]");
      const valid = SERVICES.map((s) => s.key).filter((k) => saved.includes(k));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists after mount
      if (valid.length > 0) setServices(valid);
    } catch {}
  }, []);

  // Takes an updater so quick successive taps build on each other instead of overwriting.
  function changeServices(update: (prev: ServiceKey[]) => ServiceKey[]) {
    setServices((prev) => {
      const next = update(prev);
      try {
        localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const full = selected.length === PICK_COUNT;
  const current = MODES.find((m) => m.value === mode)!;

  function toggle(emoji: string) {
    setError(null);
    setPick(null);
    setSelected((prev) =>
      prev.includes(emoji)
        ? prev.filter((e) => e !== emoji)
        : prev.length < PICK_COUNT
          ? [...prev, emoji]
          : prev,
    );
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPick(null);
    setSelected([]);
    setError(null);
  }

  /**
   * Ask for a movie from three emojis or a description. `reels: true` runs the slot-machine spin first
   * ("Spin the slots" only; the other modes go straight to the answer).
   */
  async function pickMovie(input: { emojis: string[] } | { description: string }, { reels = false } = {}) {
    if ("emojis" in input) setSelected(input.emojis);
    setLoading(true);
    setReelsStopped(0);
    setReelsOn(reels);
    setError(null);
    try {
      // Spin for at least MIN_SPIN_MS so a fast answer still gets a proper roll.
      const [data] = await Promise.all([
        fetch("/api/pick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, services }),
        }).then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
          return body as MoviePick;
        }),
        wait(reels ? MIN_SPIN_MS : 0),
      ]);
      if (reels) {
        // Stop the reels one at a time, left to right, then reveal the movie.
        for (let i = 1; i <= PICK_COUNT; i++) {
          setReelsStopped(i);
          await wait(REEL_STOP_GAP_MS);
        }
        await wait(REEL_STOP_GAP_MS);
      }
      setPick(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function tryAgain() {
    setPick(null);
    setSelected([]);
    setError(null);
  }

  const slots = (
    <div className="flex gap-4" aria-label="Your picks">
      {Array.from({ length: PICK_COUNT }, (_, i) => {
        const emoji = selected[i];
        const spinning = loading && reelsOn && i >= reelsStopped;
        const justStopped = loading && reelsOn && !spinning;
        return (
          <button
            key={i}
            type="button"
            onClick={() => emoji && toggle(emoji)}
            disabled={!emoji || loading || mode !== "manual"}
            aria-label={emoji ? `Remove ${labelFor(emoji)}` : `Empty slot ${i + 1}`}
            className="relative flex size-[88px] items-center justify-center overflow-hidden rounded-lg bg-ink text-5xl sm:size-[150px] sm:text-7xl"
          >
            {spinning ? (
              <Reel emoji={emoji} index={i} />
            ) : emoji ? (
              <span
                key={justStopped ? "stopped" : "picked"}
                className={
                  justStopped
                    ? "animate-[reel-stop_450ms_cubic-bezier(0.3,1.6,0.5,1)]"
                    : "animate-[pop_200ms_ease-out]"
                }
              >
                {emoji}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const errorNote = error && (
    <p role="alert" className="text-center text-sm text-red-400">
      {error}
    </p>
  );

  // What the container holds below its top row. Nothing at all in Describe until there's something to show,
  // which keeps it the slim Figma pill on landing.
  let body: ReactNode = null;
  if (pick) {
    body = (
      <>
        <article className="flex w-full flex-col items-center gap-8 sm:flex-row sm:items-start">
          {pick.posterUrl && <PosterTilt src={pick.posterUrl} alt={`${pick.title} poster`} />}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            {mode === "describe" ? (
              <p className="text-lg text-zinc-300 italic">&ldquo;{query.trim()}&rdquo;</p>
            ) : (
              <p className="text-3xl tracking-widest">{selected.join(" ")}</p>
            )}
            <p className="mt-5 text-sm font-medium uppercase tracking-wide text-lime">Tonight you&apos;re watching</p>
            <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight">{pick.title}</h2>
            <p className="mt-1 text-zinc-400">{pick.year}</p>
            <p className="mt-5 text-lg leading-relaxed text-zinc-300">{pick.reason}</p>
            <WhereToWatch pick={pick} services={services} />
          </div>
        </article>
        <Button size="xl" onClick={tryAgain}>
          Try again
        </Button>
      </>
    );
  } else if (mode === "describe") {
    if (loading) body = <p className="text-zinc-400">Finding your movie…</p>;
    else if (error) body = errorNote;
  } else if (mode === "roll") {
    // Roll mode has no slots at all: the dice on the table are the roll, and the bucket is the control.
    body = (
      <>
        <DiceRoll
          pickEmojis={randomEmojis}
          onRolled={(emojis) => pickMovie({ emojis })}
          disabled={loading}
        />
        {errorNote}
      </>
    );
  } else if (mode === "manual") {
    // Per the Figma frame: just the field, on an inset ink panel. Your picks live in the tray up top.
    body = (
      <>
        <div className="w-full overflow-hidden rounded-2xl bg-ink">
          <EmojiMagnetField selected={selected} onToggle={toggle} max={PICK_COUNT} disabled={loading} />
        </div>
        {errorNote}
      </>
    );
  } else {
    body = (
      <>
        {slots}
        <Button size="xl" onClick={() => pickMovie({ emojis: randomEmojis() }, { reels: true })} disabled={loading}>
          {loading ? "Picking…" : "Roll for movie"}
        </Button>
        {errorNote}
      </>
    );
  }

  // The picks tray (top-left in Pick three emojis): three small spots on an ink pill. Tap a pick to remove it;
  // once all three are in, the lime arrow asks for the movie.
  const tray = (
    <div className="flex min-w-0 items-center gap-2">
      <div aria-label="Your picks" className="flex shrink-0 items-center rounded-full bg-ink p-1">
        {Array.from({ length: PICK_COUNT }, (_, i) => {
          const emoji = selected[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => emoji && toggle(emoji)}
              disabled={!emoji || loading}
              aria-label={emoji ? `Remove ${labelFor(emoji)}` : `Empty pick ${i + 1}`}
              title={emoji ? `Remove ${labelFor(emoji)}` : undefined}
              className="grid size-8 place-items-center rounded-full text-base transition enabled:hover:bg-olive"
            >
              {emoji && (
                <span key={emoji} className="animate-[pop_200ms_ease-out]">
                  {emoji}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {full && !pick && (
        <button
          type="button"
          disabled={loading}
          onClick={() => pickMovie({ emojis: selected })}
          className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-lime pr-3 pl-4 text-sm text-ink transition hover:bg-lime/80 disabled:opacity-50"
        >
          Pick my movie
          <span aria-hidden>→</span>
        </button>
      )}
      {loading && <span className="truncate text-sm text-zinc-400">Picking…</span>}
    </div>
  );

  return (
    <main className="relative flex min-h-dvh flex-col items-center bg-ink px-4 py-12 text-paper sm:px-6">
      {/* Stippled starburst behind everything, pinned to the window while the page scrolls. */}
      <GrainBurst className="fixed inset-0 size-full opacity-25" />

      {/* Equal flexible space above and below keeps the title and container centered, as in the Figma frame.
          (basis-0 rather than flex-1: a percentage basis in a min-height column counts its content first.) */}
      <div aria-hidden className="grow basis-0" />

      <div className="relative flex w-full flex-col items-center gap-6">
        <h1 className="text-center font-serif text-4xl font-bold text-lime sm:text-[48px] sm:leading-[68px]">
          Roll for Movie
        </h1>

        {/* One container for every mode. It's the Figma pill on landing and springs open to fit each mode. */}
        <motion.section
          initial={false}
          // A pill while it's just the top row, opening to the Figma's 16px corners when it holds content.
          animate={{ borderRadius: body ? 16 : 31 }}
          transition={GROW}
          className="w-full max-w-[900px] overflow-hidden border border-olive bg-olive py-2 pr-2 pl-4 transition-colors focus-within:border-lime/40"
        >
          <div className="flex items-center justify-between gap-3">
            {mode === "describe" ? (
              <form
                className="flex min-w-0 flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (query.trim() && !loading) {
                    setPick(null);
                    pickMovie({ description: query.trim() });
                  }
                }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={300}
                  disabled={loading}
                  aria-label="Describe your movie"
                  placeholder="Describe your movie"
                  className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white disabled:opacity-60"
                />
                {query.trim() && (
                  <button
                    type="submit"
                    aria-label="Find my movie"
                    disabled={loading}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-ink transition hover:bg-lime/80 disabled:opacity-50"
                  >
                    →
                  </button>
                )}
              </form>
            ) : mode === "manual" ? (
              tray
            ) : (
              <p className="truncate text-base text-white">{current.label}</p>
            )}
            <ModeSwitch mode={mode} onChange={switchMode} disabled={loading} />
          </div>

          <motion.div initial={false} animate={{ height: body ? bodyHeight : 0 }} transition={GROW} className="overflow-hidden">
            {/* pt-3 is the Figma's 12px gap under the top row; it sits inside the measured box so the height includes it. */}
            <div ref={bodyRef} className="pt-3">
              {body && (
                <motion.div
                  key={pick ? "result" : mode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className={
                    mode === "manual" && !pick
                      ? "flex flex-col items-center gap-3"
                      : "flex flex-col items-center gap-8 px-2 pt-2 pb-6 sm:px-6"
                  }
                >
                  {body}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.section>
      </div>

      {/* Filters stay outside the container for now. */}
      <div className="relative flex w-full grow basis-0 flex-col items-center">
        <div className="mt-6 w-full max-w-3xl">
          <ServicePicker services={services} onChange={changeServices} disabled={loading} />
        </div>
        <footer className="mt-auto max-w-3xl pt-12 text-center text-xs text-zinc-500">{footer}</footer>
      </div>
    </main>
  );
}
