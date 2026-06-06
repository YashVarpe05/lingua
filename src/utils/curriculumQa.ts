import { getCurriculumConceptById } from "@/data/curriculum";
import { languages } from "@/data/languages";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import type { Exercise, Language, Lesson, Unit } from "@/types/learning";

export const CURRICULUM_QA_LANGUAGE_IDS = ["en", "es", "fr", "ja", "de", "ar"] as const;

export type CurriculumQaLanguageId = (typeof CURRICULUM_QA_LANGUAGE_IDS)[number];
export type CurriculumQaSeverity = "fail" | "warn";
export type CurriculumQaStatus = "ready" | "watch" | "needs-work";

export type CurriculumQaFlag = {
	severity: CurriculumQaSeverity;
	scope: "language" | "unit" | "lesson" | "exercise";
	id: string;
	message: string;
};

export type CurriculumQaLessonSummary = {
	id: string;
	title: string;
	unitId: string;
	exerciseCount: number;
	conceptCount: number;
	hasWordBank: boolean;
	hasListening: boolean;
	canDoStatement?: string;
	flags: CurriculumQaFlag[];
};

export type CurriculumQaUnitSummary = {
	id: string;
	title: string;
	order: number;
	lessonCount: number;
	checkpointExerciseCount: number;
	conceptCount: number;
	flags: CurriculumQaFlag[];
	lessons: CurriculumQaLessonSummary[];
};

export type CurriculumQaLanguageSummary = {
	id: string;
	name: string;
	nativeName: string;
	status: CurriculumQaStatus;
	isCoreQaLanguage: boolean;
	usesFallbackContent: boolean;
	unitCount: number;
	lessonCount: number;
	checkpointCount: number;
	exerciseCount: number;
	conceptCount: number;
	failCount: number;
	warnCount: number;
	flags: CurriculumQaFlag[];
	units: CurriculumQaUnitSummary[];
};

export type CurriculumQaReport = {
	generatedAt: string;
	languages: CurriculumQaLanguageSummary[];
	totals: {
		languageCount: number;
		unitCount: number;
		lessonCount: number;
		checkpointCount: number;
		exerciseCount: number;
		failCount: number;
		warnCount: number;
	};
};

const EXPECTED_CORE_UNIT_COUNT = 4;
const EXPECTED_CORE_LESSONS_PER_UNIT = 4;
const EXPECTED_CORE_LESSON_COUNT = 16;
const EXPECTED_EXERCISES_PER_LESSON = 8;
const EXPECTED_CHECKPOINT_COUNT = 4;
const EXPECTED_CHECKPOINT_EXERCISES = 5;
const SCRIPT_HEAVY_LANGUAGE_IDS = new Set(["ja", "ar"]);

const isCoreQaLanguage = (languageId: string): languageId is CurriculumQaLanguageId =>
	CURRICULUM_QA_LANGUAGE_IDS.includes(languageId as CurriculumQaLanguageId);

const addFlag = (
	flags: CurriculumQaFlag[],
	severity: CurriculumQaSeverity,
	scope: CurriculumQaFlag["scope"],
	id: string,
	message: string
) => {
	flags.push({ severity, scope, id, message });
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const getExerciseConceptIds = (exercise: Exercise) => exercise.conceptIds ?? [];

const getLessonConceptIds = (lesson: Lesson) =>
	unique((lesson.exercises ?? []).flatMap(getExerciseConceptIds));

const getUnitConceptIds = (lessons: Lesson[]) =>
	unique(lessons.flatMap(getLessonConceptIds));

const hasWordBankExercise = (lesson: Lesson) =>
	(lesson.exercises ?? []).some(
		(exercise) =>
			exercise.type === "fill-in-the-blank" &&
			Array.isArray(exercise.wordBank) &&
			exercise.wordBank.length > 0
	);

const hasListeningExercise = (lesson: Lesson) =>
	(lesson.exercises ?? []).some((exercise) => exercise.type === "listen-type");

const isGeneratedFallbackLessonId = (lessonId: string, languageId: string) =>
	new RegExp(`^${languageId}_u1_l[1-6]$`).test(lessonId);

const hasTargetScript = (value: string, languageId: string) => {
	if (languageId === "ja") return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
	if (languageId === "ar") return /[\u0600-\u06ff]/.test(value);
	return true;
};

const getExerciseAnswerValues = (exercise: Exercise) =>
	[
		exercise.correctAnswer,
		exercise.audioText,
		...(exercise.wordBank ?? []).flatMap((option) => [
			option.value,
			option.label,
		]),
		...(exercise.pairs ?? []).map((pair) => pair.left),
	].filter((value): value is string => Boolean(value));

const isScriptHeavyExerciseMissingScript = (exercise: Exercise, languageId: string) => {
	if (!SCRIPT_HEAVY_LANGUAGE_IDS.has(languageId)) return false;

	const answerValues = getExerciseAnswerValues(exercise);
	if (answerValues.length === 0) return false;

	return !answerValues.some((value) => hasTargetScript(value, languageId));
};

const getLanguageById = (languageId: string): Language | undefined =>
	languages.find((language) => language.id === languageId);

const getLessonSummary = (
	lesson: Lesson,
	languageId: string,
	isCoreLanguage: boolean
): CurriculumQaLessonSummary => {
	const flags: CurriculumQaFlag[] = [];
	const exercises = lesson.exercises ?? [];
	const conceptIds = getLessonConceptIds(lesson);

	if (isCoreLanguage && exercises.length !== EXPECTED_EXERCISES_PER_LESSON) {
		addFlag(
			flags,
			"fail",
			"lesson",
			lesson.id,
			`Expected ${EXPECTED_EXERCISES_PER_LESSON} exercises, found ${exercises.length}.`
		);
	}

	if (!lesson.canDoStatement) {
		addFlag(flags, "warn", "lesson", lesson.id, "Missing can-do statement.");
	}

	if (!hasWordBankExercise(lesson)) {
		addFlag(flags, "fail", "lesson", lesson.id, "Missing fill-in word-bank exercise.");
	}

	if (!hasListeningExercise(lesson)) {
		addFlag(flags, "fail", "lesson", lesson.id, "Missing listening exercise.");
	}

	exercises.forEach((exercise) => {
		if (!exercise.conceptIds?.length) {
			addFlag(
				flags,
				"fail",
				"exercise",
				exercise.id,
				"Missing explicit concept IDs."
			);
		}

		if (isScriptHeavyExerciseMissingScript(exercise, languageId)) {
			addFlag(
				flags,
				"fail",
				"exercise",
				exercise.id,
				"Script-heavy language exercise appears romanized-only."
			);
		}
	});

	conceptIds.forEach((conceptId) => {
		if (!getCurriculumConceptById(conceptId)) {
			addFlag(
				flags,
				"warn",
				"lesson",
				lesson.id,
				`Concept metadata missing for ${conceptId}.`
			);
		}
	});

	return {
		id: lesson.id,
		title: lesson.title,
		unitId: lesson.unitId,
		exerciseCount: exercises.length,
		conceptCount: conceptIds.length,
		hasWordBank: hasWordBankExercise(lesson),
		hasListening: hasListeningExercise(lesson),
		canDoStatement: lesson.canDoStatement,
		flags,
	};
};

const getUnitSummary = (
	unit: Unit,
	unitLessons: Lesson[],
	languageId: string,
	isCoreLanguage: boolean
): CurriculumQaUnitSummary => {
	const flags: CurriculumQaFlag[] = [];
	const checkpointExerciseCount = unit.checkpointQuiz?.exercises.length ?? 0;
	const lessonSummaries = unitLessons.map((lesson) =>
		getLessonSummary(lesson, languageId, isCoreLanguage)
	);
	const conceptCount = getUnitConceptIds(unitLessons).length;

	if (isCoreLanguage && unitLessons.length !== EXPECTED_CORE_LESSONS_PER_UNIT) {
		addFlag(
			flags,
			"fail",
			"unit",
			unit.id,
			`Expected ${EXPECTED_CORE_LESSONS_PER_UNIT} lessons, found ${unitLessons.length}.`
		);
	}

	if (isCoreLanguage && checkpointExerciseCount !== EXPECTED_CHECKPOINT_EXERCISES) {
		addFlag(
			flags,
			"fail",
			"unit",
			unit.id,
			`Expected ${EXPECTED_CHECKPOINT_EXERCISES} checkpoint exercises, found ${checkpointExerciseCount}.`
		);
	}

	return {
		id: unit.id,
		title: unit.title,
		order: unit.order,
		lessonCount: unitLessons.length,
		checkpointExerciseCount,
		conceptCount,
		flags,
		lessons: lessonSummaries,
	};
};

const getStatus = (failCount: number, warnCount: number): CurriculumQaStatus => {
	if (failCount > 0) return "needs-work";
	if (warnCount > 0) return "watch";
	return "ready";
};

export const getCurriculumQaLanguageSummary = (
	languageId: string
): CurriculumQaLanguageSummary => {
	const language = getLanguageById(languageId);
	const { units, lessons } = getLanguageUnitsAndLessons(languageId);
	const normalLessons = lessons.filter((lesson) => !lesson.isCheckpoint);
	const isCoreLanguage = isCoreQaLanguage(languageId);
	const usesFallbackContent = normalLessons.some((lesson) =>
		isGeneratedFallbackLessonId(lesson.id, languageId)
	) && units.length < EXPECTED_CORE_UNIT_COUNT;
	const unitSummaries = units.map((unit) =>
		getUnitSummary(
			unit,
			normalLessons.filter((lesson) => lesson.unitId === unit.id),
			languageId,
			isCoreLanguage
		)
	);
	const languageFlags: CurriculumQaFlag[] = [];

	if (isCoreLanguage && units.length !== EXPECTED_CORE_UNIT_COUNT) {
		addFlag(
			languageFlags,
			"fail",
			"language",
			languageId,
			`Expected ${EXPECTED_CORE_UNIT_COUNT} units, found ${units.length}.`
		);
	}

	if (isCoreLanguage && normalLessons.length !== EXPECTED_CORE_LESSON_COUNT) {
		addFlag(
			languageFlags,
			"fail",
			"language",
			languageId,
			`Expected ${EXPECTED_CORE_LESSON_COUNT} lessons, found ${normalLessons.length}.`
		);
	}

	const checkpointCount = units.filter((unit) => unit.checkpointQuiz).length;
	if (isCoreLanguage && checkpointCount !== EXPECTED_CHECKPOINT_COUNT) {
		addFlag(
			languageFlags,
			"fail",
			"language",
			languageId,
			`Expected ${EXPECTED_CHECKPOINT_COUNT} checkpoints, found ${checkpointCount}.`
		);
	}

	if (usesFallbackContent) {
		addFlag(
			languageFlags,
			isCoreLanguage ? "fail" : "warn",
			"language",
			languageId,
			"Uses fallback-generated lesson content."
		);
	}

	const flags = [
		...languageFlags,
		...unitSummaries.flatMap((unit) => unit.flags),
		...unitSummaries.flatMap((unit) =>
			unit.lessons.flatMap((lesson) => lesson.flags)
		),
	];
	const failCount = flags.filter((flag) => flag.severity === "fail").length;
	const warnCount = flags.filter((flag) => flag.severity === "warn").length;
	const conceptCount = unique(normalLessons.flatMap(getLessonConceptIds)).length;

	return {
		id: languageId,
		name: language?.name ?? languageId.toUpperCase(),
		nativeName: language?.nativeName ?? languageId,
		status: getStatus(failCount, warnCount),
		isCoreQaLanguage: isCoreLanguage,
		usesFallbackContent,
		unitCount: units.length,
		lessonCount: normalLessons.length,
		checkpointCount,
		exerciseCount: normalLessons.reduce(
			(total, lesson) => total + (lesson.exercises?.length ?? 0),
			0
		),
		conceptCount,
		failCount,
		warnCount,
		flags,
		units: unitSummaries,
	};
};

export const buildCurriculumQaReport = (
	languageIds: readonly string[] = CURRICULUM_QA_LANGUAGE_IDS
): CurriculumQaReport => {
	const summaries = languageIds.map(getCurriculumQaLanguageSummary);

	return {
		generatedAt: new Date().toISOString(),
		languages: summaries,
		totals: {
			languageCount: summaries.length,
			unitCount: summaries.reduce((total, language) => total + language.unitCount, 0),
			lessonCount: summaries.reduce((total, language) => total + language.lessonCount, 0),
			checkpointCount: summaries.reduce(
				(total, language) => total + language.checkpointCount,
				0
			),
			exerciseCount: summaries.reduce(
				(total, language) => total + language.exerciseCount,
				0
			),
			failCount: summaries.reduce((total, language) => total + language.failCount, 0),
			warnCount: summaries.reduce((total, language) => total + language.warnCount, 0),
		},
	};
};
