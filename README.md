# 🎬 pick my movie

Can't think of a movie to watch? Choose three emojis (😂 😱 🦖 …) and Claude picks a film that fits them, with its poster, a short reason it matches, and where you can stream it.

**Live:** [emoji-movie-picker.vercel.app](https://emoji-movie-picker.vercel.app)

## How it works

There are three ways to choose your emojis, from 182 vibes:

- **👆 Pick three:** tap them yourself on the emoji field.
- **🎰 Spin:** pull the lever and let the slot reels choose.
- **🎲 Shake:** pick up the orb, shake it, and let go to roll three.

Optionally, choose your streaming services (Netflix, Prime Video, Disney+, Hulu, HBO Max, Apple TV+, Peacock, Paramount+, Tubi, Pluto TV) and the pick comes from films streaming on them in the US right now.

Each browser gets **5 picks**, and you're never shown the same movie twice.

### What happens behind a pick

All of this happens in the `POST /api/pick` route ([`app/api/pick/route.ts`](app/api/pick/route.ts)):

1. It checks the request and the browser's pick count, a signed cookie (see [`app/usage.ts`](app/usage.ts)).
2. If you chose services, it fetches up to about 300 popular films streaming on them from [TMDB](https://www.themoviedb.org/), leaving out any you've already been shown.
3. It asks Claude for three candidates (title, year and a one- or two-sentence reason), best match first. When there's a list from step 2, Claude is asked to choose from it.
4. It keeps the best-ranked candidate you haven't seen, preferring one that's on your services.
5. It looks the film up on TMDB for its poster and where to watch it, then uses up one pick.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router), React 19 and TypeScript
- Tailwind CSS v4, shadcn/ui on Radix UI, lucide icons, Framer Motion
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) with `claude-opus-5-5` and Zod-checked structured output
- TMDB API for the films to choose from, posters and where to watch
- Hosted on [Vercel](https://vercel.com/), with Vercel Web Analytics

## Getting started

You'll need Node.js 20.9 or newer, an [Anthropic API key](https://console.anthropic.com/) and a [TMDB API read access token](https://www.themoviedb.org/settings/api).

1. Create `.env.local` in the project root:

   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   TMDB_READ_TOKEN=eyJ...          # the "API Read Access Token", not the short API key
   USAGE_COOKIE_SECRET=...         # any long random string, e.g. from: openssl rand -base64 48
   ```

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

Other scripts: `npm run build`, `npm start` and `npm run lint`.

## Project layout

| File | What it does |
|---|---|
| `app/page.tsx`, `app/layout.tsx` | Page shell, fonts, analytics, and the `data-brand` attribute |
| `app/emoji-movie-picker.tsx` | The main picker: modes, picks, results, and the floating background orbs |
| `app/emoji-magnet-field.tsx` | The 👆 Pick three emoji field |
| `app/slot-lever.tsx` | The 🎰 Spin lever |
| `app/dice-roll.tsx` | The 🎲 Shake orb and its emoji dice |
| `app/service-menu.tsx` | Streaming service picker |
| `app/poster-tilt.tsx` | The result poster's tilt effect |
| `app/limit-popover.tsx` | The card shown when all 5 picks are used |
| `app/movies.ts` | Emoji vibes, streaming services, the pick limit and shared types |
| `app/api/pick/route.ts` | The pick API (Claude + TMDB) |
| `app/tmdb.ts` | TMDB requests: streaming catalog, poster and where-to-watch lookups |
| `app/usage.ts` | The signed per-browser pick counter |
| `app/brand.ts`, `app/use-brand.ts`, `app/globals.css` | Brand colors, gradients and animations |
| `components/ui/` | shadcn/ui components (button, dialog, popover) |

## Brands

The site uses **Brand 02**: a light theme with gradient orbs, inspired by elevenlabs.io. It's set with `data-brand="02"` in [`app/layout.tsx`](app/layout.tsx).

The earlier **Brand 01** (dark, with a stippled starburst and a popcorn bucket instead of the orb) is still in the code. Set `data-brand="01"` to see it. It also has a **✍️ Describe** mode for asking in your own words, which the API supports for both brands.

## Deployment

The project deploys to Vercel from GitHub:

- Pushing any branch builds a preview deployment.
- Merging to `main` deploys to production.

`ANTHROPIC_API_KEY`, `TMDB_READ_TOKEN` and `USAGE_COOKIE_SECRET` are set in the Vercel project for Production and Preview. After changing them, redeploy, because environment variables only reach new builds.

> The production site is public, and every pick calls the Anthropic API. The 5-pick limit is per browser and easy to reset, so keep a spend limit on the API key.

## Credits

Built by Michael Zager. See more work at [zagerux.com](https://www.zagerux.com).

Movie posters and data come from [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
