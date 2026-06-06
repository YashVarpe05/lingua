const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const ROOT = process.cwd();
const SCAN_ROOTS = [
	"README.md",
	"docs",
	"src/app",
	"src/components",
	"src/data",
	"src/lib",
	"src/store",
	"src/utils",
];
const SCAN_EXTENSIONS = new Set([".md", ".ts", ".tsx"]);
const SKIP_SCAN_FILES = new Set(["AGENTS.MD", "AGENTS.md"]);

const DATA_FILES = {
	languages: "src/data/languages.ts",
	lessons: "src/data/lessons.ts",
	units: "src/data/units.ts",
	curriculum: "src/data/curriculum.ts",
};

const walkScanFiles = (relativePath, files = []) => {
	const fullPath = path.join(ROOT, relativePath);
	if (!fs.existsSync(fullPath)) return files;

	const stat = fs.statSync(fullPath);
	if (stat.isFile()) {
		if (
			SCAN_EXTENSIONS.has(path.extname(fullPath)) &&
			!SKIP_SCAN_FILES.has(path.basename(fullPath))
		) {
			files.push(relativePath);
		}
		return files;
	}

	fs.readdirSync(fullPath).forEach((entry) => {
		walkScanFiles(path.join(relativePath, entry), files);
	});

	return files;
};

const FILES_TO_SCAN = Array.from(
	new Set(SCAN_ROOTS.flatMap((root) => walkScanFiles(root)))
).sort();

const EXERCISE_TYPES = new Set([
	"mcq",
	"fill-in-the-blank",
	"matching-pairs",
	"tap-word",
	"listen-type",
]);

const REQUIRED_LESSON_EXERCISE_TYPES = new Set([
	"mcq",
	"fill-in-the-blank",
	"matching-pairs",
	"tap-word",
	"listen-type",
]);

const CORE_A1_LANGUAGE_IDS = new Set(["en", "es", "fr", "ja", "de", "ar"]);
const CORE_A1_SCRIPT_HEAVY_LANGUAGE_IDS = new Set(["ja", "ar"]);
const CORE_A1_UNIT_COUNT = 4;
const CORE_A1_LESSONS_PER_UNIT = 4;
const CORE_A1_EXERCISES_PER_LESSON = 8;
const CORE_A1_CHECKPOINT_EXERCISES = 5;

const MOJIBAKE_PATTERNS = [
	{ name: "latin1-decoded UTF-8 lead C2", regex: /\u00c2./g },
	{ name: "latin1-decoded UTF-8 lead C3", regex: /\u00c3./g },
	{ name: "broken CJK UTF-8", regex: /\u00e3[\u0080-\u00bf]/g },
	{ name: "broken Arabic/Cyrillic UTF-8", regex: /[\u00d8\u00d9][\u0080-\u00bf]/g },
	{ name: "broken punctuation UTF-8", regex: /\u00e2[\u0080-\u00bf]/g },
	{ name: "broken emoji UTF-8", regex: /\u00f0[\u0080-\u00bf]/g },
	{ name: "replacement character", regex: /\ufffd/g },
];

const CONTENT_REGRESSIONS = [
	"Me llamo Maria",
	"I am Maria",
	"Yo ___ Maria",
	"El menu",
	"Un cafe",
	"Quiero cafe",
	"Buenos dias",
	"te verde",
	"La cuenta esta",
	"La comida esta",
	"El cafe esta",
	"La mesa esta aqui",
	"Podemos tener el menu",
	"Gracias por el cafe",
	"Como estas",
	"Como te llamas",
	"S'il vous plait",
	"Ich heisse",
	"Ola",
	"Nao",
	"Meu nome e",
];

const getLineNumber = (text, index) => text.slice(0, index).split(/\r?\n/).length;

const addIssue = (issues, file, type, value, line) => {
	issues.push({ file, line, type, value });
};

const isNonEmptyString = (value) =>
	typeof value === "string" && value.trim().length > 0;

const tsModuleCache = new Map();

const resolveTsImport = (fromFile, moduleName) => {
	if (moduleName.startsWith("@/")) {
		return path.join("src", `${moduleName.slice(2)}.ts`);
	}
	if (moduleName.startsWith(".")) {
		const resolved = path.resolve(path.dirname(fromFile), moduleName);
		return path.relative(ROOT, `${resolved}.ts`);
	}
	return undefined;
};

const loadTsExports = (relativeFile) => {
	const normalizedRelativeFile = relativeFile.replace(/\\/g, "/");
	if (tsModuleCache.has(normalizedRelativeFile)) {
		return tsModuleCache.get(normalizedRelativeFile).exports;
	}

	const filePath = path.join(ROOT, normalizedRelativeFile);
	const source = fs.readFileSync(filePath, "utf8");
	const output = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
		fileName: filePath,
	}).outputText;
	const module = { exports: {} };
	tsModuleCache.set(normalizedRelativeFile, module);
	const sandbox = {
		exports: module.exports,
		module,
		require: (moduleName) => {
			const resolved = resolveTsImport(filePath, moduleName);
			if (resolved) return loadTsExports(resolved);
			throw new Error(`Unexpected runtime import in ${normalizedRelativeFile}: ${moduleName}`);
		},
	};

	vm.runInNewContext(output, sandbox, { filename: normalizedRelativeFile });
	return module.exports;
};

const assertArray = (issues, file, name, value) => {
	if (Array.isArray(value)) return true;
	addIssue(issues, file, "missing export array", name);
	return false;
};

const assertUniqueIds = (issues, file, label, items) => {
	const seen = new Map();
	for (const item of items) {
		const id = item?.id;
		if (!isNonEmptyString(id)) {
			addIssue(issues, file, "missing id", label);
			continue;
		}
		if (seen.has(id)) {
			addIssue(issues, file, "duplicate id", `${label}: ${id}`);
		}
		seen.set(id, true);
	}
};

const isGeneratedFallbackLessonId = (lessonId, languageId) =>
	new RegExp(`^${languageId}_u1_l[1-6]$`).test(lessonId);

const SCRIPT_HEAVY_LANGUAGE_IDS = new Set(["ar", "hi", "ja", "ko", "ru", "th", "uk", "zh"]);
const FALLBACK_PHRASE_KEYS = [
	"hello",
	"goodbye",
	"thanks",
	"please",
	"yes",
	"no",
	"intro",
	"water",
	"menu",
	"bill",
];
const GENERIC_ENGLISH_FALLBACK_VALUES = new Set([
	"Hello",
	"Goodbye",
	"Thank you",
	"Please",
	"Yes",
	"No",
	"My name is",
	"Water",
	"Menu",
	"The bill",
]);

const hasNonAscii = (value) => /[^\x00-\x7F]/.test(value);

const hasLanguageScript = (value, languageId) => {
	if (!isNonEmptyString(value)) return false;
	if (languageId === "ja") return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
	if (languageId === "ar") return /[\u0600-\u06ff]/.test(value);
	return hasNonAscii(value);
};

const isCoreA1Unit = (unit) =>
	CORE_A1_LANGUAGE_IDS.has(unit?.languageId) &&
	new RegExp(`^${unit.languageId}_unit_[1-${CORE_A1_UNIT_COUNT}]$`).test(unit?.id ?? "");

const isCoreA1Lesson = (lesson, unit) =>
	CORE_A1_LANGUAGE_IDS.has(unit?.languageId) &&
	new RegExp(
		`^${unit.languageId}_u[1-${CORE_A1_UNIT_COUNT}]_l[1-${CORE_A1_LESSONS_PER_UNIT}]$`
	).test(lesson?.id ?? "");

const getLessonPlanConceptIds = (plan) => [
	...(plan?.primaryConceptIds ?? []),
	...(plan?.supportConceptIds ?? []),
];

const getExerciseSearchText = (exercise) =>
	[
		exercise?.question,
		exercise?.correctAnswer,
		exercise?.sentence,
		exercise?.audioText,
		...(exercise?.options ?? []),
		...(exercise?.acceptedAnswers ?? []),
		...(exercise?.wordBank ?? []).flatMap((option) => [
			option?.value,
			option?.label,
			option?.pronunciation,
			option?.translation,
		]),
		...(exercise?.pairs ?? []).flatMap((pair) => [pair?.left, pair?.right]),
	]
		.filter(isNonEmptyString)
		.join(" ")
		.normalize("NFKC")
		.toLowerCase();

const validateExplicitWordBank = (issues, file, exercise, label) => {
	if (!Array.isArray(exercise.wordBank) || exercise.wordBank.length === 0) return;

	if (exercise.wordBank.length < 4) {
		addIssue(issues, file, "wordBank needs at least 4 options", label);
	}

	const seenValues = new Set();
	for (const option of exercise.wordBank) {
		if (!isNonEmptyString(option?.value)) {
			addIssue(issues, file, "wordBank option missing value", label);
			continue;
		}
		if (seenValues.has(option.value)) {
			addIssue(issues, file, "duplicate wordBank option", `${label}:${option.value}`);
		}
		seenValues.add(option.value);

		if (!isNonEmptyString(option.label)) {
			addIssue(issues, file, "wordBank option missing label", `${label}:${option.value}`);
		}
		if (!isNonEmptyString(option.pronunciation)) {
			addIssue(issues, file, "wordBank option missing pronunciation", `${label}:${option.value}`);
		}
		if (!isNonEmptyString(option.translation)) {
			addIssue(issues, file, "wordBank option missing translation", `${label}:${option.value}`);
		}
	}
};

const validateExercise = (issues, file, exercise, context) => {
	const label = `${context}:${exercise?.id ?? "missing-id"}`;

	if (!isNonEmptyString(exercise?.id)) {
		addIssue(issues, file, "exercise missing id", context);
	}
	if (!EXERCISE_TYPES.has(exercise?.type)) {
		addIssue(issues, file, "invalid exercise type", label);
	}
	if (!isNonEmptyString(exercise?.question)) {
		addIssue(issues, file, "exercise missing question", label);
	}
	if (exercise?.type !== "matching-pairs" && !isNonEmptyString(exercise?.correctAnswer)) {
		addIssue(issues, file, "exercise missing correctAnswer", label);
	}

	if (exercise?.lessonId && exercise.lessonId !== context.lessonId) {
		addIssue(issues, file, "exercise lessonId mismatch", label);
	}
	if (exercise?.unitId && exercise.unitId !== context.unitId) {
		addIssue(issues, file, "exercise unitId mismatch", label);
	}
	if (exercise?.languageId && exercise.languageId !== context.languageId) {
		addIssue(issues, file, "exercise languageId mismatch", label);
	}

	if (exercise?.type === "mcq" || exercise?.type === "tap-word") {
		if (!Array.isArray(exercise.options) || exercise.options.length < 2) {
			addIssue(issues, file, "choice exercise needs options", label);
		} else if (!exercise.options.includes(exercise.correctAnswer)) {
			addIssue(issues, file, "correct answer missing from options", label);
		}
	}

	if (exercise?.type === "fill-in-the-blank") {
		if (!isNonEmptyString(exercise.sentence) && !isNonEmptyString(exercise.question)) {
			addIssue(issues, file, "fill-in exercise needs sentence or question", label);
		}
		if (isNonEmptyString(exercise.sentence) && !exercise.sentence.includes("___")) {
			addIssue(issues, file, "fill-in sentence missing blank marker", label);
		}
		if (
			context.requireExplicitWordBank &&
			(!Array.isArray(exercise.wordBank) || exercise.wordBank.length === 0)
		) {
			addIssue(issues, file, "fill-in exercise needs explicit wordBank", label);
		}
		if (
			Array.isArray(exercise.wordBank) &&
			exercise.wordBank.length > 0 &&
			!exercise.wordBank.some((option) => option?.value === exercise.correctAnswer)
		) {
			addIssue(issues, file, "wordBank missing correct answer", label);
		}
		validateExplicitWordBank(issues, file, exercise, label);
	}

	if (exercise?.type === "matching-pairs") {
		if (!Array.isArray(exercise.pairs) || exercise.pairs.length < 2) {
			addIssue(issues, file, "matching exercise needs pairs", label);
		} else {
			const pairIds = new Set();
			for (const pair of exercise.pairs) {
				if (!isNonEmptyString(pair?.id) || pairIds.has(pair.id)) {
					addIssue(issues, file, "invalid matching pair id", label);
				}
				pairIds.add(pair.id);
				if (!isNonEmptyString(pair?.left) || !isNonEmptyString(pair?.right)) {
					addIssue(issues, file, "matching pair needs left and right", label);
				}
			}
		}
	}

	if (exercise?.type === "listen-type" && !isNonEmptyString(exercise.audioText)) {
		addIssue(issues, file, "listen-type missing audioText", label);
	}
};

const validateCoreScriptExercise = (issues, file, exercise, languageId, label) => {
	if (!CORE_A1_SCRIPT_HEAVY_LANGUAGE_IDS.has(languageId)) return;

	if (
		exercise?.type !== "matching-pairs" &&
		isNonEmptyString(exercise?.correctAnswer) &&
		!hasLanguageScript(exercise.correctAnswer, languageId)
	) {
		addIssue(issues, file, "core answer should use target script", label);
	}

	if (exercise?.type === "fill-in-the-blank" && Array.isArray(exercise.wordBank)) {
		const correctOption = exercise.wordBank.find(
			(option) => option?.value === exercise.correctAnswer
		);
		if (!correctOption || !hasLanguageScript(correctOption.value, languageId)) {
			addIssue(issues, file, "core wordBank correct tile should use target script", label);
		}
		if (correctOption && !hasLanguageScript(correctOption.label, languageId)) {
			addIssue(issues, file, "core wordBank label should use target script", label);
		}
	}

	if (exercise?.type === "matching-pairs" && Array.isArray(exercise.pairs)) {
		for (const pair of exercise.pairs) {
			if (!hasLanguageScript(pair?.left, languageId)) {
				addIssue(issues, file, "core matching pair should use target script", label);
			}
		}
	}
};

const normalizeSelectableValue = (value) =>
	String(value ?? "")
		.normalize("NFKC")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

const getSelectableValuesFromExercise = (exercise) => {
	const values = [
		...(exercise?.wordBank ?? []).map((option) => option?.value),
		...(exercise?.options ?? []),
	];

	if (exercise?.type === "fill-in-the-blank" || exercise?.type === "listen-type") {
		values.push(exercise.correctAnswer);
	}
	if (exercise?.type === "matching-pairs") {
		values.push(...(exercise?.pairs ?? []).map((pair) => pair?.left));
	}

	return values.filter(isNonEmptyString);
};

const validateSelectableFillBlankBank = (
	issues,
	file,
	exercise,
	lesson,
	languageLessons,
	label
) => {
	if (exercise?.type !== "fill-in-the-blank") return;

	const values = [
		exercise.correctAnswer,
		...getSelectableValuesFromExercise(exercise),
		...(lesson?.exercises ?? []).flatMap(getSelectableValuesFromExercise),
		...languageLessons.flatMap((item) =>
			(item.exercises ?? []).flatMap(getSelectableValuesFromExercise)
		),
	];
	const selectableValues = new Set(
		values
			.filter(isNonEmptyString)
			.map(normalizeSelectableValue)
			.filter(Boolean)
	);

	if (!selectableValues.has(normalizeSelectableValue(exercise.correctAnswer))) {
		addIssue(issues, file, "fill-in generated bank missing correct answer", label);
	}
	if (selectableValues.size < 4) {
		addIssue(issues, file, "fill-in generated bank has too few selectable options", label);
	}
};

const validateDataGraph = (issues) => {
	const { languages } = loadTsExports(DATA_FILES.languages);
	const { units } = loadTsExports(DATA_FILES.units);
	const { lessons } = loadTsExports(DATA_FILES.lessons);
	const {
		curriculumConcepts,
		curriculumLessonPlans,
		getCurriculumFallbackLessonTemplate,
	} = loadTsExports(DATA_FILES.curriculum);

	if (!assertArray(issues, DATA_FILES.languages, "languages", languages)) return;
	if (!assertArray(issues, DATA_FILES.units, "units", units)) return;
	if (!assertArray(issues, DATA_FILES.lessons, "lessons", lessons)) return;
	if (!assertArray(issues, DATA_FILES.curriculum, "curriculumConcepts", curriculumConcepts)) return;
	if (!assertArray(issues, DATA_FILES.curriculum, "curriculumLessonPlans", curriculumLessonPlans)) return;

	assertUniqueIds(issues, DATA_FILES.languages, "language", languages);
	assertUniqueIds(issues, DATA_FILES.units, "unit", units);
	assertUniqueIds(issues, DATA_FILES.lessons, "lesson", lessons);
	assertUniqueIds(issues, DATA_FILES.curriculum, "concept", curriculumConcepts);
	assertUniqueIds(
		issues,
		DATA_FILES.curriculum,
		"lesson plan",
		curriculumLessonPlans.map((plan) => ({ id: plan.lessonId }))
	);

	const languageIds = new Set(languages.map((language) => language.id));
	const unitById = new Map(units.map((unit) => [unit.id, unit]));
	const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
	const conceptById = new Map(curriculumConcepts.map((concept) => [concept.id, concept]));
	const lessonPlanByLessonId = new Map(
		curriculumLessonPlans.map((plan) => [plan.lessonId, plan])
	);
	const allExerciseIds = new Set();

	for (const languageId of CORE_A1_LANGUAGE_IDS) {
		const label = `coreA1:${languageId}`;
		if (!languageIds.has(languageId)) {
			addIssue(issues, DATA_FILES.languages, "core A1 language missing", label);
			continue;
		}

		const expectedUnitIds = Array.from(
			{ length: CORE_A1_UNIT_COUNT },
			(_, index) => `${languageId}_unit_${index + 1}`
		);
		const expectedLessonIds = expectedUnitIds.flatMap((_, unitIndex) =>
			Array.from(
				{ length: CORE_A1_LESSONS_PER_UNIT },
				(__, lessonIndex) => `${languageId}_u${unitIndex + 1}_l${lessonIndex + 1}`
			)
		);
		const coreUnits = expectedUnitIds.map((unitId) => unitById.get(unitId)).filter(Boolean);
		const coreLessons = expectedLessonIds
			.map((lessonId) => lessonById.get(lessonId))
			.filter(Boolean);

		if (coreUnits.length !== CORE_A1_UNIT_COUNT) {
			addIssue(issues, DATA_FILES.units, "core A1 must have 4 units", label);
		}
		if (coreLessons.length !== CORE_A1_UNIT_COUNT * CORE_A1_LESSONS_PER_UNIT) {
			addIssue(issues, DATA_FILES.lessons, "core A1 must have 16 lessons", label);
		}
		const checkpointCount = coreUnits.filter((unit) => unit?.checkpointQuiz).length;
		if (checkpointCount !== CORE_A1_UNIT_COUNT) {
			addIssue(issues, DATA_FILES.units, "core A1 must have 4 checkpoints", label);
		}
	}

	for (const language of languages) {
		const label = `language:${language?.id ?? "missing-id"}`;
		["id", "name", "nativeName", "flag", "code"].forEach((field) => {
			if (!isNonEmptyString(language?.[field])) {
				addIssue(issues, DATA_FILES.languages, "language missing field", `${label}.${field}`);
			}
		});

		if (typeof getCurriculumFallbackLessonTemplate === "function") {
			const template = getCurriculumFallbackLessonTemplate(language.id, language.name, 1);
			let genericFallbackMatches = 0;
			for (const key of FALLBACK_PHRASE_KEYS) {
				const phrase = template?.phrases?.[key];
				if (!isNonEmptyString(phrase)) {
					addIssue(issues, DATA_FILES.curriculum, "fallback phrase missing", `${label}:${key}`);
					continue;
				}
				if (
					language.id !== "en" &&
					GENERIC_ENGLISH_FALLBACK_VALUES.has(phrase)
				) {
					genericFallbackMatches += 1;
				}
				if (SCRIPT_HEAVY_LANGUAGE_IDS.has(language.id) && !hasNonAscii(phrase)) {
					addIssue(issues, DATA_FILES.curriculum, "fallback phrase should use target script", `${label}:${key}:${phrase}`);
				}
			}
			if (language.id !== "en" && genericFallbackMatches >= 8) {
				addIssue(issues, DATA_FILES.curriculum, "fallback phrase bank uses generic English", label);
			}
		} else {
			addIssue(issues, DATA_FILES.curriculum, "missing fallback template helper", "getCurriculumFallbackLessonTemplate");
		}
	}

	for (const unit of units) {
		const label = `unit:${unit?.id ?? "missing-id"}`;
		const coreUnit = isCoreA1Unit(unit);
		if (!languageIds.has(unit.languageId)) {
			addIssue(issues, DATA_FILES.units, "unit languageId missing", label);
		}
		if (!isNonEmptyString(unit.title) || !isNonEmptyString(unit.description)) {
			addIssue(issues, DATA_FILES.units, "unit missing title or description", label);
		}
		if (typeof unit.order !== "number" || unit.order < 1) {
			addIssue(issues, DATA_FILES.units, "unit invalid order", label);
		}
		if (coreUnit) {
			const unitConceptPrefix = `${unit.languageId}:unit_${unit.order}:`;
			const unitConceptCount = curriculumConcepts.filter(
				(concept) => concept?.id?.startsWith(unitConceptPrefix)
			).length;
			if (unitConceptCount < 6 || unitConceptCount > 10) {
				addIssue(issues, DATA_FILES.curriculum, "core A1 unit should have 6-10 concepts", label);
			}
			if (!Array.isArray(unit.targetVocabulary) || unit.targetVocabulary.length < 6) {
				addIssue(issues, DATA_FILES.units, "core A1 unit needs target vocabulary", label);
			}
		}

		const checkpoint = unit.checkpointQuiz;
		if (checkpoint) {
			if (!isNonEmptyString(checkpoint.id) || !isNonEmptyString(checkpoint.title)) {
				addIssue(issues, DATA_FILES.units, "checkpoint missing id or title", label);
			}
			if (
				!Array.isArray(checkpoint.exercises) ||
				checkpoint.exercises.length !== CORE_A1_CHECKPOINT_EXERCISES
			) {
				addIssue(issues, DATA_FILES.units, "checkpoint must have 5 exercises", label);
			} else {
				const checkpointConceptIds = new Set();
				checkpoint.exercises.forEach((exercise) => {
					if (allExerciseIds.has(exercise.id)) {
						addIssue(issues, DATA_FILES.units, "duplicate exercise id", exercise.id);
					}
					allExerciseIds.add(exercise.id);
					validateExercise(issues, DATA_FILES.units, exercise, {
						lessonId: undefined,
						unitId: unit.id,
						languageId: unit.languageId,
						toString: () => label,
					});
					if (coreUnit) {
						if (!String(exercise?.question ?? "").toLowerCase().includes("full sentence")) {
							addIssue(issues, DATA_FILES.units, "core checkpoint should use full-sentence prompts", `${label}:${exercise.id}`);
						}
						if (!Array.isArray(exercise?.conceptIds) || exercise.conceptIds.length === 0) {
							addIssue(issues, DATA_FILES.units, "core checkpoint exercise missing conceptIds", `${label}:${exercise.id}`);
						}
						for (const conceptId of exercise?.conceptIds ?? []) {
							checkpointConceptIds.add(conceptId);
							if (!conceptById.has(conceptId)) {
								addIssue(issues, DATA_FILES.units, "core checkpoint concept missing", `${label}:${conceptId}`);
							}
						}
						validateCoreScriptExercise(
							issues,
							DATA_FILES.units,
							exercise,
							unit.languageId,
							`${label}:${exercise.id}`
						);
					}
					validateSelectableFillBlankBank(
						issues,
						DATA_FILES.units,
						exercise,
						undefined,
						lessons.filter((lesson) => unitById.get(lesson.unitId)?.languageId === unit.languageId),
						`${label}:${exercise.id}`
					);
				});
				if (coreUnit && checkpointConceptIds.size < 4) {
					addIssue(issues, DATA_FILES.units, "core checkpoint should cover primary concepts", label);
				}
			}
		}
	}

	for (const lesson of lessons) {
		const unit = unitById.get(lesson.unitId);
		const label = `lesson:${lesson?.id ?? "missing-id"}`;
		const lessonPlan = lessonPlanByLessonId.get(lesson.id);
		const coreLesson = isCoreA1Lesson(lesson, unit);
		if (!unit) {
			addIssue(issues, DATA_FILES.lessons, "lesson unitId missing", label);
		}
		if (!isNonEmptyString(lesson.title) || !isNonEmptyString(lesson.description)) {
			addIssue(issues, DATA_FILES.lessons, "lesson missing title or description", label);
		}
		if (typeof lesson.order !== "number" || lesson.order < 1) {
			addIssue(issues, DATA_FILES.lessons, "lesson invalid order", label);
		}
		if (!Array.isArray(lesson.activities)) {
			addIssue(issues, DATA_FILES.lessons, "lesson activities must be an array", label);
		} else if (!lesson.isCheckpoint && lesson.activities.length === 0) {
			addIssue(issues, DATA_FILES.lessons, "lesson needs at least one teaching activity", label);
		}
		if (!Array.isArray(lesson.goals) || lesson.goals.length < 2) {
			addIssue(issues, DATA_FILES.lessons, "lesson needs at least 2 learning goals", label);
		}
		if (!lessonPlan && !lesson.isCheckpoint) {
			addIssue(issues, DATA_FILES.curriculum, "lesson missing curriculum plan", label);
		}

		const exercises = lesson.exercises ?? [];
		if (!lesson.isCheckpoint && exercises.length < 6) {
			addIssue(issues, DATA_FILES.lessons, "lesson needs at least 6 exercises", label);
		}
		if (coreLesson) {
			if (exercises.length !== CORE_A1_EXERCISES_PER_LESSON) {
				addIssue(issues, DATA_FILES.lessons, "core A1 lesson must have 8 exercises", label);
			}
			if (!isNonEmptyString(lesson.canDoStatement)) {
				addIssue(issues, DATA_FILES.lessons, "core A1 lesson missing canDoStatement", label);
			}
			if (!isNonEmptyString(lesson.teachingFocus)) {
				addIssue(issues, DATA_FILES.lessons, "core A1 lesson missing teachingFocus", label);
			}
			if (!Array.isArray(lesson.newConceptIds) || lesson.newConceptIds.length === 0) {
				addIssue(issues, DATA_FILES.lessons, "core A1 lesson missing newConceptIds", label);
			}
		}
		const exerciseTypes = new Set(exercises.map((exercise) => exercise.type));
		if (!lesson.isCheckpoint) {
			for (const exerciseType of REQUIRED_LESSON_EXERCISE_TYPES) {
				if (!exerciseTypes.has(exerciseType)) {
					addIssue(issues, DATA_FILES.lessons, "lesson missing exercise type", `${label}:${exerciseType}`);
				}
			}
		}

		if (lessonPlan) {
			const planConceptIds = getLessonPlanConceptIds(lessonPlan);
			const matchedConceptIds = new Set();

			for (const exercise of exercises) {
				const searchText = getExerciseSearchText(exercise);
				for (const conceptId of planConceptIds) {
					const concept = conceptById.get(conceptId);
					if (
						concept?.keywords?.some((keyword) =>
							searchText.includes(keyword.normalize("NFKC").toLowerCase())
						)
					) {
						matchedConceptIds.add(conceptId);
					}
				}
			}

			for (const conceptId of lessonPlan.primaryConceptIds ?? []) {
				if (!matchedConceptIds.has(conceptId)) {
					addIssue(issues, DATA_FILES.lessons, "primary concept not represented in exercises", `${label}:${conceptId}`);
				}
			}
		}

		exercises.forEach((exercise) => {
			if (allExerciseIds.has(exercise.id)) {
				addIssue(issues, DATA_FILES.lessons, "duplicate exercise id", exercise.id);
			}
			allExerciseIds.add(exercise.id);
			validateExercise(issues, DATA_FILES.lessons, exercise, {
				lessonId: lesson.id,
				unitId: lesson.unitId,
				languageId: unit?.languageId,
				requireExplicitWordBank: !lesson.isCheckpoint,
					toString: () => label,
				});
			if (coreLesson) {
				if (!Array.isArray(exercise?.conceptIds) || exercise.conceptIds.length === 0) {
					addIssue(issues, DATA_FILES.lessons, "core A1 exercise missing conceptIds", `${label}:${exercise.id}`);
				}
				if (typeof exercise?.estimatedSeconds !== "number" || exercise.estimatedSeconds < 8) {
					addIssue(issues, DATA_FILES.lessons, "core A1 exercise missing estimatedSeconds", `${label}:${exercise.id}`);
				}
				if (!["intro", "practice", "challenge"].includes(exercise?.difficulty)) {
					addIssue(issues, DATA_FILES.lessons, "core A1 exercise needs strong difficulty", `${label}:${exercise.id}`);
				}
				if (
					exercise?.type === "listen-type" &&
					(!Array.isArray(exercise.wordBank) || exercise.wordBank.length < 2)
				) {
					addIssue(issues, DATA_FILES.lessons, "core listening exercise missing wordBank", `${label}:${exercise.id}`);
				}
				validateCoreScriptExercise(
					issues,
					DATA_FILES.lessons,
					exercise,
					unit.languageId,
					`${label}:${exercise.id}`
				);
			}
			validateSelectableFillBlankBank(
				issues,
				DATA_FILES.lessons,
				exercise,
				lesson,
				lessons.filter((item) => unitById.get(item.unitId)?.languageId === unit?.languageId),
				`${label}:${exercise.id}`
			);
		});
	}

	for (const concept of curriculumConcepts) {
		const label = `concept:${concept?.id ?? "missing-id"}`;
		if (!languageIds.has(concept.languageId)) {
			addIssue(issues, DATA_FILES.curriculum, "concept languageId missing", label);
		}
		if (!isNonEmptyString(concept.title) || !isNonEmptyString(concept.description)) {
			addIssue(issues, DATA_FILES.curriculum, "concept missing title or description", label);
		}
		if (!Array.isArray(concept.keywords) || concept.keywords.length === 0) {
			addIssue(issues, DATA_FILES.curriculum, "concept missing keywords", label);
		}
	}

	for (const plan of curriculumLessonPlans) {
		const label = `lessonPlan:${plan?.lessonId ?? "missing-id"}`;
		const unit = unitById.get(plan.unitId);
		const lesson = lessonById.get(plan.lessonId);
		const generatedLesson = isGeneratedFallbackLessonId(plan.lessonId, plan.languageId);

		if (!languageIds.has(plan.languageId)) {
			addIssue(issues, DATA_FILES.curriculum, "lesson plan languageId missing", label);
		}
		if (!unit) {
			addIssue(issues, DATA_FILES.curriculum, "lesson plan unitId missing", label);
		}
		if (!lesson && !generatedLesson) {
			addIssue(issues, DATA_FILES.curriculum, "lesson plan lessonId missing", label);
		}
		if (lesson && lesson.unitId !== plan.unitId) {
			addIssue(issues, DATA_FILES.curriculum, "lesson plan unit mismatch", label);
		}
		if (unit && unit.languageId !== plan.languageId) {
			addIssue(issues, DATA_FILES.curriculum, "lesson plan language mismatch", label);
		}
		if (!isNonEmptyString(plan.canDoStatement)) {
			addIssue(issues, DATA_FILES.curriculum, "lesson plan missing canDoStatement", label);
		}

		const conceptIds = [
			...(plan.primaryConceptIds ?? []),
			...(plan.supportConceptIds ?? []),
		];
		if (!Array.isArray(plan.primaryConceptIds) || plan.primaryConceptIds.length === 0) {
			addIssue(issues, DATA_FILES.curriculum, "lesson plan missing primary concepts", label);
		}
		conceptIds.forEach((conceptId) => {
			const concept = conceptById.get(conceptId);
			if (!concept) {
				addIssue(issues, DATA_FILES.curriculum, "lesson plan concept missing", `${label}:${conceptId}`);
			} else if (concept.languageId !== plan.languageId) {
				addIssue(issues, DATA_FILES.curriculum, "lesson plan concept language mismatch", `${label}:${conceptId}`);
			}
		});
	}
};

const findIssues = () => {
	const issues = [];

	for (const relativeFile of FILES_TO_SCAN) {
		const filePath = path.join(ROOT, relativeFile);
		const text = fs.readFileSync(filePath, "utf8");

		for (const pattern of MOJIBAKE_PATTERNS) {
			for (const match of text.matchAll(pattern.regex)) {
				addIssue(
					issues,
					relativeFile,
					pattern.name,
					match[0],
					getLineNumber(text, match.index ?? 0)
				);
			}
		}

		for (const phrase of CONTENT_REGRESSIONS) {
			let index = text.indexOf(phrase);
			while (index !== -1) {
				addIssue(
					issues,
					relativeFile,
					"content regression",
					phrase,
					getLineNumber(text, index)
				);
				index = text.indexOf(phrase, index + phrase.length);
			}
		}
	}

	validateDataGraph(issues);
	return issues;
};

const issues = findIssues();

if (issues.length) {
	console.error("Content encoding/data-quality issues found:");
	for (const issue of issues) {
		const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
		console.error(
			`- ${location} [${issue.type}] ${JSON.stringify(issue.value)}`
		);
	}
	process.exit(1);
}

console.log("Content encoding and data graph checks passed.");
