import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllLessonsFromData } from "@/data/lessons";

export interface LessonMemoryEntry {
	lessonId: string;
	lastPracticed: number;
	practiceCount: number;
	avgScore: number;
}

export interface ProgressState {
	completedLessons: string[]; // Keep for backward compatibility
	completedLessonIds: string[]; // List of completed lesson IDs
	xp: number;
	todayXP: number; // XP earned today (resets at midnight)
	streak: number;
	lastActiveDate: string | null;
	dailyChallengeCompletedDate: string | null;
	level: number;
	dailyLessons: Record<string, string[]>;
	recentMistakes: string[]; // List of exercise IDs the user got incorrect
	completedCheckpoints: string[]; // List of unit IDs where the checkpoint was passed
	lessonMemory: Record<string, LessonMemoryEntry>;
	completeLesson: (lessonId: string, xpReward: number) => Promise<void>;
	completeExerciseSession: (
		lessonId: string,
		xpEarned: number,
		isDailyChallenge: boolean
	) => Promise<{
		levelledUp: boolean;
		oldLevel: number;
		newLevel: number;
		newTotalXp: number;
		newStreak: number;
	}>;
	addXp: (amount: number) => Promise<void>;
	checkAndResetDailyXP: () => void;
	addMistake: (exerciseId: string) => void;
	removeMistake: (exerciseId: string) => void;
	completeCheckpoint: (unitId: string) => void;
	markCheckpointComplete: (unitId: string) => void;
	recordPractice: (lessonId: string, score: number) => void;
	getForgettingScore: (lessonId: string) => number;
	getMostUrgentLessons: (count: number) => string[];
	resetProgress: () => Promise<void>;
}

const calculateLevel = (xp: number): number => {
	if (xp >= 900) return 5;
	if (xp >= 500) return 4;
	if (xp >= 250) return 3;
	if (xp >= 100) return 2;
	return 1;
};

const getTodayStr = (): string => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getYesterdayStr = (): string => {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
};

export const useProgressStore = create<ProgressState>()(
	persist(
		(set, get) => ({
			completedLessons: [],
			completedLessonIds: [],
			xp: 0,
			todayXP: 0,
			streak: 0,
			lastActiveDate: null,
			dailyChallengeCompletedDate: null,
			level: 1,
			dailyLessons: {},
			recentMistakes: [],
			completedCheckpoints: [],
			lessonMemory: {},
			addMistake: (exerciseId) => {
				const { recentMistakes } = get();
				const mistakes = recentMistakes || [];
				if (!mistakes.includes(exerciseId)) {
					set({ recentMistakes: [...mistakes, exerciseId] });
				}
			},
			removeMistake: (exerciseId) => {
				const { recentMistakes } = get();
				const mistakes = recentMistakes || [];
				set({ recentMistakes: mistakes.filter((id) => id !== exerciseId) });
			},
			completeCheckpoint: (unitId) => {
				const { completedCheckpoints } = get();
				const checkpoints = completedCheckpoints || [];
				if (!checkpoints.includes(unitId)) {
					set({ completedCheckpoints: [...checkpoints, unitId] });
				}
			},
			markCheckpointComplete: (unitId) => {
				const { completedCheckpoints } = get();
				const checkpoints = completedCheckpoints || [];
				if (!checkpoints.includes(unitId)) {
					set({ completedCheckpoints: [...checkpoints, unitId] });
				}
			},
			recordPractice: (lessonId, score) => {
				const memory = get().lessonMemory || {};
				const existing = memory[lessonId];
				const newCount = (existing?.practiceCount ?? 0) + 1;
				const newAvg = existing
					? (existing.avgScore * existing.practiceCount + score) / newCount
					: score;

				set((state) => ({
					lessonMemory: {
						...(state.lessonMemory || {}),
						[lessonId]: {
							lessonId,
							lastPracticed: Date.now(),
							practiceCount: newCount,
							avgScore: Math.round(newAvg),
						},
					},
				}));
			},
			getForgettingScore: (lessonId) => {
				const entry = (get().lessonMemory || {})[lessonId];
				if (!entry) return 999;

				const daysSince = (Date.now() - entry.lastPracticed) / 86400000;
				const scoreMultiplier = entry.avgScore / 100;
				const halfLife = Math.pow(2, entry.practiceCount) * (0.5 + scoreMultiplier * 0.5);
				return daysSince / halfLife;
			},
			getMostUrgentLessons: (count) => {
				const getForgettingScore = get().getForgettingScore;
				return getAllLessonsFromData()
					.map((lesson) => ({
						id: lesson.id,
						score: getForgettingScore(lesson.id),
					}))
					.sort((a, b) => b.score - a.score)
					.slice(0, count)
					.map((lesson) => lesson.id);
			},
			completeLesson: async (lessonId, xpReward) => {
				const { completedLessons, xp, todayXP, streak, lastActiveDate, dailyLessons } = get();
				
				const todayStr = getTodayStr();
				const yesterdayStr = getYesterdayStr();

				let nextCompletedLessons = completedLessons || [];
				let nextXp = xp;
				let nextTodayXp = todayXP || 0;

				if (!nextCompletedLessons.includes(lessonId)) {
					nextCompletedLessons = [...nextCompletedLessons, lessonId];
					nextXp = xp + xpReward;
					nextTodayXp = (todayXP || 0) + xpReward;
				}

				const nextLevel = calculateLevel(nextXp);

				const nextDailyLessons = { ...dailyLessons };
				if (!nextDailyLessons[todayStr]) {
					nextDailyLessons[todayStr] = [];
				}
				if (!nextDailyLessons[todayStr].includes(lessonId)) {
					nextDailyLessons[todayStr] = [...nextDailyLessons[todayStr], lessonId];
				}

				let nextStreak = streak;
				if (lastActiveDate === null) {
					nextStreak = 1;
				} else if (lastActiveDate === yesterdayStr) {
					nextStreak = streak + 1;
				} else if (lastActiveDate !== todayStr) {
					nextStreak = 1;
				}

				set({
					completedLessons: nextCompletedLessons,
					completedLessonIds: nextCompletedLessons,
					xp: nextXp,
					todayXP: nextTodayXp,
					level: nextLevel,
					dailyLessons: nextDailyLessons,
					streak: nextStreak,
					lastActiveDate: todayStr,
				});
			},
			completeExerciseSession: async (lessonId, xpEarned, isDailyChallenge) => {
				const { xp, todayXP, streak, lastActiveDate, completedLessonIds, dailyChallengeCompletedDate } = get();
				
				const todayStr = getTodayStr();
				const yesterdayStr = getYesterdayStr();

				const oldLevel = calculateLevel(xp);
				const nextXp = xp + xpEarned;
				const nextTodayXp = (todayXP || 0) + xpEarned;
				const nextLevel = calculateLevel(nextXp);
				const levelledUp = nextLevel > oldLevel;

				let nextCompletedIds = completedLessonIds || [];
				if (!nextCompletedIds.includes(lessonId)) {
					nextCompletedIds = [...nextCompletedIds, lessonId];
				}

				let nextStreak = streak;
				if (lastActiveDate === null) {
					nextStreak = 1;
				} else if (lastActiveDate === yesterdayStr) {
					nextStreak = streak + 1;
				} else if (lastActiveDate !== todayStr) {
					nextStreak = 1;
				}

				const nextDailyChallengeCompletedDate = isDailyChallenge ? todayStr : dailyChallengeCompletedDate;

				set({
					xp: nextXp,
					todayXP: nextTodayXp,
					level: nextLevel,
					completedLessons: nextCompletedIds,
					completedLessonIds: nextCompletedIds,
					streak: nextStreak,
					lastActiveDate: todayStr,
					dailyChallengeCompletedDate: nextDailyChallengeCompletedDate,
				});

				return {
					levelledUp,
					oldLevel,
					newLevel: nextLevel,
					newTotalXp: nextXp,
					newStreak: nextStreak,
				};
			},
			addXp: async (amount) => {
				const { xp, todayXP } = get();
				const nextXp = xp + amount;
				const nextTodayXp = (todayXP || 0) + amount;
				set({
					xp: nextXp,
					todayXP: nextTodayXp,
					level: calculateLevel(nextXp),
				});
			},
			checkAndResetDailyXP: () => {
				const { lastActiveDate, todayXP } = get();
				if (!lastActiveDate) return;
				const todayStr = getTodayStr();
				if (lastActiveDate !== todayStr && todayXP !== 0) {
					set({ todayXP: 0 });
				}
			},
			resetProgress: async () => {
				set({
					completedLessons: [],
					completedLessonIds: [],
					xp: 0,
					todayXP: 0,
					streak: 0,
					lastActiveDate: null,
					dailyChallengeCompletedDate: null,
					level: 1,
					dailyLessons: {},
					recentMistakes: [],
					completedCheckpoints: [],
					lessonMemory: {},
				});
			},
		}),
		{
			name: "progress-storage",
			storage: createJSONStorage(() => AsyncStorage),
		}
	)
);
