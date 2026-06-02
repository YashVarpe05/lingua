export async function POST(request: Request) {
	try {
		const { callId } = await request.json();

		if (!callId) {
			return Response.json({ error: "Missing callId parameter" }, { status: 400 });
		}

		// Proxy request to the local Vision Agent FastAPI server
		const response = await fetch(`http://127.0.0.1:8000/calls/${callId}/sessions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				call_type: "default",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Vision Agent server returned error: ${response.status} - ${errorText}`);
		}

		const data = await response.json();
		return Response.json(data);
	} catch (error: any) {
		console.error("Agent start API proxy error:", error);
		return Response.json({ error: error.message || "Failed to start agent session" }, { status: 500 });
	}
}
