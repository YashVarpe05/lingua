import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	Modal,
	Platform,
	ActivityIndicator,
	GestureResponderEvent,
	type ImageStyle,
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
import { usePostHog } from "posthog-react-native";
import { useUser } from "@clerk/expo";

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

const mascotCenterStyle: ImageStyle = {
	top: "50%",
	transform: [{ translateY: -185 }],
};

export default function AudioLessonScreen() {
	const router = useRouter();
	const posthog = usePostHog();
	const { user } = useUser();
	const { id } = useLocalSearchParams<{ id: string }>();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completeLesson = useProgressStore((state) => state.completeLesson);

	// Get active lessons for selected language
	const { lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguageId || "es");
	const lesson = activeLessons.find((l) => l.id === id);

	// Web Mocked Calling States
	const [callingState, setCallingState] = useState<"connecting" | "joined" | "left" | "reconnecting_failed">("connecting");
	const [isMuted, setIsMuted] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	// UI States
	const [isCameraActive, setIsCameraActive] = useState(true);
	const [subtitlesVisible, setSubtitlesVisible] = useState(true);
	const [isInfoVisible, setIsInfoVisible] = useState(false);
	const [isEndCallModalVisible, setIsEndCallModalVisible] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// States for Live AI grading/feedback panel
	const [speakingRating, setSpeakingRating] = useState("Listening...");
	const [pronunciationRating, setPronunciationRating] = useState("Listening...");
	const [grammarRating, setGrammarRating] = useState("Listening...");

	// Simulated subtitles/closed captions state
	const [mockCaptions, setMockCaptions] = useState<{ speakerName: string; text: string } | null>(null);

	// Simulates call connection on Web
	useEffect(() => {
		const connectTimeout = setTimeout(() => {
			setCallingState("joined");
		}, 1500);
		return () => clearTimeout(connectTimeout);
	}, []);

	// Ticking call duration timer
	useEffect(() => {
		if (callingState !== "joined") return;
		const interval = setInterval(() => {
			setElapsedSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [callingState]);

	// Simulates live AI evaluation updates
	useEffect(() => {
		const feedbackTimeout = setTimeout(() => {
			setSpeakingRating("Excellent");
			setPronunciationRating("Great");
			setGrammarRating("Good");
		}, 5000);
		return () => clearTimeout(feedbackTimeout);
	}, []);

	// Simulates agent closed captions on Web fallback
	useEffect(() => {
		if (callingState !== "joined") {
			setMockCaptions(null);
			return;
		}

		const timers: any[] = [];

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
	}, [callingState, selectedLanguageId]);

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
			await completeLesson(lesson.id, lesson.xpReward);
			posthog.capture("lesson_completed", {
				lesson_id: lesson.id,
				lesson_title: lesson.title,
				lesson_type: lesson.type,
				language_id: selectedLanguageId,
				xp_earned: lesson.xpReward,
				method: "audio_session_web",
			});
			setIsEndCallModalVisible(false);
			if (router.canGoBack()) {
				router.back();
			} else {
				router.replace("/(tabs)");
			}
		} catch (err) {
			posthog.captureException(err, { flow: "audio_lesson_web", step: "finish_call" });
			console.error("Failed to complete audio session:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Maps active calling state to top status line
	const getCallStatusProps = () => {
		if (isMuted) {
			return {
				text: "Muted",
				color: "#FF8A00",
				dotClass: "bg-[#FF8A00]",
			};
		}
		switch (callingState) {
			case "connecting":
				return {
					text: "Connecting...",
					color: "#FFB020",
					dotClass: "bg-[#FFB020] animate-pulse",
				};
			case "joined":
				return {
					text: "Online (Web Demo)",
					color: "#21C16B",
					dotClass: "bg-[#21C16B]",
				};
			case "reconnecting_failed":
				return {
					text: "Connection Failed",
					color: "#FF4B4B",
					dotClass: "bg-[#FF4B4B]",
				};
			case "left":
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
							style={mascotCenterStyle}
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
											{mockCaptions ? mockCaptions.speakerName : "AI Teacher"}
										</Text>
										<Text className="font-poppins text-[13px] text-[#6B7280] mt-0.5 leading-[18px]">
											{mockCaptions ? mockCaptions.text : (
												callingState === "joined"
													? "Ready! Say hello to start the lesson."
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
									onPress={() => setIsMuted(!isMuted)}
									activeOpacity={0.8}
									className={`w-14 h-14 rounded-full items-center justify-center shadow-md ${
										isMuted ? "bg-[#FF4B4B]" : "bg-white"
									}`}
								>
									<Feather
										name={isMuted ? "mic-off" : "mic"}
										size={24}
										color={isMuted ? "#FFFFFF" : "#0D132B"}
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
});
