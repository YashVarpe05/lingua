export async function POST(request: Request) {
	try {
		const { callId, sessionId } = await request.json();

		if (!callId) {
			return Response.json({ error: "Missing callId parameter" }, { status: 400 });
		}
		if (!sessionId) {
			return Response.json({ error: "Missing sessionId parameter" }, { status: 400 });
		}

		// Proxy delete request to the local Vision Agent FastAPI server
		const response = await fetch(`http://127.0.0.1:8000/calls/${callId}/sessions/${sessionId}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Vision Agent server returned error: ${response.status} - ${errorText}`);
		}

		return Response.json({ success: true });
	} catch (error: any) {
		console.error("Agent stop API proxy error:", error);
		return Response.json({ error: error.message || "Failed to stop agent session" }, { status: 500 });
	}
}
