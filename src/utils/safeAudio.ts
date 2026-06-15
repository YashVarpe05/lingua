/**
 * Safe wrapper around expo-audio that provides no-op fallbacks
 * when the native ExpoAudio module is unavailable (e.g. Expo Go).
 *
 * expo-audio requires a development build — importing it in Expo Go
 * crashes at load time. This module attempts the import and falls back
 * to stubs so the rest of the app keeps running.
 */
import { useRef } from "react";

/* ---------- Types (mirrors expo-audio public API surface we use) --------- */

type PermissionResponse = { granted: boolean; canAskAgain: boolean; status: string };

type RecordingOptions = {
	android?: Record<string, unknown>;
	ios?: Record<string, unknown>;
	web?: Record<string, unknown>;
};

type AudioRecorder = {
	prepareToRecordAsync: () => Promise<void>;
	record: () => void;
	stop: () => Promise<void>;
	uri: string | null;
};

type AudioRecorderState = {
	isRecording: boolean;
	url: string | null;
};

/* ---------- Try loading the real module --------------------------------- */

let _expoAudio: typeof import("expo-audio") | null = null;

try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	_expoAudio = require("expo-audio");
} catch {
	// expo-audio native module not available — fall back to stubs below.
	console.warn(
		"[safeAudio] expo-audio native module not found. " +
			"Recording features will be disabled. " +
			"Build a development client to enable audio recording."
	);
}

export const isAudioAvailable = _expoAudio !== null;

/* ---------- Wrapped exports --------------------------------------------- */

export const RecordingPresets: Record<string, RecordingOptions> = _expoAudio
	? (_expoAudio.RecordingPresets as unknown as Record<string, RecordingOptions>)
	: {
			LOW_QUALITY: {},
			HIGH_QUALITY: {},
		};

export async function requestRecordingPermissionsAsync(): Promise<PermissionResponse> {
	if (_expoAudio) {
		return _expoAudio.requestRecordingPermissionsAsync();
	}
	return { granted: false, canAskAgain: false, status: "undetermined" };
}

export async function setAudioModeAsync(
	options: Record<string, unknown>
): Promise<void> {
	if (_expoAudio) {
		return _expoAudio.setAudioModeAsync(options as Parameters<typeof _expoAudio.setAudioModeAsync>[0]);
	}
}

/**
 * Drop-in replacement for `useAudioRecorder` from expo-audio.
 * Returns a stable no-op recorder object when the native module is missing.
 */
export function useAudioRecorder(_preset?: RecordingOptions): AudioRecorder {
	const stubRef = useRef<AudioRecorder>({
		prepareToRecordAsync: async () => {},
		record: () => {},
		stop: async () => {},
		uri: null,
	});

	if (_expoAudio) {
		return _expoAudio.useAudioRecorder(_preset as Parameters<typeof _expoAudio.useAudioRecorder>[0]);
	}

	return stubRef.current;
}

/**
 * Drop-in replacement for `useAudioRecorderState` from expo-audio.
 * Returns a stable idle state when the native module is missing.
 */
export function useAudioRecorderState(
	recorder: AudioRecorder,
	intervalMs?: number
): AudioRecorderState {
	const stubRef = useRef<AudioRecorderState>({ isRecording: false, url: null });

	if (_expoAudio) {
		return _expoAudio.useAudioRecorderState(
			recorder as Parameters<typeof _expoAudio.useAudioRecorderState>[0],
			intervalMs
		);
	}

	return stubRef.current;
}
