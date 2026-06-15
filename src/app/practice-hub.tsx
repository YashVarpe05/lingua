import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View, ScrollView, TouchableOpacity } from "@/tw";
import Button3D from "@/components/Button3D";
import { brand, learning } from "@/theme/colors";
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
			bg: "bg-learning-streak-light",
			text: "text-learning-streak",
			icon: learning.streak,
		};
	}

	if (reason === "due") {
		return {
			bg: "bg-learning-correction-light",
			text: "text-learning-correction",
			icon: learning.correction,
		};
	}

	return {
		bg: "bg-lingua-purple-light",
		text: "text-lingua-purple",
		icon: brand.primary,
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
	const pronunciationConceptMemory = useProgressStore(
		(state) => state.pronunciationConceptMemory
	);
	const latestFailedCheckpointReview = useProgressStore(
		(state) => state.latestFailedCheckpointReview
	);
	const completedCheckpoints = useProgressStore((state) => state.completedCheckpoints) || [];
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
				pronunciationConceptMemory,
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
			pronunciationConceptMemory,
			recentAttempts,
			units,
		]
	);
	const firstPracticeLesson = lessons.find((lesson) => !lesson.isCheckpoint);
	const checkpointRecoveryUnit =
		latestFailedCheckpointReview &&
		!completedCheckpoints.includes(latestFailedCheckpointReview.unitId)
			? units.find((unit) => unit.id === latestFailedCheckpointReview.unitId)
			: undefined;
	const checkpointRecoveryFocusLabel = latestFailedCheckpointReview
		? overview.focusLabel ||
			getPracticeQueueOverview({
				selectedLanguageId: activeLanguageId,
				lessons,
				units,
				recentAttempts,
				conceptMemory,
				pronunciationConceptMemory,
				explicitFocusConceptIds: latestFailedCheckpointReview.focusConceptIds,
				getConceptRecallScore,
				getForgettingScore,
			}).focusLabel
		: "";

	const startModePractice = (
		mode: "mistakes" | "vocabulary" | "listening" | "speaking"
	) => {
		const targetLessonId =
			mode === "speaking"
				? overview.pronunciationConcepts
						.map((concept) => concept.lessonId)
						.find((lessonId): lessonId is string => Boolean(lessonId)) ??
					firstPracticeLesson?.id
				: firstPracticeLesson?.id;

		if (!targetLessonId) return;

		router.push({
			pathname: "/exercise-session",
			params: {
				lessonId: targetLessonId,
				mode,
			},
		});
	};

	const handleStartReview = () => {
		router.push({
			pathname: "/review-session",
			params: {
				focusConceptIds: overview.focusConceptIds.join(","),
				source: "practice-hub",
			},
		});
	};
	const handleStartSpeakingPractice = () => {
		startModePractice("speaking");
	};
	const handleCheckpointPrep = () => {
		if (!latestFailedCheckpointReview || !checkpointRecoveryUnit) return;

		router.push({
			pathname: "/review-session",
			params: {
				focusConceptIds: latestFailedCheckpointReview.focusConceptIds.join(","),
				source: "checkpoint-fail",
				unitId: checkpointRecoveryUnit.id,
			},
		});
	};

	const smartCards = [
		checkpointRecoveryUnit && latestFailedCheckpointReview
			? {
					key: "checkpoint-prep",
					icon: "award" as const,
					title: "Checkpoint Prep",
					subtitle: `Unit ${checkpointRecoveryUnit.order} checkpoint needs a focused review.`,
					meta: checkpointRecoveryFocusLabel
						? `Focus: ${checkpointRecoveryFocusLabel}`
						: `Last score ${latestFailedCheckpointReview.score}%`,
					accent: "#FF9600",
					bg: "bg-[#FFF3CC]",
					border: "border-[#FFE8B3]",
					button: "Review",
					onPress: handleCheckpointPrep,
				}
			: null,
		{
			key: "mistakes",
			icon: "alert-circle" as const,
			title: "Fix Mistakes",
			subtitle:
				overview.recentMistakes.length > 0
					? `${overview.recentMistakes.length} recent ${overview.recentMistakes.length === 1 ? "miss" : "misses"} to repair.`
					: "No fresh mistakes. Start a light repair round anytime.",
			meta: overview.recentMistakes[0]?.conceptTitle ?? "Mistake repair",
			accent: learning.correction,
			bg: "bg-learning-correction-light",
			border: "border-[#FFD1D1]",
			button: "Fix",
			onPress: () => startModePractice("mistakes"),
		},
		{
			key: "weak-skills",
			icon: "target" as const,
			title: "Review Weak Skills",
			subtitle:
				overview.dueConceptCount > 0
					? `${overview.dueConceptCount} ${overview.dueConceptCount === 1 ? "concept is" : "concepts are"} due.`
					: "Smart review will keep older material active.",
			meta: overview.focusLabel ? `Focus: ${overview.focusLabel}` : "Smart mix",
			accent: brand.primary,
			bg: "bg-lingua-purple-light",
			border: "border-[#E1D9FF]",
			button: "Review",
			onPress: handleStartReview,
		},
		{
			key: "speaking",
			icon: "mic" as const,
			title: "Speaking Practice",
			subtitle:
				overview.duePronunciationConceptCount > 0
					? `${overview.duePronunciationConceptCount} pronunciation ${overview.duePronunciationConceptCount === 1 ? "concept needs" : "concepts need"} practice.`
					: "Keep pronunciation warm with a short round.",
			meta: overview.speakingFocusLabel
				? `Focus: ${overview.speakingFocusLabel}`
				: "Pronunciation",
			accent: learning.action,
			bg: "bg-[#E8F9EE]",
			border: "border-[#CFF4D5]",
			button: "Speak",
			onPress: handleStartSpeakingPractice,
		},
		{
			key: "listening",
			icon: "volume-2" as const,
			title: "Listening Practice",
			subtitle: "Train your ear with audio-first exercises.",
			meta: `${selectedLanguage?.name ?? "Language"} listening`,
			accent: learning.selected,
			bg: "bg-learning-selected-light",
			border: "border-[#BDEBFF]",
			button: "Listen",
			onPress: () => startModePractice("listening"),
		},
		{
			key: "vocabulary",
			icon: "book-open" as const,
			title: "Vocabulary Practice",
			subtitle: "Refresh useful words and phrases from your path.",
			meta:
				overview.weakLessons[0]?.title ??
				`${selectedLanguage?.name ?? "Language"} words`,
			accent: "#FFC800",
			bg: "bg-learning-reward-light",
			border: "border-[#FFE8B3]",
			button: "Words",
			onPress: () => startModePractice("vocabulary"),
		},
	].filter((card): card is NonNullable<typeof card> => Boolean(card));

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

				<View className="bg-learning-reward-light border border-[#FFE8B3] rounded-[24px] p-5 mb-4">
					<View className="flex-row items-start">
						<View className="w-12 h-12 rounded-full bg-learning-reward items-center justify-center mr-3">
							<Feather name="refresh-cw" size={22} color="#FFFFFF" />
						</View>
						<View className="flex-1">
							<View className="self-start px-2.5 py-1 rounded-full bg-white/80 border border-[#FFE8B3] mb-2">
								<Text className="font-poppins-bold text-[10px] text-[#8A6500] uppercase tracking-[0.6px]">
									Skill practice
								</Text>
							</View>
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
					<View
						className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center"
						style={styles.statCard}
					>
						<Text className="font-poppins-bold text-[20px] text-learning-streak">
							{overview.dueConceptCount}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] text-center">
							Due Concepts
						</Text>
					</View>
					<View
						className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center"
						style={styles.statCard}
					>
						<Text className="font-poppins-bold text-[20px] text-learning-correction">
							{overview.recentMistakes.length}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] text-center">
							Recent Misses
						</Text>
					</View>
					<View
						className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center"
						style={styles.statCard}
					>
						<Text className="font-poppins-bold text-[20px] text-learning-selected">
							{overview.weakLessons.length}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px] text-center">
							Lessons
						</Text>
					</View>
				</View>

				<View className="mb-4">
					<View className="flex-row items-center justify-between mb-3">
						<Text className="font-poppins-bold text-[16px] text-neutral-primary">
							Recommended Practice
						</Text>
						<View className="px-2.5 py-1 rounded-full bg-white border border-neutral-border">
							<Text className="font-poppins-bold text-[11px] text-neutral-secondary">
								Smart picks
							</Text>
						</View>
					</View>

					<View className="gap-3">
						{smartCards.map((card, index) => {
							const isTopPick = index === 0;
							const buttonVariant =
								isTopPick ? "primary" : card.key === "mistakes" ? "danger" : "secondary";

							return (
								<View
									key={card.key}
									className={`border rounded-[22px] p-4 ${card.bg} ${card.border}`}
									style={[
										styles.practiceCard,
										{
											borderBottomColor: card.accent,
										},
									]}
								>
									<View className="flex-row items-center justify-between mb-3">
										<View className="flex-row items-center">
											<View
												className="w-2 h-2 rounded-full mr-2"
												style={{ backgroundColor: card.accent }}
											/>
											<Text
												className="font-poppins-bold text-[10px] uppercase tracking-[0.6px]"
												style={{ color: card.accent }}
											>
												{isTopPick ? "Best next" : "Practice mode"}
											</Text>
										</View>
										<View className="flex-row gap-1.5">
											<View
												className="w-1.5 h-1.5 rounded-full"
												style={{ backgroundColor: card.accent }}
											/>
											<View className="w-1.5 h-1.5 rounded-full bg-white/80" />
											<View className="w-1.5 h-1.5 rounded-full bg-white/80" />
										</View>
									</View>

									<View className="flex-row items-center justify-between gap-3">
										<View className="flex-row items-start flex-1">
											<View
												className="w-12 h-12 rounded-2xl bg-white items-center justify-center mr-3 border border-white/90"
												style={{ borderBottomWidth: 3, borderBottomColor: card.accent }}
											>
												<View
													className="w-8 h-8 rounded-full items-center justify-center"
													style={{ backgroundColor: card.accent }}
												>
													<Feather name={card.icon} size={17} color="#FFFFFF" />
												</View>
											</View>
											<View className="flex-1">
												<Text className="font-poppins-bold text-[16px] text-neutral-primary">
													{card.title}
												</Text>
												<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1">
													{card.subtitle}
												</Text>
												<Text
													className="font-poppins-bold text-[11px] mt-1"
													style={{ color: card.accent }}
													numberOfLines={1}
												>
													{card.meta}
												</Text>
											</View>
										</View>
										<Button3D
											onPress={card.onPress}
											variant={buttonVariant}
											size="sm"
											title={card.button}
											fullWidth={false}
											style={{ minWidth: 86 }}
										/>
									</View>
								</View>
							);
						})}
					</View>
				</View>

				<View className="bg-white border border-neutral-border rounded-[22px] p-4 mb-4">
					<View className="flex-row items-center justify-between mb-3">
						<Text className="font-poppins-bold text-[16px] text-neutral-primary">
							Review Queue
						</Text>
						<View className="px-2.5 py-1 rounded-full bg-lingua-purple-light">
							<Text className="font-poppins-bold text-[11px] text-lingua-purple">
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
												<View className="h-2 bg-learning-border rounded-full overflow-hidden mt-3">
													<View
														className="h-2 bg-learning-action rounded-full"
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
						<View className="learning-card learning-card--success p-4 flex-row items-start">
							<View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
								<Feather name="check-circle" size={18} color={learning.action} />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[14px] text-learning-action">
									All caught up
								</Text>
								<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1">
									No urgent concept needs repair. A short review will keep older phrases active.
								</Text>
							</View>
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
									<View className="w-9 h-9 rounded-full bg-learning-correction-light items-center justify-center mr-3">
										<Feather name="alert-circle" size={16} color={learning.correction} />
									</View>
									<View className="flex-1">
										<Text className="font-poppins-bold text-[13px] text-neutral-primary">
											{mistake.conceptTitle}
										</Text>
										<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
											{mistake.lessonTitle} - {mistake.question}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : (
						<View className="bg-learning-action-light border border-[#B7EF9B] rounded-2xl p-4 flex-row items-start">
							<View className="w-9 h-9 rounded-full bg-white items-center justify-center mr-3">
								<Feather name="smile" size={17} color={learning.action} />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[13px] text-learning-action">
									No mistakes to fix
								</Text>
								<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1">
									Practice any mode below to keep your memory fresh.
								</Text>
							</View>
						</View>
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
									<View className="w-9 h-9 rounded-full bg-learning-selected-light items-center justify-center mr-3">
										<Feather name="book-open" size={16} color={learning.selected} />
									</View>
									<View className="flex-1">
										<Text className="font-poppins-bold text-[13px] text-neutral-primary">
											{lesson.title}
										</Text>
										<Text className="font-poppins text-[12px] text-neutral-secondary">
											{lesson.unitTitle}
										</Text>
									</View>
									<Text className="font-poppins-bold text-[12px] text-learning-selected">
										{lesson.forgettingScore > 1 ? "Due" : "Soon"}
									</Text>
								</View>
							))}
						</View>
					) : (
						<View className="bg-learning-selected-light border border-[#BDEBFF] rounded-2xl p-4 flex-row items-start">
							<View className="w-9 h-9 rounded-full bg-white items-center justify-center mr-3">
								<Feather name="clock" size={17} color={learning.selected} />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[13px] text-learning-selected">
									Review is balanced
								</Text>
								<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1">
									No older lesson is urgent yet. Smart review will use a gentle warm-up.
								</Text>
							</View>
						</View>
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
	statCard: {
		boxShadow: "0px 2px 6px rgba(13, 19, 43, 0.05)",
	},
	practiceCard: {
		borderBottomWidth: 4,
		boxShadow: "0px 3px 8px rgba(13, 19, 43, 0.06)",
	},
});
