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
import { useUser, useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Text, View, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import { units } from "@/data/units";
import { lessons } from "@/data/lessons";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { Lesson } from "@/types/learning";

// Helper function to return dynamic greeting based on selected language
const getGreeting = (langId: string, name: string) => {
	switch (langId) {
		case "es":
			return `¡Hola, ${name}!`;
		case "fr":
			return `Bonjour, ${name}!`;
		case "ja":
			return `こんにちは, ${name}!`;
		case "de":
			return `Hallo, ${name}!`;
		case "it":
			return `Ciao, ${name}!`;
		case "zh":
			return `你好, ${name}!`;
		case "ko":
			return `안녕하세요, ${name}!`;
		case "ar":
			return `مرحباً ${name}!`;
		default:
			return `Hello, ${name}!`;
	}
};

// Fallback generator for languages without predefined lessons/units in database
const getLanguageUnitsAndLessons = (langId: string) => {
	const langUnits = units.filter((u) => u.languageId === langId);
	let langLessons = lessons.filter((l) => langUnits.some((u) => u.id === l.unitId));

	if (langUnits.length === 0) {
		const selectedLang = languages.find((lang) => lang.id === langId) || { name: "Foreign Language" };
		const defaultUnitId = `${langId}_unit_1`;
		const mockUnits = [
			{
				id: defaultUnitId,
				languageId: langId,
				title: `Unit 1: Basics of ${selectedLang.name}`,
				description: `Start learning basic vocabulary, greetings, and useful everyday expressions in ${selectedLang.name}.`,
				order: 1,
			},
		];

		const mockLessons = [
			{
				id: `${langId}_u1_l1`,
				unitId: defaultUnitId,
				title: "Essential Greetings",
				description: `Learn how to say hello, goodbye, and thank you in ${selectedLang.name}.`,
				type: "vocabulary" as const,
				order: 1,
				xpReward: 10,
				durationMinutes: 3,
				goals: ["Say hello and goodbye", "Express gratitude", "Understand basic politeness"],
				activities: [],
			},
			{
				id: `${langId}_u1_l2`,
				unitId: defaultUnitId,
				title: "AI Teacher: Introductions",
				description: `Join your AI teacher to learn how to introduce yourself.`,
				type: "video" as const,
				order: 2,
				xpReward: 20,
				durationMinutes: 5,
				goals: ["State your own name", "Ask for someone's name", "Say nice to meet you"],
				activities: [],
			},
			{
				id: `${langId}_u1_l3`,
				unitId: defaultUnitId,
				title: "AI Chat: First Conversation",
				description: `Chat with your AI partner to practice your greetings and introduction.`,
				type: "chat" as const,
				order: 3,
				xpReward: 15,
				durationMinutes: 4,
				goals: ["Introduce yourself in conversation", "Respond to simple questions"],
				activities: [],
			},
		];

		return { units: mockUnits, lessons: mockLessons };
	}

	return { units: langUnits, lessons: langLessons };
};

export default function HomeScreen() {
	const router = useRouter();
	const { signOut } = useAuth();
	const { user } = useUser();
	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const clearStorage = useLanguageStore((state) => state.clearStorage);

	// Progress state
	const completedLessons = useProgressStore((state) => state.completedLessons);
	const xp = useProgressStore((state) => state.xp);
	const streak = useProgressStore((state) => state.streak);
	const completeLesson = useProgressStore((state) => state.completeLesson);
	const resetProgress = useProgressStore((state) => state.resetProgress);

	// Active lesson modal state
	const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
	const [modalVisible, setModalVisible] = useState(false);

	// Get active language details
	const selectedLanguage = selectedLanguageId
		? languages.find((lang) => lang.id === selectedLanguageId) || null
		: null;

	if (!selectedLanguage) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 items-center justify-center p-6 bg-white">
					<Text className="h3 text-center text-neutral-primary mb-4">
						No language selected
					</Text>
					<TouchableOpacity
						onPress={() => router.replace("/languages")}
						className="btn-primary"
						activeOpacity={0.8}
					>
						<Text className="btn-primary-text">Select Language</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Fetch units and lessons for the current selected language
	const { units: activeUnits, lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguage.id);
	const currentUnit = activeUnits[0]; // Display Unit 1 as active by default

	// Calculate unit progress details
	const unitLessons = activeLessons.filter((l) => l.unitId === currentUnit.id);
	const completedCount = unitLessons.filter((l) => completedLessons.includes(l.id)).length;
	
	// Daily goal calculations (20 XP standard goal, 10 XP per lesson)
	const dailyGoalXp = 20;
	const currentXpProgress = completedCount * 10;
	const dailyGoalPercent = Math.min((currentXpProgress / dailyGoalXp) * 100, 100);

	// Find the next uncompleted lesson to recommend
	const nextLesson = unitLessons.find((l) => !completedLessons.includes(l.id)) || null;

	const handleOpenLesson = (lesson: Lesson) => {
		setSelectedLesson(lesson);
		setModalVisible(true);
	};

	const handleCompleteMockLesson = async () => {
		if (selectedLesson) {
			await completeLesson(selectedLesson.id, selectedLesson.xpReward);
			setModalVisible(false);
			setSelectedLesson(null);
		}
	};

	const handleSignOut = async () => {
		try {
			await signOut();
		} catch (err) {
			console.error("Failed to sign out:", err);
		}
	};

	const handleClearStorage = async () => {
		try {
			await resetProgress();
			await clearStorage();
		} catch (err) {
			console.error("Failed to clear storage:", err);
		}
	};

	// Determine icon based on lesson type
	const getLessonIcon = (type: string) => {
		switch (type) {
			case "video":
				return "headphones"; // Set to headphones to match 'AI Conversation' from designs
			case "chat":
				return "message-circle"; // Set to message to match 'New words' from designs
			default:
				return "book-open"; // Set to book for standard 'Lesson'
		}
	};

	// Determine theme colors based on lesson type
	const getLessonColors = (type: string) => {
		switch (type) {
			case "video":
				return { bg: "#F0EDFF", text: "#6C4EF5" }; // purple container
			case "chat":
				return { bg: "#FFF0ED", text: "#FF4D4F" }; // pink container
			default:
				return { bg: "#EBF3FF", text: "#4D8BFF" }; // blue container
		}
	};

	const displayName = user?.firstName || user?.username || "JavaScript";

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			{/* Top Navigation Bar - Matching Spain Spec Screenshot */}
			<View className="flex-row items-center justify-between px-4 pt-3 pb-2 bg-white border-b border-[#F3F4F6] z-10">
				{/* Left Stacked Language Picker */}
				<TouchableOpacity
					onPress={() => router.push("/languages")}
					activeOpacity={0.75}
					style={styles.languageStack}
				>
					<Image
						source={{ uri: selectedLanguage.flag }}
						style={{ width: 34, height: 34, borderRadius: 17 }}
						contentFit="cover"
					/>
					<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1 leading-[18px]">
						{selectedLanguage.name}
					</Text>
					<Feather name="chevron-down" size={13} color="#6B7280" style={{ marginTop: 2 }} />
				</TouchableOpacity>

				{/* Right Stats Badges & Avatar */}
				<View className="flex-row items-center gap-2">
					{/* Streak Capsule */}
					<View className="flex-row items-center bg-[#FFF8F2] border-[1.5px] border-[#FFEAD4] rounded-full px-[11px] py-[7px] gap-1">
						<Image
							source={images.streakFire}
							style={{ width: 14, height: 14 }}
							contentFit="contain"
						/>
						<Text className="font-poppins-bold text-[13px] text-streak">{streak}</Text>
					</View>

					{/* XP Capsule */}
					<View className="flex-row items-center bg-[#F0EDFF] border-[1.5px] border-[#E1D9FF] rounded-full px-[11px] py-[7px] gap-1">
						<Feather name="zap" size={13} color="#6C4EF5" />
						<Text className="font-poppins-bold text-[13px] text-lingua-purple">{xp} XP</Text>
					</View>

					{/* Circular Avatar Outline & Letter Inner */}
					<View className="w-[38px] h-[38px] rounded-full border-[1.5px] border-lingua-purple items-center justify-center">
						<View className="w-8 h-8 rounded-full bg-[#C2185B] items-center justify-center">
							<Text className="font-poppins-bold text-[13px] text-white">
								{displayName ? displayName[0].toUpperCase() : "J"}
							</Text>
						</View>
					</View>
				</View>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Welcome greeting matching screenshot */}
				<View className="flex-row items-center justify-between mb-5">
					<View className="flex-row items-center flex-1 mr-2">
						<Image
							source={{ uri: selectedLanguage.flag }}
							style={{ width: 30, height: 30, borderRadius: 15 }}
							contentFit="cover"
						/>
						<Text className="font-poppins-bold text-[18px] text-neutral-primary ml-2 leading-[22px]">
							{getGreeting(selectedLanguage.id, displayName)} 👋
						</Text>
					</View>
					
					<View className="flex-row items-center gap-2.5">
						<View className="flex-row items-center">
							<Image
								source={images.streakFire}
								style={{ width: 16, height: 16 }}
								contentFit="contain"
							/>
							<Text className="font-poppins-bold text-[14px] text-[#FF8A00] ml-1">
								{streak}
							</Text>
						</View>
						<TouchableOpacity activeOpacity={0.7} className="p-1">
							<Feather name="bell" size={18} color="#0D132B" />
						</TouchableOpacity>
					</View>
				</View>

				{/* Daily Goal Card */}
				<View className="bg-[#FFF8F2] border-[1.5px] border-[#FFEAD4] rounded-[20px] p-4 flex-row items-center justify-between mb-4">
					<View className="flex-1 mr-4">
						<Text className="font-poppins-medium text-[13px] text-neutral-secondary">
							Daily goal
						</Text>
						<Text className="font-poppins-bold text-[24px] text-neutral-primary mt-1">
							{currentXpProgress} <Text className="font-poppins text-[13px] text-neutral-secondary">/ {dailyGoalXp} XP</Text>
						</Text>
						<View className="h-2 bg-[#EBF0F3] rounded-full w-[180px] mt-2 overflow-hidden">
							<View
								style={{ width: `${dailyGoalPercent}%` }}
								className="h-full bg-streak rounded-full"
							/>
						</View>
					</View>
					<Image
						source={images.treasure}
						style={{ width: 68, height: 68 }}
						contentFit="contain"
					/>
				</View>

				{/* Continue learning purple card */}
				<View className="bg-lingua-purple rounded-[24px] p-5 flex-row items-center justify-between mb-5">
					<View className="flex-1 mr-4">
						<Text className="font-poppins-semibold text-[11px] text-[#F0EDFF] uppercase tracking-[0.5px]">
							Continue learning
						</Text>
						<Text className="font-poppins-bold text-[22px] text-white mt-1">
							{selectedLanguage.name}
						</Text>
						<Text className="font-poppins text-[12px] text-[#F0EDFF] mt-0.5">
							A1 • Unit 1
						</Text>
						{nextLesson ? (
							<TouchableOpacity
								style={styles.continueBtn}
								activeOpacity={0.85}
								onPress={() => handleOpenLesson(nextLesson)}
							>
								<Text className="font-poppins-bold text-[13px] text-lingua-purple">
									Continue
								</Text>
							</TouchableOpacity>
						) : (
							<View className="mt-4 bg-[#21C16B] rounded-xl py-2 px-3 self-start flex-row items-center">
								<Feather name="award" size={14} color="#FFFFFF" />
								<Text className="font-poppins-bold text-[11px] text-white ml-1.5">
									Unit Completed!
								</Text>
							</View>
						)}
					</View>
					<Image
						source={images.palace}
						style={{ width: 88, height: 88 }}
						contentFit="contain"
					/>
				</View>

				{/* Today's plan header */}
				<View className="flex-row items-center justify-between mb-3">
					<Text className="font-poppins-bold text-[17px] text-neutral-primary">
						Today&apos;s plan
					</Text>
					<TouchableOpacity activeOpacity={0.7}>
						<Text className="font-poppins-semibold text-[13px] text-lingua-blue">
							View all
						</Text>
					</TouchableOpacity>
				</View>

				{/* Today's Plan list of lessons */}
				<View className="mb-4">
					{unitLessons.map((item, index) => {
						const isCompleted = completedLessons.includes(item.id);
						const iconName = getLessonIcon(item.type);
						const colors = getLessonColors(item.type);

						// Match titles like 'Lesson', 'AI Conversation', or 'New words' from screen
						let itemDisplayTitle = "Lesson";
						if (item.type === "video") itemDisplayTitle = "AI Conversation";
						if (item.type === "chat") itemDisplayTitle = "New words";

						return (
							<TouchableOpacity
								key={item.id}
								onPress={() => handleOpenLesson(item)}
								activeOpacity={0.8}
								style={[
									styles.planCard,
									{
										borderColor: "#F0F0F0",
									},
								]}
							>
								{/* Type indicator icon container */}
								<View
									style={{ backgroundColor: colors.bg }}
									className="w-[38px] h-[38px] rounded-full items-center justify-center"
								>
									<Feather name={iconName} size={18} color={colors.text} />
								</View>

								{/* Lesson titles */}
								<View className="flex-1 ml-3.5 mr-2">
									<Text className="font-poppins-bold text-[14px] text-neutral-primary">
										{itemDisplayTitle}
									</Text>
									<Text className="font-poppins text-[11px] text-neutral-secondary mt-0.5">
										{item.title}
									</Text>
								</View>

								{/* Completion check outline/solid status */}
								{isCompleted ? (
									<View className="w-[22px] h-[22px] rounded-full bg-lingua-blue items-center justify-center">
										<Feather name="check" size={12} color="#FFFFFF" />
									</View>
								) : (
									<View className="w-[22px] h-[22px] rounded-full border-[1.5px] border-neutral-border bg-white" />
								)}
							</TouchableOpacity>
						);
					})}
				</View>

				{/* Settings & actions at the bottom */}
				<View className="divider mb-5" />
				<View className="rounded-2xl p-4 border border-neutral-border bg-[#F6F7FB]">
					<Text className="font-poppins-bold text-[12px] text-neutral-primary mb-2">
						Developer Options
					</Text>
					<View className="flex-row flex-wrap gap-2">
						<TouchableOpacity
							onPress={handleClearStorage}
							style={styles.devButton}
							activeOpacity={0.7}
						>
							<Feather name="refresh-cw" size={12} color="#6B7280" />
							<Text className="font-poppins-semibold text-[11px] text-neutral-secondary ml-1">
								Reset Progress
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={handleSignOut}
							style={styles.devButton}
							activeOpacity={0.7}
						>
							<Feather name="log-out" size={12} color="#6B7280" />
							<Text className="font-poppins-semibold text-[11px] text-neutral-secondary ml-1">
								Sign Out
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>

			{/* Interactive Lesson details modal */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<Pressable
					style={styles.modalContainer}
					onPress={() => setModalVisible(false)}
				>
					<Pressable
						style={styles.modalContent}
						onPress={(e) => e.stopPropagation()}
					>
						{/* Close button */}
						<TouchableOpacity
							onPress={() => setModalVisible(false)}
							style={styles.modalCloseButton}
							activeOpacity={0.7}
						>
							<Feather name="x" size={18} color="#0D132B" />
						</TouchableOpacity>

						{selectedLesson && (
							<View>
								<Image
									source={{ uri: `https://picsum.photos/seed/${selectedLesson.id}/400/200` }}
									className="w-full h-[140px] rounded-[14px] mb-3.5"
									contentFit="cover"
								/>

								<View className="flex-row items-center gap-2 mb-2">
									<View
										style={{
											width: 28,
											height: 28,
											borderRadius: 14,
											backgroundColor: getLessonColors(selectedLesson.type).bg,
										}}
										className="items-center justify-center"
									>
										<Feather
											name={getLessonIcon(selectedLesson.type)}
											size={13}
											color={getLessonColors(selectedLesson.type).text}
										/>
									</View>
									<Text className="font-poppins-bold text-[11px] text-neutral-secondary uppercase tracking-[0.5px]">
										{selectedLesson.type} Lesson
									</Text>
								</View>

								<Text className="font-poppins-bold text-[20px] text-neutral-primary leading-[25px] mb-1.5">
									{selectedLesson.title}
								</Text>
								<Text className="font-poppins text-[13px] text-neutral-secondary leading-[19px] mb-4">
									{selectedLesson.description}
								</Text>

								{/* Details metadata */}
								<View className="flex-row bg-neutral-surface border border-neutral-border rounded-xl p-3 mb-4 justify-around">
									<View className="items-center">
										<Feather name="clock" size={15} color="#6B7280" />
										<Text className="font-poppins-bold text-[13px] text-neutral-primary mt-0.5">
											{selectedLesson.durationMinutes} mins
										</Text>
										<Text className="font-poppins text-[10px] text-neutral-secondary">
											Duration
										</Text>
									</View>
									<View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
									<View className="items-center">
										<Feather name="zap" size={15} color="#FF8A00" />
										<Text className="font-poppins-bold text-[13px] text-neutral-primary mt-0.5">
											{selectedLesson.xpReward} XP
										</Text>
										<Text className="font-poppins text-[10px] text-neutral-secondary">
											XP Reward
										</Text>
									</View>
								</View>

								{/* Goals */}
								{selectedLesson.goals && selectedLesson.goals.length > 0 && (
									<View className="mb-5">
										<Text className="font-poppins-bold text-[13px] text-neutral-primary mb-2">
											Learning Goals
										</Text>
										{selectedLesson.goals.map((goal, idx) => (
											<View key={idx} className="flex-row items-start mb-1.5">
												<Feather
													name="check-circle"
													size={14}
													color="#21C16B"
													style={{ marginTop: 2 }}
												/>
												<Text className="font-poppins text-[12px] text-neutral-primary ml-2 flex-1 leading-[16px]">
													{goal}
												</Text>
											</View>
										))}
									</View>
								)}

								{/* CTA Actions */}
								<View className="gap-2.5">
									<TouchableOpacity
										onPress={() => {
											setModalVisible(false);
											router.push(`/lesson/${selectedLesson.id}` as any);
										}}
										style={[styles.modalStartBtn, { backgroundColor: "#6C4EF5" }]}
										activeOpacity={0.85}
									>
										<Text className="font-poppins-bold text-[15px] text-white">
											Start Lesson
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={handleCompleteMockLesson}
										style={styles.modalMockBtn}
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
	languageStack: {
		alignItems: "flex-start",
		justifyContent: "center",
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 28,
	},
	continueBtn: {
		backgroundColor: "#FFFFFF",
		borderRadius: 14,
		paddingHorizontal: 22,
		paddingVertical: 8,
		alignSelf: "flex-start",
		marginTop: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	planCard: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 18,
		padding: 14,
		marginBottom: 10,
		borderWidth: 1.5,
		backgroundColor: "#FFFFFF",
	},
	devButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
		borderColor: "#E5E7EB",
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	modalContainer: {
		flex: 1,
		backgroundColor: "rgba(13, 19, 43, 0.4)",
		justifyContent: "flex-end",
	},
	modalContent: {
		backgroundColor: "#FFFFFF",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		paddingBottom: Platform.OS === "ios" ? 36 : 20,
		maxHeight: "85%",
	},
	modalCloseButton: {
		position: "absolute",
		right: 16,
		top: 16,
		padding: 6,
		backgroundColor: "#F6F7FB",
		borderRadius: 9999,
		zIndex: 10,
	},
	modalStartBtn: {
		borderRadius: 14,
		height: 50,
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
	},
	modalMockBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 14,
		height: 46,
		borderWidth: 1.5,
		borderColor: "#6C4EF5",
		backgroundColor: "#FBFBFF",
		width: "100%",
	},
});
