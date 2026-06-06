import { requireApiAuth } from "../../../lib/serverAuth";
import { buildLessonCallId, isSafeStreamId } from "../../../lib/streamCall";

const visionAgentBaseUrl = process.env.VISION_AGENT_BASE_URL || "http://127.0.0.1:8000";

const isSafeSessionId = (value: string) => /^[a-zA-Z0-9._:-]{1,128}$/.test(value);

export async function POST(request: Request) {
	try {
		const auth = await requireApiAuth(request);

		if (auth instanceof Response) {
			return auth;
		}

		const body = (await request.json()) as Record<string, unknown>;
		const callId = typeof body.callId === "string" ? body.callId : "";
		const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
		const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

		if (!callId) {
			return Response.json({ error: "Missing callId parameter" }, { status: 400 });
		}
		if (!lessonId) {
			return Response.json({ error: "Missing lessonId parameter" }, { status: 400 });
		}
		if (!sessionId) {
			return Response.json({ error: "Missing sessionId parameter" }, { status: 400 });
		}
		if (!isSafeStreamId(callId)) {
			return Response.json({ error: "Invalid callId" }, { status: 400 });
		}
		if (!isSafeSessionId(sessionId)) {
			return Response.json({ error: "Invalid sessionId" }, { status: 400 });
		}

		const expectedCallId = buildLessonCallId(lessonId, auth.userId);

		if (callId !== expectedCallId) {
			return Response.json({ error: "Call does not belong to this user" }, { status: 403 });
		}

		const response = await fetch(
			`${visionAgentBaseUrl}/calls/${encodeURIComponent(callId)}/sessions/${encodeURIComponent(sessionId)}`,
			{
				method: "DELETE",
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Vision Agent stop error:", response.status, errorText);
			return Response.json({ error: "Failed to stop agent session" }, { status: 502 });
		}

		return Response.json({ success: true });
	} catch (error) {
		console.error("Agent stop API proxy error:", error);
		return Response.json({ error: "Failed to stop agent session" }, { status: 500 });
	}
}
