import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	Modal,
	Platform,
	ActivityIndicator,
	GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { Text, View, TouchableOpacity, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { authFetch } from "@/lib/apiClient";
import { usePostHog } from "posthog-react-native";
import { useAuth, useUser } from "@clerk/expo";
import type { Lesson } from "@/types/learning";
import type {
	Call,
	StreamVideoClient as StreamVideoClientInstance,
	StreamVideoParticipant,
} from "@stream-io/video-client";
import type { StreamVideoProps } from "@stream-io/video-react-bindings";

type ClerkUser = ReturnType<typeof useUser>["user"];
type StreamCallComponent = React.ComponentType<
	React.PropsWithChildren<{ call: Call }>
>;
type StreamVideoComponent = React.ComponentType<
	React.PropsWithChildren<StreamVideoProps>
>;
type StreamVideoClientConstructor =
	typeof import("@stream-io/video-client").StreamVideoClient;
type UseCallStateHooks =
	typeof import("@stream-io/video-react-bindings").useCallStateHooks;
type CallingStateObject = typeof import("@stream-io/video-client").CallingState;

// Dynamically require Stream Video SDK to prevent crash in Expo Go / Web
let StreamCall: StreamCallComponent | null = null;
let StreamVideo: StreamVideoComponent | null = null;
let StreamVideoClient: StreamVideoClientConstructor | null = null;
let useCallStateHooks: UseCallStateHooks | null = null;
let CallingStateEnum: CallingStateObject | null = null;
let hasNativeSDK = false;

/* eslint-disable @typescript-eslint/no-require-imports */
try {
	const sdk = require("@stream-io/video-react-native-sdk");
	StreamCall = sdk.StreamCall;
	StreamVideo = sdk.StreamVideo;
	StreamVideoClient = sdk.StreamVideoClient;
	useCallStateHooks = sdk.useCallStateHooks;
	CallingStateEnum = sdk.CallingState;
	hasNativeSDK = true;
} catch {
	console.log("Stream Video SDK native modules not found. Falling back to simulated calling.");
}

// Fallback values for CallingState if native SDK is not loaded
const LocalCallingState = {
	UNKNOWN: "unknown",
	IDLE: "idle",
	RINGING: "ringing",
	JOINING: "joining",
	JOINED: "joined",
	RECONNECTING: "reconnecting",
	RECONNECTING_FAILED: "reconnectingFailed",
	LEFT: "left",
};

const CallingState = CallingStateEnum || LocalCallingState;
type CallingStateValue =
	| (typeof LocalCallingState)[keyof typeof LocalCallingState]
	| "connecting";

// Localized phrases for lesson info overlay
const getLocalizedPhrases = (langId: string): string[] => {
	switch (langId) {
		case "es":
			return [
				"¡Hola Carlos, mucho gusto!",
				"Un café con leche, por favor.",
				"La cuenta, por favor."
			];
		case "fr":
			return [
				"Bonjour Pierre, enchanté !",
				"Un croissant, s'il vous plaît.",
				"Où sont les toilettes ?"
			];
		case "ja":
			return [
				"はじめまして、よろしくおねがいします。",
				"これをください。",
				"ありがとう。"
			];
		case "nl":
			return [
				"Hallo, aangenaam kennis te maken!",
				"Een koffie met melk, alstublieft.",
				"De rekening, alstublieft."
			];
		default:
			return [
				"Hello, pleasure to meet you!",
				"A cup of coffee, please.",
				"Check, please."
			];
	}
};



export default function AudioLessonScreen() {
	const router = useRouter();
	const posthog = usePostHog();
	const { getToken } = useAuth();
	const { user } = useUser();
	const { id } = useLocalSearchParams<{ id: string }>();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completeLesson = useProgressStore((state) => state.completeLesson);

	// Get active lessons for selected language
	const { lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguageId || "es");
	const lesson = activeLessons.find((l) => l.id === id);

	// Fallback UI / Mock States (used when hasNativeSDK is false)
	const [callingStateMock, setCallingStateMock] = useState<CallingStateValue>("connecting");
	const [isMutedMock, setIsMutedMock] = useState(false);

	// Shared States
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isCameraActive, setIsCameraActive] = useState(true);
	const [subtitlesVisible, setSubtitlesVisible] = useState(true);
	const [isInfoVisible, setIsInfoVisible] = useState(false);
	const [isEndCallModalVisible, setIsEndCallModalVisible] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// States for Live AI grading/feedback panel
	const [speakingRating, setSpeakingRating] = useState("Listening...");
	const [pronunciationRating, setPronunciationRating] = useState("Listening...");
	const [grammarRating, setGrammarRating] = useState("Listening...");

	// Stream client & call instances
	const [client, setClient] = useState<StreamVideoClientInstance | null>(null);
	const [call, setCall] = useState<Call | null>(null);
	const [initError, setInitError] = useState<string | null>(null);

	// Simulates live AI evaluation updates
	useEffect(() => {
		const feedbackTimeout = setTimeout(() => {
			setSpeakingRating("Excellent");
			setPronunciationRating("Great");
			setGrammarRating("Good");
		}, 5000);
		return () => clearTimeout(feedbackTimeout);
	}, []);

	// Simulates call connection on Web/Expo Go fallback
	useEffect(() => {
		if (hasNativeSDK) return;
		const connectTimeout = setTimeout(() => {
			setCallingStateMock("joined");
		}, 1500);
		return () => clearTimeout(connectTimeout);
	}, []);

	// Simulates agent status on Web/Expo Go fallback
	const [agentStatusMock, setAgentStatusMock] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
	useEffect(() => {
		if (hasNativeSDK) return;
		if (callingStateMock !== "joined") {
			setAgentStatusMock("idle");
			return;
		}

		setAgentStatusMock("connecting");
		const agentTimeout = setTimeout(() => {
			setAgentStatusMock("connected");
		}, 3000);
		return () => clearTimeout(agentTimeout);
	}, [callingStateMock]);

	// Simulates agent closed captions on Web/Expo Go fallback
	const [mockCaptions, setMockCaptions] = useState<{ speakerName: string; text: string } | null>(null);
	useEffect(() => {
		if (hasNativeSDK) return;
		if (callingStateMock !== "joined") {
			setMockCaptions(null);
			return;
		}

		const timers: ReturnType<typeof setTimeout>[] = [];

		// 1. Teacher starts lesson
		timers.push(setTimeout(() => {
			setMockCaptions({
				speakerName: "AI Teacher",
				text: selectedLanguageId === "fr" 
					? "Bonjour! Welcome to your French lesson today." 
					: selectedLanguageId === "ja"
					? "Konnichiwa! Welcome to your Japanese lesson today."
					: "¡Hola! Welcome to your Spanish lesson today."
			});
		}, 5000));

		// 2. User replies
		timers.push(setTimeout(() => {
			setMockCaptions({
				speakerName: "You",
				text: selectedLanguageId === "fr"
					? "Bonjour Pierre! Let's start."
					: selectedLanguageId === "ja"
					? "Konnichiwa Kenji! Let's start."
					: "¡Hola Maria! Let's start."
			});
		}, 10000));

		// 3. Teacher gives instruction
		timers.push(setTimeout(() => {
			setMockCaptions({
				speakerName: "AI Teacher",
				text: selectedLanguageId === "fr"
					? "Excellent. Let's practice introductions. Repeat after me: Je m'appelle."
					: selectedLanguageId === "ja"
					? "Excellent. Let's practice introductions. Repeat after me: Yoroshiku."
					: "Excellent. Let's practice introductions. Repeat after me: Me llamo."
			});
		}, 15000));

		return () => {
			timers.forEach(clearTimeout);
		};
	}, [callingStateMock, selectedLanguageId]);

	// Ticking call duration timer (for mock fallback only; active version handles this inside AudioLessonContent)
	useEffect(() => {
		if (hasNativeSDK) return;
		if (callingStateMock !== "joined") return;
		const interval = setInterval(() => {
			setElapsedSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [callingStateMock]);

	// Stream Video Client Connection Effect
	useEffect(() => {
		if (!hasNativeSDK) return;

		let active = true;
		let clientInstance: StreamVideoClientInstance | null = null;
		let callInstance: Call | null = null;

		async function initCall() {
			try {
				if (!user || !lesson) return;

				// Fetch client token and call config from backend route
				const response = await authFetch(getToken, "/api/stream", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userName: user.fullName || user.username || user.id,
						userImage: user.imageUrl || "",
						lessonId: lesson.id,
						languageId: selectedLanguageId || "es",
					}),
				});

				if (!response.ok) {
					throw new Error(`Failed to initialize Stream token: ${response.statusText}`);
				}

				const data = await response.json();
				if (data.error) {
					throw new Error(data.error);
				}

				if (!active) return;

				const streamUser = {
					id: user.id,
					name: user.fullName || user.username || user.id,
					image: user.imageUrl || "",
				};

				// Setup video client locally
				if (!StreamVideoClient) {
					throw new Error("Stream Video SDK client is unavailable");
				}

				clientInstance = new StreamVideoClient({
					apiKey: data.apiKey,
					user: streamUser,
					token: data.token,
				});

				// Create call instance locally
				callInstance = clientInstance.call("default", data.callId);

				// Connect user and join call
				await callInstance.join({ create: true });

				// Ensure audio is enabled and microphone is active by default
				await callInstance.microphone.enable();

				try {
					await callInstance.startClosedCaptions();
				} catch (err) {
					console.log("Error starting closed captions:", err);
				}

				if (active) {
					setClient(clientInstance);
					setCall(callInstance);
				}
			} catch (err: unknown) {
				console.error("Stream init error:", err);
				if (active) {
					setInitError(
						err instanceof Error
							? err.message
							: "Failed to establish AI calling connection"
					);
				}
			}
		}

		initCall();

		return () => {
			active = false;
			// Clean up asynchronously with 50ms delay
			setTimeout(() => {
				if (callInstance) {
					callInstance.leave().catch((e: unknown) => console.log("Error leaving call:", e));
				}
				if (clientInstance) {
					clientInstance.disconnectUser().catch((e: unknown) => console.log("Error disconnecting user:", e));
				}
			}, 50);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [getToken, user?.id, id, selectedLanguageId, lesson?.id]);

	if (!lesson) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 items-center justify-center p-6 bg-white">
					<Text className="font-poppins-bold text-[18px] text-neutral-primary mb-2">
						Lesson not found
					</Text>
					<TouchableOpacity
						onPress={() => {
							if (router.canGoBack()) {
								router.back();
							} else {
								router.replace("/(tabs)");
							}
						}}
						className="bg-lingua-purple px-6 py-2.5 rounded-full"
					>
						<Text className="font-poppins-semibold text-white">Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Completion handler
	const handleFinishCall = async () => {
		setIsSubmitting(true);
		try {
			if (call) {
				await call.leave();
			}
			await completeLesson(lesson.id, lesson.xpReward);
			posthog.capture("lesson_completed", {
				lesson_id: lesson.id,
				lesson_title: lesson.title,
				lesson_type: lesson.type,
				language_id: selectedLanguageId,
				xp_earned: lesson.xpReward,
				method: hasNativeSDK ? "audio_session" : "audio_session_fallback",
			});
			setIsEndCallModalVisible(false);
			if (router.canGoBack()) {
				router.back();
			} else {
				router.replace("/(tabs)");
			}
		} catch (err) {
			posthog.captureException(err, { flow: "audio_lesson", step: "finish_call" });
			console.error("Failed to complete audio session:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (initError) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 items-center justify-center p-6 bg-white">
					<Feather name="alert-triangle" size={48} color="#FF4B4B" className="mb-4" />
					<Text className="font-poppins-bold text-[18px] text-neutral-primary mb-2 text-center">
						Calling connection failed
					</Text>
					<Text className="font-poppins text-[14px] text-neutral-secondary mb-6 text-center max-w-[280px]">
						{initError}
					</Text>
					<TouchableOpacity
						onPress={() => {
							if (router.canGoBack()) {
								router.back();
							} else {
								router.replace("/(tabs)");
							}
						}}
						className="bg-lingua-purple px-6 py-2.5 rounded-full"
					>
						<Text className="font-poppins-semibold text-white">Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// If native SDK is supported but client/call is not ready yet, render loading spinner
	if (hasNativeSDK && (!client || !call)) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 bg-[#F6F7FB] items-center justify-center w-full">
					<View className="flex-1 w-full max-w-[480px] p-4 justify-center items-center relative">
						<Image
							source={{ uri: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80" }}
							className="absolute w-full h-full opacity-60"
							contentFit="cover"
							blurRadius={5}
						/>
						<Image
							source={images.mascotWelcome}
							className="w-[260px] h-[260px] mb-8"
							contentFit="contain"
						/>
						<ActivityIndicator size="large" color="#6C4EF5" />
						<Text className="font-poppins-bold text-[16px] text-neutral-primary mt-4">
							Connecting to AI Teacher...
						</Text>
						<Text className="font-poppins text-[13px] text-neutral-secondary mt-1">
							Preparing your audio session
						</Text>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	// Render Mock Version directly if native SDK is absent (e.g. running in Expo Go)
	if (!hasNativeSDK) {
		return (
			<AudioLessonContent
				lesson={lesson}
				selectedLanguageId={selectedLanguageId}
				elapsedSeconds={elapsedSeconds}
				setElapsedSeconds={setElapsedSeconds}
				isCameraActive={isCameraActive}
				setIsCameraActive={setIsCameraActive}
				subtitlesVisible={subtitlesVisible}
				setSubtitlesVisible={setSubtitlesVisible}
				isInfoVisible={isInfoVisible}
				setIsInfoVisible={setIsInfoVisible}
				isEndCallModalVisible={isEndCallModalVisible}
				setIsEndCallModalVisible={setIsEndCallModalVisible}
				isSubmitting={isSubmitting}
				handleFinishCall={handleFinishCall}
				speakingRating={speakingRating}
				pronunciationRating={pronunciationRating}
				grammarRating={grammarRating}
				user={user}
				isMute={isMutedMock}
				toggleMute={() => setIsMutedMock(!isMutedMock)}
				callingState={callingStateMock}
				agentStatus={agentStatusMock}
				captions={mockCaptions}
			/>
		);
	}

	const ActiveStreamVideo = StreamVideo;
	const ActiveStreamCall = StreamCall;
	if (!ActiveStreamVideo || !ActiveStreamCall || !client || !call) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 items-center justify-center p-6 bg-white">
					<Text className="font-poppins-bold text-[18px] text-neutral-primary mb-2 text-center">
						Calling SDK is unavailable
					</Text>
					<TouchableOpacity
						onPress={() => router.replace("/(tabs)")}
						className="bg-lingua-purple px-6 py-2.5 rounded-full"
					>
						<Text className="font-poppins-semibold text-white">Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Render real SDK connection
	return (
		<ActiveStreamVideo client={client}>
			<ActiveStreamCall call={call}>
				<AudioLessonContentWrapper
					call={call}
					lesson={lesson}
					selectedLanguageId={selectedLanguageId}
					elapsedSeconds={elapsedSeconds}
					setElapsedSeconds={setElapsedSeconds}
					isCameraActive={isCameraActive}
					setIsCameraActive={setIsCameraActive}
					subtitlesVisible={subtitlesVisible}
					setSubtitlesVisible={setSubtitlesVisible}
					isInfoVisible={isInfoVisible}
					setIsInfoVisible={setIsInfoVisible}
					isEndCallModalVisible={isEndCallModalVisible}
					setIsEndCallModalVisible={setIsEndCallModalVisible}
					isSubmitting={isSubmitting}
					handleFinishCall={handleFinishCall}
					speakingRating={speakingRating}
					pronunciationRating={pronunciationRating}
					grammarRating={grammarRating}
					user={user}
				/>
			</ActiveStreamCall>
		</ActiveStreamVideo>
	);
}

// Wrapper for AudioLessonContent when using active Stream SDK Call Context
function AudioLessonContentWrapper(
	props: Omit<
		AudioLessonContentProps,
		"isMute" | "toggleMute" | "callingState" | "useActiveTimer" | "agentStatus" | "captions"
	> & { call: Call }
) {
	const { getToken } = useAuth();
	const {
		useCallCallingState,
		useMicrophoneState,
		useParticipants,
		useCallClosedCaptions,
	} = useCallStateHooks!();
	const callingState = useCallCallingState();
	const { microphone, isMute } = useMicrophoneState();
	const participants = useParticipants();
	const closedCaptions = useCallClosedCaptions();
	const call = props.call;
	const lessonId = props.lesson?.id;

	const [agentStatus, setAgentStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
	const [activeCaption, setActiveCaption] = useState<{ speakerName: string; text: string } | null>(null);

	const isTeacherJoined = participants.some((p: StreamVideoParticipant) => p.userId === "teacher");

	const latestCaption = closedCaptions && closedCaptions.length > 0 ? closedCaptions[closedCaptions.length - 1] : null;

	useEffect(() => {
		if (latestCaption && latestCaption.text) {
			const speakerName = latestCaption.user?.id === "teacher" ? "AI Teacher" : "You";
			const text = latestCaption.text;
			setActiveCaption((prev) => {
				if (prev && prev.speakerName === speakerName && prev.text === text) {
					return prev;
				}
				return { speakerName, text };
			});
		} else {
			setActiveCaption((prev) => {
				if (prev === null) return null;
				return null;
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [latestCaption?.text, latestCaption?.user?.id]);

	useEffect(() => {
		if (callingState !== CallingState.JOINED) {
			if (agentStatus !== "idle") {
				setAgentStatus("idle");
			}
			return;
		}

		let active = true;
		let spawnedSessionId: string | null = null;
		let stopRequested = false;

		const stopAgentSession = (sessionId: string) => {
			void authFetch(getToken, "/api/agent/stop", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					callId: call.id,
					lessonId,
					sessionId,
				}),
			}).catch((err) => {
				console.warn("Failed to stop agent session on unmount:", err);
			});
		};

		async function startAgent() {
			try {
				if (!lessonId) {
					throw new Error("Missing lesson id for agent session");
				}
				if (agentStatus !== "connecting") {
					setAgentStatus("connecting");
				}
				const response = await authFetch(getToken, "/api/agent/start", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						callId: call.id,
						lessonId,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to start agent via proxy");
				}

				const data = (await response.json()) as { session_id?: unknown };
				if (typeof data.session_id === "string") {
					spawnedSessionId = data.session_id;
					if (stopRequested) {
						stopAgentSession(spawnedSessionId);
					}
				} else {
					throw new Error("No session_id returned from agent start");
				}
			} catch (err) {
				console.error("Error starting agent session:", err);
				if (active) {
					setAgentStatus("failed");
				}
			}
		}

		startAgent();

		return () => {
			active = false;
			stopRequested = true;
			if (spawnedSessionId) {
				stopAgentSession(spawnedSessionId);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [callingState, call.id, getToken, lessonId]);

	useEffect(() => {
		if (callingState !== CallingState.JOINED) {
			return;
		}

		if (isTeacherJoined) {
			if (agentStatus !== "connected") {
				setAgentStatus("connected");
			}
		} else if (agentStatus !== "failed" && agentStatus !== "connecting") {
			setAgentStatus("connecting");
		}
	}, [callingState, isTeacherJoined, agentStatus]);

	return (
		<AudioLessonContent
			{...props}
			isMute={isMute}
			toggleMute={() => microphone.toggle()}
			callingState={callingState}
			useActiveTimer={true}
			agentStatus={agentStatus}
			captions={activeCaption}
		/>
	);
}

interface AudioLessonContentProps {
	lesson: Lesson;
	selectedLanguageId: string | null;
	elapsedSeconds: number;
	setElapsedSeconds: React.Dispatch<React.SetStateAction<number>>;
	isCameraActive: boolean;
	setIsCameraActive: (active: boolean) => void;
	subtitlesVisible: boolean;
	setSubtitlesVisible: (visible: boolean) => void;
	isInfoVisible: boolean;
	setIsInfoVisible: (visible: boolean) => void;
	isEndCallModalVisible: boolean;
	setIsEndCallModalVisible: (visible: boolean) => void;
	isSubmitting: boolean;
	handleFinishCall: () => Promise<void>;
	speakingRating: string;
	pronunciationRating: string;
	grammarRating: string;
	user: ClerkUser;
	isMute: boolean;
	toggleMute: () => void;
	callingState: CallingStateValue;
	useActiveTimer?: boolean;
	agentStatus: "idle" | "connecting" | "connected" | "failed";
	captions: { speakerName: string; text: string } | null;
}

function AudioLessonContent({
	lesson,
	selectedLanguageId,
	elapsedSeconds,
	setElapsedSeconds,
	isCameraActive,
	setIsCameraActive,
	subtitlesVisible,
	setSubtitlesVisible,
	isInfoVisible,
	setIsInfoVisible,
	isEndCallModalVisible,
	setIsEndCallModalVisible,
	isSubmitting,
	handleFinishCall,
	speakingRating,
	pronunciationRating,
	grammarRating,
	user,
	isMute,
	toggleMute,
	callingState,
	useActiveTimer = false,
	agentStatus,
	captions,
}: AudioLessonContentProps) {
	// Ticking call duration timer (only when the call has successfully joined and we useActiveTimer is true)
	useEffect(() => {
		if (!useActiveTimer) return;
		if (callingState !== CallingState.JOINED) return;
		const interval = setInterval(() => {
			setElapsedSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [callingState, setElapsedSeconds, useActiveTimer]);

	// Maps active calling state to top status line
	const getCallStatusProps = () => {
		if (callingState !== CallingState.JOINED) {
			// User is connecting/joining the call
			switch (callingState) {
				case CallingState.JOINING:
				case CallingState.RINGING:
					return {
						text: "Joining Room...",
						color: "#FFB020",
						dotClass: "bg-[#FFB020] animate-pulse",
					};
				case CallingState.RECONNECTING:
					return {
						text: "Reconnecting...",
						color: "#FFB020",
						dotClass: "bg-[#FFB020]",
					};
				case CallingState.RECONNECTING_FAILED:
					return {
						text: "Connection Failed",
						color: "#FF4B4B",
						dotClass: "bg-[#FF4B4B]",
					};
				case CallingState.LEFT:
					return {
						text: "Offline",
						color: "#6B7280",
						dotClass: "bg-[#6B7280]",
					};
				default:
					return {
						text: "Connecting...",
						color: "#FFB020",
						dotClass: "bg-[#FFB020]",
					};
			}
		}

		// User is joined. Now show the AI Teacher Agent connection status
		switch (agentStatus) {
			case "idle":
				return {
					text: "Teacher: Idle",
					color: "#9CA3AF",
					dotClass: "bg-[#9CA3AF]",
				};
			case "connecting":
				return {
					text: "Teacher: Connecting...",
					color: "#FFB020",
					dotClass: "bg-[#FFB020] animate-pulse",
				};
			case "connected":
				if (isMute) {
					return {
						text: "Teacher: Connected (Muted)",
						color: "#FF8A00",
						dotClass: "bg-[#FF8A00]",
					};
				}
				return {
					text: "Teacher: Connected",
					color: "#21C16B",
					dotClass: "bg-[#21C16B]",
				};
			case "failed":
				return {
					text: "Teacher: Connection Failed",
					color: "#FF4B4B",
					dotClass: "bg-[#FF4B4B]",
				};
			default:
				return {
					text: "Teacher: Connecting...",
					color: "#FFB020",
					dotClass: "bg-[#FFB020]",
				};
		}
	};

	const statusProps = getCallStatusProps();

	return (
		<SafeAreaView style={styles.safeArea}>
			{/* Top Header Row */}
			<View className="w-full bg-white border-b border-neutral-border">
				<View className="flex-row items-center justify-between px-5 pt-3 pb-3 max-w-[480px] w-full mx-auto">
					<View className="flex-row items-center flex-1 mr-4">
						<TouchableOpacity
							onPress={() => setIsEndCallModalVisible(true)}
							activeOpacity={0.7}
							className="p-1 mr-3"
						>
							<Feather name="chevron-left" size={26} color="#0D132B" />
						</TouchableOpacity>

						<View className="flex-1">
							<Text className="font-poppins-bold text-[18px] text-neutral-primary leading-[24px]">
								AI Teacher
							</Text>
							<View className="flex-row items-center mt-0.5">
								<View className={`w-2.5 h-2.5 rounded-full ${statusProps.dotClass} mr-1.5`} />
								<Text 
									className="font-poppins-medium text-[12px]" 
									style={{ color: statusProps.color }}
								>
									{statusProps.text}
								</Text>
							</View>
						</View>
					</View>

					{/* Header Actions */}
					<View className="flex-row items-center gap-2.5">
						<TouchableOpacity
							onPress={() => setIsCameraActive(!isCameraActive)}
							activeOpacity={0.7}
							className="w-10 h-10 rounded-full border border-[#E5E7EB] items-center justify-center bg-white"
						>
							<Feather
								name={isCameraActive ? "video" : "video-off"}
								size={18}
								color="#0D132B"
							/>
						</TouchableOpacity>

						<View className="w-10 h-10 rounded-full border border-[#E5E7EB] items-center justify-center bg-white">
							<Text className="font-poppins-bold text-[13px] text-[#0C0F24]">
								{elapsedSeconds}
							</Text>
						</View>

						<TouchableOpacity
							onPress={() => setIsInfoVisible(true)}
							activeOpacity={0.7}
							className="w-10 h-10 rounded-full border border-[#E5E7EB] items-center justify-center bg-white"
						>
							<Feather name="bell" size={18} color="#0D132B" />
						</TouchableOpacity>
					</View>
				</View>
			</View>

			{/* Main Audio Session Background Container */}
			<View className="flex-1 bg-[#F6F7FB] items-center justify-center w-full">
				<View className="flex-1 w-full max-w-[480px] p-4">
					<View className="flex-1 rounded-[32px] overflow-hidden relative shadow-lg">
						{/* Blurred room background image */}
						<Image
							source={{ uri: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80" }}
							className="absolute w-full h-full"
							contentFit="cover"
							blurRadius={3}
						/>

						{/* Waving mascot fox in center foreground */}
						<Image
							source={images.mascotWelcome}
							className="absolute w-[370px] h-[370px] self-center"
							style={styles.mascot}
							contentFit="contain"
						/>

						{/* User Profile Info Badge Overlay */}
						<View className="absolute top-4 left-4 bg-black/50 px-3 py-1.5 rounded-full flex-row items-center gap-2 border border-white/20">
							<Image
								source={user?.imageUrl ? { uri: user.imageUrl } : images.user_avatar}
								className="w-5 h-5 rounded-full"
							/>
							<Text className="font-poppins-medium text-[11px] text-white">
								{user?.firstName || "Student"}
							</Text>
						</View>

						{/* Speech Bubble / Subtitles Overlay */}
						{subtitlesVisible && (
							<View className="absolute bottom-[92px] left-6 right-6 bg-white rounded-[24px] p-4 shadow-lg border border-[#E5E7EB]">
								<View className="flex-row items-center justify-between gap-4">
									<View className="flex-1">
										<Text className="font-poppins-bold text-[16px] text-[#0C0F24] leading-[22px]">
											{captions ? captions.speakerName : "AI Teacher"}
										</Text>
										<Text className="font-poppins text-[13px] text-[#6B7280] mt-0.5 leading-[18px]">
											{captions ? captions.text : (
												agentStatus === "connected"
													? "Ready! Say hello to start the lesson."
													: agentStatus === "connecting"
													? "Spawning AI Teacher..."
													: agentStatus === "failed"
													? "Failed to connect to AI Teacher."
													: "Connecting to room..."
											)}
										</Text>
									</View>
									<TouchableOpacity
										activeOpacity={0.7}
										className="p-1"
									>
										<Feather name="volume-2" size={20} color="#6C4EF5" />
									</TouchableOpacity>
								</View>
								{/* Speech pointer block */}
								<View className="absolute bottom-[-6px] right-[75px] w-3 h-3 bg-white border-r border-b border-[#E5E7EB] rotate-45" />
							</View>
						)}

						{/* Control Buttons Overlay */}
						<View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-around px-4">
							<View className="items-center">
								<TouchableOpacity
									onPress={() => setIsCameraActive(!isCameraActive)}
									activeOpacity={0.8}
									className="w-14 h-14 rounded-full items-center justify-center shadow-md bg-white"
								>
									<Feather
										name={isCameraActive ? "video" : "video-off"}
										size={24}
										color={isCameraActive ? "#0D132B" : "#A1A1AA"}
									/>
								</TouchableOpacity>
								<Text className="font-poppins-medium text-[12px] text-white/90 mt-1.5 shadow-sm">
									Camera
								</Text>
							</View>

							<View className="items-center">
								<TouchableOpacity
									onPress={toggleMute}
									activeOpacity={0.8}
									className={`w-14 h-14 rounded-full items-center justify-center shadow-md ${
										isMute ? "bg-[#FF4B4B]" : "bg-white"
									}`}
								>
									<Feather
										name={isMute ? "mic-off" : "mic"}
										size={24}
										color={isMute ? "#FFFFFF" : "#0D132B"}
									/>
								</TouchableOpacity>
								<Text className="font-poppins-medium text-[12px] text-white/90 mt-1.5 shadow-sm">
									Mic
								</Text>
							</View>

							<View className="items-center">
								<TouchableOpacity
									onPress={() => setSubtitlesVisible(!subtitlesVisible)}
									activeOpacity={0.8}
									className="w-14 h-14 rounded-full items-center justify-center shadow-md bg-white"
								>
									<MaterialIcons
										name="translate"
										size={24}
										color={subtitlesVisible ? "#6C4EF5" : "#0D132B"}
									/>
								</TouchableOpacity>
								<Text className="font-poppins-medium text-[12px] text-white/90 mt-1.5 shadow-sm">
									Subtitles
								</Text>
							</View>

							<View className="items-center">
								<TouchableOpacity
									onPress={() => setIsEndCallModalVisible(true)}
									activeOpacity={0.8}
									className="w-14 h-14 rounded-full items-center justify-center bg-[#FF4B4B] shadow-md"
								>
									<MaterialIcons name="call-end" size={24} color="#FFFFFF" />
								</TouchableOpacity>
								<Text className="font-poppins-medium text-[12px] text-white/90 mt-1.5 shadow-sm">
									End Call
								</Text>
							</View>
						</View>
					</View>

					{/* Bottom Live Feedback Summary Card */}
					<View className="flex-row items-center justify-around bg-white rounded-[24px] border border-[#E5E7EB] py-5 px-4 mt-3 shadow-sm">
						<View className="items-center flex-1">
							<Text className="font-poppins-semibold text-[14px] text-[#0C0F24]">
								Speaking
							</Text>
							<Text className="font-poppins-bold text-[16px] text-[#21C16B] mt-1">
								{speakingRating}
							</Text>
						</View>
						<View style={{ width: 1, height: 28, backgroundColor: "#E5E7EB" }} />
						<View className="items-center flex-1">
							<Text className="font-poppins-semibold text-[14px] text-[#0C0F24]">
								Pronunciation
							</Text>
							<Text className="font-poppins-bold text-[16px] text-[#2F80ED] mt-1">
								{pronunciationRating}
							</Text>
						</View>
						<View style={{ width: 1, height: 28, backgroundColor: "#E5E7EB" }} />
						<View className="items-center flex-1">
							<Text className="font-poppins-semibold text-[14px] text-[#0C0F24]">
								Grammar
							</Text>
							<Text className="font-poppins-bold text-[16px] text-[#9B51E0] mt-1">
								{grammarRating}
							</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Collapsible Info Objectives Sheet Modal */}
			<Modal
				visible={isInfoVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setIsInfoVisible(false)}
			>
				<Pressable
					className="flex-1 justify-end bg-black/40"
					onPress={() => setIsInfoVisible(false)}
				>
					<Pressable style={styles.modalContent} onPress={(e: GestureResponderEvent) => e.stopPropagation()}>
						<TouchableOpacity
							className="absolute right-[18px] top-[18px] p-1.5 bg-[#F6F7FB] rounded-full z-10"
							onPress={() => setIsInfoVisible(false)}
							activeOpacity={0.7}
						>
							<Feather name="x" size={18} color="#6B7280" />
						</TouchableOpacity>

						<View className="pt-2">
							<Text className="font-poppins-bold text-[20px] text-neutral-primary mb-1">
								Lesson Details
							</Text>
							<Text className="font-poppins text-[13px] text-neutral-secondary mb-5">
								Review the learning objectives, context, and focus phrases for this session.
							</Text>

							{/* Goal */}
							<Text className="font-poppins-bold text-[12px] text-neutral-primary uppercase tracking-wider mb-2">
								Learning Objective
							</Text>
							<View className="bg-neutral-surface border border-[#E5E7EB] rounded-xl p-3.5 mb-5">
								<Text className="font-poppins-semibold text-[13px] text-[#0C0F24] leading-[18px]">
									{lesson.goals[0] || "Practice and improve communication skills."}
								</Text>
							</View>

							{/* Useful Phrases */}
							<Text className="font-poppins-bold text-[12px] text-neutral-primary uppercase tracking-wider mb-2">
								Focus Phrases
							</Text>
							<View className="gap-2.5 mb-5">
								{getLocalizedPhrases(selectedLanguageId || "es").map((phr, idx) => (
									<View
										key={idx}
										className="flex-row items-center bg-[#F6F7FB] border border-[#E5E7EB] rounded-xl px-3 py-2.5"
									>
										<Feather name="mic" size={13} color="#6C4EF5" />
										<Text className="font-poppins-medium text-[13px] text-neutral-primary ml-2 flex-1">
											{phr}
										</Text>
									</View>
								))}
							</View>

							{/* Teacher Context Prompt */}
							{lesson.aiPrompt && (
								<View className="mb-4">
									<Text className="font-poppins-bold text-[12px] text-neutral-primary uppercase tracking-wider mb-2">
										AI Teacher Persona
									</Text>
									<Text className="font-poppins text-[13px] text-neutral-secondary leading-[20px]">
										{lesson.aiPrompt}
									</Text>
								</View>
							)}

							<TouchableOpacity
								onPress={() => setIsInfoVisible(false)}
								className="rounded-2xl h-[52px] items-center justify-center w-full bg-[#6C4EF5] mt-4"
								activeOpacity={0.85}
							>
								<Text className="font-poppins-bold text-[15px] text-white">
									Got it, Continue Session
								</Text>
							</TouchableOpacity>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

			{/* End Call / Summary Reward Modal */}
			<Modal
				visible={isEndCallModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsEndCallModalVisible(false)}
			>
				<Pressable
					className="flex-1 items-center justify-center bg-black/50 px-6"
					onPress={() => setIsEndCallModalVisible(false)}
				>
					<Pressable
						className="bg-white rounded-3xl p-6 w-full max-w-[340px]"
						onPress={(e: GestureResponderEvent) => e.stopPropagation()}
					>
						<View className="items-center pt-2">
							<Image
								source={images.mascotWelcome}
								className="w-[120px] h-[120px] mb-4"
								contentFit="contain"
							/>
							<Text className="font-poppins-bold text-[22px] text-neutral-primary text-center">
								Session Completed!
							</Text>
							<Text className="font-poppins text-[13px] text-neutral-secondary text-center mt-2 leading-[20px] px-2">
								Congratulations! You completed the audio session with your AI Teacher and practiced successfully.
							</Text>

							{/* XP Reward Badge */}
							<View className="flex-row items-center bg-[#FFF8E6] border border-[#FFE8B3] rounded-2xl px-5 py-3 mt-5 mb-6">
								<Feather name="zap" size={20} color="#FF8A00" />
								<Text className="font-poppins-bold text-[18px] text-[#FF8A00] ml-2">
									+{lesson.xpReward} XP
								</Text>
							</View>

							{/* CTA Buttons */}
							<View className="gap-2.5 w-full">
								<TouchableOpacity
									onPress={handleFinishCall}
									disabled={isSubmitting}
									className="rounded-2xl h-[52px] items-center justify-center w-full bg-[#6C4EF5]"
									activeOpacity={0.85}
								>
									{isSubmitting ? (
										<ActivityIndicator size="small" color="#FFFFFF" />
									) : (
										<Text className="font-poppins-bold text-[15px] text-white">
											Claim Reward & Exit
										</Text>
									)}
								</TouchableOpacity>

								<TouchableOpacity
									onPress={() => setIsEndCallModalVisible(false)}
									disabled={isSubmitting}
									className="rounded-2xl h-[48px] items-center justify-center w-full border border-neutral-border bg-white"
									activeOpacity={0.7}
								>
									<Text className="font-poppins-semibold text-[13px] text-neutral-secondary">
										Cancel
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	modalContent: {
		backgroundColor: "#FFFFFF",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		paddingBottom: Platform.OS === "ios" ? 36 : 24,
		maxHeight: "85%",
	},
	mascot: {
		top: "50%",
		transform: [{ translateY: -185 }],
	},
});
