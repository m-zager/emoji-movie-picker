"use client";

import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiceRoll from "./dice-roll";
import EmojiMagnetField from "./emoji-magnet-field";
import GrainBurst from "./grain-burst";
import PosterTilt from "./poster-tilt";
import ServiceMenu from "./service-menu";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PICK_COUNT,
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

/** Brand 02's empty slot: a soft gradient sphere, after the voice orbs on elevenlabs.io. One color per slot. */
const SLOT_ORBS = [
  "radial-gradient(circle at 32% 28%, #ffe4c8 0%, #ff9a5c 38%, #ec5524 70%, #b8300f 100%)",
  "radial-gradient(circle at 32% 28%, #fde8ff 0%, #dba6ff 34%, #9b8cff 64%, #5d7dff 100%)",
  "radial-gradient(circle at 32% 28%, #f6f8f1 0%, #cfdcc6 38%, #98af93 72%, #6c8669 100%)",
];

function SlotOrb({ index }: { index: number }) {
  return (
    <span
      aria-hidden
      className="hidden size-[58%] animate-[orb-breathe_4s_ease-in-out_infinite] rounded-full shadow-[inset_-6px_-10px_18px_rgb(0_0_0/0.14),0_10px_24px_-10px_rgb(0_0_0/0.25)] brand-02:block"
      style={{ background: SLOT_ORBS[index % SLOT_ORBS.length], animationDelay: `${index * -1.3}s` }}
    />
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
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
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
    <p className="mt-6 rounded-lg border border-border bg-veil/5 px-4 py-3 text-sm text-subtle">
      ⚠️ Couldn&apos;t find a match streaming on your services, so here&apos;s the best overall pick.
    </p>
  );
  if (!watch || (watch.stream.length === 0 && watch.rentOrBuy.length === 0)) {
    return (
      <>
        {notOnYours}
        <p className="mt-6 text-sm text-muted-foreground">No streaming info found for the US.</p>
      </>
    );
  }
  return (
    <div className="mt-6 flex w-full flex-col gap-4">
      {notOnYours}
      <ProviderRow label="Stream" providers={watch.stream} link={watch.link} mine={mine} />
      <ProviderRow label="Rent or buy" providers={watch.rentOrBuy} link={watch.link} mine={mine} />
      <p className="text-xs text-muted-foreground">
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

type Mode = "describe" | "manual" | "auto" | "roll";

/** The four ways to pick, in the order of the Figma switcher. `label` heads the container and names the button;
    `tab` is the short caption Brand 02 shows beside the emoji on wide screens. */
const MODES: { value: Mode; icon: string; label: string; tab: string }[] = [
  { value: "describe", icon: "✍️", label: "Describe your movie", tab: "Describe" },
  { value: "manual", icon: "👆", label: "Pick three emojis", tab: "Pick three" },
  { value: "auto", icon: "🎰", label: "Spin the slots", tab: "Spin" },
  { value: "roll", icon: "🎲", label: "Shake the popcorn", tab: "Shake" },
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

/** The Figma switcher: four emoji buttons on an inset dark track, with the selection sliding between them.
    Brand 02 turns it into ElevenLabs-style tabs: a gray track, a raised white selection, and captions from lg up. */
function ModeSwitch({ mode, onChange, disabled }: { mode: Mode; onChange: (m: Mode) => void; disabled: boolean }) {
  return (
    <div
      role="radiogroup"
      aria-label="How to pick"
      className="relative flex shrink-0 items-center rounded-full bg-ink p-1 brand-02:bg-veil/[0.06]"
    >
      {MODES.map(({ value, icon, label, tab }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          disabled={disabled}
          onClick={() => onChange(value)}
          className="relative flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full text-base transition-opacity disabled:cursor-not-allowed disabled:opacity-50 brand-02:lg:px-3"
        >
          {mode === value && (
            <motion.span
              layoutId="mode-selected"
              transition={GROW}
              className="absolute inset-0 rounded-full bg-olive brand-02:bg-ink brand-02:shadow-sm"
            />
          )}
          <span className="relative">{icon}</span>
          <span
            className={`relative hidden text-sm brand-02:lg:inline ${mode === value ? "text-paper" : "text-muted-foreground"}`}
          >
            {tab}
          </span>
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
            className="relative flex size-[88px] items-center justify-center overflow-hidden rounded-lg bg-ink text-5xl sm:size-[150px] sm:text-7xl brand-02:rounded-2xl brand-02:border brand-02:border-border brand-02:shadow-sm"
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
            ) : (
              <SlotOrb index={i} />
            )}
          </button>
        );
      })}
    </div>
  );

  const errorNote = error && (
    <p role="alert" className="text-center text-sm text-destructive">
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
              <p className="text-lg text-subtle italic">&ldquo;{query.trim()}&rdquo;</p>
            ) : (
              <p className="text-3xl tracking-widest">{selected.join(" ")}</p>
            )}
            <h2 className="mt-5 font-display text-4xl tracking-tight">{pick.title}</h2>
            <p className="mt-1 text-muted-foreground">{pick.year}</p>
            <p className="mt-5 text-lg leading-relaxed text-subtle">{pick.reason}</p>
            <WhereToWatch pick={pick} services={services} />
          </div>
        </article>
      </>
    );
  } else if (mode === "describe") {
    if (loading) body = <p className="text-muted-foreground">Finding your movie…</p>;
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
        // While the pick loads, the button itself becomes the spinner, at full strength rather than faded.
        <button
          type="button"
          disabled={loading}
          aria-busy={loading}
          onClick={() => pickMovie({ emojis: selected })}
          className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-lime pr-3 pl-4 text-sm text-ink transition enabled:hover:bg-lime/80 disabled:cursor-progress"
        >
          {loading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Picking…
            </>
          ) : (
            <>
              Pick my movie
              <span aria-hidden>→</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    // pb-20 keeps the footer clear of the fixed brand switch in the bottom-left corner.
    <main className="relative flex min-h-dvh flex-col items-center bg-ink px-4 pt-12 pb-20 text-paper sm:px-6">
      {/* Brand 01: stippled starburst behind everything, pinned to the window while the page scrolls. */}
      <GrainBurst className="fixed inset-0 size-full opacity-25 brand-02:hidden" />
      {/* Brand 02: soft gradient orbs, after the spheres on elevenlabs.io. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden overflow-hidden brand-02:block">
        <div className="absolute -top-40 -right-32 size-[520px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd2a8,#ff7a3d_45%,#e8481c_75%)] opacity-35 blur-3xl" />
        <div className="absolute -bottom-48 -left-40 size-[560px] rounded-full bg-[radial-gradient(circle_at_60%_40%,#f3c4ff,#a98bff_45%,#6aa8ff_80%)] opacity-30 blur-3xl" />
      </div>

      {/* Equal flexible space above and below keeps the title and container centered, as in the Figma frame.
          (basis-0 rather than flex-1: a percentage basis in a min-height column counts its content first.) */}
      <div aria-hidden className="grow basis-0" />

      <div className="relative flex w-full flex-col items-center gap-6">
        <h1 className="text-center font-display text-4xl text-lime sm:text-[48px] sm:leading-[68px]">
          Roll for Movie
        </h1>

        {/* Brand 02: the streaming filter sits between the title and the container, centered. */}
        <div className="hidden justify-center brand-02:flex">
          <ServiceMenu services={services} onChange={changeServices} disabled={loading} align="center" />
        </div>

        {/* One container for every mode. It's the Figma pill on landing and springs open to fit each mode. */}
        <motion.section
          initial={false}
          // A pill while it's just the top row, opening to the Figma's 16px corners when it holds content.
          animate={{ borderRadius: body ? 16 : 31 }}
          transition={GROW}
          // Focus tints the border. Brand 02 keeps the stroke only while typing in the describe input, not when a
          // tab, emoji or the popcorn has focus.
          className="w-full max-w-[900px] overflow-hidden border border-olive bg-olive py-2 pr-2 pl-4 transition-colors focus-within:border-lime/40 brand-02:[&:focus-within:not(:has(input:focus))]:border-olive"
        >
          {/* The header row. When it runs out of room (a phone with three picks and Pick my movie, or with Try again),
              the controls wrap onto their own line, right-aligned, instead of sliding over the buttons. The describe
              input never forces a wrap: it has a zero flex basis and just narrows. */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            {/* Left side: whatever this mode leads with, then Try again once a result is showing, so it sits
                beside the picks rather than with the mode switch. With the picks tray or a result, the group sizes to
                its content, so on a phone the controls wrap below instead of covering Pick my movie or Try again. */}
            <div
              className={`flex min-w-0 flex-1 items-center gap-2 ${pick || mode === "manual" ? "basis-auto" : "basis-0"}`}
            >
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
                    className="min-w-0 flex-1 bg-transparent text-base text-paper outline-none placeholder:text-paper disabled:opacity-60"
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
                <p className="truncate text-base text-paper">{current.label}</p>
              )}
              {pick && (
                <Button variant="secondary" size="lg" className="shrink-0 px-4" onClick={tryAgain}>
                  Try again
                </Button>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {/* Brand 01 keeps the filter in the top row; Brand 02 shows it between the title and the container. */}
              <div className="brand-02:hidden">
                <ServiceMenu services={services} onChange={changeServices} disabled={loading} />
              </div>
              <ModeSwitch mode={mode} onChange={switchMode} disabled={loading} />
            </div>
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

      <div className="relative flex w-full grow basis-0 flex-col items-center">
        <footer className="mt-auto max-w-3xl pt-12 text-center text-xs text-faint">{footer}</footer>
      </div>
    </main>
  );
}
