import React, { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View, ScrollView, TouchableOpacity } from "@/tw";
import {
	buildCurriculumQaReport,
	CURRICULUM_QA_LANGUAGE_IDS,
	type CurriculumQaLanguageSummary,
	type CurriculumQaStatus,
} from "@/utils/curriculumQa";

const getStatusStyles = (status: CurriculumQaStatus) => {
	if (status === "ready") {
		return {
			bg: "bg-[#E8F9EE]",
			border: "border-[#BDEFBF]",
			text: "text-[#21C16B]",
			icon: "check-circle" as const,
			color: "#21C16B",
			label: "Ready",
		};
	}

	if (status === "watch") {
		return {
			bg: "bg-[#FFF8E6]",
			border: "border-[#FFE8B3]",
			text: "text-[#FF9600]",
			icon: "alert-circle" as const,
			color: "#FF9600",
			label: "Watch",
		};
	}

	return {
		bg: "bg-[#FFDFE0]",
		border: "border-[#FFB6B8]",
		text: "text-[#FF4B4B]",
		icon: "x-circle" as const,
		color: "#FF4B4B",
		label: "Needs Work",
	};
};

const getCompletionPercent = (language: CurriculumQaLanguageSummary) => {
	const unitScore = Math.min(language.unitCount / 4, 1);
	const lessonScore = Math.min(language.lessonCount / 16, 1);
	const checkpointScore = Math.min(language.checkpointCount / 4, 1);
	const issuePenalty = Math.min(language.failCount * 0.08 + language.warnCount * 0.02, 0.4);

	return Math.max(Math.round(((unitScore + lessonScore + checkpointScore) / 3 - issuePenalty) * 100), 0);
};

export default function DebugCurriculumScreen() {
	const router = useRouter();
	const report = useMemo(() => buildCurriculumQaReport(), []);
	const [selectedLanguageId, setSelectedLanguageId] = useState(
		report.languages[0]?.id ?? CURRICULUM_QA_LANGUAGE_IDS[0]
	);
	const selectedLanguage =
		report.languages.find((language) => language.id === selectedLanguageId) ??
		report.languages[0];
	const statusStyles = getStatusStyles(selectedLanguage.status);
	const completionPercent = getCompletionPercent(selectedLanguage);

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
							Internal QA
						</Text>
					</View>
				</View>

				<View className="bg-white border border-neutral-border rounded-[24px] p-5 mb-4">
					<Text className="font-poppins-bold text-[24px] text-neutral-primary leading-[30px]">
						Curriculum QA
					</Text>
					<Text className="font-poppins text-[13px] text-neutral-secondary leading-[20px] mt-1">
						Core language coverage, lesson structure, checkpoints, concepts, and script quality.
					</Text>

					<View className="flex-row gap-2 mt-4">
						<View className="flex-1 rounded-2xl bg-[#F4FBFF] border border-[#DDF4FF] p-3">
							<Text className="font-poppins-bold text-[20px] text-[#1CB0F6]">
								{report.totals.lessonCount}
							</Text>
							<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px]">
								Lessons
							</Text>
						</View>
						<View className="flex-1 rounded-2xl bg-[#FFF8E6] border border-[#FFE8B3] p-3">
							<Text className="font-poppins-bold text-[20px] text-[#FF9600]">
								{report.totals.checkpointCount}
							</Text>
							<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px]">
								Quizzes
							</Text>
						</View>
						<View className="flex-1 rounded-2xl bg-[#FFDFE0] border border-[#FFB6B8] p-3">
							<Text className="font-poppins-bold text-[20px] text-[#FF4B4B]">
								{report.totals.failCount}
							</Text>
							<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px]">
								Fails
							</Text>
						</View>
					</View>
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					className="mb-4"
					contentContainerStyle={styles.languageChips}
				>
					{report.languages.map((language) => {
						const isSelected = language.id === selectedLanguage.id;
						const languageStatus = getStatusStyles(language.status);

						return (
							<TouchableOpacity
								key={language.id}
								onPress={() => setSelectedLanguageId(language.id)}
								activeOpacity={0.8}
								className={`rounded-full border px-4 py-2 ${
									isSelected
										? "bg-lingua-purple border-lingua-purple"
										: "bg-white border-neutral-border"
								}`}
							>
								<Text
									className={`font-poppins-bold text-[12px] ${
										isSelected ? "text-white" : languageStatus.text
									}`}
								>
									{language.name}
								</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>

				<View className={`border rounded-[24px] p-5 mb-4 ${statusStyles.bg} ${statusStyles.border}`}>
					<View className="flex-row items-center justify-between mb-4">
						<View className="flex-1 mr-3">
							<Text className="font-poppins-bold text-[22px] text-neutral-primary">
								{selectedLanguage.name}
							</Text>
							<Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
								{selectedLanguage.usesFallbackContent ? "Fallback quality" : "Authored A1 path"}
							</Text>
						</View>
						<View className="items-center">
							<Feather name={statusStyles.icon} size={24} color={statusStyles.color} />
							<Text className={`font-poppins-bold text-[11px] mt-1 ${statusStyles.text}`}>
								{statusStyles.label}
							</Text>
						</View>
					</View>

					<View className="h-3 bg-white rounded-full overflow-hidden mb-2">
						<View
							className="h-3 bg-[#58CC02] rounded-full"
							style={{ width: `${completionPercent}%` }}
						/>
					</View>
					<Text className="font-poppins-semibold text-[12px] text-neutral-secondary">
						{completionPercent}% A1 coverage score
					</Text>
				</View>

				<View className="flex-row gap-2 mb-4">
					<View className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center">
						<Text className="font-poppins-bold text-[20px] text-neutral-primary">
							{selectedLanguage.unitCount}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px]">
							Units
						</Text>
					</View>
					<View className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center">
						<Text className="font-poppins-bold text-[20px] text-neutral-primary">
							{selectedLanguage.lessonCount}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px]">
							Lessons
						</Text>
					</View>
					<View className="flex-1 bg-white border border-neutral-border rounded-2xl p-3 items-center">
						<Text className="font-poppins-bold text-[20px] text-neutral-primary">
							{selectedLanguage.conceptCount}
						</Text>
						<Text className="font-poppins-semibold text-[10px] text-neutral-secondary uppercase tracking-[0.4px]">
							Concepts
						</Text>
					</View>
				</View>

				<View className="bg-white border border-neutral-border rounded-[22px] p-4 mb-4">
					<View className="flex-row items-center justify-between mb-3">
						<Text className="font-poppins-bold text-[16px] text-neutral-primary">
							Needs Work
						</Text>
						<Text className="font-poppins-bold text-[12px] text-[#FF4B4B]">
							{selectedLanguage.failCount} fail / {selectedLanguage.warnCount} warn
						</Text>
					</View>

					{selectedLanguage.flags.length > 0 ? (
						<View className="gap-3">
							{selectedLanguage.flags.slice(0, 8).map((flag, index) => (
								<View key={`${flag.scope}-${flag.id}-${index}`} className="flex-row items-start">
									<View
										className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
											flag.severity === "fail" ? "bg-[#FFDFE0]" : "bg-[#FFF3CC]"
										}`}
									>
										<Feather
											name={flag.severity === "fail" ? "x" : "alert-triangle"}
											size={14}
											color={flag.severity === "fail" ? "#FF4B4B" : "#FF9600"}
										/>
									</View>
									<View className="flex-1">
										<Text className="font-poppins-bold text-[12px] text-neutral-primary">
											{flag.scope}: {flag.id}
										</Text>
										<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px]">
											{flag.message}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : (
						<View className="bg-[#F0FFE8] border border-[#D7FFB8] rounded-2xl p-4">
							<Text className="font-poppins-bold text-[14px] text-[#58CC02]">
								No issues found
							</Text>
							<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1">
								This language meets the current A1 curriculum quality bar.
							</Text>
						</View>
					)}
				</View>

				<View className="bg-white border border-neutral-border rounded-[22px] p-4">
					<Text className="font-poppins-bold text-[16px] text-neutral-primary mb-3">
						Unit Coverage
					</Text>
					<View className="gap-3">
						{selectedLanguage.units.map((unit) => (
							<View key={unit.id} className="border border-neutral-border rounded-2xl p-3">
								<View className="flex-row items-center justify-between">
									<View className="flex-1 mr-3">
										<Text className="font-poppins-bold text-[13px] text-neutral-primary">
											{unit.title}
										</Text>
										<Text className="font-poppins text-[11px] text-neutral-secondary mt-0.5">
											{unit.lessonCount} lessons | {unit.checkpointExerciseCount} checkpoint items | {unit.conceptCount} concepts
										</Text>
									</View>
									<Text
										className={`font-poppins-bold text-[11px] ${
											unit.flags.length > 0 ? "text-[#FF4B4B]" : "text-[#58CC02]"
										}`}
									>
										{unit.flags.length > 0 ? `${unit.flags.length} flags` : "OK"}
									</Text>
								</View>
							</View>
						))}
					</View>
				</View>
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
	languageChips: {
		gap: 8,
		paddingRight: 20,
	},
});
