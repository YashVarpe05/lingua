import React, { useEffect, useMemo, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { usePostHog } from "posthog-react-native";
import { blurActiveElement } from "@/utils/dom";
import { brand, learning, neutral } from "@/theme/colors";

const popularIds = ["en", "es", "fr", "ja", "de", "ar"];

const getLanguageLevel = (completed: number, total: number) => {
	if (total > 0 && completed / total >= 0.5) return "Intermediate";
	if (completed > 0) return "Beginner";
	return "Starter";
};

export default function LanguageSelection() {
	const router = useRouter();
	const posthog = usePostHog();
	const { user } = useUser();
	const [searchQuery, setSearchQuery] = useState("");
	const storeLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const setStoreLanguageId = useLanguageStore((state) => state.setSelectedLanguageId);
	const completedLessonIds = useProgressStore((state) => state.completedLessonIds);

	const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(storeLanguageId);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		setSelectedLanguageId(storeLanguageId);
	}, [storeLanguageId]);

	const languageProgress = useMemo(() => {
		const completedIds = completedLessonIds || [];

		return Object.fromEntries(
			languages.map((language) => {
				const path = getLanguageUnitsAndLessons(language.id);
				const lessons = path.lessons.filter((lesson) => !lesson.isCheckpoint);
				const completed = lessons.filter((lesson) => completedIds.includes(lesson.id)).length;

				return [
					language.id,
					{
						completed,
						total: lessons.length,
						level: getLanguageLevel(completed, lessons.length),
					},
				];
			})
		) as Record<string, { completed: number; total: number; level: string }>;
	}, [completedLessonIds]);

	const displayName = user?.firstName ?? user?.fullName ?? "Learner";
	const selectedLanguage = languages.find((language) => language.id === selectedLanguageId);
	const selectedProgress = selectedLanguageId
		? languageProgress[selectedLanguageId]
		: undefined;

	const handleConfirm = async () => {
		if (!selectedLanguageId) return;
		try {
			blurActiveElement();
			const selectedLang = languages.find((language) => language.id === selectedLanguageId);
			posthog.capture("language_selected", {
				language_id: selectedLanguageId,
				language_name: selectedLang?.name ?? null,
				is_change: !!storeLanguageId && storeLanguageId !== selectedLanguageId,
			});
			await setStoreLanguageId(selectedLanguageId);
			router.replace("/" as any);
		} catch (err) {
			console.error("Failed to save language selection:", err);
		}
	};

	const filteredLanguages = languages.filter(
		(language) =>
			language.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			language.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const displayLanguages = searchQuery === "" && !expanded
		? filteredLanguages.filter((language) => popularIds.includes(language.id))
		: filteredLanguages;

	return (
		<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoid}
			>
				<View style={styles.screen}>
					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={styles.scrollContent}
						contentInsetAdjustmentBehavior="automatic"
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.headerCard}>
							<View className="flex-row items-center justify-between">
								<View className="flex-row items-center flex-1">
									<Image
										source={user?.imageUrl || images.userAvatar}
										style={styles.avatar}
										contentFit="cover"
									/>
									<View className="ml-3 flex-1">
										<Text className="font-poppins text-[12px] text-[#6B7280]">
											Welcome back
										</Text>
										<Text className="font-poppins-bold text-[18px] text-[#111827]" numberOfLines={1}>
											{displayName}
										</Text>
									</View>
								</View>
								<View style={styles.pathCountPill}>
									<Feather name="book-open" size={14} color="#58A700" />
									<Text className="font-poppins-bold text-[11px] text-[#3C3C3C] ml-1">
										{popularIds.length} core
									</Text>
								</View>
							</View>

							<View className="flex-row items-center mt-4">
								<View style={styles.searchBox}>
									<Feather name="search" size={17} color="#8D92A0" />
									<TextInput
										value={searchQuery}
										onChangeText={setSearchQuery}
										placeholder="Find your language"
										placeholderTextColor="#8D92A0"
										style={styles.textInput}
										autoCapitalize="none"
										autoCorrect={false}
									/>
								</View>
								<TouchableOpacity
									onPress={() => setExpanded((current) => !current)}
									activeOpacity={0.75}
									style={styles.filterButton}
								>
									<Feather
										name={expanded ? "chevron-up" : "sliders"}
										size={18}
										color="#FFFFFF"
									/>
								</TouchableOpacity>
							</View>
						</View>

						<View style={styles.questionCard}>
							<View style={styles.questionBadge}>
								<View style={styles.questionDot} />
								<Text className="font-poppins-bold text-[11px] text-[#3C3C3C] uppercase tracking-[0.8px]">
									Step 1 of 3
								</Text>
							</View>
							<Text className="font-poppins-bold text-[28px] text-[#111827] leading-[34px] mt-4">
								What language do you want to learn?
							</Text>
							<Text className="font-poppins text-[14px] text-[#6B7280] leading-[22px] mt-2">
								Choose one path now. You can switch or add another language later.
							</Text>
						</View>

						<View className="flex-row items-center justify-between mt-5 mb-3">
							<View>
								<Text className="font-poppins-bold text-[18px] text-[#111827]">
									{expanded || searchQuery ? "All languages" : "Popular paths"}
								</Text>
								<Text className="font-poppins text-[12px] text-[#6B7280] mt-0.5">
									{displayLanguages.length} options available
								</Text>
							</View>
							{selectedLanguage ? (
								<View style={styles.selectedMiniPill}>
									<Image
										source={selectedLanguage.flag}
										style={styles.selectedMiniFlag}
										contentFit="cover"
									/>
									<Text className="font-poppins-bold text-[11px] text-[#3C3C3C] ml-1" numberOfLines={1}>
										{selectedLanguage.name}
									</Text>
								</View>
							) : null}
						</View>

						<View style={styles.languageGrid}>
							{displayLanguages.length === 0 ? (
								<View style={styles.emptyState}>
									<Feather name="search" size={22} color="#8D92A0" />
									<Text className="font-poppins-bold text-[15px] text-[#111827] text-center mt-2">
										No languages found
									</Text>
									<Text className="font-poppins text-[12px] text-[#6B7280] text-center mt-1">
										Try another search term.
									</Text>
								</View>
							) : (
								displayLanguages.map((item) => {
									const isSelected = selectedLanguageId === item.id;
									const progress = languageProgress[item.id] || {
										completed: 0,
										total: 0,
										level: "Starter",
									};
									const badgeText = `${progress.completed}/${progress.total || 12}`;

									return (
										<TouchableOpacity
											key={item.id}
											onPress={() => setSelectedLanguageId(item.id)}
											activeOpacity={0.82}
											style={[
												styles.languageCard,
												isSelected ? styles.languageCardSelected : null,
											]}
										>
											<View className="flex-row items-start justify-between">
												<Image
													source={item.flag}
													style={styles.flagImage}
													contentFit="cover"
												/>
												<View
													style={[
														styles.progressBadge,
														isSelected ? styles.progressBadgeSelected : null,
													]}
												>
													<Text className="font-poppins-bold text-[10px] text-[#3C3C3C]">
														{badgeText}
													</Text>
												</View>
											</View>

											<View className="mt-auto">
												<View className="flex-row items-center justify-between">
													<Text className="font-poppins-bold text-[16px] text-[#111827] flex-1" numberOfLines={1}>
														{item.name}
													</Text>
													{isSelected ? (
														<View style={styles.selectedCheck}>
															<Feather name="check" size={12} color="#FFFFFF" />
														</View>
													) : null}
												</View>
												<Text className="font-poppins text-[11px] text-[#6B7280] mt-1" numberOfLines={1}>
													{item.nativeName}
													{" \u00B7 "}
													{progress.level}
												</Text>
											</View>
										</TouchableOpacity>
									);
								})
							)}
						</View>

						{searchQuery === "" ? (
							<TouchableOpacity
								onPress={() => setExpanded((current) => !current)}
								activeOpacity={0.75}
								style={styles.seeAllButton}
							>
								<View className="flex-row items-center">
									<Feather name="layers" size={16} color="#5537D2" />
									<Text className="font-poppins-bold text-[13px] text-[#5537D2] ml-2">
										{expanded ? "Show popular courses" : "See all languages"}
									</Text>
								</View>
								<Feather
									name={expanded ? "chevron-up" : "arrow-right"}
									size={16}
									color="#5537D2"
								/>
							</TouchableOpacity>
						) : null}
					</ScrollView>

					<View style={styles.footer}>
						<View className="flex-row items-center justify-between mb-3">
							<View className="flex-1 pr-3">
								<Text className="font-poppins-bold text-[13px] text-[#111827]" numberOfLines={1}>
									{selectedLanguage ? `${selectedLanguage.name} path selected` : "Choose a language"}
								</Text>
								<Text className="font-poppins text-[11px] text-[#6B7280] mt-0.5" numberOfLines={1}>
									{selectedProgress
										? `${selectedProgress.completed}/${selectedProgress.total || 12} lessons completed`
										: "Your first lesson unlocks after this step"}
								</Text>
							</View>
							{selectedLanguage ? (
								<Image
									source={selectedLanguage.flag}
									style={styles.footerFlag}
									contentFit="cover"
								/>
							) : null}
						</View>
						<TouchableOpacity
							onPress={handleConfirm}
							activeOpacity={0.8}
							disabled={!selectedLanguageId}
							style={[
								styles.continueButton,
								!selectedLanguageId ? styles.continueButtonDisabled : null,
							]}
						>
							<Text className="font-poppins-bold text-[16px] text-white">
								Continue
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#F7FAFC",
	},
	keyboardAvoid: {
		flex: 1,
	},
	screen: {
		flex: 1,
		backgroundColor: "#F7FAFC",
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: 150,
	},
	headerCard: {
		borderRadius: 28,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		padding: 14,
		boxShadow: "0px 14px 30px rgba(17, 24, 39, 0.07)",
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		borderWidth: 3,
		borderColor: "#F2F7FF",
	},
	pathCountPill: {
		minHeight: 34,
		borderRadius: 17,
		backgroundColor: learning.actionLight,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 11,
	},
	searchBox: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#F6F8FB",
		borderWidth: 1,
		borderColor: "#E7EBF2",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
	},
	textInput: {
		flex: 1,
		marginLeft: 8,
		fontFamily: "Poppins-Regular",
		fontSize: 14,
		color: neutral.textPrimary,
		padding: 0,
		height: 24,
		...Platform.select({
			web: {
				outlineStyle: "none",
			} as any,
		}),
	},
	filterButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: brand.primary,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 10,
		boxShadow: "0px 10px 18px rgba(108, 78, 245, 0.20)",
	},
	questionCard: {
		borderRadius: 30,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		padding: 18,
		marginTop: 16,
		boxShadow: "0px 14px 30px rgba(17, 24, 39, 0.06)",
	},
	questionBadge: {
		alignSelf: "flex-start",
		minHeight: 32,
		borderRadius: 16,
		backgroundColor: brand.primaryLight,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 11,
	},
	questionDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		backgroundColor: brand.primary,
		marginRight: 8,
	},
	selectedMiniPill: {
		maxWidth: 150,
		minHeight: 34,
		borderRadius: 17,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 9,
	},
	selectedMiniFlag: {
		width: 20,
		height: 20,
		borderRadius: 10,
	},
	languageGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	languageCard: {
		width: "47.9%",
		minHeight: 150,
		borderRadius: 22,
		backgroundColor: "#FFFFFF",
		borderWidth: 2,
		borderColor: "#EEF1F6",
		padding: 14,
		boxShadow: "0px 10px 22px rgba(17, 24, 39, 0.06)",
	},
	languageCardSelected: {
		borderColor: learning.action,
		backgroundColor: "#FBFFF8",
		boxShadow: "0px 12px 24px rgba(88, 204, 2, 0.15)",
	},
	flagImage: {
		width: 50,
		height: 50,
		borderRadius: 25,
	},
	progressBadge: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#FFFFFF",
		borderWidth: 2,
		borderColor: "#CFEA5E",
		alignItems: "center",
		justifyContent: "center",
	},
	progressBadgeSelected: {
		borderColor: learning.action,
		backgroundColor: learning.actionLight,
	},
	selectedCheck: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: learning.action,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 6,
	},
	emptyState: {
		width: "100%",
		borderRadius: 24,
		backgroundColor: "#FFFFFF",
		padding: 26,
		borderWidth: 1,
		borderColor: "#E8EAF0",
		alignItems: "center",
	},
	seeAllButton: {
		height: 50,
		borderRadius: 25,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		paddingHorizontal: 16,
		marginTop: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		boxShadow: "0px 8px 18px rgba(17, 24, 39, 0.06)",
	},
	footer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 18,
		paddingTop: 12,
		paddingBottom: 18,
		backgroundColor: "rgba(247, 250, 252, 0.96)",
		borderTopWidth: 1,
		borderTopColor: "rgba(229, 231, 235, 0.78)",
	},
	footerFlag: {
		width: 38,
		height: 38,
		borderRadius: 19,
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	continueButton: {
		height: 56,
		borderRadius: 28,
		backgroundColor: learning.action,
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 12px 20px rgba(88, 204, 2, 0.25)",
	},
	continueButtonDisabled: {
		backgroundColor: "#C6CCD8",
		boxShadow: "0px 8px 18px rgba(17, 24, 39, 0.08)",
	},
});
