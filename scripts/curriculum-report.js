const { loadTsExports } = require("./lib/ts-loader");

const {
	buildCurriculumQaReport,
	CURRICULUM_QA_LANGUAGE_IDS,
} = loadTsExports("src/utils/curriculumQa.ts");

const args = process.argv.slice(2);
const selectedLanguageIds = args.length ? args : CURRICULUM_QA_LANGUAGE_IDS;
const report = buildCurriculumQaReport(selectedLanguageIds);

const statusLabel = (status) => {
	if (status === "ready") return "PASS";
	if (status === "watch") return "WARN";
	return "FAIL";
};

const printFlag = (flag) => {
	console.log(`    - ${flag.severity.toUpperCase()} [${flag.scope}:${flag.id}] ${flag.message}`);
};

console.log("Curriculum QA Report");
console.log(`Generated: ${report.generatedAt}`);
console.log(`Languages: ${report.totals.languageCount}`);
console.log(
	`Totals: ${report.totals.unitCount} units, ${report.totals.lessonCount} lessons, ${report.totals.checkpointCount} checkpoints, ${report.totals.exerciseCount} exercises`
);
console.log(`Issues: ${report.totals.failCount} fail, ${report.totals.warnCount} warn\n`);

report.languages.forEach((language) => {
	const fallbackLabel = language.usesFallbackContent ? "fallback" : "authored";
	console.log(
		`${statusLabel(language.status)} ${language.name} (${language.id}) - ${fallbackLabel}`
	);
	console.log(
		`  ${language.unitCount} units | ${language.lessonCount} lessons | ${language.checkpointCount} checkpoints | ${language.exerciseCount} exercises | ${language.conceptCount} concepts`
	);

	if (language.flags.length === 0) {
		console.log("  No issues found.");
	} else {
		language.flags.slice(0, 12).forEach(printFlag);
		if (language.flags.length > 12) {
			console.log(`    ... ${language.flags.length - 12} more issue(s)`);
		}
	}

	console.log("");
});

console.log(
	"Tip: open /debug-curriculum in the app to inspect these flags visually."
);
