type ApiGetToken = () => Promise<string | null>;

const AUTH_TOKEN_TIMEOUT_MS = 8000;
const API_REQUEST_TIMEOUT_MS = 15000;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") || "";

export class ApiAuthError extends Error {
	status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = "ApiAuthError";
		this.status = status;
	}
}

const withTimeout = async <T,>(
	promise: Promise<T>,
	timeoutMs: number,
	message: string
) => {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => reject(new ApiAuthError(message)), timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const resolveApiUrl = (input: string) => {
	if (!apiBaseUrl || isAbsoluteUrl(input) || !input.startsWith("/")) {
		return input;
	}

	return `${apiBaseUrl}${input}`;
};

export const authFetch = async (
	getToken: ApiGetToken,
	input: string,
	init: RequestInit = {}
) => {
	let token: string | null;

	try {
		token = await withTimeout(
			getToken(),
			AUTH_TOKEN_TIMEOUT_MS,
			"Your sign-in session took too long to load. Please try again."
		);
	} catch (error) {
		if (error instanceof ApiAuthError) {
			throw error;
		}
		throw new ApiAuthError("Could not read your sign-in session. Please sign in again.");
	}

	if (!token) {
		throw new ApiAuthError("Your sign-in session is missing. Please sign in again.");
	}

	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${token}`);

	const controller = !init.signal ? new AbortController() : null;
	const timeout = controller
		? setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)
		: undefined;

	let response: Response;

	try {
		response = await fetch(resolveApiUrl(input), {
			...init,
			headers,
			...(controller ? { signal: controller.signal } : {}),
		});
	} catch {
		throw new Error("Network request failed. Please check your connection and try again.");
	} finally {
		if (timeout) clearTimeout(timeout);
	}

	if (response.status === 401) {
		throw new ApiAuthError("Your session expired. Please sign in again.", 401);
	}

	return response;
};
