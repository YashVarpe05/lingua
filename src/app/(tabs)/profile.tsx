import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "@/tw";
import { Image } from "@/tw/image";
import { languages } from "@/data/languages";
import { getLessonById } from "@/data/lessons";
import { units } from "@/data/units";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { Lesson } from "@/types/learning";

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

export default function ProfileScreen() {
	const router = useRouter();
	const { signOut } = useClerk();
	const { user } = useUser();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completedLessonIds = useProgressStore((state) => state.completedLessonIds) || [];
	const streak = useProgressStore((state) => state.streak) || 0;
	const xp = useProgressStore((state) => state.xp) || 0;
	const todayXP = useProgressStore((state) => state.todayXP) || 0;
	const level = useProgressStore((state) => state.level) || 1;

	const selectedLanguage = languages.find((language) => language.id === selectedLanguageId) || null;
	const displayName = user?.fullName ?? user?.username ?? "Learner";
	const email = user?.primaryEmailAddress?.emailAddress ?? "";
	const initial = displayName.charAt(0).toUpperCase();
	const completedLessons = [...completedLessonIds]
		.reverse()
		.map((lessonId) => getLessonById(lessonId))
		.filter((lesson): lesson is Lesson => Boolean(lesson))
		.slice(0, 10);
	const levelProgress = getLevelProgress(xp);

	const achievements = [
		{ id: "first-step", emoji: "\u{1F3AF}", label: "First Step", earned: completedLessonIds.length >= 1 },
		{ id: "on-fire", emoji: "\u{1F525}", label: "On Fire", earned: streak >= 3 },
		{ id: "xp-hunter", emoji: "\u26A1", label: "XP Hunter", earned: xp >= 100 },
		{ id: "dedicated", emoji: "\u{1F4C5}", label: "Dedicated", earned: streak >= 7 },
		{ id: "scholar", emoji: "\u{1F4DA}", label: "Scholar", earned: completedLessonIds.length >= 5 },
		{ id: "champion", emoji: "\u{1F3C6}", label: "Champion", earned: xp >= 500 },
	];

	const handleSignOut = async () => {
		await signOut();
		router.replace("/onboarding");
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View className="items-center mb-6">
					{user?.imageUrl ? (
						<Image
							source={user.imageUrl}
							style={styles.avatar}
							contentFit="cover"
						/>
					) : (
						<View style={styles.avatarFallback}>
							<Text className="font-poppins-bold text-[30px] text-white">
								{initial}
							</Text>
						</View>
					)}
					<Text className="font-poppins-bold text-[22px] text-neutral-primary mt-3 text-center">
						{displayName}
					</Text>
					{email ? (
						<Text className="font-poppins text-[13px] text-neutral-secondary mt-0.5 text-center">
							{email}
						</Text>
					) : null}

					<View className="flex-row flex-wrap justify-center gap-2 mt-4">
						<View className="flex-row items-center bg-[#F7F7F7] rounded-[20px] px-4 py-2">
							<Text className="text-[14px] mr-1">{"\u{1F525}"}</Text>
							<Text className="font-poppins-semibold text-[13px] text-neutral-primary">
								{streak} Streak
							</Text>
						</View>
						<View className="flex-row items-center bg-[#F7F7F7] rounded-[20px] px-4 py-2">
							<Text className="text-[14px] mr-1">{"\u26A1"}</Text>
							<Text className="font-poppins-semibold text-[13px] text-neutral-primary">
								{xp} XP
							</Text>
						</View>
						<View className="flex-row items-center bg-[#F7F7F7] rounded-[20px] px-4 py-2">
							<Text className="text-[14px] mr-1">{"\u{1F3C6}"}</Text>
							<Text className="font-poppins-semibold text-[13px] text-neutral-primary">
								Level {level}
							</Text>
						</View>
					</View>
				</View>

				<View className="flex-row gap-3 mb-3">
					<View className="flex-1 bg-white border border-[#E5E5E5] rounded-xl p-4">
						<Text className="text-[28px]">{"\u{1F4DA}"}</Text>
						<Text className="font-poppins-bold text-[28px] text-neutral-primary mt-2">
							{completedLessonIds.length}
						</Text>
						<Text className="font-poppins text-[12px] text-neutral-secondary">
							Lessons Done
						</Text>
					</View>
					<View className="flex-1 bg-white border border-[#E5E5E5] rounded-xl p-4">
						<Text className="text-[28px]">{"\u{1F525}"}</Text>
						<Text className="font-poppins-bold text-[28px] text-neutral-primary mt-2">
							{streak}
						</Text>
						<Text className="font-poppins text-[12px] text-neutral-secondary">
							Day Streak
						</Text>
					</View>
				</View>

				<View className="flex-row gap-3 mb-6">
					<View className="flex-1 bg-white border border-[#E5E5E5] rounded-xl p-4">
						<Text className="text-[28px]">{"\u26A1"}</Text>
						<Text className="font-poppins-bold text-[28px] text-neutral-primary mt-2">
							{xp}
						</Text>
						<Text className="font-poppins text-[12px] text-neutral-secondary">
							Total XP
						</Text>
					</View>
					<View className="flex-1 bg-white border border-[#E5E5E5] rounded-xl p-4">
						<Text className="text-[28px]">{"\u{1F4C5}"}</Text>
						<Text className="font-poppins-bold text-[28px] text-neutral-primary mt-2">
							{todayXP}
						</Text>
						<Text className="font-poppins text-[12px] text-neutral-secondary">
							XP Today
						</Text>
					</View>
				</View>

				<View className="bg-white border border-[#E5E5E5] rounded-xl p-4 mb-6">
					<Text className="font-poppins text-[12px] text-neutral-secondary mb-3">
						Currently Learning
					</Text>
					{selectedLanguage ? (
						<View>
							<View className="flex-row items-center mb-4">
								<Image
									source={selectedLanguage.flag}
									style={styles.languageFlag}
									contentFit="cover"
								/>
								<Text className="font-poppins-bold text-[18px] text-neutral-primary ml-3">
									{selectedLanguage.name}
								</Text>
							</View>
							<View className="h-1.5 bg-[#E1D9FF] rounded-full overflow-hidden mb-1">
								<View
									style={{ width: `${Math.min(levelProgress.progress, 100)}%` }}
									className="h-full bg-lingua-purple rounded-full"
								/>
							</View>
							<Text className="font-poppins text-[11px] text-neutral-secondary text-right">
								{levelProgress.label}
							</Text>
						</View>
					) : (
						<Text className="font-poppins text-[13px] text-neutral-secondary">
							Choose a language to begin learning.
						</Text>
					)}
				</View>

				<View className="mb-6">
					<Text className="font-poppins-bold text-[16px] text-neutral-primary mb-3">
						Achievements
					</Text>
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
										{
											backgroundColor: achievement.earned ? "#58CC02" : "#E5E5E5",
											opacity: achievement.earned ? 1 : 0.4,
										},
									]}
								>
									<Text className="text-[26px]">
										{achievement.emoji}
									</Text>
								</View>
								<Text className="font-poppins-semibold text-[11px] text-neutral-primary text-center mt-2 leading-[14px]">
									{achievement.label}
								</Text>
							</View>
						))}
					</ScrollView>
				</View>

				<View className="mb-6">
					<Text className="font-poppins-bold text-[16px] text-neutral-primary mb-3">
						Completed Lessons
					</Text>
					{completedLessons.length === 0 ? (
						<View className="bg-white border border-[#E5E5E5] rounded-xl p-6 items-center">
							<Text className="text-[36px] mb-2">{"\u{1F4D6}"}</Text>
							<Text className="font-poppins text-[13px] text-neutral-secondary text-center">
								No lessons completed yet. Start learning!
							</Text>
						</View>
					) : (
						<View className="gap-2.5">
							{completedLessons.map((lesson) => {
								const meta = getLessonMeta(lesson);

								return (
									<View
										key={lesson.id}
										className="bg-white border border-[#E5E5E5] rounded-xl p-4 flex-row items-center justify-between"
									>
										<View className="flex-1 mr-3">
											<Text className="font-poppins-bold text-[14px] text-neutral-primary" numberOfLines={1}>
												{lesson.title}
											</Text>
											<Text className="font-poppins text-[12px] text-neutral-secondary mt-1" numberOfLines={1}>
												{meta.languageName} - {meta.unitName}
											</Text>
										</View>
										<View className="w-7 h-7 rounded-full bg-[#D7FFB8] items-center justify-center">
											<Feather name="check" size={16} color="#58CC02" />
										</View>
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
					<Text style={styles.signOutText} className="font-poppins-bold text-[15px]">
						Sign Out
					</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollView: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 18,
		paddingBottom: 32,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
	},
	avatarFallback: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: "#58CC02",
		alignItems: "center",
		justifyContent: "center",
	},
	languageFlag: {
		width: 36,
		height: 36,
		borderRadius: 18,
	},
	achievementScroll: {
		gap: 12,
		paddingRight: 4,
	},
	achievementCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
	},
	signOutButton: {
		width: "100%",
		height: 52,
		borderRadius: 16,
		borderWidth: 1.5,
		borderColor: "#FF4B4B",
		alignItems: "center",
		justifyContent: "center",
	},
	signOutText: {
		color: "#FF4B4B",
	},
});
