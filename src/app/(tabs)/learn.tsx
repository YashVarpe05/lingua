import React, { useState, useRef, useEffect } from "react";
import {
	StyleSheet,
	Modal,
	Platform,
	Dimensions,
	Alert,
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
import { Lesson, Unit } from "@/types/learning";
import { usePostHog } from "posthog-react-native";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { blurActiveElement } from "@/utils/dom";
import { getCurriculumReviewLabel } from "@/data/curriculum";
import Button3D from "@/components/Button3D";
import LessonNode from "@/components/LessonNode";
import LessonTeachingPreview from "@/components/LessonTeachingPreview";
import UnitBanner from "@/components/UnitBanner";
import PathConnector, { type PathConnectorState } from "@/components/PathConnector";

const { width: screenWidth } = Dimensions.get("window");
const POSITIONS = ["center", "right", "right", "center", "left", "left"];
const SCROLL_TOP_PADDING = 8;
const PATH_NODE_SIZE = 71;

const getXOffset = (position: string, nodeSize: number) => {
	if (position === "right") return screenWidth * 0.72 - nodeSize / 2;
	if (position === "left") return screenWidth * 0.28 - nodeSize / 2;
	return screenWidth * 0.5 - nodeSize / 2;
};

const withAlpha = (color: string, alpha: string, fallback: string) => {
	if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
		return `${color}${alpha}`;
	}
	return fallback;
};

const getLessonTypeIcon = (type: Lesson["type"]): keyof typeof Feather.glyphMap => {
	if (type === "video") return "video";
	if (type === "chat") return "message-square";
	if (type === "audio") return "headphones";
	return "book-open";
};

const getLessonTypeIconAsset = (type: Lesson["type"]) => {
	if (type === "video") return images.appIconVideo;
	if (type === "audio") return images.appIconHeadphones;
	if (type === "vocabulary") return images.appIconBook;
	return null;
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
	const dismissedCheckpointUnlocks = useProgressStore((state) => state.dismissedCheckpointUnlocks) || [];
	const dismissCheckpointUnlock = useProgressStore((state) => state.dismissCheckpointUnlock);
	const latestFailedCheckpointReview = useProgressStore(
		(state) => state.latestFailedCheckpointReview
	);
	const clearFailedCheckpointReview = useProgressStore(
		(state) => state.clearFailedCheckpointReview
	);
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
	const checkpointRecoveryUnit =
		latestFailedCheckpointReview &&
		!completedCheckpoints.includes(latestFailedCheckpointReview.unitId)
			? activeUnits.find((unit) => unit.id === latestFailedCheckpointReview.unitId)
			: undefined;
	const checkpointRecoveryFocusLabel = latestFailedCheckpointReview
		? getCurriculumReviewLabel(latestFailedCheckpointReview.focusConceptIds)
		: "";
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

	const getUnitProgressMeta = (unit: Unit) => {
		const unitLessons = activeLessons.filter((l) => l.unitId === unit.id && !l.isCheckpoint);
		const completedCount = unitLessons.filter((l) => completedLessonIds.includes(l.id)).length;
		const totalCount = unitLessons.length;

		return {
			completedCount,
			totalCount,
			fraction: `${completedCount}/${totalCount}`,
			progress: totalCount > 0 ? completedCount / totalCount : 0,
		};
	};

	const getMasterChallengeLessonId = (unitId: string) => {
		const unitPracticeLessons = activeLessons
			.filter((lesson) => lesson.unitId === unitId && !lesson.isCheckpoint)
			.sort((a, b) => a.order - b.order);
		return unitPracticeLessons[unitPracticeLessons.length - 1]?.id;
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

	const activeUnitProgress = activeUnitInHeader
		? getUnitProgressMeta(activeUnitInHeader)
		: null;
	const activeUnitColor = activeUnitInHeader?.unitColor || "#58CC02";
	const activeUnitTitle =
		activeUnitInHeader?.title.replace(/^Unit \d+:\s*/i, "") || "Current unit";
	const hasRecentMistakes = recentMistakes.length > 0;
	const practiceLessonId = activeLessons[0]?.id;
	const selectedLessonAccentColor = selectedLessonUnit?.unitColor || "#6C4EF5";
	const selectedLessonIsMasterChallenge = selectedLesson
		? getMasterChallengeLessonId(selectedLesson.unitId) === selectedLesson.id
		: false;
	const selectedLessonHeroColor = selectedLessonIsMasterChallenge
		? "#FFC800"
		: selectedLessonAccentColor;
	const selectedLessonIsComplete = selectedLesson
		? completedLessonIds.includes(selectedLesson.id)
		: false;
	const selectedLessonExerciseCount = selectedLesson?.exercises?.length ?? 0;
	const selectedLessonGoalPreview = selectedLesson?.goals?.slice(0, 2) ?? [];
	const selectedLessonTypeIconAsset = selectedLesson
		? getLessonTypeIconAsset(selectedLesson.type)
		: null;
	const selectedLessonIconAsset = selectedLessonIsMasterChallenge
		? images.appIconStar
		: selectedLessonTypeIconAsset;
	const selectedLessonPillLabel = selectedLessonIsMasterChallenge
		? "Master Challenge"
		: selectedLesson?.type;
	const selectedLessonStatusLabel = selectedLessonIsMasterChallenge
		? selectedLessonIsComplete ? "Mastered" : "Final Recall"
		: selectedLessonIsComplete ? "Completed" : "Ready";
	const selectedLessonStatusColor = selectedLessonIsMasterChallenge
		? "#A97800"
		: selectedLessonIsComplete ? "#58A700" : "#6B7280";
	const selectedLessonDescription = selectedLessonIsMasterChallenge
		? `Final challenge for ${selectedLessonUnit?.title.replace(/^Unit \d+:\s*/i, "") || "this unit"}. Built for stronger recall before the checkpoint.`
		: selectedLesson?.description;
	const activeCheckpointUnit = selectedCheckpointUnit || currentUnit;
	const checkpointAccentColor = activeCheckpointUnit?.unitColor || "#FFC800";
	const checkpointTitle =
		activeCheckpointUnit?.title.replace(/^Unit \d+:\s*/i, "") || "Unit Checkpoint";
	const checkpointIsComplete = activeCheckpointUnit
		? completedCheckpoints.includes(activeCheckpointUnit.id)
		: false;
	const checkpointSupportCopy = checkpointIsComplete
		? `You passed ${checkpointTitle}. The next unit is unlocked.`
		: "Unlocked by completing the Master Challenge. Score 80%+ to complete this unit and open the next one.";
	const checkpointQuestionCount = activeCheckpointUnit?.checkpointQuiz?.exercises?.length ?? 5;
	const checkpointLessonCount = activeCheckpointUnit
		? activeLessons.filter((lesson) => lesson.unitId === activeCheckpointUnit.id && !lesson.isCheckpoint).length
		: 0;
	const checkpointVocabularyPreview = activeCheckpointUnit?.targetVocabulary?.slice(0, 3) ?? [];
	const postCheckpointUnlock = [...completedCheckpoints]
		.reverse()
		.map((checkpointId) => {
			const completedUnit = activeUnits.find((unit) => unit.id === checkpointId);
			if (!completedUnit || dismissedCheckpointUnlocks.includes(checkpointId)) return null;

			const nextUnit = activeUnits.find((unit) => unit.order === completedUnit.order + 1);
			if (!nextUnit || currentUnit?.id !== nextUnit.id) return null;

			const firstLesson = activeLessons
				.filter((lesson) => lesson.unitId === nextUnit.id && !lesson.isCheckpoint)
				.sort((a, b) => a.order - b.order)[0];
			if (!firstLesson) return null;

			return {
				completedUnit,
				nextUnit,
				firstLesson,
			};
		})
		.find(Boolean);

	const handleOpenCheckpoint = (unit: Unit) => {
		posthog.screen("checkpoint_detail_modal", {
			unit_id: unit.id,
			language_id: selectedLanguageId,
		});
		setSelectedCheckpointUnit(unit);
		setIsCheckpointSelected(true);
		setModalVisible(true);
	};

	const handleOpenUnitGuidebook = (unit: Unit) => {
		const guidebookDetails = [
			unit.canDoGoal ? `Goal: ${unit.canDoGoal}` : unit.description,
			unit.targetVocabulary?.length ? `Vocabulary: ${unit.targetVocabulary.join(", ")}` : null,
			unit.grammarFocus?.length ? `Focus: ${unit.grammarFocus.join(", ")}` : null,
		]
			.filter(Boolean)
			.join("\n\n");

		posthog.capture("unit_guidebook_opened", {
			unit_id: unit.id,
			language_id: selectedLanguageId,
			source: "sticky_header",
		});

		Alert.alert(
			`Unit ${unit.order} Guidebook`,
			guidebookDetails,
			[{ text: "OK" }]
		);
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
		const isMasterChallenge = getMasterChallengeLessonId(lesson.unitId) === lesson.id;
		posthog.capture("lesson_practice_started", {
			lesson_id: lesson.id,
			lesson_title: lesson.title,
			lesson_type: lesson.type,
			language_id: selectedLanguageId,
			mode: isMasterChallenge ? "mastery" : "lesson",
		});
		setModalVisible(false);
		setSelectedLesson(null);
		router.push({
			pathname: "/exercise-session",
			params: {
				lessonId: lesson.id,
				...(isMasterChallenge ? { mode: "mastery" } : {}),
			},
		});
	};

	const handleStartUnlockedUnit = () => {
		if (!postCheckpointUnlock) return;

		dismissCheckpointUnlock(postCheckpointUnlock.completedUnit.id);
		posthog.capture("post_checkpoint_unlock_started", {
			completed_unit_id: postCheckpointUnlock.completedUnit.id,
			next_unit_id: postCheckpointUnlock.nextUnit.id,
			lesson_id: postCheckpointUnlock.firstLesson.id,
			language_id: selectedLanguageId,
		});
		handleStartPractice(postCheckpointUnlock.firstLesson);
	};

	const handleStartCheckpointRecoveryReview = () => {
		if (!latestFailedCheckpointReview || !checkpointRecoveryUnit) return;

		posthog.capture("checkpoint_recovery_review_started_from_path", {
			unit_id: checkpointRecoveryUnit.id,
			language_id: selectedLanguageId,
			focus_concept_ids: latestFailedCheckpointReview.focusConceptIds,
		});

		router.push({
			pathname: "/review-session",
			params: {
				focusConceptIds: latestFailedCheckpointReview.focusConceptIds.join(","),
				source: "checkpoint-fail",
				unitId: checkpointRecoveryUnit.id,
			},
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
							Unit {currentUnit?.order || 1} - {getUnitProgressFraction(currentUnit)} lessons
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
			{activeTab === "lessons" && activeUnitInHeader && activeUnitProgress && (
				<View style={styles.stickyHeader}>
					<View style={styles.stickyHeaderInner}>
						<View
							style={[
								styles.stickyUnitIcon,
								{
									backgroundColor: withAlpha(activeUnitColor, "1A", "#EEFBE7"),
									borderColor: withAlpha(activeUnitColor, "44", "#BDEAA4"),
								},
							]}
						>
							{activeUnitInHeader.unitEmoji ? (
								<Text className="text-[18px] leading-[24px]">
									{activeUnitInHeader.unitEmoji}
								</Text>
							) : (
								<Feather name="map" size={18} color={activeUnitColor} />
							)}
						</View>

						<View className="flex-1 mr-3">
							<View className="flex-row items-center mb-1">
								<Text
									style={{ color: activeUnitColor }}
									className="font-poppins-bold text-[10px] uppercase tracking-[0.5px]"
								>
									Unit {activeUnitInHeader.order} - {activeUnitInHeader.cefr || "A1"}
								</Text>
								<View style={[styles.stickyStatusDot, { backgroundColor: activeUnitColor }]} />
								<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase">
									{activeUnitProgress.totalCount > 0 &&
									activeUnitProgress.completedCount === activeUnitProgress.totalCount
										? "Ready for checkpoint"
										: "Keep going"}
								</Text>
							</View>
							<Text
								className="font-poppins-bold text-[14px] text-neutral-primary"
								numberOfLines={1}
							>
								{activeUnitTitle}
							</Text>
							<View style={styles.stickyProgressTrack}>
								<View
									style={[
										styles.stickyProgressFill,
										{
											backgroundColor: activeUnitColor,
											width: `${Math.round(activeUnitProgress.progress * 100)}%`,
										},
									]}
								/>
							</View>
						</View>

						<View style={styles.stickyProgressPill}>
							<Text className="font-poppins-bold text-[12px] text-neutral-primary">
								{activeUnitProgress.fraction}
							</Text>
							<Text className="font-poppins-semibold text-[9px] text-neutral-secondary uppercase">
								done
							</Text>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel={`Open Unit ${activeUnitInHeader.order} guidebook`}
							hitSlop={8}
							onPress={() => handleOpenUnitGuidebook(activeUnitInHeader)}
							activeOpacity={0.75}
							style={[
								styles.stickyGuidebookButton,
								{
									borderColor: withAlpha(activeUnitColor, "44", "#BDEAA4"),
									backgroundColor: withAlpha(activeUnitColor, "14", "#F4FBEE"),
								},
							]}
						>
							<Image
								source={images.appIconBook}
								style={styles.stickyGuidebookIcon}
								contentFit="contain"
							/>
						</TouchableOpacity>
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
					contentContainerStyle={{ paddingTop: SCROLL_TOP_PADDING, paddingBottom: 80 }}
				>
					{postCheckpointUnlock ? (
						<View style={styles.unlockBanner}>
							<View style={styles.unlockBannerGlow} />
							<View style={styles.unlockBannerHeader}>
								<View style={styles.unlockBannerIconWrap}>
									<Feather name="star" size={26} color="#A97800" />
								</View>
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel="Dismiss next unit unlocked message"
									hitSlop={8}
									onPress={() => dismissCheckpointUnlock(postCheckpointUnlock.completedUnit.id)}
									style={styles.unlockBannerDismiss}
								>
									<Feather name="x" size={18} color="#A97800" />
								</TouchableOpacity>
							</View>

							<Text style={styles.unlockBannerEyebrow}>
								Next unit unlocked
							</Text>
							<Text style={styles.unlockBannerTitle}>
								{postCheckpointUnlock.nextUnit.title.replace(/^Unit \d+:\s*/i, "")}
							</Text>
							<Text style={styles.unlockBannerCopy}>
								You passed Unit {postCheckpointUnlock.completedUnit.order}. Start here to keep your path moving.
							</Text>

							<View style={styles.unlockBannerFooter}>
								<View style={styles.unlockBannerLessonPill}>
									<Feather name="book-open" size={14} color="#A97800" />
									<Text style={styles.unlockBannerLessonText} numberOfLines={1}>
										{postCheckpointUnlock.firstLesson.title}
									</Text>
								</View>
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel={`Start ${postCheckpointUnlock.firstLesson.title}`}
									activeOpacity={0.85}
									onPress={handleStartUnlockedUnit}
									style={styles.unlockBannerStartButton}
								>
									<Text style={styles.unlockBannerStartText}>START</Text>
								</TouchableOpacity>
							</View>
						</View>
					) : null}

					{checkpointRecoveryUnit && latestFailedCheckpointReview ? (
						<View style={styles.checkpointRecoveryBanner}>
							<View style={styles.checkpointRecoveryIcon}>
								<Feather name="refresh-cw" size={22} color="#A25700" />
							</View>
							<View style={styles.checkpointRecoveryBody}>
								<View className="flex-row items-start justify-between">
									<View className="flex-1 pr-2">
										<Text style={styles.checkpointRecoveryEyebrow}>
											Checkpoint help
										</Text>
										<Text style={styles.checkpointRecoveryTitle}>
											Review weak skills first
										</Text>
									</View>
									<TouchableOpacity
										accessibilityRole="button"
										accessibilityLabel="Dismiss checkpoint review suggestion"
										hitSlop={8}
										onPress={() => clearFailedCheckpointReview(checkpointRecoveryUnit.id)}
										style={styles.checkpointRecoveryDismiss}
									>
										<Feather name="x" size={16} color="#A25700" />
									</TouchableOpacity>
								</View>
								<Text style={styles.checkpointRecoveryCopy}>
									Unit {checkpointRecoveryUnit.order} needs one focused review before
									another checkpoint try.
								</Text>
								{checkpointRecoveryFocusLabel ? (
									<View style={styles.checkpointRecoveryFocusPill}>
										<Text style={styles.checkpointRecoveryFocusText} numberOfLines={1}>
											Focus: {checkpointRecoveryFocusLabel}
										</Text>
									</View>
								) : null}
								<View style={styles.checkpointRecoveryFooter}>
									<Text style={styles.checkpointRecoveryScore}>
										Last score {latestFailedCheckpointReview.score}%
									</Text>
									<Button3D
										onPress={handleStartCheckpointRecoveryReview}
										variant="warning"
										size="sm"
										fullWidth={false}
										title="REVIEW"
									/>
								</View>
							</View>
						</View>
					) : null}

					{activeUnits.map((unit, unitIdx) => {
						const unitLessons = activeLessons
							.filter((l) => l.unitId === unit.id)
							.sort((a, b) => a.order - b.order);
						const unitProgressMeta = getUnitProgressMeta(unit);
						const totalNodes = unitLessons.length;
						const containerHeight = totalNodes * 96 + 20;
						const masterChallengeIndex = unitLessons.reduce(
							(lastIndex, item, lessonIndex) => (!item.isCheckpoint ? lessonIndex : lastIndex),
							-1
						);

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
										const nodeSize = PATH_NODE_SIZE;

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
											const nextNodeSize = PATH_NODE_SIZE;
											const nextX = getXOffset(nextPosition, nextNodeSize);
											const nextNodeState = getNodeState(
												nextLesson,
												unit,
												activeLessons,
												activeUnits,
												completedLessonIds,
												completedCheckpoints
											);
											const currentNodeComplete = lesson.isCheckpoint
												? completedCheckpoints.includes(lesson.unitId)
												: completedLessonIds.includes(lesson.id);
											let connectorState: PathConnectorState = "locked";

											if (
												nextLesson.isCheckpoint &&
												currentNodeComplete &&
												(nextNodeState === "checkpoint" || nextNodeState === "completed")
											) {
												connectorState = "checkpoint";
											} else if (nextNodeState === "active") {
												connectorState = "active";
											} else if (currentNodeComplete) {
												connectorState = "completed";
											}

											connector = (
												<PathConnector
													key={`conn-${lesson.id}`}
													state={connectorState}
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
														activeProgress={unitProgressMeta.progress}
														isMasterChallenge={idx === masterChallengeIndex}
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
					contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.practiceIntroCard}>
						<View className="flex-row items-center justify-between">
							<View className="flex-1 mr-3">
								<Text className="font-poppins-bold text-[11px] text-lingua-purple uppercase tracking-[0.6px]">
									Practice Hub
								</Text>
								<Text className="font-poppins-bold text-[21px] text-neutral-primary leading-[27px] mt-1">
									Choose a skill focus
								</Text>
								<Text className="font-poppins text-[13px] text-neutral-secondary leading-[19px] mt-1">
									{hasRecentMistakes
										? `${recentMistakes.length} mistake${recentMistakes.length > 1 ? "s" : ""} ready to repair.`
										: "No mistakes saved. Build fluency with focused drills."}
								</Text>
							</View>
							<View style={styles.practiceIntroIcon}>
								<Image source={images.appIconWeights} style={styles.practiceCardIconImage} contentFit="contain" />
							</View>
						</View>
					</View>

					<View className="gap-4 mb-6">
						{/* Mistakes Review Card */}
						<TouchableOpacity
							disabled={!hasRecentMistakes || !practiceLessonId}
							onPress={() => {
								if (!practiceLessonId) return;
								posthog.capture("mistakes_practice_started", {
									mistakes_count: recentMistakes.length,
									language_id: selectedLanguageId,
								});
								router.push({
									pathname: "/exercise-session",
									params: { lessonId: practiceLessonId, mode: "mistakes" },
								});
							}}
							activeOpacity={0.85}
							className="p-4 border-2 flex-row items-center justify-between"
							style={[
								styles.practiceCard,
								{
									borderColor: hasRecentMistakes ? "#FF4B4B" : "#E5E5E5",
									backgroundColor: hasRecentMistakes ? "#FFF5F5" : "#FFFFFF",
									borderBottomColor: hasRecentMistakes ? "#EA2B2B" : "#C5C7CB",
								},
								!hasRecentMistakes ? styles.practiceCardDisabled : null,
							]}
						>
							<View className="flex-row items-center flex-1 mr-3">
								<View
									className={`w-[52px] h-[52px] rounded-[18px] items-center justify-center mr-4 ${
										hasRecentMistakes ? "bg-[#FF4B4B]" : "bg-neutral-border"
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
									<View
										style={[
											styles.practiceStatusPill,
											{
												backgroundColor: hasRecentMistakes ? "#FFDFE0" : "#F7F7F7",
											},
										]}
									>
										<Text
											style={{ color: hasRecentMistakes ? "#FF4B4B" : "#6B7280" }}
											className="font-poppins-bold text-[10px] uppercase"
										>
											{hasRecentMistakes ? `${recentMistakes.length} to fix` : "All clear"}
										</Text>
									</View>
								</View>
							</View>
							{hasRecentMistakes ? (
								<View style={[styles.practiceActionButton, { backgroundColor: "#FF4B4B" }]}>
									<Feather name="arrow-right" size={20} color="#FFFFFF" />
								</View>
							) : (
								<View style={styles.practiceDoneButton}>
									<Feather name="check" size={20} color="#21C16B" />
								</View>
							)}
						</TouchableOpacity>

						{/* Vocabulary builder Card */}
						<TouchableOpacity
							onPress={() => {
								if (!practiceLessonId) return;
								posthog.capture("vocab_practice_started", {
									language_id: selectedLanguageId,
								});
								router.push({
									pathname: "/exercise-session",
									params: { lessonId: practiceLessonId, mode: "vocabulary" },
								});
							}}
							activeOpacity={0.85}
							disabled={!practiceLessonId}
							className="p-4 border-2 flex-row items-center justify-between"
							style={[
								styles.practiceCard,
								{
									borderColor: "#FFC800",
									backgroundColor: "#FFFFF0",
									borderBottomColor: "#E6B400",
								},
								!practiceLessonId ? styles.practiceCardDisabled : null,
							]}
						>
							<View className="flex-row items-center flex-1 mr-3">
								<View className="w-[52px] h-[52px] rounded-[18px] bg-[#FFC800] items-center justify-center mr-4">
									<Image source={images.appIconBook} style={styles.practiceCardIconImage} contentFit="contain" />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] text-neutral-primary">
										Vocabulary Quiz
									</Text>
									<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
										Practice matching and typing vocabulary from this unit.
									</Text>
									<View style={[styles.practiceStatusPill, { backgroundColor: "#FFF3CC" }]}>
										<Text
											style={{ color: "#B87500" }}
											className="font-poppins-bold text-[10px] uppercase"
										>
											Recall
										</Text>
									</View>
								</View>
							</View>
							<View style={[styles.practiceActionButton, { backgroundColor: "#FFC800" }]}>
								<Feather name="arrow-right" size={20} color="#FFFFFF" />
							</View>
						</TouchableOpacity>

						{/* Listening Hub Card */}
						<TouchableOpacity
							onPress={() => {
								if (!practiceLessonId) return;
								posthog.capture("listening_practice_started", {
									language_id: selectedLanguageId,
								});
								router.push({
									pathname: "/exercise-session",
									params: { lessonId: practiceLessonId, mode: "listening" },
								});
							}}
							activeOpacity={0.85}
							disabled={!practiceLessonId}
							className="p-4 border-2 flex-row items-center justify-between"
							style={[
								styles.practiceCard,
								{
									borderColor: "#1CB0F6",
									backgroundColor: "#F2F9FF",
									borderBottomColor: "#1899D6",
								},
								!practiceLessonId ? styles.practiceCardDisabled : null,
							]}
						>
							<View className="flex-row items-center flex-1 mr-3">
								<View className="w-[52px] h-[52px] rounded-[18px] bg-[#1CB0F6] items-center justify-center mr-4">
									<Image source={images.appIconHeadphones} style={styles.practiceCardIconImage} contentFit="contain" />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] text-neutral-primary">
										Listening Hub
									</Text>
									<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
										Fine-tune your ear with audio dictation drills.
									</Text>
									<View style={[styles.practiceStatusPill, { backgroundColor: "#DDF4FF" }]}>
										<Text
											style={{ color: "#0D90D0" }}
											className="font-poppins-bold text-[10px] uppercase"
										>
											Audio
										</Text>
									</View>
								</View>
							</View>
							<View style={[styles.practiceActionButton, { backgroundColor: "#1CB0F6" }]}>
								<Feather name="arrow-right" size={20} color="#FFFFFF" />
							</View>
						</TouchableOpacity>

						{/* Speaking Practice Card */}
						<TouchableOpacity
							onPress={() => {
								if (!practiceLessonId) return;
								posthog.capture("speaking_practice_started", {
									language_id: selectedLanguageId,
								});
								router.push({
									pathname: "/exercise-session",
									params: { lessonId: practiceLessonId, mode: "speaking" },
								});
							}}
							activeOpacity={0.85}
							disabled={!practiceLessonId}
							className="p-4 border-2 flex-row items-center justify-between"
							style={[
								styles.practiceCard,
								{
									borderColor: "#58CC02",
									backgroundColor: "#F3FFE8",
									borderBottomColor: "#46A302",
								},
								!practiceLessonId ? styles.practiceCardDisabled : null,
							]}
						>
							<View className="flex-row items-center flex-1 mr-3">
								<View className="w-[52px] h-[52px] rounded-[18px] bg-[#58CC02] items-center justify-center mr-4">
									<Image source={images.appIconMicrophone} style={styles.practiceCardIconImage} contentFit="contain" />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] text-neutral-primary">
										Speaking Practice
									</Text>
									<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
										Listen and say useful phrases out loud.
									</Text>
									<View style={[styles.practiceStatusPill, { backgroundColor: "#D7FFB8" }]}>
										<Text
											style={{ color: "#58A700" }}
											className="font-poppins-bold text-[10px] uppercase"
										>
											Voice
										</Text>
									</View>
								</View>
							</View>
							<View style={[styles.practiceActionButton, { backgroundColor: "#58CC02" }]}>
								<Feather name="arrow-right" size={20} color="#FFFFFF" />
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
						<View style={styles.modalHandle} />
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
							contentContainerStyle={styles.modalScrollContent}
						>
						{selectedLesson && (
							<View>
								<View
									style={[
										styles.lessonSheetHero,
										selectedLessonIsMasterChallenge ? styles.masterSheetHero : null,
										{
											backgroundColor: selectedLessonIsMasterChallenge
												? "#FFF7D6"
												: withAlpha(selectedLessonAccentColor, "14", "#F1EEFF"),
											borderColor: selectedLessonIsMasterChallenge
												? "#FFE082"
												: withAlpha(selectedLessonAccentColor, "44", "#DED8FF"),
										},
									]}
								>
									{selectedLessonIsMasterChallenge ? (
										<View style={styles.masterSheetGlow} />
									) : null}
									<View style={styles.lessonSheetHeroTop}>
										<View
											style={[
												styles.lessonSheetIcon,
												selectedLessonIsMasterChallenge ? styles.masterSheetIcon : null,
												{ backgroundColor: selectedLessonHeroColor },
											]}
										>
											{selectedLessonIconAsset ? (
												<Image
													source={selectedLessonIconAsset}
													style={styles.lessonSheetIconImage}
													contentFit="contain"
												/>
											) : (
												<Feather
													name={getLessonTypeIcon(selectedLesson.type)}
													size={24}
													color="#FFFFFF"
												/>
											)}
										</View>
										<View className="flex-1">
											<View className="flex-row flex-wrap items-center mb-2">
												<View
													style={[
														styles.lessonSheetPill,
														selectedLessonIsMasterChallenge ? styles.masterSheetPill : null,
														{
															backgroundColor: selectedLessonIsMasterChallenge
																? "#FFE9A3"
																: withAlpha(selectedLessonAccentColor, "22", "#ECE8FF"),
														},
													]}
												>
													<Text
														style={{ color: selectedLessonIsMasterChallenge ? "#8A5A00" : selectedLessonAccentColor }}
														className="font-poppins-bold text-[10px] uppercase"
													>
														{selectedLessonPillLabel}
													</Text>
												</View>
												<View style={styles.lessonSheetStatusPill}>
													<Feather
														name={selectedLessonIsComplete ? "check" : selectedLessonIsMasterChallenge ? "target" : "play"}
														size={10}
														color={selectedLessonStatusColor}
													/>
													<Text
														style={{ color: selectedLessonStatusColor }}
														className="font-poppins-bold text-[10px] uppercase ml-1"
													>
														{selectedLessonStatusLabel}
													</Text>
												</View>
											</View>
											<Text className="font-poppins-bold text-[24px] text-neutral-primary leading-[30px]">
												{selectedLesson.title}
											</Text>
											<Text className="font-poppins text-[13px] text-neutral-secondary leading-[20px] mt-2">
												{selectedLessonDescription}
											</Text>
										</View>
									</View>
								</View>

								<View style={styles.lessonSheetStats}>
									<View style={styles.lessonSheetStatItem}>
										<Image source={images.appIconTimer} style={styles.statIconImage} contentFit="contain" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1.5">
											{selectedLesson.durationMinutes} mins
										</Text>
										<Text className="font-poppins text-[9px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
											Time
										</Text>
									</View>
									<View style={styles.lessonSheetStatItem}>
										<Image source={images.appIconLightning} style={styles.statIconImage} contentFit="contain" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1.5">
											{selectedLesson.xpReward} XP
										</Text>
										<Text className="font-poppins text-[9px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
											Reward
										</Text>
									</View>
									<View style={styles.lessonSheetStatItem}>
										<Image source={images.appIconTarget} style={styles.statIconImage} contentFit="contain" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1.5">
											{selectedLessonExerciseCount || selectedLesson.goals.length || 1}
										</Text>
										<Text className="font-poppins text-[9px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
											Drills
										</Text>
									</View>
								</View>

								{selectedLessonIsMasterChallenge ? (
									<View style={styles.masterRulesCard}>
										<View className="flex-row items-center mb-2">
											<Image
												source={images.appIconStar}
												style={styles.masterRulesIcon}
												contentFit="contain"
											/>
											<Text className="font-poppins-bold text-[12px] text-[#8A5A00] uppercase tracking-[0.5px] ml-2">
												Mastery focus
											</Text>
										</View>
										{[
											"Use the unit from memory, not just recognition.",
											"Expect stronger recall and less hand-holding.",
											"Mistakes here become perfect review material.",
										].map((rule) => (
											<View key={rule} className="flex-row items-start mb-2">
												<Feather
													name="check-circle"
													size={14}
													color="#FFC800"
													style={{ marginTop: 2 }}
												/>
												<Text className="font-poppins text-[12px] text-neutral-primary ml-2 flex-1 leading-[18px]">
													{rule}
												</Text>
											</View>
										))}
									</View>
								) : null}

								{selectedLessonGoalPreview.length > 0 ? (
									<View style={styles.lessonGoalCard}>
										<View className="flex-row items-center justify-between mb-3">
											<View>
												<Text className="font-poppins-bold text-[12px] text-neutral-primary uppercase tracking-[0.5px]">
													Lesson plan
												</Text>
												<Text className="font-poppins text-[11px] text-neutral-secondary mt-0.5">
													Bite-sized practice before the session starts
												</Text>
											</View>
											<View style={styles.lessonGoalCountPill}>
												<Text style={styles.lessonGoalCountText}>
													{selectedLessonGoalPreview.length} focus
												</Text>
											</View>
										</View>
										{selectedLessonGoalPreview.map((goal, index) => (
											<View key={goal} style={styles.lessonGoalPlanRow}>
												<View style={styles.lessonGoalNumber}>
													<Text style={styles.lessonGoalNumberText}>{index + 1}</Text>
												</View>
												<View className="flex-1">
													<Text className="font-poppins-semibold text-[13px] text-neutral-primary leading-[18px]">
														{goal}
													</Text>
													<Text className="font-poppins text-[11px] text-neutral-secondary leading-[16px] mt-0.5">
														{index === 0 ? "Recognition and guided recall" : "Short transfer practice"}
													</Text>
												</View>
											</View>
										))}
									</View>
								) : null}

								<View style={styles.lessonPreviewCard}>
									<LessonTeachingPreview
										lesson={selectedLesson}
										unit={selectedLessonUnit}
									/>
								</View>

								{/* CTA Actions */}
								<View style={styles.lessonActionStack}>
									<Button3D
										onPress={() => handleStartPractice(selectedLesson)}
										variant={selectedLessonIsMasterChallenge ? "warning" : "primary"}
									>
										{selectedLessonIsMasterChallenge ? "Start Challenge" : "Start Practice"}
									</Button3D>

									<Button3D
										onPress={() => handleStartAiTeacher(selectedLesson)}
										variant="ghost"
									>
										AI Teacher
									</Button3D>

									{__DEV__ ? (
										<Button3D
											onPress={handleCompleteMockLesson}
											variant="gray"
										>
											Mock Complete (Earn XP)
										</Button3D>
									) : null}
								</View>
							</View>
						)}

						{isCheckpointSelected && (
							<View className="pt-1">
								<View style={styles.checkpointHero}>
									<View style={styles.checkpointGlow} />
									<View className="flex-row items-start">
										<View style={styles.checkpointIcon}>
											<Image source={images.appIconStar} style={styles.checkpointIconImage} contentFit="contain" />
										</View>
										<View className="flex-1">
											<View className="flex-row flex-wrap items-center mb-2">
												<View style={styles.checkpointPill}>
													<Text className="font-poppins-bold text-[10px] text-[#8A5A00] uppercase">
														Checkpoint
													</Text>
												</View>
												<View style={styles.checkpointStatusPill}>
													<Feather
														name={checkpointIsComplete ? "check" : "lock"}
														size={10}
														color={checkpointIsComplete ? "#58A700" : "#8A5A00"}
													/>
													<Text
														style={{ color: checkpointIsComplete ? "#58A700" : "#8A5A00" }}
														className="font-poppins-bold text-[10px] uppercase ml-1"
													>
														{checkpointIsComplete ? "Passed" : "80% to pass"}
													</Text>
												</View>
											</View>
											<Text className="font-poppins-bold text-[23px] text-neutral-primary leading-[29px]">
												Unit Checkpoint Quiz
											</Text>
											<Text className="font-poppins text-[13px] text-neutral-secondary leading-[20px] mt-2">
												{checkpointSupportCopy}
											</Text>
										</View>
									</View>
								</View>

								<View style={styles.checkpointStats}>
									<View style={styles.checkpointStatItem}>
										<Image source={images.appIconTarget} style={styles.statIconImage} contentFit="contain" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1">
											{checkpointQuestionCount}
										</Text>
										<Text className="font-poppins text-[9px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
											Questions
										</Text>
									</View>
									<View style={styles.checkpointStatItem}>
										<Image source={images.appIconLightning} style={styles.statIconImage} contentFit="contain" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1">
											50 XP
										</Text>
										<Text className="font-poppins text-[9px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
											Pass reward
										</Text>
									</View>
									<View style={styles.checkpointStatItem}>
										<Image source={images.appIconBook} style={styles.statIconImage} contentFit="contain" />
										<Text className="font-poppins-bold text-[14px] text-neutral-primary mt-1">
											{checkpointLessonCount || 4}
										</Text>
										<Text className="font-poppins text-[9px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
											Lessons
										</Text>
									</View>
								</View>

								<View style={styles.checkpointRulesCard}>
									<Text className="font-poppins-bold text-[12px] text-neutral-primary uppercase tracking-[0.5px] mb-2">
										Quiz rules
									</Text>
									{[
										"Answer all questions to finish the checkpoint.",
										"Score 80% or higher to unlock the next unit.",
										"Translation helpers stay off during the quiz.",
									].map((rule) => (
										<View key={rule} className="flex-row items-start mb-2">
											<Feather
												name="check-circle"
												size={14}
												color="#58CC02"
												style={{ marginTop: 2 }}
											/>
											<Text className="font-poppins text-[12px] text-neutral-primary ml-2 flex-1 leading-[18px]">
												{rule}
											</Text>
										</View>
									))}
								</View>

								{checkpointVocabularyPreview.length > 0 ? (
									<View style={styles.checkpointCoverageCard}>
										<Text className="font-poppins-bold text-[12px] text-neutral-primary uppercase tracking-[0.5px] mb-2">
											Covers
										</Text>
										<View className="flex-row flex-wrap">
											{checkpointVocabularyPreview.map((item) => (
												<View
													key={`checkpoint-${item}`}
													style={[
														styles.checkpointCoveragePill,
														{
															borderColor: withAlpha(checkpointAccentColor, "33", "#E5E5E5"),
															backgroundColor: withAlpha(checkpointAccentColor, "14", "#FFF8E1"),
														},
													]}
												>
													<Text
														style={{ color: checkpointAccentColor }}
														className="font-poppins-bold text-[11px]"
													>
														{item}
													</Text>
												</View>
											))}
										</View>
									</View>
								) : null}

								{/* CTA Actions */}
								<View className="gap-2.5 mt-2">
									<Button3D
										onPress={() => {
											posthog.capture("checkpoint_started", {
												unit_id: activeCheckpointUnit?.id,
												language_id: selectedLanguageId,
											});
											setModalVisible(false);
											setIsCheckpointSelected(false);
											const checkpointUnit = activeCheckpointUnit;
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

									{__DEV__ ? (
										<Button3D
											onPress={handleCompleteMockCheckpoint}
											variant="gray"
										>
											Mock Complete Checkpoint
										</Button3D>
									) : null}
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
		paddingHorizontal: 20,
		paddingTop: 14,
		paddingBottom: Platform.OS === "ios" ? 34 : 22,
		maxHeight: "85%",
	},
	modalHandle: {
		width: 46,
		height: 5,
		borderRadius: 999,
		backgroundColor: "#E5E7EB",
		alignSelf: "center",
		marginBottom: 16,
	},
	modalScrollContent: {
		paddingBottom: 4,
	},
	unlockBanner: {
		marginHorizontal: 16,
		marginBottom: 16,
		borderWidth: 2,
		borderBottomWidth: 5,
		borderColor: "#FFC800",
		borderBottomColor: "#D99A00",
		borderRadius: 18,
		backgroundColor: "#FFF8D9",
		padding: 16,
		overflow: "hidden",
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: 0.08,
				shadowRadius: 6,
			},
			android: {
				elevation: 3,
			},
			web: {
				boxShadow: "0px 3px 8px rgba(13, 19, 43, 0.08)",
			} as any,
		}),
	},
	unlockBannerGlow: {
		position: "absolute",
		right: -34,
		top: -44,
		width: 128,
		height: 128,
		borderRadius: 64,
		backgroundColor: "rgba(255, 200, 0, 0.26)",
	},
	unlockBannerHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	unlockBannerIconWrap: {
		width: 46,
		height: 46,
		borderRadius: 16,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#FFE8B3",
		alignItems: "center",
		justifyContent: "center",
	},
	unlockBannerDismiss: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "rgba(255, 255, 255, 0.72)",
		alignItems: "center",
		justifyContent: "center",
	},
	unlockBannerEyebrow: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: "#A97800",
		textTransform: "uppercase",
		letterSpacing: 0.6,
		marginBottom: 2,
	},
	unlockBannerTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 22,
		lineHeight: 28,
		color: "#2B2B2B",
	},
	unlockBannerCopy: {
		fontFamily: "Poppins-Medium",
		fontSize: 13,
		lineHeight: 19,
		color: "#6B5B2A",
		marginTop: 4,
		maxWidth: 300,
	},
	unlockBannerFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
		marginTop: 14,
	},
	unlockBannerLessonPill: {
		flex: 1,
		minWidth: 0,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#FFE8B3",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 11,
		gap: 7,
	},
	unlockBannerLessonText: {
		flex: 1,
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: "#5A4610",
	},
	unlockBannerStartButton: {
		height: 38,
		borderRadius: 14,
		backgroundColor: "#58CC02",
		borderBottomWidth: 4,
		borderBottomColor: "#46A302",
		paddingHorizontal: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	unlockBannerStartText: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: "#FFFFFF",
		letterSpacing: 0.5,
	},
	checkpointRecoveryBanner: {
		marginHorizontal: 16,
		marginBottom: 16,
		borderWidth: 2,
		borderBottomWidth: 5,
		borderColor: "#FFB84D",
		borderBottomColor: "#D97900",
		borderRadius: 18,
		backgroundColor: "#FFF3CC",
		padding: 14,
		flexDirection: "row",
		gap: 12,
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: 0.08,
				shadowRadius: 6,
			},
			android: {
				elevation: 3,
			},
			web: {
				boxShadow: "0px 3px 8px rgba(13, 19, 43, 0.08)",
			} as any,
		}),
	},
	checkpointRecoveryIcon: {
		width: 44,
		height: 44,
		borderRadius: 15,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#FFE0A3",
		alignItems: "center",
		justifyContent: "center",
	},
	checkpointRecoveryBody: {
		flex: 1,
		minWidth: 0,
	},
	checkpointRecoveryDismiss: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(255, 255, 255, 0.72)",
		alignItems: "center",
		justifyContent: "center",
	},
	checkpointRecoveryEyebrow: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		color: "#A25700",
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},
	checkpointRecoveryTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 18,
		lineHeight: 23,
		color: "#2B2B2B",
		marginTop: 1,
	},
	checkpointRecoveryCopy: {
		fontFamily: "Poppins-Medium",
		fontSize: 12,
		lineHeight: 18,
		color: "#6B5B2A",
		marginTop: 4,
	},
	checkpointRecoveryFocusPill: {
		alignSelf: "flex-start",
		maxWidth: "100%",
		borderWidth: 1,
		borderColor: "#FFE0A3",
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 10,
		paddingVertical: 5,
		marginTop: 10,
	},
	checkpointRecoveryFocusText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		color: "#A25700",
		textTransform: "uppercase",
		letterSpacing: 0.35,
	},
	checkpointRecoveryFooter: {
		marginTop: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	checkpointRecoveryScore: {
		flex: 1,
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: "#A25700",
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
	lessonSheetHero: {
		position: "relative",
		overflow: "hidden",
		borderWidth: 1,
		borderRadius: 26,
		padding: 16,
		marginBottom: 14,
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.08,
				shadowRadius: 10,
			},
			android: {
				elevation: 3,
			},
			web: {
				boxShadow: "0px 8px 18px rgba(13, 19, 43, 0.08)",
			} as any,
		}),
	},
	masterSheetHero: {
		borderColor: "#FFE082",
	},
	masterSheetGlow: {
		position: "absolute",
		right: -22,
		top: -30,
		width: 118,
		height: 118,
		borderRadius: 59,
		backgroundColor: "rgba(255, 200, 0, 0.24)",
	},
	lessonSheetHeroTop: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 14,
	},
	lessonSheetIcon: {
		width: 54,
		height: 54,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.08,
				shadowRadius: 4,
			},
			android: {
				elevation: 2,
			},
			web: {
				boxShadow: "0px 2px 6px rgba(13, 19, 43, 0.08)",
			} as any,
		}),
	},
	masterSheetIcon: {
		borderWidth: 1,
		borderColor: "#D99A00",
	},
	lessonSheetIconImage: {
		width: 30,
		height: 30,
	},
	lessonSheetPill: {
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 4,
		marginRight: 8,
		marginBottom: 6,
	},
	masterSheetPill: {
		borderWidth: 1,
		borderColor: "#FFE082",
	},
	lessonSheetStatusPill: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E5E5",
		paddingHorizontal: 9,
		paddingVertical: 4,
		marginBottom: 6,
	},
	lessonSheetStats: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 14,
	},
	lessonSheetStatItem: {
		flex: 1,
		minHeight: 76,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#E5E5E5",
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
		paddingVertical: 10,
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 5,
			},
			android: {
				elevation: 1,
			},
			web: {
				boxShadow: "0px 2px 8px rgba(13, 19, 43, 0.05)",
			} as any,
		}),
	},
	lessonGoalCard: {
		borderRadius: 22,
		borderWidth: 1,
		borderColor: "#DDF4FF",
		backgroundColor: "#F4FBFF",
		padding: 15,
		marginBottom: 14,
	},
	lessonGoalCountPill: {
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#DDF4FF",
		paddingHorizontal: 10,
		paddingVertical: 5,
	},
	lessonGoalCountText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 13,
		color: "#0D90D0",
		textTransform: "uppercase",
		letterSpacing: 0.35,
	},
	lessonGoalPlanRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		borderRadius: 16,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#DDF4FF",
		padding: 11,
		marginBottom: 8,
	},
	lessonGoalNumber: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: "#1CB0F6",
		alignItems: "center",
		justifyContent: "center",
	},
	lessonGoalNumberText: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 15,
		color: "#FFFFFF",
	},
	masterRulesCard: {
		borderRadius: 18,
		borderWidth: 1,
		borderColor: "#FFE082",
		backgroundColor: "#FFFDF2",
		padding: 14,
		marginBottom: 12,
	},
	masterRulesIcon: {
		width: 18,
		height: 18,
	},
	lessonPreviewCard: {
		borderRadius: 22,
		borderWidth: 1,
		borderColor: "#E5E5E5",
		backgroundColor: "#FFFFFF",
		padding: 14,
		marginBottom: 16,
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.04,
				shadowRadius: 5,
			},
			android: {
				elevation: 1,
			},
			web: {
				boxShadow: "0px 2px 8px rgba(13, 19, 43, 0.04)",
			} as any,
		}),
	},
	lessonActionStack: {
		gap: 10,
		marginTop: 2,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#EEF0F4",
	},
	checkpointHero: {
		position: "relative",
		overflow: "hidden",
		borderRadius: 22,
		borderWidth: 1,
		borderColor: "#FFE082",
		backgroundColor: "#FFF7D6",
		padding: 16,
		marginBottom: 12,
	},
	checkpointGlow: {
		position: "absolute",
		right: -24,
		top: -28,
		width: 118,
		height: 118,
		borderRadius: 59,
		backgroundColor: "rgba(255, 200, 0, 0.22)",
	},
	checkpointIcon: {
		width: 56,
		height: 56,
		borderRadius: 19,
		backgroundColor: "#FFC800",
		borderWidth: 1,
		borderColor: "#E5A000",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
		...Platform.select({
			ios: {
				shadowColor: "#8A5A00",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.12,
				shadowRadius: 4,
			},
			android: {
				elevation: 2,
			},
			web: {
				boxShadow: "0px 2px 6px rgba(138, 90, 0, 0.12)",
			} as any,
		}),
	},
	checkpointIconImage: {
		width: 32,
		height: 32,
	},
	checkpointPill: {
		borderRadius: 999,
		backgroundColor: "#FFE9A3",
		paddingHorizontal: 9,
		paddingVertical: 4,
		marginRight: 8,
		marginBottom: 6,
	},
	checkpointStatusPill: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#FFE082",
		paddingHorizontal: 9,
		paddingVertical: 4,
		marginBottom: 6,
	},
	checkpointStats: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 12,
	},
	checkpointStatItem: {
		flex: 1,
		minHeight: 76,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: "#FFE082",
		backgroundColor: "#FFFDF2",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
		paddingVertical: 10,
	},
	checkpointRulesCard: {
		borderRadius: 18,
		borderWidth: 1,
		borderColor: "#E5E5E5",
		backgroundColor: "#FFFFFF",
		padding: 14,
		marginBottom: 12,
	},
	checkpointCoverageCard: {
		borderRadius: 18,
		borderWidth: 1,
		borderColor: "#E5E5E5",
		backgroundColor: "#FFFFFF",
		padding: 14,
		marginBottom: 16,
	},
	checkpointCoveragePill: {
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
		marginRight: 8,
		marginBottom: 8,
	},
	practiceIntroCard: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E5E5",
		borderRadius: 22,
		padding: 18,
		marginBottom: 16,
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 5,
			},
			android: {
				elevation: 2,
			},
			web: {
				boxShadow: "0px 2px 8px rgba(13, 19, 43, 0.05)",
			} as any,
		}),
	},
	practiceIntroIcon: {
		width: 52,
		height: 52,
		borderRadius: 18,
		backgroundColor: "#F1EEFF",
		borderWidth: 1,
		borderColor: "#DED8FF",
		alignItems: "center",
		justifyContent: "center",
	},
	practiceCardIconImage: {
		width: 28,
		height: 28,
	},
	statIconImage: {
		width: 18,
		height: 18,
	},
	practiceCard: {
		borderRadius: 22,
		borderBottomWidth: 5,
		minHeight: 96,
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.04,
				shadowRadius: 4,
			},
			android: {
				elevation: 1,
			},
			web: {
				boxShadow: "0px 2px 6px rgba(13, 19, 43, 0.04)",
			} as any,
		}),
	},
	practiceCardDisabled: {
		opacity: 0.78,
	},
	practiceStatusPill: {
		alignSelf: "flex-start",
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 4,
		marginTop: 8,
	},
	practiceActionButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
	},
	practiceDoneButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: "#F0FDF4",
		borderWidth: 1,
		borderColor: "#BBF7D0",
		alignItems: "center",
		justifyContent: "center",
	},
	stickyHeader: {
		backgroundColor: "#F6F7FB",
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 6,
		zIndex: 20,
	},
	stickyHeaderInner: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E5E5",
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 10,
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.06,
				shadowRadius: 5,
			},
			android: {
				elevation: 2,
			},
			web: {
				boxShadow: "0px 2px 8px rgba(13, 19, 43, 0.06)",
			} as any,
		}),
	},
	stickyUnitIcon: {
		width: 40,
		height: 40,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	stickyStatusDot: {
		width: 5,
		height: 5,
		borderRadius: 3,
		marginHorizontal: 6,
	},
	stickyProgressTrack: {
		height: 6,
		backgroundColor: "#E5E5E5",
		borderRadius: 999,
		marginTop: 7,
		overflow: "hidden",
	},
	stickyProgressFill: {
		height: 6,
		borderRadius: 999,
	},
	stickyProgressPill: {
		minWidth: 48,
		minHeight: 40,
		borderRadius: 14,
		backgroundColor: "#F7F7F7",
		borderWidth: 1,
		borderColor: "#E5E5E5",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
	},
	stickyGuidebookButton: {
		width: 40,
		height: 40,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
	},
	stickyGuidebookIcon: {
		width: 23,
		height: 23,
	},
});
