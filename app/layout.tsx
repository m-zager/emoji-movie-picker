import type { Metadata } from "next";
import { Geist_Mono, Google_Sans_Flex, Inter, Montserrat, Newsreader } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const googleSansFlex = Google_Sans_Flex({
  variable: "--font-google-sans-flex",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Variable font with optical sizing, so large titles get the display cut automatically.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Brand 02's text face. Its page title uses Google Sans Flex Light (loaded above for Brand 01's body text).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// The pick-limit card (limit-popover.tsx) is set in Montserrat, Medium and SemiBold only.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "pick my movie",
  description: "Pick a few emojis, get a movie to watch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Brand 02 is the look. It's set here in the server HTML, so it's right from the first paint.
      data-brand="02"
      className={cn(
        "h-full antialiased font-sans",
        googleSansFlex.variable,
        geistMono.variable,
        newsreader.variable,
        inter.variable,
        montserrat.variable,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
