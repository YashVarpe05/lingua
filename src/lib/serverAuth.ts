import { verifyToken } from "@clerk/backend";

type ApiAuthResult = {
	userId: string;
};

const jsonError = (error: string, status: number) =>
	Response.json({ error }, { status });

const getBearerToken = (request: Request) => {
	const header = request.headers.get("Authorization") || request.headers.get("authorization");
	const [scheme, token] = header?.split(" ") ?? [];

	if (scheme?.toLowerCase() !== "bearer" || !token) {
		return null;
	}

	return token;
};

const getAuthorizedParties = () =>
	(process.env.CLERK_AUTHORIZED_PARTIES ?? "")
		.split(",")
		.map((party) => party.trim())
		.filter(Boolean);

const getAuthErrorReason = (error: unknown) => {
	if (error && typeof error === "object" && "reason" in error) {
		const reason = (error as { reason?: unknown }).reason;
		if (typeof reason === "string") return reason;
	}

	if (error instanceof Error && error.message.toLowerCase().includes("expired")) {
		return "token-expired";
	}

	return "verification-failed";
};

export const requireApiAuth = async (
	request: Request
): Promise<ApiAuthResult | Response> => {
	const token = getBearerToken(request);

	if (!token) {
		return jsonError("Unauthorized", 401);
	}

	const secretKey = process.env.CLERK_SECRET_KEY;

	if (!secretKey) {
		console.error("CLERK_SECRET_KEY is not configured for API auth.");
		return jsonError("Server auth is not configured", 500);
	}

	try {
		const authorizedParties = getAuthorizedParties();
		const payload = await verifyToken(token, {
			secretKey,
			...(authorizedParties.length > 0 ? { authorizedParties } : {}),
		});

		if (!payload.sub) {
			return jsonError("Unauthorized", 401);
		}

		return { userId: payload.sub };
	} catch (error) {
		console.warn("Clerk token verification failed:", getAuthErrorReason(error));
		return jsonError("Unauthorized", 401);
	}
};
