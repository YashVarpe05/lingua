import {
	getCurriculumConceptById,
	getCurriculumMetadataForExercise,
	getCurriculumReviewLabel,
} from "@/data/curriculum";
import { getLessonById } from "@/data/lessons";
import type {
	Exercise,
	ConceptMemoryEntry,
	DifficultyMemoryEntry,
	ExerciseDifficulty,
	ExerciseDifficultyBand,
	ExerciseType,
	ExerciseAttempt,
	Lesson,
	PronunciationMemoryEntry,
	SessionIntent,
	Unit,
} from "@/types/learning";

type PracticeMode =
	| "mistakes"
	| "vocabulary"
	| "listening"
	| "speaking"
	| "mastery"
	| "review"
	| "checkpoint";

interface GenerateSessionPlanInput {
	intent: SessionIntent;
	selectedLanguageId: string;
	lessons: Lesson[];
	units: Unit[];
	lesson?: Lesson;
	mode?: PracticeMode;
	isLegacyCheckpoint?: boolean;
	checkpointUnit?: Unit;
	recentMistakes?: string[];
	recentAttempts?: ExerciseAttempt[];
	conceptMemory?: Record<string, ConceptMemoryEntry>;
	pronunciationConceptMemory?: Record<string, PronunciationMemoryEntry>;
	focusConceptIds?: string[];
	exerciseDifficultyMemory?: Record<string, DifficultyMemoryEntry>;
	conceptDifficultyMemory?: Record<string, DifficultyMemoryEntry>;
	getForgettingScore?: (lessonId: string) => number;
	getMostUrgentLessons?: (count: number) => string[];
}

export interface SessionExerciseItem {
	exercise: Exercise;
	lessonId?: string;
	unitId?: string;
}

export interface SessionPlan {
	intent: SessionIntent;
	exercises: Exercise[];
	items: SessionExerciseItem[];
	reviewedLessonIds: string[];
	focusConceptIds: string[];
	focusLabel?: string;
}

interface ReviewBuildResult {
	items: SessionExerciseItem[];
	focusConceptIds: string[];
}

interface GetRepairExerciseCandidateInput {
	currentExercise: Exercise;
	selectedLanguageId: string;
	lessons: Lesson[];
	units: Unit[];
	sessionIntent: SessionIntent;
	unavailableExerciseIds?: string[];
	exerciseDifficultyMemory?: Record<string, DifficultyMemoryEntry>;
	conceptDifficultyMemory?: Record<string, DifficultyMemoryEntry>;
}

const SESSION_LIMITS: Partial<Record<SessionIntent, number>> = {
	lesson: 8,
	"daily-challenge": 8,
	review: 5,
	mistakes: 8,
	vocabulary: 8,
	listening: 8,
	speaking: 6,
	mastery: 8,
	checkpoint: 5,
};

const MIN_HALF_LIFE_DAYS = 0.5;

const VOCABULARY_EXERCISE_TYPES = new Set<ExerciseType>([
	"mcq",
	"matching-pairs",
	"tap-word",
]);

const SPEAKING_SOURCE_EXERCISE_TYPES = new Set<ExerciseType>([
	"mcq",
	"fill-in-the-blank",
	"tap-word",
	"listen-type",
]);

const shuffleItems = <T,>(items: T[]): T[] =>
	[...items].sort(() => Math.random() - 0.5);

const getUnitForLesson = (lesson: Lesson | undefined, units: Unit[]) =>
	units.find((unit) => unit.id === lesson?.unitId);

const getUnitLessons = (lessons: Lesson[], unitId?: string) =>
	lessons.filter((lesson) => lesson.unitId === unitId && !lesson.isCheckpoint);

const getExercisesFromLessons = (lessons: Lesson[]): SessionExerciseItem[] =>
	lessons.flatMap((lesson) =>
		(lesson.exercises ?? []).map((exercise) => ({
			exercise,
			lessonId: lesson.id,
			unitId: lesson.unitId,
		}))
	);

const slugPart = (value: string) =>
	value
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const buildFallbackConceptIds = (exercise: Exercise, lesson?: Lesson, unit?: Unit) => {
	const readableParts = [
		unit?.id,
		lesson?.id,
		exercise.type,
		slugPart(exercise.correctAnswer),
	].filter(Boolean);

	const fallback = readableParts.join(":") || exercise.id;
	return [fallback];
};

const buildConceptIds = (exercise: Exercise, lesson?: Lesson, unit?: Unit) => {
	if (exercise.conceptIds?.length) return exercise.conceptIds;

	const curriculumMetadata = getCurriculumMetadataForExercise(exercise, lesson, unit);
	if (curriculumMetadata.conceptIds.length) return curriculumMetadata.conceptIds;

	return buildFallbackConceptIds(exercise, lesson, unit);
};

const getItemContext = (
	item: SessionExerciseItem,
	lessons: Lesson[],
	units: Unit[]
) => {
	const lesson = item.lessonId
		? lessons.find((candidate) => candidate.id === item.lessonId) ?? getLessonById(item.lessonId)
		: undefined;
	const unit =
		units.find((candidate) => candidate.id === item.unitId) ??
		getUnitForLesson(lesson, units);

	return { lesson, unit };
};

const calculateConceptRecallScore = (
	entry: ConceptMemoryEntry,
	now = Date.now()
) => {
	const halfLifeDays = Math.max(entry.halfLifeDays, MIN_HALF_LIFE_DAYS);
	const daysSince = Math.max((now - entry.lastPracticed) / 86400000, 0);
	return Math.pow(2, -daysSince / halfLifeDays);
};

const inferDifficulty = (
	exercise: Exercise,
	index: number,
	total: number,
	intent: SessionIntent
): ExerciseDifficulty => {
	if (intent === "checkpoint") return "challenge";
	if (intent === "mastery") {
		return index >= Math.max(total - 1, 0) ? "challenge" : "practice";
	}
	if (exercise.difficulty) return exercise.difficulty;
	if (index >= Math.max(total - 2, 0)) return "challenge";
	if (exercise.type === "listen-type" || exercise.type === "matching-pairs") {
		return "practice";
	}
	if (index <= 1) return "intro";
	return "practice";
};

const clampDifficultyScore = (score: number) =>
	Math.min(Math.max(score, 0), 1);

const getStaticDifficultyScore = (difficulty: ExerciseDifficulty | undefined) => {
	if (difficulty === "intro") return 0.25;
	if (difficulty === "challenge") return 0.78;
	return 0.5;
};

const getDifficultyBand = (score: number): ExerciseDifficultyBand => {
	if (score < 0.4) return "warmup";
	if (score < 0.72) return "practice";
	return "challenge";
};

const getPredictedDifficultyScore = (
	exercise: Exercise,
	conceptIds: string[],
	input: Pick<
		GenerateSessionPlanInput,
		"exerciseDifficultyMemory" | "conceptDifficultyMemory"
	>
) => {
	const staticScore = getStaticDifficultyScore(exercise.difficulty);
	const exerciseScore =
		input.exerciseDifficultyMemory?.[exercise.id]?.difficultyScore;
	const conceptScores = conceptIds
		.map((conceptId) => input.conceptDifficultyMemory?.[conceptId]?.difficultyScore)
		.filter((score): score is number => typeof score === "number");
	const conceptScore = conceptScores.length
		? Math.max(...conceptScores)
		: undefined;

	if (typeof exerciseScore === "number") {
		return clampDifficultyScore(
			exerciseScore * 0.6 + (conceptScore ?? staticScore) * 0.3 + staticScore * 0.1
		);
	}

	if (typeof conceptScore === "number") {
		return clampDifficultyScore(conceptScore * 0.65 + staticScore * 0.35);
	}

	return staticScore;
};

const enrichExercise = (
	item: SessionExerciseItem,
	context: {
		selectedLanguageId: string;
		intent: SessionIntent;
		lessons: Lesson[];
		units: Unit[];
		index: number;
		total: number;
		exerciseDifficultyMemory?: Record<string, DifficultyMemoryEntry>;
		conceptDifficultyMemory?: Record<string, DifficultyMemoryEntry>;
	}
): SessionExerciseItem => {
	const { lesson, unit } = getItemContext(item, context.lessons, context.units);
	const curriculumMetadata = getCurriculumMetadataForExercise(item.exercise, lesson, unit);
	const languageId =
		item.exercise.languageId ??
		unit?.languageId ??
		lesson?.unitId.split("_")[0] ??
		context.selectedLanguageId;
	const difficulty = inferDifficulty(
		item.exercise,
		context.index,
		context.total,
		context.intent
	);
	const conceptIds = item.exercise.conceptIds?.length
		? item.exercise.conceptIds
		: curriculumMetadata.conceptIds.length
			? curriculumMetadata.conceptIds
			: buildFallbackConceptIds(item.exercise, lesson, unit);
	const predictedDifficultyScore = getPredictedDifficultyScore(
		{ ...item.exercise, difficulty },
		conceptIds,
		context
	);

	const exercise: Exercise = {
		...item.exercise,
		languageId,
		unitId: item.exercise.unitId ?? item.unitId ?? lesson?.unitId ?? unit?.id,
		lessonId: item.exercise.lessonId ?? item.lessonId,
		skillId: item.exercise.skillId ?? curriculumMetadata.skillId ?? lesson?.id,
		cefrLevel: item.exercise.cefrLevel ?? unit?.cefr,
		difficulty,
		conceptIds,
		predictedDifficultyScore,
		difficultyBand: getDifficultyBand(predictedDifficultyScore),
	};

	return {
		exercise,
		lessonId: exercise.lessonId,
		unitId: exercise.unitId,
	};
};

const finalizeItems = (
	items: SessionExerciseItem[],
	input: GenerateSessionPlanInput,
	intent: SessionIntent,
	limit: number
) => {
	const limitedItems = items.slice(0, limit);
	return limitedItems.map((item, index) =>
		enrichExercise(item, {
			selectedLanguageId: input.selectedLanguageId,
			intent,
			lessons: input.lessons,
			units: input.units,
			index,
			total: limitedItems.length,
			exerciseDifficultyMemory: input.exerciseDifficultyMemory,
			conceptDifficultyMemory: input.conceptDifficultyMemory,
		})
	);
};

const getDifficultyCurveTargets = (count: number, intent: SessionIntent) => {
	if (count <= 0) return [];
	if (count === 1) return [0.5];

	const start = intent === "review" ? 0.3 : intent === "mastery" ? 0.55 : 0.25;
	const end = intent === "review" ? 0.8 : intent === "mastery" ? 0.94 : 0.84;

	return Array.from({ length: count }, (_, index) => {
		const position = index / (count - 1);
		return start + (end - start) * position;
	});
};

const orderItemsByDifficulty = (
	items: SessionExerciseItem[],
	intent: SessionIntent
) => {
	if (intent === "checkpoint" || items.length <= 1) return items;

	const remaining = [...items];
	const ordered: SessionExerciseItem[] = [];
	const targets = getDifficultyCurveTargets(items.length, intent);
	const hardThreshold = 0.72;

	targets.forEach((target) => {
		const lastTwoAreHard =
			ordered.length >= 2 &&
			ordered
				.slice(-2)
				.every((item) => (item.exercise.predictedDifficultyScore ?? 0.5) >= hardThreshold);
		const candidates = lastTwoAreHard
			? remaining.filter(
					(item) => (item.exercise.predictedDifficultyScore ?? 0.5) < hardThreshold
				)
			: remaining;
		const pool = candidates.length ? candidates : remaining;
		let bestItem = pool[0];
		let bestDistance = Math.abs(
			(bestItem?.exercise.predictedDifficultyScore ?? 0.5) - target
		);

		pool.forEach((item) => {
			const distance = Math.abs(
				(item.exercise.predictedDifficultyScore ?? 0.5) - target
			);
			if (distance < bestDistance) {
				bestItem = item;
				bestDistance = distance;
			}
		});

		if (!bestItem) return;

		ordered.push(bestItem);
		remaining.splice(remaining.indexOf(bestItem), 1);
	});

	return ordered;
};

const buildCheckpointItems = (input: GenerateSessionPlanInput): SessionExerciseItem[] => {
	if (input.checkpointUnit?.checkpointQuiz?.exercises?.length) {
		return input.checkpointUnit.checkpointQuiz.exercises.map((exercise) => ({
			exercise,
			unitId: input.checkpointUnit?.id,
		}));
	}

	if (!input.lesson) return [];
	const unitLessons = getUnitLessons(input.lessons, input.lesson.unitId);
	return shuffleItems(getExercisesFromLessons(unitLessons));
};

const getConceptUrgencyScore = (
	entry: ConceptMemoryEntry | undefined,
	now: number
) => {
	if (!entry) return 0;

	const recall = calculateConceptRecallScore(entry, now);
	const incorrectRatio = entry.practiceCount > 0
		? entry.incorrectCount / entry.practiceCount
		: 0;
	const dueBoost = recall < 0.65 ? 1.2 : recall < 0.85 ? 0.6 : 0;
	return (1 - recall) * 3 + incorrectRatio + dueBoost;
};

const getPronunciationUrgencyScore = (
	entry: PronunciationMemoryEntry | undefined,
	now: number
) => {
	if (!entry) return 0;

	const scoreGap = Math.max((75 - entry.avgScore) / 100, 0);
	const lowScoreRatio = entry.attempts > 0 ? entry.lowScoreCount / entry.attempts : 0;
	const daysSincePractice = Math.max((now - entry.lastPracticed) / 86400000, 0);
	const dueBoost = entry.avgScore < 70 || entry.lastScore < 70 ? 1.2 : 0.5;

	return scoreGap * 3 + lowScoreRatio + Math.min(daysSincePractice / 14, 1) * 0.3 + dueBoost;
};

const toSpeakingItem = (item: SessionExerciseItem): SessionExerciseItem => {
	const audioText = item.exercise.audioText ?? item.exercise.correctAnswer;

	return {
		...item,
		exercise: {
			...item.exercise,
			id: `${item.exercise.id}_speaking`,
			type: "speaking",
			question: "Say this phrase out loud",
			audioText,
			options: undefined,
			pairs: undefined,
			sentence: undefined,
			difficulty:
				item.exercise.difficulty === "challenge" ? "challenge" : "practice",
			estimatedSeconds: Math.max(item.exercise.estimatedSeconds ?? 16, 18),
		},
	};
};

const buildReviewItems = (input: GenerateSessionPlanInput): ReviewBuildResult => {
	const reviewLimit = SESSION_LIMITS.review ?? 5;
	const activeLessons = input.lessons.filter((lesson) => !lesson.isCheckpoint);
	const activeLessonIds = new Set(activeLessons.map((lesson) => lesson.id));
	const urgentIds = input.getMostUrgentLessons?.(12) ?? [];
	const activeUrgentIds = urgentIds.filter((lessonId) => activeLessonIds.has(lessonId));
	const urgentLessonIdSet = new Set(activeUrgentIds);
	const fallbackItems = urgentIds
		.filter((lessonId) => activeLessonIds.has(lessonId))
		.flatMap((lessonId) => {
			const lesson = activeLessons.find((candidate) => candidate.id === lessonId);
			return shuffleItems(lesson?.exercises ?? [])
				.slice(0, 2)
				.map((exercise) => ({
					exercise,
					lessonId,
					unitId: lesson?.unitId,
				}));
		});
	const recentAttempts = input.recentAttempts ?? [];
	const languageAttempts = recentAttempts.filter(
		(attempt) => attempt.languageId === input.selectedLanguageId
	);
	const conceptMemory = input.conceptMemory ?? {};
	const pronunciationConceptMemory = input.pronunciationConceptMemory ?? {};
	const recentIncorrectExerciseScore = new Map<string, number>();
	const languageConceptIds = new Set(
		languageAttempts.flatMap((attempt) => attempt.conceptIds)
	);
	const now = Date.now();
	const weakConceptIds = Object.values(conceptMemory)
		.filter((entry) => {
			const concept = getCurriculumConceptById(entry.conceptId);
			return (
				languageConceptIds.has(entry.conceptId) ||
				concept?.languageId === input.selectedLanguageId
			);
		})
		.map((entry) => ({
			conceptId: entry.conceptId,
			score: getConceptUrgencyScore(entry, now),
			lastPracticed: entry.lastPracticed,
		}))
		.filter((entry) => entry.score > 0.55)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return b.lastPracticed - a.lastPracticed;
		})
		.map((entry) => entry.conceptId);
	const weakPronunciationConceptIds = Object.values(pronunciationConceptMemory)
		.filter(
			(entry) =>
				entry.languageId === input.selectedLanguageId &&
				(entry.avgScore < 75 || entry.lastScore < 70 || entry.lowScoreCount > 0)
		)
		.map((entry) => ({
			conceptId: entry.id,
			score: getPronunciationUrgencyScore(entry, now),
			lastPracticed: entry.lastPracticed,
		}))
		.filter((entry) => entry.score > 0.55)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return b.lastPracticed - a.lastPracticed;
		})
		.map((entry) => entry.conceptId);
	const recentMistakeConceptIds = languageAttempts
		.filter((attempt) => !attempt.correct)
		.flatMap((attempt) => attempt.conceptIds);
	const requestedFocusConceptIds = [
		...new Set(input.focusConceptIds ?? []),
	].filter((conceptId) => {
		const concept = getCurriculumConceptById(conceptId);
		return (
			concept?.languageId === input.selectedLanguageId ||
			languageConceptIds.has(conceptId)
		);
	});
	const focusConceptIds = [
		...new Set([
			...requestedFocusConceptIds,
			...weakConceptIds,
			...weakPronunciationConceptIds,
			...recentMistakeConceptIds,
		]),
	].slice(0, 3);

	languageAttempts.forEach((attempt, index) => {
		if (attempt.correct) return;
		const score = Math.max(3 - index * 0.15, 1);
		const existing = recentIncorrectExerciseScore.get(attempt.exerciseId) ?? 0;
		recentIncorrectExerciseScore.set(attempt.exerciseId, Math.max(existing, score));
	});

	const allItems = getExercisesFromLessons(activeLessons);
	const pronunciationCandidateItems = allItems
		.filter((item) => SPEAKING_SOURCE_EXERCISE_TYPES.has(item.exercise.type))
		.map((item) => {
			const { lesson, unit } = getItemContext(item, input.lessons, input.units);
			const conceptIds = buildConceptIds(item.exercise, lesson, unit);
			const hasWeakPronunciationConcept = conceptIds.some((conceptId) =>
				weakPronunciationConceptIds.includes(conceptId)
			);

			return hasWeakPronunciationConcept ? toSpeakingItem(item) : null;
		})
		.filter((item): item is SessionExerciseItem => Boolean(item));
	const candidateItems = [...pronunciationCandidateItems, ...allItems];
	const scoredItems = candidateItems
		.map((item) => {
			const { lesson, unit } = getItemContext(item, input.lessons, input.units);
			const conceptIds = buildConceptIds(item.exercise, lesson, unit);
			const conceptScore = conceptIds.reduce((highest, conceptId) => {
				const focusBoost = focusConceptIds.includes(conceptId) ? 1.1 : 0;
				return Math.max(
					highest,
					getConceptUrgencyScore(conceptMemory[conceptId], now) + focusBoost,
				);
			}, 0);
			const pronunciationScore = conceptIds.reduce((highest, conceptId) => {
				const urgency = getPronunciationUrgencyScore(
					pronunciationConceptMemory[conceptId],
					now
				);
				const speakingBoost =
					urgency > 0 && item.exercise.type === "speaking" ? 1.2 : 0;
				return Math.max(highest, urgency + speakingBoost);
			}, 0);
			const mistakeScore = recentIncorrectExerciseScore.get(item.exercise.id) ?? 0;
			const urgentLessonScore = urgentLessonIdSet.has(item.lessonId ?? "") ? 0.8 : 0;
			const lessonScore = item.lessonId
				? Math.min(input.getForgettingScore?.(item.lessonId) ?? 0, 2)
				: 0;

			return {
				item,
				conceptIds,
				score:
					conceptScore +
					pronunciationScore +
					mistakeScore +
					urgentLessonScore +
					lessonScore,
			};
		})
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score);
	const selectedItems: SessionExerciseItem[] = [];
	const seenExerciseIds = new Set<string>();
	const lessonCounts = new Map<string, number>();

	const addItem = (item: SessionExerciseItem) => {
		const lessonId = item.lessonId ?? "unknown";
		if (seenExerciseIds.has(item.exercise.id)) return false;
		if ((lessonCounts.get(lessonId) ?? 0) >= 2) return false;

		seenExerciseIds.add(item.exercise.id);
		lessonCounts.set(lessonId, (lessonCounts.get(lessonId) ?? 0) + 1);
		selectedItems.push(item);
		return true;
	};

	focusConceptIds.forEach((conceptId) => {
		const bestEntry = scoredItems.find(
			(entry) =>
				entry.conceptIds.includes(conceptId) &&
				!seenExerciseIds.has(entry.item.exercise.id)
		);

		if (bestEntry) {
			addItem(bestEntry.item);
		}
	});

	const languageFallbackItems = shuffleItems(getExercisesFromLessons(activeLessons));

	[
		...scoredItems.map((entry) => entry.item),
		...fallbackItems,
		...languageFallbackItems,
	].forEach((item) => {
		if (selectedItems.length >= reviewLimit) return;
		addItem(item);
	});

	const selectedFocusConceptIds = focusConceptIds.length
		? focusConceptIds
		: [
				...new Set(
					selectedItems.flatMap((item) => {
						const { lesson, unit } = getItemContext(item, input.lessons, input.units);
						return buildConceptIds(item.exercise, lesson, unit);
					})
				),
			].slice(0, 3);

	return {
		items: selectedItems.slice(0, reviewLimit),
		focusConceptIds: selectedFocusConceptIds,
	};
};

const buildPracticeItems = (input: GenerateSessionPlanInput): SessionExerciseItem[] => {
	if (!input.lesson) return [];
	const unitLessons = getUnitLessons(input.lessons, input.lesson.unitId);
	const unitItems = getExercisesFromLessons(unitLessons);

	if (input.intent === "mistakes") {
		const mistakes = input.recentMistakes ?? [];
		return shuffleItems(unitItems.filter((item) => mistakes.includes(item.exercise.id)));
	}

	if (input.intent === "vocabulary") {
		return shuffleItems(
			unitItems.filter((item) => VOCABULARY_EXERCISE_TYPES.has(item.exercise.type))
		);
	}

	if (input.intent === "listening") {
		return shuffleItems(
			unitItems.filter((item) => item.exercise.type === "listen-type")
		);
	}

	if (input.intent === "speaking") {
		return shuffleItems(
			unitItems
				.filter(
					(item) =>
						SPEAKING_SOURCE_EXERCISE_TYPES.has(item.exercise.type) &&
						Boolean(item.exercise.correctAnswer.trim())
				)
				.map(toSpeakingItem)
		);
	}

	return [];
};

export const getRepairExerciseCandidate = (
	input: GetRepairExerciseCandidateInput
): Exercise | null => {
	const currentLesson = input.currentExercise.lessonId
		? input.lessons.find((lesson) => lesson.id === input.currentExercise.lessonId) ??
			getLessonById(input.currentExercise.lessonId)
		: undefined;
	const currentUnit =
		input.units.find((unit) => unit.id === input.currentExercise.unitId) ??
		getUnitForLesson(currentLesson, input.units);
	const currentConceptIds = input.currentExercise.conceptIds?.length
		? input.currentExercise.conceptIds
		: buildConceptIds(input.currentExercise, currentLesson, currentUnit);
	const currentConceptSet = new Set(currentConceptIds);

	if (!currentConceptSet.size) return null;

	const unavailableExerciseIds = new Set([
		input.currentExercise.id,
		...(input.unavailableExerciseIds ?? []),
	]);
	const languageLessons = input.lessons.filter((lesson) => {
		if (lesson.isCheckpoint) return false;
		const unit = input.units.find((candidate) => candidate.id === lesson.unitId);
		return (
			unit?.languageId === input.selectedLanguageId ||
			lesson.unitId.startsWith(`${input.selectedLanguageId}_`)
		);
	});

	const scoredItems = getExercisesFromLessons(languageLessons)
		.filter((item) => !unavailableExerciseIds.has(item.exercise.id))
		.map((item) => {
			const { lesson, unit } = getItemContext(item, input.lessons, input.units);
			const conceptIds = buildConceptIds(item.exercise, lesson, unit);
			const sharedConceptCount = conceptIds.filter((conceptId) =>
				currentConceptSet.has(conceptId)
			).length;

			if (sharedConceptCount === 0) return null;

			const sameLesson = item.lessonId === input.currentExercise.lessonId;
			const sameUnit = item.unitId === input.currentExercise.unitId;
			const sameType = item.exercise.type === input.currentExercise.type;
			const lessonOrder = lesson?.order ?? 999;

			return {
				item,
				score:
					sharedConceptCount * 6 +
					(sameLesson ? 3 : 0) +
					(sameUnit ? 2 : 0) +
					(sameType ? 1 : 0),
				lessonOrder,
			};
		})
		.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			if (a.lessonOrder !== b.lessonOrder) return a.lessonOrder - b.lessonOrder;
			return a.item.exercise.id.localeCompare(b.item.exercise.id);
		});

	const bestItem = scoredItems[0]?.item;
	if (!bestItem) return null;

	const enrichedItem = enrichExercise(bestItem, {
		selectedLanguageId: input.selectedLanguageId,
		intent: input.sessionIntent,
		lessons: input.lessons,
		units: input.units,
		index: 0,
		total: 1,
		exerciseDifficultyMemory: input.exerciseDifficultyMemory,
		conceptDifficultyMemory: input.conceptDifficultyMemory,
	});

	return {
		...enrichedItem.exercise,
		isRepair: true,
		repairForExerciseId: input.currentExercise.id,
		difficulty: "practice",
		difficultyBand: "practice",
	};
};

const resolveSessionIntent = (input: GenerateSessionPlanInput): SessionIntent => {
	if (input.intent === "daily-challenge") return "daily-challenge";
	if (input.intent === "review" || input.mode === "review") return "review";
	if (input.intent === "checkpoint" || input.mode === "checkpoint" || input.isLegacyCheckpoint) {
		return "checkpoint";
	}
	if (input.intent === "mastery" || input.mode === "mastery") return "mastery";
	if (input.mode === "mistakes") return "mistakes";
	if (input.mode === "vocabulary") return "vocabulary";
	if (input.mode === "listening") return "listening";
	if (input.mode === "speaking") return "speaking";
	return "lesson";
};

export const generateSessionPlan = (input: GenerateSessionPlanInput): SessionPlan => {
	const intent = resolveSessionIntent(input);
	const limit = input.isLegacyCheckpoint ? 10 : SESSION_LIMITS[intent] ?? 8;

	let items: SessionExerciseItem[] = [];
	let focusConceptIds: string[] = [];

	if (intent === "checkpoint") {
		items = buildCheckpointItems(input);
	} else if (intent === "review") {
		const reviewPlan = buildReviewItems(input);
		items = reviewPlan.items;
		focusConceptIds = reviewPlan.focusConceptIds;
	} else if (
		intent === "mistakes" ||
		intent === "vocabulary" ||
		intent === "listening" ||
		intent === "speaking"
	) {
		items = buildPracticeItems(input);
	} else if (input.lesson) {
		items = (input.lesson.exercises ?? []).map((exercise) => ({
			exercise,
			lessonId: input.lesson?.id,
			unitId: input.lesson?.unitId,
		}));
	}

	let finalItems = orderItemsByDifficulty(
		finalizeItems(items, input, intent, limit),
		intent
	);
	const finalFocusConceptIds = focusConceptIds.length
		? focusConceptIds
		: [
				...new Set(
					finalItems.flatMap((item) => item.exercise.conceptIds ?? [])
				),
			].slice(0, 3);
	if (intent === "review" && finalFocusConceptIds.length > 0) {
		const priorityFocusExerciseId = items.find((item) =>
			item.exercise.conceptIds?.some((conceptId) =>
				finalFocusConceptIds.includes(conceptId)
			)
		)?.exercise.id;
		const firstFocusIndex = finalItems.findIndex((item) =>
			priorityFocusExerciseId
				? item.exercise.id === priorityFocusExerciseId
				: item.exercise.conceptIds?.some((conceptId) =>
						finalFocusConceptIds.includes(conceptId)
					)
		);

		if (firstFocusIndex > 0) {
			const [focusItem] = finalItems.splice(firstFocusIndex, 1);
			finalItems = [focusItem, ...finalItems];
		}
	}

	return {
		intent,
		items: finalItems,
		exercises: finalItems.map((item) => item.exercise),
		reviewedLessonIds: [
			...new Set(
				finalItems
					.map((item) => item.lessonId)
					.filter((lessonId): lessonId is string => Boolean(lessonId))
			),
		],
		focusConceptIds: finalFocusConceptIds,
		focusLabel: getCurriculumReviewLabel(finalFocusConceptIds) || undefined,
	};
};
