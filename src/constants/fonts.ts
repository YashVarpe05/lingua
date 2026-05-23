/**
 * Lingua — Font Configuration
 *
 * Centralized font map for expo-font. Used by the root layout
 * to load Poppins variants before rendering the app.
 */

export const fonts = {
  "Poppins-Regular": require("@/assets/fonts/Poppins-Regular.ttf"),
  "Poppins-Medium": require("@/assets/fonts/Poppins-Medium.ttf"),
  "Poppins-SemiBold": require("@/assets/fonts/Poppins-SemiBold.ttf"),
  "Poppins-Bold": require("@/assets/fonts/Poppins-Bold.ttf"),
} as const;
