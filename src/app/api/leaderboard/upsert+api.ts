import { getSupabaseAdmin } from "../../../config/supabase";

const getCurrentMondayStr = (): string => {
	const now = new Date();
	const day = now.getDay();
	// Calculate days to subtract to get to Monday (if Sunday, day is 0, so subtract 6 days. Otherwise subtract day - 1)
	const diff = now.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(now.setDate(diff));
	return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
};

export async function POST(request: Request) {
	try {
		const { clerkUserId, displayName, avatarUrl, sessionXP } = await request.json();

		if (!clerkUserId) {
			return Response.json({ error: "Missing clerkUserId" }, { status: 400 });
		}
		if (typeof sessionXP !== "number" || sessionXP < 0) {
			return Response.json({ error: "Invalid sessionXP" }, { status: 400 });
		}

		const supabaseAdmin = getSupabaseAdmin();
		if (!supabaseAdmin) {
			console.warn("Supabase Admin client not initialized for upsert (using placeholder keys/env missing)");
			return Response.json({ success: true, message: "Supabase not configured, ignored upsert" });
		}
		const currentMonday = getCurrentMondayStr();

		// Fetch existing row for clerkUserId
		const { data: existing, error: fetchError } = await supabaseAdmin
			.from("leaderboard")
			.select("id, weekly_xp, total_xp, week_start")
			.eq("clerk_user_id", clerkUserId)
			.maybeSingle();

		if (fetchError) {
			console.error("Fetch existing leaderboard row error:", fetchError);
			return Response.json({ error: fetchError.message }, { status: 500 });
		}

		if (existing) {
			let updatedWeeklyXp = existing.weekly_xp;
			let updatedTotalXp = existing.total_xp + sessionXP;
			let updatedWeekStart = existing.week_start;

			if (existing.week_start === currentMonday) {
				updatedWeeklyXp += sessionXP;
			} else {
				// week_start is older than current Monday, reset weekly_xp
				updatedWeeklyXp = sessionXP;
				updatedWeekStart = currentMonday;
			}

			const { error: updateError } = await supabaseAdmin
				.from("leaderboard")
				.update({
					display_name: displayName || "Anonymous",
					avatar_url: avatarUrl,
					weekly_xp: updatedWeeklyXp,
					total_xp: updatedTotalXp,
					week_start: updatedWeekStart,
					updated_at: new Date().toISOString(),
				})
				.eq("clerk_user_id", clerkUserId);

			if (updateError) {
				console.error("Update leaderboard row error:", updateError);
				return Response.json({ error: updateError.message }, { status: 500 });
			}

			return Response.json({ success: true, action: "update" });
		} else {
			// No row exists, insert a new one
			const { error: insertError } = await supabaseAdmin
				.from("leaderboard")
				.insert({
					clerk_user_id: clerkUserId,
					display_name: displayName || "Anonymous",
					avatar_url: avatarUrl,
					weekly_xp: sessionXP,
					total_xp: sessionXP,
					week_start: currentMonday,
					updated_at: new Date().toISOString(),
				});

			if (insertError) {
				console.error("Insert leaderboard row error:", insertError);
				return Response.json({ error: insertError.message }, { status: 500 });
			}

			return Response.json({ success: true, action: "insert" });
		}
	} catch (error: any) {
		console.error("Upsert API Route error:", error);
		return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
	}
}
