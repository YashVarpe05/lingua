import "../../global.css";

import { posthog } from "@/config/posthog";
import { fonts } from "@/constants/fonts";
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
import { useCallback, useEffect, useRef } from "react";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
	throw new Error(
		"Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables.",
	);
}

// Keep splash screen visible while fonts and auth load
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
	const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
	const checkAndResetDailyXP = useProgressStore((state) => state.checkAndResetDailyXP);

	useEffect(() => {
		checkAndResetDailyXP();
	}, [checkAndResetDailyXP]);

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

	const onLayoutRootView = useCallback(async () => {
		if ((fontsLoaded || fontError) && clerkLoaded && hasHydrated) {
			await SplashScreen.hideAsync();
		}
	}, [fontsLoaded, fontError, clerkLoaded, hasHydrated]);

	useEffect(() => {
		onLayoutRootView();
	}, [onLayoutRootView]);

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

	if ((!fontsLoaded && !fontError) || !clerkLoaded || !hasHydrated) {
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
