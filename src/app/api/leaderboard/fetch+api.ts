import { requireApiAuth } from "../../../lib/serverAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

const getCurrentMondayStr = (): string => {
	const now = new Date();
	const day = now.getDay();
	// Calculate days to subtract to get to Monday (if Sunday, day is 0, so subtract 6 days. Otherwise subtract day - 1)
	const diff = now.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(now.setDate(diff));
	return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
};

export async function GET(request: Request) {
	try {
		const auth = await requireApiAuth(request);

		if (auth instanceof Response) {
			return auth;
		}

		const url = new URL(request.url);
		const type = url.searchParams.get("type") || "weekly";

		if (type !== "weekly" && type !== "alltime") {
			return Response.json({ error: "Invalid leaderboard type" }, { status: 400 });
		}

		const isWeekly = type === "weekly";
		const currentMonday = getCurrentMondayStr();

		// Safely initialize Supabase
		let supabaseAdmin;
		try {
			supabaseAdmin = getSupabaseAdmin();
			if (!supabaseAdmin) {
				console.warn("Supabase Admin client not initialized (keys are placeholders or missing).");
				return Response.json({ rows: [], userRow: null });
			}
		} catch (envErr) {
			console.error("Supabase Admin client initialization failed (likely missing env vars):", envErr);
			return Response.json({ rows: [], userRow: null });
		}

		let query = supabaseAdmin
			.from("leaderboard")
			.select("clerk_user_id, display_name, avatar_url, weekly_xp, total_xp, week_start");

		if (isWeekly) {
			// Show users who are active this week (week_start matches current Monday)
			query = query
				.eq("week_start", currentMonday)
				.order("weekly_xp", { ascending: false });
		} else {
			query = query.order("total_xp", { ascending: false });
		}

		const { data, error } = await query.limit(50);

		if (error) {
			console.error("Leaderboard fetch error:", error);
			return Response.json({ rows: [], userRow: null });
		}

		const rows = (data || []).map((item, index) => ({
			rank: index + 1,
			clerkUserId: item.clerk_user_id,
			displayName: item.display_name,
			avatarUrl: item.avatar_url,
			xp: isWeekly ? item.weekly_xp : item.total_xp,
		}));

		let userRow = null;

		try {
			const { data: userRecord, error: userRecErr } = await supabaseAdmin
				.from("leaderboard")
				.select("clerk_user_id, display_name, avatar_url, weekly_xp, total_xp, week_start")
				.eq("clerk_user_id", auth.userId)
				.maybeSingle();

			if (userRecErr) {
				console.error("Leaderboard fetch user record error:", userRecErr);
			} else if (userRecord) {
				const userXp = isWeekly
					? (userRecord.week_start === currentMonday ? userRecord.weekly_xp : 0)
					: userRecord.total_xp;

				// Count how many users have strictly higher XP
				let countQuery = supabaseAdmin
					.from("leaderboard")
					.select("id", { count: "exact", head: true });

				if (isWeekly) {
					countQuery = countQuery
						.eq("week_start", currentMonday)
						.gt("weekly_xp", userXp);
				} else {
					countQuery = countQuery.gt("total_xp", userXp);
				}

				const { count, error: countErr } = await countQuery;
				if (countErr) {
					console.error("Leaderboard count query error:", countErr);
				}
				const userRank = (count || 0) + 1;

				userRow = {
					rank: userRank,
					clerkUserId: userRecord.clerk_user_id,
					displayName: userRecord.display_name,
					avatarUrl: userRecord.avatar_url,
					xp: userXp,
				};
			}
		} catch (userErr) {
			console.error("Failed to query user weekly rank details:", userErr);
		}

		return Response.json({ rows, userRow });
	} catch (error) {
		console.error("Fetch API Route error:", error);
		return Response.json({ rows: [], userRow: null });
	}
}
