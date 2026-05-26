const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force Metro to resolve the CommonJS (CJS) version of libraries (like Zustand)
// which avoids modern ESM syntax like import.meta in React Native environment
config.resolver.unstable_conditionNames = ["require", "react-native"];

module.exports = withNativewind(config, {
	// inline variables break PlatformColor in CSS variables
	inlineVariables: false,
	// We add className support manually via tw/ wrappers
	globalClassNamePolyfill: false,
});
