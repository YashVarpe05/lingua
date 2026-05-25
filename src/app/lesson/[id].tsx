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
import { Feather } from "@expo/vector-icons";
import { Text, View, TouchableOpacity, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { usePostHog } from "posthog-react-native";

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

// Localized greeting dialog for floating speech bubble
const getLocalizedGreeting = (langId: string): string => {
	switch (langId) {
		case "es":
			return "¡Muy bien!";
		case "fr":
			return "Très bien !";
		case "ja":
			return "素晴らしい！";
		case "de":
			return "Sehr gut!";
		case "it":
			return "Molto bene!";
		case "nl":
			return "Heel goed!";
		default:
			return "Excellent!";
	}
};

export default function AudioLessonScreen() {
	const router = useRouter();
	const posthog = usePostHog();
	const { id } = useLocalSearchParams<{ id: string }>();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completeLesson = useProgressStore((state) => state.completeLesson);

	// Get active lessons for selected language
	const { lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguageId || "es");
	const lesson = activeLessons.find((l) => l.id === id);

	// States for Call Controls
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isCameraActive, setIsCameraActive] = useState(true);
	const [isMuted, setIsMuted] = useState(false);
	const [subtitlesVisible, setSubtitlesVisible] = useState(true);
	const [isInfoVisible, setIsInfoVisible] = useState(false);
	const [isEndCallModalVisible, setIsEndCallModalVisible] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// States for Live AI grading/feedback panel
	const [speakingRating, setSpeakingRating] = useState("Listening...");
	const [pronunciationRating, setPronunciationRating] = useState("Listening...");
	const [grammarRating, setGrammarRating] = useState("Listening...");

	// Ticking call duration timer
	useEffect(() => {
		const interval = setInterval(() => {
			setElapsedSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// Simulates live AI evaluation updates
	useEffect(() => {
		const feedbackTimeout = setTimeout(() => {
			setSpeakingRating("Excellent");
			setPronunciationRating("Great");
			setGrammarRating("Good");
		}, 5000);
		return () => clearTimeout(feedbackTimeout);
	}, []);

	if (!lesson) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 items-center justify-center p-6 bg-white">
					<Text className="font-poppins-bold text-[18px] text-neutral-primary mb-2">
						Lesson not found
					</Text>
					<TouchableOpacity
						onPress={() => router.back()}
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
				method: "audio_session",
			});
			setIsEndCallModalVisible(false);
			router.back();
		} catch (err) {
			posthog.captureException(err, { flow: "audio_lesson", step: "finish_call" });
			console.error("Failed to complete audio session:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			{/* Top Header Row */}
			<View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-white border-b border-neutral-border">
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
							<View className="w-2.5 h-2.5 rounded-full bg-[#21C16B] mr-1.5" />
							<Text className="font-poppins-medium text-[12px] text-[#21C16B]">
								Online
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
						<Feather name="info" size={18} color="#0D132B" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Main Audio Session Background Container */}
			<View className="flex-1 p-4 bg-[#F6F7FB]">
				<View className="flex-1 rounded-[32px] overflow-hidden relative shadow-lg">
					{/* Blurred room background image */}
					<Image
						source={{ uri: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80" }}
						className="absolute w-full h-full"
						contentFit="cover"
						blurRadius={5}
					/>

					{/* Waving mascot fox in center foreground */}
					<Image
						source={images.mascot_waving}
						className="absolute bottom-20 w-[280px] h-[280px] self-center"
						contentFit="contain"
					/>

					{/* Floating PIP user camera window */}
					{isCameraActive && (
						<View className="absolute top-4 right-4 w-[85px] h-[115px] rounded-2xl overflow-hidden border-2 border-white bg-neutral-surface shadow-md">
							<Image
								source={images.user_avatar}
								className="w-full h-full"
								contentFit="cover"
							/>
						</View>
					)}

					{/* Speech Bubble / Subtitles Overlay */}
					{subtitlesVisible && (
						<View className="absolute bottom-[92px] left-6 right-6 bg-white rounded-2xl p-4 shadow-lg border border-[#E5E7EB]">
							<View className="flex-row items-center justify-between gap-4">
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] text-[#0C0F24] leading-[22px]">
										{getLocalizedGreeting(selectedLanguageId || "es")}
									</Text>
									<Text className="font-poppins text-[13px] text-[#6B7280] mt-0.5 leading-[18px]">
										That was great! 👏
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
							<View className="absolute bottom-[-6px] left-[50px] w-3 h-3 bg-white border-r border-b border-[#E5E7EB] rotate-45" />
						</View>
					)}

					{/* Control Buttons Overlay */}
					<View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-around px-4">
						<View className="items-center">
							<TouchableOpacity
								onPress={() => setIsCameraActive(!isCameraActive)}
								activeOpacity={0.8}
								className={`w-12 h-12 rounded-full items-center justify-center shadow-md bg-white`}
							>
								<Feather
									name={isCameraActive ? "video" : "video-off"}
									size={20}
									color={isCameraActive ? "#0D132B" : "#A1A1AA"}
								/>
							</TouchableOpacity>
							<Text className="font-poppins text-[10px] text-white mt-1 uppercase tracking-wider">
								Camera
							</Text>
						</View>

						<View className="items-center">
							<TouchableOpacity
								onPress={() => setIsMuted(!isMuted)}
								activeOpacity={0.8}
								className={`w-12 h-12 rounded-full items-center justify-center shadow-md ${
									isMuted ? "bg-[#EB5757]" : "bg-white"
								}`}
							>
								<Feather
									name={isMuted ? "mic-off" : "mic"}
									size={20}
									color={isMuted ? "#FFFFFF" : "#0D132B"}
								/>
							</TouchableOpacity>
							<Text className="font-poppins text-[10px] text-white mt-1 uppercase tracking-wider">
								Mic
							</Text>
						</View>

						<View className="items-center">
							<TouchableOpacity
								onPress={() => setSubtitlesVisible(!subtitlesVisible)}
								activeOpacity={0.8}
								className={`w-12 h-12 rounded-full items-center justify-center shadow-md bg-white`}
							>
								<Feather
									name="message-square"
									size={20}
									color={subtitlesVisible ? "#6C4EF5" : "#0D132B"}
								/>
							</TouchableOpacity>
							<Text className="font-poppins text-[10px] text-white mt-1 uppercase tracking-wider">
								Subtitles
							</Text>
						</View>

						<View className="items-center">
							<TouchableOpacity
								onPress={() => setIsEndCallModalVisible(true)}
								activeOpacity={0.8}
								className="w-12 h-12 rounded-full items-center justify-center bg-[#EB5757] shadow-md"
							>
								<Feather name="phone-off" size={20} color="#FFFFFF" />
							</TouchableOpacity>
							<Text className="font-poppins text-[10px] text-white mt-1 uppercase tracking-wider">
								End Call
							</Text>
						</View>
					</View>
				</View>

				{/* Bottom Live Feedback Summary Card */}
				<View className="flex-row items-center justify-around bg-white rounded-2xl border border-[#E5E7EB] p-4 mt-3 shadow-sm">
					<View className="items-center flex-1">
						<Text className="font-poppins text-[11px] text-neutral-secondary uppercase tracking-wider">
							Speaking
						</Text>
						<Text className="font-poppins-bold text-[14px] text-[#21C16B] mt-1">
							{speakingRating}
						</Text>
					</View>
					<View style={{ width: 1, height: 28, backgroundColor: "#E5E7EB" }} />
					<View className="items-center flex-1">
						<Text className="font-poppins text-[11px] text-neutral-secondary uppercase tracking-wider">
							Pronunciation
						</Text>
						<Text className="font-poppins-bold text-[14px] text-[#2F80ED] mt-1">
							{pronunciationRating}
						</Text>
					</View>
					<View style={{ width: 1, height: 28, backgroundColor: "#E5E7EB" }} />
					<View className="items-center flex-1">
						<Text className="font-poppins text-[11px] text-neutral-secondary uppercase tracking-wider">
							Grammar
						</Text>
						<Text className="font-poppins-bold text-[14px] text-[#9B51E0] mt-1">
							{grammarRating}
						</Text>
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
