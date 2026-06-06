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
import Button3D from "@/components/Button3D";

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
	const currentXpProgress = unitLessons
		.filter((l) => completedLessons.includes(l.id))
		.reduce((sum, l) => sum + (l.xpReward || 0), 0);
	const dailyGoalPercent = Math.min((currentXpProgress / dailyGoalXp) * 100, 100);

	// Find the next uncompleted lesson to recommend
	const nextLesson = unitLessons.find((l) => !completedLessons.includes(l.id)) || null;
	const recentMistakeAttempt = recentAttempts.find(
		(attempt) => !attempt.correct && attempt.languageId === selectedLanguage.id,
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
	const weakConceptForLanguage = weakConcepts.find((concept) =>
		recentAttempts.some(
			(attempt) =>
				attempt.languageId === selectedLanguage.id &&
				attempt.conceptIds.includes(concept.conceptId),
		)
	);
	const weakConceptMetadata = getCurriculumConceptById(weakConceptForLanguage?.conceptId);
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
	const dueReviewReason = recentMistakeConcept
		? `Why: recent miss in ${recentMistakeConcept.title}`
		: weakConceptMetadata?.reviewPrompt
			? `Why: ${weakConceptMetadata.reviewPrompt}`
			: dueReviewCount > 0
				? "Why: spaced review keeps older practice from fading"
				: "Why: no urgent review right now";
	const dueReviewFocusText = reviewFocusLabel
		? `Focus: ${reviewFocusLabel}`
		: dueReviewReason;

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
						<View className="p-1">
							<Feather name="bell" size={18} color="#0D132B" />
						</View>
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

				{/* Gamification Stats Cards Row */}
				<View className="flex-row gap-3 mb-4">
					{/* Streak Card */}
					<View className="flex-1 bg-[#FFF8F2] border-[1.5px] border-[#FFEAD4] rounded-[20px] p-4 items-center justify-center min-h-[90px]">
						<View className="flex-row items-center gap-1.5">
							<Image
								source={images.streakFire}
								style={{ width: 24, height: 24 }}
								contentFit="contain"
							/>
							<Text className="font-poppins-bold text-[22px] text-streak">
								{streak}
							</Text>
						</View>
						<Text className="font-poppins-semibold text-[11px] text-[#A25700] mt-1 text-center leading-[15px]">
							{streak > 0 ? `${streak} day streak` : "Start your streak today!"}
						</Text>
					</View>

					{/* XP / Level Card */}
					<View className="flex-1 bg-[#F0EDFF] border-[1.5px] border-[#E1D9FF] rounded-[20px] p-4 min-h-[90px] justify-center">
						<View className="flex-row justify-between items-center mb-1">
							<Text className="font-poppins-bold text-[14px] text-lingua-purple">
								Level {level}
							</Text>
							<Text className="font-poppins-semibold text-[9px] text-[#6C4EF5] bg-white border border-[#E1D9FF] px-1.5 py-0.5 rounded-md">
								+{todayXP} XP today
							</Text>
						</View>
						
						{/* Progress Bar toward next level */}
						{(() => {
							const { progress, label } = getLevelProgress(xp);
							return (
								<View className="mt-1">
									<View className="h-1.5 bg-[#E1D9FF] rounded-full overflow-hidden mb-0.5">
										<View
											style={{ width: `${progress}%` }}
											className="h-full bg-lingua-purple rounded-full"
										/>
									</View>
									<Text className="font-poppins text-[9px] text-neutral-secondary text-right">
										{label}
									</Text>
								</View>
							);
						})()}
					</View>
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
							className={`border-[1.5px] rounded-[20px] p-4 flex-row items-center justify-between mb-4 shadow-sm ${
								isDailyCompletedToday
									? "bg-[#F3F4F6] border-[#E5E7EB]"
									: "bg-[#EBF3FF] border-[#D0E5FF]"
							}`}
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
							<View className={`w-12 h-12 rounded-full items-center justify-center ${
								isDailyCompletedToday ? "bg-[#21C16B]" : "bg-[#4D8BFF]"
							}`}>
								{isDailyCompletedToday ? (
									<Feather name="check" size={20} color="#FFFFFF" />
								) : (
									<Feather name="play" size={20} color="#FFFFFF" style={{ marginLeft: 3 }} />
								)}
							</View>
						</TouchableOpacity>
					);
				})()}

				{/* Review & Remember Card */}
				<View className="bg-[#FFF3CC] border-l-[3px] border-l-[#FFC800] rounded-[20px] p-4 flex-row items-center justify-between mb-4">
					<View className="flex-1 mr-4">
						<Text className="font-poppins-bold text-[16px] text-neutral-primary">
							{"Review & Remember \u{1F9E0}"}
						</Text>
						<Text className="font-poppins text-[13px] text-neutral-secondary mt-1">
							{dueReviewCount > 0
								? dueReviewLabel
								: "All caught up! \u{2728}"}
						</Text>
						<Text className="font-poppins text-[11px] text-[#A97800] mt-0.5">
							{dueReviewFocusText}
						</Text>
					</View>
					<Button3D
						onPress={() => router.push("/practice-hub" as Href)}
						variant="secondary"
						size="sm"
						title="Review"
						fullWidth={false}
						style={{ minWidth: 92 }}
					/>
				</View>

				{/* League Card */}
				<TouchableOpacity
					onPress={() => router.push("/league")}
					activeOpacity={0.8}
					className="bg-[#FFFBE6] border-[1.5px] border-[#FFE58F] rounded-[20px] p-4 flex-row items-center justify-between mb-4 shadow-sm"
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
					<View className="w-12 h-12 rounded-full bg-[#FFD700] items-center justify-center">
						<Text className="text-[22px]">🏆</Text>
					</View>
				</TouchableOpacity>

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
					<View>
						<Text className="font-poppins-semibold text-[13px] text-lingua-blue">
							View all
						</Text>
					</View>
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
