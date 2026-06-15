import { images } from "@/constants/images";
import { brand, learning, neutral } from "@/theme/colors";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

const audioBars = [14, 28, 40, 52, 34, 22, 44, 30, 18];

const planSteps = [
	{
		icon: "globe" as keyof typeof Feather.glyphMap,
		title: "Choose your path",
		description: "Pick a language and start with useful A1 phrases.",
	},
	{
		icon: "target" as keyof typeof Feather.glyphMap,
		title: "Practice daily",
		description: "Short lessons, review, speaking, and checkpoints.",
	},
	{
		icon: "trending-up" as keyof typeof Feather.glyphMap,
		title: "Remember more",
		description: "Weak concepts come back before you forget them.",
	},
];

const previewLanguages = ["Spanish", "Japanese", "German"];

export default function Onboarding() {
	const router = useRouter();
	const posthog = usePostHog();

	const handleGetStarted = () => {
		posthog.capture("onboarding_get_started");
		router.replace("/signup" as any);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.screen}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic"
					showsVerticalScrollIndicator={false}
				>
					<View className="flex-row items-center justify-between">
						<View className="flex-row items-center">
							<Image
								source={images.moscotLogo}
								style={styles.logo}
								contentFit="contain"
							/>
							<Text className="font-poppins-bold text-[24px] text-[#111827] ml-2">
								RUSH
							</Text>
						</View>
						<TouchableOpacity
							onPress={() => router.replace("/signin" as any)}
							activeOpacity={0.75}
							style={styles.loginPill}
						>
							<Text className="font-poppins-bold text-[12px] text-[#5537D2]">
								Log in
							</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.heroCard}>
						<View className="flex-row items-center justify-between w-full">
							<View style={styles.kickerPill}>
								<View style={styles.kickerDot} />
								<Text className="font-poppins-bold text-[11px] text-[#3C3C3C] uppercase tracking-[0.8px]">
									Personal study plan
								</Text>
							</View>
							<View style={styles.stepPill}>
								<Text className="font-poppins-bold text-[11px] text-[#5537D2]">
									3 steps
								</Text>
							</View>
						</View>

						<Image
							source={images.mascotWelcome}
							style={styles.mascot}
							contentFit="contain"
						/>

						<Text className="font-poppins-bold text-[33px] text-[#111827] text-center leading-[39px] mt-2">
							Learn with a path{"\n"}that adapts to you
						</Text>
						<Text className="font-poppins text-[14px] text-[#6B7280] text-center leading-[22px] mt-3 px-2">
							Start with beginner-friendly lessons, then let review and practice keep your memory warm.
						</Text>

						<View style={styles.audioPreview}>
							<View style={styles.playCircle}>
								<Feather name="play" size={15} color="#FFFFFF" />
							</View>
							<View className="flex-row items-center flex-1 ml-3 gap-1">
								{audioBars.map((height, index) => (
									<View
										key={`${height}-${index}`}
										style={[styles.audioBar, { height }]}
									/>
								))}
							</View>
							<Text className="font-poppins-bold text-[11px] text-[#5537D2]">
								Listen
							</Text>
						</View>
					</View>

					<View style={styles.setupCard}>
						<View className="flex-row items-center justify-between mb-4">
							<View>
								<Text className="font-poppins-bold text-[18px] text-[#111827]">
									Your first minute
								</Text>
								<Text className="font-poppins text-[12px] text-[#6B7280] mt-1">
									A simple setup before lesson one.
								</Text>
							</View>
							<View style={styles.setupIcon}>
								<Feather name="star" size={18} color="#5537D2" />
							</View>
						</View>

						{planSteps.map((step, index) => (
							<View key={step.title} style={styles.planStep}>
								<View style={styles.planStepIcon}>
									<Feather name={step.icon} size={18} color="#111827" />
								</View>
								<View className="flex-1 ml-3">
									<Text className="font-poppins-bold text-[14px] text-[#111827]">
										{step.title}
									</Text>
									<Text className="font-poppins text-[11px] text-[#6B7280] mt-0.5 leading-[16px]">
										{step.description}
									</Text>
								</View>
								<View style={index === 0 ? styles.stepStatusActive : styles.stepStatus}>
									<Text className="font-poppins-bold text-[10px] text-[#3C3C3C]">
										{index + 1}
									</Text>
								</View>
							</View>
						))}
					</View>

					<View style={styles.languagePreviewCard}>
						<View className="flex-row items-center justify-between mb-4">
							<Text className="font-poppins-bold text-[17px] text-[#111827]">
								Ready for real practice
							</Text>
							<Feather name="arrow-right" size={18} color="#58A700" />
						</View>
						<View className="flex-row flex-wrap gap-2">
							{previewLanguages.map((language, index) => (
								<View
									key={language}
									style={[
										styles.languageChip,
										index === 1 ? styles.languageChipSelected : null,
									]}
								>
									<Text
										className="font-poppins-bold text-[12px]"
										style={index === 1 ? styles.languageChipTextSelected : styles.languageChipText}
									>
										{language}
									</Text>
								</View>
							))}
							<View style={styles.languageChip}>
								<Text className="font-poppins-bold text-[12px]" style={styles.languageChipText}>
									{"\u3053\u3093\u306B\u3061\u306F"}
								</Text>
							</View>
						</View>
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<View className="flex-row items-center justify-center mb-4">
						<View style={styles.dotActive} />
						<View style={styles.dot} />
						<View style={styles.dot} />
					</View>

					<TouchableOpacity
						onPress={handleGetStarted}
						activeOpacity={0.82}
						style={styles.primaryButton}
					>
						<Text className="font-poppins-bold text-[16px] text-white">
							Get Started
						</Text>
					</TouchableOpacity>

					<View className="flex-row items-center justify-center mt-5">
						<Text className="font-poppins text-[13px] text-[#6B7280]">
							Already have an account?{" "}
						</Text>
						<TouchableOpacity
							onPress={() => router.replace("/signin" as any)}
							activeOpacity={0.7}
						>
							<Text className="font-poppins-bold text-[13px] text-[#5537D2]">
								Log in
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F7FAFC",
	},
	screen: {
		flex: 1,
		backgroundColor: "#F7FAFC",
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 156,
	},
	logo: {
		width: 36,
		height: 36,
	},
	loginPill: {
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		paddingHorizontal: 16,
		paddingVertical: 9,
		boxShadow: "0px 8px 18px rgba(17, 24, 39, 0.06)",
	},
	heroCard: {
		borderRadius: 34,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		alignItems: "center",
		marginTop: 22,
		padding: 18,
		overflow: "hidden",
		boxShadow: "0px 18px 38px rgba(17, 24, 39, 0.08)",
	},
	kickerPill: {
		minHeight: 34,
		borderRadius: 17,
		backgroundColor: learning.actionLight,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
	},
	kickerDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		backgroundColor: learning.action,
		marginRight: 8,
	},
	stepPill: {
		minHeight: 34,
		borderRadius: 17,
		backgroundColor: brand.primaryLight,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
	},
	mascot: {
		width: 190,
		height: 190,
		marginTop: 12,
	},
	audioPreview: {
		width: "100%",
		minHeight: 58,
		borderRadius: 29,
		backgroundColor: "#F8F9FB",
		borderWidth: 1,
		borderColor: "#ECEFF5",
		flexDirection: "row",
		alignItems: "center",
		marginTop: 20,
		paddingHorizontal: 13,
	},
	playCircle: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: brand.primary,
		alignItems: "center",
		justifyContent: "center",
	},
	audioBar: {
		width: 4,
		borderRadius: 999,
		backgroundColor: "#D7DCE5",
	},
	setupCard: {
		borderRadius: 28,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		marginTop: 16,
		padding: 16,
		boxShadow: "0px 14px 30px rgba(17, 24, 39, 0.06)",
	},
	setupIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: brand.primaryLight,
		alignItems: "center",
		justifyContent: "center",
	},
	planStep: {
		minHeight: 74,
		borderRadius: 20,
		backgroundColor: "#F8F9FB",
		borderWidth: 1,
		borderColor: "#ECEFF5",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		marginTop: 10,
	},
	planStepIcon: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: learning.actionLight,
		alignItems: "center",
		justifyContent: "center",
	},
	stepStatus: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E7EB",
		alignItems: "center",
		justifyContent: "center",
	},
	stepStatusActive: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: learning.rewardLight,
		borderWidth: 1,
		borderColor: learning.reward,
		alignItems: "center",
		justifyContent: "center",
	},
	languagePreviewCard: {
		borderRadius: 28,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E8EAF0",
		marginTop: 16,
		padding: 16,
		boxShadow: "0px 14px 30px rgba(17, 24, 39, 0.06)",
	},
	languageChip: {
		minHeight: 40,
		borderRadius: 20,
		backgroundColor: "#F4F6FA",
		borderWidth: 1,
		borderColor: "#E6EAF2",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 14,
	},
	languageChipSelected: {
		backgroundColor: learning.actionLight,
		borderColor: "#BDEFA0",
	},
	languageChipText: {
		color: neutral.textPrimary,
	},
	languageChipTextSelected: {
		color: learning.actionDark,
	},
	footer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: 22,
		backgroundColor: "rgba(247, 250, 252, 0.96)",
		borderTopWidth: 1,
		borderTopColor: "rgba(229, 231, 235, 0.78)",
	},
	primaryButton: {
		height: 58,
		borderRadius: 29,
		backgroundColor: learning.action,
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0px 12px 20px rgba(88, 204, 2, 0.25)",
	},
	dotActive: {
		width: 18,
		height: 8,
		borderRadius: 4,
		backgroundColor: learning.action,
		marginHorizontal: 4,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#D9DCE2",
		marginHorizontal: 4,
	},
});
