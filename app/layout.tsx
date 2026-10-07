import type { Metadata } from "next";
import { Geist, Geist_Mono, Google_Sans_Flex, Inter, Newsreader } from "next/font/google";
import { BRAND_STORAGE_KEY } from "./brand";
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

// Brand 02's type: Inter for text, light Geist standing in for ElevenLabs' Waldenburg display face.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roll for Movie",
  description: "Pick a few emojis, get a movie to watch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased font-sans",
        googleSansFlex.variable,
        geistMono.variable,
        newsreader.variable,
        inter.variable,
        geist.variable,
      )}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved brand before the first paint, so Brand 02 never flashes Brand 01. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var b=localStorage.getItem(${JSON.stringify(BRAND_STORAGE_KEY)});if(b)document.documentElement.setAttribute("data-brand",b)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
