const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const root = path.resolve(__dirname, "..");
const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:8081";
const envFiles = [".env", ".env.local"];

const requiredEnvKeys = [
	"DATABASE_URL",
	"EXPO_PUBLIC_SUPABASE_URL",
	"EXPO_PUBLIC_SUPABASE_ANON_KEY",
	"SUPABASE_SERVICE_ROLE_KEY",
	"CLERK_SECRET_KEY",
	"CLERK_AUTHORIZED_PARTIES",
	"GEMINI_API_KEY",
];

const parseEnvFile = (relativePath) => {
	const fullPath = path.join(root, relativePath);
	if (!fs.existsSync(fullPath)) return {};

	return fs
		.readFileSync(fullPath, "utf8")
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

const envByFile = Object.fromEntries(
	envFiles.map((file) => [file, parseEnvFile(file)])
);
const envValues = {
	...envByFile[".env"],
	...envByFile[".env.local"],
	...process.env,
};

const isPlaceholder = (value) =>
	!value || /your_|placeholder|example|\[your|YOUR-/i.test(value);

const printEnvStatus = () => {
	console.log("Backend env status:");

	requiredEnvKeys.forEach((key) => {
		const value = envValues[key] || "";
		console.log(`- ${key}: ${!isPlaceholder(value) ? "present" : value ? "placeholder" : "missing"}`);
	});

	envFiles.forEach((file) => {
		const value = envByFile[file]?.DATABASE_URL;
		if (!value) {
			console.log(`- ${file} DATABASE_URL: missing`);
			return;
		}

		try {
			const url = new URL(value);
			const usesPooler = url.host.includes("pooler.supabase.com");
			console.log(`- ${file} DATABASE_URL host: ${url.host} (${usesPooler ? "pooler" : "direct"})`);
		} catch {
			console.log(`- ${file} DATABASE_URL: invalid`);
		}
	});
};

const requireEnv = (key) => {
	const value = envValues[key] || "";
	if (isPlaceholder(value)) {
		throw new Error(`${key} is missing or still uses a placeholder value`);
	}
	return value;
};

const requestWithTimeout = async (url, init = {}) => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10000);

	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
};

const checkDatabaseUrl = async () => {
	const databaseUrl = requireEnv("DATABASE_URL");
	const parsed = new URL(databaseUrl);

	if (!parsed.host.includes("pooler.supabase.com")) {
		throw new Error("DATABASE_URL should use the Supabase pooler host for local IPv4 compatibility");
	}

	const client = new Client({
		connectionString: databaseUrl,
		ssl: { rejectUnauthorized: true },
		connectionTimeoutMillis: 10000,
	});

	try {
		await client.connect();
		const result = await client.query("select to_regclass('public.leaderboard') as table_name");
		if (!result.rows[0]?.table_name) {
			throw new Error("public.leaderboard table is missing");
		}

		console.log("PASS DATABASE_URL connects and leaderboard exists");
	} finally {
		await client.end().catch(() => {});
	}
};

const checkSupabaseAdmin = async () => {
	const supabaseUrl = requireEnv("EXPO_PUBLIC_SUPABASE_URL");
	const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
	const anonKey = requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
	const qaId = `qa_backend_${Date.now()}`;
	const admin = createClient(supabaseUrl, serviceKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
	const publicClient = createClient(supabaseUrl, anonKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});

	const insert = await admin
		.from("leaderboard")
		.insert({
			clerk_user_id: qaId,
			display_name: "Backend QA",
			weekly_xp: 10,
			total_xp: 10,
		})
		.select("clerk_user_id, weekly_xp, total_xp")
		.single();

	if (insert.error) throw new Error(`service-role insert failed: ${insert.error.message}`);

	const update = await admin
		.from("leaderboard")
		.update({ weekly_xp: 15, total_xp: 15 })
		.eq("clerk_user_id", qaId)
		.select("weekly_xp, total_xp")
		.single();

	if (update.error) throw new Error(`service-role update failed: ${update.error.message}`);
	if (update.data?.weekly_xp !== 15 || update.data?.total_xp !== 15) {
		throw new Error("service-role update returned unexpected XP values");
	}

	const publicRead = await publicClient.from("leaderboard").select("id").limit(1);
	if (!publicRead.error) {
		throw new Error("publishable key can read leaderboard directly; expected RLS/grants to block it");
	}

	const cleanup = await admin.from("leaderboard").delete().eq("clerk_user_id", qaId);
	if (cleanup.error) throw new Error(`service-role cleanup failed: ${cleanup.error.message}`);

	console.log("PASS Supabase service role writes and publishable key direct read is blocked");
};

const checkProtectedRoutes = async () => {
	const checks = [
		{
			name: "leaderboard fetch requires auth",
			path: "/api/leaderboard/fetch?type=weekly",
			method: "GET",
			expectedStatus: 401,
		},
		{
			name: "leaderboard upsert requires auth",
			path: "/api/leaderboard/upsert",
			method: "POST",
			body: { sessionXP: 10 },
			expectedStatus: 401,
		},
		{
			name: "stream route requires auth",
			path: "/api/stream",
			method: "POST",
			body: { lessonId: "es_u1_l1", languageId: "es" },
			expectedStatus: 401,
		},
		{
			name: "agent start requires auth",
			path: "/api/agent/start",
			method: "POST",
			body: { callId: "lesson-es_u1_l1-user", lessonId: "es_u1_l1" },
			expectedStatus: 401,
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
			expectedStatus: 401,
		},
		{
			name: "explain-answer requires auth",
			path: "/api/explain-answer",
			method: "POST",
			body: {
				exerciseType: "mcq",
				question: "Translate hello",
				correctAnswer: "hola",
				isCorrect: false,
				languageId: "es",
			},
			expectedStatus: 401,
		},
		{
			name: "migration route is disabled",
			path: "/api/leaderboard/migrate",
			method: "GET",
			expectedStatus: 404,
		},
	];

	for (const check of checks) {
		const response = await requestWithTimeout(`${baseUrl}${check.path}`, {
			method: check.method,
			headers: check.body ? { "Content-Type": "application/json" } : undefined,
			body: check.body ? JSON.stringify(check.body) : undefined,
		});

		if (response.status !== check.expectedStatus) {
			throw new Error(`${check.name} returned ${response.status}, expected ${check.expectedStatus}`);
		}

		console.log(`PASS ${check.name} -> ${response.status}`);
	}
};

const run = async () => {
	try {
		printEnvStatus();
		console.log(`\nChecking API base: ${baseUrl}\n`);

		requiredEnvKeys.forEach(requireEnv);
		await checkDatabaseUrl();
		await checkSupabaseAdmin();
		await checkProtectedRoutes();

		console.log("\nBackend live checks passed.");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`\nBackend live check failed: ${message}`);
		process.exit(1);
	}
};

run();
