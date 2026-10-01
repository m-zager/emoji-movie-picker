import type { MovieDetails, Provider } from "./movies";

const API = "https://api.themoviedb.org/3";
const IMAGES = "https://image.tmdb.org/t/p";
const REGION = "US";

type TmdbProvider = { provider_id: number; provider_name: string; logo_path: string };
type TmdbRegionProviders = Partial<Record<"flatrate" | "free" | "ads" | "rent" | "buy", TmdbProvider[]>> & {
  link: string;
};

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
  });
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`);
  return res.json();
}

function toProviders(...lists: (TmdbProvider[] | undefined)[]): Provider[] {
  const seen = new Set<number>();
  return lists
    .flatMap((list) => list ?? [])
    .filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id))
    .map((p) => ({ id: p.provider_id, name: p.provider_name, logoUrl: `${IMAGES}/w92${p.logo_path}` }));
}

const CATALOG_PAGES = 15; // 20 films per page

/** Popular films currently streaming (subscription, free or with ads) on any of the given providers. */
export async function getStreamingCatalog(providerIds: Iterable<number>): Promise<{ title: string; year: number }[]> {
  type Discover = { results: { id: number; title: string; release_date: string }[] };
  const params = {
    watch_region: REGION,
    with_watch_providers: [...providerIds].join("|"),
    with_watch_monetization_types: "flatrate|free|ads",
    sort_by: "popularity.desc",
    "vote_count.gte": "200",
  };
  const pages = await Promise.all(
    Array.from({ length: CATALOG_PAGES }, (_, i) =>
      tmdb<Discover>("/discover/movie", { ...params, page: String(i + 1) }).then((d) => d.results),
    ),
  );
  const seen = new Set<number>();
  return pages
    .flat()
    .filter((m) => m.release_date && !seen.has(m.id) && seen.add(m.id))
    .map((m) => ({ title: m.title, year: Number(m.release_date.slice(0, 4)) }));
}

/** Look up a poster and where-to-watch info. Returns null fields when TMDB has nothing. */
export async function getMovieDetails(title: string, year: number): Promise<MovieDetails> {
  type Search = { results: { id: number; poster_path: string | null }[] };
  let { results } = await tmdb<Search>("/search/movie", { query: title, year: String(year) });
  if (results.length === 0) ({ results } = await tmdb<Search>("/search/movie", { query: title }));
  const movie = results[0];
  if (!movie) return { posterUrl: null, watch: null };

  const providers = await tmdb<{ results: Record<string, TmdbRegionProviders> }>(
    `/movie/${movie.id}/watch/providers`,
  );
  const region = providers.results[REGION];

  return {
    posterUrl: movie.poster_path ? `${IMAGES}/w500${movie.poster_path}` : null,
    watch: region
      ? {
          link: region.link,
          stream: toProviders(region.flatrate, region.free, region.ads),
          rentOrBuy: toProviders(region.rent, region.buy),
        }
      : null,
  };
}
