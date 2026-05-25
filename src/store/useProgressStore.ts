import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProgressState {
	completedLessons: string[];
	xp: number;
	streak: number;
	completeLesson: (lessonId: string, xpReward: number) => Promise<void>;
	resetProgress: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>()(
	persist(
		(set, get) => ({
			completedLessons: [],
			xp: 0,
			streak: 0,
			completeLesson: async (lessonId, xpReward) => {
				const { completedLessons, xp, streak } = get();
				if (!completedLessons.includes(lessonId)) {
					set({
						completedLessons: [...completedLessons, lessonId],
						xp: xp + xpReward,
						streak: streak === 0 ? 1 : streak + 1,
					});
				}
			},
			resetProgress: async () => {
				set({
					completedLessons: [],
					xp: 0,
					streak: 0,
				});
			},
		}),
		{
			name: "progress-storage",
			storage: createJSONStorage(() => AsyncStorage),
		}
	)
);
