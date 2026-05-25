import React, { useState } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	TextInput,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "@/tw";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import { getLanguageUnitsAndLessons } from "@/utils/learning";
import { usePostHog } from "posthog-react-native";

export default function LessonScreen() {
	const router = useRouter();
	const posthog = usePostHog();
	const { id } = useLocalSearchParams<{ id: string }>();

	const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
	const completeLesson = useProgressStore((state) => state.completeLesson);

	// Get the lesson data
	const { lessons: activeLessons } = getLanguageUnitsAndLessons(selectedLanguageId || "es");
	const lesson = activeLessons.find((l) => l.id === id);

	// Fallback/Default Activities if none are provided
	const fallbackActivities = [
		{
			id: "mock_a1",
			type: "multiple-choice" as const,
			question: `What is the most polite way to say "Thank you" in this lesson's topic?`,
			options: ["Option A (Informal)", "Option B (Formal / Polite)", "Option C (Slang)", "Option D (Neutral)"],
			correctAnswer: "Option B (Formal / Polite)",
		},
		{
			id: "mock_a2",
			type: "translate" as const,
			question: `Translate: "Good morning, how are you today?"`,
			correctAnswer: "Hello",
		},
		{
			id: "mock_a3",
			type: "speaking" as const,
			question: `Tap microphone and pronounce: "Pleasure to meet you"`,
			correctAnswer: "Pleasure to meet you",
		},
	];

	const activities = lesson && lesson.activities.length > 0 ? lesson.activities : fallbackActivities;

	// State
	const [currentStep, setCurrentStep] = useState(0);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [textAnswer, setTextAnswer] = useState("");
	const [checked, setChecked] = useState(false);
	const [isCorrect, setIsCorrect] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!lesson) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View className="flex-1 items-center justify-center p-6 bg-white">
					<Text className="font-poppins-bold text-[18px] text-neutral-primary mb-2">
						Lesson not found
					</Text>
					<TouchableOpacity
						onPress={() => router.back()}
						className="bg-lingua-purple px-6 py-2.5 rounded-full"
					>
						<Text className="font-poppins-semibold text-white">Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	const currentActivity = activities[currentStep];
	const progressPercent = ((currentStep) / activities.length) * 100;

	const handleCheck = () => {
		if (checked) return;

		let correct = false;
		if (currentActivity.type === "multiple-choice" || currentActivity.type === "vocabulary-match") {
			correct = selectedOption === currentActivity.correctAnswer;
		} else {
			// Translate / Speaking: match loosely (allow text answer containing correct answer keyword)
			correct = textAnswer.trim().toLowerCase().includes(currentActivity.correctAnswer.trim().toLowerCase()) || textAnswer.trim().length > 2;
		}

		setIsCorrect(correct);
		setChecked(true);

		posthog.capture("lesson_activity_answered", {
			lesson_id: lesson.id,
			activity_id: currentActivity.id,
			activity_type: currentActivity.type,
			is_correct: correct,
		});
	};

	const handleContinue = async () => {
		if (!checked) return;

		if (currentStep < activities.length - 1) {
			// Move to next step
			setCurrentStep(currentStep + 1);
			setSelectedOption(null);
			setTextAnswer("");
			setChecked(false);
		} else {
			// Complete the lesson!
			setIsSubmitting(true);
			try {
				await completeLesson(lesson.id, lesson.xpReward);
				posthog.capture("lesson_completed", {
					lesson_id: lesson.id,
					lesson_title: lesson.title,
					lesson_type: lesson.type,
					language_id: selectedLanguageId,
					xp_earned: lesson.xpReward,
					method: "interactive",
				});
				router.back();
			} catch (err) {
				posthog.captureException(err, { flow: "lesson", step: "complete" });
				console.error("Failed to complete lesson:", err);
			} finally {
				setIsSubmitting(false);
			}
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				{/* Top Bar */}
				<View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-neutral-border">
					<TouchableOpacity
						onPress={() => router.back()}
						activeOpacity={0.7}
						className="p-1"
					>
						<Feather name="x" size={24} color="#0D132B" />
					</TouchableOpacity>

					{/* Progress Indicator */}
					<View className="flex-1 mx-4 h-3 bg-neutral-surface rounded-full overflow-hidden border border-neutral-border">
						<View
							className="h-full bg-success rounded-full"
							style={{ width: `${progressPercent}%` }}
						/>
					</View>

					<View className="flex-row items-center">
						<Feather name="zap" size={16} color="#FF8A00" />
						<Text className="font-poppins-bold text-[13px] text-neutral-primary ml-1">
							{lesson.xpReward} XP
						</Text>
					</View>
				</View>

				{/* Activity Content */}
				<ScrollView
					className="flex-1"
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					{/* Unit Info & Type indicator */}
					<Text className="font-poppins-medium text-[11px] text-neutral-secondary uppercase tracking-wider">
						Step {currentStep + 1} of {activities.length} • {currentActivity.type.replace("-", " ")}
					</Text>

					{/* Question Prompt */}
					<Text className="font-poppins-bold text-[22px] text-neutral-primary leading-[30px] mt-2 mb-6">
						{currentActivity.question}
					</Text>

					{/* Multiple Choice Layout */}
					{(currentActivity.type === "multiple-choice" || currentActivity.type === "vocabulary-match") && currentActivity.options ? (
						<View className="gap-3 w-full">
							{currentActivity.options.map((option) => {
								const isSelected = selectedOption === option;
								const isAnsweredCorrect = checked && option === currentActivity.correctAnswer;
								const isAnsweredIncorrect = checked && isSelected && !isCorrect;

								let optionClass = "flex-row items-center justify-between rounded-2xl px-5 py-4 border-2 ";
								if (isAnsweredCorrect) {
									optionClass += "border-[#21C16B] bg-[#E8FDF3]";
								} else if (isAnsweredIncorrect) {
									optionClass += "border-[#EB5757] bg-[#FDF2F2]";
								} else if (isSelected) {
									optionClass += "border-[#6C4EF5] bg-[#FBFBFF]";
								} else {
									optionClass += "border-[#E5E7EB] bg-white";
								}

								return (
									<TouchableOpacity
										key={option}
										onPress={() => {
											if (checked) return;
											setSelectedOption(option);
										}}
										activeOpacity={0.75}
										className={optionClass}
										disabled={checked}
									>
										<Text
											className={`font-poppins-semibold text-[15px] ${
												isAnsweredCorrect
													? "text-success-dark"
													: isAnsweredIncorrect
													? "text-error-dark"
													: isSelected
													? "text-lingua-purple"
													: "text-neutral-primary"
											}`}
										>
											{option}
										</Text>
										{isAnsweredCorrect && (
											<Feather name="check" size={18} color="#21C16B" />
										)}
										{isAnsweredIncorrect && (
											<Feather name="x" size={18} color="#EB5757" />
										)}
									</TouchableOpacity>
								);
							})}
						</View>
					) : (
						/* Text / Speaking / Translate Input Layout */
						<View className="w-full">
							<TextInput
								value={textAnswer}
								onChangeText={(text) => {
									if (checked) return;
									setTextAnswer(text);
								}}
								placeholder={
									currentActivity.type === "speaking"
										? "Type the phrase or tap microphone..."
										: "Type your translation here..."
								}
								placeholderTextColor="#9CA3AF"
								className={`font-poppins-medium text-[15px] text-[#0D132B] border-2 rounded-2xl p-4 min-h-[120px] ${
									checked && isCorrect
										? "border-[#21C16B] bg-[#E8FDF3]"
										: checked && !isCorrect
										? "border-[#EB5757] bg-[#FDF2F2]"
										: "border-[#E5E7EB] bg-[#F6F7FB]"
								}`}
								style={{ textAlignVertical: "top" }}
								multiline
								numberOfLines={4}
								editable={!checked}
							/>

							{currentActivity.type === "speaking" && (
								<TouchableOpacity
									activeOpacity={0.8}
									className="w-16 h-16 rounded-full bg-neutral-surface border border-neutral-border items-center justify-center mx-auto mt-6"
									onPress={() => {
										if (checked) return;
										setTextAnswer(currentActivity.correctAnswer);
									}}
								>
									<Feather name="mic" size={26} color="#6C4EF5" />
								</TouchableOpacity>
							)}
						</View>
					)}
				</ScrollView>

				{/* Check / Continue Bottom Bar */}
				<View className="p-5 border-t border-neutral-border bg-white pb-6">
					{checked ? (
						<View className="mb-4">
							{isCorrect ? (
								<View className="flex-row items-center bg-[#E8FDF3] border border-[#A7F3D0] rounded-xl p-3 mb-2">
									<Feather name="check-circle" size={20} color="#21C16B" />
									<Text className="font-poppins-bold text-[14px] text-success-dark ml-2">
										Excellent! You got it right.
									</Text>
								</View>
							) : (
								<View className="bg-[#FDF2F2] border border-[#FCA5A5] rounded-xl p-3 mb-2">
									<View className="flex-row items-center mb-1">
										<Feather name="alert-triangle" size={18} color="#EB5757" />
										<Text className="font-poppins-bold text-[14px] text-error-dark ml-2">
											Incorrect Answer
										</Text>
									</View>
									<Text className="font-poppins text-[12px] text-neutral-primary ml-6">
										Correct: {currentActivity.correctAnswer}
									</Text>
								</View>
							)}
						</View>
					) : null}

					{(() => {
						let btnBg = "";
						if (checked) {
							btnBg = isCorrect ? "bg-[#21C16B]" : "bg-[#EB5757]";
						} else if (
							!selectedOption &&
							(currentActivity.type === "multiple-choice" || currentActivity.type === "vocabulary-match"
								? !selectedOption
								: textAnswer.trim().length === 0)
						) {
							btnBg = "bg-[#E5E7EB]";
						} else {
							btnBg = "bg-[#6C4EF5]";
						}

						return (
							<TouchableOpacity
								onPress={checked ? handleContinue : handleCheck}
								disabled={
									isSubmitting ||
									(!checked &&
										(currentActivity.type === "multiple-choice" || currentActivity.type === "vocabulary-match"
											? !selectedOption
											: textAnswer.trim().length === 0))
								}
								className={`h-[52px] rounded-2xl items-center justify-center w-full ${btnBg}`}
								activeOpacity={0.8}
							>
								{isSubmitting ? (
									<ActivityIndicator size="small" color="#FFFFFF" />
								) : (
									<Text className="font-poppins-bold text-[15px] text-white">
										{checked
											? currentStep === activities.length - 1
												? "Complete Lesson"
												: "Continue"
											: "Check Answer"}
									</Text>
								)}
							</TouchableOpacity>
						);
					})()}
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 24,
		paddingBottom: 24,
	},
});
