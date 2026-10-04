import type { Metadata } from "next";
import { Geist_Mono, Google_Sans_Flex, Newsreader } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Roll for Movie",
  description: "Pick a few emojis, get a movie to watch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased font-sans", googleSansFlex.variable, geistMono.variable, newsreader.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
