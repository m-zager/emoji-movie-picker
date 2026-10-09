import EmojiMoviePicker from "./emoji-movie-picker";
import { picksLeft } from "./usage";

export default async function Home() {
  // Reading the picks cookie makes this page render per request.
  const left = await picksLeft();
  return (
    <div className="flex-1 font-sans">
      <EmojiMoviePicker
        initialPicksLeft={left}
        footer={
          <>
            <p>
              Project made by Michael Zager. See more work at{" "}
              <a href="https://www.zagerux.com" target="_blank" rel="noopener noreferrer" className="underline">
                www.zagerux.com
              </a>
            </p>
            <p className="mt-1">
              Movie posters and data from{" "}
              <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
                TMDB
              </a>
              . This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </>
        }
      />
    </div>
  );
}
