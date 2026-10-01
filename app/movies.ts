export type Vibe = {
  emoji: string;
  label: string;
};

export type Provider = {
  id: number;
  name: string;
  logoUrl: string;
};

export type MovieDetails = {
  posterUrl: string | null;
  watch: { link: string; stream: Provider[]; rentOrBuy: Provider[] } | null;
};

export type MoviePick = MovieDetails & {
  title: string;
  year: number;
  reason: string;
  /** null when no streaming services were selected. */
  onYourServices: boolean | null;
};

export const PICK_COUNT = 3;

export type ServiceKey = (typeof SERVICES)[number]["key"];

/** US streaming services, each grouped with its TMDB provider ids (ad tiers, channel add-ons). */
export const SERVICES = [
  { key: "netflix", name: "Netflix", logo: "/rK1KljqmbvO9HQa1PBFLILWah72.png", ids: [8, 1796, 175] },
  { key: "prime", name: "Prime Video", logo: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png", ids: [9, 2100, 613] },
  { key: "disney", name: "Disney+", logo: "/5eZ872CghnHFLB1j8grszbrx0dx.png", ids: [337] },
  { key: "hulu", name: "Hulu", logo: "/44uAnmSqvA4yBOdbPWN8YgQHjWm.png", ids: [15] },
  { key: "max", name: "HBO Max", logo: "/skypuy7SXuugIQeYg0IglmzoKaS.png", ids: [1899, 1825] },
  { key: "appletv", name: "Apple TV+", logo: "/9icYBfYFcwgCbky5VdGUIKJ4C5i.png", ids: [350, 2243] },
  { key: "peacock", name: "Peacock", logo: "/a1UIdq5BrkcAxnxcUhFsNbXnxeu.png", ids: [386, 387, 2553] },
  { key: "paramount", name: "Paramount+", logo: "/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png", ids: [2303, 2616, 582, 633] },
  { key: "tubi", name: "Tubi (free)", logo: "/9dEuvA8wg5TSeFBZlPxSVxFdimJ.png", ids: [73] },
  { key: "pluto", name: "Pluto TV (free)", logo: "/fN4czqaMQNLeF6sSSIjGbAWzvwK.png", ids: [300] },
] as const;

export const SERVICE_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

export function providerIdsFor(keys: readonly ServiceKey[]): Set<number> {
  return new Set(SERVICES.filter((s) => keys.includes(s.key)).flatMap((s) => s.ids));
}

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
  { emoji: "🤠", label: "Western" },
  { emoji: "🏰", label: "Medieval" },
  { emoji: "🧟", label: "Zombies" },
  { emoji: "🏆", label: "Sports" },
  { emoji: "🕰️", label: "Time travel" },
  { emoji: "🍕", label: "Food" },
  { emoji: "🗺️", label: "Adventure" },
  { emoji: "🎄", label: "Holiday" },
  { emoji: "👻", label: "Ghosts" },
  { emoji: "🧛", label: "Vampires" },
  { emoji: "👽", label: "Aliens" },
  { emoji: "🏴‍☠️", label: "Pirates" },
  { emoji: "🥷", label: "Ninjas" },
  { emoji: "🚗", label: "Cars" },
  { emoji: "✈️", label: "Planes" },
  { emoji: "🚂", label: "Trains" },
  { emoji: "💰", label: "Heist" },
  { emoji: "🔫", label: "Crime" },
  { emoji: "⚔️", label: "War" },
  { emoji: "🏝️", label: "Island" },
  { emoji: "🏔️", label: "Survival" },
  { emoji: "🌃", label: "City nights" },
  { emoji: "🎃", label: "Halloween" },
  { emoji: "💃", label: "Dance" },
  { emoji: "🎭", label: "Theater" },
  { emoji: "📚", label: "Based on a book" },
  { emoji: "🏫", label: "School" },
  { emoji: "👑", label: "Royalty" },
  { emoji: "🐉", label: "Dragons" },
  { emoji: "🦈", label: "Sharks" },
  { emoji: "🌋", label: "Disaster" },
  { emoji: "🤯", label: "Twist ending" },
  { emoji: "😍", label: "Crush" },
  { emoji: "💔", label: "Heartbreak" },
  { emoji: "💍", label: "Wedding" },
  { emoji: "🥲", label: "Bittersweet" },
  { emoji: "😬", label: "Cringe comedy" },
  { emoji: "🥳", label: "Party" },
  { emoji: "🫶", label: "Friendship" },
  { emoji: "🧒", label: "Coming of age" },
  { emoji: "🐱", label: "Cats" },
  { emoji: "🦁", label: "Jungle" },
  { emoji: "🐻", label: "Wilderness" },
  { emoji: "🕷️", label: "Creepy crawlies" },
  { emoji: "🤡", label: "Clowns" },
  { emoji: "🔪", label: "Slasher" },
  { emoji: "🧪", label: "Science" },
  { emoji: "💻", label: "Hackers" },
  { emoji: "🕹️", label: "Video games" },
  { emoji: "🎸", label: "Rock and roll" },
  { emoji: "🎤", label: "Singing" },
  { emoji: "🥊", label: "Boxing" },
  { emoji: "⚽", label: "Soccer" },
  { emoji: "🎰", label: "Vegas" },
  { emoji: "🎨", label: "Art" },
  { emoji: "❄️", label: "Winter" },
  { emoji: "☀️", label: "Summer" },
  { emoji: "🏜️", label: "Desert" },
  { emoji: "🚢", label: "Ships" },
  { emoji: "🗽", label: "New York" },
  { emoji: "🗼", label: "Paris" },
  { emoji: "🧚", label: "Fairy tale" },
  { emoji: "🎪", label: "Circus" },
  { emoji: "📼", label: "Retro 80s" },
  { emoji: "🦇", label: "Gothic" },
  { emoji: "🐺", label: "Werewolves" },
  { emoji: "🧜", label: "Mermaids" },
  { emoji: "🦄", label: "Whimsical" },
  { emoji: "🌈", label: "LGBTQ+" },
  { emoji: "🧳", label: "Road trip" },
  { emoji: "🏕️", label: "Camping" },
  { emoji: "🏄", label: "Surfing" },
  { emoji: "🐴", label: "Horses" },
  { emoji: "🐧", label: "Penguins" },
  { emoji: "🦍", label: "Giant monsters" },
  { emoji: "🧩", label: "Puzzle" },
  { emoji: "♟️", label: "Chess" },
  { emoji: "🃏", label: "Con artists" },
  { emoji: "🚔", label: "Cops" },
  { emoji: "⚖️", label: "Courtroom" },
  { emoji: "🏥", label: "Hospital" },
  { emoji: "📰", label: "Journalism" },
  { emoji: "🗳️", label: "Politics" },
  { emoji: "🎓", label: "College" },
  { emoji: "💼", label: "Office" },
  { emoji: "🍳", label: "Cooking" },
  { emoji: "🥋", label: "Martial arts" },
  { emoji: "🛹", label: "Skateboarding" },
];
