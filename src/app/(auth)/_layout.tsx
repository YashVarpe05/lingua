import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) {
		return null;
	}

	if (isSignedIn) {
import type { Href } from "expo-router";
import { Redirect, Stack } from "expo-router";

// ... (other code)

	if (isSignedIn) {
		const homeHref: Href = "/";
		return <Redirect href={homeHref} />;
	}
	}

	return <Stack screenOptions={{ headerShown: false }} />;
}
