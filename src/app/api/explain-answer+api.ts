import { requireApiAuth } from "../../lib/serverAuth";

type ConceptContext = {
	id: string;
	title: string;
	description?: string;
	examples?: string[];
	reviewPrompt?: string;
};

type ExplainAnswerRequest = {
	exerciseType: string;
	question: string;
	selectedAnswer?: string;
	correctAnswer: string;
	isCorrect: boolean;
	languageId: string;
	difficultyBand?: string;
	concepts?: ConceptContext[];
};

type ExplainAnswerResponse = {
	title: string;
	tip: string;
	example?: string;
	retryPrompt?: string;
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
const REQUEST_TIMEOUT_MS = 8000;
const MAX_FIELD_LENGTH = 240;

const explanationSchema = {
	type: "object",
	properties: {
		title: {
			type: "string",
			description: "A short learner-facing heading.",
		},
		tip: {
			type: "string",
			description: "A concise explanation of the rule or pattern in one or two sentences.",
		},
		example: {
			type: "string",
			description: "An optional mini example that reinforces the pattern.",
		},
		retryPrompt: {
			type: "string",
			description: "An optional memory cue the learner can use next time.",
		},
	},
	required: ["title", "tip"],
	additionalProperties: false,
};

const trimText = (value: unknown, maxLength = MAX_FIELD_LENGTH) => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.replace(/\s+/g, " ").trim();
	if (!trimmed) return undefined;
	return trimmed.slice(0, maxLength);
};

const validateExplanation = (value: unknown): ExplainAnswerResponse | null => {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const title = trimText(record.title, 48);
	const tip = trimText(record.tip, 320);

	if (!title || !tip) return null;

	return {
		title,
		tip,
		example: trimText(record.example, 180),
		retryPrompt: trimText(record.retryPrompt, 140),
	};
};

const validateRequest = (value: unknown): ExplainAnswerRequest | null => {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const exerciseType = trimText(record.exerciseType, 40);
	const question = trimText(record.question, 400);
	const correctAnswer = trimText(record.correctAnswer, 200);
	const languageId = trimText(record.languageId, 20);
	const isCorrect = record.isCorrect;

	if (!exerciseType || !question || !correctAnswer || !languageId || typeof isCorrect !== "boolean") {
		return null;
	}

	const concepts = Array.isArray(record.concepts)
		? record.concepts
				.map((item): ConceptContext | null => {
					if (!item || typeof item !== "object") return null;
					const concept = item as Record<string, unknown>;
					const id = trimText(concept.id, 120);
					const title = trimText(concept.title, 80);

					if (!id || !title) return null;

					return {
						id,
						title,
						description: trimText(concept.description, 220),
						examples: Array.isArray(concept.examples)
							? concept.examples
									.map((example) => trimText(example, 120))
									.filter((example): example is string => Boolean(example))
									.slice(0, 3)
							: undefined,
						reviewPrompt: trimText(concept.reviewPrompt, 180),
					};
				})
				.filter((item): item is ConceptContext => Boolean(item))
				.slice(0, 3)
		: [];

	return {
		exerciseType,
		question,
		selectedAnswer: trimText(record.selectedAnswer, 200),
		correctAnswer,
		isCorrect,
		languageId,
		difficultyBand: trimText(record.difficultyBand, 40),
		concepts,
	};
};

const buildPrompt = (payload: ExplainAnswerRequest) => {
	const concepts = payload.concepts?.length
		? payload.concepts
				.map((concept) => {
					const examples = concept.examples?.length
						? ` Examples: ${concept.examples.join(", ")}.`
						: "";
					const reviewPrompt = concept.reviewPrompt ? ` Review hint: ${concept.reviewPrompt}` : "";
					return `- ${concept.title}: ${concept.description ?? "Beginner language concept."}${examples}${reviewPrompt}`;
				})
				.join("\n")
		: "- General beginner language practice.";

	return [
		"You are a kind beginner language tutor inside a Duolingo-style exercise.",
		"Explain the answer in plain English. Do not shame the learner.",
		"Keep the tip short, specific, and tied to the current exercise.",
		"Do not mention that you are an AI. Do not add markdown.",
		"Return only raw JSON that matches the requested schema.",
		"",
		`Language id: ${payload.languageId}`,
		`Exercise type: ${payload.exerciseType}`,
		`Difficulty band: ${payload.difficultyBand ?? "practice"}`,
		`Question: ${payload.question}`,
		`Learner answer: ${payload.selectedAnswer || "(blank)"}`,
		`Correct answer: ${payload.correctAnswer}`,
		`Was learner correct: ${payload.isCorrect ? "yes" : "no"}`,
		"Concept context:",
		concepts,
		"",
		payload.isCorrect
			? "Create a positive reinforcement tip that explains why the answer works."
			: "Create a corrective tip that explains the pattern behind the correct answer.",
	].join("\n");
};

const extractGeminiText = (data: GeminiResponse) =>
	data.candidates?.[0]?.content?.parts
		?.map((part) => part.text ?? "")
		.join("")
		.trim();

const parseExplanationText = (text: string) => {
	const withoutFence = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

	try {
		return JSON.parse(withoutFence);
	} catch {
		const start = withoutFence.indexOf("{");
		const end = withoutFence.lastIndexOf("}");

		if (start < 0 || end <= start) {
			return null;
		}

		try {
			return JSON.parse(withoutFence.slice(start, end + 1));
		} catch {
			return null;
		}
	}
};

const isAbortError = (error: unknown) =>
	error instanceof Error && error.name === "AbortError";

export async function POST(request: Request) {
	try {
		const auth = await requireApiAuth(request);

		if (auth instanceof Response) {
			return auth;
		}

		let requestBody: unknown;

		try {
			requestBody = await request.json();
		} catch {
			return Response.json({ error: "Malformed JSON request body" }, { status: 400 });
		}

		const payload = validateRequest(requestBody);

		if (!payload) {
			return Response.json({ error: "Invalid explanation request" }, { status: 400 });
		}

		const apiKey = process.env.GEMINI_API_KEY;
		const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

		if (!apiKey) {
			return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 503 });
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		let response: Response;

		try {
			response = await fetch(
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
								parts: [{ text: buildPrompt(payload) }],
							},
						],
						generationConfig: {
							temperature: 0.35,
							maxOutputTokens: 220,
							responseMimeType: "application/json",
							responseJsonSchema: explanationSchema,
						},
					}),
					signal: controller.signal,
				}
			);
		} catch (error) {
			if (isAbortError(error)) {
				return Response.json({ error: "Gemini explanation timed out" }, { status: 504 });
			}
			const message = error instanceof Error ? error.message : "Unknown fetch error";
			console.error("Gemini explain-answer fetch failed:", message);
			return Response.json({ error: "Failed to fetch Gemini explanation" }, { status: 500 });
		} finally {
			clearTimeout(timeout);
		}

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Gemini explain-answer error:", response.status, errorText);
			return Response.json({ error: "Gemini explanation failed" }, { status: 502 });
		}

		const data = (await response.json()) as GeminiResponse;
		const text = extractGeminiText(data);

		if (!text) {
			return Response.json({ error: "Gemini returned no explanation" }, { status: 502 });
		}

		const explanation = validateExplanation(parseExplanationText(text));

		if (!explanation) {
			return Response.json({ error: "Gemini explanation was invalid" }, { status: 502 });
		}

		return Response.json(explanation);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to explain answer";
		console.error("Explain answer API error:", message);
		return Response.json({ error: "Failed to explain answer" }, { status: 500 });
	}
}
