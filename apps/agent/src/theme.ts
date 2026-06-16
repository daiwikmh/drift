// Color tokens for the DRIFT agent terminal. Ported from the Python CLI's palette
// so the TS port keeps the same look. Swap these to flip the whole theme (e.g. to
// the cream anima palette) in one place.

export const theme = {
  accent: "#9aa8f0", // periwinkle — DRIFT brand
  up: "#34d399", // green — gains / success
  down: "#f87171", // red — loss / error
  amber: "#fbbf24", // warning
  grey: "#9ca3af",
  dim: "#6b7280",
  faint: "#4b5563",
  text: "#e5e7eb",
} as const;

export type ThemeColor = keyof typeof theme;
