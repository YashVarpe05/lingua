const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const baseUrl = process.env.API_BASE_URL || "http://localhost:8081";

const parseEnvFile = () => {
	if (!fs.existsSync(envPath)) return {};

	return fs
		.readFileSync(envPath, "utf8")
		.split(/\r?\n/)
		.reduce((values, line) => {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) return values;

			const separatorIndex = trimmed.indexOf("=");
			if (separatorIndex === -1) return values;

			const key = trimmed.slice(0, separatorIndex).trim();
			const value = trimmed.slice(separatorIndex + 1).trim();
			values[key] = value;
			return values;
		}, {});
};

const envValues = parseEnvFile();

const getEnvValue = (key) => process.env[key] || envValues[key] || "";

const printEnvStatus = () => {
	const clerkSecret = getEnvValue("CLERK_SECRET_KEY");
	const authorizedParties = getEnvValue("CLERK_AUTHORIZED_PARTIES");

	console.log("Auth env status:");
	console.log(`- CLERK_SECRET_KEY: ${clerkSecret ? "present" : "missing"}`);
	console.log(`- CLERK_AUTHORIZED_PARTIES: ${authorizedParties ? "present" : "missing"}`);

	if (!clerkSecret) {
		console.log("  Add your real Clerk secret key to .env before authenticated browser QA.");
	}
};

const requestWithTimeout = async (url, init) => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 8000);

	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
};

const checks = [
	{
		name: "leaderboard fetch requires auth",
		path: "/api/leaderboard/fetch?type=weekly",
		method: "GET",
		expectedStatuses: [401],
	},
	{
		name: "leaderboard upsert requires auth",
		path: "/api/leaderboard/upsert",
		method: "POST",
		body: { sessionXP: 10 },
		expectedStatuses: [401],
	},
	{
		name: "stream token route requires auth",
		path: "/api/stream",
		method: "POST",
		body: { lessonId: "es_u1_l1", languageId: "es" },
		expectedStatuses: [401],
	},
	{
		name: "agent start requires auth",
		path: "/api/agent/start",
		method: "POST",
		body: { callId: "lesson-es_u1_l1-user", lessonId: "es_u1_l1" },
		expectedStatuses: [401],
	},
	{
		name: "agent stop requires auth",
		path: "/api/agent/stop",
		method: "POST",
		body: {
			callId: "lesson-es_u1_l1-user",
			lessonId: "es_u1_l1",
			sessionId: "session_123",
		},
		expectedStatuses: [401],
	},
	{
		name: "explain answer requires auth",
		path: "/api/explain-answer",
		method: "POST",
		body: {
			exerciseType: "mcq",
			question: "Translate hello",
			correctAnswer: "hola",
			isCorrect: false,
			languageId: "es",
		},
		expectedStatuses: [401],
	},
	{
		name: "pronunciation score requires auth",
		path: "/api/pronunciation-score",
		method: "POST",
		body: {
			expectedText: "hola",
			languageId: "es",
			audioBase64: "AAAA",
			mimeType: "audio/webm",
		},
		expectedStatuses: [401],
	},
	{
		name: "public leaderboard migration route is disabled",
		path: "/api/leaderboard/migrate",
		method: "GET",
		expectedStatuses: [404],
	},
];

const run = async () => {
	printEnvStatus();
	console.log(`\nChecking API base: ${baseUrl}\n`);

	let failures = 0;

	for (const check of checks) {
		const init = {
			method: check.method,
			headers: check.body ? { "Content-Type": "application/json" } : undefined,
			body: check.body ? JSON.stringify(check.body) : undefined,
		};

		try {
			const response = await requestWithTimeout(`${baseUrl}${check.path}`, init);
			const ok = check.expectedStatuses.includes(response.status);
			const marker = ok ? "PASS" : "FAIL";
			console.log(`${marker} ${check.name} -> ${response.status}`);

			if (!ok) failures += 1;
		} catch (error) {
			failures += 1;
			const message = error instanceof Error ? error.message : String(error);
			console.log(`FAIL ${check.name} -> unable to reach route (${message})`);
		}
	}

	if (failures > 0) {
		console.log(`\n${failures} auth hardening check(s) failed.`);
		process.exit(1);
	}

	console.log("\nAuth hardening checks passed.");
};

run();
