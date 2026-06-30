const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appConfigPath = path.join(root, "app.config.js");
const envExamplePath = path.join(root, ".env.example");
const docsPath = path.join(root, "docs", "api-production-readiness.md");

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(message);
	}
};

const read = (filePath) => fs.readFileSync(filePath, "utf8");

const loadAppConfig = () => {
	const loaded = require(appConfigPath);
	return loaded.default || loaded;
};

const appConfig = loadAppConfig();
const envExample = read(envExamplePath);
const docs = read(docsPath);

const requiredEnvKeys = [
	"EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
	"EXPO_PUBLIC_API_BASE_URL",
	"CLERK_SECRET_KEY",
	"CLERK_AUTHORIZED_PARTIES",
	"POSTHOG_PROJECT_TOKEN",
	"POSTHOG_HOST",
	"EXPO_PUBLIC_SUPABASE_URL",
	"EXPO_PUBLIC_SUPABASE_ANON_KEY",
	"SUPABASE_SERVICE_ROLE_KEY",
	"DATABASE_URL",
	"GEMINI_API_KEY",
	"GEMINI_MODEL",
	"STREAM_API_KEY",
	"STREAM_API_SECRET",
	"VISION_AGENT_BASE_URL",
	"EXPO_UNSTABLE_DEPLOY_SERVER",
];

const documentedRoutes = [
	"/api/leaderboard/fetch",
	"/api/leaderboard/upsert",
	"/api/leaderboard/migrate",
	"/api/explain-answer",
	"/api/pronunciation-score",
	"/api/stream",
	"/api/agent/start",
	"/api/agent/stop",
];

const placeholderPatterns = [
	/your[-_]/i,
	/YOUR_/,
	/example/i,
	/placeholder/i,
	/http:\/\/127\.0\.0\.1:8000/,
	/gemini-2\.5-flash/,
	/^1$/,
];
const sensitiveEnvKeys = new Set([
	"CLERK_SECRET_KEY",
	"SUPABASE_SERVICE_ROLE_KEY",
	"DATABASE_URL",
	"GEMINI_API_KEY",
	"STREAM_API_KEY",
	"STREAM_API_SECRET",
]);

const getEnvValue = (source, key) => {
	const line = source
		.split(/\r?\n/)
		.find((item) => item.trim().startsWith(`${key}=`));

	if (!line) return "";

	return line.slice(line.indexOf("=") + 1).trim();
};

assert(
	appConfig.expo?.web?.output === "server",
	"app.config.js must keep expo.web.output set to \"server\" for API routes"
);
console.log("PASS Expo web output is server");

const routerPlugin = appConfig.expo?.plugins?.find((plugin) =>
	Array.isArray(plugin) ? plugin[0] === "expo-router" : plugin === "expo-router"
);
assert(routerPlugin, "app.config.js must include the expo-router plugin");

if (Array.isArray(routerPlugin)) {
	const origin = routerPlugin[1]?.origin;
	assert(
		!origin || !/localhost|127\.0\.0\.1|\[::1\]/.test(origin),
		"expo-router origin must not point to localhost for production readiness"
	);
}
console.log("PASS Expo Router plugin has no local-only production origin");

requiredEnvKeys.forEach((key) => {
	const value = getEnvValue(envExample, key);
	assert(value, `.env.example is missing ${key}`);
	assert(docs.includes(key), `docs/api-production-readiness.md must document ${key}`);

	if (sensitiveEnvKeys.has(key)) {
		assert(
			placeholderPatterns.some((pattern) => pattern.test(value)),
			`.env.example should use a placeholder value for sensitive ${key}`
		);
	}

	console.log(`PASS env key documented: ${key}`);
});

documentedRoutes.forEach((route) => {
	assert(docs.includes(route), `docs/api-production-readiness.md must document ${route}`);
	console.log(`PASS route documented: ${route}`);
});

assert(
	docs.includes("VISION_AGENT_BASE_URL") &&
		docs.toLowerCase().includes("localhost only works during local development"),
	"Vision Agent production note must explain that localhost is local-only"
);
console.log("PASS Vision Agent local-vs-production note is documented");

assert(
	docs.includes("@stream-io/node-sdk") && docs.includes("verify the exported server bundle"),
	"Stream route note must call out Node SDK export/deployment verification"
);
console.log("PASS Stream route runtime note is documented");

console.log("API production readiness checks passed.");
