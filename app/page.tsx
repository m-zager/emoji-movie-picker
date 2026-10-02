import EmojiMoviePicker from "./emoji-movie-picker";

export default function Home() {
  return (
    <div className="flex-1 font-sans">
      <EmojiMoviePicker
        footer={
          <>
            Movie posters and data from{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </>
        }
      />
    </div>
  );
}
