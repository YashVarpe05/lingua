import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
	StyleSheet,
	Platform,
	TextInput,
	ScrollView,
	Animated,
	Dimensions,
	KeyboardAvoidingView,
	Modal,
	Pressable,
	GestureResponderEvent,
	PanResponder,
	View as NativeView,
	TouchableOpacity as NativeTouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View, TouchableOpacity } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { useProgressStore, type LearningSessionResult } from "@/store/useProgressStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { generateSessionPlan, getRepairExerciseCandidate } from "@/utils/sessionGenerator";
import { getCurriculumExplanationContext } from "@/data/curriculum";
import { units as allUnits } from "@/data/units";
import { Exercise, SessionIntent } from "@/types/learning";
import {
	buildFillBlankOptions,
	getFillBlankPronunciation,
	type FillBlankOption,
} from "@/utils/wordBank";
import type { CurriculumExplanationConcept } from "@/data/curriculum";
import { authFetch } from "@/lib/apiClient";
import { usePostHog } from "posthog-react-native";
import { useAuth, useUser } from "@clerk/expo";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import Button3D from "@/components/Button3D";
import FeedbackDrawer from "@/components/FeedbackDrawer";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface ExerciseSessionScreenProps {
	forceReview?: boolean;
}

type AnswerExplanation = {
	title: string;
	tip: string;
	example?: string;
	retryPrompt?: string;
};

const buildFallbackExplanation = (
	isCorrectAnswer: boolean,
	correctAnswer: string,
	concepts: CurriculumExplanationConcept[]
): AnswerExplanation => {
	const primaryConcept = concepts[0];
	const conceptTitle = primaryConcept?.title ?? "This pattern";
	const conceptDescription =
		primaryConcept?.description ??
		primaryConcept?.reviewPrompt ??
		"Focus on the meaning and the exact phrase used in the lesson.";
	const example = primaryConcept?.examples?.[0]
		? `Example: ${primaryConcept.examples[0]}`
		: undefined;

	return {
		title: isCorrectAnswer ? "Why this works" : "Remember this pattern",
		tip: isCorrectAnswer
			? `${conceptTitle}: ${conceptDescription}`
			: `${conceptTitle}: the correct answer is "${correctAnswer}" because this lesson is practicing that phrase or pattern.`,
		example,
		retryPrompt: primaryConcept?.reviewPrompt,
	};
};

const parseExplanationResponse = (value: unknown): AnswerExplanation | null => {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const title = typeof record.title === "string" ? record.title.trim() : "";
	const tip = typeof record.tip === "string" ? record.tip.trim() : "";

	if (!title || !tip) return null;

	return {
		title,
		tip,
		example: typeof record.example === "string" ? record.example.trim() : undefined,
		retryPrompt: typeof record.retryPrompt === "string" ? record.retryPrompt.trim() : undefined,
	};
};

interface FillBlankTileProps {
	option: FillBlankOption;
	disabled: boolean;
	onSelect: (option: FillBlankOption) => void;
	onDrop: (option: FillBlankOption, pageX: number, pageY: number) => void;
}

function FillBlankTile({ option, disabled, onSelect, onDrop }: FillBlankTileProps) {
	const drag = useRef(new Animated.ValueXY()).current;
	const [isDragging, setIsDragging] = useState(false);

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => !disabled,
				onStartShouldSetPanResponderCapture: () => !disabled,
				onMoveShouldSetPanResponder: (_, gestureState) =>
					!disabled && (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6),
				onMoveShouldSetPanResponderCapture: (_, gestureState) =>
					!disabled && (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6),
				onPanResponderGrant: () => {
					setIsDragging(true);
					drag.setValue({ x: 0, y: 0 });
				},
				onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], {
					useNativeDriver: false,
				}),
				onPanResponderRelease: (_, gestureState) => {
					setIsDragging(false);
					const didMove = Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
					if (didMove) {
						const dropX = gestureState.moveX || gestureState.x0 + gestureState.dx;
						const dropY = gestureState.moveY || gestureState.y0 + gestureState.dy;
						onDrop(option, dropX, dropY);
					} else {
						onSelect(option);
					}
					Animated.spring(drag, {
						toValue: { x: 0, y: 0 },
						useNativeDriver: false,
						speed: 20,
						bounciness: 4,
					}).start();
				},
				onPanResponderTerminate: () => {
					setIsDragging(false);
					Animated.spring(drag, {
						toValue: { x: 0, y: 0 },
						useNativeDriver: false,
						speed: 20,
						bounciness: 4,
					}).start();
				},
			}),
		[disabled, drag, onDrop, onSelect, option]
	);

	return (
		<Animated.View
			{...panResponder.panHandlers}
			style={[
				styles.fillBlankTile,
				isDragging ? styles.fillBlankTileDragging : null,
				{ transform: drag.getTranslateTransform() },
			]}
		>
			<NativeView style={styles.fillBlankTilePressable}>
				<Text className="font-poppins-bold text-[15px] text-neutral-primary text-center">
					{option.label ?? option.value}
				</Text>
				{option.pronunciation ? (
					<Text className="font-poppins-semibold text-[11px] text-neutral-secondary mt-0.5 text-center">
						{option.pronunciation}
					</Text>
				) : null}
				{option.translation ? (
					<Text className="font-poppins text-[10px] text-neutral-secondary mt-0.5 text-center">
						{option.translation}
					</Text>
				) : null}
			</NativeView>
		</Animated.View>
	);
}

export default function ExerciseSessionScreen({
	forceReview = false,
}: ExerciseSessionScreenProps) {
	const router = useRouter();
	const posthog = usePostHog();
	const { getToken } = useAuth();
	const { user } = useUser();
	const { lessonId, isDailyChallenge, mode, isCheckpoint, unitId } = useLocalSearchParams<{
		lessonId?: string;
		isDailyChallenge?: string;
		mode?: "mistakes" | "vocabulary" | "listening" | "review" | "checkpoint";
		isCheckpoint?: string;
		unitId?: string;
	}>();
	const isReviewSession = forceReview || mode === "review";
	const isCheckpointMode = mode === "checkpoint";
	const isAssessmentSession = isCheckpointMode || isCheckpoint === "true";

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completeLearningSession = useProgressStore((state) => state.completeLearningSession);
	const addMistake = useProgressStore((state) => state.addMistake);
	const removeMistake = useProgressStore((state) => state.removeMistake);
	const recordExerciseAttempt = useProgressStore((state) => state.recordExerciseAttempt);
	const getForgettingScore = useProgressStore((state) => state.getForgettingScore);
	const getMostUrgentLessons = useProgressStore((state) => state.getMostUrgentLessons);

	// Fetch active lessons for selected language
	const activeLanguageId = selectedLanguageId || "es";
	const { lessons: activeLessons, units: activeUnits } = useMemo(
		() => getLanguageUnitsAndLessons(activeLanguageId),
		[activeLanguageId]
	);
	const lesson = useMemo(
		() => activeLessons.find((l) => l.id === lessonId) || activeLessons[0],
		[activeLessons, lessonId]
	);
	const checkpointUnit = useMemo(
		() => allUnits.find((unit) => unit.id === unitId),
		[unitId]
	);
	const currentUnit = checkpointUnit || activeUnits.find((u) => u.id === lesson?.unitId) || activeUnits[0];
	const sessionIntent: SessionIntent = useMemo(() => {
		if (isAssessmentSession) return "checkpoint";
		if (isReviewSession) return "review";
		if (mode === "mistakes") return "mistakes";
		if (mode === "vocabulary") return "vocabulary";
		if (mode === "listening") return "listening";
		if (isDailyChallenge === "true") return "daily-challenge";
		return "lesson";
	}, [isAssessmentSession, isDailyChallenge, isReviewSession, mode]);

	// Session State
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [reviewedLessonIds, setReviewedLessonIds] = useState<string[]>([]);
	const [reviewFocusLabel, setReviewFocusLabel] = useState("");
	const [plannedExerciseIds, setPlannedExerciseIds] = useState<string[]>([]);

	// Load and filter exercises dynamically on mount
	useEffect(() => {
		setLoading(true);
		const progressState = useProgressStore.getState();
		const plan = generateSessionPlan({
			intent: sessionIntent,
			selectedLanguageId: activeLanguageId,
			lessons: activeLessons,
			units: activeUnits,
			lesson,
			mode,
			isLegacyCheckpoint: false,
			checkpointUnit,
			recentMistakes: mode === "mistakes" ? progressState.recentMistakes : [],
			recentAttempts: isReviewSession ? progressState.recentAttempts : [],
			conceptMemory: isReviewSession ? progressState.conceptMemory : {},
			exerciseDifficultyMemory: progressState.exerciseDifficultyMemory,
			conceptDifficultyMemory: progressState.conceptDifficultyMemory,
			getForgettingScore,
			getMostUrgentLessons,
		});

		setExercises(plan.exercises);
		setReviewedLessonIds(plan.reviewedLessonIds);
		setPlannedExerciseIds(plan.exercises.map((exercise) => exercise.id));
		setReviewFocusLabel(plan.focusLabel ?? "");
		setCurrentIndex(0);
		setLeaderboardSyncFailed(false);
		plannedExercisesRef.current = plan.exercises;
		plannedReviewedLessonIdsRef.current = plan.reviewedLessonIds;
		sessionSavedRef.current = false;
		queuedRepairExerciseIdsRef.current.clear();
		queuedRepairForExerciseIdsRef.current.clear();
		repairInsertInFlightRef.current = false;
		setLoading(false);
	}, [
		activeLanguageId,
		activeLessons,
		activeUnits,
		checkpointUnit,
		getForgettingScore,
		getMostUrgentLessons,
		isReviewSession,
		lesson,
		mode,
		sessionIntent,
	]);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [typedAnswer, setTypedAnswer] = useState("");
	const [fillBlankOptions, setFillBlankOptions] = useState<FillBlankOption[]>([]);
	const blankSlotRef = useRef<React.ElementRef<typeof NativeView>>(null);
	
	// Matching Pairs specific state
	const [leftOptions, setLeftOptions] = useState<string[]>([]);
	const [rightOptions, setRightOptions] = useState<string[]>([]);
	const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
	const [selectedRight, setSelectedRight] = useState<string | null>(null);
	const [matchedLefts, setMatchedLefts] = useState<string[]>([]);
	const [matchedRights, setMatchedRights] = useState<string[]>([]);
	const [mismatchedLeft, setMismatchedLeft] = useState<string | null>(null);
	const [mismatchedRight, setMismatchedRight] = useState<string | null>(null);
	const [matchingHadMistake, setMatchingHadMistake] = useState(false);

	// Check/Answer Feedback State
	const [isAnswered, setIsAnswered] = useState(false);
	const [isCorrect, setIsCorrect] = useState(false);
	const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
	const [showQuitModal, setShowQuitModal] = useState(false);
	const [combo, setCombo] = useState(0);
	const [hearts, setHearts] = useState(3);
	const [feedbackVisible, setFeedbackVisible] = useState(false);
	const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
	const [correctAnswerText, setCorrectAnswerText] = useState("");
	const [feedbackExplanationTitle, setFeedbackExplanationTitle] = useState("");
	const [feedbackExplanation, setFeedbackExplanation] = useState("");
	const [feedbackExplanationExample, setFeedbackExplanationExample] = useState("");
	const [feedbackExplanationLoading, setFeedbackExplanationLoading] = useState(false);
	const [showHeartModal, setShowHeartModal] = useState(false);
	const [animatingLostHeart, setAnimatingLostHeart] = useState<number | null>(null);
	const [isFinished, setIsFinished] = useState(false);
	const [leaderboardSyncFailed, setLeaderboardSyncFailed] = useState(false);

	// Local results state to render on results screen
	const [resultsData, setResultsData] = useState<LearningSessionResult | null>(null);

	// Animation
	const slideAnim = useRef(new Animated.Value(0)).current;
	const progressAnim = useRef(new Animated.Value(0)).current;
	const heartScaleAnims = useRef([1, 2, 3].map(() => new Animated.Value(1))).current;
	const sessionSavedRef = useRef(false);
	const goldPulseAnim = useRef(new Animated.Value(1)).current;
	const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
	const exerciseStartedAtRef = useRef(Date.now());
	const explanationRequestIdRef = useRef(0);
	const queuedRepairExerciseIdsRef = useRef(new Set<string>());
	const queuedRepairForExerciseIdsRef = useRef(new Set<string>());
	const repairInsertInFlightRef = useRef(false);
	const plannedExercisesRef = useRef<Exercise[]>([]);
	const plannedReviewedLessonIdsRef = useRef<string[]>([]);

	const currentExercise = exercises[currentIndex];
	const plannedExerciseIdSet = useMemo(
		() => new Set(plannedExerciseIds),
		[plannedExerciseIds]
	);
	const plannedExerciseCount = plannedExerciseIds.length;
	const completedPlannedExerciseCount = useMemo(
		() =>
			exercises
				.slice(0, currentIndex)
				.filter((exercise) => plannedExerciseIdSet.has(exercise.id)).length,
		[exercises, currentIndex, plannedExerciseIdSet]
	);
	const currentExerciseIsPlanned = currentExercise
		? plannedExerciseIdSet.has(currentExercise.id)
		: false;
	const repairCandidate = useMemo(() => {
		if (
			!currentExercise ||
			!feedbackVisible ||
			lastAnswerCorrect ||
			currentExercise.isRepair ||
			isAssessmentSession ||
			hearts <= 0 ||
			queuedRepairForExerciseIdsRef.current.has(currentExercise.id)
		) {
			return null;
		}

		const progressState = useProgressStore.getState();
		const unavailableExerciseIds = [
			...exercises.map((exercise) => exercise.id),
			...Array.from(queuedRepairExerciseIdsRef.current),
		];

		return getRepairExerciseCandidate({
			currentExercise,
			selectedLanguageId: activeLanguageId,
			lessons: activeLessons,
			units: activeUnits,
			sessionIntent,
			unavailableExerciseIds,
			exerciseDifficultyMemory: progressState.exerciseDifficultyMemory,
			conceptDifficultyMemory: progressState.conceptDifficultyMemory,
		});
	}, [
		activeLanguageId,
		activeLessons,
		activeUnits,
		currentExercise,
		exercises,
		feedbackVisible,
		hearts,
		isAssessmentSession,
		lastAnswerCorrect,
		sessionIntent,
	]);
	const difficultyBandLabel =
		currentExercise?.isRepair
			? "Repair"
			: currentExercise?.difficultyBand === "warmup"
			? "Warm-up"
			: currentExercise?.difficultyBand === "challenge"
			? "Challenge"
			: "Practice";
	const difficultyBandClass =
		currentExercise?.isRepair
			? "text-[#1CB0F6]"
			: currentExercise?.difficultyBand === "warmup"
			? "text-[#58CC02]"
			: currentExercise?.difficultyBand === "challenge"
			? "text-[#FF9600]"
			: "text-[#1CB0F6]";

	useEffect(() => {
		exerciseStartedAtRef.current = Date.now();
		repairInsertInFlightRef.current = false;
	}, [currentExercise?.id]);

	const recordCurrentExerciseAttempt = useCallback(
		(correct: boolean, selectedAnswer?: string) => {
			if (!currentExercise) return;
			const createdAt = Date.now();
			const durationMs = Math.max(createdAt - exerciseStartedAtRef.current, 0);

			recordExerciseAttempt({
				id: `${sessionIdRef.current}_${currentExercise.id}_${createdAt}`,
				sessionId: sessionIdRef.current,
				sessionIntent,
				exerciseId: currentExercise.id,
				exerciseType: currentExercise.type,
				correctAnswer: currentExercise.correctAnswer,
				selectedAnswer,
				correct,
				conceptIds: currentExercise.conceptIds ?? [currentExercise.id],
				lessonId: currentExercise.lessonId ?? lesson?.id,
				unitId: currentExercise.unitId ?? currentUnit?.id ?? lesson?.unitId,
				languageId: currentExercise.languageId ?? activeLanguageId,
				difficulty: currentExercise.difficulty,
				durationMs,
				predictedDifficultyScore: currentExercise.predictedDifficultyScore,
				createdAt,
			});
		},
		[
			activeLanguageId,
			currentExercise,
			currentUnit?.id,
			lesson?.id,
			lesson?.unitId,
			recordExerciseAttempt,
			sessionIntent,
		]
	);

	// Trigger completion when session is finished
	useEffect(() => {
		if (!isFinished || resultsData || !lesson || sessionSavedRef.current) return;

		sessionSavedRef.current = true;

		const scoredExerciseCount = plannedExerciseCount || exercises.length;
		const score = scoredExerciseCount > 0
			? Math.round((correctAnswersCount / scoredExerciseCount) * 100)
			: 0;
		const checkpointPassed = score >= 80;
		const sessionType = isAssessmentSession
			? "checkpoint"
			: isReviewSession
			? "review"
			: isDailyChallenge === "true"
			? "daily-challenge"
			: "lesson";
		const xpEarned = isAssessmentSession
			? checkpointPassed
				? 50
				: 10
			: correctAnswersCount * 10;
		const checkpointUnitId = currentUnit?.id ?? unitId;
		const checkpointLessonIds = checkpointUnitId
			? activeLessons
					.filter((item) => item.unitId === checkpointUnitId && !item.isCheckpoint)
					.map((item) => item.id)
			: [];
		const practicedLessonIds = isAssessmentSession
			? checkpointLessonIds.length > 0
				? checkpointLessonIds
				: [lesson.id]
			: isReviewSession
			? reviewedLessonIds.length > 0
				? reviewedLessonIds
				: [lesson.id]
			: [lesson.id];

		completeLearningSession({
			sessionType,
			xpEarned,
			score,
			plannedCorrectCount: correctAnswersCount,
			plannedExerciseCount: scoredExerciseCount,
			practicedLessonIds,
			completedLessonId: !isAssessmentSession && !isReviewSession ? lesson.id : undefined,
			checkpointUnitId: isAssessmentSession ? checkpointUnitId : undefined,
			passed: isAssessmentSession ? checkpointPassed : score >= 70,
		})
			.then(async (res) => {
				setResultsData(res);
				setLeaderboardSyncFailed(false);

				if (res.xpEarned <= 0 || !user?.id) return;

				try {
					const displayName = user.fullName ?? user.username ?? "Anonymous";
					const avatarUrl = user.imageUrl;

					authFetch(getToken, "/api/leaderboard/upsert", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							displayName,
							avatarUrl,
							sessionXP: res.xpEarned,
						}),
					})
						.then((r) => r.json())
						.then((data) => {
							if (data.error) {
								setLeaderboardSyncFailed(true);
							}
						})
						.catch(() => {
							setLeaderboardSyncFailed(true);
						});
				} catch {
					setLeaderboardSyncFailed(true);
				}
			})
			.catch((error) => {
				sessionSavedRef.current = false;
				console.error("Failed to complete learning session:", error);
			});
	}, [
		isFinished,
		resultsData,
		lesson,
		correctAnswersCount,
		exercises.length,
		plannedExerciseCount,
		isDailyChallenge,
		completeLearningSession,
		getToken,
		user,
		currentUnit,
		isReviewSession,
		isAssessmentSession,
		reviewedLessonIds,
		unitId,
		activeLessons,
	]);

	const playAudio = useCallback(() => {
		if (!currentExercise?.audioText) return;
		let locale = "en-US";
		if (selectedLanguageId === "es") locale = "es-ES";
		if (selectedLanguageId === "fr") locale = "fr-FR";
		if (selectedLanguageId === "ja") locale = "ja-JP";

		Speech.speak(currentExercise.audioText, {
			language: locale,
			rate: 0.85,
			pitch: 1.0,
		});
	}, [currentExercise?.audioText, selectedLanguageId]);

	// Randomize matching pairs options on exercise change
	useEffect(() => {
		if (currentExercise?.type === "matching-pairs" && currentExercise.pairs) {
			const pairs = currentExercise.pairs;
			const left = pairs.map(p => p.left).sort(() => Math.random() - 0.5);
			const right = pairs.map(p => p.right).sort(() => Math.random() - 0.5);
			setLeftOptions(left);
			setRightOptions(right);
			setMatchedLefts([]);
			setMatchedRights([]);
			setSelectedLeft(null);
			setSelectedRight(null);
			setMatchingHadMistake(false);
		}
	}, [currentIndex, currentExercise]);

	useEffect(() => {
		if (currentExercise?.type === "fill-in-the-blank") {
			setFillBlankOptions(
				buildFillBlankOptions({
					exercise: currentExercise,
					languageId: selectedLanguageId,
					lessons: activeLessons,
					difficultyBand: currentExercise.difficultyBand,
				})
			);
			return;
		}

		setFillBlankOptions([]);
	}, [activeLessons, currentExercise, selectedLanguageId]);

	// Listen & Type speak initially
	useEffect(() => {
		if (currentExercise?.type === "listen-type" && currentExercise.audioText) {
			// Small timeout to allow screen transition to complete
			const timer = setTimeout(() => {
				playAudio();
			}, 600);
			return () => clearTimeout(timer);
		}
	}, [currentIndex, currentExercise, playAudio]);

	// Slide In Spring Animation
	useEffect(() => {
		if (Platform.OS === "web") {
			slideAnim.setValue(0);
			return;
		}

		slideAnim.setValue(SCREEN_WIDTH);
		Animated.spring(slideAnim, {
			toValue: 0,
			speed: 12,
			bounciness: 6,
			useNativeDriver: false,
		}).start();
	}, [currentIndex, slideAnim]);

	useEffect(() => {
		Animated.timing(progressAnim, {
			toValue:
				plannedExerciseCount > 0
					? completedPlannedExerciseCount / plannedExerciseCount
					: 0,
			duration: 300,
			useNativeDriver: false,
		}).start();
	}, [completedPlannedExerciseCount, plannedExerciseCount, progressAnim]);

	useEffect(() => {
		if (!isAssessmentSession || !isFinished || !resultsData?.passed) {
			goldPulseAnim.setValue(1);
			return;
		}

		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(goldPulseAnim, {
					toValue: 1.12,
					duration: 500,
					useNativeDriver: true,
				}),
				Animated.timing(goldPulseAnim, {
					toValue: 1,
					duration: 500,
					useNativeDriver: true,
				}),
			])
		);

		animation.start();
		return () => animation.stop();
	}, [goldPulseAnim, isAssessmentSession, isFinished, resultsData]);

	const animateLostHeart = (heartNumber: number) => {
		const heartAnim = heartScaleAnims[heartNumber - 1];
		if (!heartAnim) return;

		setAnimatingLostHeart(heartNumber);
		heartAnim.setValue(1);

		Animated.sequence([
			Animated.timing(heartAnim, {
				toValue: 1.4,
				duration: 150,
				useNativeDriver: true,
			}),
			Animated.timing(heartAnim, {
				toValue: 0,
				duration: 150,
				useNativeDriver: true,
			}),
		]).start(() => {
			setAnimatingLostHeart((current) => (current === heartNumber ? null : current));
			heartAnim.setValue(1);
		});
	};

	const clearFeedbackExplanation = useCallback(() => {
		explanationRequestIdRef.current += 1;
		setFeedbackExplanationTitle("");
		setFeedbackExplanation("");
		setFeedbackExplanationExample("");
		setFeedbackExplanationLoading(false);
	}, []);

	const requestAnswerExplanation = useCallback(
		async (correct: boolean, correctAnswer: string, selectedAnswer?: string) => {
			if (!currentExercise) return;

			const shouldExplain =
				!correct ||
				currentExercise.difficultyBand === "challenge" ||
				isAssessmentSession;

			if (!shouldExplain) return;

			const requestId = explanationRequestIdRef.current + 1;
			explanationRequestIdRef.current = requestId;
			const concepts = getCurriculumExplanationContext(
				currentExercise.conceptIds ?? [currentExercise.id]
			);
			const fallback = buildFallbackExplanation(correct, correctAnswer, concepts);

			setFeedbackExplanationTitle(fallback.title);
			setFeedbackExplanation("");
			setFeedbackExplanationExample("");
			setFeedbackExplanationLoading(true);

			try {
				const response = await authFetch(getToken, "/api/explain-answer", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						exerciseType: currentExercise.type,
						question: currentExercise.question,
						selectedAnswer,
						correctAnswer,
						isCorrect: correct,
						languageId: currentExercise.languageId ?? activeLanguageId,
						difficultyBand: currentExercise.difficultyBand,
						concepts,
					}),
				});

				if (!response.ok) {
					throw new Error("Explanation API unavailable");
				}

				const explanation = parseExplanationResponse(await response.json());

				if (!explanation) {
					throw new Error("Explanation response invalid");
				}

				if (explanationRequestIdRef.current !== requestId) return;

				setFeedbackExplanationTitle(explanation.title);
				setFeedbackExplanation(explanation.tip);
				setFeedbackExplanationExample(explanation.example ?? explanation.retryPrompt ?? "");
				setFeedbackExplanationLoading(false);
			} catch {
				if (explanationRequestIdRef.current !== requestId) return;

				setFeedbackExplanationTitle(fallback.title);
				setFeedbackExplanation(fallback.tip);
				setFeedbackExplanationExample(fallback.example ?? fallback.retryPrompt ?? "");
				setFeedbackExplanationLoading(false);
			}
		},
		[activeLanguageId, currentExercise, getToken, isAssessmentSession]
	);

	const handleAnswer = (correct: boolean, correctAnswer: string, selectedAnswer?: string) => {
		clearFeedbackExplanation();

		if (correct) {
			if (!isAssessmentSession) {
				setCombo((prev) => prev + 1);
			}
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		} else {
			if (!isAssessmentSession) {
				setCombo(0);
				animateLostHeart(hearts);
				setHearts((prev) => Math.max(prev - 1, 0));
			}
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
		}

		setLastAnswerCorrect(correct);
		setCorrectAnswerText(correctAnswer);
		setFeedbackVisible(true);
		requestAnswerExplanation(correct, correctAnswer, selectedAnswer).catch(() => {});
	};

	// Match pairs verification
	const handlePairTap = (word: string, column: "left" | "right") => {
		if (isAnswered) return;

		if (column === "left") {
			if (matchedLefts.includes(word)) return;
			setSelectedLeft(word);

			if (selectedRight) {
				verifyMatch(word, selectedRight);
			}
		} else {
			if (matchedRights.includes(word)) return;
			setSelectedRight(word);

			if (selectedLeft) {
				verifyMatch(selectedLeft, word);
			}
		}
	};

	const verifyMatch = (leftWord: string, rightWord: string) => {
		if (!currentExercise) return;
		const pairs = currentExercise?.pairs || [];
		const isMatch = pairs.some(p => p.left === leftWord && p.right === rightWord);

		if (isMatch) {
			const nextMatchedLefts = [...matchedLefts, leftWord];
			const nextMatchedRights = [...matchedRights, rightWord];
			setMatchedLefts(nextMatchedLefts);
			setMatchedRights(nextMatchedRights);
			setSelectedLeft(null);
			setSelectedRight(null);

			if (nextMatchedLefts.length === pairs.length) {
				const finalCorrect = !matchingHadMistake;
				const selectedAnswer = finalCorrect
					? "all pairs matched"
					: "completed with one or more mismatches";
				const pairAnswerText =
					currentExercise.correctAnswer ||
					pairs.map((pair) => `${pair.left} = ${pair.right}`).join(", ");

				setIsAnswered(true);
				setIsCorrect(finalCorrect);

				if (finalCorrect) {
					if (currentExerciseIsPlanned) {
						setCorrectAnswersCount(prev => prev + 1);
					}
					removeMistake(currentExercise.id);
				} else {
					addMistake(currentExercise.id);
				}

				if (finalCorrect && currentExercise.repairForExerciseId) {
					removeMistake(currentExercise.repairForExerciseId);
				}

				recordCurrentExerciseAttempt(finalCorrect, selectedAnswer);
				handleAnswer(finalCorrect, pairAnswerText, selectedAnswer);

				posthog.capture("exercise_answered", {
					exercise_id: currentExercise.id,
					exercise_type: currentExercise.type,
					is_correct: finalCorrect,
					is_repair: Boolean(currentExercise.isRepair),
					repair_for_exercise_id: currentExercise.repairForExerciseId ?? null,
					lesson_id: lessonId ?? "review-session",
				});
			}
		} else {
			setMatchingHadMistake(true);
			setMismatchedLeft(leftWord);
			setMismatchedRight(rightWord);
			setSelectedLeft(null);
			setSelectedRight(null);
			addMistake(currentExercise.id);

			setTimeout(() => {
				setMismatchedLeft(null);
				setMismatchedRight(null);
			}, 800);
		}
	};

	const handleSelectFillBlankOption = useCallback(
		(option: FillBlankOption) => {
			if (isAnswered) return;
			setTypedAnswer(option.value);
			if (Platform.OS === "ios") {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
			}
		},
		[isAnswered]
	);

	const handleFillBlankTileDrop = useCallback(
		(option: FillBlankOption, pageX: number, pageY: number) => {
			if (isAnswered) return;

			blankSlotRef.current?.measureInWindow((x, y, width, height) => {
				const hitSlop = 18;
				const isInsideSlot =
					pageX >= x - hitSlop &&
					pageX <= x + width + hitSlop &&
					pageY >= y - hitSlop &&
					pageY <= y + height + hitSlop;

				if (isInsideSlot) {
					handleSelectFillBlankOption(option);
				}
			});
		},
		[handleSelectFillBlankOption, isAnswered]
	);

	// Formats strings for loose matching in Listen & Type and Fill In Blank
	const normalizeText = (text: string) => {
		return text
			.normalize("NFKC")
			.toLowerCase()
			.replace(/[\u00BF?\u00A1!.,]/g, "")
			.replace(/\s+/g, " ")
			.trim();
	};

	// Check Answer
	const handleCheckAnswer = () => {
		if (isAnswered) return;

		let correct = false;

		switch (currentExercise.type) {
			case "mcq":
			case "tap-word":
				correct = selectedOption === currentExercise.correctAnswer;
				break;
			case "fill-in-the-blank":
			case "listen-type":
				correct = [currentExercise.correctAnswer, ...(currentExercise.acceptedAnswers ?? [])].some(
					(answer) => normalizeText(typedAnswer) === normalizeText(answer)
				);
				break;
			default:
				break;
		}

		setIsCorrect(correct);
		setIsAnswered(true);
		if (correct) {
			if (currentExerciseIsPlanned) {
				setCorrectAnswersCount(prev => prev + 1);
			}
			removeMistake(currentExercise.id);
			if (currentExercise.repairForExerciseId) {
				removeMistake(currentExercise.repairForExerciseId);
			}
		} else {
			addMistake(currentExercise.id);
		}
		const selectedAnswer =
			currentExercise.type === "mcq" || currentExercise.type === "tap-word"
				? selectedOption ?? ""
				: typedAnswer;
		recordCurrentExerciseAttempt(correct, selectedAnswer);
		handleAnswer(correct, currentExercise.correctAnswer, selectedAnswer);

		posthog.capture("exercise_answered", {
			exercise_id: currentExercise.id,
			exercise_type: currentExercise.type,
			is_correct: correct,
			is_repair: Boolean(currentExercise.isRepair),
			repair_for_exercise_id: currentExercise.repairForExerciseId ?? null,
			lesson_id: lessonId ?? "review-session",
		});
	};

	const resetCurrentExerciseState = () => {
		setSelectedOption(null);
		setTypedAnswer("");
		setIsAnswered(false);
		setIsCorrect(false);
		setSelectedLeft(null);
		setSelectedRight(null);
		setMatchedLefts([]);
		setMatchedRights([]);
		setMismatchedLeft(null);
		setMismatchedRight(null);
		setMatchingHadMistake(false);
	};

	const advanceExercise = () => {
		if (currentIndex < exercises.length - 1) {
			setCurrentIndex(prev => prev + 1);
			resetCurrentExerciseState();
		} else {
			setIsFinished(true);
		}
	};

	// Advance flow
	const handleContinue = () => {
		setFeedbackVisible(false);
		clearFeedbackExplanation();

		if (!isAssessmentSession && hearts <= 0 && !lastAnswerCorrect) {
			setShowHeartModal(true);
			return;
		}

		advanceExercise();
	};

	const handlePracticeRepair = () => {
		if (
			!currentExercise ||
			!repairCandidate ||
			repairInsertInFlightRef.current ||
			queuedRepairForExerciseIdsRef.current.has(currentExercise.id)
		) {
			return;
		}

		repairInsertInFlightRef.current = true;
		setFeedbackVisible(false);
		clearFeedbackExplanation();

		if (hearts <= 0) {
			setShowHeartModal(true);
			return;
		}

		queuedRepairForExerciseIdsRef.current.add(currentExercise.id);
		queuedRepairExerciseIdsRef.current.add(repairCandidate.id);

		if (repairCandidate.lessonId) {
			setReviewedLessonIds((prev) =>
				prev.includes(repairCandidate.lessonId!)
					? prev
					: [...prev, repairCandidate.lessonId!]
			);
		}

		setExercises((prev) => {
			const insertAt = Math.min(currentIndex + 1, prev.length);
			return [
				...prev.slice(0, insertAt),
				repairCandidate,
				...prev.slice(insertAt),
			];
		});
		setCurrentIndex((prev) => prev + 1);
		resetCurrentExerciseState();
	};

	const handleTryAgain = () => {
		setShowHeartModal(false);
		setExercises([...plannedExercisesRef.current]);
		setReviewedLessonIds([...plannedReviewedLessonIdsRef.current]);
		setPlannedExerciseIds(plannedExercisesRef.current.map((exercise) => exercise.id));
		setCurrentIndex(0);
		setCombo(0);
		setHearts(3);
		setFeedbackVisible(false);
		setLastAnswerCorrect(false);
		setCorrectAnswerText("");
		clearFeedbackExplanation();
		setCorrectAnswersCount(0);
		setIsFinished(false);
		setResultsData(null);
		sessionSavedRef.current = false;
		queuedRepairExerciseIdsRef.current.clear();
		queuedRepairForExerciseIdsRef.current.clear();
		repairInsertInFlightRef.current = false;
		resetCurrentExerciseState();
	};

	const handleRetryCheckpoint = () => {
		setExercises([...plannedExercisesRef.current]);
		setReviewedLessonIds([...plannedReviewedLessonIdsRef.current]);
		setPlannedExerciseIds(plannedExercisesRef.current.map((exercise) => exercise.id));
		setCurrentIndex(0);
		setCombo(0);
		setFeedbackVisible(false);
		setLastAnswerCorrect(false);
		setCorrectAnswerText("");
		clearFeedbackExplanation();
		setCorrectAnswersCount(0);
		setIsFinished(false);
		setResultsData(null);
		sessionSavedRef.current = false;
		queuedRepairExerciseIdsRef.current.clear();
		queuedRepairForExerciseIdsRef.current.clear();
		repairInsertInFlightRef.current = false;
		resetCurrentExerciseState();
	};

	const handleEndSession = () => {
		setShowHeartModal(false);
		router.replace("/");
	};

	// Quit exercise session flow
	const handleQuit = () => {
		setShowQuitModal(true);
	};

	const handleConfirmQuit = () => {
		setShowQuitModal(false);
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)");
		}
	};



	// Helper checking if Check button should be disabled
	const isCheckDisabled = () => {
		if (currentExercise?.type === "mcq" || currentExercise?.type === "tap-word") {
			return selectedOption === null;
		}
		if (currentExercise?.type === "fill-in-the-blank" || currentExercise?.type === "listen-type") {
			return typedAnswer.trim() === "";
		}
		if (currentExercise?.type === "matching-pairs") {
			return true; // matching pairs validates automatically
		}
		return true;
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 justify-center items-center px-6 bg-white">
					<Text className="font-poppins-semibold text-[16px] text-neutral-secondary">
						Loading exercises...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (exercises.length === 0) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 items-center justify-center p-6 bg-white">
					<Feather name="alert-circle" size={48} color="#6C4EF5" className="mb-4" />
					<Text className="font-poppins-bold text-[18px] text-neutral-primary mb-2 text-center">
						No Exercises Found
					</Text>
					<Text className="font-poppins text-[14px] text-neutral-secondary mb-6 text-center max-w-[280px]">
						{isAssessmentSession
							? "This unit does not have checkpoint questions yet."
							: isReviewSession
							? "No review exercises are ready yet. Complete a lesson first, then come back to review."
							: mode === "mistakes"
							? "No mistakes to review right now! Great job keeping your practice clean."
							: "This lesson or unit does not contain exercises yet."}
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

	if (isFinished) {
		const resultCorrectCount = resultsData?.plannedCorrectCount ?? correctAnswersCount;
		const resultExerciseCount =
			resultsData?.plannedExerciseCount ?? (plannedExerciseCount || exercises.length);
		const scorePercent = resultsData?.score ?? (
			resultExerciseCount > 0 ? Math.round((resultCorrectCount / resultExerciseCount) * 100) : 0
		);
		const passed = resultsData?.passed ?? scorePercent >= 70;

		if (!resultsData) {
			return (
				<SafeAreaView style={styles.safeArea}>
					<View className="flex-1 justify-center items-center px-6 bg-white">
						<Text className="font-poppins-semibold text-[16px] text-neutral-secondary">
							Saving progress...
						</Text>
					</View>
				</SafeAreaView>
			);
		}

		if (isAssessmentSession) {
			const checkpointPassed = resultsData.passed;

			return (
				<SafeAreaView style={styles.safeArea}>
					<View className="flex-1 justify-center items-center px-6 bg-white w-full">
						<Animated.View
							style={[
								styles.checkpointResultIcon,
								{
									transform: [{ scale: goldPulseAnim }],
									backgroundColor: checkpointPassed ? "#FFF3CC" : "#FFF8F2",
								},
							]}
						>
							<Feather
								name={checkpointPassed ? "award" : "refresh-cw"}
								size={58}
								color={checkpointPassed ? "#FFC800" : "#FF9600"}
							/>
						</Animated.View>

						<Text className="font-poppins-bold text-[28px] text-neutral-primary text-center leading-[36px]">
							{checkpointPassed ? "Unit Complete! \u{1F393}" : "Almost there! \u{1F4AA}"}
						</Text>
						<Text className="font-poppins text-[15px] text-neutral-secondary text-center mt-2 leading-[22px] max-w-[300px]">
							{checkpointPassed
								? "You passed the checkpoint and unlocked the next unit."
								: "Review this unit once more, then give the checkpoint another try."}
						</Text>

						<View className="bg-[#FFF8E6] border border-[#FFE8B3] rounded-2xl px-5 py-3 mt-7 mb-4 flex-row items-center">
							<Feather name="zap" size={18} color="#FF9600" />
							<Text className="font-poppins-bold text-[16px] text-[#FF9600] ml-2">
								+{resultsData.xpEarned} XP
							</Text>
						</View>

						<View className="bg-neutral-surface border border-neutral-border rounded-xl px-5 py-2.5 mb-8 flex-row items-center">
							<Feather name="check" size={16} color={checkpointPassed ? "#58CC02" : "#FF9600"} />
							<Text className="font-poppins-bold text-[14px] text-neutral-primary ml-2">
								{resultCorrectCount} / {resultExerciseCount} Correct
							</Text>
						</View>

						{leaderboardSyncFailed ? (
							<View className="bg-[#FFF8E6] border border-[#FFE8B3] rounded-xl px-4 py-3 mb-5 max-w-[320px]">
								<Text className="font-poppins-semibold text-[12px] text-[#A25700] text-center">
									Your XP was saved locally. League sync will retry after your next completed session.
								</Text>
							</View>
						) : null}

						<View className="gap-3 w-full max-w-[320px]">
							{!checkpointPassed && (
								<Button3D
									onPress={handleRetryCheckpoint}
									variant="warning"
									size="lg"
									title="Try Again?"
								/>
							)}
							<Button3D
								onPress={() => router.replace("/")}
								variant="primary"
								size="lg"
								title="Continue"
							/>
						</View>
					</View>
				</SafeAreaView>
			);
		}

		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 justify-center items-center px-6 bg-white w-full">
					{/* Checkpoint Completed Banner */}
					{isAssessmentSession && (
						<View className="w-full max-w-[320px] bg-[#FFFBE6] border-2 border-[#FFC800] rounded-2xl p-4 mb-6 items-center">
							<Text className="font-poppins-bold text-[20px] text-[#FFC800]">
								Checkpoint Passed! 🏆
							</Text>
							<Text className="font-poppins-semibold text-[14px] text-neutral-primary mt-1 text-center">
								You completed Unit {currentUnit?.order || 1} checkpoint quiz and unlocked the next unit!
							</Text>
						</View>
					)}

					{/* Level Up Banner */}
					{resultsData.levelledUp && (
						<View className="w-full max-w-[320px] bg-[#F5F2FF] border-2 border-lingua-purple rounded-2xl p-4 mb-6 items-center">
							<Text className="font-poppins-bold text-[20px] text-lingua-purple">
								Level Up! 🎉
							</Text>
							<Text className="font-poppins-semibold text-[14px] text-neutral-primary mt-1">
								You reached Level {resultsData.newLevel}!
							</Text>
						</View>
					)}

					<Feather
						name={isAssessmentSession ? "award" : passed ? "check-circle" : "award"}
						size={80}
						color={isAssessmentSession ? "#FFC800" : passed ? "#21C16B" : "#FF8A00"}
						className="mb-6"
					/>

					<Text className="font-poppins-bold text-[28px] text-neutral-primary text-center leading-[36px]">
						{isAssessmentSession
							? "Checkpoint Completed!" 
							: passed 
							? "Terrific Job!" 
							: "Session Complete!"}
					</Text>

					<Text className="font-poppins text-[15px] text-neutral-secondary text-center mt-2 leading-[22px] max-w-[280px]">
						{isAssessmentSession
							? "You've successfully proven your skills for this unit! Keep up the great work! ⚡"
							: passed
							? "Awesome job! You're a natural language learner! 🥳"
							: "Keep practicing! Consistency is key to learning a new language. ⚡"}
					</Text>

					{/* XP Score Badge & Streak and Total XP Grid */}
					<View className="flex-row gap-2 mt-8 mb-6 px-2 w-full max-w-[360px]">
						{/* XP Earned */}
						<View className="flex-1 items-center bg-[#FFF8E6] border border-[#FFE8B3] rounded-2xl py-4 justify-center">
							<Feather name="zap" size={24} color="#FF8A00" />
							<Text className="font-poppins-bold text-[18px] text-[#FF8A00] mt-1">
								+{resultsData.xpEarned} XP
							</Text>
							<Text className="font-poppins text-[10px] text-neutral-secondary mt-0.5 uppercase tracking-wider">
								Earned
							</Text>
						</View>

						{/* Total XP */}
						<View className="flex-1 items-center bg-[#F0EDFF] border border-[#E1D9FF] rounded-2xl py-4 justify-center">
							<Feather name="award" size={24} color="#6C4EF5" />
							<Text className="font-poppins-bold text-[18px] text-lingua-purple mt-1">
								{resultsData.newTotalXp} XP
							</Text>
							<Text className="font-poppins text-[10px] text-neutral-secondary mt-0.5 uppercase tracking-wider">
								Total XP
							</Text>
						</View>

						{/* Daily Streak */}
						<View className="flex-1 items-center bg-[#FFF8F2] border border-[#FFEAD4] rounded-2xl py-4 justify-center">
							<Image
								source={images.streakFire}
								style={{ width: 24, height: 24 }}
								contentFit="contain"
							/>
							<Text className="font-poppins-bold text-[18px] text-streak mt-1">
								{resultsData.newStreak}
							</Text>
							<Text className="font-poppins text-[10px] text-neutral-secondary mt-0.5 uppercase tracking-wider">
								Streak
							</Text>
						</View>
					</View>

					{/* Correct counter badge */}
					<View className="bg-neutral-surface border border-neutral-border rounded-xl px-5 py-2.5 mb-8 flex-row items-center">
						<Feather name="check" size={16} color="#21C16B" />
						<Text className="font-poppins-bold text-[14px] text-neutral-primary ml-2">
							{resultCorrectCount} / {resultExerciseCount} Correct
						</Text>
					</View>

					{leaderboardSyncFailed ? (
						<View className="bg-[#FFF8E6] border border-[#FFE8B3] rounded-xl px-4 py-3 mb-5 max-w-[320px]">
							<Text className="font-poppins-semibold text-[12px] text-[#A25700] text-center">
								Your XP was saved locally. League sync will retry after your next completed session.
							</Text>
						</View>
					) : null}

					{/* Confirm exit */}
					<Button3D
						onPress={() => router.replace("/")}
						variant="primary"
						size="lg"
						style={{ maxWidth: 320 }}
					>
						Continue
					</Button3D>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				{/* Top bar progress track */}
				<View className="flex-row items-center px-4 pt-3 pb-3 border-b border-neutral-border bg-white">
					<TouchableOpacity onPress={handleQuit} activeOpacity={0.7} className="p-1 mr-3">
						<Feather name="x" size={24} color="#6B7280" />
					</TouchableOpacity>
					
					<View style={styles.progressTrack}>
						<Animated.View
							style={[
								styles.progressFill,
								{
									width: progressAnim.interpolate({
										inputRange: [0, 1],
										outputRange: ["0%", "100%"],
									}),
								},
							]}
						/>
					</View>

					{!isAssessmentSession && (
						<View className="flex-row items-center gap-1.5 mr-3">
							{[1, 2, 3].map((heartNumber) => {
								const isHeartFilled = heartNumber <= hearts || animatingLostHeart === heartNumber;

								return (
									<Animated.View
										key={heartNumber}
										style={{
											transform: [{ scale: heartScaleAnims[heartNumber - 1] }],
										}}
									>
										<Text style={styles.heartText}>
											{isHeartFilled ? "\u2764\uFE0F" : "\u{1F90D}"}
										</Text>
									</Animated.View>
								);
							})}
						</View>
					)}

					{/* XP accumulation text */}
					<View className="flex-row items-center bg-[#FFF8E6] px-2.5 py-1 rounded-full border border-[#FFE8B3]">
						<Feather name="zap" size={12} color="#FF8A00" />
						<Text className="font-poppins-bold text-[11px] text-[#FF8A00] ml-1">
							{isAssessmentSession
								? "Checkpoint"
								: isReviewSession
								? "Review"
								: `${correctAnswersCount * 10} XP`}
						</Text>
					</View>
				</View>

				{/* Animated Exercise container */}
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					<Animated.View
						style={{
							flex: 1,
							...(Platform.OS === "web"
								? {}
								: { transform: [{ translateX: slideAnim }] }),
						}}
					>
						{/* Mode Label Indicator */}
						<View className="mb-1">
							<Text 
								className={`font-poppins-bold text-[11px] uppercase tracking-wider ${
									isAssessmentSession
										? "text-[#FFC800]"
										: currentExercise?.isRepair
										? "text-[#1CB0F6]"
										: isReviewSession
										? "text-[#FFC800]"
										: mode === "mistakes"
										? "text-[#FF4B4B]"
										: mode === "vocabulary"
										? "text-[#FFC800]"
										: mode === "listening"
										? "text-[#1CB0F6]"
										: "text-lingua-purple"
								}`}
							>
								{isAssessmentSession
									? "\u2B50 CHECKPOINT QUIZ"
									: currentExercise?.isRepair
									? "Repair Practice"
									: isReviewSession
									? `\u{1F9E0} Review Session${reviewFocusLabel ? ` • ${reviewFocusLabel}` : ""}`
									: mode === "mistakes"
									? "Mistakes Review"
									: mode === "vocabulary"
									? "Vocabulary Practice"
									: mode === "listening"
									? "Listening Practice"
								: "Lesson Practice"}
							</Text>
							{currentExercise?.difficultyBand ? (
								<Text
									className={`font-poppins-bold text-[10px] uppercase tracking-[0.5px] mt-1 ${difficultyBandClass}`}
								>
									{difficultyBandLabel}
								</Text>
							) : null}
						</View>

						<Text className="font-poppins-bold text-[20px] text-neutral-primary leading-[26px] mb-5">
							{currentExercise.question}
						</Text>

						{/* Rendering details per exercise type */}
						{currentExercise.type === "mcq" && (
							<View className="gap-3">
								{currentExercise.options?.map((option, index) => {
									const isSelected = selectedOption === option;
									let statusClass = "";

									if (isSelected) {
										statusClass = "card-3d-active";
									}
									if (isAnswered) {
										if (option === currentExercise.correctAnswer) {
											statusClass = "card-3d-correct";
										} else if (isSelected) {
											statusClass = "card-3d-incorrect";
										}
									}

									return (
										<TouchableOpacity
											key={index}
											disabled={isAnswered}
											onPress={() => setSelectedOption(option)}
											activeOpacity={0.7}
											className={`flex-row items-center p-4 card-3d ${statusClass}`}
										>
											<View className="w-8 h-8 rounded-full bg-[#F6F7FB] border border-[#E5E7EB] items-center justify-center mr-3.5">
												<Text className="font-poppins-bold text-[13px] text-neutral-secondary">
													{String.fromCharCode(65 + index)}
												</Text>
											</View>
											<Text className="font-poppins-semibold text-[15px] text-neutral-primary flex-1">
												{option}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						)}

						{currentExercise.type === "fill-in-the-blank" && (
							<View className="bg-white border border-neutral-border rounded-[24px] p-5 shadow-sm">
								{/* Missing slot sentence display */}
								<View className="flex-row items-center justify-center flex-wrap gap-2.5 py-6">
									{(currentExercise.sentence ?? "___").split(" ").map((word, idx) => {
										const isBlank = word.includes("___");
										if (isBlank) {
											const [beforeBlank = "", afterBlank = ""] = word.split("___");
											const selectedBlankOption = fillBlankOptions.find(
												(option) => option.value === typedAnswer
											);
											const pronunciation =
												selectedBlankOption?.pronunciation ??
												getFillBlankPronunciation(typedAnswer, selectedLanguageId);

											return (
												<View key={idx} className="flex-row items-center gap-2">
													{beforeBlank ? (
														<Text className="font-poppins-semibold text-[18px] text-neutral-primary">
															{beforeBlank}
														</Text>
													) : null}
													<NativeView
														ref={blankSlotRef}
														style={[
															styles.fillBlankSlot,
															typedAnswer ? styles.fillBlankSlotActive : null,
															isAnswered
																? isCorrect
																	? styles.fillBlankSlotCorrect
																	: styles.fillBlankSlotIncorrect
																: null,
														]}
													>
														<NativeTouchableOpacity
															disabled={isAnswered || !typedAnswer}
															onPress={() => setTypedAnswer("")}
															activeOpacity={0.75}
															style={styles.fillBlankSlotPressable}
														>
															<Text
																className={`font-poppins-bold text-[18px] text-center ${
																	typedAnswer ? "text-neutral-primary" : "text-neutral-secondary"
																}`}
															>
																{selectedBlankOption?.label ?? (typedAnswer || "Select answer")}
															</Text>
															{pronunciation ? (
																<Text className="font-poppins-semibold text-[11px] text-neutral-secondary mt-0.5 text-center">
																	{pronunciation}
																</Text>
															) : null}
															{selectedBlankOption?.translation ? (
																<Text className="font-poppins text-[10px] text-neutral-secondary mt-0.5 text-center">
																	{selectedBlankOption.translation}
																</Text>
															) : null}
														</NativeTouchableOpacity>
													</NativeView>
													{afterBlank ? (
														<Text className="font-poppins-semibold text-[18px] text-neutral-primary">
															{afterBlank}
														</Text>
													) : null}
												</View>
											);
										}
										return (
											<Text key={idx} className="font-poppins-semibold text-[18px] text-neutral-primary">
												{word}
											</Text>
										);
									})}
								</View>

								<View className="border-t border-neutral-border pt-4">
									<Text className="font-poppins-bold text-[12px] text-neutral-secondary uppercase tracking-[0.5px] mb-3 text-center">
										Choose the missing part
									</Text>
									<View className="flex-row flex-wrap justify-center gap-3">
										{fillBlankOptions
											.filter((option) => option.value !== typedAnswer)
											.map((option) => (
												<FillBlankTile
													key={option.value}
													option={option}
													disabled={isAnswered}
													onSelect={handleSelectFillBlankOption}
													onDrop={handleFillBlankTileDrop}
												/>
											))}
									</View>
								</View>
							</View>
						)}

						{currentExercise.type === "matching-pairs" && (
							<View className="flex-row justify-between w-full mt-2 gap-4">
								{/* Left Column (Target words) */}
								<View className="flex-1 gap-3">
									{leftOptions.map((word, idx) => {
										const isSelected = selectedLeft === word;
										const isMatched = matchedLefts.includes(word);
										const isMismatched = mismatchedLeft === word;

										let statusClass = "";

										if (isSelected) {
											statusClass = "card-3d-active";
										} else if (isMatched) {
											statusClass = "card-3d-correct";
										} else if (isMismatched) {
											statusClass = "card-3d-incorrect";
										}

										return (
											<TouchableOpacity
												key={idx}
												onPress={() => handlePairTap(word, "left")}
												disabled={isMatched || isAnswered}
												activeOpacity={0.7}
												className={`p-4 justify-center items-center card-3d ${statusClass}`}
											>
												<Text className="font-poppins-semibold text-[14px] text-neutral-primary text-center">
													{word}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>

								{/* Right Column (English meanings) */}
								<View className="flex-1 gap-3">
									{rightOptions.map((word, idx) => {
										const isSelected = selectedRight === word;
										const isMatched = matchedRights.includes(word);
										const isMismatched = mismatchedRight === word;

										let statusClass = "";

										if (isSelected) {
											statusClass = "card-3d-active";
										} else if (isMatched) {
											statusClass = "card-3d-correct";
										} else if (isMismatched) {
											statusClass = "card-3d-incorrect";
										}

										return (
											<TouchableOpacity
												key={idx}
												onPress={() => handlePairTap(word, "right")}
												disabled={isMatched || isAnswered}
												activeOpacity={0.7}
												className={`p-4 justify-center items-center card-3d ${statusClass}`}
											>
												<Text className="font-poppins-semibold text-[14px] text-neutral-primary text-center">
													{word}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>
							</View>
						)}

						{currentExercise.type === "tap-word" && (
							<View>
								{/* Selected selection placeholder */}
								<View className="bg-white border border-neutral-border rounded-[24px] p-5 shadow-sm min-h-[90px] justify-center items-center mb-6">
									{selectedOption ? (
										<View
											className={`px-5 py-2.5 card-3d ${
												isAnswered
													? isCorrect
														? "card-3d-correct"
														: "card-3d-incorrect"
													: "card-3d-active"
											}`}
										>
											<Text className="font-poppins-bold text-[16px] text-neutral-primary">
												{selectedOption}
											</Text>
										</View>
									) : (
										<Text className="font-poppins text-[13px] text-neutral-secondary">
											Tap a word tile below to select
										</Text>
									)}
								</View>

								{/* Tile options block */}
								<View className="flex-row flex-wrap justify-center gap-3.5 px-2">
									{currentExercise.options?.map((option, index) => {
										const isSelected = selectedOption === option;
										if (isSelected) return null;

										return (
											<TouchableOpacity
												key={index}
												disabled={isAnswered}
												onPress={() => setSelectedOption(option)}
												activeOpacity={0.7}
												className="px-[18px] py-3 card-3d"
											>
												<Text className="font-poppins-semibold text-[14px] text-neutral-primary">
													{option}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>
							</View>
						)}

						{currentExercise.type === "listen-type" && (
							<View className="bg-white border border-neutral-border rounded-[24px] p-5 shadow-sm items-center">
								{/* Voice trigger play button */}
								<TouchableOpacity
									onPress={playAudio}
									activeOpacity={0.8}
									className="w-20 h-20 rounded-full bg-[#6C4EF5] items-center justify-center shadow-md mb-6"
								>
									<Feather name="volume-2" size={32} color="#FFFFFF" />
								</TouchableOpacity>

								<Text className="font-poppins-semibold text-[12px] text-neutral-secondary uppercase tracking-[0.5px] mb-6">
									Tap to hear phrase
								</Text>

								<TextInput
									style={styles.textInput}
									placeholder="Type what you hear..."
									placeholderTextColor="#9CA3AF"
									value={typedAnswer}
									onChangeText={setTypedAnswer}
									editable={!isAnswered}
									autoCorrect={false}
								/>
							</View>
						)}
					</Animated.View>
				</ScrollView>

				<View className="bg-white border-t border-neutral-border px-5 py-4 pb-6">
					<Button3D
						onPress={handleCheckAnswer}
						disabled={isCheckDisabled() || isAnswered || feedbackVisible}
						variant={isCheckDisabled() || isAnswered || feedbackVisible ? "gray" : "primary"}
						title="CHECK"
					/>
				</View>

				<FeedbackDrawer
					visible={feedbackVisible}
					isCorrect={lastAnswerCorrect}
					correctAnswer={correctAnswerText}
					explanationTitle={feedbackExplanationTitle}
					explanation={feedbackExplanation}
					explanationLoading={feedbackExplanationLoading}
					example={feedbackExplanationExample}
					combo={isAssessmentSession ? 0 : combo}
					onContinue={handleContinue}
					successTitle={
						currentExercise?.isRepair && lastAnswerCorrect
							? "Nice recovery!"
							: undefined
					}
					secondaryActionTitle={repairCandidate ? "PRACTICE THIS" : undefined}
					onSecondaryAction={repairCandidate ? handlePracticeRepair : undefined}
				/>

				<Modal
					visible={showHeartModal}
					transparent
					animationType="fade"
					onRequestClose={() => {}}
				>
					<Pressable style={styles.heartModalBg}>
						<Pressable
							style={styles.heartModalBody}
							onPress={(e: GestureResponderEvent) => e.stopPropagation()}
						>
							<Text style={styles.heartModalEmoji}>{"\u{1F614}"}</Text>
							<Text className="font-poppins-bold text-[24px] text-neutral-primary text-center">
								Out of Hearts!
							</Text>
							<Text className="font-poppins text-[15px] text-neutral-secondary text-center mt-2 mb-7">
								{"Take a breath and try again \u{1F4AA}"}
							</Text>

							<View className="gap-3 w-full">
								<Button3D
									onPress={handleTryAgain}
									variant="primary"
									title="Try Again"
									fullWidth
								/>
								<Button3D
									onPress={handleEndSession}
									variant="ghost"
									title="End Session"
									fullWidth
								/>
							</View>
						</Pressable>
					</Pressable>
				</Modal>

				{/* Exit Confirmation Dialog Modal */}
				<Modal
					visible={showQuitModal}
					transparent
					animationType="fade"
					onRequestClose={() => setShowQuitModal(false)}
				>
					<Pressable
						style={styles.modalBg}
						onPress={() => setShowQuitModal(false)}
					>
						<Pressable
							style={styles.modalBody}
							onPress={(e: GestureResponderEvent) => e.stopPropagation()}
						>
							<View className="items-center">
								<Feather name="alert-triangle" size={40} color="#FF8A00" className="mb-4" />
								<Text className="font-poppins-bold text-[18px] text-neutral-primary text-center">
									Are you sure?
								</Text>
								<Text className="font-poppins text-[13px] text-neutral-secondary text-center mt-2 leading-[20px] px-2 mb-6">
									{isAssessmentSession
										? "You are in the middle of a Checkpoint Quiz. Leaving now will lose all session progress."
										: isReviewSession
										? "You are in the middle of a review session. Leaving now will lose all session progress."
										: mode === "mistakes"
										? "You are in the middle of a mistakes review. Leaving now will lose all session progress."
										: "Leaving now will lose all session progress."}
								</Text>

								<View className="gap-2.5 w-full">
									<TouchableOpacity
										onPress={handleConfirmQuit}
										className="rounded-2xl h-[48px] items-center justify-center w-full bg-[#FF4B4B]"
										activeOpacity={0.85}
									>
										<Text className="font-poppins-bold text-[14px] text-white">
											Quit Session
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => setShowQuitModal(false)}
										className="rounded-2xl h-[46px] items-center justify-center w-full border border-neutral-border bg-white"
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
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollView: {
		flex: 1,
		backgroundColor: "#F6F7FB",
	},
	scrollContent: {
		flexGrow: 1,
		padding: 20,
		paddingBottom: 40,
	},
	mcqCard: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 2,
		borderRadius: 18,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	textInput: {
		width: "100%",
		height: 52,
		backgroundColor: "#F6F7FB",
		borderWidth: 1.5,
		borderColor: "#E5E7EB",
		borderRadius: 14,
		paddingHorizontal: 16,
		fontFamily: "Poppins-SemiBold",
		fontSize: 15,
		color: "#0D132B",
		textAlign: "center",
	},
	fillBlankSlot: {
		minWidth: 148,
		minHeight: 64,
		borderWidth: 2,
		borderColor: "#E5E5E5",
		borderRadius: 16,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
	fillBlankSlotActive: {
		borderColor: "#1CB0F6",
		backgroundColor: "#DDF4FF",
	},
	fillBlankSlotCorrect: {
		borderColor: "#58CC02",
		backgroundColor: "#D7FFB8",
	},
	fillBlankSlotIncorrect: {
		borderColor: "#FF4B4B",
		backgroundColor: "#FFDFE0",
	},
	fillBlankSlotPressable: {
		width: "100%",
		minHeight: 60,
		paddingHorizontal: 16,
		paddingVertical: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	fillBlankTile: {
		minWidth: 96,
		zIndex: 1,
	},
	fillBlankTileDragging: {
		zIndex: 10,
	},
	fillBlankTilePressable: {
		minHeight: 58,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderWidth: 2,
		borderColor: "#E5E5E5",
		borderRadius: 16,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		...(Platform.OS === "android"
			? { elevation: 2 }
			: {
					shadowColor: "#000000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.08,
					shadowRadius: 4,
				}),
	},
	pairButton: {
		borderWidth: 2,
		borderRadius: 16,
		paddingVertical: 18,
		paddingHorizontal: 10,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 1,
		elevation: 1,
	},
	wordTile: {
		borderWidth: 2,
		borderRadius: 14,
		paddingHorizontal: 18,
		paddingVertical: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 1.5,
		elevation: 1,
	},
	progressTrack: {
		height: 8,
		backgroundColor: "#E5E5E5",
		borderRadius: 4,
		flex: 1,
		marginRight: 12,
		overflow: "hidden",
	},
	progressFill: {
		height: 8,
		backgroundColor: "#58CC02",
		borderRadius: 4,
	},
	heartText: {
		fontSize: 18,
		lineHeight: 22,
	},
	checkpointResultIcon: {
		width: 112,
		height: 112,
		borderRadius: 56,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	continueButton: {
		borderRadius: 16,
		height: 54,
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
	},
	modalBg: {
		flex: 1,
		backgroundColor: "rgba(13, 19, 43, 0.4)",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	modalBody: {
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 24,
		width: "100%",
		maxWidth: 320,
	},
	heartModalBg: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.35)",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	heartModalBody: {
		backgroundColor: "#FFFFFF",
		borderRadius: 16,
		padding: 32,
		width: "100%",
		maxWidth: 320,
		alignItems: "center",
		...(Platform.OS === "android"
			? { elevation: 8 }
			: {
					shadowColor: "#000000",
					shadowOffset: { width: 0, height: 12 },
					shadowOpacity: 0.14,
					shadowRadius: 18,
				}),
	},
	heartModalEmoji: {
		fontSize: 48,
		lineHeight: 56,
		marginBottom: 12,
	},
});
