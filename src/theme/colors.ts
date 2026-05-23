/**
 * Lingua Design System — Color Tokens
 *
 * These values match the design system spec exactly.
 * Use Tailwind classes (e.g. `bg-lingua-purple`, `text-neutral-primary`)
 * whenever possible. Import this file only when you need raw hex values
 * in JavaScript (e.g. for StatusBar, splash screen, or charting libs).
 */

// ─── Primary Brand Colors ────────────────────────────────────────────
export const primary = {
  linguaPurple: "#6C4EF5",
  linguaDeepPurple: "#5B3BF6",
  linguaBlue: "#4D8BFF",
  linguaGreen: "#21C16B",
} as const;

// ─── Semantic Colors ─────────────────────────────────────────────────
export const semantic = {
  success: "#21C16B",
  warning: "#FFC800",
  streak: "#FF8A00",
  error: "#FF4D4F",
  info: "#4D8BFF",
} as const;

// ─── Neutral Colors ──────────────────────────────────────────────────
export const neutral = {
  textPrimary: "#0D132B",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  surface: "#F6F7FB",
  background: "#FFFFFF",
} as const;

// ─── Flat export for convenience ─────────────────────────────────────
export const colors = {
  ...primary,
  ...semantic,
  ...neutral,
} as const;

export type ColorToken = keyof typeof colors;
