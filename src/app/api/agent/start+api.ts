import { requireApiAuth } from "../../../lib/serverAuth";
import { buildLessonCallId, isSafeStreamId } from "../../../lib/streamCall";

const visionAgentBaseUrl = process.env.VISION_AGENT_BASE_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
	try {
		const auth = await requireApiAuth(request);

		if (auth instanceof Response) {
			return auth;
		}

		const body = (await request.json()) as Record<string, unknown>;
		const callId = typeof body.callId === "string" ? body.callId : "";
		const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";

		if (!callId) {
			return Response.json({ error: "Missing callId parameter" }, { status: 400 });
		}
		if (!lessonId) {
			return Response.json({ error: "Missing lessonId parameter" }, { status: 400 });
		}
		if (!isSafeStreamId(callId)) {
			return Response.json({ error: "Invalid callId" }, { status: 400 });
		}

		const expectedCallId = buildLessonCallId(lessonId, auth.userId);

		if (callId !== expectedCallId) {
			return Response.json({ error: "Call does not belong to this user" }, { status: 403 });
		}

		const response = await fetch(
			`${visionAgentBaseUrl}/calls/${encodeURIComponent(callId)}/sessions`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					call_type: "default",
				}),
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Vision Agent start error:", response.status, errorText);
			return Response.json({ error: "Failed to start agent session" }, { status: 502 });
		}

		const data = await response.json();
		return Response.json(data);
	} catch (error) {
		console.error("Agent start API proxy error:", error);
		return Response.json({ error: "Failed to start agent session" }, { status: 500 });
	}
}
