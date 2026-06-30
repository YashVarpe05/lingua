import "../../global.css";

import { posthog } from "@/config/posthog";
import { fonts } from "@/constants/fonts";
import { images } from "@/constants/images";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import {
	Stack,
	useGlobalSearchParams,
	usePathname,
	useRouter,
	useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider, PostHogErrorBoundary } from "posthog-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
	throw new Error(
		"Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables.",
	);
}

const STARTUP_FALLBACK_DELAY_MS = 6000;

// Keep splash screen visible while fonts and persisted state begin loading.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootLayoutNav() {
	const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
	const [showStartupFallback, setShowStartupFallback] = useState(false);
	const checkAndResetDailyXP = useProgressStore((state) => state.checkAndResetDailyXP);
	const progressHasHydrated = useProgressStore((state) => state._hasHydrated);

	useEffect(() => {
		if (!progressHasHydrated) return;
		checkAndResetDailyXP();
	}, [checkAndResetDailyXP, progressHasHydrated]);

	const [fontsLoaded, fontError] = useFonts(fonts);
	const router = useRouter();
	const segments = useSegments();
	const selectedLanguageId = useLanguageStore(
		(state) => state.selectedLanguageId,
	);
	const hasHydrated = useLanguageStore((state) => state.hasHydrated);
	const pathname = usePathname();
	const params = useGlobalSearchParams();
	const previousPathname = useRef<string | undefined>(undefined);
	const appReady = (fontsLoaded || fontError) && clerkLoaded && hasHydrated;

	useEffect(() => {
		const timer = setTimeout(() => {
			setShowStartupFallback(true);
		}, STARTUP_FALLBACK_DELAY_MS);

		return () => clearTimeout(timer);
	}, []);

	// Manual screen tracking for Expo Router
	useEffect(() => {
		if (previousPathname.current !== pathname) {
			posthog.screen(pathname, {
				previous_screen: previousPathname.current ?? null,
				...params,
			});
			previousPathname.current = pathname;
		}
	}, [pathname, params]);

	useEffect(() => {
		if (!appReady && !showStartupFallback) return;

		SplashScreen.hideAsync().catch(() => undefined);
	}, [appReady, showStartupFallback]);

	// Handle navigation guard based on auth state and language selection state
	useEffect(() => {
		if (!clerkLoaded || !hasHydrated) return;
		if (!fontsLoaded && !fontError) return;

		const inAuthGroup = segments[0] === "(auth)";
		const inOnboarding = segments[0] === "onboarding";
		const inSsoCallback = segments[0] === "sso-callback";
		const inLanguages = segments[0] === "languages";

		if (!isSignedIn) {
			// If not signed in and not on onboarding or auth screens, redirect to onboarding
			if (!inOnboarding && !inAuthGroup && !inSsoCallback) {
				router.replace("/onboarding" as any);
			}
		} else {
			// If signed in:
			if (!selectedLanguageId) {
				// If authenticated user has no selected language, route them to language selection screen
				if (!inLanguages && !inAuthGroup && !inSsoCallback) {
					router.replace("/languages" as any);
				}
			} else {
				// If signed in and has selected language:
				// If on onboarding or auth screens, redirect to home
				if (inOnboarding || inAuthGroup) {
					router.replace("/" as any);
				}
			}
		}
	}, [
		clerkLoaded,
		hasHydrated,
		isSignedIn,
		selectedLanguageId,
		segments,
		fontsLoaded,
		fontError,
		router,
	]);

	const startupMessage = useMemo(() => {
		if (!fontsLoaded && !fontError) return "Loading lessons...";
		if (!hasHydrated) return "Restoring progress...";
		if (!clerkLoaded) return "Connecting securely...";
		return "Starting Lingua...";
	}, [clerkLoaded, fontError, fontsLoaded, hasHydrated]);

	if (!appReady) {
		if (showStartupFallback) {
			return (
				<View style={styles.startupFallback}>
					<Image source={images.splashIcon} style={styles.startupMascot} resizeMode="contain" />
					<Text style={styles.startupTitle}>Lingua</Text>
					<Text style={styles.startupMessage}>{startupMessage}</Text>
				</View>
			);
		}

		return null;
	}

	return (
		<>
			<StatusBar style="dark" />
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: "#FFFFFF" },
				}}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	startupFallback: {
		alignItems: "center",
		backgroundColor: "#FFF7E6",
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 32,
	},
	startupMascot: {
		height: 220,
		marginBottom: 18,
		width: 220,
	},
	startupMessage: {
		color: "#6B7280",
		fontSize: 15,
		fontWeight: "500",
		marginTop: 8,
		textAlign: "center",
	},
	startupTitle: {
		color: "#111827",
		fontSize: 32,
		fontWeight: "800",
	},
});

export default function RootLayout() {
	return (
		<PostHogProvider
			client={posthog}
			autocapture={{
				captureScreens: false,
				captureTouches: true,
				propsToCapture: ["testID"],
				maxElementsCaptured: 20,
			}}
		>
			<PostHogErrorBoundary>
				<ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
					<RootLayoutNav />
				</ClerkProvider>
			</PostHogErrorBoundary>
		</PostHogProvider>
	);
}
