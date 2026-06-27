const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const root = path.resolve(__dirname, "..");
const baseUrl = process.env.API_BASE_URL || "http://localhost:8081";
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

const getAuthorizedParties = () =>
	(envValues.CLERK_AUTHORIZED_PARTIES || "")
		.split(",")
		.map((party) => party.trim())
		.filter(Boolean);

const getBaseOrigin = () => {
	try {
		return new URL(baseUrl).origin;
	} catch {
		throw new Error(`API_BASE_URL is not a valid URL: ${baseUrl}`);
	}
};

const isLocalApiBase = () => {
	const hostname = new URL(getBaseOrigin()).hostname;
	return (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "::1" ||
		hostname === "[::1]"
	);
};

const isExplicitFalse = (value) =>
	["0", "false", "no", "off"].includes(String(value || "").trim().toLowerCase());

const readDatabaseCa = () => {
	const caInline = envValues.DATABASE_SSL_CA || "";
	if (caInline) {
		return caInline.replace(/\\n/g, "\n");
	}

	const caPath = envValues.DATABASE_SSL_CA_PATH || envValues.PGSSLROOTCERT || "";
	if (!caPath) return null;

	const resolvedPath = path.isAbsolute(caPath) ? caPath : path.join(root, caPath);
	if (!fs.existsSync(resolvedPath)) {
		throw new Error(`Database SSL CA file does not exist: ${resolvedPath}`);
	}

	return fs.readFileSync(resolvedPath, "utf8");
};

const getDatabaseSsl = () => {
	const ca = readDatabaseCa();
	if (ca) {
		return {
			label: "strict verification with configured CA",
			config: { rejectUnauthorized: true, ca },
		};
	}

	if (isExplicitFalse(envValues.DATABASE_SSL_REJECT_UNAUTHORIZED)) {
		if (!isLocalApiBase()) {
			throw new Error(
				"DATABASE_SSL_REJECT_UNAUTHORIZED=false is only allowed with a local API_BASE_URL. Configure DATABASE_SSL_CA_PATH or DATABASE_SSL_CA for deployed QA."
			);
		}

		return {
			label: "local trust fallback",
			config: { rejectUnauthorized: false },
		};
	}

	return {
		label: "strict verification with system trust store",
		config: { rejectUnauthorized: true },
	};
};

const checkAuthorizedParties = () => {
	const authorizedParties = getAuthorizedParties();
	const baseOrigin = getBaseOrigin();

	if (authorizedParties.length === 0) {
		throw new Error("CLERK_AUTHORIZED_PARTIES must include the API origin.");
	}

	if (!authorizedParties.includes(baseOrigin)) {
		throw new Error(
			`CLERK_AUTHORIZED_PARTIES must include ${baseOrigin} for signed-in API calls.`
		);
	}

	console.log(`PASS Clerk authorized parties include ${baseOrigin}`);
};

const checkSupabaseProjectHost = async () => {
	const supabaseUrl = requireEnv("EXPO_PUBLIC_SUPABASE_URL");
	const hostname = new URL(supabaseUrl).hostname;

	try {
		await dns.lookup(hostname);
	} catch (error) {
		const code = error && typeof error === "object" && "code" in error
			? ` (${error.code})`
			: "";
		throw new Error(
			`EXPO_PUBLIC_SUPABASE_URL host does not resolve${code}: ${hostname}. Check that your Supabase project is active and that the project ref in your environment variables is current.`
		);
	}

	console.log(`PASS Supabase project host resolves: ${hostname}`);
};

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

const getPolicyRoles = (roles) => {
	if (Array.isArray(roles)) return roles;

	return String(roles || "")
		.replace(/[{}"]/g, "")
		.split(",")
		.map((role) => role.trim())
		.filter(Boolean);
};

const isTrueExpression = (value) =>
	String(value || "")
		.replace(/[()]/g, "")
		.trim()
		.toLowerCase() === "true";

const checkLeaderboardSecurity = async (client) => {
	const securityResult = await client.query(`
		select
			c.relrowsecurity as rls_enabled,
			has_table_privilege('anon', 'public.leaderboard', 'select') as anon_select,
			has_table_privilege('anon', 'public.leaderboard', 'insert') as anon_insert,
			has_table_privilege('anon', 'public.leaderboard', 'update') as anon_update,
			has_table_privilege('anon', 'public.leaderboard', 'delete') as anon_delete,
			has_table_privilege('authenticated', 'public.leaderboard', 'select') as authenticated_select,
			has_table_privilege('authenticated', 'public.leaderboard', 'insert') as authenticated_insert,
			has_table_privilege('authenticated', 'public.leaderboard', 'update') as authenticated_update,
			has_table_privilege('authenticated', 'public.leaderboard', 'delete') as authenticated_delete,
			has_table_privilege('service_role', 'public.leaderboard', 'select') as service_role_select,
			has_table_privilege('service_role', 'public.leaderboard', 'insert') as service_role_insert,
			has_table_privilege('service_role', 'public.leaderboard', 'update') as service_role_update,
			has_table_privilege('service_role', 'public.leaderboard', 'delete') as service_role_delete
		from pg_class c
		join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public'
			and c.relname = 'leaderboard'
			and c.relkind = 'r'
	`);
	const security = securityResult.rows[0];

	if (!security?.rls_enabled) {
		throw new Error("public.leaderboard must have row level security enabled");
	}

	for (const role of ["anon", "authenticated"]) {
		for (const privilege of ["select", "insert", "update", "delete"]) {
			if (security[`${role}_${privilege}`]) {
				throw new Error(`${role} still has ${privilege.toUpperCase()} on public.leaderboard`);
			}
		}
	}

	for (const privilege of ["select", "insert", "update", "delete"]) {
		if (!security[`service_role_${privilege}`]) {
			throw new Error(`service_role is missing ${privilege.toUpperCase()} on public.leaderboard`);
		}
	}

	const policyResult = await client.query(`
		select policyname, cmd, roles, qual, with_check
		from pg_policies
		where schemaname = 'public'
			and tablename = 'leaderboard'
	`);
	const policies = policyResult.rows;
	const clientPolicy = policies.find((item) =>
		getPolicyRoles(item.roles).some((role) => ["anon", "authenticated", "public"].includes(role))
	);

	if (clientPolicy) {
		throw new Error(`leaderboard should not have a direct client RLS policy: ${clientPolicy.policyname}`);
	}

	const expectedPolicies = [
		{
			name: "Service role can read leaderboard",
			cmd: "SELECT",
			qual: true,
			withCheck: false,
		},
		{
			name: "Service role can add leaderboard rows",
			cmd: "INSERT",
			qual: false,
			withCheck: true,
		},
		{
			name: "Service role can update leaderboard rows",
			cmd: "UPDATE",
			qual: true,
			withCheck: true,
		},
		{
			name: "Service role can delete leaderboard rows",
			cmd: "DELETE",
			qual: true,
			withCheck: false,
		},
	];

	for (const expected of expectedPolicies) {
		const policy = policies.find((item) => {
			const roles = getPolicyRoles(item.roles);
			return item.policyname === expected.name && item.cmd === expected.cmd && roles.includes("service_role");
		});

		if (!policy) {
			throw new Error(`missing leaderboard RLS policy: ${expected.name}`);
		}

		if (expected.qual && !isTrueExpression(policy.qual)) {
			throw new Error(`leaderboard RLS policy ${expected.name} must use true`);
		}

		if (expected.withCheck && !isTrueExpression(policy.with_check)) {
			throw new Error(`leaderboard RLS policy ${expected.name} must check true`);
		}
	}

	const functionResult = await client.query(`
		select
			count(distinct p.oid)::int as function_count,
			coalesce(bool_or(acl.grantee = 0 and acl.privilege_type = 'EXECUTE'), false) as public_execute,
			coalesce(bool_or(r.rolname = 'anon' and acl.privilege_type = 'EXECUTE'), false) as anon_execute,
			coalesce(bool_or(r.rolname = 'authenticated' and acl.privilege_type = 'EXECUTE'), false) as authenticated_execute
		from pg_proc p
		join pg_namespace n on n.oid = p.pronamespace
		left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl on true
		left join pg_roles r on r.oid = acl.grantee
		where n.nspname = 'public'
			and p.proname = 'rls_auto_enable'
			and p.pronargs = 0
	`);
	const functionAccess = functionResult.rows[0];

	if (
		functionAccess.public_execute ||
		functionAccess.anon_execute ||
		functionAccess.authenticated_execute
	) {
		throw new Error("public.rls_auto_enable() is executable by PUBLIC, anon, or authenticated");
	}

	console.log(
		`PASS leaderboard RLS policies and rls_auto_enable execute grants are hardened${
			functionAccess.function_count > 0 ? "" : " (function absent)"
		}`
	);
};

const checkDatabaseUrl = async () => {
	const databaseUrl = requireEnv("DATABASE_URL");
	const parsed = new URL(databaseUrl);

	if (!parsed.host.includes("pooler.supabase.com")) {
		throw new Error("DATABASE_URL should use the Supabase pooler host for local IPv4 compatibility");
	}

	const ssl = getDatabaseSsl();
	const client = new Client({
		connectionString: databaseUrl,
		ssl: ssl.config,
		connectionTimeoutMillis: 10000,
	});

	try {
		await client.connect();
		const result = await client.query("select to_regclass('public.leaderboard') as table_name");
		if (!result.rows[0]?.table_name) {
			throw new Error("public.leaderboard table is missing");
		}

		await checkLeaderboardSecurity(client);

		console.log(`PASS DATABASE_URL connects and leaderboard exists (${ssl.label})`);
	} finally {
		await client.end().catch(() => {});
	}
};

const checkSupabaseAdmin = async () => {
	const supabaseUrl = requireEnv("EXPO_PUBLIC_SUPABASE_URL");
	const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
	const anonKey = requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
	const qaId = `qa_backend_${Date.now()}`;
	const blockedPublicId = `${qaId}_public`;
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

	try {
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

		const publicWrite = await publicClient
			.from("leaderboard")
			.insert({
				clerk_user_id: blockedPublicId,
				display_name: "Blocked Public QA",
				weekly_xp: 1,
				total_xp: 1,
			});

		if (!publicWrite.error) {
			await admin.from("leaderboard").delete().eq("clerk_user_id", blockedPublicId);
			throw new Error("publishable key can write leaderboard directly; expected RLS/grants to block it");
		}
	} finally {
		const cleanup = await admin.from("leaderboard").delete().eq("clerk_user_id", qaId);
		if (cleanup.error) throw new Error(`service-role cleanup failed: ${cleanup.error.message}`);
	}

	console.log("PASS Supabase service role writes and publishable key direct access is blocked");
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
			name: "pronunciation-score requires auth",
			path: "/api/pronunciation-score",
			method: "POST",
			body: {
				expectedText: "hola",
				languageId: "es",
				audioBase64: "AAAA",
				mimeType: "audio/webm",
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
		checkAuthorizedParties();
		await checkSupabaseProjectHost();
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
