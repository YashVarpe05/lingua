import * as Speech from "expo-speech";

const SPEECH_LOCALES: Record<string, string> = {
	en: "en-US",
	es: "es-ES",
	fr: "fr-FR",
	ja: "ja-JP",
	de: "de-DE",
	ar: "ar-SA",
};

let speechRequestId = 0;

export const getSpeechLocale = (languageId?: string | null) =>
	SPEECH_LOCALES[languageId ?? ""] ?? "en-US";

export const speakLearningText = (
	text: string,
	languageId?: string | null
) => {
	const trimmedText = text.trim();

	if (!trimmedText) return;

	const requestId = ++speechRequestId;

	void Speech.stop()
		.catch(() => undefined)
		.then(() => {
			if (requestId !== speechRequestId) return;

			Speech.speak(trimmedText, {
				language: getSpeechLocale(languageId),
				rate: 0.85,
				pitch: 1.0,
			});
		});
};
