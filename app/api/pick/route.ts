import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PICK_COUNT, SERVICES, VIBES, providerIdsFor, type MovieDetails, type MoviePick } from "../../movies";
import { getMovieDetails, getStreamingCatalog } from "../../tmdb";

const client = new Anthropic();

const RequestSchema = z.object({
  emojis: z
    .array(z.enum(VIBES.map((v) => v.emoji)))
    .length(PICK_COUNT)
    .refine((list) => new Set(list).size === list.length, "Emojis must be distinct"),
  services: z.array(z.enum(SERVICES.map((s) => s.key))).default([]),
});

const CandidatesSchema = z.object({
  candidates: z.array(
    z.object({
      title: z.string(),
      year: z.number().int(),
      reason: z.string(),
    }),
  ),
});

type Candidate = z.infer<typeof CandidatesSchema>["candidates"][number];
type Film = { title: string; year: number };

const filmKey = (f: Film) => `${f.title.toLowerCase()}|${f.year}`;

/** Ask Claude for ranked candidates; when a catalog is given, it must choose from that list. */
async function suggestMovies(vibes: string, catalog: Film[] | null): Promise<Candidate[]> {
  let content = `My picks: ${vibes}`;
  if (catalog) {
    content +=
      `\n\nChoose only from these films, which are streaming on my services right now:\n` +
      catalog.map((f) => `- ${f.title} (${f.year})`).join("\n");
  }

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: betaZodOutputFormat(CandidatesSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system:
      "You recommend real, released feature films that match the moods a user picks as emojis. " +
      "Return 3 different candidates, best match first. When the user supplies a list, copy the title " +
      "exactly as listed (without the year) and put the year in the year field. Prefer well-known films. For each, keep the reason to one or two " +
      "friendly sentences that connect the film to each of the user's emojis.",
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return [];
  // Claude sometimes copies the list's "(year)" into the title; strip it so lookups match.
  return response.parsed_output.candidates.map((c) => ({
    ...c,
    title: c.title.replace(/\s*\(\d{4}\)\s*$/, ""),
  }));
}

const lookUp = (f: Film): Promise<MovieDetails> =>
  getMovieDetails(f.title, f.year).catch((error) => {
    console.error(error);
    return { posterUrl: null, watch: null };
  });

export async function POST(request: Request) {
  const body = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    const servicesInvalid = body.error.issues.some((issue) => issue.path[0] === "services");
    return Response.json(
      { error: servicesInvalid ? "Unknown streaming service." : `Pick exactly ${PICK_COUNT} emojis.` },
      { status: 400 },
    );
  }

  const { emojis, services } = body.data;
  const vibes = emojis.map((emoji) => `${emoji} (${VIBES.find((v) => v.emoji === emoji)!.label})`).join(", ");
  const myProviderIds = providerIdsFor(services);

  try {
    const catalog =
      services.length > 0
        ? await getStreamingCatalog(myProviderIds).catch((error) => {
            console.error(error);
            return [];
          })
        : [];

    const candidates = await suggestMovies(vibes, catalog.length > 0 ? catalog : null);
    if (candidates.length === 0) {
      return Response.json({ error: "Couldn't pick a movie for that combo. Try again." }, { status: 502 });
    }

    // Prefer the best-ranked candidate that really is in the catalog, in case Claude strays from the list.
    const inCatalog = new Set(catalog.map(filmKey));
    const choice = candidates.find((c) => inCatalog.has(filmKey(c))) ?? candidates[0];
    const details = await lookUp(choice);

    const onYourServices =
      services.length === 0 ? null : (details.watch?.stream.some((p) => myProviderIds.has(p.id)) ?? false);

    return Response.json({ ...choice, ...details, onYourServices } satisfies MoviePick);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic auth failed - check ANTHROPIC_API_KEY in .env.local");
      return Response.json({ error: "The server isn't configured with a valid API key." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests. Wait a moment and try again." }, { status: 429 });
    }
    console.error(error);
    return Response.json({ error: "Something went wrong picking your movie." }, { status: 500 });
  }
}
