"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

// Fixed (not random) offsets so the scattered look matches between server and client renders.
const TILTS = [-8, 5, -3, 9, -6, 2, 7, -9, 4, -2, 6, -5];
const LIFTS = [0, -6, 4, -3, 7, -5, 2, 5, -7, 3, -2, 6];
const SIZES = [1, 0.75, 1.2, 0.85, 1.1, 0.7, 0.95];
const GAPS = [4, 14, 8, 20, 2];

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
        <span key={i} className="flex size-20 shrink-0 items-center justify-center sm:size-24">
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
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
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
                  mine.has(p.id) ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-amber-50 dark:ring-offset-zinc-900" : ""
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
    <p className="mt-6 rounded-xl bg-black/5 px-4 py-3 text-sm text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
      ⚠️ Couldn&apos;t find a match streaming on your services, so here&apos;s the best overall pick.
    </p>
  );
  if (!watch || (watch.stream.length === 0 && watch.rentOrBuy.length === 0)) {
    return (
      <>
        {notOnYours}
        <p className="mt-6 text-sm text-zinc-500">No streaming info found for the US.</p>
      </>
    );
  }
  return (
    <div className="mt-6 flex w-full flex-col gap-4">
      {notOnYours}
      <ProviderRow label="Stream" providers={watch.stream} link={watch.link} mine={mine} />
      <ProviderRow label="Rent or buy" providers={watch.rentOrBuy} link={watch.link} mine={mine} />
      <p className="text-xs text-zinc-500">
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
                    ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-background"
                    : "opacity-40 grayscale hover:opacity-80 hover:grayscale-0"
                }`}
              >
                <Image src={`${SERVICE_LOGO_BASE}${logo}`} alt={name} width={36} height={36} className="rounded-lg" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-zinc-500">
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

type Mode = "auto" | "manual";

const MODES: { value: Mode; label: string }[] = [
  { value: "auto", label: "🎲 Pick for me" },
  { value: "manual", label: "👆 Pick Myself" },
];

function randomEmojis() {
  const pool = VIBES.map((v) => v.emoji);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICK_COUNT);
}

export default function EmojiMoviePicker() {
  const [mode, setMode] = useState<Mode>("manual");
  const [selected, setSelected] = useState<string[]>([]);
  const [pick, setPick] = useState<MoviePick | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reelsStopped, setReelsStopped] = useState(0);
  const [services, setServices] = useState<ServiceKey[]>([]);

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

  function toggle(emoji: string) {
    setError(null);
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
    setSelected([]);
    setError(null);
  }

  async function pickMovie(emojis: string[]) {
    setSelected(emojis);
    setLoading(true);
    setReelsStopped(0);
    setError(null);
    try {
      // Spin for at least MIN_SPIN_MS so a fast answer still gets a proper roll.
      const [data] = await Promise.all([
        fetch("/api/pick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emojis, services }),
        }).then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
          return body as MoviePick;
        }),
        wait(MIN_SPIN_MS),
      ]);
      // Stop the reels one at a time, left to right, then reveal the movie.
      for (let i = 1; i <= PICK_COUNT; i++) {
        setReelsStopped(i);
        await wait(REEL_STOP_GAP_MS);
      }
      await wait(REEL_STOP_GAP_MS);
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

  if (pick) {
    return (
      <div className="flex flex-col items-center gap-6">
        <article className="flex w-full flex-col items-center gap-8 rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100 p-8 shadow-sm sm:flex-row sm:items-start dark:border-amber-400/30 dark:from-amber-400/10 dark:to-orange-500/10">
          {pick.posterUrl && (
            <Image
              src={pick.posterUrl}
              alt={`${pick.title} poster`}
              width={500}
              height={750}
              className="w-48 shrink-0 rounded-xl shadow-lg sm:w-56"
            />
          )}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <p className="text-3xl tracking-widest">{selected.join(" ")}</p>
            <p className="mt-5 text-sm font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Tonight you&apos;re watching
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">🍿 {pick.title}</h2>
            <p className="mt-1 text-zinc-500">{pick.year}</p>
            <p className="mt-5 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">{pick.reason}</p>
            <WhereToWatch pick={pick} services={services} />
          </div>
        </article>
        <button
          type="button"
          onClick={tryAgain}
          className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition hover:opacity-80"
        >
          🔄 Try again
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col items-center gap-10">
      <div className="flex flex-col items-center gap-5">
        <div
          role="radiogroup"
          aria-label="How to pick"
          className="flex rounded-full border border-black/10 bg-zinc-100 p-1 dark:border-white/10 dark:bg-zinc-900"
        >
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => switchMode(value)}
              disabled={loading}
              className={`rounded-full px-5 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                mode === value
                  ? "bg-white text-foreground shadow-sm dark:bg-zinc-700"
                  : "text-zinc-500 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <ServicePicker services={services} onChange={changeServices} disabled={loading} />
      </div>

      <div className="flex gap-4" aria-label="Your picks">
        {Array.from({ length: PICK_COUNT }, (_, i) => {
          const emoji = selected[i];
          const spinning = loading && i >= reelsStopped;
          const justStopped = loading && !spinning;
          return (
            <button
              key={i}
              type="button"
              onClick={() => emoji && toggle(emoji)}
              disabled={!emoji || loading || mode === "auto"}
              aria-label={emoji ? `Remove ${labelFor(emoji)}` : `Empty slot ${i + 1}`}
              className={`relative flex size-20 items-center justify-center overflow-hidden rounded-3xl text-5xl transition sm:size-24 sm:text-6xl ${
                emoji
                  ? "bg-amber-100 shadow-inner hover:bg-amber-200 dark:bg-amber-400/20 dark:hover:bg-amber-400/30"
                  : "border-2 border-dashed border-black/15 dark:border-white/20"
              }`}
            >
              {spinning ? (
                <Reel emoji={emoji} index={i} />
              ) : (
                emoji ? (
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
                  mode === "auto" && <span className="text-4xl text-zinc-400 sm:text-5xl">?</span>
                )
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => pickMovie(mode === "auto" ? randomEmojis() : selected)}
        disabled={loading || (mode === "manual" && !full)}
        className="self-center rounded-full bg-foreground px-8 py-3 font-medium text-background transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {loading ? "🎬 Picking…" : mode === "auto" ? "🎲 Roll for me" : "🎬 Pick my movie"}
      </button>

      {error && (
        <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {mode === "manual" && (
        <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-zinc-50 dark:from-zinc-900" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-zinc-50 dark:from-zinc-900" />
          <div className="flex max-h-72 flex-wrap items-center justify-center overflow-y-auto overscroll-contain px-4 py-6 sm:max-h-80">
            {VIBES.map(({ emoji, label }, i) => {
              const active = selected.includes(emoji);
              const locked = (full && !active) || loading;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => toggle(emoji)}
                  disabled={locked}
                  aria-pressed={active}
                  aria-label={label}
                  title={label}
                  style={{
                    rotate: `${TILTS[i % TILTS.length]}deg`,
                    translate: `0 ${LIFTS[i % LIFTS.length]}px`,
                    marginInline: GAPS[i % GAPS.length],
                  }}
                  className={`p-1 text-4xl transition duration-200 sm:text-5xl ${
                    active
                      ? "scale-50 opacity-20"
                      : "hover:scale-125 active:scale-95"
                  } disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:scale-100`}
                >
                  <span style={{ fontSize: `${SIZES[i % SIZES.length]}em` }}>{emoji}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
