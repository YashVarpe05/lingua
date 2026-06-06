import { languages } from "@/data/languages";
import {
	CurriculumFallbackLessonTemplate,
	getCurriculumFallbackLessonTemplate,
} from "@/data/curriculum";
import { lessons } from "@/data/lessons";
import { units } from "@/data/units";
import { Lesson, Unit } from "@/types/learning";

/**
 * Safely fetches units and lessons for a given language.
 * Automatically generates fallback units and pads lessons up to 6 lessons
 * so that the lessons list matches the design screen height and meets requirements.
 */
export const getLanguageUnitsAndLessons = (
	langId: string,
): { units: Unit[]; lessons: Lesson[] } => {
	const langUnits = units.filter((u) => u.languageId === langId);
	let langLessons: Lesson[] = lessons
		.filter((l) => langUnits.some((u) => u.id === l.unitId))
		.map((lesson) => ({ ...lesson, isCheckpoint: false }));

	let finalUnits = [...langUnits].sort((a, b) => a.order - b.order);
	const selectedLang = languages.find((lang) => lang.id === langId) || {
		name: "Foreign Language",
	};

	if (finalUnits.length === 0) {
		const defaultUnitId = `${langId}_unit_1`;
		finalUnits = [
			{
				id: defaultUnitId,
				languageId: langId,
				title: "Unit 1: First Steps",
				description: `Start learning basic vocabulary, greetings, and useful everyday expressions in ${selectedLang.name}.`,
				order: 1,
			},
		];
	}

	const primaryUnitId = finalUnits[0].id;

	if (langLessons.length < 6) {
		const paddedLessons = [...langLessons];
		const lessonsNeeded = 6 - paddedLessons.length;

		for (let i = 0; i < lessonsNeeded; i++) {
			const orderNum = paddedLessons.length + 1;
			const template = getCurriculumFallbackLessonTemplate(
				langId,
				selectedLang.name,
				orderNum,
			);
			const newLessonId = `${langId}_u1_l${orderNum}`;

			paddedLessons.push({
				id: newLessonId,
				unitId: primaryUnitId,
				title: template.title,
				description: template.description,
				type: template.type,
				order: orderNum,
				xpReward: template.xpReward,
				durationMinutes: template.durationMinutes,
				goals: template.goals,
				activities: getFallbackActivities(newLessonId, template),
				exercises: getFallbackExercises(langId, newLessonId, template),
			});
		}

		langLessons = paddedLessons;
	}

	const checkpointNodes: Lesson[] = finalUnits
		.filter((unit) => unit.checkpointQuiz)
		.map((unit) => {
			const unitLessons = langLessons.filter((lesson) => lesson.unitId === unit.id);
			const maxOrder = unitLessons.reduce(
				(highest, lesson) => Math.max(highest, lesson.order),
				0,
			);

			return {
				id: `${unit.id}_checkpoint_node`,
				unitId: unit.id,
				title: unit.checkpointQuiz?.title ?? `${unit.title} Checkpoint`,
				description: `Prove you can use the key ideas from ${unit.title}.`,
				type: "vocabulary",
				order: maxOrder + 1,
				xpReward: 50,
				durationMinutes: 5,
				goals: [
					"Answer full-sentence checkpoint questions",
					"Use this unit's vocabulary and patterns without hints",
					"Score at least 80% to unlock the next unit",
				],
				activities: [],
				exercises: unit.checkpointQuiz?.exercises ?? [],
				isCheckpoint: true,
			};
		});

	const unitOrderById = new Map(finalUnits.map((unit) => [unit.id, unit.order]));
	langLessons = [...langLessons, ...checkpointNodes].sort((a, b) => {
		const unitDiff =
			(unitOrderById.get(a.unitId) ?? 0) -
			(unitOrderById.get(b.unitId) ?? 0);
		if (unitDiff !== 0) return unitDiff;
		return a.order - b.order;
	});

	return { units: finalUnits, lessons: langLessons };
};

const getFallbackActivities = (
	lessonId: string,
	template: CurriculumFallbackLessonTemplate,
) => {
	const { phrases } = template;

	return [
		{
			id: `${lessonId}_a1`,
			lessonId,
			type: "multiple-choice" as const,
			question: "Which phrase means 'Hello'?",
			options: [phrases.goodbye, phrases.thanks, phrases.hello, phrases.please],
			correctAnswer: phrases.hello,
		},
		{
			id: `${lessonId}_a2`,
			lessonId,
			type: "translate" as const,
			question: `Translate: '${phrases.thanks}'`,
			correctAnswer: "Thank you",
			translationContext: "Use this polite phrase after receiving help or service.",
		},
	];
};

const getFallbackExercises = (
	langId: string,
	lessonId: string,
	template: CurriculumFallbackLessonTemplate,
) => {
	const { phrases, conceptIds } = template;
	const [greetingConcept, secondConcept, thirdConcept] = conceptIds;
	const politeConcept = thirdConcept ?? secondConcept ?? greetingConcept;
	const wordBank = [
		{ value: phrases.hello, label: phrases.hello, pronunciation: phrases.hello, translation: "Hello" },
		{ value: phrases.goodbye, label: phrases.goodbye, pronunciation: phrases.goodbye, translation: "Goodbye" },
		{ value: phrases.thanks, label: phrases.thanks, pronunciation: phrases.thanks, translation: "Thank you" },
		{ value: phrases.please, label: phrases.please, pronunciation: phrases.please, translation: "Please" },
		{ value: phrases.yes, label: phrases.yes, pronunciation: phrases.yes, translation: "Yes" },
		{ value: phrases.no, label: phrases.no, pronunciation: phrases.no, translation: "No" },
		{ value: phrases.intro, label: phrases.intro, pronunciation: phrases.intro, translation: "My name is / introduction" },
		{ value: phrases.water, label: phrases.water, pronunciation: phrases.water, translation: "Water" },
		{ value: phrases.menu, label: phrases.menu, pronunciation: phrases.menu, translation: "Menu" },
		{ value: phrases.bill, label: phrases.bill, pronunciation: phrases.bill, translation: "The bill" },
	];

	return [
		{
			id: `${lessonId}_e1`,
			type: "mcq" as const,
			question: "Which word means 'Hello' in this language?",
			options: [phrases.goodbye, phrases.thanks, phrases.hello, phrases.please],
			correctAnswer: phrases.hello,
			conceptIds: [greetingConcept],
			languageId: langId,
		},
		{
			id: `${lessonId}_e2`,
			type: "fill-in-the-blank" as const,
			question: "Choose the polite word for 'Please'",
			sentence: "___",
			options: [phrases.hello, phrases.please, phrases.thanks, phrases.yes],
			wordBank,
			correctAnswer: phrases.please,
			conceptIds: [politeConcept],
			languageId: langId,
		},
		{
			id: `${lessonId}_e3`,
			type: "matching-pairs" as const,
			question: "Match the words with their meanings",
			pairs: [
				{ id: "p1", left: phrases.hello, right: "Hello" },
				{ id: "p2", left: phrases.thanks, right: "Thank you" },
				{ id: "p3", left: phrases.goodbye, right: "Goodbye" },
				{ id: "p4", left: phrases.please, right: "Please" },
			],
			correctAnswer: "",
			conceptIds,
			languageId: langId,
		},
		{
			id: `${lessonId}_e4`,
			type: "tap-word" as const,
			question: "Select the correct translation for 'Goodbye'",
			options: [phrases.hello, phrases.thanks, phrases.goodbye, phrases.please],
			correctAnswer: phrases.goodbye,
			conceptIds: [greetingConcept],
			languageId: langId,
		},
		{
			id: `${lessonId}_e5`,
			type: "listen-type" as const,
			question: "Listen and type what you hear",
			correctAnswer: phrases.hello,
			audioText: phrases.hello,
			conceptIds: [greetingConcept],
			languageId: langId,
		},
		{
			id: `${lessonId}_e6`,
			type: "mcq" as const,
			question: "What means 'Thank you'?",
			options: [phrases.hello, phrases.thanks, phrases.goodbye, phrases.no],
			correctAnswer: phrases.thanks,
			conceptIds: [secondConcept ?? greetingConcept],
			languageId: langId,
		},
		{
			id: `${lessonId}_e7`,
			type: "fill-in-the-blank" as const,
			question: "Choose the word for 'Yes'",
			sentence: "___",
			options: [phrases.no, phrases.yes, phrases.please, phrases.intro],
			wordBank,
			correctAnswer: phrases.yes,
			conceptIds,
			languageId: langId,
		},
		{
			id: `${lessonId}_e8`,
			type: "listen-type" as const,
			question: "Listen and type what you hear",
			correctAnswer: phrases.thanks,
			audioText: phrases.thanks,
			conceptIds: [secondConcept ?? greetingConcept],
			languageId: langId,
		},
	];
};
