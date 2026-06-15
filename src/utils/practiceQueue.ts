import {
	getCurriculumConceptById,
	getCurriculumConceptTitle,
	getCurriculumReviewLabel,
} from "@/data/curriculum";
import { getLessonById } from "@/data/lessons";
import type {
	ConceptMemoryEntry,
	ExerciseAttempt,
	Lesson,
	PronunciationMemoryEntry,
	Unit,
} from "@/types/learning";
import {
	hasFreshSuccessfulFocusedReview,
	isAttemptRepairedByFocusedReview,
} from "@/utils/conceptReview";

export type PracticeHubConcept = {
	conceptId: string;
	title: string;
	description: string;
	correctCount: number;
	incorrectCount: number;
	recallScore: number;
	reason: "recent-mistake" | "due" | "weak";
};

export type PracticeHubMistake = {
	exerciseId: string;
	question: string;
	lessonTitle: string;
	conceptTitle: string;
	createdAt: number;
};

export type PracticeHubLesson = {
	lessonId: string;
	title: string;
	unitTitle: string;
	forgettingScore: number;
};

export type PracticeHubPronunciationConcept = {
	conceptId: string;
	title: string;
	avgScore: number;
	lastScore: number;
	lessonId?: string;
	lastPracticed: number;
};

export type PracticeQueueOverview = {
	focusConceptIds: string[];
	focusLabel: string;
	dueConcepts: PracticeHubConcept[];
	recentMistakes: PracticeHubMistake[];
	weakLessons: PracticeHubLesson[];
	pronunciationConcepts: PracticeHubPronunciationConcept[];
	dueConceptCount: number;
	duePronunciationConceptCount: number;
	speakingFocusLabel: string;
	summary: string;
	primaryActionTitle: string;
	allCaughtUp: boolean;
};

type PracticeQueueInput = {
	selectedLanguageId: string;
	lessons: Lesson[];
	units: Unit[];
	recentAttempts: ExerciseAttempt[];
	conceptMemory: Record<string, ConceptMemoryEntry>;
	pronunciationConceptMemory?: Record<string, PronunciationMemoryEntry>;
	explicitFocusConceptIds?: string[];
	getConceptRecallScore: (conceptId: string) => number;
	getForgettingScore: (lessonId: string) => number;
};

export const parseFocusConceptIds = (value?: string | string[]) => {
	const rawValue = Array.isArray(value) ? value.join(",") : value;
	if (!rawValue) return [];

	return [
		...new Set(
			rawValue
				.split(",")
				.map((item) => decodeURIComponent(item).trim())
				.filter(Boolean)
		),
	];
};

const uniqueIds = (ids: (string | undefined)[]) =>
	[...new Set(ids.filter((id): id is string => Boolean(id)))];

const getLessonForAttempt = (
	attempt: ExerciseAttempt,
	lessons: Lesson[],
	selectedLanguageId: string
) => {
	if (attempt.lessonId) {
		const activeLesson = lessons.find((lesson) => lesson.id === attempt.lessonId);
		if (activeLesson) return activeLesson;

		const savedLesson = getLessonById(attempt.lessonId);
		if (savedLesson?.unitId.startsWith(`${selectedLanguageId}_`)) {
			return savedLesson;
		}
	}

	return lessons.find((lesson) =>
		lesson.exercises?.some((exercise) => exercise.id === attempt.exerciseId)
	);
};

const getConceptTitle = (conceptId: string) =>
	getCurriculumConceptTitle(conceptId) ?? conceptId.replace(/[_:-]+/g, " ");

const conceptBelongsToLanguage = (
	conceptId: string,
	selectedLanguageId: string,
	languageAttemptConceptIds: Set<string>
) => {
	const concept = getCurriculumConceptById(conceptId);
	return (
		concept?.languageId === selectedLanguageId ||
		languageAttemptConceptIds.has(conceptId)
	);
};

export const getPracticeQueueOverview = ({
	selectedLanguageId,
	lessons,
	units,
	recentAttempts,
	conceptMemory,
	pronunciationConceptMemory = {},
	explicitFocusConceptIds = [],
	getConceptRecallScore,
	getForgettingScore,
}: PracticeQueueInput): PracticeQueueOverview => {
	const activeLessons = lessons.filter((lesson) => !lesson.isCheckpoint);
	const lessonIds = new Set(activeLessons.map((lesson) => lesson.id));
	const languageAttempts = recentAttempts.filter(
		(attempt) => attempt.languageId === selectedLanguageId
	);
	const languageAttemptConceptIds = new Set(
		languageAttempts.flatMap((attempt) => attempt.conceptIds)
	);
	const recentMistakeAttempts = languageAttempts.filter(
		(attempt) =>
			!attempt.correct && !isAttemptRepairedByFocusedReview(attempt, conceptMemory)
	);
	const recentMistakes = recentMistakeAttempts
		.map((attempt): PracticeHubMistake | null => {
			const lesson = getLessonForAttempt(attempt, activeLessons, selectedLanguageId);
			const conceptTitle = attempt.conceptIds[0]
				? getConceptTitle(attempt.conceptIds[0])
				: "Recent pattern";

			if (!lesson) return null;

			return {
				exerciseId: attempt.exerciseId,
				question: attempt.correctAnswer
					? `Correct answer: ${attempt.correctAnswer}`
					: "Practice the missed exercise again",
				lessonTitle: lesson.title,
				conceptTitle,
				createdAt: attempt.createdAt,
			};
		})
		.filter((item): item is PracticeHubMistake => Boolean(item))
		.filter((item, index, list) =>
			list.findIndex((candidate) => candidate.exerciseId === item.exerciseId) === index
		)
		.slice(0, 3);

	const dueConcepts = Object.values(conceptMemory)
		.filter((entry) =>
			conceptBelongsToLanguage(
				entry.conceptId,
				selectedLanguageId,
				languageAttemptConceptIds
			)
		)
		.filter((entry) => !hasFreshSuccessfulFocusedReview(entry))
		.map((entry): PracticeHubConcept => {
			const recallScore = getConceptRecallScore(entry.conceptId);
			const concept = getCurriculumConceptById(entry.conceptId);
			const hasRecentMistake = recentMistakeAttempts.some((attempt) =>
				attempt.conceptIds.includes(entry.conceptId)
			);
			const reason =
				hasRecentMistake
					? "recent-mistake"
					: recallScore < 0.65 || entry.incorrectCount > entry.correctCount
						? "due"
						: "weak";

			return {
				conceptId: entry.conceptId,
				title: getConceptTitle(entry.conceptId),
				description:
					concept?.reviewPrompt ??
					concept?.description ??
					"Practice this pattern again before it fades.",
				correctCount: entry.correctCount,
				incorrectCount: entry.incorrectCount,
				recallScore,
				reason,
			};
		})
		.filter(
			(concept) =>
				concept.reason !== "weak" ||
				concept.recallScore < 0.85 ||
				concept.incorrectCount > 0
		)
		.sort((a, b) => {
			const aRecent = a.reason === "recent-mistake" ? 1 : 0;
			const bRecent = b.reason === "recent-mistake" ? 1 : 0;
			if (aRecent !== bRecent) return bRecent - aRecent;
			if (a.recallScore !== b.recallScore) return a.recallScore - b.recallScore;
			return b.incorrectCount - a.incorrectCount;
		})
		.slice(0, 5);

	const weakLessons = activeLessons
		.map((lesson): PracticeHubLesson => {
			const unit = units.find((item) => item.id === lesson.unitId);
			return {
				lessonId: lesson.id,
				title: lesson.title,
				unitTitle: unit?.title ?? "Current unit",
				forgettingScore: getForgettingScore(lesson.id),
			};
		})
		.filter((lesson) => lessonIds.has(lesson.lessonId) && lesson.forgettingScore > 0.5)
		.sort((a, b) => b.forgettingScore - a.forgettingScore)
		.slice(0, 3);
	const pronunciationConcepts = Object.values(pronunciationConceptMemory)
		.filter(
			(entry) =>
				entry.languageId === selectedLanguageId &&
				(entry.avgScore < 75 || entry.lastScore < 70 || entry.lowScoreCount > 0)
		)
		.map((entry): PracticeHubPronunciationConcept => ({
			conceptId: entry.id,
			title: getConceptTitle(entry.id),
			avgScore: entry.avgScore,
			lastScore: entry.lastScore,
			lessonId: entry.lessonId,
			lastPracticed: entry.lastPracticed,
		}))
		.sort((a, b) => {
			if (a.avgScore !== b.avgScore) return a.avgScore - b.avgScore;
			return b.lastPracticed - a.lastPracticed;
		})
		.slice(0, 3);

	const focusConceptIds = uniqueIds([
		...explicitFocusConceptIds,
		...recentMistakeAttempts.flatMap((attempt) => attempt.conceptIds),
		...dueConcepts.map((concept) => concept.conceptId),
		...pronunciationConcepts.map((concept) => concept.conceptId),
	]).slice(0, 3);
	const focusLabel = getCurriculumReviewLabel(focusConceptIds);
	const speakingFocusLabel = getCurriculumReviewLabel(
		pronunciationConcepts.map((concept) => concept.conceptId).slice(0, 3)
	);
	const dueConceptCount = dueConcepts.filter(
		(concept) => concept.reason !== "weak"
	).length;
	const duePronunciationConceptCount = pronunciationConcepts.length;
	const allCaughtUp =
		dueConceptCount === 0 &&
		recentMistakes.length === 0 &&
		weakLessons.length === 0 &&
		duePronunciationConceptCount === 0;
	const summary = allCaughtUp
		? "All caught up. Start a light review to keep memory fresh."
		: focusLabel
			? `Focus: ${focusLabel}`
			: "Smart review will mix weak concepts and older lessons.";

	return {
		focusConceptIds,
		focusLabel,
		dueConcepts,
		recentMistakes,
		weakLessons,
		pronunciationConcepts,
		dueConceptCount,
		duePronunciationConceptCount,
		speakingFocusLabel,
		summary,
		primaryActionTitle: allCaughtUp ? "Start Light Review" : "Start Smart Review",
		allCaughtUp,
	};
};
