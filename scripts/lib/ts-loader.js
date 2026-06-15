const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const ROOT = process.cwd();
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

module.exports = {
	loadTsExports,
	resolveTsImport,
	tsModuleCache,
};
