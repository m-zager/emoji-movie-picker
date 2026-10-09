"use client";

import { ExternalLink, XIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PICK_LIMIT } from "./movies";

// All three links open in a new tab and dim on hover.
const LINK = "underline transition-colors hover:text-muted-foreground";

const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/mzager7/" },
  { label: "Instagram", href: "https://www.instagram.com/mzager7" },
];

/**
 * Shown once a browser has used all its picks (Figma "limit-popover"): a headshot beside a short bio, the
 * portfolio link and social links. Two columns on wider screens, stacked on phones.
 */
export default function LimitPopover({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] flex-col items-start gap-6 overflow-y-auto rounded-2xl bg-olive p-6 font-portfolio text-[#1a1b1f] ring-0 sm:max-w-[min(1440px,calc(100%-2rem))] sm:flex-row sm:gap-12 sm:p-12"
      >
        {/* The visible copy doesn't spell out the limit, so screen readers get it here. */}
        <DialogTitle className="sr-only">You’ve used all {PICK_LIMIT} picks</DialogTitle>
        <DialogDescription className="sr-only">
          Thanks for trying Pick My Movie. Here’s who made it.
        </DialogDescription>

        {/* shrink-0 on both columns: on a short phone screen the card scrolls instead of squashing the photo. */}
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl sm:flex-1 sm:shrink">
          <Image src="/headshot.jpg" alt="Michael Zager" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
        </div>

        <div className="flex w-full shrink-0 flex-col justify-center gap-10 self-stretch sm:flex-1 sm:shrink sm:gap-24">
          <div className="flex flex-col gap-6 sm:gap-9">
            <p className="text-base leading-5 font-medium">Find a movie to watch?</p>
            <div className="text-xl leading-[30px] font-semibold sm:text-2xl sm:leading-[38px]">
              {/* Paragraphs are a blank line apart, as in the Figma frame. */}
              <p>
                This was a fun little project to keep my muscle memory with Claude + VS Code and push myself to
                develop new skills. See more projects like this on my portfolio below.
              </p>
              <p className="mt-[30px] sm:mt-[38px]">
                Denver, CO based product designer with 7+ years of experience shaping 0-to-1 products, leading PLG
                initiatives, and perfecting AI prototypes.
              </p>
              <p className="mt-[30px] sm:mt-[38px]">
                <a
                  href="https://www.zagerux.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${LINK} inline-flex items-center gap-2`}
                >
                  www.zagerux.com
                  <ExternalLink className="size-5 shrink-0" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </p>
            </div>
          </div>
          <div className="flex gap-12 text-base leading-5 font-medium">
            {LINKS.map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
                {label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
        {/* Close in the secondary style (the white pill, like Try again), in place of the dialog's ghost button.
            Last in the DOM, like the original, so opening still focuses the first link rather than Close. */}
        <DialogClose asChild>
          <Button variant="secondary" size="icon" className="absolute top-3 right-3 z-10" aria-label="Close">
            <XIcon />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
