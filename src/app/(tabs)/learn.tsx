import React, { useState } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { Lesson } from "@/types/learning";
import { usePostHog } from "posthog-react-native";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { blurActiveElement } from "@/utils/dom";

// Get header banner based on language
const getHeroImage = (langId: string): string => {
	switch (langId) {
		case "es":
			return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80"; // Madrid Café / Hotel
		case "fr":
			return "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80"; // Paris Café Vibe
		case "ja":
			return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80"; // Kyoto Temple / Garden
		case "de":
			return "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&auto=format&fit=crop&q=80"; // Bavarian Town
		case "it":
			return "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=800&auto=format&fit=crop&q=80"; // Venice / Amalfi Coast
		default:
			return "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80"; // Playful Coffee Shop Vector
	}
};

// Return a tiny thumbnail image for active lesson card
const getLessonThumbnail = (type: string): any => {
	switch (type) {
		case "vocabulary":
			return images.palace;
		case "video":
			return images.streakFire;
		case "chat":
			return images.treasure;
		default:
			return images.earth;
	}
};

export default function LearnScreen() {
	const router = useRouter();
	const posthog = usePostHog();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completedLessons = useProgressStore((state) => state.completedLessons);
	const completeLesson = useProgressStore((state) => state.completeLesson);

	const [activeTab, setActiveTab] = useState<"lessons" | "practice">("lessons");
	const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [isBookmarked, setIsBookmarked] = useState(false);

	// Resolve selected language object
	const selectedLanguage = languages.find((l) => l.id === selectedLanguageId) || languages[0];

	// Fetch units and lessons for the current selected language
	const { units: activeUnits, lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguage.id);
	const currentUnit = activeUnits[0]; // Unit 1 as active by default

	// Calculate progress details
	const unitLessons = activeLessons.filter((l) => l.unitId === currentUnit.id);
	const completedCount = unitLessons.filter((l) => completedLessons.includes(l.id)).length;

	// Find the next uncompleted lesson to recommend (acts as "In progress")
	const nextLesson = unitLessons.find((l) => !completedLessons.includes(l.id)) || null;

	const handleOpenLesson = (lesson: Lesson) => {
		posthog.screen("lesson_detail_modal", {
			lesson_id: lesson.id,
			lesson_title: lesson.title,
			lesson_type: lesson.type,
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
					method: "mock",
				});
				setModalVisible(false);
				setSelectedLesson(null);
			} catch (err) {
				posthog.captureException(err, { flow: "learn", step: "mock_complete" });
				console.error("Failed to complete mock lesson:", err);
			}
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			{/* Header Section */}
			<View className="flex-row items-center justify-between px-5 pt-3 pb-2.5 bg-white border-b border-neutral-border">
				<TouchableOpacity
					onPress={() => {
						blurActiveElement();
						router.replace("/" as any);
					}}
					activeOpacity={0.7}
					className="p-1"
				>
					<Feather name="chevron-left" size={26} color="#0D132B" />
				</TouchableOpacity>

				<View className="flex-1 items-center px-4">
					<Text className="font-poppins-bold text-[18px] text-neutral-primary text-center leading-[24px]">
						{currentUnit?.title.split(":")[1]?.trim() || currentUnit?.title || "Curriculum"}
					</Text>
					<Text className="font-poppins-medium text-[12px] text-neutral-secondary text-center mt-0.5">
						Unit {currentUnit?.order || 1} • {completedCount} / {unitLessons.length} lessons
					</Text>
				</View>

				<TouchableOpacity
					onPress={() => setIsBookmarked(!isBookmarked)}
					activeOpacity={0.7}
					className="p-1"
				>
					<Feather
						name={isBookmarked ? "bookmark" : "bookmark"}
						size={22}
						color={isBookmarked ? "#FF8A00" : "#6B7280"}
					/>
				</TouchableOpacity>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Hero Image Banner */}
				<View className="w-full h-[180px] rounded-2xl overflow-hidden mb-6 bg-neutral-border">
					<Image
						source={{ uri: getHeroImage(selectedLanguage.id) }}
						className="w-full h-full"
						contentFit="cover"
					/>
				</View>

				{/* Tab Selector */}
				<View className="flex-row bg-neutral-surface rounded-full p-1 mb-6 border border-neutral-border">
					<TouchableOpacity
						onPress={() => setActiveTab("lessons")}
						activeOpacity={0.8}
						className="flex-1 h-10 items-center justify-center rounded-full"
						style={activeTab === "lessons" ? styles.tabActive : null}
					>
						<Text
							className={`font-poppins-semibold text-[14px] ${
								activeTab === "lessons" ? "text-lingua-purple" : "text-neutral-secondary"
							}`}
						>
							Lessons
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => setActiveTab("practice")}
						activeOpacity={0.8}
						className="flex-1 h-10 items-center justify-center rounded-full"
						style={activeTab === "practice" ? styles.tabActive : null}
					>
						<Text
							className={`font-poppins-semibold text-[14px] ${
								activeTab === "practice" ? "text-lingua-purple" : "text-neutral-secondary"
							}`}
						>
							Practice
						</Text>
					</TouchableOpacity>
				</View>

				{/* Tab Contents */}
				{activeTab === "lessons" ? (
					<View className="gap-3 mb-6">
						{unitLessons.map((lesson) => {
							const isCompleted = completedLessons.includes(lesson.id);
							const isActive = nextLesson && nextLesson.id === lesson.id;
							const isLocked = !isCompleted && !isActive;

							let cardClass = "flex-row items-center rounded-[20px] p-4 border-[1.5px] ";
							if (isCompleted) {
								cardClass += "border-neutral-border bg-white";
							} else if (isActive) {
								cardClass += "border-lingua-purple bg-[#F5F2FF]";
							} else {
								cardClass += "border-neutral-border bg-white opacity-85";
							}

							return (
								<TouchableOpacity
									key={lesson.id}
									onPress={() => handleOpenLesson(lesson)}
									activeOpacity={0.85}
									className={cardClass}
								>
									<View className="flex-1">
										<Text
											className={`font-poppins-medium text-[11px] uppercase tracking-wider ${
												isActive ? "text-lingua-purple" : "text-neutral-secondary"
											}`}
										>
											Lesson {lesson.order}
										</Text>
										<Text className="font-poppins-bold text-[15px] text-neutral-primary mt-1">
											{lesson.title}
										</Text>
										{isActive && (
											<Text className="font-poppins-semibold text-[11px] text-lingua-purple mt-1">
												In progress
											</Text>
										)}
										{isLocked && (
											<Text className="font-poppins text-[11px] text-neutral-secondary mt-1">
												0 / {lesson.activities.length || 3} steps
											</Text>
										)}
									</View>

									{/* Status Right Component */}
									<View className="ml-4">
										{isCompleted && (
											<View className="w-6 h-6 rounded-full bg-success items-center justify-center">
												<Feather name="check" size={14} color="#FFFFFF" />
											</View>
										)}
										{isActive && (
											<Image
												source={getLessonThumbnail(lesson.type)}
												className="w-10 h-10 rounded-lg bg-neutral-surface"
												contentFit="contain"
											/>
										)}
										{isLocked && (
											<Feather name="lock" size={18} color="#9CA3AF" />
										)}
									</View>
								</TouchableOpacity>
							);
						})}
					</View>
				) : (
					<View className="flex-1 items-center justify-center py-10 bg-white border border-neutral-border rounded-2xl">
						<Feather name="target" size={32} color="#9CA3AF" />
						<Text className="font-poppins-bold text-[16px] text-neutral-primary mt-3">
							Practice Exercises
						</Text>
						<Text className="font-poppins text-[13px] text-neutral-secondary mt-1 text-center px-6 leading-[18px]">
							Review vocabulary, spelling, and listening lessons from your current unit.
						</Text>
					</View>
				)}
			</ScrollView>

			{/* Bottom Details Modal (consistent with Home Screen) */}
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
								{/* Type indicator */}
								<View className="flex-row items-center mb-2">
									<View className="bg-neutral-surface px-2.5 py-1 rounded-full border border-neutral-border flex-row items-center">
										<Feather
											name={
												selectedLesson.type === "video"
													? "video"
													: selectedLesson.type === "chat"
													? "message-square"
													: "book-open"
											}
											size={12}
											color="#6C4EF5"
										/>
										<Text className="font-poppins-semibold text-[10px] text-lingua-purple uppercase tracking-wider ml-1">
											{selectedLesson.type}
										</Text>
									</View>
								</View>

								{/* Title / Description */}
								<Text className="font-poppins-bold text-[22px] text-neutral-primary leading-[28px] mb-2.5">
									{selectedLesson.title}
								</Text>
								<Text className="font-poppins text-[13px] text-neutral-secondary leading-[20px] mb-5">
									{selectedLesson.description}
								</Text>

								{/* Stat badges */}
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

								{/* Goals */}
								{selectedLesson.goals && selectedLesson.goals.length > 0 && (
									<View className="mb-6">
										<Text className="font-poppins-bold text-[13px] text-neutral-primary uppercase tracking-wider mb-2.5">
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

								{/* CTA Actions */}
								<View className="gap-2.5 mt-2">
									<TouchableOpacity
										onPress={() => {
											posthog.capture("lesson_started", {
												lesson_id: selectedLesson.id,
												lesson_title: selectedLesson.title,
												lesson_type: selectedLesson.type,
												language_id: selectedLanguageId,
											});
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
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 28,
	},
	tabActive: {
		backgroundColor: "#FFFFFF",
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.06,
				shadowRadius: 4,
			},
			android: {
				elevation: 2,
			},
			web: {
				boxShadow: "0px 2px 4px rgba(13, 19, 43, 0.06)",
			} as any,
		}),
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
