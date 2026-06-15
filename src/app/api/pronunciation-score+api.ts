import { requireApiAuth } from "../../lib/serverAuth";

type PronunciationScoreRequest = {
	expectedText: string;
	languageId: string;
	audioBase64: string;
	mimeType: string;
	pronunciation?: string;
	translation?: string;
};

type PronunciationScoreResponse = {
	score: number;
	accuracy: number;
	fluency: number;
	matchedText?: string;
	tip: string;
	tryAgainPrompt?: string;
};

type GeminiPart = {
	text?: string;
};

type GeminiResponse = {
	candidates?: {
		content?: {
			parts?: GeminiPart[];
		};
	}[];
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 12000;
const MAX_TEXT_LENGTH = 220;
const MAX_AUDIO_BASE64_LENGTH = 3_500_000;
const allowedMimeTypes = new Set([
	"audio/aac",
	"audio/3gpp",
	"audio/m4a",
	"audio/mp4",
	"audio/mpeg",
	"audio/ogg",
	"audio/wav",
	"audio/webm",
]);

const pronunciationSchema = {
	type: "object",
	properties: {
		score: {
			type: "number",
			description: "Overall beginner pronunciation score from 0 to 100.",
		},
		accuracy: {
			type: "number",
			description: "How closely the learner matched the target sounds from 0 to 100.",
		},
		fluency: {
			type: "number",
			description: "How smooth and complete the phrase sounded from 0 to 100.",
		},
		matchedText: {
			type: "string",
			description: "A short transcript or what the learner seemed to say.",
		},
		tip: {
			type: "string",
			description: "One friendly pronunciation tip in plain English.",
		},
		tryAgainPrompt: {
			type: "string",
			description: "Optional short prompt for what to focus on next time.",
		},
	},
	required: ["score", "accuracy", "fluency", "tip"],
	additionalProperties: false,
};

const trimText = (value: unknown, maxLength = MAX_TEXT_LENGTH) => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.replace(/\s+/g, " ").trim();
	if (!trimmed) return undefined;
	return trimmed.slice(0, maxLength);
};

const clampScore = (value: unknown) => {
	if (typeof value !== "number" || Number.isNaN(value)) return null;
	return Math.max(0, Math.min(100, Math.round(value)));
};

const validateRequest = (value: unknown): PronunciationScoreRequest | null => {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const expectedText = trimText(record.expectedText);
	const languageId = trimText(record.languageId, 20);
	const mimeType = trimText(record.mimeType, 40);
	const audioBase64 = typeof record.audioBase64 === "string" ? record.audioBase64.trim() : "";

	if (
		!expectedText ||
		!languageId ||
		!mimeType ||
		!allowedMimeTypes.has(mimeType) ||
		!audioBase64 ||
		audioBase64.length > MAX_AUDIO_BASE64_LENGTH
	) {
		return null;
	}

	return {
		expectedText,
		languageId,
		audioBase64,
		mimeType,
		pronunciation: trimText(record.pronunciation),
		translation: trimText(record.translation),
	};
};

const validatePronunciationScore = (value: unknown): PronunciationScoreResponse | null => {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const score = clampScore(record.score);
	const accuracy = clampScore(record.accuracy);
	const fluency = clampScore(record.fluency);
	const tip = trimText(record.tip, 260);

	if (score === null || accuracy === null || fluency === null || !tip) {
		return null;
	}

	return {
		score,
		accuracy,
		fluency,
		matchedText: trimText(record.matchedText, 120),
		tip,
		tryAgainPrompt: trimText(record.tryAgainPrompt, 140),
	};
};

const buildPrompt = (payload: PronunciationScoreRequest) =>
	[
		"You are a friendly beginner pronunciation coach in a language learning app.",
		"Evaluate the learner's short audio against the expected phrase.",
		"Be practical and encouraging. Do not demand native accent perfection.",
		"If the audio is unclear, too quiet, empty, or not close to the target phrase, give a lower score and a retry tip.",
		"Return only raw JSON matching the schema. Do not add markdown.",
		"",
		`Language id: ${payload.languageId}`,
		`Expected phrase: ${payload.expectedText}`,
		`Pronunciation helper: ${payload.pronunciation ?? "(none)"}`,
		`English meaning: ${payload.translation ?? "(none)"}`,
	].join("\n");

const extractGeminiText = (data: GeminiResponse) =>
	data.candidates?.[0]?.content?.parts
		?.map((part) => part.text ?? "")
		.join("")
		.trim();

const parseGeminiJson = (text: string) => {
	const withoutFence = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

	try {
		return JSON.parse(withoutFence);
	} catch {
		const start = withoutFence.indexOf("{");
		const end = withoutFence.lastIndexOf("}");

		if (start < 0 || end <= start) return null;

		try {
			return JSON.parse(withoutFence.slice(start, end + 1));
		} catch {
			return null;
		}
	}
};

export async function POST(request: Request) {
	try {
		const auth = await requireApiAuth(request);

		if (auth instanceof Response) {
			return auth;
		}

		const payload = validateRequest(await request.json());

		if (!payload) {
			return Response.json({ error: "Invalid pronunciation request" }, { status: 400 });
		}

		const apiKey = process.env.GEMINI_API_KEY;
		const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

		if (!apiKey) {
			return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 503 });
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": apiKey,
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{ text: buildPrompt(payload) },
								{
									inlineData: {
										mimeType: payload.mimeType,
										data: payload.audioBase64,
									},
								},
							],
						},
					],
					generationConfig: {
						temperature: 0.2,
						maxOutputTokens: 180,
						responseMimeType: "application/json",
						responseJsonSchema: pronunciationSchema,
					},
				}),
				signal: controller.signal,
			}
		);

		clearTimeout(timeout);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Gemini pronunciation-score error:", response.status, errorText);
			return Response.json({ error: "Gemini pronunciation scoring failed" }, { status: 502 });
		}

		const data = (await response.json()) as GeminiResponse;
		const text = extractGeminiText(data);

		if (!text) {
			return Response.json({ error: "Gemini returned no pronunciation score" }, { status: 502 });
		}

		const score = validatePronunciationScore(parseGeminiJson(text));

		if (!score) {
			return Response.json({ error: "Gemini pronunciation score was invalid" }, { status: 502 });
		}

		return Response.json(score);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to score pronunciation";
		console.error("Pronunciation score API error:", message);
		return Response.json({ error: "Failed to score pronunciation" }, { status: 500 });
	}
}
