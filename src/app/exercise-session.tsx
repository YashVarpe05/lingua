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
import {
	getCurriculumConceptById,
	getCurriculumConceptTitle,
	getCurriculumExplanationContext,
	getCurriculumReviewLabel,
} from "@/data/curriculum";
import { getAllLessonsFromData, getLessonById } from "@/data/lessons";
import { units as allUnits } from "@/data/units";
import { Exercise, SessionIntent } from "@/types/learning";
import {
	buildFillBlankOptions,
	getFillBlankPronunciation,
	type FillBlankOption,
} from "@/utils/wordBank";
import { parseFocusConceptIds } from "@/utils/practiceQueue";
import type { CurriculumExplanationConcept } from "@/data/curriculum";
import { authFetch } from "@/lib/apiClient";
import { usePostHog } from "posthog-react-native";
import { useAuth, useUser } from "@clerk/expo";
import {
	RecordingPresets,
	requestRecordingPermissionsAsync,
	setAudioModeAsync,
	useAudioRecorder,
	useAudioRecorderState,
} from "@/utils/safeAudio";
import * as Haptics from "expo-haptics";
import Button3D from "@/components/Button3D";
import FeedbackDrawer from "@/components/FeedbackDrawer";
import { speakLearningText } from "@/utils/speech";
import { audioUriToBase64, getAudioMimeType } from "@/utils/pronunciationAudio";
import { brand, learning, neutral } from "@/theme/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCRIPT_HEAVY_LISTENING_LANGUAGE_IDS = new Set(["ar", "ja"]);
const PRONUNCIATION_PASS_SCORE = 70;
const MAX_PRONUNCIATION_RETRIES = 2;
const LISTENING_WAVEFORM_BARS = [18, 26, 38, 28, 44, 34, 50, 40, 28, 36, 24, 18];
const ANSWER_FEEDBACK_IN_MS = 120;
const ANSWER_FEEDBACK_SETTLE_MS = 170;

const createSessionId = (createdAt = Date.now()) =>
	`session_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;

const formatDurationLabel = (seconds: number) => {
	const safeSeconds = Math.max(0, Math.round(seconds));
	const minutes = Math.floor(safeSeconds / 60);
	const remainingSeconds = safeSeconds % 60;

	if (minutes <= 0) return `${remainingSeconds}s`;
	return `${minutes}m ${remainingSeconds}s`;
};

const formatStopwatchLabel = (seconds: number) => {
	const safeSeconds = Math.max(0, Math.round(seconds));
	const minutes = Math.floor(safeSeconds / 60);
	const remainingSeconds = safeSeconds % 60;

	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const averageScore = (scores: number[]) => {
	if (scores.length === 0) return null;
	return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
};

const extractQuotedPromptText = (question?: string) => {
	if (!question) return "";

	const doubleQuoted = question.match(/"([^"]+)"/)?.[1] ?? question.match(/“([^”]+)”/)?.[1];
	if (doubleQuoted) return doubleQuoted.trim();

	const curlySingleQuoted = question.match(/‘([^’]+)’/)?.[1];
	if (curlySingleQuoted) return curlySingleQuoted.trim();

	const firstSingleQuote = question.indexOf("'");
	const lastSingleQuote = question.lastIndexOf("'");
	if (firstSingleQuote >= 0 && lastSingleQuote > firstSingleQuote) {
		return question.slice(firstSingleQuote + 1, lastSingleQuote).trim();
	}

	return "";
};

interface ExerciseSessionScreenProps {
	forceReview?: boolean;
}

type AnswerExplanation = {
	title: string;
	tip: string;
	example?: string;
	retryPrompt?: string;
};

type PronunciationScore = {
	score: number;
	accuracy: number;
	fluency: number;
	matchedText?: string;
	tip: string;
	tryAgainPrompt?: string;
};

type ResultConceptInsight = {
	id: string;
	title: string;
	description?: string;
	example?: string;
	correctCount: number;
	incorrectCount: number;
	recallScore?: number;
	status: "strong" | "review";
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

const parsePronunciationScoreResponse = (value: unknown): PronunciationScore | null => {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const score = typeof record.score === "number" ? Math.round(record.score) : null;
	const accuracy = typeof record.accuracy === "number" ? Math.round(record.accuracy) : null;
	const fluency = typeof record.fluency === "number" ? Math.round(record.fluency) : null;
	const tip = typeof record.tip === "string" ? record.tip.trim() : "";

	if (score === null || accuracy === null || fluency === null || !tip) return null;

	return {
		score: Math.max(0, Math.min(100, score)),
		accuracy: Math.max(0, Math.min(100, accuracy)),
		fluency: Math.max(0, Math.min(100, fluency)),
		matchedText: typeof record.matchedText === "string" ? record.matchedText.trim() : undefined,
		tip,
		tryAgainPrompt:
			typeof record.tryAgainPrompt === "string" ? record.tryAgainPrompt.trim() : undefined,
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
			<NativeView
				style={[
					styles.fillBlankTilePressable,
					isDragging ? styles.fillBlankTilePressableDragging : null,
					disabled ? styles.fillBlankTilePressableDisabled : null,
				]}
			>
				<Text
					style={[
						styles.wordBankTileText,
						isDragging ? styles.wordBankTileTextSelected : null,
					]}
					numberOfLines={2}
				>
					{option.label ?? option.value}
				</Text>
				{option.pronunciation ? (
					<Text
						style={[
							styles.wordBankTileHint,
							isDragging ? styles.wordBankTileHintSelected : null,
						]}
						numberOfLines={1}
					>
						{option.pronunciation}
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
	const {
		lessonId,
		isDailyChallenge,
		mode,
		isCheckpoint,
		unitId,
		focusConceptIds: focusConceptIdsParam,
		source,
	} = useLocalSearchParams<{
		lessonId?: string;
		isDailyChallenge?: string;
		mode?:
			| "mistakes"
			| "vocabulary"
			| "listening"
			| "speaking"
			| "mastery"
			| "review"
			| "checkpoint";
		isCheckpoint?: string;
		unitId?: string;
		focusConceptIds?: string;
		source?: string;
	}>();
	const isReviewSession = forceReview || mode === "review";
	const isCheckpointMode = mode === "checkpoint";
	const isAssessmentSession = isCheckpointMode || isCheckpoint === "true";
	const isMasterySession = mode === "mastery";
	const isPracticeSession =
		mode === "mistakes" ||
		mode === "vocabulary" ||
		mode === "listening" ||
		mode === "speaking";

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completeLearningSession = useProgressStore((state) => state.completeLearningSession);
	const addMistake = useProgressStore((state) => state.addMistake);
	const removeMistake = useProgressStore((state) => state.removeMistake);
	const recordExerciseAttempt = useProgressStore((state) => state.recordExerciseAttempt);
	const recordFocusedConceptReview = useProgressStore(
		(state) => state.recordFocusedConceptReview
	);
	const recordFailedCheckpointReview = useProgressStore(
		(state) => state.recordFailedCheckpointReview
	);
	const clearFailedCheckpointReview = useProgressStore(
		(state) => state.clearFailedCheckpointReview
	);
	const recordPronunciationAttempt = useProgressStore((state) => state.recordPronunciationAttempt);
	const getForgettingScore = useProgressStore((state) => state.getForgettingScore);
	const getMostUrgentLessons = useProgressStore((state) => state.getMostUrgentLessons);
	const recentAttempts = useProgressStore((state) => state.recentAttempts);
	const conceptMemory = useProgressStore((state) => state.conceptMemory);

	const routeLesson = useMemo(() => getLessonById(lessonId), [lessonId]);
	const routeLessonUnit = useMemo(
		() => allUnits.find((unit) => unit.id === routeLesson?.unitId),
		[routeLesson]
	);
	const checkpointUnit = useMemo(
		() => allUnits.find((unit) => unit.id === unitId),
		[unitId]
	);
	const routeLanguageId =
		checkpointUnit?.languageId ??
		routeLessonUnit?.languageId ??
		routeLesson?.unitId.split("_")[0] ??
		lessonId?.split("_")[0];

	// Fetch active lessons for the requested route language first, then fall back to the selected language.
	const activeLanguageId = routeLanguageId || selectedLanguageId || "es";
	const { lessons: activeLessons, units: activeUnits } = useMemo(
		() => getLanguageUnitsAndLessons(activeLanguageId),
		[activeLanguageId]
	);
	const lesson = useMemo(
		() => activeLessons.find((l) => l.id === lessonId) || routeLesson || activeLessons[0],
		[activeLessons, lessonId, routeLesson]
	);
	const currentUnit =
		checkpointUnit ||
		routeLessonUnit ||
		activeUnits.find((u) => u.id === lesson?.unitId) ||
		activeUnits[0];
	const sessionIntent: SessionIntent = useMemo(() => {
		if (isAssessmentSession) return "checkpoint";
		if (isReviewSession) return "review";
		if (mode === "mistakes") return "mistakes";
		if (mode === "vocabulary") return "vocabulary";
		if (mode === "listening") return "listening";
		if (mode === "speaking") return "speaking";
		if (isMasterySession) return "mastery";
		if (isDailyChallenge === "true") return "daily-challenge";
		return "lesson";
	}, [isAssessmentSession, isDailyChallenge, isMasterySession, isReviewSession, mode]);
	const routeFocusConceptIds = useMemo(
		() => parseFocusConceptIds(focusConceptIdsParam),
		[focusConceptIdsParam]
	);

	// Session State
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [reviewedLessonIds, setReviewedLessonIds] = useState<string[]>([]);
	const [reviewFocusLabel, setReviewFocusLabel] = useState("");
	const [reviewFocusConceptIds, setReviewFocusConceptIds] = useState<string[]>([]);
	const [plannedExerciseIds, setPlannedExerciseIds] = useState<string[]>([]);
	const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now());
	const [sessionCompletedAt, setSessionCompletedAt] = useState<number | null>(null);
	const [sessionPronunciationScores, setSessionPronunciationScores] = useState<number[]>([]);

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
			pronunciationConceptMemory: isReviewSession
				? progressState.pronunciationConceptMemory
				: {},
			focusConceptIds: isReviewSession ? routeFocusConceptIds : [],
			exerciseDifficultyMemory: progressState.exerciseDifficultyMemory,
			conceptDifficultyMemory: progressState.conceptDifficultyMemory,
			getForgettingScore,
			getMostUrgentLessons,
		});

		setExercises(plan.exercises);
		setReviewedLessonIds(plan.reviewedLessonIds);
		setPlannedExerciseIds(plan.exercises.map((exercise) => exercise.id));
		setReviewFocusLabel(plan.focusLabel ?? "");
		setReviewFocusConceptIds(plan.focusConceptIds);
		setCurrentIndex(0);
		const nextSessionStartedAt = Date.now();
		sessionIdRef.current = createSessionId(nextSessionStartedAt);
		setSessionStartedAt(nextSessionStartedAt);
		setSessionCompletedAt(null);
		setSessionPronunciationScores([]);
		setLeaderboardSyncFailed(false);
		setSaveFailed(false);
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
		routeFocusConceptIds,
		sessionIntent,
	]);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [typedAnswer, setTypedAnswer] = useState("");
	const [fillBlankOptions, setFillBlankOptions] = useState<FillBlankOption[]>([]);
	const [listeningWordBankVisible, setListeningWordBankVisible] = useState(false);
	const pronunciationRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
	const pronunciationRecorderState = useAudioRecorderState(pronunciationRecorder, 250);
	const [pronunciationAudioUri, setPronunciationAudioUri] = useState("");
	const [pronunciationScore, setPronunciationScore] = useState<PronunciationScore | null>(null);
	const [bestPronunciationScore, setBestPronunciationScore] = useState<PronunciationScore | null>(null);
	const [pronunciationAttemptCount, setPronunciationAttemptCount] = useState(0);
	const [pronunciationLoading, setPronunciationLoading] = useState(false);
	const [pronunciationError, setPronunciationError] = useState("");
	const [pronunciationRetryPrompt, setPronunciationRetryPrompt] = useState("");
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
	const [hintExpanded, setHintExpanded] = useState(false);
	const [showHeartModal, setShowHeartModal] = useState(false);
	const [animatingLostHeart, setAnimatingLostHeart] = useState<number | null>(null);
	const [isFinished, setIsFinished] = useState(false);
	const [leaderboardSyncFailed, setLeaderboardSyncFailed] = useState(false);
	const [saveFailed, setSaveFailed] = useState(false);

	// Local results state to render on results screen
	const [resultsData, setResultsData] = useState<LearningSessionResult | null>(null);

	// Animation
	const slideAnim = useRef(new Animated.Value(0)).current;
	const progressAnim = useRef(new Animated.Value(0)).current;
	const heartScaleAnims = useRef([1, 2, 3].map(() => new Animated.Value(1))).current;
	const sessionSavedRef = useRef(false);
	const goldPulseAnim = useRef(new Animated.Value(1)).current;
	const answerFeedbackAnim = useRef(new Animated.Value(0)).current;
	const sessionIdRef = useRef(createSessionId());
	const exerciseStartedAtRef = useRef(Date.now());
	const explanationRequestIdRef = useRef(0);
	const queuedRepairExerciseIdsRef = useRef(new Set<string>());
	const queuedRepairForExerciseIdsRef = useRef(new Set<string>());
	const repairInsertInFlightRef = useRef(false);
	const plannedExercisesRef = useRef<Exercise[]>([]);
	const plannedReviewedLessonIdsRef = useRef<string[]>([]);

	const currentExercise = exercises[currentIndex];
	const answerFeedbackScale = answerFeedbackAnim.interpolate({
		inputRange: [0, 1],
		outputRange: isCorrect ? [1, 1.025] : [1, 0.985],
	});
	const answerFeedbackOpacity = answerFeedbackAnim.interpolate({
		inputRange: [0, 1],
		outputRange: isCorrect ? [1, 1] : [1, 0.96],
	});
	const answerFeedbackStyle = isAnswered
		? {
				opacity: answerFeedbackOpacity,
				transform: [{ scale: answerFeedbackScale }],
			}
		: null;
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
	const isScriptHeavyListeningLanguage =
		SCRIPT_HEAVY_LISTENING_LANGUAGE_IDS.has(activeLanguageId);
	const shouldUseListeningWordBank =
		currentExercise?.type === "listen-type" &&
		isScriptHeavyListeningLanguage &&
		fillBlankOptions.length > 0;
	const canRevealListeningWordBank =
		currentExercise?.type === "listen-type" &&
		!isScriptHeavyListeningLanguage &&
		currentExercise.difficultyBand !== "challenge" &&
		fillBlankOptions.length > 0;
	const showListeningWordBank =
		shouldUseListeningWordBank ||
		(canRevealListeningWordBank && listeningWordBankVisible);
	const selectedListeningOption = fillBlankOptions.find(
		(option) => option.value === typedAnswer
	);
	const selectedSpeakingOption = fillBlankOptions.find(
		(option) => option.value === currentExercise?.correctAnswer
	);
	const speakingPronunciation =
		selectedSpeakingOption?.pronunciation ??
		getFillBlankPronunciation(currentExercise?.correctAnswer ?? "", activeLanguageId);
	const pronunciationRetriesUsed = Math.max(pronunciationAttemptCount - 1, 0);
	const pronunciationRetriesRemaining = Math.max(
		MAX_PRONUNCIATION_RETRIES - pronunciationRetriesUsed,
		0
	);
	const latestPronunciationNeedsRetry =
		currentExercise?.type === "speaking" &&
		Boolean(pronunciationScore) &&
		(pronunciationScore?.score ?? 0) < PRONUNCIATION_PASS_SCORE;
	const canRetryPronunciation =
		latestPronunciationNeedsRetry && pronunciationRetriesRemaining > 0;
	const pronunciationScoreColor = !pronunciationScore
		? "#58CC02"
		: pronunciationScore.score >= PRONUNCIATION_PASS_SCORE
			? "#58CC02"
			: canRetryPronunciation
				? "#FF9600"
				: "#FF4B4B";
	const pronunciationStatusText = !pronunciationScore
		? ""
		: pronunciationScore.score >= PRONUNCIATION_PASS_SCORE
			? "Clear enough to continue."
			: canRetryPronunciation
				? `Try once more. ${pronunciationRetriesRemaining} ${pronunciationRetriesRemaining === 1 ? "retry" : "retries"} left.`
				: "Best effort saved. Use self-check to continue when ready.";
	const sessionAttempts = useMemo(
		() =>
			recentAttempts.filter(
				(attempt) => attempt.sessionId === sessionIdRef.current
			),
		[recentAttempts]
	);
	const resultConceptInsights = useMemo<ResultConceptInsight[]>(() => {
		const conceptStats = new Map<
			string,
			{ correctCount: number; incorrectCount: number }
		>();

		sessionAttempts.forEach((attempt) => {
			attempt.conceptIds.forEach((conceptId) => {
				const existing = conceptStats.get(conceptId) ?? {
					correctCount: 0,
					incorrectCount: 0,
				};

				if (attempt.correct) {
					existing.correctCount += 1;
				} else {
					existing.incorrectCount += 1;
				}

				conceptStats.set(conceptId, existing);
			});
		});

		return Array.from(conceptStats.entries())
			.map(([conceptId, stats]) => {
				const concept = getCurriculumConceptById(conceptId);
				const recallScore = conceptMemory[conceptId]?.latestRecallScore;
				const shouldReview =
					stats.incorrectCount > 0 ||
					(typeof recallScore === "number" && recallScore < 0.65);
				const status: ResultConceptInsight["status"] = shouldReview
					? "review"
					: "strong";

				return {
					id: conceptId,
					title:
						getCurriculumConceptTitle(conceptId) ??
						conceptId.replace(/[_:-]+/g, " "),
					description: concept?.reviewPrompt ?? concept?.description,
					example: concept?.examples?.[0],
					correctCount: stats.correctCount,
					incorrectCount: stats.incorrectCount,
					recallScore,
					status,
				};
			})
			.sort((a, b) => {
				if (a.status !== b.status) return a.status === "review" ? -1 : 1;
				if (a.incorrectCount !== b.incorrectCount) {
					return b.incorrectCount - a.incorrectCount;
				}

				return (a.recallScore ?? 1) - (b.recallScore ?? 1);
			})
			.slice(0, 4);
	}, [conceptMemory, sessionAttempts]);
	const resultReviewConceptInsights = useMemo(
		() =>
			resultConceptInsights
				.filter((insight) => insight.status === "review")
				.slice(0, 2),
		[resultConceptInsights]
	);
	const resultFocusLabel = useMemo(
		() => getCurriculumReviewLabel(resultReviewConceptInsights.map((insight) => insight.id)),
		[resultReviewConceptInsights]
	);
	const activeReviewFocusConceptIds = useMemo(
		() =>
			reviewFocusConceptIds.length > 0
				? reviewFocusConceptIds
				: routeFocusConceptIds,
		[reviewFocusConceptIds, routeFocusConceptIds]
	);
	const repairedFocusedReviewConceptIds = useMemo(() => {
		if (!isReviewSession || activeReviewFocusConceptIds.length === 0) return [];

		return activeReviewFocusConceptIds.filter((conceptId) => {
			const attemptsForConcept = sessionAttempts.filter((attempt) =>
				attempt.conceptIds.includes(conceptId)
			);

			return (
				attemptsForConcept.length > 0 &&
				attemptsForConcept.every((attempt) => attempt.correct)
			);
		});
	}, [activeReviewFocusConceptIds, isReviewSession, sessionAttempts]);
	const repairedReviewFocusLabel = useMemo(
		() => getCurriculumReviewLabel(repairedFocusedReviewConceptIds),
		[repairedFocusedReviewConceptIds]
	);
	const repairCandidate = useMemo(() => {
		if (
			!currentExercise ||
			!feedbackVisible ||
			lastAnswerCorrect ||
			currentExercise.isRepair ||
			isAssessmentSession ||
			isMasterySession ||
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
		isMasterySession,
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
	const currentPlannedExercisePosition = useMemo(() => {
		if (plannedExerciseCount <= 0) return currentIndex + 1;
		if (currentExercise?.isRepair) {
			return Math.min(completedPlannedExerciseCount + 1, plannedExerciseCount);
		}

		const plannedIndex = currentExercise
			? plannedExerciseIds.indexOf(currentExercise.id)
			: -1;
		return plannedIndex >= 0
			? plannedIndex + 1
			: Math.min(completedPlannedExerciseCount + 1, plannedExerciseCount);
	}, [
		completedPlannedExerciseCount,
		currentExercise,
		currentIndex,
		plannedExerciseCount,
		plannedExerciseIds,
	]);
	const progressStepLabel =
		plannedExerciseCount > 0
			? `${currentPlannedExercisePosition}/${plannedExerciseCount}`
			: `${currentIndex + 1}/${Math.max(exercises.length, 1)}`;
	const sessionModeLabel = isAssessmentSession
		? "Checkpoint Quiz"
		: currentExercise?.isRepair
		? "Repair Practice"
		: isReviewSession
		? `Review Session${reviewFocusLabel ? ` - ${reviewFocusLabel}` : ""}`
		: isMasterySession
		? "\u{1F3C6} Master Challenge"
		: mode === "mistakes"
		? "Mistakes Review"
		: mode === "vocabulary"
		? "Vocabulary Practice"
		: mode === "listening"
		? "Listening Practice"
		: mode === "speaking"
		? "Speaking Practice"
		: "Lesson Practice";
	const sessionModeAccent = isAssessmentSession || isMasterySession || isReviewSession || mode === "vocabulary"
		? learning.reward
		: mode === "mistakes"
		? learning.correction
		: mode === "speaking"
		? learning.action
		: currentExercise?.isRepair || mode === "listening"
		? learning.selected
		: brand.primary;
	const sessionModeSurface = isAssessmentSession || isMasterySession || isReviewSession || mode === "vocabulary"
		? learning.rewardLight
		: mode === "mistakes"
		? learning.correctionLight
		: mode === "speaking"
		? "#E8F9EE"
		: currentExercise?.isRepair || mode === "listening"
		? learning.selectedLight
		: "#F0EDFF";
	const sessionStatusIconName: React.ComponentProps<typeof Feather>["name"] =
		isAssessmentSession || isMasterySession
			? "star"
			: isReviewSession
			? "refresh-cw"
			: "zap";
	const sessionStatusLabel = isAssessmentSession
		? "Checkpoint"
		: isMasterySession
		? `${correctAnswersCount * 20} XP`
		: isReviewSession
		? "Review"
		: `${correctAnswersCount * 10} XP`;
	const sessionStatusColor =
		isAssessmentSession || isMasterySession
			? learning.rewardDark
			: isReviewSession
			? learning.selectedDark
			: learning.streak;
	const difficultyBandTextStyle = {
		color: currentExercise?.isRepair
			? learning.selected
			: currentExercise?.difficultyBand === "warmup"
			? learning.action
			: currentExercise?.difficultyBand === "challenge"
			? learning.streak
			: learning.selected,
	};
	const questionTaskMeta: {
		label: string;
		icon: React.ComponentProps<typeof Feather>["name"];
	} =
		currentExercise?.type === "listen-type"
			? { label: "Listen and answer", icon: "headphones" }
			: currentExercise?.type === "speaking"
			? { label: "Say it out loud", icon: "mic" }
			: currentExercise?.type === "matching-pairs"
			? { label: "Find the pairs", icon: "link-2" }
			: currentExercise?.type === "tap-word"
			? { label: "Build the answer", icon: "edit-3" }
			: currentExercise?.type === "fill-in-the-blank"
			? { label: "Fill the blank", icon: "move" }
			: { label: "Choose the answer", icon: "check-square" };
	const quotedPromptText = extractQuotedPromptText(currentExercise?.question);
	const promptBubbleText =
		currentExercise?.type === "listen-type" || currentExercise?.type === "speaking"
			? ""
			: currentExercise?.audioText || quotedPromptText;
	const shouldShowPromptScene =
		Boolean(promptBubbleText) &&
		currentExercise?.type !== "matching-pairs" &&
		currentExercise?.type !== "listen-type" &&
		currentExercise?.type !== "speaking";
	const mcqOptions = currentExercise?.options ?? [];
	const shouldUseCompactMcqGrid =
		currentExercise?.type === "mcq" &&
		mcqOptions.length === 4 &&
		mcqOptions.every((option) => {
			const trimmedOption = option.trim();
			return trimmedOption.length <= 24 && trimmedOption.split(/\s+/).length <= 4;
		});
	const currentConceptKey = currentExercise?.conceptIds?.join("|") ?? "";
	const exerciseHintConcepts = useMemo(
		() =>
			getCurriculumExplanationContext(
				currentConceptKey ? currentConceptKey.split("|") : []
			),
		[currentConceptKey]
	);
	const exerciseHint = useMemo(() => {
		const concept = exerciseHintConcepts[0];
		if (!concept) return null;

		return {
			title: concept.title,
			tip:
				concept.description ??
				concept.reviewPrompt ??
				"Focus on the phrase pattern before choosing your answer.",
			example: concept.examples?.[0],
		};
	}, [exerciseHintConcepts]);
	const canShowExerciseHint = Boolean(
		currentExercise &&
			exerciseHint &&
			!isAssessmentSession &&
			!isMasterySession &&
			!currentExercise.isRepair &&
			currentExercise.difficultyBand !== "challenge"
	);

	useEffect(() => {
		exerciseStartedAtRef.current = Date.now();
		repairInsertInFlightRef.current = false;
		setHintExpanded(
			Boolean(
				currentExercise &&
					currentExercise.difficultyBand === "warmup" &&
					!isAssessmentSession &&
					!isMasterySession &&
					!currentExercise.isRepair
			)
		);
	}, [
		currentExercise,
		currentExercise?.difficultyBand,
		currentExercise?.id,
		currentExercise?.isRepair,
		isAssessmentSession,
		isMasterySession,
	]);

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
		if (!isFinished || resultsData || saveFailed || !lesson || sessionSavedRef.current) return;

		sessionSavedRef.current = true;

		const scoredExerciseCount = plannedExerciseCount || exercises.length;
		const score = scoredExerciseCount > 0
			? Math.round((correctAnswersCount / scoredExerciseCount) * 100)
			: 0;
		const checkpointPassed = score >= 80;
		const masteryPassed = score >= 80;
		const sessionType = isAssessmentSession
			? "checkpoint"
			: isMasterySession
			? "mastery"
			: isReviewSession
			? "review"
			: isPracticeSession
			? "practice"
			: isDailyChallenge === "true"
			? "daily-challenge"
			: "lesson";
		const xpEarned = isAssessmentSession
			? checkpointPassed
				? 50
				: 10
			: isMasterySession
			? correctAnswersCount * 20
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
		const shouldCompleteLesson =
			!isAssessmentSession &&
			!isReviewSession &&
			!isPracticeSession &&
			(!isMasterySession || masteryPassed);

		completeLearningSession({
			sessionType,
			xpEarned,
			score,
			plannedCorrectCount: correctAnswersCount,
			plannedExerciseCount: scoredExerciseCount,
			practicedLessonIds,
			completedLessonId: shouldCompleteLesson ? lesson.id : undefined,
			checkpointUnitId: isAssessmentSession ? checkpointUnitId : undefined,
			passed: isAssessmentSession
				? checkpointPassed
				: isMasterySession
				? masteryPassed
				: score >= 70,
		})
			.then(async (res) => {
				if (isAssessmentSession && checkpointUnitId) {
					if (res.passed) {
						clearFailedCheckpointReview(checkpointUnitId);
					} else {
						const focusConceptIds =
							resultReviewConceptInsights.length > 0
								? resultReviewConceptInsights.map((insight) => insight.id)
								: resultConceptInsights.map((insight) => insight.id).slice(0, 3);

						recordFailedCheckpointReview({
							unitId: checkpointUnitId,
							focusConceptIds,
							score: res.score,
						});
					}
				}

				if (sessionType === "review" && res.score >= 80) {
					const allAttempts = useProgressStore.getState().recentAttempts || [];
					const attemptsForThisSession = allAttempts.filter(
						(attempt) => attempt.sessionId === sessionIdRef.current
					);
					const repairedConceptIds = activeReviewFocusConceptIds.filter((conceptId) => {
						const attemptsForConcept = attemptsForThisSession.filter((attempt) =>
							attempt.conceptIds.includes(conceptId)
						);

						return (
							attemptsForConcept.length > 0 &&
							attemptsForConcept.every((attempt) => attempt.correct)
						);
					});

					recordFocusedConceptReview({
						conceptIds: repairedConceptIds,
						score: res.score,
					});

					allAttempts
						.filter(
							(attempt) =>
								!attempt.correct &&
								attempt.conceptIds.some((conceptId) =>
									repairedConceptIds.includes(conceptId)
								)
						)
						.forEach((attempt) => removeMistake(attempt.exerciseId));
				}

				setResultsData(res);
				setLeaderboardSyncFailed(false);
				setSaveFailed(false);

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
				setSaveFailed(true);
				console.error("Failed to complete learning session:", error);
			});
	}, [
		isFinished,
		resultsData,
		saveFailed,
		lesson,
		correctAnswersCount,
		exercises.length,
		plannedExerciseCount,
		isDailyChallenge,
		completeLearningSession,
		recordFocusedConceptReview,
		recordFailedCheckpointReview,
		clearFailedCheckpointReview,
		activeReviewFocusConceptIds,
		resultReviewConceptInsights,
		resultConceptInsights,
		getToken,
		user,
		currentUnit,
		isReviewSession,
		isAssessmentSession,
		isMasterySession,
		isPracticeSession,
		removeMistake,
		reviewedLessonIds,
		unitId,
		activeLessons,
	]);

	const playAudio = useCallback(() => {
		if (!currentExercise?.audioText) return;
		speakLearningText(currentExercise.audioText, activeLanguageId);
	}, [activeLanguageId, currentExercise?.audioText]);

	const handleStartPronunciationRecording = useCallback(async () => {
		if (
			currentExercise?.type !== "speaking" ||
			isAnswered ||
			pronunciationLoading ||
			pronunciationRecorderState.isRecording
		) {
			return;
		}

		setPronunciationAudioUri("");
		setPronunciationScore(null);
		setPronunciationError("");
		setPronunciationRetryPrompt("");
		setSelectedOption(null);

		try {
			const permission = await requestRecordingPermissionsAsync();

			if (!permission.granted) {
				setPronunciationError("Microphone permission is needed to score your pronunciation.");
				return;
			}

			// iOS only captures input while the audio session allows recording.
			await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
			await pronunciationRecorder.prepareToRecordAsync();
			pronunciationRecorder.record();
		} catch {
			setPronunciationError("Recording is not available right now. You can still use self-check.");
			await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
				() => {}
			);
		}
	}, [
		currentExercise?.type,
		isAnswered,
		pronunciationLoading,
		pronunciationRecorder,
		pronunciationRecorderState.isRecording,
	]);

	const handleStopPronunciationRecording = useCallback(async () => {
		if (!pronunciationRecorderState.isRecording) return;

		try {
			await pronunciationRecorder.stop();
			const uri = pronunciationRecorder.uri ?? pronunciationRecorderState.url ?? "";

			if (!uri) {
				setPronunciationError("No recording was saved. Try once more.");
				return;
			}

			setPronunciationAudioUri(uri);
			setPronunciationError("");
		} catch {
			setPronunciationError("Could not save that recording. Try once more.");
		} finally {
			// Return the audio session to playback so phrase replay stays loud.
			await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
				() => {}
			);
		}
	}, [pronunciationRecorder, pronunciationRecorderState.isRecording, pronunciationRecorderState.url]);

	const handleScorePronunciation = useCallback(async () => {
		if (!currentExercise || currentExercise.type !== "speaking" || !pronunciationAudioUri) return;

		setPronunciationLoading(true);
		setPronunciationError("");

		try {
			const audioBase64 = await audioUriToBase64(pronunciationAudioUri);
			const response = await authFetch(getToken, "/api/pronunciation-score", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					expectedText: currentExercise.correctAnswer,
					languageId: currentExercise.languageId ?? activeLanguageId,
					audioBase64,
					mimeType: getAudioMimeType(pronunciationAudioUri),
					pronunciation: speakingPronunciation,
					translation: selectedSpeakingOption?.translation,
				}),
			});

			if (!response.ok) {
				throw new Error("Pronunciation scoring unavailable");
			}

			const score = parsePronunciationScoreResponse(await response.json());

			if (!score) {
				throw new Error("Pronunciation scoring response invalid");
			}

			recordPronunciationAttempt({
				exerciseId: currentExercise.id,
				conceptIds: currentExercise.conceptIds ?? [currentExercise.id],
				score: score.score,
				accuracy: score.accuracy,
				fluency: score.fluency,
				languageId: currentExercise.languageId ?? activeLanguageId,
				lessonId: currentExercise.lessonId ?? lesson?.id,
				unitId: currentExercise.unitId ?? currentUnit?.id ?? lesson?.unitId,
				createdAt: Date.now(),
			});
			setSessionPronunciationScores((previousScores) => [
				...previousScores,
				score.score,
			]);
			const nextAttemptCount = pronunciationAttemptCount + 1;
			const retriesUsed = Math.max(nextAttemptCount - 1, 0);
			const retriesRemaining = Math.max(
				MAX_PRONUNCIATION_RETRIES - retriesUsed,
				0
			);
			const isPronunciationPass = score.score >= PRONUNCIATION_PASS_SCORE;

			setPronunciationAttemptCount(nextAttemptCount);
			setBestPronunciationScore((currentBest) =>
				!currentBest || score.score > currentBest.score ? score : currentBest
			);
			setPronunciationScore(score);
			setPronunciationLoading(false);

			if (isPronunciationPass) {
				setSelectedOption("said-it");
				setPronunciationRetryPrompt("Nice. That is clear enough to continue.");
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
			} else {
				setSelectedOption(null);
				setPronunciationRetryPrompt(
					retriesRemaining > 0
						? score.tryAgainPrompt || "Try once more and focus on the target sounds."
						: "Good effort. You can use self-check to continue, or retry again for practice."
				);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
			}
		} catch {
			setPronunciationLoading(false);
			setPronunciationError("Pronunciation scoring is unavailable. You can still use self-check.");
		}
	}, [
		activeLanguageId,
		currentExercise,
		currentUnit?.id,
		getToken,
		lesson?.id,
		lesson?.unitId,
		pronunciationAttemptCount,
		pronunciationAudioUri,
		recordPronunciationAttempt,
		selectedSpeakingOption?.translation,
		speakingPronunciation,
	]);

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
		if (
			currentExercise?.type === "fill-in-the-blank" ||
			currentExercise?.type === "listen-type" ||
			currentExercise?.type === "speaking"
		) {
			setFillBlankOptions(
				buildFillBlankOptions({
					exercise: currentExercise,
					languageId: activeLanguageId,
					lessons: activeLessons,
					difficultyBand: currentExercise.difficultyBand,
				})
			);
			return;
		}

		setFillBlankOptions([]);
	}, [activeLanguageId, activeLessons, currentExercise]);

	// Listen & Type speak initially
	useEffect(() => {
		if (
			(currentExercise?.type === "listen-type" ||
				currentExercise?.type === "speaking") &&
			currentExercise.audioText
		) {
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
		if (!(isAssessmentSession || isMasterySession) || !isFinished || !resultsData?.passed) {
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
	}, [goldPulseAnim, isAssessmentSession, isFinished, isMasterySession, resultsData]);

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
				isMasterySession ||
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
		[activeLanguageId, currentExercise, getToken, isAssessmentSession, isMasterySession]
	);

	const handleAnswer = (correct: boolean, correctAnswer: string, selectedAnswer?: string) => {
		clearFeedbackExplanation();
		answerFeedbackAnim.stopAnimation();
		answerFeedbackAnim.setValue(0);
		Animated.sequence([
			Animated.timing(answerFeedbackAnim, {
				toValue: 1,
				duration: ANSWER_FEEDBACK_IN_MS,
				useNativeDriver: true,
			}),
			Animated.timing(answerFeedbackAnim, {
				toValue: 0,
				duration: ANSWER_FEEDBACK_SETTLE_MS,
				useNativeDriver: true,
			}),
		]).start();

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

		const drawerPronunciationScore = bestPronunciationScore ?? pronunciationScore;
		if (currentExercise?.type === "speaking" && drawerPronunciationScore) {
			setFeedbackExplanationTitle(
				pronunciationAttemptCount > 1
					? `Best pronunciation: ${drawerPronunciationScore.score}/100`
					: `Pronunciation: ${drawerPronunciationScore.score}/100`
			);
			setFeedbackExplanation(drawerPronunciationScore.tip);
			setFeedbackExplanationExample(
				pronunciationRetryPrompt ||
					drawerPronunciationScore.tryAgainPrompt ||
					drawerPronunciationScore.matchedText ||
					""
			);
			setFeedbackExplanationLoading(false);
			return;
		}

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
			case "speaking":
				correct = selectedOption === "said-it";
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
			currentExercise.type === "mcq" ||
			currentExercise.type === "tap-word" ||
			currentExercise.type === "speaking"
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
		setListeningWordBankVisible(false);
		setIsAnswered(false);
		setIsCorrect(false);
		setSelectedLeft(null);
		setSelectedRight(null);
		setMatchedLefts([]);
		setMatchedRights([]);
		setMismatchedLeft(null);
		setMismatchedRight(null);
		setMatchingHadMistake(false);
		setPronunciationAudioUri("");
		setPronunciationScore(null);
		setBestPronunciationScore(null);
		setPronunciationAttemptCount(0);
		setPronunciationLoading(false);
		setPronunciationError("");
		setPronunciationRetryPrompt("");
		answerFeedbackAnim.stopAnimation();
		answerFeedbackAnim.setValue(0);
	};

	const advanceExercise = () => {
		if (currentIndex < exercises.length - 1) {
			setCurrentIndex(prev => prev + 1);
			resetCurrentExerciseState();
		} else {
			setSessionCompletedAt(Date.now());
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
		const nextSessionStartedAt = Date.now();
		sessionIdRef.current = createSessionId(nextSessionStartedAt);
		setSessionStartedAt(nextSessionStartedAt);
		setSessionCompletedAt(null);
		setSessionPronunciationScores([]);
		setCombo(0);
		setHearts(3);
		setFeedbackVisible(false);
		setLastAnswerCorrect(false);
		setCorrectAnswerText("");
		clearFeedbackExplanation();
		setCorrectAnswersCount(0);
		setIsFinished(false);
		setResultsData(null);
		setSaveFailed(false);
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
		const nextSessionStartedAt = Date.now();
		sessionIdRef.current = createSessionId(nextSessionStartedAt);
		setSessionStartedAt(nextSessionStartedAt);
		setSessionCompletedAt(null);
		setSessionPronunciationScores([]);
		setCombo(0);
		setHearts(3);
		setFeedbackVisible(false);
		setLastAnswerCorrect(false);
		setCorrectAnswerText("");
		clearFeedbackExplanation();
		setCorrectAnswersCount(0);
		setIsFinished(false);
		setResultsData(null);
		setSaveFailed(false);
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

	const handleRetrySave = () => {
		sessionSavedRef.current = false;
		setSaveFailed(false);
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
		if (currentExercise?.type === "speaking") {
			return selectedOption !== "said-it";
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
							: mode === "speaking"
							? "No speaking phrases are ready yet. Complete a lesson first, then try speaking practice."
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
		const hasReviewFocus = resultReviewConceptInsights.length > 0;
		const isFocusedReviewResult =
			isReviewSession && activeReviewFocusConceptIds.length > 0;
		const reviewRepairPassed =
			isFocusedReviewResult &&
			scorePercent >= 80 &&
			repairedFocusedReviewConceptIds.length === activeReviewFocusConceptIds.length;
		const stillWeakFocusedConceptIds = activeReviewFocusConceptIds.filter(
			(conceptId) =>
				!repairedFocusedReviewConceptIds.includes(conceptId) ||
				resultReviewConceptInsights.some((insight) => insight.id === conceptId)
		);
		const weakConceptCount = resultConceptInsights.filter(
			(insight) => insight.status === "review"
		).length;
		const practiceFocusConceptIds =
			resultReviewConceptInsights.length > 0
				? resultReviewConceptInsights.map((insight) => insight.id)
				: resultConceptInsights.map((insight) => insight.id).slice(0, 3);
		const practiceFocusLabel = getCurriculumReviewLabel(practiceFocusConceptIds);
		const checkpointRecoveryUnitId = unitId ?? currentUnit?.id;
		const checkpointRecoveryLessons = checkpointRecoveryUnitId
			? getAllLessonsFromData().filter(
					(activeLesson) => activeLesson.unitId === checkpointRecoveryUnitId
				)
			: [];
		const checkpointRecoveryRetryLesson =
			checkpointRecoveryLessons.length > 0
				? checkpointRecoveryLessons[checkpointRecoveryLessons.length - 1]
				: lesson;
		const isCheckpointRecoveryReview =
			isReviewSession && source === "checkpoint-fail" && Boolean(checkpointRecoveryUnitId);
		const checkpointRecoveryFocusLabel =
			reviewFocusLabel || repairedReviewFocusLabel || practiceFocusLabel;
		const completedAt = sessionCompletedAt ?? Date.now();
		const timeSpentSeconds = Math.max(
			Math.round((completedAt - sessionStartedAt) / 1000),
			0
		);
		const pronunciationAverage = averageScore(sessionPronunciationScores);
		const accuracyColor =
			scorePercent >= 80 ? "#58CC02" : scorePercent >= 60 ? "#FF9600" : "#FF4B4B";
		const completionTitle = isAssessmentSession
			? passed
				? "Unit complete!"
				: "Almost there!"
			: isReviewSession
				? isCheckpointRecoveryReview
					? "Ready to retry!"
					: reviewRepairPassed
					? "Weak parts repaired!"
					: "Review complete!"
				: isMasterySession
					? passed
						? "Master Challenge complete!"
						: "Almost mastered!"
				: isPracticeSession
					? "Practice complete!"
				: "Lesson complete!";
		const completionTitleColor =
			(isAssessmentSession || isMasterySession) && !passed ? "#FF9600" : "#FFC800";
		const completionMascot = isAssessmentSession && !passed
			? images.mascotLogo
			: images.mascotJump;
		const shouldRetryCheckpoint = isAssessmentSession && !passed;
		const shouldRetryMastery = isMasterySession && !passed;
		const hasCheckpointRecoveryFocus =
			shouldRetryCheckpoint && practiceFocusConceptIds.length > 0;
		const completionSupportMessage = isAssessmentSession
			? passed
				? "Next unit unlocked"
				: "Score 80% to pass"
			: isMasterySession
			? passed
				? "Checkpoint unlocked"
				: "Score 80% to unlock the checkpoint."
			: isCheckpointRecoveryReview
			? "Retry the checkpoint"
			: "";
		const completionSupportIsWarning =
			(isAssessmentSession || isMasterySession) && !passed;
		const completionSupportIcon = isCheckpointRecoveryReview
			? "refresh-cw"
			: passed
			? "unlock"
			: "lock";
		const completionSupportColor = completionSupportIsWarning ? "#A25700" : "#A97800";
		const showLearningInsights =
			isReviewSession || isPracticeSession || isMasterySession || hasReviewFocus;
		const primaryResultActionTitle =
			isCheckpointRecoveryReview
				? "RETRY CHECKPOINT"
				: shouldRetryCheckpoint || shouldRetryMastery
				? "TRY AGAIN"
				: "CLAIM XP";
		const primaryResultActionVariant =
			isCheckpointRecoveryReview || shouldRetryCheckpoint || isMasterySession
				? "warning"
				: "secondary";
		const handleRetryRecoveredCheckpoint = () => {
			if (!checkpointRecoveryUnitId) {
				router.replace("/learn");
				return;
			}

			router.replace({
				pathname: "/exercise-session",
				params: {
					...(checkpointRecoveryRetryLesson?.id
						? { lessonId: checkpointRecoveryRetryLesson.id }
						: {}),
					mode: "checkpoint",
					unitId: checkpointRecoveryUnitId,
				},
			});
		};
		const handlePrimaryResultAction = isCheckpointRecoveryReview
			? handleRetryRecoveredCheckpoint
			: shouldRetryCheckpoint || shouldRetryMastery
			? handleRetryCheckpoint
			: () => router.replace(isAssessmentSession && passed ? "/learn" : "/");
		const handleCheckpointRecoveryReview = () => {
			if (!hasCheckpointRecoveryFocus) return;

			router.replace({
				pathname: "/review-session",
				params: {
					focusConceptIds: practiceFocusConceptIds.join(","),
					source: "checkpoint-fail",
					...(checkpointRecoveryUnitId ? { unitId: checkpointRecoveryUnitId } : {}),
				},
			});
		};
		const resultTitle = completionTitle;
		const resultSubtitle = "";
		const shouldRenderLegacyResultLayout = false;
		const renderCompletionStatCard = ({
			label,
			value,
			icon,
			color,
			backgroundColor,
		}: {
			label: string;
			value: string;
			icon: React.ComponentProps<typeof Feather>["name"];
			color: string;
			backgroundColor: string;
		}) => (
			<View style={[styles.completionStatCard, { borderColor: color }]}>
				<View style={[styles.completionStatLabel, { backgroundColor: color }]}>
					<Text style={styles.completionStatLabelText}>{label}</Text>
				</View>
				<View style={[styles.completionStatValueBody, { backgroundColor }]}>
					<View style={styles.completionStatValueRow}>
						<Feather name={icon} size={16} color={color} />
						<Text style={[styles.completionStatValue, { color }]}>{value}</Text>
					</View>
				</View>
			</View>
		);
		const renderResultInsights = () => (
			<View className="w-full max-w-[360px] mb-6 gap-3">
				{isCheckpointRecoveryReview ? (
					<View className="bg-[#FFF8E6] border border-[#FFE8B3] rounded-2xl p-4">
						<View className="flex-row items-center mb-3">
							<View className="w-9 h-9 rounded-full bg-[#FFE8B3] items-center justify-center mr-3">
								<Feather name="refresh-cw" size={18} color="#FF9600" />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[15px] text-neutral-primary">
									Checkpoint Prep
								</Text>
								<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
									You reviewed the weak parts from this checkpoint.
								</Text>
							</View>
						</View>

						{checkpointRecoveryFocusLabel ? (
							<View className="self-start bg-white border border-[#FFE8B3] rounded-full px-3 py-1.5">
								<Text className="font-poppins-bold text-[11px] text-[#A25700] uppercase tracking-[0.4px]">
									Focus: {checkpointRecoveryFocusLabel}
								</Text>
							</View>
						) : null}
					</View>
				) : null}

				<View className="bg-white border border-neutral-border rounded-2xl p-4">
					<View className="flex-row items-center justify-between mb-3">
						<View className="flex-row items-center flex-1 mr-3">
							<View className="w-9 h-9 rounded-full bg-[#F0EDFF] items-center justify-center mr-3">
								<Feather name="bar-chart-2" size={18} color="#6C4EF5" />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[15px] text-neutral-primary">
									Session Analytics
								</Text>
								<Text className="font-poppins text-[12px] text-neutral-secondary">
									Your learning snapshot
								</Text>
							</View>
						</View>
						<Text
							className="font-poppins-bold text-[24px]"
							style={{ color: accuracyColor }}
						>
							{scorePercent}%
						</Text>
					</View>

					<View className="flex-row gap-2 mb-2">
						<View className="flex-1 bg-neutral-surface rounded-xl px-3 py-2.5">
							<Text className="font-poppins-bold text-[16px] text-neutral-primary">
								{scorePercent}%
							</Text>
							<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
								Accuracy
							</Text>
						</View>
						<View className="flex-1 bg-neutral-surface rounded-xl px-3 py-2.5">
							<Text className="font-poppins-bold text-[16px] text-neutral-primary">
								{formatDurationLabel(timeSpentSeconds)}
							</Text>
							<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
								Time
							</Text>
						</View>
					</View>

					<View className="flex-row gap-2">
						<View className="flex-1 bg-neutral-surface rounded-xl px-3 py-2.5">
							<Text className="font-poppins-bold text-[16px] text-neutral-primary">
								{weakConceptCount}
							</Text>
							<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
								Weak Parts
							</Text>
						</View>
						<View className="flex-1 bg-neutral-surface rounded-xl px-3 py-2.5">
							<Text className="font-poppins-bold text-[16px] text-neutral-primary">
								{pronunciationAverage === null ? "N/A" : `${pronunciationAverage}%`}
							</Text>
							<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] mt-0.5">
								Speech
							</Text>
						</View>
					</View>

					<Text className="font-poppins text-[12px] text-neutral-secondary mt-3 leading-[18px]">
						{reviewRepairPassed
							? `Repaired: ${repairedReviewFocusLabel || "the focused concepts"}.`
							: weakConceptCount > 0
							? `Focus next: ${practiceFocusLabel || "the concepts you missed"}.`
							: "No weak concept stood out in this session."}
					</Text>
				</View>

				{isFocusedReviewResult ? (
					<View
						className={`border rounded-2xl p-4 ${
							reviewRepairPassed
								? "bg-[#F0FFE8] border-[#D7FFB8]"
								: "bg-[#FFF8E6] border-[#FFE8B3]"
						}`}
					>
						<View className="flex-row items-center mb-3">
							<View
								className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
									reviewRepairPassed ? "bg-[#D7FFB8]" : "bg-[#FFE8B3]"
								}`}
							>
								<Feather
									name={reviewRepairPassed ? "check-circle" : "repeat"}
									size={18}
									color={reviewRepairPassed ? "#58CC02" : "#FF9600"}
								/>
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[15px] text-neutral-primary">
									{isCheckpointRecoveryReview
										? "Checkpoint Skills Practiced"
										: reviewRepairPassed
										? "Weak Parts Repaired"
										: "Still Worth Reviewing"}
								</Text>
								<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
									{isCheckpointRecoveryReview
										? "Try the checkpoint again while this practice is fresh."
										: reviewRepairPassed
										? "These concepts will step back from urgent review."
										: "Keep this focus active until it feels automatic."}
								</Text>
							</View>
						</View>

						{(reviewRepairPassed
							? repairedFocusedReviewConceptIds
							: stillWeakFocusedConceptIds
						)
							.slice(0, 3)
							.map((conceptId) => (
								<View key={conceptId} className="flex-row items-center mt-2">
									<Feather
										name={reviewRepairPassed ? "check" : "refresh-cw"}
										size={14}
										color={reviewRepairPassed ? "#58CC02" : "#FF9600"}
									/>
									<Text className="font-poppins-semibold text-[12px] text-neutral-primary ml-2">
										{getCurriculumConceptTitle(conceptId) ??
											conceptId.replace(/[_:-]+/g, " ")}
									</Text>
								</View>
							))}
					</View>
				) : null}

				<View className="bg-[#F4FBFF] border border-[#DDF4FF] rounded-2xl p-4">
					<View className="flex-row items-center mb-3">
						<View className="w-9 h-9 rounded-full bg-[#DDF4FF] items-center justify-center mr-3">
							<Feather name="target" size={18} color="#1CB0F6" />
						</View>
						<View className="flex-1">
							<Text className="font-poppins-bold text-[15px] text-neutral-primary">
								Learning Insights
							</Text>
							<Text className="font-poppins text-[12px] text-neutral-secondary">
								What this session strengthened
							</Text>
						</View>
					</View>

					{resultConceptInsights.length > 0 ? (
						resultConceptInsights.slice(0, 3).map((insight, index) => (
							<View
								key={insight.id}
								className={`flex-row items-start ${
									index > 0 ? "border-t border-[#DCEAF7] mt-3 pt-3" : ""
								}`}
							>
								<View
									className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
										insight.status === "review"
											? "bg-[#FFF3CC]"
											: "bg-[#E6FFD6]"
									}`}
								>
									<Feather
										name={insight.status === "review" ? "refresh-cw" : "check"}
										size={15}
										color={insight.status === "review" ? "#FF9600" : "#58CC02"}
									/>
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[13px] text-neutral-primary">
										{insight.title}
									</Text>
									<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5 leading-[18px]">
										{insight.incorrectCount > 0
											? `${insight.incorrectCount} miss${insight.incorrectCount === 1 ? "" : "es"} to repair`
											: `${insight.correctCount} correct practice${insight.correctCount === 1 ? "" : "s"}`}
									</Text>
								</View>
							</View>
						))
					) : (
						<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
							Your XP, streak, and lesson memory were saved for this session.
						</Text>
					)}
				</View>

				<View
					className={`border rounded-2xl p-4 ${
						hasReviewFocus
							? "bg-[#FFF8E6] border-[#FFE8B3]"
							: "bg-[#F0FFE8] border-[#D7FFB8]"
					}`}
				>
					<View className="flex-row items-center">
						<View
							className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
								hasReviewFocus ? "bg-[#FFE8B3]" : "bg-[#D7FFB8]"
							}`}
						>
							<Feather
								name={hasReviewFocus ? "clock" : "trending-up"}
								size={18}
								color={hasReviewFocus ? "#FF9600" : "#58CC02"}
							/>
						</View>
						<View className="flex-1">
							<Text className="font-poppins-bold text-[14px] text-neutral-primary">
								{hasReviewFocus ? "Best next step" : "Ready to continue"}
							</Text>
							<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5 leading-[18px]">
								{hasReviewFocus
									? `Review ${resultFocusLabel || "the missed concept"} while it is fresh.`
									: "No weak concept stood out, so the next lesson is a good move."}
							</Text>
						</View>
					</View>
				</View>
			</View>
		);

		if (!resultsData) {
			return (
				<SafeAreaView style={styles.safeArea}>
					<View className="flex-1 justify-center items-center px-6 bg-white">
						{saveFailed ? (
							<View className="w-full items-center">
								<View className="w-14 h-14 rounded-full bg-[#FFF3CC] items-center justify-center mb-4">
									<Feather name="wifi-off" size={24} color="#FF9600" />
								</View>
								<Text className="font-poppins-bold text-[20px] text-neutral-primary text-center">
									Progress was not saved
								</Text>
								<Text className="font-poppins text-[14px] text-neutral-secondary text-center mt-2 mb-6 leading-[21px]">
									Check your connection, then retry saving your session.
								</Text>
								<View className="w-full gap-3">
									<Button3D
										onPress={handleRetrySave}
										variant="primary"
										title="Retry Save"
										fullWidth
									/>
									<Button3D
										onPress={handleEndSession}
										variant="ghost"
										title="Exit Session"
										fullWidth
									/>
								</View>
							</View>
						) : (
							<Text className="font-poppins-semibold text-[16px] text-neutral-secondary">
								Saving progress...
							</Text>
						)}
					</View>
				</SafeAreaView>
			);
		}

		return (
			<SafeAreaView style={styles.safeArea}>
				<ScrollView
					style={styles.resultScrollView}
					contentContainerStyle={styles.resultCompletionScrollContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.completionMain}>
						<Animated.View
							style={[
								styles.completionIllustration,
								isAssessmentSession && passed
									? { transform: [{ scale: goldPulseAnim }] }
									: null,
							]}
						>
							<View style={[styles.completionSpark, styles.completionSparkLeft]} />
							<View style={[styles.completionSpark, styles.completionSparkRight]} />
							<View style={[styles.completionSparkSmall, styles.completionSparkSmallLeft]} />
							<View style={[styles.completionSparkSmall, styles.completionSparkSmallRight]} />
							<Image
								source={completionMascot}
								style={styles.completionMascot}
								contentFit="contain"
							/>
							<View style={styles.completionGround}>
								<View style={[styles.completionGroundDot, { backgroundColor: "#FF9600" }]} />
								<View style={[styles.completionGroundDot, { backgroundColor: "#58CC02" }]} />
								<View style={[styles.completionGroundDot, { backgroundColor: "#1CB0F6" }]} />
								<View style={[styles.completionGroundDot, { backgroundColor: "#FF4B4B" }]} />
							</View>
						</Animated.View>

						<Text style={[styles.completionTitle, { color: completionTitleColor }]}>
							{completionTitle}
						</Text>

						{completionSupportMessage ? (
							<View
								style={[
									styles.completionMasteryPill,
									completionSupportIsWarning ? styles.completionMasteryPillWarning : null,
								]}
							>
								<Feather
									name={completionSupportIcon}
									size={13}
									color={completionSupportColor}
								/>
								<Text
									style={[
										styles.completionMasteryPillText,
										completionSupportIsWarning
											? styles.completionMasteryPillTextWarning
											: null,
									]}
								>
									{completionSupportMessage}
								</Text>
							</View>
						) : null}

						{resultsData.levelledUp ? (
							<View style={styles.completionLevelPill}>
								<Feather name="trending-up" size={13} color="#6C4EF5" />
								<Text style={styles.completionLevelText}>
									Level {resultsData.newLevel}
								</Text>
							</View>
						) : null}

						<View style={styles.completionStatsRow}>
							{renderCompletionStatCard({
								label: "TOTAL XP",
								value: `${resultsData.xpEarned}`,
								icon: "zap",
								color: "#FFC800",
								backgroundColor: "#FFF8D9",
							})}
							{renderCompletionStatCard({
								label: scorePercent >= 80 ? "GOOD" : "SCORE",
								value: `${scorePercent}%`,
								icon: "target",
								color: accuracyColor,
								backgroundColor:
									scorePercent >= 80
										? "#F0FFE8"
										: scorePercent >= 60
											? "#FFF8E6"
											: "#FFF0F0",
							})}
							{renderCompletionStatCard({
								label: "SPEEDY",
								value: formatStopwatchLabel(timeSpentSeconds),
								icon: "clock",
								color: "#1CB0F6",
								backgroundColor: "#F0FAFF",
							})}
						</View>

						{leaderboardSyncFailed ? (
							<View style={styles.completionWarning}>
								<Text style={styles.completionWarningText}>
									Your XP was saved locally. League sync will retry after your next completed session.
								</Text>
							</View>
						) : null}

						{showLearningInsights ? (
							<View style={styles.completionInsightsWrap}>
								{renderResultInsights()}
							</View>
						) : null}
					</View>

					{shouldRenderLegacyResultLayout ? (
						<>
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
						{resultTitle}
					</Text>

					<Text className="font-poppins text-[15px] text-neutral-secondary text-center mt-2 leading-[22px] max-w-[280px]">
						{isPracticeSession ? resultSubtitle : isAssessmentSession
							? "You've successfully proven your skills for this unit! Keep up the great work! ⚡"
							: passed
							? "Awesome job! You're a natural language learner! 🥳"
							: "Keep practicing! Consistency is key to learning a new language. ⚡"}
					</Text>

					{isReviewSession ? (
						<Text className="font-poppins-semibold text-[13px] text-[#6C4EF5] text-center mt-2 leading-[20px] max-w-[300px]">
							{resultSubtitle}
						</Text>
					) : null}

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

					{renderResultInsights()}

					{leaderboardSyncFailed ? (
						<View className="bg-[#FFF8E6] border border-[#FFE8B3] rounded-xl px-4 py-3 mb-5 max-w-[320px]">
							<Text className="font-poppins-semibold text-[12px] text-[#A25700] text-center">
								Your XP was saved locally. League sync will retry after your next completed session.
							</Text>
						</View>
					) : null}

					{/* Confirm exit */}
					<View className="gap-3 w-full max-w-[320px]">
						{hasReviewFocus ? (
							<Button3D
								onPress={() =>
									router.replace({
										pathname: "/review-session",
										params: {
											focusConceptIds: practiceFocusConceptIds.join(","),
											source: "session-results",
										},
									})
								}
								variant="secondary"
								size="lg"
								title="Practice Weak Parts"
							/>
						) : null}
						<Button3D
							onPress={() => router.replace("/")}
							variant="primary"
							size="lg"
							title={hasReviewFocus && !isReviewSession ? "Continue Path" : "Continue"}
						/>
					</View>
						</>
					) : null}
				</ScrollView>

				<View style={styles.completionButtonWrap}>
					<View style={styles.completionButtonInner}>
						<Button3D
							onPress={handlePrimaryResultAction}
							variant={primaryResultActionVariant}
							size="lg"
							title={primaryResultActionTitle}
						/>

						{hasCheckpointRecoveryFocus ? (
							<Button3D
								onPress={handleCheckpointRecoveryReview}
								variant="secondary"
								size="lg"
								title="REVIEW WEAK SKILLS"
							/>
						) : null}

						{shouldRetryCheckpoint || shouldRetryMastery || isCheckpointRecoveryReview ? (
							<TouchableOpacity
								onPress={() => router.replace(isCheckpointRecoveryReview ? "/learn" : "/")}
								style={styles.completionTextButton}
							>
								<Text style={styles.completionTextButtonLabel}>
									END SESSION
								</Text>
							</TouchableOpacity>
						) : null}
					</View>
				</View>
			</SafeAreaView>
		);
	}

	const checkButtonDisabled = isCheckDisabled() || isAnswered || feedbackVisible;
	const footerIsReady = !checkButtonDisabled;
	const footerStatusIcon: React.ComponentProps<typeof Feather>["name"] = footerIsReady
		? "check-circle"
		: feedbackVisible
		? "message-circle"
		: isAnswered
		? "clock"
		: "circle";
	const footerStatusText = footerIsReady
		? "Ready to check"
		: feedbackVisible || isAnswered
		? "Answer checked"
		: "Choose an answer";
	const footerStatusColor = footerIsReady
		? learning.actionDark
		: feedbackVisible || isAnswered
		? learning.selectedDark
		: neutral.textSecondary;

	return (
		<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				{/* Top bar */}
				<View style={styles.sessionTopBar}>
					<View style={styles.sessionTopBarInner}>
						<TouchableOpacity onPress={handleQuit} activeOpacity={0.7} style={styles.quitButton}>
							<Feather name="x" size={23} color="#6B7280" />
						</TouchableOpacity>

						<View style={styles.progressGroup}>
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
							<Text style={styles.progressStepText}>
								{progressStepLabel}
							</Text>
						</View>

						<View style={styles.sessionRightGroup}>
							{!isAssessmentSession && (
								<View style={styles.heartsPill}>
									<View style={styles.heartsRow}>
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
								</View>
							)}

							{/* XP accumulation text */}
							<View
								style={[
									styles.sessionStatusPill,
									isAssessmentSession || isMasterySession
										? styles.sessionStatusPillGold
										: isReviewSession
										? styles.sessionStatusPillReview
										: styles.sessionStatusPillXp,
								]}
							>
								<Feather
									name={sessionStatusIconName}
									size={12}
									color={sessionStatusColor}
								/>
								<Text
									style={[styles.sessionStatusText, { color: sessionStatusColor }]}
									numberOfLines={1}
								>
									{sessionStatusLabel}
								</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Animated Exercise container */}
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
				>
					<Animated.View
						style={[
							styles.exerciseContentShell,
							Platform.OS === "web"
								? null
								: { transform: [{ translateX: slideAnim }] },
						]}
					>
						{/* Question Header */}
						<View style={styles.questionCard}>
							<View style={styles.questionMetaRow}>
								<View
									style={[
										styles.modePill,
										{
											backgroundColor: sessionModeSurface,
											borderColor: sessionModeAccent,
										},
									]}
								>
									<View
										style={[
											styles.modePillDot,
											{ backgroundColor: sessionModeAccent },
										]}
									/>
									<Text
										style={[styles.modePillText, { color: sessionModeAccent }]}
										numberOfLines={1}
									>
										{sessionModeLabel}
									</Text>
								</View>
								{currentExercise?.difficultyBand ? (
									<View style={styles.difficultyPill}>
										<Text
											style={[styles.difficultyPillText, difficultyBandTextStyle]}
											numberOfLines={1}
										>
											{difficultyBandLabel}
										</Text>
									</View>
								) : null}
							</View>

							<View style={styles.questionTaskRow}>
								<View
									style={[
										styles.questionTaskIcon,
										{
											backgroundColor: sessionModeSurface,
											borderColor: sessionModeAccent,
										},
									]}
								>
									<Feather
										name={questionTaskMeta.icon}
										size={14}
										color={sessionModeAccent}
									/>
								</View>
								<Text style={styles.questionTaskText} numberOfLines={1}>
									{questionTaskMeta.label}
								</Text>
								<View style={styles.questionTaskLine} />
							</View>

							<Text style={styles.questionTitle}>
								{currentExercise.question}
							</Text>

							{shouldShowPromptScene ? (
								<View style={styles.questionPromptScene}>
									<Image
										source={images.mascotWelcome}
										style={styles.questionPromptMascot}
										contentFit="contain"
									/>
									<View style={styles.questionPromptBubble}>
										<View style={styles.questionPromptBubbleTail} />
										{currentExercise.audioText ? (
											<TouchableOpacity
												onPress={playAudio}
												activeOpacity={0.75}
												style={styles.questionPromptAudioButton}
											>
												<Feather name="volume-2" size={16} color="#1CB0F6" />
											</TouchableOpacity>
										) : null}
										<Text style={styles.questionPromptBubbleText}>
											{promptBubbleText}
										</Text>
									</View>
								</View>
							) : (
								<View style={styles.questionTitleDivider}>
									<View
										style={[
											styles.questionTitleDividerAccent,
											{ backgroundColor: sessionModeAccent },
										]}
									/>
								</View>
							)}
						</View>

						{canShowExerciseHint && exerciseHint ? (
							<TouchableOpacity
								onPress={() => setHintExpanded((prev) => !prev)}
								activeOpacity={0.85}
								accessibilityRole="button"
								accessibilityLabel={hintExpanded ? "Hide learning hint" : "Show learning hint"}
								accessibilityState={{ expanded: hintExpanded }}
								style={[
									styles.exerciseHintCard,
									hintExpanded ? styles.exerciseHintCardExpanded : null,
								]}
							>
								<View style={styles.exerciseHintHeader}>
									<View style={styles.exerciseHintIcon}>
										<Feather name="info" size={13} color={learning.selectedDark} />
									</View>
									<View style={styles.exerciseHintTitleWrap}>
										<Text style={styles.exerciseHintEyebrow}>
											Pattern hint
										</Text>
										<Text
											style={styles.exerciseHintTitle}
											numberOfLines={hintExpanded ? 2 : 1}
										>
											{exerciseHint.title}
										</Text>
									</View>
									<View
										style={[
											styles.exerciseHintChevron,
											hintExpanded ? styles.exerciseHintChevronExpanded : null,
										]}
									>
										<Feather
											name={hintExpanded ? "chevron-up" : "chevron-down"}
											size={16}
											color={learning.selectedDark}
										/>
									</View>
								</View>
								{hintExpanded ? (
									<View style={styles.exerciseHintBody}>
										<View style={styles.exerciseHintTipRow}>
											<View style={styles.exerciseHintTipAccent} />
											<Text style={styles.exerciseHintTip}>
												{exerciseHint.tip}
											</Text>
										</View>
										{exerciseHint.example ? (
											<View style={styles.exerciseHintExample}>
												<Text style={styles.exerciseHintExampleLabel}>
													Example
												</Text>
												<Text style={styles.exerciseHintExampleText}>
													{exerciseHint.example}
												</Text>
											</View>
										) : null}
									</View>
								) : null}
							</TouchableOpacity>
						) : null}

						{/* Rendering details per exercise type */}
						{currentExercise.type === "mcq" && (
							<View
								style={[
									styles.mcqList,
									shouldUseCompactMcqGrid ? styles.mcqGrid : null,
								]}
							>
								{currentExercise.options?.map((option, index) => {
									const isSelected = selectedOption === option;
									const isCorrectOption = option === currentExercise.correctAnswer;
									const isIncorrectSelection = isAnswered && isSelected && !isCorrectOption;

									return (
										<Animated.View
											key={`${option}-${index}`}
											style={[
												styles.answerFeedbackWrap,
												shouldUseCompactMcqGrid ? styles.mcqGridItem : null,
												isAnswered && isSelected ? answerFeedbackStyle : null,
											]}
										>
											<TouchableOpacity
												disabled={isAnswered}
												onPress={() => setSelectedOption(option)}
												activeOpacity={0.7}
												accessibilityRole="button"
												accessibilityLabel={`Option ${String.fromCharCode(65 + index)}: ${option}`}
												accessibilityState={{
													selected: isSelected,
													disabled: isAnswered,
												}}
												style={[
													styles.mcqCard,
													shouldUseCompactMcqGrid ? styles.mcqCardGrid : null,
													isSelected && !isAnswered ? styles.mcqCardSelected : null,
													isAnswered && isCorrectOption ? styles.mcqCardCorrect : null,
													isIncorrectSelection ? styles.mcqCardIncorrect : null,
												]}
											>
												{isSelected && !isAnswered ? (
													<View style={styles.mcqCardAccent} />
												) : null}
												{isAnswered && isCorrectOption ? (
													<View
														style={[
															styles.mcqCardAccent,
															styles.mcqCardAccentCorrect,
														]}
													/>
												) : null}
												{isIncorrectSelection ? (
													<View
														style={[
															styles.mcqCardAccent,
															styles.mcqCardAccentIncorrect,
														]}
													/>
												) : null}
												<View
													style={[
														styles.optionLetterBadge,
														shouldUseCompactMcqGrid ? styles.optionLetterBadgeGrid : null,
														isSelected && !isAnswered ? styles.optionLetterBadgeSelected : null,
														isAnswered && isCorrectOption ? styles.optionLetterBadgeCorrect : null,
														isIncorrectSelection ? styles.optionLetterBadgeIncorrect : null,
													]}
												>
													<Text
														style={[
															styles.optionLetterText,
															(isSelected || isCorrectOption || isIncorrectSelection) && isAnswered
																? styles.optionLetterTextActive
																: null,
															isSelected && !isAnswered ? styles.optionLetterTextSelected : null,
														]}
													>
														{String.fromCharCode(65 + index)}
													</Text>
												</View>
												<Text
													style={[
														styles.mcqOptionText,
														shouldUseCompactMcqGrid ? styles.mcqOptionTextGrid : null,
														isSelected && !isAnswered ? styles.mcqOptionTextSelected : null,
														isAnswered && isCorrectOption ? styles.mcqOptionTextCorrect : null,
														isIncorrectSelection ? styles.mcqOptionTextIncorrect : null,
													]}
													numberOfLines={shouldUseCompactMcqGrid ? 2 : 3}
												>
													{option}
												</Text>
												{isAnswered && isCorrectOption ? (
													<View
														style={[
															styles.optionResultIcon,
															shouldUseCompactMcqGrid ? styles.optionResultIconGrid : null,
															styles.optionResultIconCorrect,
														]}
													>
														<Feather name="check" size={17} color="#FFFFFF" />
													</View>
												) : null}
												{isIncorrectSelection ? (
													<View
														style={[
															styles.optionResultIcon,
															shouldUseCompactMcqGrid ? styles.optionResultIconGrid : null,
															styles.optionResultIconIncorrect,
														]}
													>
														<Feather name="x" size={17} color="#FFFFFF" />
													</View>
												) : null}
											</TouchableOpacity>
										</Animated.View>
									);
								})}
							</View>
						)}

						{currentExercise.type === "fill-in-the-blank" && (
							<View style={styles.fillBlankCanvas}>
								{/* Missing slot sentence display */}
								<View style={styles.fillBlankSentenceRow}>
									{(currentExercise.sentence ?? "___").split(" ").map((word, idx) => {
										const isBlank = word.includes("___");
										if (isBlank) {
											const [beforeBlank = "", afterBlank = ""] = word.split("___");
											const selectedBlankOption = fillBlankOptions.find(
												(option) => option.value === typedAnswer
											);
											const pronunciation =
												selectedBlankOption?.pronunciation ??
												getFillBlankPronunciation(typedAnswer, activeLanguageId);

											return (
												<View key={idx} className="flex-row items-center gap-2">
													{beforeBlank ? (
														<Text className="font-poppins-semibold text-[18px] text-neutral-primary">
															{beforeBlank}
														</Text>
													) : null}
													<Animated.View
														style={[
															styles.answerFeedbackInlineWrap,
															isAnswered && typedAnswer ? answerFeedbackStyle : null,
														]}
													>
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
																accessibilityRole="button"
																accessibilityLabel={
																	typedAnswer ? "Clear selected answer" : "Answer slot"
																}
																style={[
																	styles.fillBlankSlotPressable,
																	typedAnswer ? styles.fillBlankSlotPressableFilled : null,
																]}
															>
																{typedAnswer && !isAnswered ? (
																	<View style={styles.fillBlankSlotClearBadge}>
																		<Feather name="x" size={11} color={learning.selectedDark} />
																	</View>
																) : null}
																<Text
																	style={[
																		styles.fillBlankSlotText,
																		!typedAnswer ? styles.fillBlankSlotPlaceholderText : null,
																		isAnswered && isCorrect ? styles.fillBlankSlotTextCorrect : null,
																		isAnswered && !isCorrect ? styles.fillBlankSlotTextIncorrect : null,
																	]}
																	numberOfLines={2}
																>
																	{selectedBlankOption?.label ?? (typedAnswer || "Select answer")}
																</Text>
																{pronunciation ? (
																	<Text
																		style={[
																			styles.fillBlankSlotHintText,
																			isAnswered && isCorrect ? styles.fillBlankSlotHintTextCorrect : null,
																			isAnswered && !isCorrect ? styles.fillBlankSlotHintTextIncorrect : null,
																		]}
																		numberOfLines={1}
																	>
																		{pronunciation}
																	</Text>
																) : null}
																{!typedAnswer ? (
																	<View style={styles.fillBlankSlotCue}>
																		<View style={styles.fillBlankSlotCueDash} />
																		<View style={styles.fillBlankSlotCueDashShort} />
																	</View>
																) : null}
															</NativeTouchableOpacity>
														</NativeView>
													</Animated.View>
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

								<View style={styles.fillBlankWordBankSection}>
									<View style={styles.fillBlankWordBankHeader}>
										<View style={styles.fillBlankWordBankIcon}>
											<Feather name="move" size={13} color={learning.selectedDark} />
										</View>
										<Text style={styles.fillBlankWordBankTitle}>
											Choose the missing part
										</Text>
									</View>
									<View style={styles.fillBlankWordBankPanel}>
										<View style={styles.wordBankTileGrid}>
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
							</View>
						)}

						{currentExercise.type === "matching-pairs" && (
							<View style={styles.matchingPairsShell}>
								<View style={styles.matchingPairsHeader}>
									<View style={styles.matchingPairsHeaderIcon}>
										<Feather name="link-2" size={14} color={learning.selectedDark} />
									</View>
									<View style={styles.matchingPairsHeaderCopy}>
										<Text style={styles.matchingPairsHeaderTitle}>
											Find the pairs
										</Text>
										<Text style={styles.matchingPairsHeaderSubtitle}>
											{matchedLefts.length}/{leftOptions.length} matched
										</Text>
									</View>
									<View style={styles.matchingPairsProgressDots}>
										{leftOptions.map((option) => {
											const isMatched = matchedLefts.includes(option);

											return (
												<View
													key={option}
													style={[
														styles.matchingPairsProgressDot,
														isMatched ? styles.matchingPairsProgressDotDone : null,
													]}
												/>
											);
										})}
									</View>
								</View>
								<View style={styles.matchingPairsGrid}>
									<View style={styles.matchingPairsColumn}>
										{leftOptions.map((word, idx) => {
											const isSelected = selectedLeft === word;
											const isMatched = matchedLefts.includes(word);
											const isMismatched = mismatchedLeft === word;

											return (
												<NativeTouchableOpacity
													key={idx}
													onPress={() => handlePairTap(word, "left")}
													disabled={isMatched || isAnswered}
													activeOpacity={0.78}
													accessibilityRole="button"
													accessibilityLabel={`Left match option ${word}`}
													style={[
														styles.matchingPairCard,
														isSelected ? styles.matchingPairCardSelected : null,
														isMatched ? styles.matchingPairCardMatched : null,
														isMismatched ? styles.matchingPairCardMismatched : null,
														isMatched || isAnswered ? styles.matchingPairCardDisabled : null,
													]}
												>
													<View style={styles.matchingPairContent}>
														<Text
															style={[
																styles.matchingPairText,
																isSelected ? styles.matchingPairTextSelected : null,
																isMatched ? styles.matchingPairTextMatched : null,
																isMismatched ? styles.matchingPairTextMismatched : null,
															]}
															numberOfLines={2}
														>
															{word}
														</Text>
														{isMatched ? (
															<View style={styles.matchingPairStatusIconMatched}>
																<Feather name="check" size={13} color="#FFFFFF" />
															</View>
														) : null}
														{isMismatched ? (
															<View style={styles.matchingPairStatusIconMismatched}>
																<Feather name="x" size={13} color="#FFFFFF" />
															</View>
														) : null}
													</View>
													{isMatched ? (
														<>
															<View style={[styles.matchingPairSparkle, styles.matchingPairSparkleTop]} />
															<View style={[styles.matchingPairSparkle, styles.matchingPairSparkleBottom]} />
														</>
													) : null}
												</NativeTouchableOpacity>
											);
										})}
									</View>

									<View style={styles.matchingPairsColumn}>
										{rightOptions.map((word, idx) => {
											const isSelected = selectedRight === word;
											const isMatched = matchedRights.includes(word);
											const isMismatched = mismatchedRight === word;

											return (
												<NativeTouchableOpacity
													key={idx}
													onPress={() => handlePairTap(word, "right")}
													disabled={isMatched || isAnswered}
													activeOpacity={0.78}
													accessibilityRole="button"
													accessibilityLabel={`Right match option ${word}`}
													style={[
														styles.matchingPairCard,
														isSelected ? styles.matchingPairCardSelected : null,
														isMatched ? styles.matchingPairCardMatched : null,
														isMismatched ? styles.matchingPairCardMismatched : null,
														isMatched || isAnswered ? styles.matchingPairCardDisabled : null,
													]}
												>
													<View style={styles.matchingPairContent}>
														<Text
															style={[
																styles.matchingPairText,
																isSelected ? styles.matchingPairTextSelected : null,
																isMatched ? styles.matchingPairTextMatched : null,
																isMismatched ? styles.matchingPairTextMismatched : null,
															]}
															numberOfLines={2}
														>
															{word}
														</Text>
														{isMatched ? (
															<View style={styles.matchingPairStatusIconMatched}>
																<Feather name="check" size={13} color="#FFFFFF" />
															</View>
														) : null}
														{isMismatched ? (
															<View style={styles.matchingPairStatusIconMismatched}>
																<Feather name="x" size={13} color="#FFFFFF" />
															</View>
														) : null}
													</View>
													{isMatched ? (
														<>
															<View style={[styles.matchingPairSparkle, styles.matchingPairSparkleTop]} />
															<View style={[styles.matchingPairSparkle, styles.matchingPairSparkleBottom]} />
														</>
													) : null}
												</NativeTouchableOpacity>
											);
										})}
									</View>
								</View>
							</View>
						)}

						{currentExercise.type === "tap-word" && (
							<View style={styles.tapWordExerciseShell}>
								<View style={styles.tapWordAnswerBoard}>
									<View style={[styles.answerGuideLine, styles.answerGuideLineTop]} />
									<View style={[styles.answerGuideLine, styles.answerGuideLineMiddle]} />
									<View style={[styles.answerGuideLine, styles.answerGuideLineBottom]} />
									<View style={styles.tapWordBoardHeader}>
										<View style={styles.tapWordBoardIcon}>
											<Feather name="edit-3" size={14} color={learning.selectedDark} />
										</View>
										<Text style={styles.tapWordBoardTitle}>Your answer</Text>
										<Text style={styles.tapWordBoardCount}>
											{selectedOption ? "1/1" : "0/1"}
										</Text>
									</View>
									<View style={styles.tapWordSlotRow}>
										{selectedOption ? (
											<Animated.View
												style={[
													styles.answerFeedbackInlineWrap,
													isAnswered ? answerFeedbackStyle : null,
												]}
											>
												<NativeTouchableOpacity
													disabled={isAnswered}
													onPress={() => setSelectedOption(null)}
													activeOpacity={0.72}
													accessibilityRole="button"
													accessibilityLabel={`Remove selected word ${selectedOption}`}
													style={[
														styles.tapWordSelectedTile,
														isAnswered && isCorrect ? styles.tapWordSelectedTileCorrect : null,
														isAnswered && !isCorrect ? styles.tapWordSelectedTileIncorrect : null,
													]}
												>
													{!isAnswered ? (
														<View style={styles.tapWordSelectedClearBadge}>
															<Feather name="x" size={11} color={learning.selectedDark} />
														</View>
													) : null}
													<Text
														style={[
															styles.wordBankTileText,
															styles.wordBankTileTextSelected,
														]}
														numberOfLines={1}
													>
														{selectedOption}
													</Text>
												</NativeTouchableOpacity>
											</Animated.View>
										) : (
											<View style={styles.tapWordEmptyState}>
												<View style={styles.tapWordEmptySlotRow}>
													{[0, 1, 2].map((slot) => (
														<View key={slot} style={styles.tapWordEmptySlot} />
													))}
												</View>
												<Text style={styles.tapWordEmptyHint}>Tap a word below</Text>
											</View>
										)}
									</View>
								</View>

								<View style={styles.tapWordBankPanel}>
									<View style={styles.tapWordBankHeader}>
										<View style={styles.tapWordBankIcon}>
											<Feather name="grid" size={13} color={learning.selectedDark} />
										</View>
										<Text style={styles.tapWordBankTitle}>Word bank</Text>
									</View>
									<View style={[styles.wordBankTileGrid, styles.tapWordTileGrid]}>
										{currentExercise.options?.map((option, index) => {
											const isSelected = selectedOption === option;
											if (isSelected) return null;

											return (
												<NativeTouchableOpacity
													key={index}
													disabled={isAnswered}
													onPress={() => setSelectedOption(option)}
													activeOpacity={0.74}
													accessibilityRole="button"
													accessibilityLabel={`Word tile ${option}`}
													style={[
														styles.tapWordOptionTile,
														isAnswered ? styles.tapWordOptionTileDisabled : null,
													]}
												>
													<Text style={styles.wordBankTileText} numberOfLines={1}>
														{option}
													</Text>
												</NativeTouchableOpacity>
											);
										})}
									</View>
								</View>
							</View>
						)}

						{currentExercise.type === "speaking" && (
							<View style={styles.speakingCard}>
								<View style={styles.speakingAudioPanel}>
									<View style={styles.audioPanelTopRow}>
										<Text style={styles.audioPanelEyebrow}>Listen first</Text>
										<View style={styles.audioPanelHintPill}>
											<Feather name="repeat" size={12} color={learning.actionDark} />
											<Text style={styles.audioPanelHintText}>Replay</Text>
										</View>
									</View>
									<View style={styles.speakingWaveformTrack}>
										{LISTENING_WAVEFORM_BARS.map((height, index) => (
											<View
												key={`speak-${height}-${index}`}
												style={[styles.speakingWaveformBar, { height }]}
											/>
										))}
									</View>
									<TouchableOpacity
										onPress={playAudio}
										activeOpacity={0.82}
										accessibilityRole="button"
										accessibilityLabel="Play phrase audio"
										style={styles.speakingPlayButton}
									>
										<Feather name="volume-2" size={30} color="#FFFFFF" />
									</TouchableOpacity>
								</View>

								<View style={styles.speakingInstructionPill}>
									<Feather name="mic" size={14} color={learning.actionDark} />
									<Text style={styles.speakingInstructionText}>
										Listen, then say it out loud
									</Text>
								</View>

								<View style={styles.speakingPhraseCard}>
									<Text style={styles.speakingPhraseText}>
										{selectedSpeakingOption?.label ?? currentExercise.correctAnswer}
									</Text>
									{speakingPronunciation ? (
										<Text style={styles.speakingPronunciationText}>
											{speakingPronunciation}
										</Text>
									) : null}
									{selectedSpeakingOption?.translation ? (
										<Text style={styles.speakingTranslationText}>
											{selectedSpeakingOption.translation}
										</Text>
									) : null}
								</View>

								<View style={styles.speakingPracticePanel}>
									<View style={styles.speakingPracticeHeader}>
										<View style={styles.speakingPracticeHeaderIcon}>
											<Feather name="mic" size={14} color={learning.actionDark} />
										</View>
										<View style={styles.speakingPracticeHeaderCopy}>
											<Text style={styles.speakingPracticeTitle}>Voice check</Text>
											<Text style={styles.speakingPracticeSubtitle}>
												Record yourself, then score your pronunciation.
											</Text>
										</View>
										<View
											style={[
												styles.speakingPracticeStatusPill,
												pronunciationRecorderState.isRecording
													? styles.speakingPracticeStatusPillRecording
													: pronunciationScore
														? styles.speakingPracticeStatusPillScored
														: pronunciationAudioUri
															? styles.speakingPracticeStatusPillReady
															: null,
											]}
										>
											<Text
												style={[
													styles.speakingPracticeStatusText,
													pronunciationRecorderState.isRecording
														? styles.speakingPracticeStatusTextRecording
														: pronunciationScore
															? styles.speakingPracticeStatusTextScored
															: pronunciationAudioUri
																? styles.speakingPracticeStatusTextReady
																: null,
												]}
											>
												{pronunciationRecorderState.isRecording
													? "Recording"
													: pronunciationScore
														? "Scored"
														: pronunciationAudioUri
															? "Ready"
															: "Optional"}
											</Text>
										</View>
									</View>

									<View style={styles.speakingControlsRow}>
										<TouchableOpacity
											disabled={isAnswered || pronunciationLoading}
											onPress={
												pronunciationRecorderState.isRecording
													? handleStopPronunciationRecording
													: handleStartPronunciationRecording
											}
											activeOpacity={0.8}
											style={[
												styles.speakingControlButton,
												pronunciationRecorderState.isRecording
													? styles.speakingRecordButtonActive
													: styles.speakingRecordButton,
												isAnswered || pronunciationLoading
													? styles.speakingControlButtonDisabled
													: null,
											]}
										>
											<Feather
												name={pronunciationRecorderState.isRecording ? "square" : "mic"}
												size={16}
												color="#FFFFFF"
											/>
											<Text style={styles.speakingControlButtonText}>
												{pronunciationRecorderState.isRecording ? "Stop" : "Record"}
											</Text>
										</TouchableOpacity>

										<TouchableOpacity
											disabled={
												isAnswered ||
												pronunciationLoading ||
												pronunciationRecorderState.isRecording ||
												!pronunciationAudioUri
											}
											onPress={handleScorePronunciation}
											activeOpacity={0.8}
											style={[
												styles.speakingControlButton,
												pronunciationAudioUri &&
												!pronunciationRecorderState.isRecording &&
												!pronunciationLoading
													? styles.speakingScoreButton
													: styles.speakingScoreButtonDisabled,
											]}
										>
											<Feather name="activity" size={16} color="#FFFFFF" />
											<Text style={styles.speakingControlButtonText}>
												{pronunciationLoading
													? "Scoring..."
													: pronunciationAttemptCount > 0
														? "Score retry"
														: "Score"}
											</Text>
										</TouchableOpacity>
									</View>

									{pronunciationRecorderState.isRecording ? (
										<View style={styles.speakingRecordingState}>
											<View style={styles.speakingRecordingWave}>
												{LISTENING_WAVEFORM_BARS.slice(1, 10).map((height, index) => (
													<View
														key={`recording-${height}-${index}`}
														style={[
															styles.speakingRecordingWaveBar,
															{ height: Math.max(12, Math.round(height * 0.62)) },
														]}
													/>
												))}
											</View>
											<Text style={[styles.speakingStatusText, styles.speakingRecordingText]}>
												Recording... speak the phrase clearly.
											</Text>
										</View>
									) : pronunciationScore ? (
										<View style={styles.speakingScoreWrap}>
											<Text
												style={[
													styles.speakingScoreText,
													{ color: pronunciationScoreColor },
												]}
											>
												{pronunciationScore.score}/100
											</Text>
											{bestPronunciationScore && pronunciationAttemptCount > 1 ? (
												<Text style={styles.speakingBestText}>
													Best: {bestPronunciationScore.score}/100
												</Text>
											) : null}
											{pronunciationStatusText ? (
												<Text
													style={[
														styles.speakingScoreStatusText,
														{ color: pronunciationScoreColor },
													]}
												>
													{pronunciationStatusText}
												</Text>
											) : null}
											<Text style={styles.speakingTipText}>
												{pronunciationRetryPrompt || pronunciationScore.tip}
											</Text>
											<View style={styles.speakingScoreMetricsRow}>
												<View style={styles.speakingScoreMetricCard}>
													<Text style={styles.speakingScoreMetricLabel}>Accuracy</Text>
													<Text style={styles.speakingScoreMetricValue}>
														{pronunciationScore.accuracy}%
													</Text>
												</View>
												<View style={styles.speakingScoreMetricCard}>
													<Text style={styles.speakingScoreMetricLabel}>Fluency</Text>
													<Text style={styles.speakingScoreMetricValue}>
														{pronunciationScore.fluency}%
													</Text>
												</View>
											</View>
										</View>
									) : pronunciationAudioUri ? (
										<View style={styles.speakingPromptState}>
											<Feather name="check-circle" size={16} color={learning.selectedDark} />
											<Text style={[styles.speakingStatusText, styles.speakingReadyText]}>
												Recording ready. Tap Score when you are ready.
											</Text>
										</View>
									) : (
										<View style={styles.speakingPromptState}>
											<Feather name="info" size={16} color={neutral.textSecondary} />
											<Text style={styles.speakingStatusText}>
												Optional: record your voice for a quick pronunciation score.
											</Text>
										</View>
									)}

									{pronunciationError ? (
										<Text style={styles.speakingErrorText}>
											{pronunciationError}
										</Text>
									) : null}
								</View>

								<View style={styles.speakingActionRow}>
									<TouchableOpacity
										disabled={isAnswered}
										onPress={() => {
											setSelectedOption(null);
											setPronunciationAudioUri("");
											setPronunciationScore(null);
											setPronunciationError("");
											setPronunciationRetryPrompt(
												canRetryPronunciation
													? "Record again and focus on the phrase rhythm."
													: ""
											);
											playAudio();
										}}
										activeOpacity={0.8}
										style={[
											styles.speakingActionButton,
											styles.speakingRetryButton,
											isAnswered ? styles.speakingActionButtonDisabled : null,
										]}
									>
										<Feather name="refresh-cw" size={16} color="#1CB0F6" />
										<Text style={[styles.speakingActionButtonText, styles.speakingRetryButtonText]}>
											{canRetryPronunciation ? "Try once more" : "Try again"}
										</Text>
									</TouchableOpacity>

									<Animated.View
										style={[
											styles.answerFeedbackFlexWrap,
											isAnswered && selectedOption === "said-it" ? answerFeedbackStyle : null,
										]}
									>
										<TouchableOpacity
											disabled={isAnswered}
											onPress={() => {
												setSelectedOption("said-it");
												setPronunciationError("");
											}}
											activeOpacity={0.8}
											style={[
												styles.speakingActionButton,
												selectedOption === "said-it"
													? styles.speakingConfirmButtonSelected
													: styles.speakingConfirmButton,
												isAnswered ? styles.speakingActionButtonDisabled : null,
											]}
										>
											<Feather
												name="check-circle"
												size={16}
												color={selectedOption === "said-it" ? "#58CC02" : "#6B7280"}
											/>
											<Text
												style={[
													styles.speakingActionButtonText,
													selectedOption === "said-it"
														? styles.speakingConfirmButtonTextSelected
														: styles.speakingConfirmButtonText,
												]}
											>
												I said it
											</Text>
										</TouchableOpacity>
									</Animated.View>
								</View>
							</View>
						)}

						{currentExercise.type === "listen-type" && (
							<View style={styles.listeningCard}>
								<View style={styles.listeningAudioPanel}>
									<View style={styles.audioPanelTopRow}>
										<Text style={styles.audioPanelEyebrow}>Audio prompt</Text>
										<View style={styles.listeningReplayPill}>
											<Feather name="repeat" size={12} color={learning.selectedDark} />
											<Text style={styles.listeningReplayText}>Replay</Text>
										</View>
									</View>
									<View style={styles.listeningWaveformTrack}>
										{LISTENING_WAVEFORM_BARS.map((height, index) => (
											<View
												key={`${height}-${index}`}
												style={[styles.listeningWaveformBar, { height }]}
											/>
										))}
									</View>
									<TouchableOpacity
										onPress={playAudio}
										activeOpacity={0.82}
										accessibilityRole="button"
										accessibilityLabel="Play listening audio"
										style={styles.listeningPlayButton}
									>
										<Feather name="volume-2" size={30} color="#FFFFFF" />
									</TouchableOpacity>
								</View>

								<View style={styles.listeningPromptPill}>
									<Feather name="headphones" size={14} color={learning.selectedDark} />
									<Text style={styles.listeningPromptText}>Tap to hear phrase</Text>
								</View>

								<View style={styles.listeningAnswerPanel}>
									<View style={styles.listeningAnswerHeader}>
										<View style={styles.listeningAnswerHeaderIcon}>
											<Feather name="edit-2" size={13} color={learning.selectedDark} />
										</View>
										<Text style={styles.listeningAnswerTitle}>Heard answer</Text>
										<View
											style={[
												styles.listeningAnswerStatusPill,
												typedAnswer ? styles.listeningAnswerStatusPillReady : null,
											]}
										>
											<Text
												style={[
													styles.listeningAnswerStatusText,
													typedAnswer ? styles.listeningAnswerStatusTextReady : null,
												]}
											>
												{typedAnswer ? "Ready" : "Waiting"}
											</Text>
										</View>
									</View>

									{shouldUseListeningWordBank ? (
										<Animated.View
											style={[
												styles.answerFeedbackWrap,
												isAnswered && typedAnswer ? answerFeedbackStyle : null,
											]}
										>
											<NativeView
												ref={blankSlotRef}
												style={[
													styles.listeningAnswerSlot,
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
													accessibilityRole="button"
													accessibilityLabel={
														typedAnswer ? "Clear selected answer" : "Answer slot"
													}
													style={[
														styles.fillBlankSlotPressable,
														typedAnswer ? styles.fillBlankSlotPressableFilled : null,
													]}
												>
													{typedAnswer && !isAnswered ? (
														<View style={styles.fillBlankSlotClearBadge}>
															<Feather name="x" size={11} color={learning.selectedDark} />
														</View>
													) : null}
													<Text
														style={[
															styles.fillBlankSlotText,
															!typedAnswer ? styles.fillBlankSlotPlaceholderText : null,
															isAnswered && isCorrect ? styles.fillBlankSlotTextCorrect : null,
															isAnswered && !isCorrect
																? styles.fillBlankSlotTextIncorrect
																: null,
														]}
													>
														{selectedListeningOption?.label ?? (typedAnswer || "Tap what you heard")}
													</Text>
													{selectedListeningOption?.pronunciation ? (
														<Text
															style={[
																styles.fillBlankSlotHintText,
																isAnswered && isCorrect
																	? styles.fillBlankSlotHintTextCorrect
																	: null,
																isAnswered && !isCorrect
																	? styles.fillBlankSlotHintTextIncorrect
																	: null,
															]}
														>
															{selectedListeningOption.pronunciation}
														</Text>
													) : null}
													{!typedAnswer ? (
														<View style={styles.fillBlankSlotCue}>
															<View style={styles.fillBlankSlotCueDash} />
															<View style={styles.fillBlankSlotCueDashShort} />
														</View>
													) : null}
												</NativeTouchableOpacity>
											</NativeView>
										</Animated.View>
									) : (
										<Animated.View
											style={[
												styles.answerFeedbackWrap,
												isAnswered && typedAnswer ? answerFeedbackStyle : null,
											]}
										>
											<View
												style={[
													styles.listeningTextInputWrap,
													typedAnswer ? styles.listeningTextInputWrapActive : null,
													isAnswered
														? isCorrect
															? styles.listeningTextInputWrapCorrect
															: styles.listeningTextInputWrapIncorrect
														: null,
												]}
											>
												<View style={styles.listeningTextInputInner}>
													<View style={styles.listeningTextInputIcon}>
														<Feather
															name="type"
															size={15}
															color={typedAnswer ? learning.selectedDark : neutral.textSecondary}
														/>
													</View>
													<TextInput
														style={styles.listeningTextInput}
														placeholder="Type what you hear..."
														placeholderTextColor="#9CA3AF"
														value={typedAnswer}
														onChangeText={setTypedAnswer}
														editable={!isAnswered}
														autoCorrect={false}
													/>
												</View>

												{canRevealListeningWordBank ? (
													<TouchableOpacity
														onPress={() => setListeningWordBankVisible((prev) => !prev)}
														disabled={isAnswered}
														activeOpacity={0.8}
														style={styles.listeningHelpButton}
													>
														<Feather
															name={listeningWordBankVisible ? "eye-off" : "life-buoy"}
															size={14}
															color={learning.selectedDark}
														/>
														<Text style={styles.listeningHelpButtonText}>
															{listeningWordBankVisible ? "Hide word bank" : "I need help"}
														</Text>
													</TouchableOpacity>
												) : null}
											</View>
										</Animated.View>
									)}
								</View>

								{showListeningWordBank ? (
									<View style={styles.listeningWordBankSection}>
										<View style={styles.listeningWordBankHeader}>
											<View style={styles.listeningWordBankIcon}>
												<Feather name="grid" size={13} color={learning.selectedDark} />
											</View>
											<Text style={styles.listeningWordBankTitle}>
												{shouldUseListeningWordBank
													? "Choose what you heard"
													: "Tap a tile to fill the answer"}
											</Text>
										</View>
										<View style={styles.wordBankTileGrid}>
											{fillBlankOptions
												.filter((option) => option.value !== typedAnswer)
												.map((option) => (
													<FillBlankTile
														key={option.value}
														option={option}
														disabled={isAnswered}
														onSelect={handleSelectFillBlankOption}
														onDrop={
															shouldUseListeningWordBank
																? handleFillBlankTileDrop
																: handleSelectFillBlankOption
														}
													/>
												))}
										</View>
									</View>
								) : null}
							</View>
						)}
					</Animated.View>
				</ScrollView>

				<View
					style={[
						styles.exerciseBottomBar,
						!checkButtonDisabled && styles.exerciseBottomBarReady,
					]}
				>
					<View style={styles.exerciseBottomBarInner}>
						<View
							style={[
								styles.exerciseFooterStatus,
								footerIsReady ? styles.exerciseFooterStatusReady : null,
								feedbackVisible || isAnswered ? styles.exerciseFooterStatusChecked : null,
							]}
						>
							<View
								style={[
									styles.exerciseFooterStatusDot,
									footerIsReady ? styles.exerciseFooterStatusDotReady : null,
									feedbackVisible || isAnswered ? styles.exerciseFooterStatusDotChecked : null,
								]}
							>
								<Feather
									name={footerStatusIcon}
									size={12}
									color={footerStatusColor}
								/>
							</View>
							<Text
								style={[
									styles.exerciseFooterStatusText,
									{ color: footerStatusColor },
								]}
								numberOfLines={1}
							>
								{footerStatusText}
							</Text>
							<View style={styles.exerciseFooterStepPill}>
								<Text style={styles.exerciseFooterStepText}>
									{progressStepLabel}
								</Text>
							</View>
						</View>
						<Button3D
							onPress={handleCheckAnswer}
							disabled={checkButtonDisabled}
							variant={checkButtonDisabled ? "gray" : "primary"}
							size="lg"
							title="CHECK"
							style={styles.exerciseCheckButton}
							textStyle={styles.exerciseCheckButtonText}
						/>
					</View>
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
										: isMasterySession
										? "You are in the middle of a Master Challenge. Leaving now will lose all session progress."
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
		backgroundColor: "#F7FAFC",
	},
	scrollView: {
		flex: 1,
		backgroundColor: "#F7FAFC",
	},
	scrollContent: {
		flexGrow: 1,
		alignItems: "center",
		paddingHorizontal: 18,
		paddingTop: 12,
		paddingBottom: 28,
	},
	exerciseContentShell: {
		width: "100%",
		maxWidth: 460,
		flexGrow: 1,
	},
	resultScrollView: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	resultScrollContent: {
		flexGrow: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
		paddingVertical: 32,
		backgroundColor: "#FFFFFF",
	},
	resultCompletionScrollContent: {
		flexGrow: 1,
		alignItems: "center",
		justifyContent: "flex-start",
		paddingHorizontal: 18,
		paddingTop: 48,
		paddingBottom: 220,
		backgroundColor: "#FFFFFF",
	},
	completionMain: {
		width: "100%",
		maxWidth: 460,
		alignItems: "center",
	},
	completionIllustration: {
		width: 176,
		height: 176,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 4,
	},
	completionMascot: {
		width: 138,
		height: 138,
	},
	completionGround: {
		position: "absolute",
		bottom: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
	},
	completionGroundDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	completionSpark: {
		position: "absolute",
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#FFC800",
	},
	completionSparkLeft: {
		left: 22,
		top: 108,
	},
	completionSparkRight: {
		right: 18,
		top: 54,
		backgroundColor: "#58CC02",
	},
	completionSparkSmall: {
		position: "absolute",
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: "#1CB0F6",
	},
	completionSparkSmallLeft: {
		left: 44,
		top: 132,
	},
	completionSparkSmallRight: {
		right: 38,
		top: 126,
		backgroundColor: "#FF4B4B",
	},
	completionTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 22,
		lineHeight: 29,
		textAlign: "center",
		marginTop: 4,
		marginBottom: 14,
	},
	completionLevelPill: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#E1D9FF",
		backgroundColor: "#F5F2FF",
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 5,
		marginTop: -8,
		marginBottom: 14,
	},
	completionLevelText: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: "#6C4EF5",
		marginLeft: 5,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	completionMasteryPill: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#FFE8B3",
		backgroundColor: "#FFF8E1",
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginTop: -8,
		marginBottom: 14,
	},
	completionMasteryPillWarning: {
		borderColor: "#FFD49A",
		backgroundColor: "#FFF8E6",
	},
	completionMasteryPillText: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: "#A97800",
		marginLeft: 5,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	completionMasteryPillTextWarning: {
		color: "#A25700",
	},
	completionStatsRow: {
		width: "100%",
		maxWidth: 348,
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
	},
	completionStatCard: {
		flex: 1,
		minWidth: 0,
		borderWidth: 2,
		borderRadius: 8,
		overflow: "hidden",
		backgroundColor: "#FFFFFF",
	},
	completionStatLabel: {
		height: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	completionStatLabelText: {
		fontFamily: "Poppins-Bold",
		fontSize: 8,
		lineHeight: 10,
		color: "#FFFFFF",
		letterSpacing: 0.3,
	},
	completionStatValueBody: {
		minHeight: 52,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
		paddingVertical: 8,
	},
	completionStatValueRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
	},
	completionStatValue: {
		fontFamily: "Poppins-Bold",
		fontSize: 17,
		lineHeight: 22,
		fontVariant: ["tabular-nums"],
	},
	completionWarning: {
		width: "100%",
		maxWidth: 320,
		borderWidth: 1,
		borderColor: "#FFE8B3",
		backgroundColor: "#FFF8E6",
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginTop: 18,
	},
	completionWarningText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 12,
		lineHeight: 18,
		color: "#A25700",
		textAlign: "center",
	},
	completionInsightsWrap: {
		width: "100%",
		alignItems: "center",
		marginTop: 22,
	},
	completionButtonWrap: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 20,
		width: "100%",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderTopWidth: 1,
		borderTopColor: "#F0F1F4",
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: Platform.OS === "ios" ? 24 : 18,
		boxShadow: "0px -10px 24px rgba(13, 19, 43, 0.06)",
	},
	completionButtonInner: {
		width: "100%",
		maxWidth: 420,
		gap: 8,
	},
	completionTextButton: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
	},
	completionTextButtonLabel: {
		fontFamily: "Poppins-Bold",
		fontSize: 13,
		lineHeight: 18,
		color: neutral.textSecondary,
		letterSpacing: 0.6,
	},
	answerFeedbackWrap: {
		width: "100%",
	},
	answerFeedbackInlineWrap: {
		alignSelf: "center",
	},
	answerFeedbackFlexWrap: {
		flex: 1,
	},
	mcqList: {
		gap: 11,
	},
	mcqGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		columnGap: 10,
		rowGap: 10,
	},
	mcqGridItem: {
		width: "48%",
	},
	mcqCard: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1.5,
		borderBottomWidth: 4,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 20,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 15,
		paddingVertical: 12,
		minHeight: 68,
		overflow: "hidden",
		boxShadow: "0px 5px 14px rgba(13, 19, 43, 0.05)",
	},
	mcqCardGrid: {
		minHeight: 102,
		flexDirection: "column",
		alignItems: "flex-start",
		justifyContent: "center",
		paddingHorizontal: 13,
		paddingVertical: 13,
		borderRadius: 22,
	},
	mcqCardSelected: {
		borderColor: learning.selected,
		borderBottomColor: learning.selectedDark,
		backgroundColor: learning.selectedLight,
		transform: [{ translateY: -1 }],
		boxShadow: "0px 8px 18px rgba(28, 176, 246, 0.12)",
	},
	mcqCardCorrect: {
		borderColor: learning.action,
		borderBottomColor: learning.actionDark,
		backgroundColor: learning.actionLight,
		boxShadow: "0px 8px 18px rgba(88, 204, 2, 0.12)",
	},
	mcqCardIncorrect: {
		borderColor: learning.correction,
		borderBottomColor: learning.correctionDark,
		backgroundColor: learning.correctionLight,
		boxShadow: "0px 8px 18px rgba(255, 75, 75, 0.11)",
	},
	mcqCardAccent: {
		position: "absolute",
		left: 0,
		top: 14,
		bottom: 14,
		width: 4,
		borderTopRightRadius: 999,
		borderBottomRightRadius: 999,
		backgroundColor: learning.selected,
	},
	mcqCardAccentCorrect: {
		backgroundColor: learning.action,
	},
	mcqCardAccentIncorrect: {
		backgroundColor: learning.correction,
	},
	mcqOptionText: {
		flex: 1,
		color: neutral.textPrimary,
		fontFamily: "Poppins-SemiBold",
		fontSize: 15,
		lineHeight: 22,
	},
	mcqOptionTextGrid: {
		flex: 0,
		width: "100%",
		fontSize: 14,
		lineHeight: 20,
		marginTop: 8,
	},
	mcqOptionTextSelected: {
		color: learning.selectedDark,
	},
	mcqOptionTextCorrect: {
		color: learning.actionDark,
	},
	mcqOptionTextIncorrect: {
		color: learning.correctionDark,
	},
	optionLetterBadge: {
		width: 31,
		height: 31,
		borderRadius: 15.5,
		backgroundColor: "#F7FAFC",
		borderWidth: 1.5,
		borderColor: "#E2E7EF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 13,
	},
	optionLetterBadgeGrid: {
		width: 29,
		height: 29,
		borderRadius: 14.5,
		marginRight: 0,
	},
	optionLetterBadgeSelected: {
		backgroundColor: learning.selected,
		borderColor: learning.selectedDark,
	},
	optionLetterBadgeCorrect: {
		backgroundColor: learning.action,
		borderColor: learning.actionDark,
	},
	optionLetterBadgeIncorrect: {
		backgroundColor: learning.correction,
		borderColor: learning.correctionDark,
	},
	optionLetterText: {
		color: neutral.textSecondary,
		fontFamily: "Poppins-Bold",
		fontSize: 13,
	},
	optionLetterTextSelected: {
		color: "#FFFFFF",
	},
	optionLetterTextActive: {
		color: "#FFFFFF",
	},
	optionResultIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 10,
	},
	optionResultIconGrid: {
		position: "absolute",
		top: 10,
		right: 10,
		marginLeft: 0,
	},
	optionResultIconCorrect: {
		backgroundColor: learning.action,
		borderColor: learning.actionDark,
	},
	optionResultIconIncorrect: {
		backgroundColor: learning.correction,
		borderColor: learning.correctionDark,
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
	audioPanelTopRow: {
		position: "absolute",
		top: 12,
		left: 12,
		right: 12,
		zIndex: 2,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	audioPanelEyebrow: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		color: neutral.textSecondary,
		textTransform: "uppercase",
		letterSpacing: 0.55,
	},
	audioPanelHintPill: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "rgba(88, 204, 2, 0.22)",
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 4,
	},
	audioPanelHintText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 13,
		color: learning.actionDark,
	},
	listeningCard: {
		width: "100%",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		borderRadius: 26,
		padding: 16,
		alignItems: "center",
		boxShadow: "0px 8px 22px rgba(13, 19, 43, 0.06)",
	},
	speakingCard: {
		width: "100%",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		borderRadius: 26,
		padding: 16,
		alignItems: "center",
		boxShadow: "0px 8px 22px rgba(13, 19, 43, 0.06)",
	},
	listeningAudioPanel: {
		width: "100%",
		minHeight: 128,
		borderWidth: 1,
		borderColor: "#DDF4FF",
		borderRadius: 24,
		backgroundColor: "#F4FBFF",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
		overflow: "hidden",
	},
	speakingAudioPanel: {
		width: "100%",
		minHeight: 128,
		borderWidth: 1,
		borderColor: "rgba(88, 204, 2, 0.22)",
		borderRadius: 24,
		backgroundColor: "#F6FFF0",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
		overflow: "hidden",
	},
	listeningWaveformTrack: {
		position: "absolute",
		left: 18,
		right: 18,
		top: 0,
		bottom: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
		opacity: 0.55,
	},
	listeningWaveformBar: {
		width: 6,
		borderRadius: 999,
		backgroundColor: "#9DE2FF",
	},
	speakingWaveformTrack: {
		position: "absolute",
		left: 18,
		right: 18,
		top: 0,
		bottom: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
		opacity: 0.58,
	},
	speakingWaveformBar: {
		width: 6,
		borderRadius: 999,
		backgroundColor: "#A6EB7A",
	},
	listeningPlayButton: {
		width: 76,
		height: 76,
		borderRadius: 38,
		backgroundColor: brand.primary,
		borderWidth: 5,
		borderColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 10px 22px rgba(108, 78, 245, 0.24)",
	},
	speakingPlayButton: {
		width: 76,
		height: 76,
		borderRadius: 38,
		backgroundColor: learning.action,
		borderWidth: 5,
		borderColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 10px 22px rgba(88, 204, 2, 0.24)",
	},
	listeningReplayPill: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#BDEAFF",
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 4,
	},
	listeningReplayText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 13,
		color: learning.selectedDark,
	},
	listeningPromptPill: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 999,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		paddingHorizontal: 12,
		paddingVertical: 7,
		marginBottom: 16,
	},
	listeningPromptText: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: learning.selectedDark,
		textTransform: "uppercase",
		letterSpacing: 0.45,
		marginLeft: 6,
	},
	listeningAnswerPanel: {
		width: "100%",
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 22,
		padding: 12,
		marginBottom: 14,
	},
	listeningAnswerHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	listeningAnswerHeaderIcon: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	listeningAnswerTitle: {
		flex: 1,
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: neutral.textPrimary,
	},
	listeningAnswerStatusPill: {
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	listeningAnswerStatusPillReady: {
		backgroundColor: learning.selectedLight,
		borderColor: "#BDEAFF",
	},
	listeningAnswerStatusText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 13,
		color: neutral.textSecondary,
	},
	listeningAnswerStatusTextReady: {
		color: learning.selectedDark,
	},
	speakingInstructionPill: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 999,
		backgroundColor: "#F6FFF0",
		borderWidth: 1,
		borderColor: "rgba(88, 204, 2, 0.22)",
		paddingHorizontal: 12,
		paddingVertical: 7,
		marginBottom: 16,
	},
	speakingInstructionText: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: learning.actionDark,
		textTransform: "uppercase",
		letterSpacing: 0.45,
		marginLeft: 6,
	},
	speakingPhraseCard: {
		width: "100%",
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderBottomWidth: 3,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 18,
		alignItems: "center",
		marginBottom: 14,
	},
	speakingPhraseText: {
		fontFamily: "Poppins-Bold",
		fontSize: 22,
		lineHeight: 30,
		color: neutral.textPrimary,
		textAlign: "center",
	},
	speakingPronunciationText: {
		fontFamily: "Poppins-Bold",
		fontSize: 13,
		lineHeight: 18,
		color: learning.selectedDark,
		textAlign: "center",
		marginTop: 5,
	},
	speakingTranslationText: {
		fontFamily: "Poppins-Regular",
		fontSize: 12,
		lineHeight: 17,
		color: neutral.textSecondary,
		textAlign: "center",
		marginTop: 5,
	},
	speakingPracticePanel: {
		width: "100%",
		backgroundColor: "#F4FBFF",
		borderWidth: 1,
		borderColor: "#DDF4FF",
		borderRadius: 20,
		padding: 14,
		marginBottom: 14,
	},
	speakingPracticeHeader: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#DDF4FF",
		borderRadius: 17,
		paddingHorizontal: 10,
		paddingVertical: 9,
		marginBottom: 12,
	},
	speakingPracticeHeaderIcon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: learning.actionLight,
		borderWidth: 1,
		borderColor: "rgba(88, 204, 2, 0.22)",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 9,
	},
	speakingPracticeHeaderCopy: {
		flex: 1,
		minWidth: 0,
	},
	speakingPracticeTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: neutral.textPrimary,
	},
	speakingPracticeSubtitle: {
		fontFamily: "Poppins-Medium",
		fontSize: 10.5,
		lineHeight: 15,
		color: neutral.textSecondary,
		marginTop: 1,
	},
	speakingPracticeStatusPill: {
		borderRadius: 999,
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		paddingHorizontal: 8,
		paddingVertical: 3,
		marginLeft: 8,
	},
	speakingPracticeStatusPillRecording: {
		backgroundColor: learning.correctionLight,
		borderColor: "#FFB8B8",
	},
	speakingPracticeStatusPillReady: {
		backgroundColor: learning.selectedLight,
		borderColor: "#BDEAFF",
	},
	speakingPracticeStatusPillScored: {
		backgroundColor: learning.actionLight,
		borderColor: "rgba(88, 204, 2, 0.24)",
	},
	speakingPracticeStatusText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 13,
		color: neutral.textSecondary,
	},
	speakingPracticeStatusTextRecording: {
		color: learning.correctionDark,
	},
	speakingPracticeStatusTextReady: {
		color: learning.selectedDark,
	},
	speakingPracticeStatusTextScored: {
		color: learning.actionDark,
	},
	speakingControlsRow: {
		flexDirection: "row",
		gap: 10,
	},
	speakingControlButton: {
		flex: 1,
		minHeight: 48,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		paddingHorizontal: 10,
	},
	speakingRecordButton: {
		backgroundColor: learning.selected,
	},
	speakingRecordButtonActive: {
		backgroundColor: learning.correction,
	},
	speakingScoreButton: {
		backgroundColor: learning.action,
	},
	speakingScoreButtonDisabled: {
		backgroundColor: "#D1D5DB",
	},
	speakingControlButtonDisabled: {
		opacity: 0.6,
	},
	speakingControlButtonText: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: "#FFFFFF",
		marginLeft: 7,
	},
	speakingStatusText: {
		flex: 1,
		fontFamily: "Poppins-Regular",
		fontSize: 12,
		lineHeight: 17,
		color: neutral.textSecondary,
		textAlign: "left",
	},
	speakingRecordingText: {
		fontFamily: "Poppins-SemiBold",
		color: learning.correction,
		textAlign: "center",
	},
	speakingReadyText: {
		fontFamily: "Poppins-SemiBold",
		color: learning.selectedDark,
	},
	speakingPromptState: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#DDF4FF",
		borderRadius: 15,
		paddingHorizontal: 11,
		paddingVertical: 10,
		marginTop: 12,
		gap: 8,
	},
	speakingRecordingState: {
		width: "100%",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#FFD1D1",
		borderRadius: 15,
		paddingHorizontal: 12,
		paddingVertical: 11,
		marginTop: 12,
	},
	speakingRecordingWave: {
		height: 38,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
		marginBottom: 8,
	},
	speakingRecordingWaveBar: {
		width: 5,
		borderRadius: 999,
		backgroundColor: learning.correction,
		opacity: 0.72,
	},
	speakingScoreWrap: {
		width: "100%",
		alignItems: "center",
		marginTop: 12,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "rgba(88, 204, 2, 0.22)",
		borderRadius: 17,
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	speakingScoreText: {
		fontFamily: "Poppins-Bold",
		fontSize: 22,
		lineHeight: 29,
	},
	speakingBestText: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: learning.selectedDark,
		marginTop: 1,
	},
	speakingScoreStatusText: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 17,
		textAlign: "center",
		marginTop: 3,
	},
	speakingTipText: {
		fontFamily: "Poppins-Regular",
		fontSize: 12,
		lineHeight: 17,
		color: neutral.textSecondary,
		textAlign: "center",
		marginTop: 4,
	},
	speakingScoreMetricsRow: {
		width: "100%",
		flexDirection: "row",
		gap: 8,
		marginTop: 10,
	},
	speakingScoreMetricCard: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#E8EAF0",
		borderRadius: 13,
		backgroundColor: "#FAFBFD",
		paddingHorizontal: 10,
		paddingVertical: 8,
		alignItems: "center",
	},
	speakingScoreMetricLabel: {
		fontFamily: "Poppins-Bold",
		fontSize: 9,
		lineHeight: 12,
		color: neutral.textSecondary,
		textTransform: "uppercase",
		letterSpacing: 0.35,
	},
	speakingScoreMetricValue: {
		fontFamily: "Poppins-Bold",
		fontSize: 15,
		lineHeight: 20,
		color: learning.actionDark,
		marginTop: 1,
	},
	speakingErrorText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 12,
		lineHeight: 17,
		color: learning.correction,
		textAlign: "center",
		marginTop: 8,
	},
	speakingActionRow: {
		width: "100%",
		flexDirection: "row",
		gap: 10,
	},
	speakingActionButton: {
		flex: 1,
		minHeight: 48,
		borderRadius: 16,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		paddingHorizontal: 10,
	},
	speakingActionButtonDisabled: {
		opacity: 0.68,
	},
	speakingRetryButton: {
		borderColor: "#BDEAFF",
		backgroundColor: "#F4FBFF",
	},
	speakingRetryButtonText: {
		color: learning.selectedDark,
	},
	speakingConfirmButton: {
		borderColor: neutral.border,
		backgroundColor: "#FFFFFF",
	},
	speakingConfirmButtonSelected: {
		borderColor: learning.action,
		backgroundColor: learning.actionLight,
	},
	speakingActionButtonText: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		marginLeft: 7,
	},
	speakingConfirmButtonText: {
		color: neutral.textSecondary,
	},
	speakingConfirmButtonTextSelected: {
		color: learning.actionDark,
	},
	listeningTextInputWrap: {
		width: "100%",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
		borderBottomWidth: 3,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 18,
		padding: 10,
		boxShadow: "0px 5px 12px rgba(13, 19, 43, 0.045)",
	},
	listeningTextInputWrapActive: {
		borderColor: learning.selected,
		borderBottomColor: learning.selectedDark,
		backgroundColor: "#FFFFFF",
	},
	listeningTextInputWrapCorrect: {
		borderColor: learning.action,
		borderBottomColor: learning.actionDark,
		backgroundColor: learning.actionLight,
	},
	listeningTextInputWrapIncorrect: {
		borderColor: learning.correction,
		borderBottomColor: learning.correctionDark,
		backgroundColor: learning.correctionLight,
	},
	listeningTextInputInner: {
		width: "100%",
		minHeight: 50,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 15,
		paddingHorizontal: 10,
	},
	listeningTextInputIcon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	listeningTextInput: {
		flex: 1,
		minHeight: 48,
		fontFamily: "Poppins-SemiBold",
		fontSize: 15,
		lineHeight: 21,
		color: neutral.textPrimary,
		paddingVertical: 0,
		textAlign: "left",
	},
	listeningHelpButton: {
		marginTop: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		backgroundColor: "#F4FBFF",
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	listeningHelpButtonText: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: learning.selectedDark,
		marginLeft: 6,
	},
	listeningWordBankSection: {
		width: "100%",
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 22,
		paddingHorizontal: 10,
		paddingTop: 12,
		paddingBottom: 14,
		marginTop: 2,
	},
	listeningWordBankHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	listeningWordBankIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 7,
	},
	listeningWordBankTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: learning.selectedDark,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		textAlign: "center",
	},
	fillBlankSlot: {
		minWidth: 156,
		minHeight: 64,
		borderWidth: 1.5,
		borderBottomWidth: 3,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 5px 12px rgba(13, 19, 43, 0.045)",
	},
	fillBlankSlotActive: {
		borderColor: learning.selected,
		borderBottomColor: learning.selectedDark,
		backgroundColor: learning.selectedLight,
	},
	fillBlankSlotCorrect: {
		borderColor: learning.action,
		borderBottomColor: learning.actionDark,
		backgroundColor: learning.actionLight,
	},
	fillBlankSlotIncorrect: {
		borderColor: learning.correction,
		borderBottomColor: learning.correctionDark,
		backgroundColor: learning.correctionLight,
	},
	fillBlankCanvas: {
		width: "100%",
		backgroundColor: "transparent",
		paddingTop: 0,
		paddingBottom: 4,
	},
	fillBlankSentenceRow: {
		minHeight: 142,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		flexWrap: "wrap",
		gap: 10,
		paddingHorizontal: 12,
		paddingVertical: 26,
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 24,
		backgroundColor: "#FFFFFF",
		boxShadow: "0px 8px 20px rgba(13, 19, 43, 0.045)",
	},
	fillBlankWordBankSection: {
		paddingTop: 17,
	},
	fillBlankWordBankHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 11,
	},
	fillBlankWordBankIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 7,
	},
	fillBlankWordBankTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: learning.selectedDark,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		textAlign: "center",
	},
	fillBlankWordBankPanel: {
		width: "100%",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 22,
		backgroundColor: "#FAFBFD",
		paddingHorizontal: 10,
		paddingVertical: 14,
	},
	listeningAnswerSlot: {
		width: "100%",
		minHeight: 76,
		borderWidth: 1.5,
		borderBottomWidth: 3,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 20,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 5px 12px rgba(13, 19, 43, 0.045)",
	},
	fillBlankSlotPressable: {
		width: "100%",
		minHeight: 62,
		paddingHorizontal: 16,
		paddingVertical: 11,
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	fillBlankSlotPressableFilled: {
		paddingLeft: 26,
		paddingRight: 26,
	},
	fillBlankSlotClearBadge: {
		position: "absolute",
		top: 7,
		right: 8,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
	},
	fillBlankSlotText: {
		fontFamily: "Poppins-Bold",
		fontSize: 18,
		lineHeight: 24,
		color: neutral.textPrimary,
		textAlign: "center",
	},
	fillBlankSlotPlaceholderText: {
		color: neutral.textSecondary,
		fontSize: 15,
		lineHeight: 21,
	},
	fillBlankSlotTextCorrect: {
		color: learning.actionDark,
	},
	fillBlankSlotTextIncorrect: {
		color: learning.correctionDark,
	},
	fillBlankSlotHintText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 11,
		lineHeight: 15,
		color: neutral.textSecondary,
		textAlign: "center",
		marginTop: 2,
	},
	fillBlankSlotHintTextCorrect: {
		color: learning.actionDark,
	},
	fillBlankSlotHintTextIncorrect: {
		color: learning.correctionDark,
	},
	fillBlankSlotCue: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		marginTop: 7,
	},
	fillBlankSlotCueDash: {
		width: 28,
		height: 3,
		borderRadius: 999,
		backgroundColor: "#D7DEE8",
	},
	fillBlankSlotCueDashShort: {
		width: 16,
		height: 3,
		borderRadius: 999,
		backgroundColor: "#E2E8F0",
	},
	fillBlankTile: {
		minWidth: 64,
		maxWidth: 190,
		zIndex: 1,
	},
	fillBlankTileDragging: {
		zIndex: 10,
		opacity: 0.98,
	},
	fillBlankTilePressable: {
		minHeight: 46,
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderWidth: 1.5,
		borderBottomWidth: 3,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 15,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 4px 10px rgba(13, 19, 43, 0.045)",
	},
	fillBlankTilePressableDragging: {
		borderColor: learning.selected,
		borderBottomColor: learning.selectedDark,
		backgroundColor: learning.selectedLight,
		transform: [{ translateY: -2 }],
	},
	fillBlankTilePressableDisabled: {
		opacity: 0.72,
	},
	wordBankTileGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "center",
		gap: 9,
		paddingHorizontal: 4,
	},
	wordBankTileText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 14,
		lineHeight: 19,
		color: neutral.textPrimary,
		textAlign: "center",
	},
	wordBankTileTextSelected: {
		color: learning.selectedDark,
	},
	wordBankTileHint: {
		fontFamily: "Poppins-Medium",
		fontSize: 9.5,
		lineHeight: 13,
		color: neutral.textSecondary,
		textAlign: "center",
		marginTop: 1,
	},
	wordBankTileHintSelected: {
		color: "#116FA3",
	},
	matchingPairsShell: {
		width: "100%",
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 24,
		padding: 12,
		boxShadow: "0px 6px 16px rgba(13, 19, 43, 0.045)",
	},
	matchingPairsHeader: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 18,
		paddingHorizontal: 10,
		paddingVertical: 9,
		marginBottom: 12,
	},
	matchingPairsHeaderIcon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 9,
	},
	matchingPairsHeaderCopy: {
		flex: 1,
		minWidth: 0,
	},
	matchingPairsHeaderTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: neutral.textPrimary,
	},
	matchingPairsHeaderSubtitle: {
		fontFamily: "Poppins-Medium",
		fontSize: 11,
		lineHeight: 15,
		color: neutral.textSecondary,
		marginTop: 1,
	},
	matchingPairsProgressDots: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginLeft: 8,
	},
	matchingPairsProgressDot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		backgroundColor: "#D7DEE8",
	},
	matchingPairsProgressDotDone: {
		width: 13,
		backgroundColor: learning.action,
	},
	matchingPairsGrid: {
		width: "100%",
		flexDirection: "row",
		alignItems: "stretch",
		gap: 11,
	},
	matchingPairsColumn: {
		flex: 1,
		gap: 11,
	},
	matchingPairCard: {
		minHeight: 66,
		borderWidth: 1.5,
		borderBottomWidth: 4,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 11,
		paddingVertical: 10,
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
		overflow: "hidden",
		boxShadow: "0px 5px 14px rgba(13, 19, 43, 0.055)",
	},
	matchingPairCardSelected: {
		borderColor: learning.selected,
		borderBottomColor: learning.selectedDark,
		backgroundColor: learning.selectedLight,
		transform: [{ translateY: -1 }],
		boxShadow: "0px 8px 18px rgba(28, 176, 246, 0.12)",
	},
	matchingPairCardMatched: {
		borderColor: learning.action,
		borderBottomColor: learning.actionDark,
		backgroundColor: learning.actionLight,
		boxShadow: "0px 8px 18px rgba(88, 204, 2, 0.12)",
	},
	matchingPairCardMismatched: {
		borderColor: learning.correction,
		borderBottomColor: learning.correctionDark,
		backgroundColor: learning.correctionLight,
		boxShadow: "0px 8px 18px rgba(255, 75, 75, 0.11)",
	},
	matchingPairCardDisabled: {
		opacity: 0.86,
	},
	matchingPairContent: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
	matchingPairText: {
		flexShrink: 1,
		fontFamily: "Poppins-SemiBold",
		fontSize: 13.5,
		lineHeight: 19,
		color: neutral.textPrimary,
		textAlign: "center",
	},
	matchingPairTextSelected: {
		color: learning.selectedDark,
	},
	matchingPairTextMatched: {
		color: learning.actionDark,
	},
	matchingPairTextMismatched: {
		color: learning.correctionDark,
	},
	matchingPairStatusIconMatched: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: learning.action,
		borderWidth: 1,
		borderColor: learning.actionDark,
		alignItems: "center",
		justifyContent: "center",
	},
	matchingPairStatusIconMismatched: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: learning.correction,
		borderWidth: 1,
		borderColor: learning.correctionDark,
		alignItems: "center",
		justifyContent: "center",
	},
	matchingPairSparkle: {
		position: "absolute",
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: "rgba(88, 204, 2, 0.35)",
	},
	matchingPairSparkleTop: {
		top: 10,
		right: 12,
	},
	matchingPairSparkleBottom: {
		right: 25,
		bottom: 13,
		backgroundColor: "rgba(88, 204, 2, 0.22)",
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
	sessionTopBar: {
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 6,
		alignItems: "center",
	},
	sessionTopBarInner: {
		width: "100%",
		maxWidth: 468,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "transparent",
		borderRadius: 0,
		paddingHorizontal: 0,
		paddingVertical: 2,
		minHeight: 42,
	},
	quitButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	progressGroup: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		marginRight: 8,
		minWidth: 0,
	},
	progressTrack: {
		height: 8,
		backgroundColor: "#E8EAF0",
		borderRadius: 999,
		flex: 1,
		marginRight: 8,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		backgroundColor: learning.action,
		borderRadius: 999,
	},
	progressStepText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		color: neutral.textSecondary,
		minWidth: 34,
		textAlign: "center",
		fontVariant: ["tabular-nums"],
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 999,
		paddingHorizontal: 7,
		paddingVertical: 3,
	},
	sessionRightGroup: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		flexShrink: 0,
	},
	heartsPill: {
		minHeight: 30,
		borderRadius: 999,
		backgroundColor: "#FFF7F7",
		borderWidth: 1,
		borderColor: "#FFE0E0",
		paddingHorizontal: 6,
		paddingVertical: 4,
		justifyContent: "center",
	},
	heartsRow: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 0,
	},
	heartText: {
		fontSize: 15,
		lineHeight: 18,
	},
	sessionStatusPill: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
		minHeight: 30,
		maxWidth: 96,
	},
	sessionStatusPillXp: {
		backgroundColor: "#FFF8E6",
		borderColor: "#FFE8B3",
	},
	sessionStatusPillGold: {
		backgroundColor: learning.rewardLight,
		borderColor: "#FFE49A",
	},
	sessionStatusPillReview: {
		backgroundColor: learning.selectedLight,
		borderColor: "#BDEAFF",
	},
	sessionStatusText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 13,
		marginLeft: 4,
		flexShrink: 1,
	},
	questionCard: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 26,
		paddingHorizontal: 14,
		paddingTop: 13,
		paddingBottom: 15,
		marginBottom: 15,
		boxShadow: "0px 8px 22px rgba(13, 19, 43, 0.055)",
	},
	questionMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		marginBottom: 10,
	},
	modePill: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 6,
		flexShrink: 1,
		maxWidth: "72%",
	},
	modePillDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 6,
	},
	modePillText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		textTransform: "uppercase",
		letterSpacing: 0.45,
		flexShrink: 1,
	},
	difficultyPill: {
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		paddingHorizontal: 9,
		paddingVertical: 5,
		flexShrink: 0,
	},
	difficultyPillText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 14,
		textTransform: "uppercase",
		letterSpacing: 0.45,
	},
	questionTaskRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	questionTaskIcon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 9,
	},
	questionTaskText: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: neutral.textSecondary,
		textTransform: "uppercase",
		letterSpacing: 0.55,
		flexShrink: 0,
		maxWidth: "58%",
	},
	questionTaskLine: {
		flex: 1,
		height: 2,
		borderRadius: 999,
		backgroundColor: "#EEF1F6",
		marginLeft: 10,
	},
	questionTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 22,
		lineHeight: 30,
		color: neutral.textPrimary,
		marginTop: 0,
		letterSpacing: 0,
	},
	questionTitleDivider: {
		height: 3,
		backgroundColor: "#EEF1F6",
		borderRadius: 999,
		marginTop: 17,
		overflow: "hidden",
	},
	questionTitleDividerAccent: {
		width: 54,
		height: "100%",
		borderRadius: 999,
	},
	exerciseHintCard: {
		marginTop: -6,
		marginBottom: 15,
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderBottomWidth: 3,
		borderBottomColor: "#E0E7EF",
		borderRadius: 20,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 12,
		paddingVertical: 10,
		boxShadow: "0 5px 12px rgba(15, 23, 42, 0.05)",
	},
	exerciseHintCardExpanded: {
		backgroundColor: "#FBFDFF",
		borderColor: "#BDEAFF",
		borderBottomColor: "#8BDFFF",
	},
	exerciseHintHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},
	exerciseHintIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#DDF4FF",
		backgroundColor: "#F4FBFF",
		alignItems: "center",
		justifyContent: "center",
	},
	exerciseHintTitleWrap: {
		flex: 1,
		minWidth: 0,
	},
	exerciseHintEyebrow: {
		fontFamily: "Poppins-Bold",
		fontSize: 9,
		lineHeight: 12,
		color: learning.selectedDark,
		textTransform: "uppercase",
		letterSpacing: 0.55,
	},
	exerciseHintTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 13,
		lineHeight: 18,
		color: neutral.textPrimary,
	},
	exerciseHintChevron: {
		width: 26,
		height: 26,
		borderRadius: 13,
		borderWidth: 1,
		borderColor: "#EEF1F6",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F9FAFB",
	},
	exerciseHintChevronExpanded: {
		borderColor: "#BDEAFF",
		backgroundColor: "#F4FBFF",
	},
	exerciseHintBody: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "#EEF1F6",
	},
	exerciseHintTipRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 8,
		borderRadius: 14,
		backgroundColor: "#F4FBFF",
		borderWidth: 1,
		borderColor: "#DDF4FF",
		paddingHorizontal: 10,
		paddingVertical: 9,
	},
	exerciseHintTipAccent: {
		width: 6,
		height: 6,
		borderRadius: 999,
		backgroundColor: learning.selected,
		marginTop: 6,
	},
	exerciseHintTip: {
		flex: 1,
		fontFamily: "Poppins-Medium",
		fontSize: 12,
		lineHeight: 19,
		color: neutral.textSecondary,
	},
	exerciseHintExample: {
		alignSelf: "flex-start",
		marginTop: 9,
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E7EB",
		paddingHorizontal: 12,
		paddingVertical: 7,
	},
	exerciseHintExampleLabel: {
		fontFamily: "Poppins-Bold",
		fontSize: 9,
		lineHeight: 12,
		color: neutral.textSecondary,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	exerciseHintExampleText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 12,
		lineHeight: 17,
		color: neutral.textPrimary,
		marginTop: 1,
	},
	questionPromptScene: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 12,
		minHeight: 104,
		paddingBottom: 0,
	},
	questionPromptMascot: {
		width: 82,
		height: 98,
		marginRight: 8,
		marginLeft: -4,
	},
	questionPromptBubble: {
		flex: 1,
		minHeight: 74,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
		borderBottomWidth: 4,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		position: "relative",
		boxShadow: "0px 7px 16px rgba(13, 19, 43, 0.06)",
	},
	questionPromptBubbleTail: {
		position: "absolute",
		left: -8,
		top: 29,
		width: 16,
		height: 16,
		backgroundColor: "#FFFFFF",
		borderLeftWidth: 1.5,
		borderBottomWidth: 1.5,
		borderColor: "#E8EAF0",
		transform: [{ rotate: "45deg" }],
	},
	questionPromptAudioButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#DDF4FF",
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	questionPromptBubbleText: {
		flex: 1,
		fontFamily: "Poppins-SemiBold",
		fontSize: 16,
		lineHeight: 23,
		color: neutral.textPrimary,
	},
	tapWordExerciseShell: {
		width: "100%",
		gap: 14,
	},
	tapWordAnswerBoard: {
		minHeight: 166,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
		paddingHorizontal: 12,
		paddingTop: 14,
		paddingBottom: 16,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 24,
		overflow: "hidden",
		boxShadow: "0px 7px 18px rgba(13, 19, 43, 0.045)",
	},
	tapWordBoardHeader: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 17,
		zIndex: 1,
	},
	tapWordBoardIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	tapWordBoardTitle: {
		flex: 1,
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 16,
		color: neutral.textPrimary,
	},
	tapWordBoardCount: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: learning.selectedDark,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	tapWordSlotRow: {
		width: "100%",
		minHeight: 74,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		zIndex: 1,
	},
	tapWordEmptyState: {
		alignItems: "center",
		justifyContent: "center",
	},
	tapWordEmptySlotRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	tapWordEmptySlot: {
		width: 50,
		height: 32,
		borderRadius: 12,
		backgroundColor: "#E3E8EF",
		borderWidth: 1,
		borderColor: "#D7DEE8",
	},
	tapWordEmptyHint: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 11,
		lineHeight: 15,
		color: neutral.textSecondary,
		marginTop: 9,
	},
	tapWordBankPanel: {
		width: "100%",
		backgroundColor: "#FAFBFD",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		borderRadius: 22,
		paddingHorizontal: 10,
		paddingTop: 12,
		paddingBottom: 14,
	},
	tapWordBankHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	tapWordBankIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 7,
	},
	tapWordBankTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		color: learning.selectedDark,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	tapWordTileGrid: {
		paddingHorizontal: 2,
	},
	tapWordOptionTile: {
		minHeight: 46,
		minWidth: 54,
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderWidth: 1.5,
		borderBottomWidth: 4,
		borderColor: "#E8EAF0",
		borderBottomColor: "#D6DAE2",
		borderRadius: 14,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 4px 12px rgba(13, 19, 43, 0.05)",
	},
	tapWordOptionTileDisabled: {
		opacity: 0.6,
	},
	tapWordSelectedTile: {
		minHeight: 48,
		minWidth: 60,
		paddingHorizontal: 16,
		paddingVertical: 9,
		borderWidth: 1.5,
		borderBottomWidth: 4,
		borderColor: learning.selected,
		borderBottomColor: learning.selectedDark,
		borderRadius: 14,
		backgroundColor: learning.selectedLight,
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 4px 12px rgba(13, 19, 43, 0.05)",
	},
	tapWordSelectedClearBadge: {
		position: "absolute",
		top: -7,
		right: -7,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 2,
	},
	tapWordSelectedTileCorrect: {
		borderColor: learning.action,
		borderBottomColor: learning.actionDark,
		backgroundColor: learning.actionLight,
	},
	tapWordSelectedTileIncorrect: {
		borderColor: learning.correction,
		borderBottomColor: learning.correctionDark,
		backgroundColor: learning.correctionLight,
	},
	answerGuideLine: {
		position: "absolute",
		left: 14,
		right: 14,
		height: 1,
		backgroundColor: "#E8EAF0",
	},
	answerGuideLineTop: {
		top: 62,
	},
	answerGuideLineMiddle: {
		top: 105,
	},
	answerGuideLineBottom: {
		top: 148,
	},
	exerciseBottomBar: {
		backgroundColor: "#FFFFFF",
		borderTopWidth: 1,
		borderTopColor: "#EEF1F6",
		paddingHorizontal: 18,
		paddingTop: 10,
		paddingBottom: Platform.OS === "ios" ? 24 : 17,
		minHeight: Platform.OS === "ios" ? 112 : 106,
		alignItems: "center",
		boxShadow: "0px -12px 28px rgba(13, 19, 43, 0.07)",
	},
	exerciseBottomBarReady: {
		borderTopColor: "rgba(88, 204, 2, 0.34)",
		boxShadow: "0px -12px 26px rgba(88, 204, 2, 0.09)",
	},
	exerciseBottomBarInner: {
		width: "100%",
		maxWidth: 430,
		paddingHorizontal: 2,
	},
	exerciseFooterStatus: {
		minHeight: 34,
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#EEF1F6",
		backgroundColor: "#FAFBFD",
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 5,
		marginBottom: 9,
	},
	exerciseFooterStatusReady: {
		borderColor: "rgba(88, 204, 2, 0.26)",
		backgroundColor: "#F6FFF0",
	},
	exerciseFooterStatusChecked: {
		borderColor: "#BDEAFF",
		backgroundColor: learning.selectedLight,
	},
	exerciseFooterStatusDot: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	exerciseFooterStatusDotReady: {
		borderColor: "rgba(88, 204, 2, 0.26)",
		backgroundColor: learning.actionLight,
	},
	exerciseFooterStatusDotChecked: {
		borderColor: "#BDEAFF",
		backgroundColor: "#FFFFFF",
	},
	exerciseFooterStatusText: {
		flex: 1,
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		textTransform: "uppercase",
		letterSpacing: 0.45,
	},
	exerciseFooterStepPill: {
		minWidth: 42,
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		paddingHorizontal: 8,
		paddingVertical: 3,
		alignItems: "center",
	},
	exerciseFooterStepText: {
		fontFamily: "Poppins-Bold",
		fontSize: 10,
		lineHeight: 13,
		color: neutral.textSecondary,
		fontVariant: ["tabular-nums"],
	},
	exerciseCheckButton: {
		marginTop: 0,
	},
	exerciseCheckButtonText: {
		fontSize: 14,
		lineHeight: 19,
		letterSpacing: 0.8,
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
