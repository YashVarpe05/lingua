import { Lesson, Unit } from "@/types/learning";
import { units } from "@/data/units";
import { lessons } from "@/data/lessons";
import { languages } from "@/data/languages";

/**
 * Safely fetches units and lessons for a given language.
 * Automatically generates fallback units and pads lessons up to 6 lessons
 * so that the lessons list matches the design screen height and meets requirements.
 */
export const getLanguageUnitsAndLessons = (langId: string): { units: Unit[]; lessons: Lesson[] } => {
	const langUnits = units.filter((u) => u.languageId === langId);
	let langLessons = lessons.filter((l) => langUnits.some((u) => u.id === l.unitId));

	// 1. Resolve active units
	let finalUnits = langUnits;
	if (finalUnits.length === 0) {
		const selectedLang = languages.find((lang) => lang.id === langId) || { name: "Foreign Language" };
		const defaultUnitId = `${langId}_unit_1`;
		finalUnits = [
			{
				id: defaultUnitId,
				languageId: langId,
				title: `Unit 1: Basics of ${selectedLang.name}`,
				description: `Start learning basic vocabulary, greetings, and useful everyday expressions in ${selectedLang.name}.`,
				order: 1,
			},
		];
	}

	const primaryUnitId = finalUnits[0].id;
	const selectedLang = languages.find((lang) => lang.id === langId) || { name: "Foreign Language" };

	// 2. Pad lessons to exactly 6 lessons if there are fewer
	if (langLessons.length < 6) {
		const paddedLessons = [...langLessons];
		const lessonsNeeded = 6 - paddedLessons.length;

		// Mock templates in structure and style
		const mockTemplates = [
			{
				title: "Essential Greetings",
				description: `Learn basic greetings and responses like hello, goodbye, and thank you in ${selectedLang.name}.`,
				type: "vocabulary" as const,
				xpReward: 10,
				durationMinutes: 3,
				goals: ["Recognize basic greetings", "Say hello and goodbye", "Express gratitude"],
			},
			{
				title: "AI Teacher: Introductions",
				description: `Join your AI teacher to learn how to introduce yourself and state your name.`,
				type: "video" as const,
				xpReward: 20,
				durationMinutes: 5,
				goals: ["Ask for someone's name", "State your own name", "Exchange pleasantries"],
			},
			{
				title: "AI Chat: First Conversation",
				description: `Chat with your AI language partner to practice your greetings and introduction.`,
				type: "chat" as const,
				xpReward: 15,
				durationMinutes: 4,
				goals: ["Introduce yourself in conversation", "Respond to simple questions"],
			},
			{
				title: "At the Café",
				description: `Learn to order coffee and pastries in ${selectedLang.name} politely.`,
				type: "chat" as const,
				xpReward: 20,
				durationMinutes: 5,
				goals: ["Order a drink and snack", "Understand pricing questions", "Request the check"],
			},
			{
				title: "Travel & Directions",
				description: `Learn to ask for directions and navigate travel scenarios in ${selectedLang.name}.`,
				type: "vocabulary" as const,
				xpReward: 10,
				durationMinutes: 4,
				goals: ["Ask for directions", "Understand simple locations", "Identify public transit"],
			},
			{
				title: "Family & Friends",
				description: `Learn basic vocabulary to describe family members and friends.`,
				type: "video" as const,
				xpReward: 15,
				durationMinutes: 6,
				goals: ["Name family members", "Describe people's traits", "Exchange simple details"],
			},
		];

		for (let i = 0; i < lessonsNeeded; i++) {
			const orderNum = paddedLessons.length + 1;
			const template = mockTemplates[orderNum - 1] || mockTemplates[0];
			paddedLessons.push({
				id: `${langId}_u1_l${orderNum}`,
				unitId: primaryUnitId,
				title: template.title,
				description: template.description,
				type: template.type,
				order: orderNum,
				xpReward: template.xpReward,
				durationMinutes: template.durationMinutes,
				goals: template.goals,
				activities: [],
			});
		}
		langLessons = paddedLessons;
	}

	return { units: finalUnits, lessons: langLessons };
};
