import React, { useState } from "react";
import {
	StyleSheet,
	Modal,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Text, View, Pressable, ScrollView, TouchableOpacity } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { Lesson } from "@/types/learning";
import { usePostHog } from "posthog-react-native";
import { getLanguageUnitsAndLessons } from "@/utils/learning";

// Localized mascot speech bubble invitations
const getMascotGreeting = (langId: string, name: string) => {
	switch (langId) {
		case "es":
			return `¡Hola, ${name}! ¿Listo para hablar español conmigo hoy?`;
		case "fr":
			return `Bonjour, ${name} ! Prêt à parler français avec moi aujourd'hui ?`;
		case "ja":
			return `こんにちは、${name}さん！一緒に日本語を話しましょう！`;
		case "de":
			return `Hallo, ${name}! Bereit, Deutsch mit mir zu sprechen?`;
		case "it":
			return `Ciao, ${name}! Pronto a parlare italiano con me?`;
		case "nl":
			return `Hallo, ${name}! Klaar om Nederlands met mij te spreken?`;
		default:
			return `Hello, ${name}! Ready to practice speaking with me today?`;
	}
};

export default function TeacherScreen() {
	const router = useRouter();
	const posthog = usePostHog();
	const { user } = useUser();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completedLessons = useProgressStore((state) => state.completedLessons);
	const completeLesson = useProgressStore((state) => state.completeLesson);
	const streak = useProgressStore((state) => state.streak);
	const xp = useProgressStore((state) => state.xp);

	const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
	const [modalVisible, setModalVisible] = useState(false);

	// Resolve selected language object
	const selectedLanguage = selectedLanguageId
		? languages.find((lang) => lang.id === selectedLanguageId) || languages[0]
		: languages[0];

	// Fetch units and lessons for the current selected language
	const { lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguage.id);

	// Filter speaking/audio lessons
	const speakingLessons = activeLessons.filter(
		(l) => l.type === "video" || l.type === "chat"
	);

	// Determine the first uncompleted speaking lesson to launch as primary action
	const nextSpeakingLesson = speakingLessons.find((l) => !completedLessons.includes(l.id)) || speakingLessons[0] || null;

	const handleOpenLesson = (lesson: Lesson) => {
		posthog.capture("lesson_opened_from_teacher_tab", {
			lesson_id: lesson.id,
			lesson_title: lesson.title,
			lesson_type: lesson.type,
			language_id: selectedLanguageId,
		});
		setSelectedLesson(lesson);
		setModalVisible(true);
	};

	const handleCompleteMockLesson = async () => {
		if (selectedLesson) {
			try {
				await completeLesson(selectedLesson.id, selectedLesson.xpReward);
				posthog.capture("lesson_completed", {
					lesson_id: selectedLesson.id,
					lesson_title: selectedLesson.title,
					lesson_type: selectedLesson.type,
					language_id: selectedLanguageId,
					xp_earned: selectedLesson.xpReward,
					method: "mock_from_teacher_tab",
				});
				setModalVisible(false);
				setSelectedLesson(null);
			} catch (err) {
				console.error("Failed to complete mock lesson:", err);
			}
		}
	};

	const handleStartPrimaryCall = () => {
		if (nextSpeakingLesson) {
			posthog.capture("lesson_started_from_teacher_cta", {
				lesson_id: nextSpeakingLesson.id,
				lesson_title: nextSpeakingLesson.title,
				lesson_type: nextSpeakingLesson.type,
				language_id: selectedLanguageId,
			});
			router.push(`/lesson/${nextSpeakingLesson.id}` as any);
		}
	};

	const displayName = user?.firstName || user?.username || "Student";
	const greeting = getMascotGreeting(selectedLanguage.id, displayName);

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			{/* Header Navigation Bar */}
			<View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-white border-b border-neutral-border">
				<View className="flex-row items-center flex-1 mr-4">
					<Image
						source={{ uri: selectedLanguage.flag }}
						style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB" }}
						contentFit="cover"
					/>
					<Text className="font-poppins-bold text-[18px] text-[#0D132B] ml-2.5">
						AI Speaking Teacher
					</Text>
				</View>

				{/* XP & Streak Stats */}
				<View className="flex-row items-center gap-3">
					<View className="flex-row items-center bg-[#FFF8E6] border border-[#FFE8B3] rounded-full px-2.5 py-1">
						<Feather name="zap" size={13} color="#FF8A00" />
						<Text className="font-poppins-bold text-[12px] text-[#FF8A00] ml-1">
							{xp} XP
						</Text>
					</View>
					<View className="flex-row items-center bg-[#FFEFEF] border border-[#FFD1D1] rounded-full px-2.5 py-1">
						<Image source={images.streakFire} className="w-3.5 h-3.5" contentFit="contain" />
						<Text className="font-poppins-bold text-[12px] text-[#FF4D4F] ml-1">
							{streak}
						</Text>
					</View>
				</View>
			</View>

			<ScrollView
				className="flex-1 bg-[#F6F7FB]"
				contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Waving Mascot & Welcome Speech Bubble Section */}
				<View className="px-5 pt-5 pb-2">
					<View className="bg-white rounded-3xl p-5 border border-[#E5E7EB] flex-row items-center shadow-sm relative overflow-hidden">
						{/* Background soft purple gradient circle */}
						<View className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-[#F5F2FF] rounded-full -z-10 opacity-60" />

						<Image
							source={images.mascotWelcome}
							className="w-[95px] h-[95px]"
							contentFit="contain"
						/>
						
						{/* Speech Bubble */}
						<View className="flex-1 ml-4 bg-[#F5F2FF] border border-[#EAE5FF] rounded-2xl p-3.5 relative">
							<Text className="font-poppins-semibold text-[13px] text-[#0C0F24] leading-[18px]">
								{greeting}
							</Text>
							{/* Speech pointer */}
							<View className="absolute left-[-6px] top-[30px] w-3 h-3 bg-[#F5F2FF] border-l border-b border-[#EAE5FF] rotate-45" />
						</View>
					</View>
				</View>

				{/* Primary Call AI Teacher Card */}
				{nextSpeakingLesson && (
					<View className="px-5 pt-3">
						<TouchableOpacity
							onPress={handleStartPrimaryCall}
							activeOpacity={0.9}
							className="bg-[#6C4EF5] rounded-3xl p-6 shadow-md"
							style={styles.primaryCardShadow}
						>
							<View className="flex-row justify-between items-start">
								<View className="flex-1 mr-4">
									<Text className="font-poppins-semibold text-[12px] text-white/80 uppercase tracking-wider">
										Recommended Lesson
									</Text>
									<Text className="font-poppins-bold text-[22px] text-white mt-1 leading-[28px]">
										{nextSpeakingLesson.title}
									</Text>
									<Text className="font-poppins text-[13px] text-white/95 mt-2 leading-[18px]">
										{nextSpeakingLesson.description}
									</Text>
								</View>
								
								<View className="bg-white/20 p-3.5 rounded-2xl">
									<Feather name="phone-call" size={22} color="#FFFFFF" />
								</View>
							</View>

							{/* Call CTA Button inside the card */}
							<View className="bg-white rounded-2xl h-[52px] flex-row items-center justify-center mt-5 shadow-sm">
								<Feather name="mic" size={16} color="#6C4EF5" />
								<Text className="font-poppins-bold text-[15px] text-[#6C4EF5] ml-2">
									Call AI Teacher Now
								</Text>
							</View>
						</TouchableOpacity>
					</View>
				)}

				{/* List of speaking sessions */}
				<View className="px-5 pt-6">
					<Text className="font-poppins-bold text-[16px] text-[#0C0F24] mb-3.5">
						All Speaking Lessons
					</Text>

					<View className="gap-3.5">
						{speakingLessons.map((lesson) => {
							const isCompleted = completedLessons.includes(lesson.id);
							const isActive = nextSpeakingLesson && nextSpeakingLesson.id === lesson.id;
							
							let cardBorder = "border-[#E5E7EB] bg-white";
							let activeIndicator = null;
							if (isActive) {
								cardBorder = "border-[#6C4EF5] bg-[#F9F8FF]";
								activeIndicator = <View className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#6C4EF5] rounded-l-2xl" />;
							} else if (isCompleted) {
								cardBorder = "border-[#E5E7EB] bg-white opacity-85";
							}

							return (
								<TouchableOpacity
									key={lesson.id}
									onPress={() => handleOpenLesson(lesson)}
									activeOpacity={0.85}
									className={`flex-row items-center rounded-2xl p-4 border-[1.5px] relative overflow-hidden ${cardBorder}`}
									style={{
										shadowColor: "#0D132B",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: 0.02,
										shadowRadius: 4,
										elevation: 1,
									}}
								>
									{activeIndicator}
									{/* Left Type Indicator Icon */}
									<View 
										className="w-11 h-11 rounded-xl items-center justify-center mr-4"
										style={{ 
											backgroundColor: lesson.type === "video" ? "#F5F2FF" : "#FFF0ED"
										}}
									>
										<Feather 
											name={lesson.type === "video" ? "headphones" : "message-square"} 
											size={20} 
											color={lesson.type === "video" ? "#6C4EF5" : "#FF4D4F"} 
										/>
									</View>

									<View className="flex-1">
										{isActive && (
											<View className="bg-[#6C4EF5]/10 px-2 py-0.5 rounded-full self-start mb-1">
												<Text className="font-poppins-semibold text-[9px] text-[#6C4EF5] uppercase tracking-wider">
													Next Up
												</Text>
											</View>
										)}
										<Text className="font-poppins-bold text-[15px] text-[#0C0F24] leading-[20px]">
											{lesson.title}
										</Text>
										<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5" numberOfLines={1}>
											{lesson.description}
										</Text>
										<View className="flex-row items-center mt-2 gap-2.5">
											<View className="flex-row items-center bg-[#F3F4F6] rounded-full px-2 py-0.5">
												<Feather name="clock" size={10} color="#6B7280" />
												<Text className="font-poppins-medium text-[10px] text-[#6B7280] ml-1">
													{lesson.durationMinutes}m
												</Text>
											</View>
											<View className="flex-row items-center bg-[#FFF8E6] rounded-full px-2 py-0.5">
												<Feather name="zap" size={10} color="#FF8A00" />
												<Text className="font-poppins-medium text-[10px] text-[#FF8A00] ml-1">
													{lesson.xpReward} XP
												</Text>
											</View>
										</View>
									</View>

									{/* Status Right Icon */}
									<View className="ml-3">
										{isCompleted ? (
											<View className="w-6 h-6 rounded-full bg-[#21C16B] items-center justify-center">
												<Feather name="check" size={13} color="#FFFFFF" />
											</View>
										) : (
											<Feather name="chevron-right" size={20} color="#A1A1AA" />
										)}
									</View>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>
			</ScrollView>

			{/* Details Modal Sheet (reusable) */}
			<Modal
				visible={modalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setModalVisible(false)}
			>
				<Pressable
					className="flex-1 justify-end bg-black/40"
					onPress={() => setModalVisible(false)}
				>
					<Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
						<TouchableOpacity
							className="absolute right-[18px] top-[18px] p-1.5 bg-[#F6F7FB] rounded-full z-10"
							onPress={() => setModalVisible(false)}
							activeOpacity={0.7}
						>
							<Feather name="x" size={18} color="#6B7280" />
						</TouchableOpacity>

						{selectedLesson && (
							<View className="pt-2">
								{/* Type Indicator */}
								<View className="flex-row items-center mb-2">
									<View className="bg-neutral-surface px-2.5 py-1 rounded-full border border-neutral-border flex-row items-center">
										<Feather
											name={selectedLesson.type === "video" ? "headphones" : "message-square"}
											size={12}
											color={selectedLesson.type === "video" ? "#6C4EF5" : "#FF4D4F"}
										/>
										<Text 
											className="font-poppins-semibold text-[10px] uppercase tracking-wider ml-1"
											style={{ color: selectedLesson.type === "video" ? "#6C4EF5" : "#FF4D4F" }}
										>
											{selectedLesson.type === "video" ? "Speaking Lesson" : "AI Chat"}
										</Text>
									</View>
								</View>

								{/* Title & Description */}
								<Text className="font-poppins-bold text-[22px] text-[#0D132B] leading-[28px] mb-2.5">
									{selectedLesson.title}
								</Text>
								<Text className="font-poppins text-[13px] text-neutral-secondary leading-[20px] mb-5">
									{selectedLesson.description}
								</Text>

								{/* Stats Row */}
								<View className="flex-row bg-[#F6F7FB] border border-[#E5E7EB] rounded-2xl p-4 justify-around mb-6">
									<View className="items-center">
										<Feather name="clock" size={16} color="#6B7280" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1">
											{selectedLesson.durationMinutes} mins
										</Text>
										<Text className="font-poppins text-[10px] text-neutral-secondary uppercase tracking-wider mt-0.5">
											Duration
										</Text>
									</View>
									<View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
									<View className="items-center">
										<Feather name="zap" size={16} color="#FF8A00" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1">
											{selectedLesson.xpReward} XP
										</Text>
										<Text className="font-poppins text-[10px] text-neutral-secondary uppercase tracking-wider mt-0.5">
											XP Reward
										</Text>
									</View>
								</View>

								{/* Learning Goals */}
								{selectedLesson.goals && selectedLesson.goals.length > 0 && (
									<View className="mb-6">
										<Text className="font-poppins-bold text-[13px] text-[#0D132B] uppercase tracking-wider mb-2.5">
											Learning Goals
										</Text>
										{selectedLesson.goals.map((goal, idx) => (
											<View key={idx} className="flex-row items-start mb-2">
												<Feather
													name="check-circle"
													size={14}
													color="#21C16B"
													style={{ marginTop: 2.5 }}
												/>
												<Text className="font-poppins text-[12px] text-neutral-primary ml-2.5 flex-1 leading-[18px]">
													{goal}
												</Text>
											</View>
										))}
									</View>
								)}

								{/* CTA Buttons */}
								<View className="gap-2.5 mt-2">
									<TouchableOpacity
										onPress={() => {
											setModalVisible(false);
											router.push(`/lesson/${selectedLesson.id}` as any);
										}}
										className="rounded-2xl h-[52px] items-center justify-center w-full bg-[#6C4EF5]"
										activeOpacity={0.85}
									>
										<Text className="font-poppins-bold text-[15px] text-white">
											Start Lesson
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={handleCompleteMockLesson}
										className="flex-row items-center justify-center rounded-2xl h-[48px] border-[1.5px] border-[#6C4EF5] bg-[#FBFBFF] w-full"
										activeOpacity={0.7}
									>
										<Feather name="check" size={14} color="#6C4EF5" />
										<Text className="font-poppins-semibold text-[13px] text-lingua-purple ml-1.5">
											Mock Complete (Earn XP)
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						)}
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
	primaryCardShadow: {
		...Platform.select({
			ios: {
				shadowColor: "#6C4EF5",
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: 0.35,
				shadowRadius: 10,
			},
			android: {
				elevation: 6,
			},
		}),
	},
});
