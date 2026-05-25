import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProgressState {
	completedLessons: string[];
	xp: number;
	streak: number;
	lastActivityDate: string | null;
	dailyLessons: Record<string, string[]>;
	completeLesson: (lessonId: string, xpReward: number) => Promise<void>;
	resetProgress: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>()(
	persist(
		(set, get) => ({
			completedLessons: [],
			xp: 0,
			streak: 0,
			lastActivityDate: null,
			dailyLessons: {},
			completeLesson: async (lessonId, xpReward) => {
				const { completedLessons, xp, streak, lastActivityDate, dailyLessons } = get();
				
				// Generate local YYYY-MM-DD strings for timezone-safe daily calculations
				const now = new Date();
				const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

				const yesterday = new Date();
				yesterday.setDate(yesterday.getDate() - 1);
				const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

				let nextCompletedLessons = completedLessons;
				let nextXp = xp;

				if (!completedLessons.includes(lessonId)) {
					nextCompletedLessons = [...completedLessons, lessonId];
					nextXp = xp + xpReward;
				}

				const nextDailyLessons = { ...dailyLessons };
				if (!nextDailyLessons[todayStr]) {
					nextDailyLessons[todayStr] = [];
				}
				if (!nextDailyLessons[todayStr].includes(lessonId)) {
					nextDailyLessons[todayStr] = [...nextDailyLessons[todayStr], lessonId];
				}

				let nextStreak = streak;
				let nextLastActivityDate = lastActivityDate;

				// Update streak only once per day
				if (lastActivityDate !== todayStr) {
					if (lastActivityDate === yesterdayStr) {
						nextStreak = streak + 1;
					} else {
						nextStreak = 1;
					}
					nextLastActivityDate = todayStr;
				}

				set({
					completedLessons: nextCompletedLessons,
					xp: nextXp,
					dailyLessons: nextDailyLessons,
					streak: nextStreak,
					lastActivityDate: nextLastActivityDate,
				});
			},
			resetProgress: async () => {
				set({
					completedLessons: [],
					xp: 0,
					streak: 0,
					lastActivityDate: null,
					dailyLessons: {},
				});
			},
		}),
		{
			name: "progress-storage",
			storage: createJSONStorage(() => AsyncStorage),
		}
	)
);
