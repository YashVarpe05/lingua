import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllLessonsFromData } from "@/data/lessons";
import {
	ConceptMemoryEntry,
	DifficultyMemoryEntry,
	ExerciseAttempt,
	FocusedConceptReviewInput,
	PronunciationAttemptInput,
	PronunciationMemoryEntry,
} from "@/types/learning";
import {
	FOCUSED_REVIEW_PASS_SCORE,
	hasFreshSuccessfulFocusedReview,
} from "@/utils/conceptReview";
import {
	applyLearningSessionCompletion,
	calculateLevel,
	getTodayStr,
	getYesterdayStr,
	type CompleteLearningSessionInput,
	type LearningSessionResult,
	type LessonMemoryEntry,
} from "@/utils/progressSession";

export type {
	CompleteLearningSessionInput,
	LearningSessionResult,
	LearningSessionType,
	LessonMemoryEntry,
} from "@/utils/progressSession";

export interface CheckpointRecoveryReview {
	unitId: string;
	focusConceptIds: string[];
	score: number;
	createdAt: number;
}

export interface ProgressState {
	completedLessons: string[]; // Keep for backward compatibility
	completedLessonIds: string[]; // List of completed lesson IDs
	_hasHydrated: boolean;
	xp: number;
	todayXP: number; // XP earned today (resets at midnight)
	streak: number;
	lastActiveDate: string | null;
	dailyChallengeCompletedDate: string | null;
	level: number;
	dailyLessons: Record<string, string[]>;
	recentMistakes: string[]; // List of exercise IDs the user got incorrect
	completedCheckpoints: string[]; // List of unit IDs where the checkpoint was passed
	dismissedCheckpointUnlocks: string[]; // Completed checkpoints whose unlock banner was already seen
	latestFailedCheckpointReview: CheckpointRecoveryReview | null;
	lessonMemory: Record<string, LessonMemoryEntry>;
	recentAttempts: ExerciseAttempt[];
	conceptMemory: Record<string, ConceptMemoryEntry>;
	exerciseDifficultyMemory: Record<string, DifficultyMemoryEntry>;
	conceptDifficultyMemory: Record<string, DifficultyMemoryEntry>;
	pronunciationExerciseMemory: Record<string, PronunciationMemoryEntry>;
	pronunciationConceptMemory: Record<string, PronunciationMemoryEntry>;
	completeLearningSession: (
		input: CompleteLearningSessionInput
	) => Promise<LearningSessionResult>;
	completeLesson: (lessonId: string, xpReward: number) => Promise<void>;
	completeExerciseSession: (
		lessonId: string,
		xpEarned: number,
		isDailyChallenge: boolean
	) => Promise<{
		levelledUp: boolean;
		oldLevel: number;
		newLevel: number;
		newTotalXp: number;
		newStreak: number;
	}>;
	addXp: (amount: number) => Promise<void>;
	checkAndResetDailyXP: () => void;
	setHasHydrated: (state: boolean) => void;
	addMistake: (exerciseId: string) => void;
	removeMistake: (exerciseId: string) => void;
	dismissCheckpointUnlock: (unitId: string) => void;
	recordFailedCheckpointReview: (input: Omit<CheckpointRecoveryReview, "createdAt">) => void;
	clearFailedCheckpointReview: (unitId?: string) => void;
	completeCheckpoint: (unitId: string) => void;
	markCheckpointComplete: (unitId: string) => void;
	recordPractice: (lessonId: string, score: number) => void;
	recordExerciseAttempt: (attempt: ExerciseAttempt) => void;
	recordFocusedConceptReview: (input: FocusedConceptReviewInput) => void;
	getForgettingScore: (lessonId: string) => number;
	getConceptRecallScore: (conceptId: string) => number;
	getExerciseDifficultyScore: (exerciseId: string) => number;
	getConceptDifficultyScore: (conceptId: string) => number;
	recordPronunciationAttempt: (attempt: PronunciationAttemptInput) => void;
	getPronunciationScoreForConcept: (conceptId: string) => number;
	getWeakPronunciationConcepts: (
		count: number,
		languageId?: string
	) => PronunciationMemoryEntry[];
	getDuePronunciationConceptCount: (languageId?: string) => number;
	getDueConceptCount: () => number;
	getWeakConcepts: (count: number) => ConceptMemoryEntry[];
	getMostUrgentLessons: (count: number) => string[];
	resetProgress: () => Promise<void>;
}

const MAX_RECENT_ATTEMPTS = 50;
const MIN_HALF_LIFE_DAYS = 0.5;
const MAX_HALF_LIFE_DAYS = 30;
const DUE_CONCEPT_RECALL_THRESHOLD = 0.65;
const WEAK_CONCEPT_RECALL_THRESHOLD = 0.85;
const WEAK_CONCEPT_INCORRECT_RATIO = 0.34;
const DEFAULT_DIFFICULTY_SCORE = 0.5;
const FAST_RESPONSE_MS = 5000;
const SLOW_RESPONSE_MS = 12000;
const DIFFICULTY_MEMORY_ALPHA = 0.35;
const PRONUNCIATION_WEAK_SCORE_THRESHOLD = 70;
const PRONUNCIATION_DUE_SCORE_THRESHOLD = 75;

const clampDifficultyScore = (score: number) =>
	Math.min(Math.max(score, 0), 1);

const clampPronunciationScore = (score: number) =>
	Math.min(Math.max(Math.round(score), 0), 100);

const getAttemptDifficultyTarget = (attempt: ExerciseAttempt) => {
	if (!attempt.correct) return 0.82;

	const durationMs = attempt.durationMs ?? SLOW_RESPONSE_MS;
	if (durationMs <= FAST_RESPONSE_MS) return 0.22;
	if (durationMs >= SLOW_RESPONSE_MS) return 0.58;
	return 0.38;
};

const updateDifficultyEntry = (
	existing: DifficultyMemoryEntry | undefined,
	id: string,
	kind: "exercise" | "concept",
	attempt: ExerciseAttempt,
	createdAt: number
): DifficultyMemoryEntry => {
	const durationMs = attempt.durationMs ?? existing?.avgResponseMs ?? SLOW_RESPONSE_MS;
	const attempts = (existing?.attempts ?? 0) + 1;
	const previousScore = existing?.difficultyScore ?? DEFAULT_DIFFICULTY_SCORE;
	const targetScore = getAttemptDifficultyTarget(attempt);
	const difficultyScore = clampDifficultyScore(
		previousScore * (1 - DIFFICULTY_MEMORY_ALPHA) +
			targetScore * DIFFICULTY_MEMORY_ALPHA
	);

	return {
		id,
		kind,
		attempts,
		correctCount: (existing?.correctCount ?? 0) + (attempt.correct ? 1 : 0),
		incorrectCount: (existing?.incorrectCount ?? 0) + (attempt.correct ? 0 : 1),
		avgResponseMs: Math.round(
			existing
				? (existing.avgResponseMs * existing.attempts + durationMs) / attempts
				: durationMs
		),
		difficultyScore: Math.round(difficultyScore * 100) / 100,
		lastPracticed: createdAt,
	};
};

const updatePronunciationEntry = (
	existing: PronunciationMemoryEntry | undefined,
	id: string,
	kind: "exercise" | "concept",
	attempt: PronunciationAttemptInput,
	createdAt: number
): PronunciationMemoryEntry => {
	const score = clampPronunciationScore(attempt.score);
	const accuracy = clampPronunciationScore(attempt.accuracy);
	const fluency = clampPronunciationScore(attempt.fluency);
	const attempts = (existing?.attempts ?? 0) + 1;

	return {
		id,
		kind,
		languageId: attempt.languageId ?? existing?.languageId,
		lessonId: attempt.lessonId ?? existing?.lessonId,
		unitId: attempt.unitId ?? existing?.unitId,
		attempts,
		avgScore: Math.round(
			existing ? (existing.avgScore * existing.attempts + score) / attempts : score
		),
		avgAccuracy: Math.round(
			existing
				? (existing.avgAccuracy * existing.attempts + accuracy) / attempts
				: accuracy
		),
		avgFluency: Math.round(
			existing ? (existing.avgFluency * existing.attempts + fluency) / attempts : fluency
		),
		bestScore: Math.max(existing?.bestScore ?? 0, score),
		lastScore: score,
		lowScoreCount:
			(existing?.lowScoreCount ?? 0) +
			(score < PRONUNCIATION_WEAK_SCORE_THRESHOLD ? 1 : 0),
		lastPracticed: createdAt,
	};
};

const getPronunciationUrgencyScore = (entry: PronunciationMemoryEntry) => {
	const lowScoreRatio = entry.attempts > 0 ? entry.lowScoreCount / entry.attempts : 0;
	const scoreGap = Math.max((PRONUNCIATION_DUE_SCORE_THRESHOLD - entry.avgScore) / 100, 0);
	const daysSincePractice = Math.max((Date.now() - entry.lastPracticed) / 86400000, 0);
	const recencyBoost = Math.min(daysSincePractice / 14, 1) * 0.3;

	return scoreGap * 3 + lowScoreRatio + recencyBoost;
};

const calculateConceptRecallScore = (
	entry: Pick<ConceptMemoryEntry, "lastPracticed" | "halfLifeDays">,
	now = Date.now()
): number => {
	const halfLifeDays = Math.max(entry.halfLifeDays, MIN_HALF_LIFE_DAYS);
	const daysSince = Math.max((now - entry.lastPracticed) / 86400000, 0);
	return Math.pow(2, -daysSince / halfLifeDays);
};

export const useProgressStore = create<ProgressState>()(
	persist(
		(set, get) => ({
			completedLessons: [],
			completedLessonIds: [],
			_hasHydrated: false,
			xp: 0,
			todayXP: 0,
			streak: 0,
			lastActiveDate: null,
			dailyChallengeCompletedDate: null,
			level: 1,
			dailyLessons: {},
			recentMistakes: [],
			completedCheckpoints: [],
			dismissedCheckpointUnlocks: [],
			latestFailedCheckpointReview: null,
			lessonMemory: {},
			recentAttempts: [],
			conceptMemory: {},
			exerciseDifficultyMemory: {},
			conceptDifficultyMemory: {},
			pronunciationExerciseMemory: {},
			pronunciationConceptMemory: {},
			addMistake: (exerciseId) => {
				const { recentMistakes } = get();
				const mistakes = recentMistakes || [];
				if (!mistakes.includes(exerciseId)) {
					set({ recentMistakes: [...mistakes, exerciseId] });
				}
			},
			removeMistake: (exerciseId) => {
				const { recentMistakes } = get();
				const mistakes = recentMistakes || [];
				set({ recentMistakes: mistakes.filter((id) => id !== exerciseId) });
			},
			dismissCheckpointUnlock: (unitId) => {
				const dismissed = get().dismissedCheckpointUnlocks || [];
				if (!dismissed.includes(unitId)) {
					set({ dismissedCheckpointUnlocks: [...dismissed, unitId] });
				}
			},
			recordFailedCheckpointReview: (input) => {
				if (input.focusConceptIds.length === 0) return;

				set({
					latestFailedCheckpointReview: {
						...input,
						focusConceptIds: [...new Set(input.focusConceptIds)].slice(0, 3),
						createdAt: Date.now(),
					},
				});
			},
			clearFailedCheckpointReview: (unitId) => {
				const latest = get().latestFailedCheckpointReview;
				if (!latest) return;
				if (unitId && latest.unitId !== unitId) return;

				set({ latestFailedCheckpointReview: null });
			},
			completeCheckpoint: (unitId) => {
				const { completedCheckpoints } = get();
				const checkpoints = completedCheckpoints || [];
				if (!checkpoints.includes(unitId)) {
					set({
						completedCheckpoints: [...checkpoints, unitId],
						latestFailedCheckpointReview:
							get().latestFailedCheckpointReview?.unitId === unitId
								? null
								: get().latestFailedCheckpointReview,
					});
				}
			},
			markCheckpointComplete: (unitId) => {
				const { completedCheckpoints } = get();
				const checkpoints = completedCheckpoints || [];
				if (!checkpoints.includes(unitId)) {
					set({
						completedCheckpoints: [...checkpoints, unitId],
						latestFailedCheckpointReview:
							get().latestFailedCheckpointReview?.unitId === unitId
								? null
								: get().latestFailedCheckpointReview,
					});
				}
			},
			recordPractice: (lessonId, score) => {
				const memory = get().lessonMemory || {};
				const existing = memory[lessonId];
				const newCount = (existing?.practiceCount ?? 0) + 1;
				const newAvg = existing
					? (existing.avgScore * existing.practiceCount + score) / newCount
					: score;

				set((state) => ({
					lessonMemory: {
						...(state.lessonMemory || {}),
						[lessonId]: {
							lessonId,
							lastPracticed: Date.now(),
							practiceCount: newCount,
							avgScore: Math.round(newAvg),
						},
					},
				}));
			},
			recordExerciseAttempt: (attempt) => {
				const createdAt = attempt.createdAt || Date.now();
				const conceptIds = attempt.conceptIds.length > 0 ? attempt.conceptIds : [attempt.exerciseId];
				const previousConceptMemory = get().conceptMemory || {};
				const previousExerciseDifficultyMemory = get().exerciseDifficultyMemory || {};
				const previousConceptDifficultyMemory = get().conceptDifficultyMemory || {};
				const nextConceptMemory = { ...previousConceptMemory };
				const nextExerciseDifficultyMemory = {
					...previousExerciseDifficultyMemory,
					[attempt.exerciseId]: updateDifficultyEntry(
						previousExerciseDifficultyMemory[attempt.exerciseId],
						attempt.exerciseId,
						"exercise",
						attempt,
						createdAt
					),
				};
				const nextConceptDifficultyMemory = { ...previousConceptDifficultyMemory };

				conceptIds.forEach((conceptId) => {
					const existing = previousConceptMemory[conceptId];
					const previousHalfLife = existing?.halfLifeDays ?? 1;
					const nextHalfLife = attempt.correct
						? Math.min(previousHalfLife * 1.5, MAX_HALF_LIFE_DAYS)
						: Math.max(previousHalfLife * 0.5, MIN_HALF_LIFE_DAYS);
					const nextEntry: ConceptMemoryEntry = {
						conceptId,
						lastPracticed: createdAt,
						practiceCount: (existing?.practiceCount ?? 0) + 1,
						correctCount: (existing?.correctCount ?? 0) + (attempt.correct ? 1 : 0),
						incorrectCount: (existing?.incorrectCount ?? 0) + (attempt.correct ? 0 : 1),
						halfLifeDays: nextHalfLife,
						latestRecallScore: attempt.correct
							? calculateConceptRecallScore({
									lastPracticed: createdAt,
									halfLifeDays: nextHalfLife,
								}, createdAt)
							: 0,
					};

					nextConceptMemory[conceptId] = nextEntry;
					nextConceptDifficultyMemory[conceptId] = updateDifficultyEntry(
						previousConceptDifficultyMemory[conceptId],
						conceptId,
						"concept",
						attempt,
						createdAt
					);
				});

				set((state) => ({
					recentAttempts: [
						{
							...attempt,
							createdAt,
							conceptIds,
						},
						...(state.recentAttempts || []),
					].slice(0, MAX_RECENT_ATTEMPTS),
					conceptMemory: nextConceptMemory,
					exerciseDifficultyMemory: nextExerciseDifficultyMemory,
					conceptDifficultyMemory: nextConceptDifficultyMemory,
				}));
			},
			recordFocusedConceptReview: ({ conceptIds, score, reviewedAt }) => {
				const uniqueConceptIds = [...new Set(conceptIds)].filter(Boolean);
				if (uniqueConceptIds.length === 0 || score < FOCUSED_REVIEW_PASS_SCORE) return;

				const createdAt = reviewedAt ?? Date.now();
				const safeScore = Math.min(Math.max(Math.round(score), 0), 100);

				set((state) => {
					const previousConceptMemory = state.conceptMemory || {};
					const nextConceptMemory = { ...previousConceptMemory };

					uniqueConceptIds.forEach((conceptId) => {
						const existing = previousConceptMemory[conceptId];
						const previousHalfLife = existing?.halfLifeDays ?? 1;
						const nextHalfLife = Math.min(
							Math.max(previousHalfLife * 1.35, 2),
							MAX_HALF_LIFE_DAYS
						);

						nextConceptMemory[conceptId] = {
							conceptId,
							lastPracticed: createdAt,
							practiceCount: existing?.practiceCount ?? 0,
							correctCount: existing?.correctCount ?? 0,
							incorrectCount: existing?.incorrectCount ?? 0,
							halfLifeDays: nextHalfLife,
							latestRecallScore: 1,
							lastFocusedReviewAt: createdAt,
							lastFocusedReviewScore: safeScore,
							focusedReviewPassCount: (existing?.focusedReviewPassCount ?? 0) + 1,
						};
					});

					return { conceptMemory: nextConceptMemory };
				});
			},
			recordPronunciationAttempt: (attempt) => {
				const createdAt = attempt.createdAt || Date.now();
				const conceptIds = attempt.conceptIds.length > 0 ? attempt.conceptIds : [attempt.exerciseId];
				const previousExerciseMemory = get().pronunciationExerciseMemory || {};
				const previousConceptMemory = get().pronunciationConceptMemory || {};
				const nextConceptMemory = { ...previousConceptMemory };

				conceptIds.forEach((conceptId) => {
					nextConceptMemory[conceptId] = updatePronunciationEntry(
						previousConceptMemory[conceptId],
						conceptId,
						"concept",
						{ ...attempt, conceptIds },
						createdAt
					);
				});

				set({
					pronunciationExerciseMemory: {
						...previousExerciseMemory,
						[attempt.exerciseId]: updatePronunciationEntry(
							previousExerciseMemory[attempt.exerciseId],
							attempt.exerciseId,
							"exercise",
							{ ...attempt, conceptIds },
							createdAt
						),
					},
					pronunciationConceptMemory: nextConceptMemory,
				});
			},
			getForgettingScore: (lessonId) => {
				const entry = (get().lessonMemory || {})[lessonId];
				if (!entry) return 999;

				const daysSince = (Date.now() - entry.lastPracticed) / 86400000;
				const scoreMultiplier = entry.avgScore / 100;
				const halfLife = Math.pow(2, entry.practiceCount) * (0.5 + scoreMultiplier * 0.5);
				return daysSince / halfLife;
			},
			getConceptRecallScore: (conceptId) => {
				const entry = (get().conceptMemory || {})[conceptId];
				if (!entry) return 0;
				return calculateConceptRecallScore(entry);
			},
			getExerciseDifficultyScore: (exerciseId) => {
				const entry = (get().exerciseDifficultyMemory || {})[exerciseId];
				return entry?.difficultyScore ?? DEFAULT_DIFFICULTY_SCORE;
			},
			getConceptDifficultyScore: (conceptId) => {
				const entry = (get().conceptDifficultyMemory || {})[conceptId];
				return entry?.difficultyScore ?? DEFAULT_DIFFICULTY_SCORE;
			},
			getPronunciationScoreForConcept: (conceptId) => {
				const entry = (get().pronunciationConceptMemory || {})[conceptId];
				return entry?.avgScore ?? 100;
			},
			getWeakPronunciationConcepts: (count, languageId) => {
				const limit = Math.max(count, 0);
				if (limit === 0) return [];

				return Object.values(get().pronunciationConceptMemory || {})
					.filter((entry) => !languageId || entry.languageId === languageId)
					.filter(
						(entry) =>
							entry.avgScore < PRONUNCIATION_DUE_SCORE_THRESHOLD ||
							entry.lastScore < PRONUNCIATION_WEAK_SCORE_THRESHOLD ||
							entry.lowScoreCount > 0
					)
					.sort((a, b) => {
						const urgencyDiff =
							getPronunciationUrgencyScore(b) - getPronunciationUrgencyScore(a);
						if (urgencyDiff !== 0) return urgencyDiff;
						return b.lastPracticed - a.lastPracticed;
					})
					.slice(0, limit);
			},
			getDuePronunciationConceptCount: (languageId) =>
				Object.values(get().pronunciationConceptMemory || {}).filter(
					(entry) =>
						(!languageId || entry.languageId === languageId) &&
						(entry.avgScore < PRONUNCIATION_DUE_SCORE_THRESHOLD ||
							entry.lastScore < PRONUNCIATION_WEAK_SCORE_THRESHOLD)
				).length,
			getDueConceptCount: () => {
				const conceptMemory = Object.values(get().conceptMemory || {});

				return conceptMemory.filter((entry) => {
					if (hasFreshSuccessfulFocusedReview(entry)) return false;

					const recallScore = calculateConceptRecallScore(entry);
					return (
						recallScore < DUE_CONCEPT_RECALL_THRESHOLD ||
						entry.incorrectCount > entry.correctCount
					);
				}).length;
			},
			getWeakConcepts: (count) => {
				const limit = Math.max(count, 0);
				if (limit === 0) return [];

				return Object.values(get().conceptMemory || {})
					.map((entry) => {
						const recallScore = calculateConceptRecallScore(entry);
						const incorrectRatio =
							entry.practiceCount > 0 ? entry.incorrectCount / entry.practiceCount : 0;
						const daysSincePractice = Math.max((Date.now() - entry.lastPracticed) / 86400000, 0);
						const urgencyScore =
							(1 - recallScore) * 3 + incorrectRatio + Math.min(daysSincePractice / 30, 1);

						return {
							entry,
							recallScore,
							incorrectRatio,
							urgencyScore,
						};
					})
					.filter(
						(item) =>
							!hasFreshSuccessfulFocusedReview(item.entry) &&
							(item.recallScore < WEAK_CONCEPT_RECALL_THRESHOLD ||
								item.incorrectRatio >= WEAK_CONCEPT_INCORRECT_RATIO)
					)
					.sort((a, b) => {
						if (b.urgencyScore !== a.urgencyScore) {
							return b.urgencyScore - a.urgencyScore;
						}

						return b.entry.lastPracticed - a.entry.lastPracticed;
					})
					.slice(0, limit)
					.map(({ entry, recallScore }) => ({
						...entry,
						latestRecallScore: recallScore,
					}));
			},
			getMostUrgentLessons: (count) => {
				const getForgettingScore = get().getForgettingScore;
				return getAllLessonsFromData()
					.map((lesson) => ({
						id: lesson.id,
						score: getForgettingScore(lesson.id),
					}))
					.sort((a, b) => b.score - a.score)
					.slice(0, count)
					.map((lesson) => lesson.id);
			},
			completeLearningSession: async (input) => {
				const {
					xp,
					todayXP,
					level,
					streak,
					lastActiveDate,
					completedLessonIds,
					completedLessons,
					completedCheckpoints,
					dailyChallengeCompletedDate,
					dailyLessons,
					lessonMemory,
				} = get();
				const { nextState, result } = applyLearningSessionCompletion({
					xp,
					todayXP,
					level,
					streak,
					lastActiveDate,
					completedLessonIds,
					completedLessons,
					completedCheckpoints,
					dailyChallengeCompletedDate,
					dailyLessons,
					lessonMemory,
				}, input);

				set(nextState);
				if (input.checkpointUnitId && result.passed) {
					get().clearFailedCheckpointReview(input.checkpointUnitId);
				}

				return result;
			},
			completeLesson: async (lessonId, xpReward) => {
				const { completedLessons, xp, todayXP, streak, lastActiveDate, dailyLessons } = get();
				
				const todayStr = getTodayStr();
				const yesterdayStr = getYesterdayStr();

				let nextCompletedLessons = completedLessons || [];
				let nextXp = xp;
				let nextTodayXp = todayXP || 0;

				if (!nextCompletedLessons.includes(lessonId)) {
					nextCompletedLessons = [...nextCompletedLessons, lessonId];
					nextXp = xp + xpReward;
					nextTodayXp = (todayXP || 0) + xpReward;
				}

				const nextLevel = calculateLevel(nextXp);

				const nextDailyLessons = { ...dailyLessons };
				if (!nextDailyLessons[todayStr]) {
					nextDailyLessons[todayStr] = [];
				}
				if (!nextDailyLessons[todayStr].includes(lessonId)) {
					nextDailyLessons[todayStr] = [...nextDailyLessons[todayStr], lessonId];
				}

				let nextStreak = streak;
				if (lastActiveDate === null) {
					nextStreak = 1;
				} else if (lastActiveDate === yesterdayStr) {
					nextStreak = streak + 1;
				} else if (lastActiveDate !== todayStr) {
					nextStreak = 1;
				}

				set({
					completedLessons: nextCompletedLessons,
					completedLessonIds: nextCompletedLessons,
					xp: nextXp,
					todayXP: nextTodayXp,
					level: nextLevel,
					dailyLessons: nextDailyLessons,
					streak: nextStreak,
					lastActiveDate: todayStr,
				});
			},
			completeExerciseSession: async (lessonId, xpEarned, isDailyChallenge) => {
				const plannedCorrectCount = Math.max(Math.round(xpEarned / 10), 0);
				const result = await get().completeLearningSession({
					sessionType: isDailyChallenge ? "daily-challenge" : "lesson",
					xpEarned,
					score: plannedCorrectCount > 0 ? 100 : 0,
					plannedCorrectCount,
					plannedExerciseCount: plannedCorrectCount,
					practicedLessonIds: [lessonId],
					completedLessonId: lessonId,
					passed: true,
				});

				return {
					levelledUp: result.levelledUp,
					oldLevel: result.oldLevel,
					newLevel: result.newLevel,
					newTotalXp: result.newTotalXp,
					newStreak: result.newStreak,
				};
			},
			addXp: async (amount) => {
				const { xp, todayXP } = get();
				const nextXp = xp + amount;
				const nextTodayXp = (todayXP || 0) + amount;
				set({
					xp: nextXp,
					todayXP: nextTodayXp,
					level: calculateLevel(nextXp),
				});
			},
			checkAndResetDailyXP: () => {
				const { lastActiveDate, todayXP } = get();
				if (!lastActiveDate) return;
				const todayStr = getTodayStr();
				if (lastActiveDate !== todayStr && todayXP !== 0) {
					set({ todayXP: 0 });
				}
			},
			setHasHydrated: (state) => {
				set({ _hasHydrated: state });
			},
			resetProgress: async () => {
				set({
					completedLessons: [],
					completedLessonIds: [],
					xp: 0,
					todayXP: 0,
					streak: 0,
					lastActiveDate: null,
					dailyChallengeCompletedDate: null,
					level: 1,
					dailyLessons: {},
					recentMistakes: [],
					completedCheckpoints: [],
					dismissedCheckpointUnlocks: [],
					latestFailedCheckpointReview: null,
					lessonMemory: {},
					recentAttempts: [],
					conceptMemory: {},
					exerciseDifficultyMemory: {},
					conceptDifficultyMemory: {},
					pronunciationExerciseMemory: {},
					pronunciationConceptMemory: {},
				});
			},
		}),
		{
			name: "progress-storage",
			storage: createJSONStorage(() => AsyncStorage),
			onRehydrateStorage: () => (state) => {
				state?.setHasHydrated(true);
			},
		}
	)
);
