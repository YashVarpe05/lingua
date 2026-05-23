/**
 * Lingua Design System — Spacing & Layout Tokens
 *
 * Use Tailwind classes (e.g. `p-4`, `rounded-card`, `shadow-card`)
 * whenever possible. Import this file only when you need raw values
 * in JavaScript.
 */

// ─── Spacing Scale (in px, maps to Tailwind default 4px grid) ───────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
  card: 16,
  button: 12,
  input: 12,
  badge: 20,
} as const;

// ─── Shadows (React Native StyleSheet format) ────────────────────────
export const shadows = {
  card: {
    shadowColor: "#0D132B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHover: {
    shadowColor: "#0D132B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  button: {
    shadowColor: "#6C4EF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export type SpacingToken = keyof typeof spacing;
