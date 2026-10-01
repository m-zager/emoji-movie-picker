export type Vibe = {
  emoji: string;
  label: string;
};

export type Movie = {
  title: string;
  year: number;
  emojis: string[];
};

export const VIBES: Vibe[] = [
  { emoji: "😂", label: "Funny" },
  { emoji: "😱", label: "Scary" },
  { emoji: "😭", label: "Tearjerker" },
  { emoji: "❤️", label: "Romance" },
  { emoji: "💥", label: "Action" },
  { emoji: "🚀", label: "Space" },
  { emoji: "🤖", label: "Robots" },
  { emoji: "🧙", label: "Magic" },
  { emoji: "🦖", label: "Dinosaurs" },
  { emoji: "🕵️", label: "Mystery" },
  { emoji: "🎵", label: "Music" },
  { emoji: "👨‍👩‍👧", label: "Family" },
  { emoji: "🌊", label: "Ocean" },
  { emoji: "🦸", label: "Superhero" },
  { emoji: "🧠", label: "Mind-bending" },
  { emoji: "🐶", label: "Animals" },
];

export const MOVIES: Movie[] = [
  { title: "Jurassic Park", year: 1993, emojis: ["🦖", "😱", "💥", "👨‍👩‍👧"] },
  { title: "Toy Story", year: 1995, emojis: ["😂", "👨‍👩‍👧", "😭"] },
  { title: "Finding Nemo", year: 2003, emojis: ["🌊", "👨‍👩‍👧", "😂", "🐶"] },
  { title: "Titanic", year: 1997, emojis: ["❤️", "😭", "🌊"] },
  { title: "The Matrix", year: 1999, emojis: ["🤖", "💥", "🧠"] },
  { title: "Inception", year: 2010, emojis: ["🧠", "💥", "🕵️"] },
  { title: "Interstellar", year: 2014, emojis: ["🚀", "🧠", "😭"] },
  { title: "WALL·E", year: 2008, emojis: ["🤖", "🚀", "❤️", "👨‍👩‍👧"] },
  { title: "Star Wars", year: 1977, emojis: ["🚀", "💥", "🤖", "🧙"] },
  { title: "Harry Potter and the Sorcerer's Stone", year: 2001, emojis: ["🧙", "👨‍👩‍👧", "🕵️"] },
  { title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001, emojis: ["🧙", "💥"] },
  { title: "Get Out", year: 2017, emojis: ["😱", "🧠", "🕵️"] },
  { title: "Jaws", year: 1975, emojis: ["😱", "🌊", "🐶"] },
  { title: "The Shining", year: 1980, emojis: ["😱", "🧠"] },
  { title: "Knives Out", year: 2019, emojis: ["🕵️", "😂"] },
  { title: "La La Land", year: 2016, emojis: ["🎵", "❤️", "😭"] },
  { title: "Mamma Mia!", year: 2008, emojis: ["🎵", "😂", "❤️"] },
  { title: "Coco", year: 2017, emojis: ["🎵", "👨‍👩‍👧", "😭"] },
  { title: "Spider-Man: Into the Spider-Verse", year: 2018, emojis: ["🦸", "💥", "😂", "👨‍👩‍👧"] },
  { title: "The Avengers", year: 2012, emojis: ["🦸", "💥", "😂"] },
  { title: "The Dark Knight", year: 2008, emojis: ["🦸", "💥", "🕵️"] },
  { title: "Paddington 2", year: 2017, emojis: ["😂", "👨‍👩‍👧", "🐶"] },
  { title: "Marley & Me", year: 2008, emojis: ["🐶", "😭", "👨‍👩‍👧"] },
  { title: "The Notebook", year: 2004, emojis: ["❤️", "😭"] },
  { title: "Superbad", year: 2007, emojis: ["😂"] },
  { title: "Mad Max: Fury Road", year: 2015, emojis: ["💥"] },
  { title: "Spirited Away", year: 2001, emojis: ["🧙", "👨‍👩‍👧", "🧠"] },
  { title: "Up", year: 2009, emojis: ["😭", "😂", "👨‍👩‍👧", "🐶"] },
  { title: "The Martian", year: 2015, emojis: ["🚀", "😂"] },
  { title: "Ex Machina", year: 2014, emojis: ["🤖", "🧠", "😱"] },
  { title: "Moana", year: 2016, emojis: ["🌊", "🎵", "👨‍👩‍👧", "🧙"] },
  { title: "Alien", year: 1979, emojis: ["🚀", "😱"] },
  { title: "The Incredibles", year: 2004, emojis: ["🦸", "👨‍👩‍👧", "😂", "💥"] },
  { title: "Back to the Future", year: 1985, emojis: ["😂", "🧠", "🎵"] },
];

/** Rank movies by how many of the selected emojis they share. */
export function pickMovies(selected: string[]): (Movie & { score: number })[] {
  if (selected.length === 0) return [];
  return MOVIES.map((movie) => ({
    ...movie,
    score: movie.emojis.filter((e) => selected.includes(e)).length,
  }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
