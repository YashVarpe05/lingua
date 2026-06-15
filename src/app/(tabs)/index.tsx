import React, { useState, useEffect, useRef } from "react";
import {
	StyleSheet,
	Modal,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useUser, useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Text, View, Pressable, ScrollView, TouchableOpacity } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import {
	getCurriculumConceptById,
	getCurriculumReviewLabel,
} from "@/data/curriculum";
import { languages } from "@/data/languages";
import { getAllLessonsFromData, getFirstLesson, getLessonById } from "@/data/lessons";
import { units } from "@/data/units";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { ConceptMemoryEntry, ExerciseAttempt, Lesson } from "@/types/learning";
import { authFetch } from "@/lib/apiClient";
import { usePostHog } from "posthog-react-native";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import {
	hasFreshSuccessfulFocusedReview,
	isAttemptRepairedByFocusedReview,
} from "@/utils/conceptReview";
import Button3D from "@/components/Button3D";
import { brand, learning, neutral, semantic } from "@/theme/colors";

// Helper function to return dynamic greeting based on selected language
const getGreeting = (langId: string, name: string) => {
	switch (langId) {
		case "es":
			return `\u00A1Hola, ${name}!`;
		case "fr":
			return `Bonjour, ${name}!`;
		case "ja":
			return `\u3053\u3093\u306B\u3061\u306F, ${name}!`;
		case "de":
			return `Hallo, ${name}!`;
		case "it":
			return `Ciao, ${name}!`;
		case "zh":
			return `\u4F60\u597D, ${name}!`;
		case "ko":
			return `\uC548\uB155\uD558\uC138\uC694, ${name}!`;
		case "ar":
			return `\u0645\u0631\u062D\u0628\u0627\u064B ${name}!`;
		default:
			return `Hello, ${name}!`;
	}
};

const getLevelProgress = (xp: number) => {
	if (xp >= 900) return { progress: 100, min: 900, max: 900, label: "Max Level" };
	if (xp >= 500) return { progress: ((xp - 500) / 400) * 100, min: 500, max: 900, label: `${xp} / 900 XP` };
	if (xp >= 250) return { progress: ((xp - 250) / 250) * 100, min: 250, max: 500, label: `${xp} / 500 XP` };
	if (xp >= 100) return { progress: ((xp - 100) / 150) * 100, min: 100, max: 250, label: `${xp} / 250 XP` };
	return { progress: (xp / 100) * 100, min: 0, max: 100, label: `${xp} / 100 XP` };
};

const getLanguageNameForLesson = (lesson: Lesson | null, fallbackName: string) => {
	if (!lesson) return fallbackName;

	const unit = units.find((item) => item.id === lesson.unitId);
	const language = languages.find((item) => item.id === unit?.languageId);
	return language?.name ?? fallbackName;
};

type DailyChallengeReason = "mistake" | "weak-concept" | "lesson-memory";

const DUE_CONCEPT_RECALL_THRESHOLD = 0.65;

type LeaderboardRankRow = {
	clerkUserId: string;
	rank: number;
};

type LeaderboardFetchResponse = {
	rows?: LeaderboardRankRow[];
	userRow?: LeaderboardRankRow | null;
	error?: string;
};

const lessonBelongsToLanguage = (lesson: Lesson, languageId: string) => {
	const unit = units.find((item) => item.id === lesson.unitId);
	return unit?.languageId === languageId;
};

const getLessonFromExerciseId = (
	exerciseId: string | undefined,
	activeLessons: Lesson[],
	languageId: string,
) => {
	if (!exerciseId) return null;

	const activeLesson = activeLessons.find((lesson) =>
		lesson.exercises?.some((exercise) => exercise.id === exerciseId)
	);
	if (activeLesson) return activeLesson;

	const lesson = getAllLessonsFromData().find((item) =>
		item.exercises?.some((exercise) => exercise.id === exerciseId)
	);

	return lesson && lessonBelongsToLanguage(lesson, languageId) ? lesson : null;
};

const getLessonFromAttempt = (
	attempt: ExerciseAttempt | undefined,
	activeLessons: Lesson[],
	languageId: string,
) => {
	if (!attempt) return null;

	if (attempt.lessonId) {
		const activeLesson = activeLessons.find((lesson) => lesson.id === attempt.lessonId);
		if (activeLesson) return activeLesson;

		const lesson = getLessonById(attempt.lessonId);
		if (lesson && lessonBelongsToLanguage(lesson, languageId)) return lesson;
	}

	return getLessonFromExerciseId(attempt.exerciseId, activeLessons, languageId);
};

const getLessonFromConcept = (
	conceptId: string | undefined,
	recentAttempts: ExerciseAttempt[],
	activeLessons: Lesson[],
	languageId: string,
) => {
	if (!conceptId) return null;

	const relatedAttempt = recentAttempts.find((attempt) =>
		attempt.languageId === languageId && attempt.conceptIds.includes(conceptId)
	);

	return getLessonFromAttempt(relatedAttempt, activeLessons, languageId);
};

const getAttemptCurriculumConcept = (
	attempt: ExerciseAttempt | undefined,
	languageId: string,
) =>
	attempt?.conceptIds
		.map(getCurriculumConceptById)
		.find((concept) => concept?.languageId === languageId);

const getDueConceptCountForLanguage = (
	conceptMemory: Record<string, ConceptMemoryEntry>,
	recentAttempts: ExerciseAttempt[],
	languageId: string,
	getConceptRecallScore: (conceptId: string) => number,
) => {
	const languageConceptIds = new Set(
		recentAttempts
			.filter((attempt) => attempt.languageId === languageId)
			.flatMap((attempt) => attempt.conceptIds)
	);

	return [...languageConceptIds].filter((conceptId) => {
		const entry = conceptMemory[conceptId];
		if (!entry) return false;
		if (hasFreshSuccessfulFocusedReview(entry)) return false;

		return (
			getConceptRecallScore(conceptId) < DUE_CONCEPT_RECALL_THRESHOLD ||
			entry.incorrectCount > entry.correctCount
		);
	}).length;
};

const hasConceptMemoryForLanguage = (
	conceptMemory: Record<string, ConceptMemoryEntry>,
	recentAttempts: ExerciseAttempt[],
	languageId: string,
) =>
	recentAttempts.some(
		(attempt) =>
			attempt.languageId === languageId &&
			attempt.conceptIds.some((conceptId) => Boolean(conceptMemory[conceptId]))
	);

const getDailyChallengeBadge = (
	reason: DailyChallengeReason,
	isNewLesson: boolean,
	forgettingScore: number,
) => {
	if (reason === "mistake") {
		return {
			label: "\u{1F501} Fix a mistake",
			containerClassName: "bg-[#FFF8E6] border-[#FFE8B3]",
			textClassName: "text-[#FF8A00]",
		};
	}

	if (reason === "weak-concept") {
		return {
			label: "\u{1F9E0} Strengthen memory",
			containerClassName: "bg-[#F0EDFF] border-[#E1D9FF]",
			textClassName: "text-[#6C4EF5]",
		};
	}

	if (isNewLesson) {
		return {
			label: "\u{1F195} New lesson",
			containerClassName: "bg-[#E8F9EE] border-[#BDEFBF]",
			textClassName: "text-[#21C16B]",
		};
	}

	if (forgettingScore > 1) {
		return {
			label: "\u{1F4C5} Review due",
			containerClassName: "bg-[#FFF8E6] border-[#FFE8B3]",
			textClassName: "text-[#FF8A00]",
		};
	}

	if (forgettingScore > 0.5) {
		return {
			label: "\u{1F504} Good time to review",
			containerClassName: "bg-[#EBF3FF] border-[#D0E5FF]",
			textClassName: "text-[#1CB0F6]",
		};
	}

	return {
		label: "\u{2728} Fresh memory",
		containerClassName: "bg-[#F3F4F6] border-[#E5E7EB]",
		textClassName: "text-neutral-secondary",
	};
};

export default function HomeScreen() {
	const router = useRouter();
	const posthog = usePostHog();
	const { signOut, getToken } = useAuth();
	const { user } = useUser();
	const getTokenRef = useRef(getToken);
	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const clearStorage = useLanguageStore((state) => state.clearStorage);

	// Progress state
	const completedLessons = useProgressStore((state) => state.completedLessons);
	const xp = useProgressStore((state) => state.xp);
	const streak = useProgressStore((state) => state.streak);
	const completeLesson = useProgressStore((state) => state.completeLesson);
	const resetProgress = useProgressStore((state) => state.resetProgress);
	const todayXP = useProgressStore((state) => state.todayXP) || 0;
	const level = useProgressStore((state) => state.level) || 1;
	const dailyChallengeCompletedDate = useProgressStore((state) => state.dailyChallengeCompletedDate);
	const lessonMemory = useProgressStore((state) => state.lessonMemory);
	const getForgettingScore = useProgressStore((state) => state.getForgettingScore);
	const getMostUrgentLessons = useProgressStore((state) => state.getMostUrgentLessons);
	const recentAttempts = useProgressStore((state) => state.recentAttempts) || [];
	const conceptMemory = useProgressStore((state) => state.conceptMemory) || {};
	const getConceptRecallScore = useProgressStore((state) => state.getConceptRecallScore);
	const getWeakConcepts = useProgressStore((state) => state.getWeakConcepts);
	const getWeakPronunciationConcepts = useProgressStore(
		(state) => state.getWeakPronunciationConcepts
	);
	const getDuePronunciationConceptCount = useProgressStore(
		(state) => state.getDuePronunciationConceptCount
	);
	const completedCheckpoints = useProgressStore((state) => state.completedCheckpoints) || [];

	// Active lesson modal state
	const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
	const [modalVisible, setModalVisible] = useState(false);

	const [userWeeklyRank, setUserWeeklyRank] = useState<number | null>(null);
	const [hasEntry, setHasEntry] = useState<boolean>(false);
	const [rankLoadFailed, setRankLoadFailed] = useState(false);

	useEffect(() => {
		getTokenRef.current = getToken;
	}, [getToken]);

	useEffect(() => {
		let cancelled = false;

		const fetchWeeklyRank = async () => {
			if (!user?.id) {
				setUserWeeklyRank(null);
				setHasEntry(false);
				setRankLoadFailed(false);
				return;
			}

			try {
				setRankLoadFailed(false);
				const response = await authFetch(getTokenRef.current, "/api/leaderboard/fetch?type=weekly");
				const data = (await response.json()) as LeaderboardFetchResponse;

				if (!response.ok || data.error) {
					throw new Error(data.error || "Leaderboard request failed");
				}

				if (cancelled) return;

				if (data.userRow) {
					setUserWeeklyRank(data.userRow.rank);
					setHasEntry(true);
					return;
				}

				const found = data.rows?.find((row) => row.clerkUserId === user.id);
				if (found) {
					setUserWeeklyRank(found.rank);
					setHasEntry(true);
				} else {
					setUserWeeklyRank(null);
					setHasEntry(false);
				}
			} catch {
				if (!cancelled) {
					setUserWeeklyRank(null);
					setHasEntry(false);
					setRankLoadFailed(true);
				}
			}
		};

		fetchWeeklyRank();

		return () => {
			cancelled = true;
		};
	}, [user?.id]);

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
	const currentUnit = activeUnits.find((unit) => !completedCheckpoints.includes(unit.id)) || activeUnits[activeUnits.length - 1];

	// Calculate unit progress details
	const unitLessons = activeLessons.filter((l) => l.unitId === currentUnit.id && !l.isCheckpoint);
	
	// Daily goal calculations (20 XP standard goal, sum of completed lesson XP rewards)
	const dailyGoalXp = 20;
	const currentXpProgress = Math.min(todayXP, dailyGoalXp);
	const dailyGoalPercent = Math.min((currentXpProgress / dailyGoalXp) * 100, 100);

	// Find the next uncompleted lesson to recommend
	const nextLesson = unitLessons.find((l) => !completedLessons.includes(l.id)) || null;
	const recentMistakeAttempt = recentAttempts.find(
		(attempt) =>
			!attempt.correct &&
			attempt.languageId === selectedLanguage.id &&
			!isAttemptRepairedByFocusedReview(attempt, conceptMemory),
	);
	const recentMistakeLesson = getLessonFromAttempt(
		recentMistakeAttempt,
		activeLessons,
		selectedLanguage.id,
	);
	const weakConcepts = getWeakConcepts(20);
	const weakConceptLesson =
		weakConcepts
			.map((concept) =>
				getLessonFromConcept(
					concept.conceptId,
					recentAttempts,
					activeLessons,
					selectedLanguage.id,
				)
			)
			.find((candidate): candidate is Lesson => Boolean(candidate)) ?? null;
	const urgentLessonId = getMostUrgentLessons(12).find((lessonId) => {
		const activeLesson = activeLessons.find((lesson) => lesson.id === lessonId);
		if (activeLesson) return true;

		const lesson = getLessonById(lessonId);
		return lesson ? lessonBelongsToLanguage(lesson, selectedLanguage.id) : false;
	});
	const urgentLesson = urgentLessonId ? getLessonById(urgentLessonId) : null;
	const activeUrgentLesson =
		urgentLesson && lessonBelongsToLanguage(urgentLesson, selectedLanguage.id)
			? urgentLesson
			: activeLessons.find((lesson) => lesson.id === urgentLessonId) ?? null;
	const dailyChallengeLesson =
		recentMistakeLesson ??
		weakConceptLesson ??
		activeUrgentLesson ??
		activeLessons[0] ??
		getFirstLesson() ??
		null;
	const dailyChallengeReason: DailyChallengeReason = recentMistakeLesson
		? "mistake"
		: weakConceptLesson
			? "weak-concept"
			: "lesson-memory";
	const dailyChallengeLessonId = dailyChallengeLesson?.id ?? urgentLessonId;
	const forgettingScore = dailyChallengeLessonId ? getForgettingScore(dailyChallengeLessonId) : 0;
	const isNewDailyLesson = dailyChallengeLessonId ? !lessonMemory[dailyChallengeLessonId] : true;
	const dailyChallengeBadge = getDailyChallengeBadge(
		dailyChallengeReason,
		isNewDailyLesson,
		forgettingScore,
	);
	const dailyChallengeLanguageName = getLanguageNameForLesson(dailyChallengeLesson, selectedLanguage.name);
	const hasLanguageConceptMemory = hasConceptMemoryForLanguage(
		conceptMemory,
		recentAttempts,
		selectedLanguage.id,
	);
	const dueConceptCount = getDueConceptCountForLanguage(
		conceptMemory,
		recentAttempts,
		selectedLanguage.id,
		getConceptRecallScore,
	);
	const dueLessonCount = activeLessons.filter(
		(lesson) => !lesson.isCheckpoint
	).filter(
		(item) => getForgettingScore(item.id) > 1,
	).length;
	const dueReviewCount = hasLanguageConceptMemory ? dueConceptCount : dueLessonCount;
	const dueReviewLabel = hasLanguageConceptMemory
		? `${dueReviewCount} ${dueReviewCount === 1 ? "concept" : "concepts"} due for review`
		: `${dueReviewCount} ${dueReviewCount === 1 ? "lesson" : "lessons"} due for review`;
	const recentMistakeConcept = getAttemptCurriculumConcept(
		recentMistakeAttempt,
		selectedLanguage.id,
	);
	const reviewFocusConceptIds = [
		recentMistakeConcept?.id,
		...weakConcepts
			.filter((concept) =>
				recentAttempts.some(
					(attempt) =>
						attempt.languageId === selectedLanguage.id &&
						attempt.conceptIds.includes(concept.conceptId),
				)
			)
			.map((concept) => concept.conceptId),
	]
		.filter((conceptId): conceptId is string => Boolean(conceptId))
		.slice(0, 3);
	const reviewFocusLabel = getCurriculumReviewLabel(reviewFocusConceptIds);
	const weakPronunciationConcepts = getWeakPronunciationConcepts(3, selectedLanguage.id);
	const duePronunciationConceptCount = getDuePronunciationConceptCount(selectedLanguage.id);
	const pronunciationFocusConceptIds = weakPronunciationConcepts.map((entry) => entry.id);
	const pronunciationFocusLabel = getCurriculumReviewLabel(
		pronunciationFocusConceptIds.slice(0, 3)
	);
	const speakingPracticeLessonId =
		weakPronunciationConcepts
			.map((entry) => entry.lessonId)
			.find((lessonId): lessonId is string =>
				Boolean(lessonId && activeLessons.some((lesson) => lesson.id === lessonId))
			) ??
		dailyChallengeLesson?.id ??
		nextLesson?.id ??
		activeLessons.find((lesson) => !lesson.isCheckpoint)?.id;
	const todayFocusTitle = recentMistakeConcept
		? "Fix a recent mistake"
		: dueReviewCount > 0
			? "Review before it fades"
			: nextLesson
				? "Continue your path"
				: "Keep memory warm";
	const todayFocusSubtitle = recentMistakeConcept
		? `Practice ${recentMistakeConcept.title} while it is fresh.`
		: reviewFocusLabel
			? `Focus: ${reviewFocusLabel}`
			: nextLesson
				? `Next up: ${nextLesson.title}`
				: "Start a light review to protect your streak.";
	const todayFocusAccent = recentMistakeConcept
		? learning.correction
		: dueReviewCount > 0
			? learning.reward
			: brand.primary;
	const todayFocusIcon: keyof typeof Feather.glyphMap = recentMistakeConcept
		? "alert-circle"
		: dueReviewCount > 0
			? "refresh-cw"
			: "map";

	const handleOpenLesson = (lesson: Lesson) => {
		posthog.capture("lesson_opened", {
			lesson_id: lesson.id,
			lesson_title: lesson.title,
			lesson_type: lesson.type,
			language_id: selectedLanguageId,
			xp_reward: lesson.xpReward,
		});
		setSelectedLesson(lesson);
		setModalVisible(true);
	};

	const handleOpenDailyChallenge = () => {
		if (!dailyChallengeLesson) return;

		posthog.capture("daily_challenge_opened", {
			lesson_id: dailyChallengeLesson.id,
			language_id: selectedLanguageId,
			forgetting_score: forgettingScore,
			source: dailyChallengeReason,
		});
		router.push({
			pathname: "/exercise-session",
			params: { lessonId: dailyChallengeLesson.id, isDailyChallenge: "true" },
		});
	};

	const handleOpenSpeakingPractice = () => {
		if (!speakingPracticeLessonId) return;

		posthog.capture("speaking_practice_recommended_opened", {
			lesson_id: speakingPracticeLessonId,
			language_id: selectedLanguageId,
			due_pronunciation_concepts: duePronunciationConceptCount,
		});
		router.push({
			pathname: "/exercise-session",
			params: { lessonId: speakingPracticeLessonId, mode: "speaking" },
		});
	};

	const handleOpenPracticeHub = () => {
		router.push("/practice-hub" as Href);
	};

	const handleCompleteMockLesson = async () => {
		if (selectedLesson) {
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
		}
	};

	const handleSignOut = async () => {
		try {
			posthog.capture("sign_out");
			posthog.reset();
			await signOut();
		} catch (err) {
			console.error("Failed to sign out:", err);
		}
	};

	const handleClearStorage = async () => {
		try {
			posthog.capture("progress_reset", { language_id: selectedLanguageId });
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

	const getLessonIconAsset = (type: string) => {
		switch (type) {
			case "video":
				return images.appIconVideo;
			case "audio":
				return images.appIconHeadphones;
			case "chat":
				return null;
			default:
				return images.appIconBook;
		}
	};

	// Determine theme colors based on lesson type
	const getLessonColors = (type: string) => {
		switch (type) {
			case "video":
				return { bg: brand.primaryLight, text: brand.primary }; // purple container
			case "chat":
				return { bg: "#FFF0ED", text: semantic.error }; // pink container
			default:
				return { bg: "#EBF3FF", text: brand.blue }; // blue container
		}
	};

	const getLessonTypeLabel = (type: string) => {
		switch (type) {
			case "video":
				return "AI Conversation";
			case "chat":
				return "New Words";
			case "audio":
				return "Audio Lesson";
			default:
				return "Lesson Practice";
		}
	};

	const displayName = user?.firstName || user?.username || "JavaScript";
	const userInitial = displayName ? displayName[0].toUpperCase() : "J";
	const levelProgressMeta = getLevelProgress(xp);

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.homeContentShell}>
				<View style={styles.dashboardHeaderCard}>
					<View className="flex-row items-center justify-between">
						<TouchableOpacity
							onPress={() => router.push("/languages")}
							activeOpacity={0.78}
							style={styles.languagePill}
						>
							<Image
								source={{ uri: selectedLanguage.flag }}
								style={styles.languagePillFlag}
								contentFit="cover"
							/>
							<View className="ml-2 mr-2">
								<Text className="font-poppins-semibold text-[10px] text-[#6B7280] uppercase tracking-[0.6px]">
									Learning
								</Text>
								<Text className="font-poppins-bold text-[13px] text-[#111827]">
									{selectedLanguage.name}
								</Text>
							</View>
							<Feather name="chevron-down" size={14} color="#6B7280" />
						</TouchableOpacity>

						<View className="flex-row items-center gap-2">
							<TouchableOpacity activeOpacity={0.75} style={styles.headerIconButton}>
								<Image
									source={images.appIconBell}
									style={styles.topActionIconImage}
									contentFit="contain"
								/>
							</TouchableOpacity>
							<View style={styles.avatarButton}>
								<Text className="font-poppins-bold text-[14px] text-white">
									{userInitial}
								</Text>
							</View>
						</View>
					</View>

					<Text className="font-poppins-bold text-[28px] text-[#111827] leading-[34px] mt-5">
						{getGreeting(selectedLanguage.id, displayName)}
					</Text>
					<Text className="font-poppins text-[13px] text-[#6B7280] leading-[20px] mt-2">
						Your next lesson, review, and speaking practice are lined up for today.
					</Text>

					<View style={styles.dailyGoalPanel}>
						<View className="flex-1 mr-4">
							<View className="flex-row items-center">
								<Image
									source={images.appIconTarget}
									style={styles.dailyGoalIcon}
									contentFit="contain"
								/>
								<Text className="font-poppins-bold text-[13px] text-[#111827] ml-2">
									Daily goal
								</Text>
							</View>
							<Text className="font-poppins-bold text-[22px] text-[#111827] mt-2">
								{currentXpProgress} <Text className="font-poppins text-[12px] text-[#6B7280]">/ {dailyGoalXp} XP</Text>
							</Text>
							<View style={styles.dailyGoalTrack}>
								<View style={[styles.dailyGoalFill, { width: `${dailyGoalPercent}%` }]} />
							</View>
						</View>
						<Image
							source={images.treasure}
							style={styles.dailyGoalTreasure}
							contentFit="contain"
						/>
					</View>
				</View>

				<View style={styles.statStrip}>
					<View style={styles.statCard}>
						<View style={[styles.statIconBubble, styles.statIconBubbleOrange]}>
							<Image
								source={images.streakFire}
								style={styles.statImageIcon}
								contentFit="contain"
							/>
						</View>
						<Text className="font-poppins-bold text-[18px] text-[#111827] mt-2">
							{streak}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-[#6B7280] text-center">
							Streak
						</Text>
					</View>
					<View style={styles.statCard}>
						<View style={[styles.statIconBubble, styles.statIconBubblePurple]}>
							<Image
								source={images.appIconLightning}
								style={styles.statImageIcon}
								contentFit="contain"
							/>
						</View>
						<Text className="font-poppins-bold text-[18px] text-[#111827] mt-2">
							{xp}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-[#6B7280] text-center">
							Total XP
						</Text>
					</View>
					<View style={styles.statCardWide}>
						<View className="flex-row items-center justify-between">
							<View>
								<Text className="font-poppins-bold text-[13px] text-[#5537D2]">
									Level {level}
								</Text>
								<Text className="font-poppins-semibold text-[10px] text-[#6B7280] mt-0.5">
									+{todayXP} XP today
								</Text>
							</View>
							<View style={styles.levelIconBubble}>
								<Image
									source={images.appIconStar}
									style={styles.statImageIcon}
									contentFit="contain"
								/>
							</View>
						</View>
						<View style={styles.levelTrack}>
							<View style={[styles.levelFill, { width: `${levelProgressMeta.progress}%` }]} />
						</View>
						<Text className="font-poppins text-[9px] text-[#6B7280] text-right mt-1">
							{levelProgressMeta.label}
						</Text>
					</View>
				</View>

				{/* Continue learning primary card */}
				<View style={styles.continueLearningCard}>
					<View className="flex-1 mr-4">
						<Text className="font-poppins-semibold text-[11px] text-lingua-purple-light uppercase tracking-[0.5px]">
							Continue learning
						</Text>
						<Text className="font-poppins-bold text-[22px] text-white mt-1 leading-[28px]">
							{nextLesson?.title ?? selectedLanguage.name}
						</Text>
						<Text className="font-poppins text-[12px] text-lingua-purple-light mt-1 leading-[17px]">
							{currentUnit.title}
						</Text>
						{nextLesson ? (
							<TouchableOpacity
								style={styles.continueBtn}
								activeOpacity={0.85}
								onPress={() => handleOpenLesson(nextLesson)}
							>
								<Text className="font-poppins-bold text-[13px] text-lingua-purple">
									Start next lesson
								</Text>
							</TouchableOpacity>
						) : (
							<View className="mt-4 bg-success rounded-xl py-2 px-3 self-start flex-row items-center">
								<Image
									source={images.appIconStar}
									style={styles.smallInlineIconImage}
									contentFit="contain"
								/>
								<Text className="font-poppins-bold text-[11px] text-white ml-1.5">
									Unit Completed!
								</Text>
							</View>
						)}
					</View>
					<Image
						source={images.palace}
						style={styles.continueLearningImage}
						contentFit="contain"
					/>
				</View>

				{/* Today's focus card */}
				<View style={styles.todayFocusCard}>
					<View style={[styles.todayFocusIcon, { backgroundColor: todayFocusAccent }]}>
						<Feather name={todayFocusIcon} size={18} color="#FFFFFF" />
					</View>
					<View className="flex-1 mr-3">
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.5px]">
							Today&apos;s focus
						</Text>
						<Text className="font-poppins-bold text-[16px] text-neutral-primary mt-0.5">
							{todayFocusTitle}
						</Text>
						<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5 leading-[17px]">
							{todayFocusSubtitle}
						</Text>
					</View>
					<TouchableOpacity
						onPress={handleOpenPracticeHub}
						activeOpacity={0.8}
						style={styles.todayFocusAction}
					>
						<Feather name="arrow-right" size={18} color={brand.primary} />
					</TouchableOpacity>
				</View>

				{/* Daily Challenge Card */}
				{(() => {
					const todayStr = (() => {
						const now = new Date();
						return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
					})();
					const isDailyCompletedToday = dailyChallengeCompletedDate === todayStr;
					const dailyChallengeSubtitle = isDailyCompletedToday
						? "You completed today's daily challenge! Come back tomorrow for more. \u{1F31F}"
						: dailyChallengeReason === "mistake"
							? `${dailyChallengeLanguageName} - fixing a recent mistake`
							: dailyChallengeReason === "weak-concept"
								? `${dailyChallengeLanguageName} - strengthening weak memory`
								: forgettingScore > 1
									? `${dailyChallengeLanguageName} - review is due`
									: `${dailyChallengeLanguageName} - memory-smart practice`;

					return (
						<TouchableOpacity
							onPress={isDailyCompletedToday ? undefined : handleOpenDailyChallenge}
							disabled={isDailyCompletedToday}
							activeOpacity={0.8}
							style={[
								styles.homeLearningCard,
								isDailyCompletedToday
									? styles.homeLearningCardDisabled
									: styles.dailyChallengeCard,
							]}
						>
							<View className="flex-1 mr-4">
								<Text className={`font-poppins-semibold text-[11px] uppercase tracking-[0.5px] ${
									isDailyCompletedToday ? "text-[#9CA3AF]" : "text-[#4D8BFF]"
								}`}>
									Daily Challenge
								</Text>
								<View className={`self-start border rounded-full px-2.5 py-1 mt-2 ${dailyChallengeBadge.containerClassName}`}>
									<Text className={`font-poppins-bold text-[10px] ${dailyChallengeBadge.textClassName}`}>
										{dailyChallengeBadge.label}
									</Text>
								</View>
								<Text className={`font-poppins-bold text-[18px] mt-1 ${
									isDailyCompletedToday ? "text-[#9CA3AF]" : "text-[#0D132B]"
								}`}>
									{dailyChallengeLesson?.title ?? "Practice Exercises"}
								</Text>
								<Text className="font-poppins text-[12px] text-neutral-secondary mt-1">
									{dailyChallengeSubtitle}
								</Text>
							</View>
							<View
								style={[
									styles.cardActionCircle,
									isDailyCompletedToday
										? styles.cardDoneCircle
										: styles.dailyActionCircle,
								]}
							>
								{isDailyCompletedToday ? (
									<Feather name="check" size={20} color="#FFFFFF" />
								) : (
									<Feather name="play" size={20} color="#FFFFFF" style={{ marginLeft: 3 }} />
								)}
							</View>
						</TouchableOpacity>
					);
				})()}

				{/* Smart practice grid */}
				<View style={styles.sectionHeaderRow}>
					<Text className="font-poppins-bold text-[17px] text-neutral-primary">
						Smart practice
					</Text>
					<Text className="font-poppins-semibold text-[12px] text-neutral-secondary">
						2 quick paths
					</Text>
				</View>

				<View style={styles.quickPracticeGrid}>
					<TouchableOpacity
						onPress={handleOpenPracticeHub}
						activeOpacity={0.82}
						style={[styles.quickPracticeCard, styles.reviewQuickCard]}
					>
						<View style={styles.quickPracticeTopRow}>
							<View style={[styles.quickPracticeIcon, styles.reviewQuickIcon]}>
								<Feather name="refresh-cw" size={18} color={learning.rewardDark} />
							</View>
							<View style={styles.quickPracticeArrow}>
								<Feather name="arrow-up-right" size={16} color={learning.rewardDark} />
							</View>
						</View>

						<Text className="font-poppins-bold text-[16px] text-neutral-primary mt-4">
							Practice Hub
						</Text>
						<Text
							className="font-poppins text-[12px] text-neutral-secondary mt-1 leading-[17px]"
							numberOfLines={2}
						>
							{dueReviewCount > 0
								? dueReviewLabel
								: "Mistakes, words, listening, and speaking"}
						</Text>
						<View style={styles.quickPracticeMetaPill}>
							<Text style={styles.reviewQuickMetaText} numberOfLines={1}>
								{reviewFocusLabel ? `Focus: ${reviewFocusLabel}` : "Review mix"}
							</Text>
						</View>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={handleOpenSpeakingPractice}
						disabled={!speakingPracticeLessonId}
						activeOpacity={0.82}
						style={[
							styles.quickPracticeCard,
							styles.speakingQuickCard,
							!speakingPracticeLessonId ? styles.quickPracticeCardDisabled : null,
						]}
					>
						<View style={styles.quickPracticeTopRow}>
							<View style={[styles.quickPracticeIcon, styles.speakingQuickIcon]}>
								<Image
									source={images.appIconMicrophone}
									style={styles.quickPracticeImageIcon}
									contentFit="contain"
								/>
							</View>
							<View style={[styles.quickPracticeArrow, styles.speakingQuickArrow]}>
								<Feather name="arrow-up-right" size={16} color={learning.actionDark} />
							</View>
						</View>

						<Text className="font-poppins-bold text-[16px] text-neutral-primary mt-4">
							Speaking
						</Text>
						<Text
							className="font-poppins text-[12px] text-neutral-secondary mt-1 leading-[17px]"
							numberOfLines={2}
						>
							{duePronunciationConceptCount > 0
								? `${duePronunciationConceptCount} pronunciation ${duePronunciationConceptCount === 1 ? "concept" : "concepts"} due`
								: "Keep your speaking confidence warm"}
						</Text>
						<View style={[styles.quickPracticeMetaPill, styles.speakingQuickMetaPill]}>
							<Text style={styles.speakingQuickMetaText} numberOfLines={1}>
								{pronunciationFocusLabel || "Voice scoring"}
							</Text>
						</View>
					</TouchableOpacity>
				</View>

				{/* League Card */}
				<TouchableOpacity
					onPress={() => router.push("/league")}
					activeOpacity={0.8}
					style={[styles.homeLearningCard, styles.leagueCard]}
				>
					<View className="flex-1 mr-4">
						<Text className="font-poppins-semibold text-[11px] text-[#B78F00] uppercase tracking-[0.5px]">
							League
						</Text>
						<Text className="font-poppins-bold text-[18px] text-[#0D132B] mt-1">
							Weekly Leaderboard
						</Text>
						<Text className="font-poppins text-[12px] text-neutral-secondary mt-1">
							{rankLoadFailed
								? "Leaderboard is syncing. Tap to retry."
								: hasEntry && userWeeklyRank !== null
								? `You are #${userWeeklyRank} this week!`
								: "Complete a lesson to join the league"}
						</Text>
					</View>
					<View style={[styles.cardActionCircle, styles.leagueActionCircle]}>
						<Image
							source={images.appIconStar}
							style={styles.cardActionIconImage}
							contentFit="contain"
						/>
					</View>
				</TouchableOpacity>

				{/* Today's plan header */}
				<View className="flex-row items-center justify-between mb-3">
					<Text className="font-poppins-bold text-[17px] text-neutral-primary">
						Today&apos;s plan
					</Text>
					<TouchableOpacity
						onPress={handleOpenPracticeHub}
						activeOpacity={0.75}
					>
						<Text className="font-poppins-semibold text-[13px] text-lingua-blue">
							View all
						</Text>
					</TouchableOpacity>
				</View>

				{/* Today's Plan list of lessons */}
				<View style={styles.planList}>
					{unitLessons.map((item, index) => {
						const isCompleted = completedLessons.includes(item.id);
						const isCurrent = nextLesson?.id === item.id;
						const iconName = getLessonIcon(item.type);
						const iconAsset = getLessonIconAsset(item.type);
						const colors = getLessonColors(item.type);
						const lessonTypeLabel = getLessonTypeLabel(item.type);
						const statusLabel = isCompleted ? "Done" : isCurrent ? "Next" : "Queued";

						return (
							<TouchableOpacity
								key={item.id}
								onPress={() => handleOpenLesson(item)}
								activeOpacity={0.8}
								style={[
									styles.planCard,
									isCompleted ? styles.planCardCompleted : null,
									isCurrent ? styles.planCardCurrent : null,
								]}
							>
								<View style={styles.planIconWrap}>
									<View
										style={[styles.planIconInner, { backgroundColor: colors.bg }]}
									>
										{iconAsset ? (
											<Image
												source={iconAsset}
												style={styles.planIconImage}
												contentFit="contain"
											/>
										) : (
											<Feather name={iconName} size={18} color={colors.text} />
										)}
									</View>
									<View style={styles.planOrderBadge}>
										<Text className="font-poppins-bold text-[9px] text-neutral-secondary">
											{index + 1}
										</Text>
									</View>
								</View>

								<View style={styles.planCardBody}>
									<View className="flex-row items-center justify-between gap-2">
										<Text className="font-poppins-bold text-[14px] text-neutral-primary flex-1">
											{item.title}
										</Text>
										<View
											style={[
												styles.planStatusPill,
												isCompleted ? styles.planStatusDone : null,
												isCurrent ? styles.planStatusCurrent : null,
											]}
										>
											<Text
												style={[
													styles.planStatusText,
													isCompleted ? styles.planStatusDoneText : null,
													isCurrent ? styles.planStatusCurrentText : null,
												]}
											>
												{statusLabel}
											</Text>
										</View>
									</View>

									<Text className="font-poppins-semibold text-[11px] text-neutral-secondary mt-0.5">
										{lessonTypeLabel}
									</Text>

									<View style={styles.planMetaRow}>
										<Image
											source={images.appIconTimer}
											style={styles.planMetaIconImage}
											contentFit="contain"
										/>
										<Text className="font-poppins-semibold text-[11px] text-neutral-secondary">
											{item.durationMinutes} min
										</Text>
										<View style={styles.planMetaDot} />
										<Image
											source={images.appIconLightning}
											style={styles.planMetaIconImage}
											contentFit="contain"
										/>
										<Text className="font-poppins-semibold text-[11px] text-neutral-secondary">
											{item.xpReward} XP
										</Text>
									</View>
								</View>

								<View
									style={[
										styles.planActionCircle,
										isCompleted ? styles.planActionDone : null,
										isCurrent ? styles.planActionCurrent : null,
									]}
								>
									<Feather
										name={isCompleted ? "check" : isCurrent ? "play" : "circle"}
										size={isCurrent ? 13 : 12}
										color={isCompleted || isCurrent ? "#FFFFFF" : neutral.textSecondary}
									/>
								</View>
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
						<View style={styles.modalHandle} />

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
								{(() => {
									const selectedLessonIconAsset = getLessonIconAsset(selectedLesson.type);
									const selectedLessonColors = getLessonColors(selectedLesson.type);

									return (
								<View style={styles.modalHero}>
									<View style={styles.modalHeroCopy}>
										<View className="flex-row items-center gap-2">
											<View style={styles.modalReadyDot} />
											<Text className="font-poppins-bold text-[11px] uppercase tracking-[0.5px] text-[#5537D2]">
												Ready to learn
											</Text>
										</View>

										<Text className="font-poppins-bold text-[24px] text-neutral-primary leading-[30px] mt-3">
											{selectedLesson.title}
										</Text>
										<Text className="font-poppins text-[13px] text-neutral-secondary leading-[19px] mt-2">
											{selectedLesson.description}
										</Text>

										<View style={styles.modalLessonPill}>
											<View
												style={[
													styles.modalLessonIcon,
													{ backgroundColor: selectedLessonColors.bg },
												]}
											>
												{selectedLessonIconAsset ? (
													<Image
														source={selectedLessonIconAsset}
														style={styles.modalLessonIconImage}
														contentFit="contain"
													/>
												) : (
													<Feather
														name={getLessonIcon(selectedLesson.type)}
														size={13}
														color={selectedLessonColors.text}
													/>
												)}
											</View>
											<Text className="font-poppins-bold text-[11px] uppercase tracking-[0.5px] text-neutral-secondary">
												{getLessonTypeLabel(selectedLesson.type)}
											</Text>
										</View>
									</View>
									<Image
										source={images.mascotWelcome}
										style={styles.modalHeroMascot}
										contentFit="contain"
									/>
								</View>
									);
								})()}

								{/* Details metadata */}
								<View style={styles.modalStatsCard}>
									<View style={styles.modalStatItem}>
										<View style={styles.modalStatIcon}>
											<Image
												source={images.appIconTimer}
												style={styles.modalStatIconImage}
												contentFit="contain"
											/>
										</View>
										<View>
											<Text className="font-poppins-bold text-[13px] text-neutral-primary">
												{selectedLesson.durationMinutes} mins
											</Text>
											<Text className="font-poppins text-[10px] text-neutral-secondary">
												Duration
											</Text>
										</View>
									</View>
									<View style={styles.modalStatItem}>
										<View style={[styles.modalStatIcon, styles.modalStatIconXp]}>
											<Image
												source={images.appIconLightning}
												style={styles.modalStatIconImage}
												contentFit="contain"
											/>
										</View>
										<View>
											<Text className="font-poppins-bold text-[13px] text-neutral-primary">
												{selectedLesson.xpReward} XP
											</Text>
											<Text className="font-poppins text-[10px] text-neutral-secondary">
												Reward
											</Text>
										</View>
									</View>
									<View style={styles.modalStatItem}>
										<View style={[styles.modalStatIcon, styles.modalStatIconLevel]}>
											<Image
												source={images.appIconTarget}
												style={styles.modalStatIconImage}
												contentFit="contain"
											/>
										</View>
										<View>
											<Text className="font-poppins-bold text-[13px] text-neutral-primary">
												A1
											</Text>
											<Text className="font-poppins text-[10px] text-neutral-secondary">
												Level
											</Text>
										</View>
									</View>
								</View>

								<View style={styles.modalPrepCard}>
									<View style={styles.modalPrepIcon}>
										<Image
											source={images.appIconStar}
											style={styles.modalPrepIconImage}
											contentFit="contain"
										/>
									</View>
									<Text className="font-poppins-semibold text-[12px] text-neutral-primary flex-1 leading-[17px]">
										Practice a short set of questions, then review mistakes right away.
									</Text>
								</View>

								{/* Goals */}
								{selectedLesson.goals && selectedLesson.goals.length > 0 && (
									<View style={styles.modalGoalsCard}>
										<View className="flex-row items-center justify-between mb-2">
											<Text className="font-poppins-bold text-[13px] text-neutral-primary">
												Learning Goals
											</Text>
											<Text className="font-poppins-bold text-[10px] text-neutral-secondary uppercase tracking-[0.4px]">
												{selectedLesson.goals.length} goals
											</Text>
										</View>
										{selectedLesson.goals.map((goal, idx) => (
											<View key={idx} style={styles.modalGoalRow}>
												<View style={styles.modalGoalIcon}>
													<Feather name="check" size={12} color="#FFFFFF" />
												</View>
												<Text className="font-poppins text-[12px] text-neutral-primary ml-2 flex-1 leading-[16px]">
													{goal}
												</Text>
											</View>
										))}
									</View>
								)}

								{/* CTA Actions */}
								<View style={styles.modalButtonStack}>
									<Button3D
										onPress={() => {
											posthog.capture("lesson_started", {
												lesson_id: selectedLesson.id,
												lesson_title: selectedLesson.title,
												lesson_type: selectedLesson.type,
												language_id: selectedLanguageId,
											});
											setModalVisible(false);
											router.push({
												pathname: "/lesson/[id]",
												params: { id: selectedLesson.id },
											});
										}}
										variant="brand"
										title="START LESSON"
										fullWidth
									/>

									{__DEV__ ? (
										<Button3D
											onPress={handleCompleteMockLesson}
											variant="ghost"
											title="MOCK COMPLETE"
											fullWidth
										/>
									) : null}
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
		backgroundColor: "#F7FAFC",
	},
	languageStack: {
		alignItems: "flex-start",
		justifyContent: "center",
	},
	topBarIconImage: {
		width: 15,
		height: 15,
	},
	topActionIconImage: {
		width: 20,
		height: 20,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		alignItems: "center",
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: 28,
	},
	homeContentShell: {
		width: "100%",
		maxWidth: 460,
	},
	dashboardHeaderCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 30,
		borderWidth: 1,
		borderColor: "#E8EAF0",
		padding: 16,
		marginBottom: 14,
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.07,
		shadowRadius: 18,
		elevation: 4,
	},
	languagePill: {
		minHeight: 46,
		borderRadius: 23,
		backgroundColor: "#F7FAFC",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		paddingHorizontal: 10,
		paddingVertical: 7,
		flexDirection: "row",
		alignItems: "center",
	},
	languagePillFlag: {
		width: 30,
		height: 30,
		borderRadius: 15,
	},
	headerIconButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: "#F7FAFC",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		alignItems: "center",
		justifyContent: "center",
	},
	avatarButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: brand.primary,
		alignItems: "center",
		justifyContent: "center",
	},
	dailyGoalPanel: {
		marginTop: 16,
		borderRadius: 24,
		borderWidth: 1,
		borderColor: "#FFEAD4",
		backgroundColor: "#FFF8F2",
		padding: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	dailyGoalIcon: {
		width: 20,
		height: 20,
	},
	dailyGoalTrack: {
		height: 8,
		borderRadius: 4,
		backgroundColor: "#EBF0F3",
		marginTop: 10,
		overflow: "hidden",
	},
	dailyGoalFill: {
		height: 8,
		borderRadius: 4,
		backgroundColor: learning.streak,
	},
	dailyGoalTreasure: {
		width: 64,
		height: 64,
	},
	statStrip: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 16,
	},
	statCard: {
		flex: 1,
		minHeight: 96,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: "#E8EAF0",
		backgroundColor: "#FFFFFF",
		padding: 12,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.05,
		shadowRadius: 9,
		elevation: 2,
	},
	statCardWide: {
		flex: 1.35,
		minHeight: 96,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: "#E8EAF0",
		backgroundColor: "#FFFFFF",
		padding: 12,
		justifyContent: "center",
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.05,
		shadowRadius: 9,
		elevation: 2,
	},
	statIconBubble: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	statIconBubbleOrange: {
		backgroundColor: "#FFF8F2",
		borderColor: "#FFEAD4",
	},
	statIconBubblePurple: {
		backgroundColor: brand.primaryLight,
		borderColor: brand.primaryBorder,
	},
	statImageIcon: {
		width: 20,
		height: 20,
	},
	levelIconBubble: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: learning.rewardLight,
		borderWidth: 1,
		borderColor: "#FFE58F",
		alignItems: "center",
		justifyContent: "center",
	},
	levelTrack: {
		height: 7,
		borderRadius: 4,
		backgroundColor: brand.primaryBorder,
		marginTop: 10,
		overflow: "hidden",
	},
	levelFill: {
		height: 7,
		borderRadius: 4,
		backgroundColor: brand.primary,
	},
	homeLearningCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderWidth: 1.5,
		borderRadius: 20,
		padding: 16,
		marginBottom: 16,
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 2,
	},
	dailyChallengeCard: {
		backgroundColor: learning.selectedLight,
		borderColor: "#B9E8FF",
	},
	homeLearningCardDisabled: {
		backgroundColor: neutral.surface,
		borderColor: neutral.border,
	},
	reviewRememberCard: {
		backgroundColor: learning.rewardLight,
		borderColor: "#FFE58F",
		borderLeftWidth: 4,
		borderLeftColor: learning.reward,
	},
	reviewIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#FFF8E1",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	reviewFocusText: {
		color: "#A97800",
	},
	sectionHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	quickPracticeGrid: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 16,
	},
	quickPracticeCard: {
		flex: 1,
		minHeight: 166,
		borderRadius: 24,
		borderWidth: 1.5,
		padding: 14,
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.06,
		shadowRadius: 10,
		elevation: 2,
	},
	quickPracticeCardDisabled: {
		opacity: 0.58,
	},
	reviewQuickCard: {
		backgroundColor: learning.rewardLight,
		borderColor: "#FFE58F",
	},
	speakingQuickCard: {
		backgroundColor: "#E8F9EE",
		borderColor: "#BDEFBF",
	},
	quickPracticeTopRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	quickPracticeIcon: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	reviewQuickIcon: {
		backgroundColor: "#FFF8E1",
		borderColor: "#FFE58F",
	},
	speakingQuickIcon: {
		backgroundColor: "#F3FFE9",
		borderColor: "#BDEFBF",
	},
	quickPracticeImageIcon: {
		width: 22,
		height: 22,
	},
	quickPracticeArrow: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: "rgba(255,255,255,0.78)",
		borderWidth: 1,
		borderColor: "rgba(229,160,0,0.18)",
		alignItems: "center",
		justifyContent: "center",
	},
	speakingQuickArrow: {
		borderColor: "rgba(88,204,2,0.18)",
	},
	quickPracticeMetaPill: {
		alignSelf: "flex-start",
		maxWidth: "100%",
		marginTop: 12,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.76)",
		borderWidth: 1,
		borderColor: "rgba(229,160,0,0.16)",
		paddingHorizontal: 10,
		paddingVertical: 5,
	},
	speakingQuickMetaPill: {
		borderColor: "rgba(88,204,2,0.16)",
	},
	reviewQuickMetaText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		color: "#A97800",
	},
	speakingQuickMetaText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		color: "#2F8C00",
	},
	leagueCard: {
		backgroundColor: "#FFFBE6",
		borderColor: "#FFE58F",
	},
	cardActionCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: "center",
		justifyContent: "center",
	},
	dailyActionCircle: {
		backgroundColor: learning.selected,
	},
	cardDoneCircle: {
		backgroundColor: learning.action,
	},
	leagueActionCircle: {
		backgroundColor: learning.reward,
	},
	cardActionIconImage: {
		width: 28,
		height: 28,
	},
	smallInlineIconImage: {
		width: 15,
		height: 15,
	},
	continueLearningCard: {
		backgroundColor: brand.primary,
		borderRadius: 24,
		padding: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 20,
		shadowColor: brand.primary,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 12,
		elevation: 4,
		overflow: "hidden",
	},
	continueLearningImage: {
		width: 88,
		height: 88,
	},
	continueBtn: {
		backgroundColor: "#FFFFFF",
		borderRadius: 14,
		paddingHorizontal: 18,
		paddingVertical: 8,
		alignSelf: "flex-start",
		marginTop: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	todayFocusCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
		borderColor: neutral.border,
		borderRadius: 20,
		padding: 14,
		marginBottom: 16,
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 1,
	},
	todayFocusIcon: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	todayFocusAction: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: brand.primaryLight,
		borderWidth: 1,
		borderColor: brand.primaryBorder,
		alignItems: "center",
		justifyContent: "center",
	},
	planList: {
		marginBottom: 16,
		gap: 10,
	},
	planCard: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 13,
		borderWidth: 1.5,
		borderBottomWidth: 4,
		borderColor: neutral.border,
		borderBottomColor: "#D7DAE0",
		backgroundColor: "#FFFFFF",
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
		elevation: 1,
	},
	planCardCurrent: {
		backgroundColor: learning.selectedLight,
		borderColor: "#7DD7FF",
		borderBottomColor: learning.selected,
	},
	planCardCompleted: {
		backgroundColor: "#F5FFE8",
		borderColor: "#B7EF8D",
		borderBottomColor: learning.action,
	},
	planIconWrap: {
		width: 46,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	planIconInner: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	planIconImage: {
		width: 24,
		height: 24,
	},
	planOrderBadge: {
		position: "absolute",
		right: 0,
		bottom: 0,
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: neutral.border,
		alignItems: "center",
		justifyContent: "center",
	},
	planCardBody: {
		flex: 1,
		marginRight: 10,
	},
	planMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		marginTop: 7,
	},
	planMetaIconImage: {
		width: 13,
		height: 13,
	},
	planMetaDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: neutral.border,
		marginHorizontal: 2,
	},
	planStatusPill: {
		borderRadius: 999,
		backgroundColor: neutral.surface,
		borderWidth: 1,
		borderColor: neutral.border,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	planStatusCurrent: {
		backgroundColor: "#FFFFFF",
		borderColor: learning.selected,
	},
	planStatusDone: {
		backgroundColor: learning.action,
		borderColor: learning.actionDark,
	},
	planStatusText: {
		color: neutral.textSecondary,
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
	},
	planStatusCurrentText: {
		color: learning.selectedDark,
	},
	planStatusDoneText: {
		color: "#FFFFFF",
	},
	planActionCircle: {
		width: 30,
		height: 30,
		borderRadius: 15,
		borderWidth: 1.5,
		borderColor: neutral.border,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
	planActionCurrent: {
		borderColor: learning.selected,
		backgroundColor: learning.selected,
	},
	planActionDone: {
		borderColor: learning.action,
		backgroundColor: learning.action,
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
	modalHandle: {
		width: 44,
		height: 5,
		borderRadius: 999,
		backgroundColor: neutral.border,
		alignSelf: "center",
		marginBottom: 14,
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
	modalHero: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#F0EDFF",
		borderRadius: 20,
		padding: 16,
		marginBottom: 16,
		overflow: "hidden",
	},
	modalHeroCopy: {
		flex: 1,
		paddingRight: 8,
	},
	modalReadyDot: {
		width: 9,
		height: 9,
		borderRadius: 5,
		backgroundColor: learning.action,
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	modalHeroMascot: {
		width: 112,
		height: 112,
		marginRight: -10,
		marginBottom: -8,
		alignSelf: "flex-end",
	},
	modalLessonPill: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
		borderColor: "#E1D9FF",
		borderRadius: 999,
		paddingVertical: 5,
		paddingHorizontal: 8,
		marginTop: 12,
	},
	modalLessonIcon: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 7,
	},
	modalLessonIconImage: {
		width: 16,
		height: 16,
	},
	modalStatsCard: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 12,
	},
	modalStatItem: {
		flex: 1,
		minHeight: 64,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: neutral.border,
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 10,
	},
	modalStatIcon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: learning.selectedLight,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	modalStatIconImage: {
		width: 18,
		height: 18,
	},
	modalStatIconXp: {
		backgroundColor: learning.rewardLight,
	},
	modalStatIconLevel: {
		backgroundColor: learning.actionLight,
	},
	modalPrepCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFF8E1",
		borderWidth: 1,
		borderColor: "#FFE58F",
		borderRadius: 16,
		padding: 12,
		marginBottom: 12,
	},
	modalPrepIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	modalPrepIconImage: {
		width: 19,
		height: 19,
	},
	modalGoalsCard: {
		backgroundColor: neutral.surface,
		borderWidth: 1,
		borderColor: neutral.border,
		borderRadius: 18,
		padding: 12,
		marginBottom: 16,
	},
	modalGoalRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: neutral.border,
		borderRadius: 12,
		padding: 10,
		marginBottom: 8,
	},
	modalGoalIcon: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: learning.action,
		alignItems: "center",
		justifyContent: "center",
		marginTop: -1,
	},
	modalButtonStack: {
		gap: 10,
	},
});
