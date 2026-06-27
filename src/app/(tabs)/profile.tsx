import React from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import { getLessonById } from "@/data/lessons";
import { units } from "@/data/units";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore, type LessonMemoryEntry } from "@/store/useProgressStore";
import { Lesson } from "@/types/learning";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { brand, learning, neutral } from "@/theme/colors";

const getLevelProgress = (xp: number) => {
	if (xp >= 900) return { progress: 100, label: "Max Level" };
	if (xp >= 500) return { progress: ((xp - 500) / 400) * 100, label: `${xp} / 900 XP` };
	if (xp >= 250) return { progress: ((xp - 250) / 250) * 100, label: `${xp} / 500 XP` };
	if (xp >= 100) return { progress: ((xp - 100) / 150) * 100, label: `${xp} / 250 XP` };
	return { progress: xp, label: `${xp} / 100 XP` };
};

const getLessonMeta = (lesson: Lesson) => {
	const unit = units.find((item) => item.id === lesson.unitId);
	const language = languages.find((item) => item.id === unit?.languageId);

	return {
		languageName: language?.name ?? "Unknown Language",
		unitName: unit?.title ?? "Unknown Unit",
	};
};

type LessonHistoryItem = {
	lesson: Lesson;
	memory: LessonMemoryEntry;
	meta: ReturnType<typeof getLessonMeta>;
	isCompleted: boolean;
};

const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);
const dayMs = 24 * 60 * 60 * 1000;
const shortMonths = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatPracticeDate = (timestamp: number) => {
	const practiceDate = new Date(timestamp);
	const today = new Date();
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
	const practiceStart = new Date(
		practiceDate.getFullYear(),
		practiceDate.getMonth(),
		practiceDate.getDate()
	).getTime();
	const dayDiff = Math.round((todayStart - practiceStart) / dayMs);

	if (dayDiff === 0) return "Today";
	if (dayDiff === 1) return "Yesterday";

	const dateLabel = `${shortMonths[practiceDate.getMonth()]} ${practiceDate.getDate()}`;
	return practiceDate.getFullYear() === today.getFullYear()
		? dateLabel
		: `${dateLabel}, ${practiceDate.getFullYear()}`;
};

const formatPracticeCount = (count: number) =>
	count === 1 ? "1 practice" : `${count} practices`;

const getScoreTone = (score: number) => {
	const safeScore = Math.round(clampPercent(score));

	if (safeScore >= 80) {
		return {
			label: `${safeScore}%`,
			backgroundColor: learning.actionLight,
			color: learning.actionDark,
		};
	}

	if (safeScore >= 60) {
		return {
			label: `${safeScore}%`,
			backgroundColor: learning.rewardLight,
			color: "#B86E00",
		};
	}

	return {
		label: `${safeScore}%`,
		backgroundColor: learning.correctionLight,
		color: learning.correctionDark,
	};
};

export default function ProfileScreen() {
	const router = useRouter();
	const { signOut } = useClerk();
	const { user } = useUser();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completedLessonIds = useProgressStore((state) => state.completedLessonIds) || [];
	const completedCheckpoints = useProgressStore((state) => state.completedCheckpoints) || [];
	const lessonMemory = useProgressStore((state) => state.lessonMemory) || {};
	const streak = useProgressStore((state) => state.streak) || 0;
	const xp = useProgressStore((state) => state.xp) || 0;
	const todayXP = useProgressStore((state) => state.todayXP) || 0;
	const level = useProgressStore((state) => state.level) || 1;
	const getDueConceptCount = useProgressStore((state) => state.getDueConceptCount);
	const getWeakConcepts = useProgressStore((state) => state.getWeakConcepts);
	const getDuePronunciationConceptCount = useProgressStore(
		(state) => state.getDuePronunciationConceptCount
	);

	const selectedLanguage = languages.find((language) => language.id === selectedLanguageId) || null;
	const displayName = user?.fullName ?? user?.username ?? "Learner";
	const email = user?.primaryEmailAddress?.emailAddress ?? "";
	const initial = displayName.charAt(0).toUpperCase();
	const recentLessonHistory = Object.values(lessonMemory)
		.map((memory): LessonHistoryItem | null => {
			const lesson = getLessonById(memory.lessonId);
			if (!lesson) return null;

			return {
				lesson,
				memory,
				meta: getLessonMeta(lesson),
				isCompleted: completedLessonIds.includes(lesson.id),
			};
		})
		.filter((item): item is LessonHistoryItem => Boolean(item))
		.sort((a, b) => b.memory.lastPracticed - a.memory.lastPracticed)
		.slice(0, 6);
	const levelProgress = getLevelProgress(xp);
	const earnedProgressWidth = `${clampPercent(levelProgress.progress)}%` as `${number}%`;
	const selectedWeakConcepts = getWeakConcepts(24).filter(
		(entry) => !selectedLanguage?.id || entry.conceptId.startsWith(`${selectedLanguage.id}:`)
	);
	const dueConceptCount = selectedLanguage
		? selectedWeakConcepts.filter(
				(entry) => (entry.latestRecallScore ?? 1) < 0.65 || entry.incorrectCount > entry.correctCount
			).length
		: getDueConceptCount();
	const weakConceptCount = selectedWeakConcepts.slice(0, 6).length;
	const duePronunciationCount = getDuePronunciationConceptCount(selectedLanguage?.id);
	const activeWeekDays = Math.min(streak, weekDays.length);
	const activePath = selectedLanguage
		? getLanguageUnitsAndLessons(selectedLanguage.id)
		: { units: [], lessons: [] };
	const activeLessons = activePath.lessons.filter((lesson) => !lesson.isCheckpoint);
	const completedLanguageLessons = activeLessons.filter((lesson) =>
		completedLessonIds.includes(lesson.id)
	).length;
	const completedLanguageCheckpoints = activePath.units.filter((unit) =>
		completedCheckpoints.includes(unit.id)
	).length;
	const languageProgressPercent = activeLessons.length
		? clampPercent((completedLanguageLessons / activeLessons.length) * 100)
		: 0;
	const earnedAchievementCount = [
		completedLessonIds.length >= 1,
		streak >= 3,
		xp >= 100,
		streak >= 7,
		completedLessonIds.length >= 5,
		xp >= 500,
	].filter(Boolean).length;
	const achievements = [
		{ id: "first-step", emoji: "\u{1F3AF}", label: "First Step", earned: completedLessonIds.length >= 1 },
		{ id: "on-fire", emoji: "\u{1F525}", label: "On Fire", earned: streak >= 3 },
		{ id: "xp-hunter", emoji: "\u26A1", label: "XP Hunter", earned: xp >= 100 },
		{ id: "dedicated", emoji: "\u{1F4C5}", label: "Dedicated", earned: streak >= 7 },
		{ id: "scholar", emoji: "\u{1F4DA}", label: "Scholar", earned: completedLessonIds.length >= 5 },
		{ id: "champion", emoji: "\u{1F3C6}", label: "Champion", earned: xp >= 500 },
	];
	const planFocus = dueConceptCount > 0
		? "Memory review"
		: duePronunciationCount > 0
			? "Speaking rhythm"
			: "Keep your streak";
	const planSummary = selectedLanguage
		? `${completedLanguageLessons} of ${activeLessons.length} lessons completed`
		: "Choose a language to build your plan";

	const handlePracticeLesson = (lessonId: string) => {
		router.push({
			pathname: "/exercise-session",
			params: { lessonId, mode: "review" },
		});
	};

	const handleSignOut = async () => {
		try {
			await signOut();
			router.replace("/onboarding");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Please try again.";
			console.error("Sign out failed:", message);
			Alert.alert("Sign out failed", "We could not sign you out. Please try again.");
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.profileContentShell}>
				<View style={styles.heroCard}>
					<View className="flex-row items-start justify-between">
						<View className="flex-1 pr-4">
							<Text className="font-poppins-semibold text-[12px] text-[#7A3FF2] uppercase tracking-[1px]">
								Personal study plan
							</Text>
							<Text className="font-poppins-bold text-[28px] text-[#18171F] leading-[34px] mt-2" numberOfLines={2}>
								{displayName}
							</Text>
							{email ? (
								<Text className="font-poppins text-[13px] text-[#686472] mt-1" numberOfLines={1}>
									{email}
								</Text>
							) : null}
						</View>
						<View style={styles.avatarRing}>
							{user?.imageUrl ? (
								<Image source={user.imageUrl} style={styles.avatar} contentFit="cover" />
							) : (
								<View style={styles.avatarFallback}>
									<Text className="font-poppins-bold text-[30px] text-white">
										{initial}
									</Text>
								</View>
							)}
						</View>
					</View>

					<TouchableOpacity
						onPress={() => router.push("/languages")}
						activeOpacity={0.75}
						style={styles.languageChip}
					>
						{selectedLanguage ? (
							<Image
								source={selectedLanguage.flag}
								style={styles.languageChipFlag}
								contentFit="cover"
							/>
						) : (
							<Feather name="globe" size={15} color="#7A3FF2" />
						)}
						<View className="flex-1">
							<Text className="font-poppins-bold text-[13px] text-[#18171F]" numberOfLines={1}>
								{selectedLanguage?.name ?? "Choose language"}
							</Text>
							<Text className="font-poppins text-[11px] text-[#7D7787]" numberOfLines={1}>
								{planSummary}
							</Text>
						</View>
						<Feather name="chevron-right" size={16} color="#7A3FF2" />
					</TouchableOpacity>

					<View className="flex-row gap-2 mt-4">
						<View style={styles.heroPill}>
							<Image source={images.streakFire} style={styles.heroPillIcon} contentFit="contain" />
							<Text className="font-poppins-bold text-[12px] text-[#18171F]">
								{streak} Streak
							</Text>
						</View>
						<View style={styles.heroPill}>
							<Image source={images.appIconLightning} style={styles.heroPillIcon} contentFit="contain" />
							<Text className="font-poppins-bold text-[12px] text-[#18171F]">
								{xp} XP
							</Text>
						</View>
						<View style={styles.heroPill}>
							<Image source={images.appIconStar} style={styles.heroPillIcon} contentFit="contain" />
							<Text className="font-poppins-bold text-[12px] text-[#18171F]">
								Level {level}
							</Text>
						</View>
					</View>
				</View>

				<View style={styles.calendarCard}>
					<View className="flex-row items-center justify-between mb-3">
						<View>
							<Text className="font-poppins-bold text-[17px] text-[#18171F]">
								Study rhythm
							</Text>
							<Text className="font-poppins text-[12px] text-[#7D7787] mt-0.5">
								{planFocus}
							</Text>
						</View>
						<View style={styles.focusBadge}>
							<Feather name="star" size={14} color="#7A3FF2" />
							<Text className="font-poppins-bold text-[11px] text-[#7A3FF2] ml-1">
								AI focus
							</Text>
						</View>
					</View>
					<View className="flex-row justify-between">
						{weekDays.map((day, index) => {
							const isActive = index < activeWeekDays;

							return (
								<View key={`${day}-${index}`} className="items-center gap-2">
									<Text className="font-poppins-bold text-[11px] text-[#7D7787]">
										{day}
									</Text>
									<View
										style={[
											styles.calendarDot,
											isActive ? styles.calendarDotActive : styles.calendarDotMuted,
										]}
									>
										{isActive ? (
											<Feather name="check" size={13} color="#FFFFFF" />
										) : null}
									</View>
								</View>
							);
						})}
					</View>
				</View>

				<View style={styles.progressCard}>
					<View className="flex-row items-center justify-between mb-4">
						<View>
							<Text className="font-poppins-bold text-[17px] text-[#18171F]">
								Learning Progress
							</Text>
							<Text className="font-poppins text-[12px] text-[#7D7787] mt-0.5">
								{selectedLanguage ? `${selectedLanguage.name} path` : "Choose a language to begin"}
							</Text>
						</View>
						{selectedLanguage ? (
							<Image
								source={selectedLanguage.flag}
								style={styles.languageFlag}
								contentFit="cover"
							/>
						) : (
							<TouchableOpacity
								onPress={() => router.push("/languages")}
								activeOpacity={0.75}
								style={styles.chooseLanguageButton}
							>
								<Text className="font-poppins-bold text-[11px] text-lingua-purple">
									Choose
								</Text>
							</TouchableOpacity>
						)}
					</View>

					<View className="flex-row gap-2 mb-4">
						<View style={styles.progressMiniStat}>
							<Text className="font-poppins-bold text-[18px] text-[#18171F]">
								{completedLanguageLessons}/{activeLessons.length}
							</Text>
							<Text className="font-poppins text-[10px] text-[#7D7787]">
								Lessons
							</Text>
						</View>
						<View style={styles.progressMiniStat}>
							<Text className="font-poppins-bold text-[18px] text-[#18171F]">
								{completedLanguageCheckpoints}/{activePath.units.length}
							</Text>
							<Text className="font-poppins text-[10px] text-[#7D7787]">
								Checkpoints
							</Text>
						</View>
					</View>

					<View style={styles.progressTrack}>
						<View
							style={[
								styles.progressFill,
								{ width: `${languageProgressPercent}%` },
							]}
						/>
					</View>
					<View className="flex-row items-center justify-between mt-2">
						<Text className="font-poppins text-[11px] text-[#7D7787]">
							Path progress: {Math.round(languageProgressPercent)}%
						</Text>
						<Text className="font-poppins-bold text-[11px] text-[#7A3FF2]">
							{levelProgress.label}
						</Text>
					</View>
					<View style={styles.levelTrack}>
						<View
							style={[styles.levelFill, { width: earnedProgressWidth }]}
						/>
					</View>
				</View>

				<View className="flex-row gap-3 mb-3">
					<View style={[styles.statCard, styles.statCardBlue]}>
						<View className="flex-row items-center justify-between">
							<Image source={images.appIconBook} style={styles.statIconImage} contentFit="contain" />
							<View style={styles.statArrow}>
								<Feather name="arrow-up-right" size={15} color="#7A3FF2" />
							</View>
						</View>
						<Text className="font-poppins-bold text-[28px] text-[#18171F] mt-3">
							{completedLessonIds.length}
						</Text>
						<Text className="font-poppins text-[12px] text-[#686472]">
							Lessons Done
						</Text>
					</View>
					<View style={[styles.statCard, styles.statCardOrange]}>
						<View className="flex-row items-center justify-between">
							<Image source={images.streakFire} style={styles.statIconImage} contentFit="contain" />
							<View style={styles.statArrow}>
								<Feather name="arrow-up-right" size={15} color="#7A3FF2" />
							</View>
						</View>
						<Text className="font-poppins-bold text-[28px] text-[#18171F] mt-3">
							{streak}
						</Text>
						<Text className="font-poppins text-[12px] text-[#686472]">
							Day Streak
						</Text>
					</View>
				</View>

				<View className="flex-row gap-3 mb-5">
					<View style={[styles.statCard, styles.statCardPurple]}>
						<View className="flex-row items-center justify-between">
							<Image source={images.appIconLightning} style={styles.statIconImage} contentFit="contain" />
							<View style={styles.statArrow}>
								<Feather name="arrow-up-right" size={15} color="#7A3FF2" />
							</View>
						</View>
						<Text className="font-poppins-bold text-[28px] text-[#18171F] mt-3">
							{xp}
						</Text>
						<Text className="font-poppins text-[12px] text-[#686472]">
							Total XP
						</Text>
					</View>
					<View style={[styles.statCard, styles.statCardGreen]}>
						<View className="flex-row items-center justify-between">
							<Image source={images.appIconTimer} style={styles.statIconImage} contentFit="contain" />
							<View style={styles.statArrow}>
								<Feather name="arrow-up-right" size={15} color="#7A3FF2" />
							</View>
						</View>
						<Text className="font-poppins-bold text-[28px] text-[#18171F] mt-3">
							{todayXP}
						</Text>
						<Text className="font-poppins text-[12px] text-[#686472]">
							XP Today
						</Text>
					</View>
				</View>

				<View style={styles.healthCard}>
					<View className="flex-row items-center justify-between mb-3">
						<View>
							<Text className="font-poppins-bold text-[17px] text-[#18171F]">
								Learning Health
							</Text>
							<Text className="font-poppins text-[12px] text-[#7D7787]">
								Memory and speaking signals
							</Text>
						</View>
						<View style={styles.healthIcon}>
							<Feather name="activity" size={18} color="#7A3FF2" />
						</View>
					</View>
					<View className="gap-2">
						<View style={styles.healthItem}>
							<View style={styles.healthMiniIcon}>
								<Feather name="repeat" size={15} color="#7A3FF2" />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[13px] text-[#18171F]">
									Memory review
								</Text>
								<Text className="font-poppins text-[11px] text-[#7D7787]">
									{dueConceptCount} concepts due
								</Text>
							</View>
							<View style={dueConceptCount > 0 ? styles.selectedRing : styles.emptyRing} />
						</View>
						<View style={styles.healthItem}>
							<View style={styles.healthMiniIcon}>
								<Feather name="bar-chart-2" size={15} color="#7A3FF2" />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[13px] text-[#18171F]">
									Weak skills
								</Text>
								<Text className="font-poppins text-[11px] text-[#7D7787]">
									{weakConceptCount} skills to strengthen
								</Text>
							</View>
							<View style={weakConceptCount > 0 ? styles.selectedRing : styles.emptyRing} />
						</View>
						<View style={styles.healthItem}>
							<View style={styles.healthMiniIcon}>
								<Feather name="mic" size={15} color="#7A3FF2" />
							</View>
							<View className="flex-1">
								<Text className="font-poppins-bold text-[13px] text-[#18171F]">
									Speaking practice
								</Text>
								<Text className="font-poppins text-[11px] text-[#7D7787]">
									{duePronunciationCount} pronunciation items due
								</Text>
							</View>
							<View style={duePronunciationCount > 0 ? styles.selectedRing : styles.emptyRing} />
						</View>
					</View>
				</View>

				<View className="mb-6">
					<View className="flex-row items-center justify-between mb-3">
						<Text className="font-poppins-bold text-[16px] text-neutral-primary">
							Achievements
						</Text>
						<View className="px-2.5 py-1 rounded-full bg-learning-reward-light border border-[#FFE8B3]">
							<Text className="font-poppins-bold text-[11px] text-[#A97800]">
								{earnedAchievementCount} / {achievements.length} earned
							</Text>
						</View>
					</View>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.achievementScroll}
					>
						{achievements.map((achievement) => (
							<View key={achievement.id} className="items-center w-[76px]">
								<View
									style={[
										styles.achievementCircle,
										achievement.earned
											? styles.achievementCircleEarned
											: styles.achievementCircleLocked,
									]}
								>
									<Text className="text-[25px]">
										{achievement.earned ? achievement.emoji : "\u{1F512}"}
									</Text>
								</View>
								<Text
									className={`font-poppins-semibold text-[11px] text-center mt-2 leading-[14px] ${
										achievement.earned ? "text-neutral-primary" : "text-neutral-secondary"
									}`}
								>
									{achievement.label}
								</Text>
							</View>
						))}
					</ScrollView>
				</View>

				<View className="mb-6">
					<Text className="font-poppins-bold text-[16px] text-neutral-primary mb-3">
						Lesson History
					</Text>
					{recentLessonHistory.length === 0 ? (
						<View style={styles.emptyLessonsCard}>
							<Image source={images.appIconBook} style={styles.emptyLessonsIcon} contentFit="contain" />
							<Text className="font-poppins-bold text-[14px] text-neutral-primary text-center">
								No practice history yet
							</Text>
							<Text className="font-poppins text-[12px] text-neutral-secondary text-center mt-1 leading-[18px]">
								Complete a lesson or review session and your recent work will appear here.
							</Text>
						</View>
					) : (
						<View className="gap-2.5">
							{recentLessonHistory.map(({ lesson, memory, meta, isCompleted }) => {
								const scoreTone = getScoreTone(memory.avgScore);

								return (
									<View key={lesson.id} style={styles.completedLessonCard}>
										<View style={styles.completedLessonIcon}>
											<Image source={images.appIconBook} style={styles.completedLessonIconImage} contentFit="contain" />
										</View>
										<View className="flex-1 mr-3">
											<Text className="font-poppins-bold text-[14px] text-neutral-primary" numberOfLines={1}>
												{lesson.title}
											</Text>
											<Text className="font-poppins text-[12px] text-neutral-secondary mt-1" numberOfLines={1}>
												{meta.languageName} - {meta.unitName}
											</Text>
											<View style={styles.historyMetaRow}>
												<Text className="font-poppins-semibold text-[11px] text-neutral-secondary">
													{formatPracticeDate(memory.lastPracticed)}
												</Text>
												<View style={styles.historyMetaDot} />
												<Text className="font-poppins-semibold text-[11px] text-neutral-secondary">
													{formatPracticeCount(memory.practiceCount)}
												</Text>
											</View>
											<View style={styles.historyBadgeRow}>
												<View
													style={[
														styles.scoreBadge,
														{ backgroundColor: scoreTone.backgroundColor },
													]}
												>
													<Text
														className="font-poppins-bold text-[11px]"
														style={[styles.scoreBadgeText, { color: scoreTone.color }]}
													>
														{scoreTone.label}
													</Text>
												</View>
												<View
													style={[
														styles.statusBadge,
														isCompleted ? styles.statusBadgeDone : styles.statusBadgePractice,
													]}
												>
													<Text
														className="font-poppins-bold text-[11px]"
														style={[
															styles.statusBadgeText,
															{ color: isCompleted ? learning.actionDark : brand.primaryDark },
														]}
													>
														{isCompleted ? "Completed" : "Practiced"}
													</Text>
												</View>
											</View>
										</View>
										<TouchableOpacity
											activeOpacity={0.8}
											onPress={() => handlePracticeLesson(lesson.id)}
											style={styles.practiceAgainButton}
										>
											<Feather name="refresh-cw" size={15} color={brand.primary} />
											<Text className="font-poppins-bold text-[11px]" style={styles.practiceAgainText}>
												Practice
											</Text>
										</TouchableOpacity>
									</View>
								);
							})}
						</View>
					)}
				</View>

				<TouchableOpacity
					onPress={handleSignOut}
					activeOpacity={0.75}
					style={styles.signOutButton}
				>
					<Feather name="log-out" size={17} color={learning.correction} />
					<Text style={styles.signOutText} className="font-poppins-bold text-[15px] ml-2">
						Sign Out
					</Text>
				</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#F7FAFC",
	},
	scrollView: {
		flex: 1,
		backgroundColor: "#F7FAFC",
	},
	scrollContent: {
		alignItems: "center",
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: 112,
	},
	profileContentShell: {
		width: "100%",
		maxWidth: 460,
	},
	heroCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 30,
		padding: 20,
		marginBottom: 16,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		boxShadow: "0px 12px 28px rgba(13, 19, 43, 0.08)",
	},
	avatarRing: {
		width: 82,
		height: 82,
		borderRadius: 41,
		backgroundColor: "#EFE8FF",
		borderWidth: 5,
		borderColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 8px 18px rgba(122, 63, 242, 0.20)",
	},
	avatar: {
		width: 68,
		height: 68,
		borderRadius: 34,
	},
	avatarFallback: {
		width: 68,
		height: 68,
		borderRadius: 34,
		backgroundColor: "#7A3FF2",
		alignItems: "center",
		justifyContent: "center",
	},
	languageChip: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: "#F8F7FA",
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "#EBE7F1",
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginTop: 18,
	},
	languageChipFlag: {
		width: 28,
		height: 28,
		borderRadius: 14,
	},
	heroPill: {
		flex: 1,
		minHeight: 42,
		borderRadius: 21,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EFEAF8",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
		boxShadow: "0px 6px 14px rgba(24, 23, 31, 0.06)",
	},
	heroPillIcon: {
		width: 15,
		height: 15,
		marginRight: 5,
	},
	calendarCard: {
		backgroundColor: "#FFF5EF",
		borderWidth: 1,
		borderColor: "#F6DDD0",
		borderRadius: 28,
		padding: 16,
		marginBottom: 14,
		boxShadow: "0px 8px 20px rgba(83, 62, 54, 0.06)",
	},
	focusBadge: {
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EFE7FF",
		paddingHorizontal: 10,
		paddingVertical: 7,
		flexDirection: "row",
		alignItems: "center",
	},
	calendarDot: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
	calendarDotActive: {
		backgroundColor: "#7A3FF2",
		boxShadow: "0px 4px 10px rgba(122, 63, 242, 0.24)",
	},
	calendarDotMuted: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEE9E4",
	},
	statCard: {
		flex: 1,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEE9F1",
		borderRadius: 24,
		padding: 16,
		boxShadow: "0px 8px 20px rgba(24, 23, 31, 0.06)",
	},
	statCardBlue: {
		backgroundColor: "#EAF8FF",
		borderColor: "#D7EFFB",
	},
	statCardOrange: {
		backgroundColor: "#FFF1D5",
		borderColor: "#F8E4BC",
	},
	statCardPurple: {
		backgroundColor: "#F0E8FF",
		borderColor: "#E5D9FF",
	},
	statCardGreen: {
		backgroundColor: "#E9FAF1",
		borderColor: "#D2F2E0",
	},
	statIconImage: {
		width: 28,
		height: 28,
	},
	statArrow: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
	progressCard: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEE9F1",
		borderRadius: 28,
		padding: 16,
		marginBottom: 14,
		boxShadow: "0px 8px 20px rgba(24, 23, 31, 0.06)",
	},
	languageFlag: {
		width: 42,
		height: 42,
		borderRadius: 21,
	},
	chooseLanguageButton: {
		borderRadius: 999,
		backgroundColor: brand.primaryLight,
		borderWidth: 1,
		borderColor: brand.primaryBorder,
		paddingHorizontal: 12,
		paddingVertical: 7,
	},
	progressMiniStat: {
		flex: 1,
		backgroundColor: "#F8F7FA",
		borderWidth: 1,
		borderColor: "#EEEAF2",
		borderRadius: 18,
		paddingVertical: 10,
		alignItems: "center",
	},
	progressTrack: {
		height: 9,
		backgroundColor: "#ECE7F8",
		borderRadius: 999,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		backgroundColor: "#7A3FF2",
		borderRadius: 999,
	},
	levelTrack: {
		height: 7,
		backgroundColor: "#F0EAFB",
		borderRadius: 999,
		overflow: "hidden",
		marginTop: 12,
	},
	levelFill: {
		height: "100%",
		backgroundColor: learning.action,
		borderRadius: 999,
	},
	healthCard: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#EEE9F1",
		borderRadius: 28,
		padding: 16,
		marginBottom: 20,
		boxShadow: "0px 8px 20px rgba(24, 23, 31, 0.06)",
	},
	healthIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: "#F0E8FF",
		alignItems: "center",
		justifyContent: "center",
	},
	healthItem: {
		minHeight: 58,
		backgroundColor: "#FAF9FC",
		borderWidth: 1,
		borderColor: "#EEEAF2",
		borderRadius: 18,
		paddingVertical: 10,
		paddingHorizontal: 12,
		alignItems: "center",
		flexDirection: "row",
		gap: 10,
	},
	healthMiniIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "#F0E8FF",
		alignItems: "center",
		justifyContent: "center",
	},
	selectedRing: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#7A3FF2",
		borderWidth: 4,
		borderColor: "#DCCEFF",
	},
	emptyRing: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#FFFFFF",
		borderWidth: 2,
		borderColor: "#D8D4DE",
	},
	achievementScroll: {
		gap: 12,
		paddingRight: 4,
	},
	achievementCircle: {
		width: 58,
		height: 58,
		borderRadius: 29,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
	},
	achievementCircleEarned: {
		backgroundColor: learning.action,
		borderColor: learning.actionDark,
		boxShadow: "0px 3px 6px rgba(88, 204, 2, 0.22)",
	},
	achievementCircleLocked: {
		backgroundColor: neutral.border,
		borderColor: "#D4D7DD",
		opacity: 0.65,
	},
	emptyLessonsCard: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
		borderColor: neutral.border,
		borderRadius: 18,
		padding: 22,
		alignItems: "center",
	},
	emptyLessonsIcon: {
		width: 42,
		height: 42,
		marginBottom: 10,
	},
	completedLessonCard: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
		borderColor: neutral.border,
		borderRadius: 18,
		padding: 13,
		flexDirection: "row",
		alignItems: "center",
		boxShadow: "0px 2px 7px rgba(13, 19, 43, 0.04)",
	},
	completedLessonIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: learning.selectedLight,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 11,
	},
	completedLessonIconImage: {
		width: 22,
		height: 22,
	},
	historyMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 7,
	},
	historyMetaDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: "#C8CBD3",
	},
	historyBadgeRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 8,
	},
	scoreBadge: {
		minHeight: 23,
		borderRadius: 12,
		paddingHorizontal: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	scoreBadgeText: {
		fontSize: 11,
		fontWeight: "700",
	},
	statusBadge: {
		minHeight: 23,
		borderRadius: 12,
		paddingHorizontal: 8,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	statusBadgeDone: {
		backgroundColor: "#F2FFE8",
		borderColor: learning.actionLight,
	},
	statusBadgePractice: {
		backgroundColor: brand.primaryLight,
		borderColor: brand.primaryBorder,
	},
	statusBadgeText: {
		fontSize: 11,
		fontWeight: "700",
	},
	practiceAgainButton: {
		minWidth: 86,
		height: 36,
		borderRadius: 18,
		backgroundColor: brand.primaryLight,
		borderWidth: 1,
		borderColor: brand.primaryBorder,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		paddingHorizontal: 10,
	},
	practiceAgainText: {
		color: brand.primary,
		fontSize: 11,
		fontWeight: "700",
		marginLeft: 5,
	},
	signOutButton: {
		width: "100%",
		height: 52,
		borderRadius: 16,
		borderWidth: 1.5,
		borderColor: learning.correction,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	signOutText: {
		color: learning.correction,
	},
});
