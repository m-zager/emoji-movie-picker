/** The two looks the page can wear. Each sets `data-brand` on <html>; globals.css swaps the tokens to match. */
export const BRANDS = [
  { value: "01", label: "Brand 01" },
  { value: "02", label: "Brand 02" },
] as const;

export type Brand = (typeof BRANDS)[number]["value"];

export const BRAND_STORAGE_KEY = "roll-for-movie:brand";
