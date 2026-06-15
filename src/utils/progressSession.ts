export interface LessonMemoryEntry {
	lessonId: string;
	lastPracticed: number;
	practiceCount: number;
	avgScore: number;
}

export type LearningSessionType =
	| "lesson"
	| "daily-challenge"
	| "practice"
	| "review"
	| "mastery"
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

export interface ProgressCompletionState {
	xp: number;
	todayXP: number;
	level: number;
	streak: number;
	lastActiveDate: string | null;
	dailyChallengeCompletedDate: string | null;
	completedLessons: string[];
	completedLessonIds: string[];
	completedCheckpoints: string[];
	dailyLessons: Record<string, string[]>;
	lessonMemory: Record<string, LessonMemoryEntry>;
}

export interface ProgressCompletionOutput {
	nextState: ProgressCompletionState;
	result: LearningSessionResult;
}

export const LESSON_COMPLETION_SESSION_TYPES = new Set<LearningSessionType>([
	"lesson",
	"daily-challenge",
	"mastery",
	"mock-lesson",
]);

export const calculateLevel = (xp: number): number => {
	if (xp >= 900) return 5;
	if (xp >= 500) return 4;
	if (xp >= 250) return 3;
	if (xp >= 100) return 2;
	return 1;
};

export const getTodayStr = (date = new Date()): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const getYesterdayStr = (date = new Date()): string => {
	const yesterday = new Date(date.getTime());
	yesterday.setDate(yesterday.getDate() - 1);
	return getTodayStr(yesterday);
};

const clampPercent = (value: number) =>
	Math.min(Math.max(Math.round(value), 0), 100);

const uniqueIds = (ids: (string | undefined)[]) =>
	[...new Set(ids.filter((id): id is string => Boolean(id)))];

export const applyLearningSessionCompletion = (
	state: ProgressCompletionState,
	input: CompleteLearningSessionInput,
	now = new Date()
): ProgressCompletionOutput => {
	const todayStr = getTodayStr(now);
	const yesterdayStr = getYesterdayStr(now);
	const oldLevel = calculateLevel(state.xp);
	const xpEarned = Math.max(Math.round(input.xpEarned), 0);
	const score = clampPercent(input.score);
	const plannedExerciseCount = Math.max(
		Math.round(input.plannedExerciseCount),
		0
	);
	const plannedCorrectCount = Math.min(
		Math.max(Math.round(input.plannedCorrectCount), 0),
		plannedExerciseCount
	);
	const passed = input.passed ?? score >= 70;
	const nextXp = state.xp + xpEarned;
	const nextTodayXp = (state.todayXP || 0) + xpEarned;
	const nextLevel = calculateLevel(nextXp);
	const levelledUp = nextLevel > oldLevel;
	const canCompleteLesson = LESSON_COMPLETION_SESSION_TYPES.has(input.sessionType);
	const completedLessonId = canCompleteLesson ? input.completedLessonId : undefined;

	let nextCompletedIds = [
		...(state.completedLessonIds || state.completedLessons || []),
	];
	if (completedLessonId && !nextCompletedIds.includes(completedLessonId)) {
		nextCompletedIds = [...nextCompletedIds, completedLessonId];
	}

	let nextCompletedCheckpoints = state.completedCheckpoints || [];
	if (
		input.checkpointUnitId &&
		passed &&
		!nextCompletedCheckpoints.includes(input.checkpointUnitId)
	) {
		nextCompletedCheckpoints = [
			...nextCompletedCheckpoints,
			input.checkpointUnitId,
		];
	}

	let nextStreak = state.streak;
	if (state.lastActiveDate === null) {
		nextStreak = 1;
	} else if (state.lastActiveDate === yesterdayStr) {
		nextStreak = state.streak + 1;
	} else if (state.lastActiveDate !== todayStr) {
		nextStreak = 1;
	}

	const nextDailyLessons = { ...(state.dailyLessons || {}) };
	if (completedLessonId) {
		const todayLessons = nextDailyLessons[todayStr] || [];
		if (!todayLessons.includes(completedLessonId)) {
			nextDailyLessons[todayStr] = [...todayLessons, completedLessonId];
		}
	}

	const nextLessonMemory = { ...(state.lessonMemory || {}) };
	uniqueIds(input.practicedLessonIds ?? []).forEach((lessonId) => {
		const existing = nextLessonMemory[lessonId];
		const newCount = (existing?.practiceCount ?? 0) + 1;
		const newAvg = existing
			? (existing.avgScore * existing.practiceCount + score) / newCount
			: score;

		nextLessonMemory[lessonId] = {
			lessonId,
			lastPracticed: now.getTime(),
			practiceCount: newCount,
			avgScore: Math.round(newAvg),
		};
	});

	const result: LearningSessionResult = {
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

	return {
		nextState: {
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
					: state.dailyChallengeCompletedDate,
			dailyLessons: nextDailyLessons,
			lessonMemory: nextLessonMemory,
		},
		result,
	};
};
