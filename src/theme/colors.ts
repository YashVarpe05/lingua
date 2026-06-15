/**
 * Lingua Design System - Color Tokens
 *
 * Use NativeWind classes whenever possible. Import this file only when raw
 * values are needed in JavaScript, such as animated styles, status bars,
 * canvas charts, or React Native StyleSheet objects.
 */

export const brand = {
  primary: "#6C4EF5",
  primaryDark: "#5537D2",
  primaryLight: "#F0EDFF",
  primaryBorder: "#E1D9FF",
  deepPurple: "#5B3BF6",
  blue: "#4D8BFF",
  green: "#21C16B",
} as const;

// Backward-compatible names used by existing screens.
export const primary = {
  linguaPurple: brand.primary,
  linguaDeepPurple: brand.deepPurple,
  linguaBlue: brand.blue,
  linguaGreen: brand.green,
} as const;

export const learning = {
  action: "#58CC02",
  actionDark: "#58A700",
  actionLight: "#D7FFB8",
  selected: "#1CB0F6",
  selectedDark: "#0D90D0",
  selectedLight: "#DDF4FF",
  correction: "#FF4B4B",
  correctionDark: "#EA2B2B",
  correctionLight: "#FFDFE0",
  reward: "#FFC800",
  rewardDark: "#E5A000",
  rewardLight: "#FFF3CC",
  streak: "#FF9600",
  streakLight: "#FFF8E6",
  surface: "#F7F7F7",
  border: "#E5E5E5",
  text: "#3C3C3C",
  muted: "#777777",
} as const;

export const semantic = {
  success: "#21C16B",
  warning: "#FFC800",
  streak: "#FF8A00",
  error: "#FF4D4F",
  info: "#4D8BFF",
} as const;

export const neutral = {
  textPrimary: "#0D132B",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  surface: "#F6F7FB",
  background: "#FFFFFF",
} as const;

// Duolingo-inspired product colors. These are roles for learning UI states,
// not a replacement for Lingua's fox/purple brand identity.
export const duo = {
  green: learning.action,
  greenDark: learning.actionDark,
  greenLight: learning.actionLight,
  blue: learning.selected,
  blueDark: learning.selectedDark,
  blueLight: learning.selectedLight,
  red: learning.correction,
  redDark: learning.correctionDark,
  redLight: learning.correctionLight,
  yellow: learning.reward,
  yellowDark: learning.rewardDark,
  yellowLight: learning.rewardLight,
  orange: learning.streak,
  gray: learning.surface,
  border: learning.border,
  text: learning.text,
  muted: learning.muted,
} as const;

export const colors = {
  ...brand,
  ...primary,
  ...learning,
  ...semantic,
  ...neutral,
  duoGreen: duo.green,
  duoGreenDark: duo.greenDark,
  duoGreenLight: duo.greenLight,
  duoBlue: duo.blue,
  duoBlueDark: duo.blueDark,
  duoBlueLight: duo.blueLight,
  duoRed: duo.red,
  duoRedDark: duo.redDark,
  duoRedLight: duo.redLight,
  duoYellow: duo.yellow,
  duoYellowDark: duo.yellowDark,
  duoYellowLight: duo.yellowLight,
  duoOrange: duo.orange,
  duoGray: duo.gray,
  duoBorder: duo.border,
  duoText: duo.text,
  duoMuted: duo.muted,
} as const;

export type ColorToken = keyof typeof colors;
