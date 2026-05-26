import { StreamClient } from "@stream-io/node-sdk";

export async function POST(request: Request) {
	try {
		const { userId, userName, userImage, lessonId, languageId } = await request.json();

		if (!userId) {
			return Response.json({ error: "Missing userId parameter" }, { status: 400 });
		}
		if (!lessonId) {
			return Response.json({ error: "Missing lessonId parameter" }, { status: 400 });
		}

		const apiKey = process.env.STREAM_API_KEY;
		const apiSecret = process.env.STREAM_API_SECRET;

		if (!apiKey || !apiSecret) {
			return Response.json(
				{ error: "STREAM_API_KEY or STREAM_API_SECRET is not configured on the server." },
				{ status: 500 }
			);
		}

		// Initialize server SDK client
		const client = new StreamClient(apiKey, apiSecret);

		// Generate Stream user token
		const token = client.createToken(userId);

		// Upsert the user metadata so they have a name and photo in the call
		await client.upsertUsers([
			{
				id: userId,
				name: userName || userId,
				image: userImage || "",
				role: "user",
			},
		]);

		// Create a call type "default" with a valid, clean callId
		// Stream callIds must be alphanumeric, underscore, or hyphen, up to 64 chars.
		const cleanLessonId = lessonId.replace(/[^a-zA-Z0-9-_]/g, "");
		const cleanUserId = userId.replace(/[^a-zA-Z0-9-_]/g, "");
		const callId = `lesson-${cleanLessonId}-${cleanUserId}`.slice(0, 64);
		
		const call = client.video.call("default", callId);

		// Initialize/get the call on the backend, assigning the user as a member
		await call.getOrCreate({
			data: {
				created_by_id: userId,
				members: [{ user_id: userId, role: "admin" }],
				custom: {
					lessonId,
					languageId: languageId || "en",
				},
			},
		});

		return Response.json({
			apiKey,
			token,
			callId,
		});
	} catch (error: any) {
		console.error("Stream API Route error:", error);
		return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
	}
}
