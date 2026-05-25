import React, { useState } from "react";
import {
	StyleSheet,
	Modal,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Text, View, Pressable, ScrollView, TouchableOpacity } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { Lesson } from "@/types/learning";
import { usePostHog } from "posthog-react-native";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { blurActiveElement } from "@/utils/dom";

// Get header banner based on language (uses local Cafe Fox illustration for cafe context)
const getHeroImage = (langId: string): any => {
	return images.cafe_banner;
};

// Return a tiny thumbnail image for active lesson card (uses local Cafe table & chairs icon)
const getLessonThumbnail = (type: string): any => {
	return images.cafe_thumbnail;
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

	// Pre-complete the first 2 lessons for visual demonstration in mockup design
	const mockCompletedIds = [
		`${selectedLanguage.id}_u1_l1`,
		`${selectedLanguage.id}_u1_l2`
	];
	const activeCompletedLessons = completedLessons.length === 0 ? mockCompletedIds : completedLessons;

	const completedCount = unitLessons.filter((l) => activeCompletedLessons.includes(l.id)).length;

	// Find the next uncompleted lesson to recommend (acts as "In progress")
	const nextLesson = unitLessons.find((l) => !activeCompletedLessons.includes(l.id)) || null;

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
			<View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-white border-b border-neutral-border">
				<View className="flex-row items-center flex-1 mr-4">
					<TouchableOpacity
						onPress={() => {
							blurActiveElement();
							router.replace("/" as any);
						}}
						activeOpacity={0.7}
						className="p-1 mr-3"
					>
						<Feather name="chevron-left" size={26} color="#0D132B" />
					</TouchableOpacity>

					<View className="flex-1">
						<Text className="font-poppins-bold text-[18px] text-neutral-primary leading-[24px]">
							{currentUnit?.title.split(":")[1]?.trim() || currentUnit?.title || "Curriculum"}
						</Text>
						<Text className="font-poppins-medium text-[13px] text-neutral-secondary mt-0.5">
							Unit {currentUnit?.order || 1} • {completedCount} / {unitLessons.length} lessons
						</Text>
					</View>
				</View>

				<TouchableOpacity
					onPress={() => setIsBookmarked(!isBookmarked)}
					activeOpacity={0.7}
					className="p-1"
				>
					<Ionicons
						name={isBookmarked ? "bookmark" : "bookmark-outline"}
						size={24}
						color={isBookmarked ? "#FF9F0A" : "#0D132B"}
					/>
				</TouchableOpacity>
			</View>

			<ScrollView
				className="flex-1 bg-[#F6F7FB]"
				contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Hero Image Banner (Full Width with curved bottom corners) */}
				<View className="w-full h-[220px] overflow-hidden mb-6 bg-neutral-border">
					<Image
						source={getHeroImage(selectedLanguage.id)}
						className="w-full h-full"
						contentFit="cover"
						style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
					/>
				</View>

				{/* Container with margins */}
				<View className="px-5">
					{/* Tab Selector */}
					<View className="flex-row bg-[#EAE8F5] rounded-3xl p-1.5 mb-6">
						<TouchableOpacity
							onPress={() => setActiveTab("lessons")}
							activeOpacity={0.8}
							className="flex-1 h-[46px] items-center justify-center rounded-2xl"
							style={
								activeTab === "lessons"
									? {
											backgroundColor: "#FFFFFF",
											borderBottomWidth: 3,
											borderBottomColor: "#6C4EF5",
											shadowColor: "#0D132B",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.08,
											shadowRadius: 3,
											elevation: 2,
									  }
									: null
							}
						>
							<Text
								className={`font-poppins-bold text-[15px] ${
									activeTab === "lessons" ? "text-lingua-purple" : "text-[#6B7280]"
								}`}
							>
								Lessons
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setActiveTab("practice")}
							activeOpacity={0.8}
							className="flex-1 h-[46px] items-center justify-center rounded-2xl"
							style={
								activeTab === "practice"
									? {
											backgroundColor: "#FFFFFF",
											borderBottomWidth: 3,
											borderBottomColor: "#6C4EF5",
											shadowColor: "#0D132B",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.08,
											shadowRadius: 3,
											elevation: 2,
									  }
									: null
							}
						>
							<Text
								className={`font-poppins-bold text-[15px] ${
									activeTab === "practice" ? "text-lingua-purple" : "text-[#6B7280]"
								}`}
							>
								Practice
							</Text>
						</TouchableOpacity>
					</View>

					{/* Tab Contents */}
					{activeTab === "lessons" ? (
						<View className="gap-3.5 mb-6">
							{unitLessons.map((lesson) => {
								const isCompleted = activeCompletedLessons.includes(lesson.id);
								const isActive = nextLesson && nextLesson.id === lesson.id;
								const isLocked = !isCompleted && !isActive;

								let cardClass = "flex-row items-center rounded-[20px] p-5 border-[1.5px] bg-white ";
								if (isCompleted) {
									cardClass += "border-[#E5E7EB]";
								} else if (isActive) {
									cardClass += "border-[#6C4EF5] bg-[#F5F2FF]";
								} else {
									cardClass += "border-[#E5E7EB]";
								}

								return (
									<TouchableOpacity
										key={lesson.id}
										onPress={() => handleOpenLesson(lesson)}
										activeOpacity={0.85}
										className={cardClass}
										style={{
											shadowColor: "#0D132B",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.02,
											shadowRadius: 4,
											elevation: 1,
										}}
									>
										<View className="flex-1">
											<Text
												className={`font-poppins-semibold text-[12px] uppercase tracking-wider ${
													isActive ? "text-lingua-purple" : "text-[#A1A1AA]"
												}`}
											>
												Lesson {lesson.order}
											</Text>
											<Text className="font-poppins-bold text-[16px] text-[#0C0F24] mt-0.5">
												{lesson.title}
											</Text>
											{isActive && (
												<Text className="font-poppins-semibold text-[12px] text-lingua-purple mt-1">
													In progress
												</Text>
											)}
											{isLocked && (
												<Text className="font-poppins text-[12px] text-neutral-secondary mt-1">
													0 / {lesson.activities.length || 6} steps
												</Text>
											)}
										</View>

										{/* Status Right Component */}
										<View className="ml-4">
											{isCompleted && (
												<View className="w-[26px] h-[26px] rounded-full bg-[#21C16B] items-center justify-center">
													<Feather name="check" size={15} color="#FFFFFF" />
												</View>
											)}
											{isActive && (
												<Image
													source={getLessonThumbnail(lesson.type)}
													className="w-[48px] h-[48px] rounded-lg bg-neutral-surface"
													contentFit="contain"
												/>
											)}
											{isLocked && (
												<Feather name="lock" size={20} color="#A1A1AA" />
											)}
										</View>
									</TouchableOpacity>
								);
							})}
						</View>
					) : (
						<View className="flex-1 items-center justify-center py-10 bg-white border border-[#E5E7EB] rounded-2xl">
							<Feather name="target" size={32} color="#9CA3AF" />
							<Text className="font-poppins-bold text-[16px] text-[#0C0F24] mt-3">
								Practice Exercises
							</Text>
							<Text className="font-poppins text-[13px] text-neutral-secondary mt-1 text-center px-6 leading-[18px]">
								Review vocabulary, spelling, and listening lessons from your current unit.
							</Text>
						</View>
					)}
				</View>
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
