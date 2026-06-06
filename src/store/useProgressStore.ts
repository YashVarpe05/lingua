import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllLessonsFromData } from "@/data/lessons";
import { ConceptMemoryEntry, DifficultyMemoryEntry, ExerciseAttempt } from "@/types/learning";

export interface LessonMemoryEntry {
	lessonId: string;
	lastPracticed: number;
	practiceCount: number;
	avgScore: number;
}

export type LearningSessionType =
	| "lesson"
	| "daily-challenge"
	| "review"
	| "checkpoint"
	| "mock-lesson"
	| "mock-checkpoint";

export interface CompleteLearningSessionInput {
	sessionType: LearningSessionType;
	xpEarned: number;
	score: number;
	plannedCorrectCount: number;
	plannedExerciseCount: number;
	practicedLessonIds?: string[];
	completedLessonId?: string;
	checkpointUnitId?: string;
	passed?: boolean;
}

export interface LearningSessionResult {
	xpEarned: number;
	newTotalXp: number;
	newStreak: number;
	oldLevel: number;
	newLevel: number;
	levelledUp: boolean;
	score: number;
	passed: boolean;
	plannedCorrectCount: number;
	plannedExerciseCount: number;
}

export interface ProgressState {
	completedLessons: string[]; // Keep for backward compatibility
	completedLessonIds: string[]; // List of completed lesson IDs
	xp: number;
	todayXP: number; // XP earned today (resets at midnight)
	streak: number;
	lastActiveDate: string | null;
	dailyChallengeCompletedDate: string | null;
	level: number;
	dailyLessons: Record<string, string[]>;
	recentMistakes: string[]; // List of exercise IDs the user got incorrect
	completedCheckpoints: string[]; // List of unit IDs where the checkpoint was passed
	lessonMemory: Record<string, LessonMemoryEntry>;
	recentAttempts: ExerciseAttempt[];
	conceptMemory: Record<string, ConceptMemoryEntry>;
	exerciseDifficultyMemory: Record<string, DifficultyMemoryEntry>;
	conceptDifficultyMemory: Record<string, DifficultyMemoryEntry>;
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
	addMistake: (exerciseId: string) => void;
	removeMistake: (exerciseId: string) => void;
	completeCheckpoint: (unitId: string) => void;
	markCheckpointComplete: (unitId: string) => void;
	recordPractice: (lessonId: string, score: number) => void;
	recordExerciseAttempt: (attempt: ExerciseAttempt) => void;
	getForgettingScore: (lessonId: string) => number;
	getConceptRecallScore: (conceptId: string) => number;
	getExerciseDifficultyScore: (exerciseId: string) => number;
	getConceptDifficultyScore: (conceptId: string) => number;
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

const clampDifficultyScore = (score: number) =>
	Math.min(Math.max(score, 0), 1);

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

const calculateConceptRecallScore = (
	entry: Pick<ConceptMemoryEntry, "lastPracticed" | "halfLifeDays">,
	now = Date.now()
): number => {
	const halfLifeDays = Math.max(entry.halfLifeDays, MIN_HALF_LIFE_DAYS);
	const daysSince = Math.max((now - entry.lastPracticed) / 86400000, 0);
	return Math.pow(2, -daysSince / halfLifeDays);
};

const calculateLevel = (xp: number): number => {
	if (xp >= 900) return 5;
	if (xp >= 500) return 4;
	if (xp >= 250) return 3;
	if (xp >= 100) return 2;
	return 1;
};

const clampPercent = (value: number) =>
	Math.min(Math.max(Math.round(value), 0), 100);

const uniqueIds = (ids: (string | undefined)[]) =>
	[...new Set(ids.filter((id): id is string => Boolean(id)))];

const getTodayStr = (): string => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getYesterdayStr = (): string => {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
};

export const useProgressStore = create<ProgressState>()(
	persist(
		(set, get) => ({
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
			lessonMemory: {},
			recentAttempts: [],
			conceptMemory: {},
			exerciseDifficultyMemory: {},
			conceptDifficultyMemory: {},
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
			completeCheckpoint: (unitId) => {
				const { completedCheckpoints } = get();
				const checkpoints = completedCheckpoints || [];
				if (!checkpoints.includes(unitId)) {
					set({ completedCheckpoints: [...checkpoints, unitId] });
				}
			},
			markCheckpointComplete: (unitId) => {
				const { completedCheckpoints } = get();
				const checkpoints = completedCheckpoints || [];
				if (!checkpoints.includes(unitId)) {
					set({ completedCheckpoints: [...checkpoints, unitId] });
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
			getDueConceptCount: () => {
				const conceptMemory = Object.values(get().conceptMemory || {});

				return conceptMemory.filter((entry) => {
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
							item.recallScore < WEAK_CONCEPT_RECALL_THRESHOLD ||
							item.incorrectRatio >= WEAK_CONCEPT_INCORRECT_RATIO
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
					streak,
					lastActiveDate,
					completedLessonIds,
					completedLessons,
					completedCheckpoints,
					dailyChallengeCompletedDate,
					dailyLessons,
					lessonMemory,
				} = get();
				const todayStr = getTodayStr();
				const yesterdayStr = getYesterdayStr();
				const oldLevel = calculateLevel(xp);
				const xpEarned = Math.max(Math.round(input.xpEarned), 0);
				const score = clampPercent(input.score);
				const plannedExerciseCount = Math.max(Math.round(input.plannedExerciseCount), 0);
				const plannedCorrectCount = Math.min(
					Math.max(Math.round(input.plannedCorrectCount), 0),
					plannedExerciseCount
				);
				const passed = input.passed ?? score >= 70;
				const nextXp = xp + xpEarned;
				const nextTodayXp = (todayXP || 0) + xpEarned;
				const nextLevel = calculateLevel(nextXp);
				const levelledUp = nextLevel > oldLevel;

				let nextCompletedIds = [...(completedLessonIds || completedLessons || [])];
				if (input.completedLessonId && !nextCompletedIds.includes(input.completedLessonId)) {
					nextCompletedIds = [...nextCompletedIds, input.completedLessonId];
				}

				let nextCompletedCheckpoints = completedCheckpoints || [];
				if (
					input.checkpointUnitId &&
					passed &&
					!nextCompletedCheckpoints.includes(input.checkpointUnitId)
				) {
					nextCompletedCheckpoints = [...nextCompletedCheckpoints, input.checkpointUnitId];
				}

				let nextStreak = streak;
				if (lastActiveDate === null) {
					nextStreak = 1;
				} else if (lastActiveDate === yesterdayStr) {
					nextStreak = streak + 1;
				} else if (lastActiveDate !== todayStr) {
					nextStreak = 1;
				}

				const nextDailyLessons = { ...(dailyLessons || {}) };
				if (input.completedLessonId) {
					const todayLessons = nextDailyLessons[todayStr] || [];
					if (!todayLessons.includes(input.completedLessonId)) {
						nextDailyLessons[todayStr] = [...todayLessons, input.completedLessonId];
					}
				}

				const nextLessonMemory = { ...(lessonMemory || {}) };
				uniqueIds(input.practicedLessonIds ?? []).forEach((lessonId) => {
					const existing = nextLessonMemory[lessonId];
					const newCount = (existing?.practiceCount ?? 0) + 1;
					const newAvg = existing
						? (existing.avgScore * existing.practiceCount + score) / newCount
						: score;

					nextLessonMemory[lessonId] = {
						lessonId,
						lastPracticed: Date.now(),
						practiceCount: newCount,
						avgScore: Math.round(newAvg),
					};
				});

				set({
					xp: nextXp,
					todayXP: nextTodayXp,
					level: nextLevel,
					completedLessons: nextCompletedIds,
					completedLessonIds: nextCompletedIds,
					completedCheckpoints: nextCompletedCheckpoints,
					streak: nextStreak,
					lastActiveDate: todayStr,
					dailyChallengeCompletedDate:
						input.sessionType === "daily-challenge"
							? todayStr
							: dailyChallengeCompletedDate,
					dailyLessons: nextDailyLessons,
					lessonMemory: nextLessonMemory,
				});

				return {
					xpEarned,
					newTotalXp: nextXp,
					newStreak: nextStreak,
					oldLevel,
					newLevel: nextLevel,
					levelledUp,
					score,
					passed,
					plannedCorrectCount,
					plannedExerciseCount,
				};
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
					lessonMemory: {},
					recentAttempts: [],
					conceptMemory: {},
					exerciseDifficultyMemory: {},
					conceptDifficultyMemory: {},
				});
			},
		}),
		{
			name: "progress-storage",
			storage: createJSONStorage(() => AsyncStorage),
		}
	)
);
