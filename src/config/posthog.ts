import PostHog from "posthog-react-native";
import Constants from "expo-constants";

const rawApiKey = Constants.expoConfig?.extra?.posthogProjectToken;
const rawHost = Constants.expoConfig?.extra?.posthogHost;

const sanitizedApiKey = typeof rawApiKey === "string" ? rawApiKey.trim() : "";
const host = typeof rawHost === "string" ? rawHost.trim() : undefined;

const apiKey = sanitizedApiKey || undefined;
const isPostHogConfigured = Boolean(sanitizedApiKey) && sanitizedApiKey !== "phc_your_project_token_here";

if (__DEV__) {
	console.log("PostHog config:", {
		apiKey: apiKey ? "SET" : "NOT SET",
		host,
		isConfigured: isPostHogConfigured,
	});
}

if (__DEV__ && !isPostHogConfigured) {
	console.warn(
		"PostHog project token not configured. Analytics will be disabled. " +
			"Set POSTHOG_PROJECT_TOKEN in your .env file to enable analytics."
	);
}

export const posthog = new PostHog(apiKey || "placeholder_key", {
	host,
	disabled: !isPostHogConfigured,
	captureAppLifecycleEvents: true,
	flushAt: 20,
	flushInterval: 10000,
	maxBatchSize: 100,
	maxQueueSize: 1000,
	preloadFeatureFlags: true,
	sendFeatureFlagEvent: true,
	featureFlagsRequestTimeoutMs: 10000,
	requestTimeout: 10000,
	fetchRetryCount: 3,
	fetchRetryDelay: 3000,
	errorTracking: {
		autocapture: true,
	},
});

export const isPostHogEnabled = isPostHogConfigured;
