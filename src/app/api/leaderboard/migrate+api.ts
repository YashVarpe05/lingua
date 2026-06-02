import { Client } from "pg";

export async function POST(request: Request) {
	const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
	if (!dbUrl || dbUrl.includes("your-db-password")) {
		return Response.json(
			{ error: "DATABASE_URL or SUPABASE_DB_URL environment variable is missing or using placeholder value on the server." },
			{ status: 400 }
		);
	}

	const client = new Client({
		connectionString: dbUrl,
		ssl: {
			rejectUnauthorized: false,
		},
	});

	try {
		await client.connect();

		// Run SQL migration query
		const query = `
			CREATE TABLE IF NOT EXISTS public.leaderboard (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				clerk_user_id text NOT NULL UNIQUE,
				display_name text NOT NULL,
				avatar_url text,
				weekly_xp integer NOT NULL DEFAULT 0,
				total_xp integer NOT NULL DEFAULT 0,
				week_start date NOT NULL DEFAULT (date_trunc('week', now())::date),
				updated_at timestamptz NOT NULL DEFAULT now()
			);

			CREATE INDEX IF NOT EXISTS leaderboard_weekly_xp_idx ON public.leaderboard (weekly_xp DESC);
			CREATE INDEX IF NOT EXISTS leaderboard_total_xp_idx ON public.leaderboard (total_xp DESC);
		`;

		await client.query(query);

		return Response.json({ success: true, message: "Migration completed successfully: leaderboard table and indexes created." });
	} catch (error: any) {
		console.error("Migration error:", error);
		return Response.json({ error: error.message || "Migration failed" }, { status: 500 });
	} finally {
		await client.end();
	}
}
