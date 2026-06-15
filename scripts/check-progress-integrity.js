const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const progressSessionPath = path.join(rootDir, "src", "utils", "progressSession.ts");
const conceptReviewPath = path.join(rootDir, "src", "utils", "conceptReview.ts");
const exerciseSessionPath = path.join(rootDir, "src", "app", "exercise-session.tsx");
const progressStorePath = path.join(rootDir, "src", "store", "useProgressStore.ts");

const loadTsModule = (filePath) => {
	const source = fs.readFileSync(filePath, "utf8");
	const output = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	});
	const exportsObject = {};
	const sandbox = {
		exports: exportsObject,
		module: { exports: exportsObject },
		require,
	};

	vm.runInNewContext(output.outputText, sandbox, {
		filename: path.basename(filePath),
	});

	return sandbox.module.exports;
};

const {
	applyLearningSessionCompletion,
	getTodayStr,
} = loadTsModule(progressSessionPath);
const {
	hasFreshSuccessfulFocusedReview,
	isAttemptRepairedByFocusedReview,
} = loadTsModule(conceptReviewPath);

const fixedNow = new Date(2026, 0, 15, 12, 0, 0);
const todayStr = getTodayStr(fixedNow);
const fixedNowMs = fixedNow.getTime();
const focusedReviewNowMs = Date.now();

const baseState = (overrides = {}) => ({
	xp: 0,
	todayXP: 0,
	level: 1,
	streak: 0,
	lastActiveDate: null,
	dailyChallengeCompletedDate: null,
	completedLessons: [],
	completedLessonIds: [],
	completedCheckpoints: [],
	dailyLessons: {},
	lessonMemory: {},
	...overrides,
});

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(message);
	}
};

const assertIncludes = (values, expected, message) => {
	assert(Array.isArray(values), `${message}: value is not an array`);
	assert(values.includes(expected), `${message}: missing ${expected}`);
};

const assertExcludes = (values, expected, message) => {
	assert(Array.isArray(values), `${message}: value is not an array`);
	assert(!values.includes(expected), `${message}: unexpectedly contains ${expected}`);
};

const complete = (state, input) =>
	applyLearningSessionCompletion(state, input, fixedNow);

const tests = [
	{
		name: "normal lesson marks lesson complete and records memory",
		run: () => {
			const { nextState, result } = complete(baseState(), {
				sessionType: "lesson",
				xpEarned: 70,
				score: 88,
				plannedCorrectCount: 7,
				plannedExerciseCount: 8,
				practicedLessonIds: ["es_u1_l1"],
				completedLessonId: "es_u1_l1",
				passed: true,
			});

			assert(result.xpEarned === 70, "lesson XP result should match input");
			assert(nextState.xp === 70, "lesson XP should be saved");
			assert(nextState.todayXP === 70, "lesson today XP should be saved");
			assert(nextState.streak === 1, "lesson should start streak");
			assertIncludes(nextState.completedLessonIds, "es_u1_l1", "lesson completion");
			assertIncludes(nextState.completedLessons, "es_u1_l1", "legacy lesson completion");
			assertIncludes(nextState.dailyLessons[todayStr], "es_u1_l1", "daily lesson list");
			assert(nextState.lessonMemory.es_u1_l1?.practiceCount === 1, "lesson memory should increment");
			assert(nextState.lessonMemory.es_u1_l1?.avgScore === 88, "lesson memory should save score");
		},
	},
	{
		name: "daily challenge marks completion date once",
		run: () => {
			const { nextState } = complete(baseState(), {
				sessionType: "daily-challenge",
				xpEarned: 80,
				score: 100,
				plannedCorrectCount: 8,
				plannedExerciseCount: 8,
				practicedLessonIds: ["fr_u1_l1"],
				completedLessonId: "fr_u1_l1",
				passed: true,
			});

			assert(nextState.dailyChallengeCompletedDate === todayStr, "daily challenge date should be today");
			assertIncludes(nextState.completedLessonIds, "fr_u1_l1", "daily challenge lesson completion");
		},
	},
	{
		name: "practice earns XP and memory without path completion",
		run: () => {
			const { nextState, result } = complete(baseState(), {
				sessionType: "practice",
				xpEarned: 30,
				score: 75,
				plannedCorrectCount: 3,
				plannedExerciseCount: 4,
				practicedLessonIds: ["ja_u1_l1"],
				completedLessonId: "ja_u1_l1",
				passed: true,
			});

			assert(result.newTotalXp === 30, "practice should earn XP");
			assert(nextState.streak === 1, "practice should count for streak");
			assertExcludes(nextState.completedLessonIds, "ja_u1_l1", "practice path completion");
			assert(!nextState.dailyLessons[todayStr]?.includes("ja_u1_l1"), "practice should not write daily lesson completion");
			assert(nextState.lessonMemory.ja_u1_l1?.practiceCount === 1, "practice should record lesson memory");
		},
	},
	{
		name: "review earns XP and memory without path completion",
		run: () => {
			const { nextState } = complete(baseState(), {
				sessionType: "review",
				xpEarned: 40,
				score: 80,
				plannedCorrectCount: 4,
				plannedExerciseCount: 5,
				practicedLessonIds: ["de_u1_l1", "de_u1_l2"],
				completedLessonId: "de_u1_l1",
				passed: true,
			});

			assert(nextState.xp === 40, "review should earn XP");
			assertExcludes(nextState.completedLessonIds, "de_u1_l1", "review path completion");
			assert(nextState.lessonMemory.de_u1_l1?.practiceCount === 1, "review first lesson memory");
			assert(nextState.lessonMemory.de_u1_l2?.practiceCount === 1, "review second lesson memory");
		},
	},
	{
		name: "checkpoint pass unlocks unit, fail does not",
		run: () => {
			const pass = complete(baseState(), {
				sessionType: "checkpoint",
				xpEarned: 50,
				score: 80,
				plannedCorrectCount: 4,
				plannedExerciseCount: 5,
				practicedLessonIds: ["ar_u1_l1"],
				checkpointUnitId: "ar_unit_1",
				passed: true,
			});
			const fail = complete(baseState(), {
				sessionType: "checkpoint",
				xpEarned: 10,
				score: 60,
				plannedCorrectCount: 3,
				plannedExerciseCount: 5,
				practicedLessonIds: ["ar_u1_l1"],
				checkpointUnitId: "ar_unit_1",
				passed: false,
			});

			assertIncludes(pass.nextState.completedCheckpoints, "ar_unit_1", "checkpoint pass");
			assertExcludes(fail.nextState.completedCheckpoints, "ar_unit_1", "checkpoint fail");
			assert(fail.nextState.xp === 10, "checkpoint fail should still earn fail XP");
		},
	},
	{
		name: "planned score clamps repair-inflated correct count",
		run: () => {
			const { result } = complete(baseState(), {
				sessionType: "practice",
				xpEarned: 90,
				score: 120,
				plannedCorrectCount: 9,
				plannedExerciseCount: 8,
				practicedLessonIds: ["en_u1_l1"],
				passed: true,
			});

			assert(result.score === 100, "score should clamp at 100");
			assert(result.plannedCorrectCount === 8, "planned correct count should not exceed denominator");
		},
	},
];

tests.forEach((test) => {
	test.run();
	console.log(`PASS ${test.name}`);
});

const repairedConceptEntry = {
	conceptId: "de:unit_1:greetings",
	lastPracticed: focusedReviewNowMs,
	practiceCount: 3,
	correctCount: 2,
	incorrectCount: 1,
	halfLifeDays: 2,
	latestRecallScore: 1,
	lastFocusedReviewAt: focusedReviewNowMs,
	lastFocusedReviewScore: 90,
	focusedReviewPassCount: 1,
};
const failedReviewConceptEntry = {
	...repairedConceptEntry,
	lastFocusedReviewScore: 70,
};
const repairedAttempt = {
	conceptIds: ["de:unit_1:greetings"],
	createdAt: focusedReviewNowMs - 1000,
};
const newerMissAttempt = {
	conceptIds: ["de:unit_1:greetings"],
	createdAt: focusedReviewNowMs + 1000,
};

assert(
	hasFreshSuccessfulFocusedReview(repairedConceptEntry, focusedReviewNowMs),
	"passing focused review should count as fresh repair"
);
assert(
	!hasFreshSuccessfulFocusedReview(failedReviewConceptEntry, focusedReviewNowMs),
	"failed focused review should not count as fresh repair"
);
assert(
	isAttemptRepairedByFocusedReview(repairedAttempt, {
		"de:unit_1:greetings": repairedConceptEntry,
	}),
	"old miss should be covered by newer passing focused review"
);
assert(
	!isAttemptRepairedByFocusedReview(newerMissAttempt, {
		"de:unit_1:greetings": repairedConceptEntry,
	}),
	"newer miss should remain active after old focused review"
);
console.log("PASS focused review repair helpers");

const exerciseSessionSource = fs.readFileSync(exerciseSessionPath, "utf8");
const progressStoreSource = fs.readFileSync(progressStorePath, "utf8");

[
	["practice session type is routed", "isPracticeSession"],
	["lesson completion gate is named", "const shouldCompleteLesson ="],
	["checkpoint completion is blocked", "!isAssessmentSession"],
	["review completion is blocked", "!isReviewSession"],
	["practice completion is blocked", "!isPracticeSession"],
	["completion gate controls saved lesson", "completedLessonId: shouldCompleteLesson ? lesson.id : undefined"],
	["repair exercises do not inflate score", "currentExerciseIsPlanned"],
	["planned denominator is used", "plannedExerciseCount || exercises.length"],
	["pronunciation attempts are recorded", "recordPronunciationAttempt({"],
	["pronunciation retry loop is capped", "MAX_PRONUNCIATION_RETRIES"],
	["recording enables the audio session", "setAudioModeAsync({ allowsRecording: true"],
	["recording restores playback audio mode", "setAudioModeAsync({ allowsRecording: false"],
	["session analytics are shown on results", "Session Analytics"],
	["weak parts review starts from results", "Practice Weak Parts"],
	["session time is tracked", "sessionStartedAt"],
	["pronunciation result average is tracked", "sessionPronunciationScores"],
	["focused review completion is recorded", "recordFocusedConceptReview({"],
	["focused review repaired title is shown", "Weak Parts Repaired"],
].forEach(([name, token]) => {
	assert(exerciseSessionSource.includes(token), `missing static guard: ${name}`);
	console.log(`PASS static guard: ${name}`);
});

[
	["reset clears recent attempts", "recentAttempts: []"],
	["reset clears concept memory", "conceptMemory: {}"],
	["reset clears exercise difficulty", "exerciseDifficultyMemory: {}"],
	["reset clears concept difficulty", "conceptDifficultyMemory: {}"],
	["reset clears pronunciation exercise memory", "pronunciationExerciseMemory: {}"],
	["reset clears pronunciation concept memory", "pronunciationConceptMemory: {}"],
].forEach(([name, token]) => {
	assert(progressStoreSource.includes(token), `missing reset guard: ${name}`);
	console.log(`PASS reset guard: ${name}`);
});

console.log("Progress integrity checks passed.");
