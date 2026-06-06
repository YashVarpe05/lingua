import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View, ScrollView, TouchableOpacity } from "@/tw";
import Button3D from "@/components/Button3D";
import { languages } from "@/data/languages";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import {
	getPracticeQueueOverview,
	parseFocusConceptIds,
	type PracticeHubConcept,
} from "@/utils/practiceQueue";

const getReasonLabel = (reason: PracticeHubConcept["reason"]) => {
	if (reason === "recent-mistake") return "Recent miss";
	if (reason === "due") return "Review due";
	return "Weak memory";
};

const getReasonColor = (reason: PracticeHubConcept["reason"]) => {
	if (reason === "recent-mistake") {
		return {
			bg: "bg-[#FFF8E6]",
			text: "text-[#FF9600]",
			icon: "#FF9600",
		};
	}

	if (reason === "due") {
		return {
			bg: "bg-[#FFDFE0]",
			text: "text-[#FF4B4B]",
			icon: "#FF4B4B",
		};
	}

	return {
		bg: "bg-[#F0EDFF]",
		text: "text-[#6C4EF5]",
		icon: "#6C4EF5",
	};
};

export default function PracticeHubScreen() {
	const router = useRouter();
	const { focusConceptIds: focusConceptIdsParam } = useLocalSearchParams<{
		focusConceptIds?: string;
		source?: string;
	}>();
	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const recentAttempts = useProgressStore((state) => state.recentAttempts);
	const conceptMemory = useProgressStore((state) => state.conceptMemory);
	const getConceptRecallScore = useProgressStore((state) => state.getConceptRecallScore);
	const getForgettingScore = useProgressStore((state) => state.getForgettingScore);
	const activeLanguageId = selectedLanguageId || "es";
	const selectedLanguage = languages.find((language) => language.id === activeLanguageId);
	const { units, lessons } = useMemo(
		() => getLanguageUnitsAndLessons(activeLanguageId),
		[activeLanguageId]
	);
	const explicitFocusConceptIds = useMemo(
		() => parseFocusConceptIds(focusConceptIdsParam),
		[focusConceptIdsParam]
	);
	const overview = useMemo(
		() =>
			getPracticeQueueOverview({
				selectedLanguageId: activeLanguageId,
				lessons,
				units,
				recentAttempts,
				conceptMemory,
				explicitFocusConceptIds,
				getConceptRecallScore,
				getForgettingScore,
			}),
		[
			activeLanguageId,
			conceptMemory,
			explicitFocusConceptIds,
			getConceptRecallScore,
			getForgettingScore,
			lessons,
			recentAttempts,
			units,
		]
	);

	const handleStartReview = () => {
		router.push({
			pathname: "/review-session",
			params: {
				focusConceptIds: overview.focusConceptIds.join(","),
				source: "practice-hub",
			},
		});
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView
				className="flex-1 bg-[#F6F7FB]"
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View className="flex-row items-center justify-between mb-5">
					<TouchableOpacity
						onPress={() => router.back()}
						className="w-10 h-10 rounded-full bg-white border border-neutral-border items-center justify-center"
						activeOpacity={0.75}
					>
						<Feather name="arrow-left" size={20} color="#0D132B" />
					</TouchableOpacity>
					<View className="px-3 py-1.5 rounded-full bg-white border border-neutral-border">
						<Text className="font-poppins-bold text-[12px] text-neutral-primary">
							{selectedLanguage?.name ?? "Language"} Review
						</Text>
					</View>
				</View>

				<View className="bg-[#FFF3CC] border border-[#FFE8B3] rounded-[24px] p-5 mb-4">
					<View className="flex-row items-start">
						<View className="w-12 h-12 rounded-full bg-[#FFC800] items-center justify-center mr-3">
							<Feather name="refresh-cw" size={22} color="#FFFFFF" />
						</View>
						<View className="flex-1">
							<Text className="font-poppins-bold text-[24px] text-neutral-primary leading-[30px]">
								Practice Hub
							</Text>
							<Text className="font-poppins text-[13px] text-[#8A6500] leading-[20px] mt-1">
								{overview.summary}
							</Text>
						</View>
					</View>
				</View>

				<View className="flex-row gap-2 mb-4">
					<View className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center">
						<Text className="font-poppins-bold text-[20px] text-[#FF9600]">
							{overview.dueConceptCount}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] text-center">
							Due Concepts
						</Text>
					</View>
					<View className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center">
						<Text className="font-poppins-bold text-[20px] text-[#FF4B4B]">
							{overview.recentMistakes.length}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] text-center">
							Recent Misses
						</Text>
					</View>
					<View className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center">
						<Text className="font-poppins-bold text-[20px] text-[#1CB0F6]">
							{overview.weakLessons.length}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] text-center">
							Lessons
						</Text>
					</View>
				</View>

				<View className="bg-white border border-neutral-border rounded-[22px] p-4 mb-4">
					<View className="flex-row items-center justify-between mb-3">
						<Text className="font-poppins-bold text-[16px] text-neutral-primary">
							Review Queue
						</Text>
						<View className="px-2.5 py-1 rounded-full bg-[#F0EDFF]">
							<Text className="font-poppins-bold text-[11px] text-[#6C4EF5]">
								{overview.focusLabel || "Smart mix"}
							</Text>
						</View>
					</View>

					{overview.dueConcepts.length > 0 ? (
						<View className="gap-3">
							{overview.dueConcepts.slice(0, 3).map((concept) => {
								const colors = getReasonColor(concept.reason);
								const recallPercent = Math.round(concept.recallScore * 100);

								return (
									<View
										key={concept.conceptId}
										className="border border-neutral-border rounded-2xl p-3"
									>
										<View className="flex-row items-start">
											<View
												className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${colors.bg}`}
											>
												<Feather name="target" size={16} color={colors.icon} />
											</View>
											<View className="flex-1">
												<View className="flex-row items-center justify-between gap-2">
													<Text className="font-poppins-bold text-[14px] text-neutral-primary flex-1">
														{concept.title}
													</Text>
													<Text className={`font-poppins-bold text-[11px] ${colors.text}`}>
														{getReasonLabel(concept.reason)}
													</Text>
												</View>
												<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1">
													{concept.description}
												</Text>
												<View className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden mt-3">
													<View
														className="h-2 bg-[#58CC02] rounded-full"
														style={{ width: `${Math.max(recallPercent, 8)}%` }}
													/>
												</View>
												<Text className="font-poppins text-[11px] text-neutral-secondary mt-1">
													Memory estimate: {recallPercent}%
												</Text>
											</View>
										</View>
									</View>
								);
							})}
						</View>
					) : (
						<View className="bg-[#F0FFE8] border border-[#D7FFB8] rounded-2xl p-4">
							<Text className="font-poppins-bold text-[14px] text-[#58CC02]">
								All caught up
							</Text>
							<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1">
								No urgent concept needs repair. A short review will keep older phrases active.
							</Text>
						</View>
					)}
				</View>

				<View className="bg-white border border-neutral-border rounded-[22px] p-4 mb-4">
					<Text className="font-poppins-bold text-[16px] text-neutral-primary mb-3">
						Recent Mistakes
					</Text>
					{overview.recentMistakes.length > 0 ? (
						<View className="gap-3">
							{overview.recentMistakes.map((mistake) => (
								<View key={mistake.exerciseId} className="flex-row items-start">
									<View className="w-9 h-9 rounded-full bg-[#FFDFE0] items-center justify-center mr-3">
										<Feather name="alert-circle" size={16} color="#FF4B4B" />
									</View>
									<View className="flex-1">
										<Text className="font-poppins-bold text-[13px] text-neutral-primary">
											{mistake.conceptTitle}
										</Text>
										<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
											{mistake.lessonTitle} • {mistake.question}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : (
						<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
							No fresh mistakes in this language. Nice and tidy.
						</Text>
					)}
				</View>

				<View className="bg-white border border-neutral-border rounded-[22px] p-4 mb-5">
					<Text className="font-poppins-bold text-[16px] text-neutral-primary mb-3">
						Spaced Review
					</Text>
					{overview.weakLessons.length > 0 ? (
						<View className="gap-3">
							{overview.weakLessons.map((lesson) => (
								<View key={lesson.lessonId} className="flex-row items-center">
									<View className="w-9 h-9 rounded-full bg-[#DDF4FF] items-center justify-center mr-3">
										<Feather name="book-open" size={16} color="#1CB0F6" />
									</View>
									<View className="flex-1">
										<Text className="font-poppins-bold text-[13px] text-neutral-primary">
											{lesson.title}
										</Text>
										<Text className="font-poppins text-[12px] text-neutral-secondary">
											{lesson.unitTitle}
										</Text>
									</View>
									<Text className="font-poppins-bold text-[12px] text-[#1CB0F6]">
										{lesson.forgettingScore > 1 ? "Due" : "Soon"}
									</Text>
								</View>
							))}
						</View>
					) : (
						<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
							No older lesson is urgent yet. Smart review will use a balanced warm-up.
						</Text>
					)}
				</View>

				<Button3D
					onPress={handleStartReview}
					variant="primary"
					size="lg"
					title={overview.primaryActionTitle}
				/>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#F6F7FB",
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 36,
	},
});
