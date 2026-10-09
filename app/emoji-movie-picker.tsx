"use client";

import Image from "next/image";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiceRoll from "./dice-roll";
import EmojiMagnetField from "./emoji-magnet-field";
import GrainBurst from "./grain-burst";
import PosterTilt from "./poster-tilt";
import ServiceMenu from "./service-menu";
import LimitPopover from "./limit-popover";
import SlotLever from "./slot-lever";
import { ORBS, SLOT_ORBS, type Brand } from "./brand";
import { useBrand } from "./use-brand";
import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
// The movies this browser has been shown (newest last), sent with each pick so they aren't suggested again.
// Read and written only at pick time; storage can be unavailable (private mode), so both are guarded.
const SEEN_STORAGE_KEY = "roll-for-movie:seen";
const SEEN_MAX = 30;
type Film = { title: string; year: number };

function seenFilms(): Film[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    // Only well-formed entries, so a damaged list can't make the API reject the pick.
    return saved.filter((f) => typeof f?.title === "string" && Number.isInteger(f?.year)).slice(-SEEN_MAX);
  } catch {
    return [];
  }
}

function rememberFilm(film: Film) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seenFilms(), film].slice(-SEEN_MAX)));
  } catch {}
}

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

/** Brand 02's empty slot: the background orbs in miniature, a soft glow per slot with the same gradient, blur (scaled
    to its size: the background's 64px blur on 520px) and 35% opacity, breathing slowly. */

function SlotOrb({ index }: { index: number }) {
  return (
    <span
      aria-hidden
      className="hidden size-[58%] animate-[orb-breathe_4s_ease-in-out_infinite] rounded-full opacity-35 blur-[6px] brand-02:block sm:blur-[11px]"
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

/** The modes a brand offers. Brand 02 has no Describe: it opens on Pick three instead. */
function modesFor(brand: Brand) {
  return brand === "02" ? MODES.filter((m) => m.value !== "describe") : MODES;
}

/** A mode's full name. Brand 02 shakes a gradient orb instead of the popcorn bucket, so its roll mode is named for that. */
function modeLabel(m: (typeof MODES)[number], brand: Brand) {
  return brand === "02" && m.value === "roll" ? "Shake the orb" : m.label;
}

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

/** The Figma switcher: emoji buttons on an inset track, with one selection pill behind them. Brand 02 turns it into
    ElevenLabs-style tabs (a gray track, a raised white selection, captions from lg up) and leaves out Describe.

    The pill moves in two phases. First the leading edge runs ahead and the pill stretches across both tabs; then
    the trailing edge catches up and the pill lands on the new tab with a slight overshoot (see .mode-pill in
    globals.css). Its position is written straight to the DOM, so a switch doesn't re-render the toggle. */
function ModeSwitch({ mode, onChange, disabled }: { mode: Mode; onChange: (m: Mode) => void; disabled: boolean }) {
  const brand = useBrand();
  const pill = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({});
  const at = useRef<{ x: number; w: number } | null>(null); // where the pill last came to rest
  const handoff = useRef<number | undefined>(undefined);
  const shown = useRef(mode);

  const measure = (m: Mode) => {
    const el = tabs.current[m];
    return el ? { x: el.offsetLeft, w: el.offsetWidth } : null;
  };
  const paint = (box: { x: number; w: number }, phase: "rest" | "stretch" | "settle") => {
    const el = pill.current;
    if (!el) return;
    el.dataset.phase = phase;
    el.style.transform = `translate3d(${box.x}px, 0, 0)`;
    el.style.width = `${box.w}px`;
    el.style.opacity = "1";
    if (phase !== "stretch") at.current = box;
  };

  // A new mode: stretch across from the old tab to the new one, then settle onto it.
  useLayoutEffect(() => {
    if (shown.current === mode) return;
    shown.current = mode;
    const to = measure(mode);
    const from = at.current;
    if (!to) return;
    window.clearTimeout(handoff.current);
    if (!from) return paint(to, "settle");
    const left = Math.min(from.x, to.x);
    const right = Math.max(from.x + from.w, to.x + to.w);
    paint({ x: left, w: right - left }, "stretch");
    // The handoff runs on the same clock as the stretch transition (190ms), a beat before it finishes.
    handoff.current = window.setTimeout(() => paint(to, "settle"), 150);
  }, [mode]);

  // Snap without animating on mount, on resize (Brand 02's captions come and go at lg) and when the brand changes
  // which tabs there are. Declared after the effect above, so a brand change that also changes the mode lands still.
  useLayoutEffect(() => {
    const snap = () => {
      const box = measure(shown.current);
      if (box) paint(box, "rest");
    };
    snap();
    const observer = new ResizeObserver(snap);
    if (track.current) observer.observe(track.current);
    return () => {
      observer.disconnect();
      window.clearTimeout(handoff.current);
    };
  }, [brand]);

  return (
    <div
      ref={track}
      role="radiogroup"
      aria-label="How to pick"
      className="relative flex shrink-0 items-center rounded-full bg-ink p-1 brand-02:bg-veil/[0.06]"
    >
      <span
        ref={pill}
        aria-hidden
        className="mode-pill absolute top-1 left-0 h-9 rounded-full bg-olive opacity-0 brand-02:bg-ink brand-02:shadow-sm"
      />
      {modesFor(brand).map((m) => {
        const { value, icon, tab } = m;
        const label = modeLabel(m, brand);
        return (
          <button
            key={value}
            ref={(el) => {
              tabs.current[value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={mode === value}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(value)}
            className="relative flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full text-base transition-opacity disabled:cursor-not-allowed disabled:opacity-50 brand-02:lg:px-3"
          >
            <span className="relative">{icon}</span>
            <span
              className={`relative hidden text-sm transition-colors brand-02:lg:inline ${mode === value ? "text-paper" : "text-muted-foreground"}`}
            >
              {tab}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The pick API's "you've used all your picks" answer, kept apart from ordinary errors so it opens the popover. */
class PickLimitReached extends Error {}

export default function EmojiMoviePicker({ footer, initialPicksLeft }: { footer: ReactNode; initialPicksLeft: number }) {
  const brand = useBrand();
  // Picks this browser has left (the server's count, from the signed cookie), and the popover shown at zero.
  const [picksLeft, setPicksLeft] = useState(initialPicksLeft);
  const [limitOpen, setLimitOpen] = useState(false);
  const [chosenMode, setMode] = useState<Mode>("describe");
  // Brand 02 offers no Describe, so there (including on first load) Describe resolves to Pick three.
  const mode: Mode = brand === "02" && chosenMode === "describe" ? "manual" : chosenMode;
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
    // Out of picks: show the popover straight away rather than spinning or loading first.
    if (picksLeft <= 0) {
      setLimitOpen(true);
      return;
    }
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
          body: JSON.stringify({ ...input, services, seen: seenFilms() }),
        }).then(async (res) => {
          const body = await res.json();
          if (body.limitReached) throw new PickLimitReached(body.error);
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
      setPicksLeft(data.picksLeft);
      rememberFilm({ title: data.title, year: data.year });
    } catch (err) {
      if (err instanceof PickLimitReached) {
        // The server is the source of truth (another tab may have used the last pick).
        setPicksLeft(0);
        setLimitOpen(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function tryAgain() {
    // Out of picks: there's nothing to try again, so show the popover and leave the last movie in place behind it.
    if (picksLeft <= 0) {
      setLimitOpen(true);
      return;
    }
    setPick(null);
    setSelected([]);
    setError(null);
  }

  const slots = (
    <div className="flex gap-2 sm:gap-4" aria-label="Your picks">
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

  // Pick my movie, once three emojis are in. While the pick loads, the button itself becomes the spinner, at full
  // strength rather than faded.
  const pickButton = (className: string) => (
    <button
      type="button"
      disabled={loading}
      aria-busy={loading}
      onClick={() => pickMovie({ emojis: selected })}
      className={`${className} items-center justify-center gap-2 rounded-full bg-lime pr-3 pl-4 text-sm text-ink transition enabled:hover:bg-lime/80 disabled:cursor-progress`}
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
            {/* Brand 02 keeps the movie title in Inter (at the display weight); only the page title is Google Sans Flex. */}
            <h2 className="mt-5 font-display text-4xl tracking-tight brand-02:font-sans">{pick.title}</h2>
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
        {/* On phones Pick my movie lives here, full width at the bottom, rather than squeezed into the header. */}
        {full && pickButton("flex h-11 w-full sm:hidden")}
        {errorNote}
      </>
    );
  } else {
    body = (
      <>
        {/* The slot machine: three reels and the lever that spins them. */}
        <div className="flex items-center gap-2 sm:gap-6">
          {slots}
          <SlotLever onPull={() => pickMovie({ emojis: randomEmojis() }, { reels: true })} disabled={loading} />
        </div>
        <p className="-mt-4 flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
          {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {loading ? "Spinning…" : "Pull the lever to spin."}
        </p>
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
      {/* Beside the picks on wider screens; on phones it sits at the bottom of the container instead. */}
      {full && !pick && pickButton("hidden h-9 shrink-0 sm:flex")}
    </div>
  );

  return (
    <main className="relative flex min-h-dvh flex-col items-center bg-ink px-4 py-12 text-paper sm:px-6">
      {/* Brand 01: stippled starburst behind everything, pinned to the window while the page scrolls. */}
      <GrainBurst className="fixed inset-0 size-full opacity-25 brand-02:hidden" />
      {/* Brand 02: soft gradient orbs, after the spheres on elevenlabs.io, drifting slowly around the page on their
          own loops (orb-drift-* in globals.css). Colors and gradient sizes from the Figma Brand 02 backdrop.
          On phones they're under half the screen width, so there's open background between them as they drift. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden overflow-hidden brand-02:block">
        <div className="absolute -top-12 -right-12 size-[180px] rounded-full animate-[orb-drift-high_40s_ease-in-out_infinite] opacity-35 blur-2xl will-change-transform sm:-top-40 sm:-right-32 sm:size-[520px] sm:blur-3xl" style={{ background: ORBS.blue }} />
        <div className="absolute -bottom-14 -left-14 size-[190px] rounded-full animate-[orb-drift-low_52s_ease-in-out_infinite] opacity-35 blur-2xl will-change-transform sm:-bottom-48 sm:-left-40 sm:size-[560px] sm:blur-3xl" style={{ background: ORBS.red }} />
        <div className="absolute -right-10 -bottom-12 size-[170px] rounded-full animate-[orb-drift-mid_46s_ease-in-out_-12s_infinite] opacity-35 blur-2xl will-change-transform sm:-right-24 sm:-bottom-40 sm:size-[520px] sm:blur-3xl" style={{ background: ORBS.yellow }} />
      </div>

      {/* Equal flexible space above and below keeps the title and container centered, as in the Figma frame.
          (basis-0 rather than flex-1: a percentage basis in a min-height column counts its content first.) */}
      <div aria-hidden className="grow basis-0" />

      <div className="relative flex w-full flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-4xl text-lime sm:text-[48px] sm:leading-[68px]">pick my movie</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Can’t think of a movie to watch? Let’s pick one for you.
          </p>
        </div>

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
                // Brand 02 leaves the header bare in Spin and Shake: the selected tab already names the mode.
                <p className="truncate text-base text-paper brand-02:hidden">{modeLabel(current, brand)}</p>
              )}
              {pick && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="shrink-0 px-4 has-data-[icon=inline-start]:pl-3"
                  onClick={tryAgain}
                >
                  <RotateCcw data-icon="inline-start" aria-hidden />
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
                      : mode === "auto" && !pick
                        ? // Spin gets extra air above the slots and below the hint.
                          "flex flex-col items-center gap-8 px-2 pt-8 pb-10 sm:px-6"
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
      <LimitPopover open={limitOpen} onOpenChange={setLimitOpen} />
    </main>
  );
}
