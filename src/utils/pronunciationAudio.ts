import { Platform } from "react-native";
import { File } from "expo-file-system";

const dataUrlPrefixPattern = /^data:[^;]+;base64,/;

const blobToBase64 = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();

		reader.onloadend = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			resolve(result.replace(dataUrlPrefixPattern, ""));
		};
		reader.onerror = () => reject(new Error("Could not read audio recording"));
		reader.readAsDataURL(blob);
	});

export const audioUriToBase64 = async (uri: string) => {
	if (Platform.OS === "web") {
		const response = await fetch(uri);
		const blob = await response.blob();
		return blobToBase64(blob);
	}

	return new File(uri).base64();
};

export const getAudioMimeType = (uri: string) => {
	const normalized = uri.toLowerCase();

	if (normalized.includes(".webm")) return "audio/webm";
	if (normalized.includes(".3gp")) return "audio/3gpp";
	if (normalized.includes(".wav")) return "audio/wav";
	if (normalized.includes(".mp3")) return "audio/mpeg";
	if (normalized.includes(".ogg")) return "audio/ogg";
	if (normalized.includes(".m4a")) return "audio/mp4";
	if (normalized.includes(".aac")) return "audio/aac";

	return Platform.OS === "web" ? "audio/webm" : "audio/mp4";
};
