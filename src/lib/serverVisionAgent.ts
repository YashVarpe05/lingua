export const getVisionAgentBaseUrl = () => {
	const configuredUrl = process.env.VISION_AGENT_BASE_URL?.trim();

	if (configuredUrl) {
		return configuredUrl.replace(/\/+$/, "");
	}

	if (process.env.NODE_ENV !== "production") {
		return "http://127.0.0.1:8000";
	}

	return null;
};
