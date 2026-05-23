/**
 * Lingua Design System — Typography Tokens
 *
 * Font: Poppins (Regular 400, Medium 500, SemiBold 600, Bold 700)
 *
 * Use Tailwind classes (e.g. `text-h1 font-bold`, `text-body-lg`)
 * whenever possible. Import this file only when you need raw values
 * in JavaScript (e.g. for Reanimated text or custom canvas).
 */

// ─── Font Family ─────────────────────────────────────────────────────
export const fontFamily = {
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semibold: "Poppins-SemiBold",
  bold: "Poppins-Bold",
} as const;

// ─── Font Weights (mapped to Poppins variants) ──────────────────────
export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// ─── Type Scale ──────────────────────────────────────────────────────
export const typeScale = {
  h1: {
    fontSize: 32,
    lineHeight: 1.2, // 38.4px
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.bold,
    usage: "Page / Screen Title",
  },
  h2: {
    fontSize: 24,
    lineHeight: 1.3, // 31.2px
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.semibold,
    usage: "Section Title",
  },
  h3: {
    fontSize: 20,
    lineHeight: 1.3, // 26px
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.semibold,
    usage: "Card / Module Title",
  },
  h4: {
    fontSize: 16,
    lineHeight: 1.4, // 22.4px
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.medium,
    usage: "Subheading",
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 1.6, // 25.6px
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.regular,
    usage: "Important content",
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 1.6, // 22.4px
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.regular,
    usage: "Body text",
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 1.6, // 20.8px
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.regular,
    usage: "Supporting text",
  },
  caption: {
    fontSize: 11,
    lineHeight: 1.4, // 15.4px
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.regular,
    usage: "Labels, meta text",
  },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
