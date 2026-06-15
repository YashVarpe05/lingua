import { StreamClient } from "@stream-io/node-sdk";
import { lessons, vocabulary, phrases } from "../../data/lessons";
import { requireApiAuth } from "../../lib/serverAuth";
import { buildLessonCallId } from "../../lib/streamCall";
import { getLanguageUnitsAndLessons } from "../../utils/learning";

type StreamTranscriptionLanguage =
	| "en"
	| "es"
	| "fr"
	| "ja"
	| "ar"
	| "de"
	| "zh"
	| "it"
	| "pt"
	| "ru"
	| "ko"
	| "nl";

const streamTranscriptionLanguages = new Set<StreamTranscriptionLanguage>([
	"en",
	"es",
	"fr",
	"ja",
	"ar",
	"de",
	"zh",
	"it",
	"pt",
	"ru",
	"ko",
	"nl",
]);

export async function POST(request: Request) {
	try {
		const auth = await requireApiAuth(request);

		if (auth instanceof Response) {
			return auth;
		}

		const body = (await request.json()) as Record<string, unknown>;
		const userName = typeof body.userName === "string" ? body.userName : auth.userId;
		const userImage = typeof body.userImage === "string" ? body.userImage : "";
		const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
		const languageId = typeof body.languageId === "string" ? body.languageId : "es";

		if (!lessonId) {
			return Response.json({ error: "Missing lessonId parameter" }, { status: 400 });
		}
		if (!languageId) {
			return Response.json({ error: "Missing languageId parameter" }, { status: 400 });
		}

		const activeLessons = getLanguageUnitsAndLessons(languageId).lessons;
		const lesson =
			activeLessons.find((item) => item.id === lessonId) ||
			lessons.find((item) => item.id === lessonId);

		if (!lesson) {
			return Response.json({ error: "Invalid lessonId" }, { status: 400 });
		}

		const apiKey = process.env.STREAM_API_KEY;
		const apiSecret = process.env.STREAM_API_SECRET;

		if (!apiKey || !apiSecret) {
			return Response.json(
				{ error: "STREAM_API_KEY or STREAM_API_SECRET is not configured on the server." },
				{ status: 500 }
			);
		}

		const client = new StreamClient(apiKey, apiSecret, { timeout: 10000 });
		const token = client.createToken(auth.userId);

		await client.upsertUsers([
			{
				id: auth.userId,
				name: userName || auth.userId,
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

		const callId = buildLessonCallId(lessonId, auth.userId);
		const call = client.video.call("default", callId);
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
		const transcriptionLanguage = streamTranscriptionLanguages.has(
			languageId as StreamTranscriptionLanguage
		)
			? (languageId as StreamTranscriptionLanguage)
			: "en";

		await call.getOrCreate({
			data: {
				created_by_id: auth.userId,
				members: [
					{ user_id: auth.userId, role: "admin" },
					{ user_id: "teacher", role: "admin" },
				],
				settings_override: {
					transcription: {
						mode: "auto-on",
						closed_caption_mode: "auto-on",
						language: transcriptionLanguage,
					},
				},
				custom: {
					lessonId,
					languageId: languageId || "en",
					lessonTitle: lesson.title || "",
					lessonDescription: lesson.description || "",
					goals: lesson.goals || [],
					aiPrompt: lesson.aiPrompt || "",
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
	} catch (error) {
		console.error("Stream API Route error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
