/**
 * The page's look, set by `data-brand` on <html> (see layout.tsx); globals.css swaps the tokens to match. Brand 02 is
 * the product. Brand 01, the original dark lime theme, is still defined but no longer shown.
 */
export type Brand = "01" | "02";

/**
 * Brand 02's orbs, from the Figma backdrop: the soft glows that float behind the page, also used (smaller) as the
 * empty Spin slots, so the two always match. Sizes are relative, so the same gradient fits a 520px background orb and
 * an 87px slot. The blue one's spread is a little wider than its box, as drawn in Figma.
 */
export const ORBS = {
  blue: "radial-gradient(102.1% 102.1% at 34.8% 35.2%, #a5e5ff, #3dc8ff 45%, #e81ca1 100%)",
  red: "radial-gradient(circle at 35% 35%, #ffa2a3, #ff3d40 45%, #e81c1f 100%)",
  yellow: "radial-gradient(circle at 35% 35%, #e5fe93, #d1fe3e 45%, #91b519 100%)",
} as const;

/** The Spin slots, left to right. */
export const SLOT_ORBS = [ORBS.blue, ORBS.red, ORBS.yellow] as const;

/** Brand 02's warm sphere: the Shake orb and the Spin lever's knob. */
export const WARM_ORB = "radial-gradient(circle at 32% 28%, #ffe4c8 0%, #ff9a5c 38%, #ec5524 70%, #b8300f 100%)";
