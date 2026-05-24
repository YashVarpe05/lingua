import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface LanguageState {
	selectedLanguageId: string | null;
	hasHydrated: boolean;
	setSelectedLanguageId: (id: string | null) => Promise<void>;
	setHasHydrated: (state: boolean) => void;
	clearStorage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>()(
	persist(
		(set) => ({
			selectedLanguageId: null,
			hasHydrated: false,
			setSelectedLanguageId: async (id) => {
				set({ selectedLanguageId: id });
			},
			setHasHydrated: (state) => {
				set({ hasHydrated: state });
			},
			clearStorage: async () => {
				try {
					await AsyncStorage.removeItem("language-storage");
				} catch (err) {
					console.error("Failed to clear AsyncStorage:", err);
				}
				set({ selectedLanguageId: null });
			},
		}),
		{
			name: "language-storage",
			storage: createJSONStorage(() => AsyncStorage),
			onRehydrateStorage: () => (state) => {
				state?.setHasHydrated(true);
			},
		}
	)
);
