import React, { useState, useRef, useEffect } from "react";
import {
	StyleSheet,
	Modal,
	Platform,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Text, View, Pressable, ScrollView, TouchableOpacity } from "@/tw";
import { languages } from "@/data/languages";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { Lesson, Unit } from "@/types/learning";
import { usePostHog } from "posthog-react-native";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { blurActiveElement } from "@/utils/dom";
import Button3D from "@/components/Button3D";
import LessonNode from "@/components/LessonNode";
import LessonTeachingPreview from "@/components/LessonTeachingPreview";
import UnitBanner from "@/components/UnitBanner";
import PathConnector from "@/components/PathConnector";

const { width: screenWidth } = Dimensions.get("window");
const POSITIONS = ["center", "right", "right", "center", "left", "left"];

const getXOffset = (position: string, nodeSize: number) => {
	if (position === "right") return screenWidth * 0.72 - nodeSize / 2;
	if (position === "left") return screenWidth * 0.28 - nodeSize / 2;
	return screenWidth * 0.5 - nodeSize / 2;
};

const getNodeState = (
	lesson: Lesson,
	unit: Unit,
	allLessons: Lesson[],
	allUnits: Unit[],
	completedIds: string[],
	completedCheckpoints: string[]
) => {
	if (completedCheckpoints.includes(lesson.unitId)) {
		return "completed";
	}
	if (!lesson.isCheckpoint && completedIds.includes(lesson.id)) return "completed";

	const unitIndex = allUnits.findIndex((item) => item.id === unit.id);
	const previousUnitsComplete = allUnits
		.slice(0, Math.max(unitIndex, 0))
		.every((item) => completedCheckpoints.includes(item.id));

	if (!previousUnitsComplete) return "locked";

	if (lesson.isCheckpoint) {
		const unitLessons = allLessons.filter(
			(l) => l.unitId === lesson.unitId && !l.isCheckpoint
		);
		const allDone = unitLessons.length > 0 && unitLessons.every((l) => completedIds.includes(l.id));
		return allDone ? "checkpoint" : "locked";
	}

	const unitLessons = allLessons
		.filter((l) => l.unitId === lesson.unitId && !l.isCheckpoint)
		.sort((a, b) => a.order - b.order);
	const firstUncompleted = unitLessons.find(
		(l) => !completedIds.includes(l.id) && !l.isCheckpoint
	);
	if (firstUncompleted?.id === lesson.id) return "active";
	return "locked";
};

export default function LearnScreen() {
	const router = useRouter();
	const posthog = usePostHog();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completedLessonIds = useProgressStore((state) => state.completedLessonIds) || [];
	const completeLearningSession = useProgressStore((state) => state.completeLearningSession);
	const completedCheckpoints = useProgressStore((state) => state.completedCheckpoints) || [];
	const recentMistakes = useProgressStore((state) => state.recentMistakes) || [];

	const [activeTab, setActiveTab] = useState<"lessons" | "practice">("lessons");
	const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
	const [selectedCheckpointUnit, setSelectedCheckpointUnit] = useState<Unit | null>(null);
	const [isCheckpointSelected, setIsCheckpointSelected] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [isBookmarked, setIsBookmarked] = useState(false);

	const unitLayouts = useRef<{ [key: string]: number }>({});
	const [activeUnitInHeader, setActiveUnitInHeader] = useState<Unit | null>(null);

	// Resolve selected language object
	const selectedLanguage = languages.find((l) => l.id === selectedLanguageId) || languages[0];

	// Fetch units and lessons for the current selected language
	const { units: activeUnits, lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguage.id);
	
	// Dynamic current unit resolution based on checkpoints completed
	const currentUnit = activeUnits.find((u) => !completedCheckpoints.includes(u.id)) || activeUnits[activeUnits.length - 1];
	const selectedLessonUnit = selectedLesson
		? activeUnits.find((unit) => unit.id === selectedLesson.unitId)
		: undefined;

	// Set initial sticky unit
	useEffect(() => {
		if (currentUnit) {
			setActiveUnitInHeader(currentUnit);
		}
	}, [currentUnit]);

	const getUnitProgressFraction = (unit: Unit) => {
		const unitLessons = activeLessons.filter((l) => l.unitId === unit.id && !l.isCheckpoint);
		const completedCount = unitLessons.filter((l) => completedLessonIds.includes(l.id)).length;
		return `${completedCount}/${unitLessons.length}`;
	};

	const handleScroll = (event: any) => {
		const scrollY = event.nativeEvent.contentOffset.y;
		let currentActive = activeUnits[0];
		let maxPassedY = -1;
		for (const unit of activeUnits) {
			const y = unitLayouts.current[unit.id] || 0;
			if (scrollY >= y - 100 && y > maxPassedY) {
				currentActive = unit;
				maxPassedY = y;
			}
		}
		if (currentActive && currentActive.id !== activeUnitInHeader?.id) {
			setActiveUnitInHeader(currentActive);
		}
	};

	const handleOpenCheckpoint = (unit: Unit) => {
		posthog.screen("checkpoint_detail_modal", {
			unit_id: unit.id,
			language_id: selectedLanguageId,
		});
		setSelectedCheckpointUnit(unit);
		setIsCheckpointSelected(true);
		setModalVisible(true);
	};

	const handleOpenLesson = (lesson: Lesson) => {
		posthog.screen("lesson_detail_modal", {
			lesson_id: lesson.id,
			lesson_title: lesson.title,
			lesson_type: lesson.type,
		});
		setSelectedLesson(lesson);
		setModalVisible(true);
	};

	const handleStartPractice = (lesson: Lesson) => {
		posthog.capture("lesson_practice_started", {
			lesson_id: lesson.id,
			lesson_title: lesson.title,
			lesson_type: lesson.type,
			language_id: selectedLanguageId,
		});
		setModalVisible(false);
		setSelectedLesson(null);
		router.push({
			pathname: "/exercise-session",
			params: { lessonId: lesson.id },
		});
	};

	const handleStartAiTeacher = (lesson: Lesson) => {
		posthog.capture("lesson_started", {
			lesson_id: lesson.id,
			lesson_title: lesson.title,
			lesson_type: lesson.type,
			language_id: selectedLanguageId,
		});
		setModalVisible(false);
		setSelectedLesson(null);
		router.push(`/lesson/${lesson.id}` as any);
	};

	const handleCompleteMockLesson = async () => {
		if (selectedLesson) {
			try {
				await completeLearningSession({
					sessionType: "mock-lesson",
					xpEarned: selectedLesson.xpReward,
					score: 100,
					plannedCorrectCount: 1,
					plannedExerciseCount: 1,
					practicedLessonIds: [selectedLesson.id],
					completedLessonId: selectedLesson.id,
					passed: true,
				});
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

	const handleCompleteMockCheckpoint = async () => {
		const checkpointUnit = selectedCheckpointUnit || currentUnit;
		if (!checkpointUnit) return;

		try {
			const checkpointLessonIds = activeLessons
				.filter((lesson) => lesson.unitId === checkpointUnit.id && !lesson.isCheckpoint)
				.map((lesson) => lesson.id);
			await completeLearningSession({
				sessionType: "mock-checkpoint",
				xpEarned: 50,
				score: 100,
				plannedCorrectCount: 5,
				plannedExerciseCount: 5,
				practicedLessonIds: checkpointLessonIds,
				checkpointUnitId: checkpointUnit.id,
				passed: true,
			});
			posthog.capture("checkpoint_completed", {
				unit_id: checkpointUnit.id,
				language_id: selectedLanguageId,
				xp_earned: 50,
				method: "mock",
			});
			setModalVisible(false);
			setIsCheckpointSelected(false);
			setSelectedCheckpointUnit(null);
		} catch (err) {
			console.error("Failed to complete mock checkpoint:", err);
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
							Unit {currentUnit?.order || 1} • {getUnitProgressFraction(currentUnit)} lessons
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

			{/* Tab Selector */}
			<View className="px-5 pt-4 bg-[#F6F7FB]">
				<View className="flex-row bg-[#EAE8F5] rounded-3xl p-1.5 mb-2">
					<TouchableOpacity
						onPress={() => setActiveTab("lessons")}
						activeOpacity={0.8}
						className="flex-1 h-[46px] items-center justify-center rounded-2xl"
						style={activeTab === "lessons" ? styles.tabActive : null}
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
						style={activeTab === "practice" ? styles.tabActive : null}
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
			</View>

			{/* Sticky Unit Header */}
			{activeTab === "lessons" && activeUnitInHeader && (
				<View style={styles.stickyHeader}>
					<View style={styles.stickyHeaderInner}>
						<View
							style={[
								styles.colorDot,
								{ backgroundColor: activeUnitInHeader.unitColor || "#58CC02" },
							]}
						/>
						<Text
							className="font-poppins-bold text-[14px] text-neutral-primary flex-1 mr-2"
							numberOfLines={1}
						>
							{activeUnitInHeader.title}
						</Text>
						<Text className="font-poppins-semibold text-[12px] text-neutral-secondary">
							{getUnitProgressFraction(activeUnitInHeader)} Completed
						</Text>
					</View>
				</View>
			)}

			{/* Tab Contents */}
			{activeTab === "lessons" ? (
				<ScrollView
					className="flex-1 bg-[#F6F7FB]"
					showsVerticalScrollIndicator={false}
					scrollEventThrottle={16}
					onScroll={handleScroll}
					contentContainerStyle={{ paddingTop: activeUnitInHeader ? 50 : 0, paddingBottom: 80 }}
				>
					{activeUnits.map((unit, unitIdx) => {
						const unitLessons = activeLessons
							.filter((l) => l.unitId === unit.id)
							.sort((a, b) => a.order - b.order);
						const totalNodes = unitLessons.length;
						const containerHeight = totalNodes * 96 + 20;

						return (
							<View
								key={unit.id}
								onLayout={(event) => {
									unitLayouts.current[unit.id] = event.nativeEvent.layout.y;
								}}
								style={{ minHeight: containerHeight + 110, marginBottom: 16 }}
							>
								<UnitBanner unit={unit} unitNumber={unitIdx + 1} />

								<View style={{ height: containerHeight, position: "relative", width: "100%" }}>
									{unitLessons.map((lesson, idx) => {
										const globalIdx = activeLessons.findIndex((l) => l.id === lesson.id);
										const position = POSITIONS[globalIdx % POSITIONS.length];
										const isNodeCheckpoint = lesson.isCheckpoint;
										const nodeSize = isNodeCheckpoint ? 76 : 64;

										const x = getXOffset(position, nodeSize);
										const y = idx * 96 + 10;

										const nodeState = getNodeState(
											lesson,
											unit,
											activeLessons,
											activeUnits,
											completedLessonIds,
											completedCheckpoints
										);

										// Render connector to the next node in the same unit
										let connector = null;
										if (idx < totalNodes - 1) {
											const nextLesson = unitLessons[idx + 1];
											const nextGlobalIdx = activeLessons.findIndex((l) => l.id === nextLesson.id);
											const nextPosition = POSITIONS[nextGlobalIdx % POSITIONS.length];
											const nextNodeSize = nextLesson.isCheckpoint ? 76 : 64;
											const nextX = getXOffset(nextPosition, nextNodeSize);
											const connectorCompleted = completedLessonIds.includes(lesson.id);

											connector = (
												<PathConnector
													key={`conn-${lesson.id}`}
													completed={connectorCompleted}
													unitColor={unit.unitColor || "#58CC02"}
													currentX={x}
													nextX={nextX}
													currentY={y}
													nodeSize={nodeSize}
												/>
											);
										}

										return (
											<React.Fragment key={lesson.id}>
												{connector}
												<View
													style={{
														position: "absolute",
														left: x,
														top: y,
														alignItems: "center",
														width: nodeSize,
													}}
												>
													<LessonNode
														lesson={lesson}
														state={nodeState}
														unitColor={unit.unitColor || "#58CC02"}
														onPress={() => {
															if (nodeState === "locked") return;
															if (lesson.isCheckpoint) {
																handleOpenCheckpoint(unit);
															} else {
																handleOpenLesson(lesson);
															}
														}}
													/>
												</View>
											</React.Fragment>
										);
									})}
								</View>
							</View>
						);
					})}
				</ScrollView>
			) : (
				<ScrollView
					className="flex-1 bg-[#F6F7FB]"
					contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
					showsVerticalScrollIndicator={false}
				>
					<View className="gap-4 mb-6">
						{/* Mistakes Review Card */}
						<TouchableOpacity
							disabled={recentMistakes.length === 0}
							onPress={() => {
								posthog.capture("mistakes_practice_started", {
									mistakes_count: recentMistakes.length,
									language_id: selectedLanguageId,
								});
								router.push({
									pathname: "/exercise-session",
									params: { lessonId: activeLessons[0].id, mode: "mistakes" },
								});
							}}
							activeOpacity={0.85}
							className={`p-5 rounded-2xl border-2 flex-row items-center justify-between ${
								recentMistakes.length > 0
									? "border-[#FF4B4B] bg-[#FFF5F5]"
									: "border-neutral-border bg-white opacity-80"
							}`}
							style={{
								borderBottomWidth: 5,
								borderBottomColor: recentMistakes.length > 0 ? "#EA2B2B" : "#C5C7CB",
							}}
						>
							<View className="flex-row items-center flex-1 mr-3">
								<View
									className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${
										recentMistakes.length > 0 ? "bg-[#FF4B4B]" : "bg-neutral-border"
									}`}
								>
									<Feather name="alert-circle" size={24} color="#FFFFFF" />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] text-neutral-primary">
										Mistakes Review
									</Text>
									<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
										{recentMistakes.length > 0
											? `Correct the ${recentMistakes.length} exercise${
													recentMistakes.length > 1 ? "s" : ""
											  } you got wrong.`
											: "Clean slate! No mistakes to correct."}
									</Text>
								</View>
							</View>
							{recentMistakes.length > 0 ? (
								<View className="bg-[#FF4B4B] px-3 py-1.5 rounded-full">
									<Text className="font-poppins-bold text-[11px] text-white">START</Text>
								</View>
							) : (
								<Feather name="check" size={22} color="#21C16B" />
							)}
						</TouchableOpacity>

						{/* Vocabulary builder Card */}
						<TouchableOpacity
							onPress={() => {
								posthog.capture("vocab_practice_started", {
									language_id: selectedLanguageId,
								});
								router.push({
									pathname: "/exercise-session",
									params: { lessonId: activeLessons[0].id, mode: "vocabulary" },
								});
							}}
							activeOpacity={0.85}
							className="p-5 rounded-2xl border-2 flex-row items-center justify-between border-[#FFC800] bg-[#FFFFF0]"
							style={{
								borderBottomWidth: 5,
								borderBottomColor: "#E6B400",
							}}
						>
							<View className="flex-row items-center flex-1 mr-3">
								<View className="w-12 h-12 rounded-2xl bg-[#FFC800] items-center justify-center mr-4">
									<Feather name="book-open" size={24} color="#FFFFFF" />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] text-neutral-primary">
										Vocabulary Quiz
									</Text>
									<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
										Practice matching and typing vocabulary from this unit.
									</Text>
								</View>
							</View>
							<View className="bg-[#FFC800] px-3 py-1.5 rounded-full">
								<Text className="font-poppins-bold text-[11px] text-white">START</Text>
							</View>
						</TouchableOpacity>

						{/* Listening Hub Card */}
						<TouchableOpacity
							onPress={() => {
								posthog.capture("listening_practice_started", {
									language_id: selectedLanguageId,
								});
								router.push({
									pathname: "/exercise-session",
									params: { lessonId: activeLessons[0].id, mode: "listening" },
								});
							}}
							activeOpacity={0.85}
							className="p-5 rounded-2xl border-2 flex-row items-center justify-between border-[#1CB0F6] bg-[#F2F9FF]"
							style={{
								borderBottomWidth: 5,
								borderBottomColor: "#1899D6",
							}}
						>
							<View className="flex-row items-center flex-1 mr-3">
								<View className="w-12 h-12 rounded-2xl bg-[#1CB0F6] items-center justify-center mr-4">
									<Feather name="headphones" size={24} color="#FFFFFF" />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] text-neutral-primary">
										Listening Hub
									</Text>
									<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
										Fine-tune your ear with audio dictation drills.
									</Text>
								</View>
							</View>
							<View className="bg-[#1CB0F6] px-3 py-1.5 rounded-full">
								<Text className="font-poppins-bold text-[11px] text-white">START</Text>
							</View>
						</TouchableOpacity>
					</View>
				</ScrollView>
			)}
			{/* Bottom Details Modal (consistent with Home Screen) */}
			<Modal
				visible={modalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => {
					setModalVisible(false);
					setSelectedLesson(null);
					setIsCheckpointSelected(false);
					setSelectedCheckpointUnit(null);
				}}
			>
				<Pressable
					className="flex-1 justify-end bg-black/40"
					onPress={() => {
						setModalVisible(false);
						setSelectedLesson(null);
						setIsCheckpointSelected(false);
						setSelectedCheckpointUnit(null);
					}}
				>
					<Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
						<TouchableOpacity
							className="absolute right-[18px] top-[18px] p-1.5 bg-[#F6F7FB] rounded-full z-10"
							onPress={() => {
								setModalVisible(false);
								setSelectedLesson(null);
								setIsCheckpointSelected(false);
								setSelectedCheckpointUnit(null);
							}}
							activeOpacity={0.7}
						>
							<Feather name="x" size={18} color="#6B7280" />
						</TouchableOpacity>

						<ScrollView
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{ paddingBottom: 4 }}
						>
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

								<View className="mb-6">
									<LessonTeachingPreview
										lesson={selectedLesson}
										unit={selectedLessonUnit}
									/>
								</View>

								{/* CTA Actions */}
								<View className="gap-2.5 mt-2">
									<Button3D
										onPress={() => handleStartPractice(selectedLesson)}
										variant="primary"
									>
										Start Practice
									</Button3D>

									<Button3D
										onPress={() => handleStartAiTeacher(selectedLesson)}
										variant="ghost"
									>
										AI Teacher
									</Button3D>

									<Button3D
										onPress={handleCompleteMockLesson}
										variant="gray"
									>
										Mock Complete (Earn XP)
									</Button3D>
								</View>
							</View>
						)}

						{isCheckpointSelected && (
							<View className="pt-2">
								{/* Type indicator */}
								<View className="flex-row items-center mb-2">
									<View className="bg-neutral-surface px-2.5 py-1 rounded-full border border-neutral-border flex-row items-center">
										<Feather
											name="award"
											size={12}
											color="#FFC800"
										/>
										<Text className="font-poppins-semibold text-[10px] text-warning uppercase tracking-wider ml-1">
											Checkpoint
										</Text>
									</View>
								</View>

								{/* Title / Description */}
								<Text className="font-poppins-bold text-[22px] text-neutral-primary leading-[28px] mb-2.5">
									Unit Checkpoint Quiz
								</Text>
								<Text className="font-poppins text-[13px] text-neutral-secondary leading-[20px] mb-5">
									Complete this quiz to prove your mastery of {(selectedCheckpointUnit || currentUnit)?.title.split(":")[1]?.trim() || (selectedCheckpointUnit || currentUnit)?.title || "Introductions & Basics"} and unlock the next unit. No hints, no translations!
								</Text>

								{/* Stat badges */}
								<View className="flex-row bg-[#F6F7FB] border border-[#E5E7EB] rounded-2xl p-4 justify-around mb-6">
									<View className="items-center">
										<Feather name="clock" size={16} color="#6B7280" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1">
											5 mins
										</Text>
										<Text className="font-poppins text-[10px] text-neutral-secondary uppercase tracking-wider mt-0.5">
											Duration
										</Text>
									</View>
									<View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
									<View className="items-center">
										<Feather name="zap" size={16} color="#FFC800" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1">
											50 XP
										</Text>
										<Text className="font-poppins text-[10px] text-neutral-secondary uppercase tracking-wider mt-0.5">
											XP Reward
										</Text>
									</View>
								</View>

								{/* Goals */}
								<View className="mb-6">
									<Text className="font-poppins-bold text-[13px] text-neutral-primary uppercase tracking-wider mb-2.5">
										Quiz Rules
									</Text>
									<View className="flex-row items-start mb-2">
										<Feather
											name="check-circle"
											size={14}
											color="#21C16B"
											style={{ marginTop: 2.5 }}
										/>
										<Text className="font-poppins text-[12px] text-neutral-primary ml-2.5 flex-1 leading-[18px]">
											Translational word guides are disabled
										</Text>
									</View>
									<View className="flex-row items-start mb-2">
										<Feather
											name="check-circle"
											size={14}
											color="#21C16B"
											style={{ marginTop: 2.5 }}
										/>
										<Text className="font-poppins text-[12px] text-neutral-primary ml-2.5 flex-1 leading-[18px]">
											Tests all vocabulary learned in this unit
										</Text>
									</View>
								</View>

								{/* CTA Actions */}
								<View className="gap-2.5 mt-2">
									<Button3D
										onPress={() => {
											posthog.capture("checkpoint_started", {
												unit_id: (selectedCheckpointUnit || currentUnit)?.id,
												language_id: selectedLanguageId,
											});
											setModalVisible(false);
											setIsCheckpointSelected(false);
											const checkpointUnit = selectedCheckpointUnit || currentUnit;
											if (!checkpointUnit) return;
											const checkpointUnitLessons = activeLessons.filter((lesson) => lesson.unitId === checkpointUnit.id);
											const fallbackLessonId = checkpointUnitLessons[checkpointUnitLessons.length - 1]?.id ?? activeLessons[0]?.id ?? "";
											setSelectedCheckpointUnit(null);
											router.push({
												pathname: "/exercise-session",
												params: {
													mode: "checkpoint",
													unitId: checkpointUnit.id,
													lessonId: fallbackLessonId,
												},
											});
										}}
										variant="warning"
									>
										Start Checkpoint
									</Button3D>

									<Button3D
										onPress={handleCompleteMockCheckpoint}
										variant="gray"
									>
										Mock Complete Checkpoint
									</Button3D>
								</View>
							</View>
						)}
						</ScrollView>
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
	pathNode: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 1.5,
		borderColor: "rgba(255, 255, 255, 0.25)",
		borderBottomWidth: 6,
		alignItems: "center",
		justifyContent: "center",
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	stickyHeader: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 50,
		backgroundColor: "#FFFFFF",
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 3,
			},
			android: {
				elevation: 2,
			},
			web: {
				boxShadow: "0px 2px 3px rgba(13, 19, 43, 0.05)",
			} as any,
		}),
	},
	stickyHeaderInner: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E5E5",
	},
	colorDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginRight: 8,
	},
});
