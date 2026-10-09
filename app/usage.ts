import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PICK_LIMIT } from "./movies";

/*
 * Each browser gets PICK_LIMIT movie picks. The count lives in an httpOnly cookie, "<used>.<signature>", signed with
 * USAGE_COOKIE_SECRET so it can't be edited down from the browser. Clearing cookies or opening a private window does
 * reset it: this is a per-browser limit, not a per-person one.
 *
 * Server only: it reads the secret and the request's cookies.
 */

const COOKIE = "pmm_picks";
const YEAR = 60 * 60 * 24 * 365;

function sign(used: number) {
  const secret = process.env.USAGE_COOKIE_SECRET;
  if (!secret) throw new Error("USAGE_COOKIE_SECRET is not set. Add a long random string to .env.local.");
  return createHmac("sha256", secret).update(`picks:${used}`).digest("base64url");
}

/** How many picks this browser has used. A missing, edited or unsigned cookie counts as none used. */
export async function picksUsed(): Promise<number> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const match = raw?.match(/^(\d{1,3})\.([\w-]+)$/);
  if (!match) return 0;
  const used = Number(match[1]);
  const expected = Buffer.from(sign(used));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? used : 0;
}

export async function picksLeft(): Promise<number> {
  return Math.max(0, PICK_LIMIT - (await picksUsed()));
}

/** Record one more successful pick. Only call this from a Route Handler or Server Function. */
export async function recordPick(usedBefore: number): Promise<number> {
  const used = usedBefore + 1;
  (await cookies()).set(COOKIE, `${used}.${sign(used)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  return Math.max(0, PICK_LIMIT - used);
}
