"use client";

import { Check, ChevronDown, Tv } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SERVICE_LOGO_BASE, SERVICES, type ServiceKey } from "./movies";

const FREE: readonly ServiceKey[] = ["tubi", "pluto"];
const GROUPS = [
  { title: "Subscriptions", services: SERVICES.filter((s) => !FREE.includes(s.key)) },
  { title: "Free", services: SERVICES.filter((s) => FREE.includes(s.key)) },
];

/** "Tubi (free)" reads oddly under a "Free" heading, so drop the suffix there. */
const shortName = (name: string) => name.replace(/\s*\(free\)$/, "");

/** One line summary of the picks: "Any service", "Netflix", "Netflix, Hulu" or "Netflix, Hulu +2". */
function summary(keys: ServiceKey[]) {
  const names = SERVICES.filter((s) => keys.includes(s.key)).map((s) => shortName(s.name));
  if (names.length === 0) return "Any service";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

/**
 * The streaming filter as one compact pill: "Streaming on · Any service", or the chosen services' logos
 * stacked with a short summary. It opens a menu of every service with its name and a check, grouped
 * into subscriptions and free services.
 */
export default function ServiceMenu({
  services,
  onChange,
  disabled,
  align = "end",
}: {
  services: ServiceKey[];
  onChange: (update: (prev: ServiceKey[]) => ServiceKey[]) => void;
  disabled: boolean;
  /** Which edge of the pill the menu lines up with. */
  align?: "start" | "center" | "end";
}) {
  const chosen = SERVICES.filter((s) => services.includes(s.key));

  function toggleService(key: ServiceKey) {
    onChange((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        aria-label={`Streaming on: ${summary(services)}`}
        className="flex h-11 items-center gap-2 whitespace-nowrap rounded-[100px] border border-transparent bg-ink pr-3 pl-3 text-sm brand-02:border-input text-paper transition hover:bg-ink/70 disabled:opacity-50 data-[state=open]:bg-ink/70 sm:pl-4"
      >
        {/* On phones the pill shrinks to a TV icon (or the chosen logos) so the input keeps its room. */}
        <span className="hidden text-muted-foreground sm:inline">Streaming on</span>
        {chosen.length === 0 && <Tv className="size-4 text-muted-foreground sm:hidden" aria-hidden />}
        {chosen.length > 0 && (
          <span className="flex -space-x-2" aria-hidden>
            {chosen.slice(0, 4).map((s) => (
              <Image
                key={s.key}
                src={`${SERVICE_LOGO_BASE}${s.logo}`}
                alt=""
                width={24}
                height={24}
                className="size-6 rounded-full ring-2 ring-ink"
              />
            ))}
          </span>
        )}
        <span className="hidden sm:inline">{summary(services)}</span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </PopoverTrigger>

      <PopoverContent align={align} sideOffset={8} className="w-80 rounded-2xl border-border bg-olive p-2 text-paper">
        {GROUPS.map((group) => (
          <div key={group.title} role="group" aria-label={group.title} className="mb-1 last:mb-0">
            <p className="px-2 pt-1 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.title}</p>
            <ul className="grid grid-cols-2 gap-1">
              {group.services.map(({ key, name, logo }) => {
                const on = services.includes(key);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleService(key)}
                      // Hover and selected are strokes: a faint outline on hover, the accent when chosen. Brand 02 also
                      // fills the chosen one white. The border is always there (transparent), so nothing shifts.
                      className={`flex w-full items-center gap-2 rounded-[100px] border py-1 pr-2 pl-1 text-left text-sm transition ${
                        on ? "border-lime text-paper brand-02:bg-white" : "border-transparent text-subtle hover:border-veil/25"
                      }`}
                    >
                      <Image
                        src={`${SERVICE_LOGO_BASE}${logo}`}
                        alt=""
                        width={28}
                        height={28}
                        className={`size-7 rounded-full transition ${on ? "" : "opacity-60 grayscale"}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{shortName(name)}</span>
                      {on && <Check className="size-4 shrink-0 text-lime" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-border px-2 pt-2 text-xs text-muted-foreground">
          <span>{services.length === 0 ? "Showing movies on any service" : "Only movies streaming on these"}</span>
          {services.length > 0 && (
            <button type="button" onClick={() => onChange(() => [])} className="text-lime underline-offset-2 hover:underline">
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
