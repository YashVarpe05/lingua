import { StreamClient } from "@stream-io/node-sdk";
import { lessons, vocabulary, phrases } from "../../data/lessons";

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

		// Initialize server SDK client with a longer timeout (10 seconds)
		const client = new StreamClient(apiKey, apiSecret, { timeout: 10000 });

		// Generate Stream user token
		const token = client.createToken(userId);

		// Upsert the user metadata and the teacher metadata so they have names and photos in the call
		await client.upsertUsers([
			{
				id: userId,
				name: userName || userId,
				image: userImage || "",
				role: "user",
			},
			{
				id: "teacher",
				name: "AI Teacher",
				image: "",
				role: "admin",
			},
		]);

		// Create a call type "default" with a valid, clean callId
		// Stream callIds must be alphanumeric, underscore, or hyphen, up to 64 chars.
		const cleanLessonId = lessonId.replace(/[^a-zA-Z0-9-_]/g, "");
		const cleanUserId = userId.replace(/[^a-zA-Z0-9-_]/g, "");
		const callId = `lesson-${cleanLessonId}-${cleanUserId}`.slice(0, 64);
		
		const call = client.video.call("default", callId);

		// Find the lesson and pack its details plus relevant vocab and phrases
		const lesson = lessons.find((l) => l.id === lessonId);
		const filteredVocab = vocabulary
			.filter((v) => v.languageId === languageId)
			.map((v) => ({
				word: v.word,
				translation: v.translation,
				pronunciation: v.pronunciation,
			}));
		const filteredPhrases = phrases
			.filter((p) => p.languageId === languageId)
			.map((p) => ({
				phrase: p.phrase,
				translation: p.translation,
				pronunciation: p.pronunciation,
			}));

		// Initialize/get the call on the backend, assigning both the user and the teacher as admin members
		await call.getOrCreate({
			data: {
				created_by_id: userId,
				members: [
					{ user_id: userId, role: "admin" },
					{ user_id: "teacher", role: "admin" },
				],
				settings_override: {
					transcription: {
						mode: "auto-on",
						closed_caption_mode: "auto-on",
						language: languageId || "en",
					},
				},
				custom: {
					lessonId,
					languageId: languageId || "en",
					lessonTitle: lesson?.title || "",
					lessonDescription: lesson?.description || "",
					goals: lesson?.goals || [],
					aiPrompt: lesson?.aiPrompt || "",
					vocabulary: filteredVocab,
					phrases: filteredPhrases,
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
