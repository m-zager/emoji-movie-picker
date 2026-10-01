import EmojiMoviePicker from "./emoji-movie-picker";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-10 bg-white px-6 py-16 sm:px-16 dark:bg-black">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">🎬 Emoji Movie Picker</h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Can&apos;t decide what to watch? Pick some emojis and we&apos;ll find a movie.
          </p>
        </header>
        <EmojiMoviePicker />
      </main>
    </div>
  );
}
