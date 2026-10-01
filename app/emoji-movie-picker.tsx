"use client";

import { useState } from "react";
import { MOVIES, VIBES, pickMovies } from "./movies";

export default function EmojiMoviePicker() {
  const [selected, setSelected] = useState<string[]>([]);
  const [surprise, setSurprise] = useState<string | null>(null);

  const results = pickMovies(selected);
  const bestScore = results[0]?.score ?? 0;

  function toggle(emoji: string) {
    setSurprise(null);
    setSelected((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji],
    );
  }

  function surpriseMe() {
    const pool = results.length > 0 ? results.filter((m) => m.score === bestScore) : MOVIES;
    setSurprise(pool[Math.floor(Math.random() * pool.length)].title);
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Pick your vibe
        </h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {VIBES.map(({ emoji, label }) => {
            const active = selected.includes(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => toggle(emoji)}
                aria-pressed={active}
                title={label}
                className={`flex flex-col items-center gap-1 rounded-2xl border p-3 transition ${
                  active
                    ? "scale-105 border-amber-400 bg-amber-100 dark:bg-amber-400/20"
                    : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                }`}
              >
                <span className="text-3xl">{emoji}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={surpriseMe}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:opacity-80"
          >
            🎲 Surprise me
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelected([]);
                setSurprise(null);
              }}
              className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {surprise && (
        <div className="rounded-2xl bg-amber-100 p-6 text-center dark:bg-amber-400/20">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Tonight you&apos;re watching</p>
          <p className="mt-1 text-2xl font-semibold">🍿 {surprise}</p>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          {selected.length === 0 ? "Movies" : `${results.length} matches for ${selected.join(" ")}`}
        </h2>
        {selected.length === 0 ? (
          <p className="text-zinc-500">Tap a few emojis to get movie picks.</p>
        ) : results.length === 0 ? (
          <p className="text-zinc-500">No movies match that combo. Try another emoji.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {results.map((movie) => (
              <li
                key={movie.title}
                className="flex items-center justify-between gap-4 rounded-xl border border-black/10 px-4 py-3 dark:border-white/15"
              >
                <div>
                  <p className="font-medium">
                    {movie.title} <span className="text-zinc-500">({movie.year})</span>
                  </p>
                  <p className="text-lg">{movie.emojis.join(" ")}</p>
                </div>
                <span className="shrink-0 text-sm text-zinc-500">
                  {movie.score}/{selected.length}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
