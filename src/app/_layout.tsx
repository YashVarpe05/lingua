import "../../global.css";

import { useEffect, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { fonts } from "@/constants/fonts";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
	throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables.");
}

// Keep splash screen visible while fonts and auth load
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
	const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
	const [fontsLoaded, fontError] = useFonts(fonts);
	const router = useRouter();
	const segments = useSegments();

	const onLayoutRootView = useCallback(async () => {
		if ((fontsLoaded || fontError) && clerkLoaded) {
			await SplashScreen.hideAsync();
		}
	}, [fontsLoaded, fontError, clerkLoaded]);

	useEffect(() => {
		onLayoutRootView();
	}, [onLayoutRootView]);

	// Handle navigation guard based on auth state
	useEffect(() => {
		if (!clerkLoaded) return;
		if (!fontsLoaded && !fontError) return;

		const inAuthGroup = segments[0] === "(auth)";
		const inOnboarding = segments[0] === "onboarding";

		if (!isSignedIn) {
			// If not signed in and not on onboarding or auth screens, redirect to onboarding
			if (!inOnboarding && !inAuthGroup) {
				router.replace("/onboarding" as any);
			}
		} else {
			// If signed in and on onboarding or auth screens, redirect to home
			if (inOnboarding || inAuthGroup) {
				router.replace("/" as any);
			}
		}
	}, [clerkLoaded, isSignedIn, segments, fontsLoaded, fontError, router]);

	if ((!fontsLoaded && !fontError) || !clerkLoaded) {
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
		<ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
			<RootLayoutNav />
		</ClerkProvider>
	);
}
