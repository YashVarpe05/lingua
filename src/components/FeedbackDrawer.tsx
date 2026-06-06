import React, { useRef, useEffect } from "react";
import {
	StyleSheet,
	Animated,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import Button3D from "./Button3D";

const HIDDEN_DRAWER_OFFSET = 720;

interface FeedbackDrawerProps {
	visible: boolean;
	isCorrect: boolean;
	correctAnswer: string;
	explanationTitle?: string;
	explanation?: string;
	explanationLoading?: boolean;
	example?: string;
	combo: number; // consecutive correct answers
	onContinue: () => void;
	successTitle?: string;
	secondaryActionTitle?: string;
	onSecondaryAction?: () => void;
}

export default function FeedbackDrawer({
	visible,
	isCorrect,
	correctAnswer,
	explanationTitle,
	explanation,
	explanationLoading,
	example,
	combo,
	onContinue,
	successTitle,
	secondaryActionTitle,
	onSecondaryAction,
}: FeedbackDrawerProps) {
	const slideY = useRef(
		new Animated.Value(Platform.OS === "web" ? 0 : HIDDEN_DRAWER_OFFSET)
	).current;
	const successMessage = successTitle || "Excellent!";
	const showCombo = isCorrect && combo >= 3;
	const explanationBlock = (explanationLoading || explanation) ? (
		<View style={styles.explanationCard}>
			<Text
				style={[
					styles.explanationTitle,
					{ color: isCorrect ? "#58CC02" : "#FF4B4B" },
				]}
			>
				{explanationTitle || "Why this works"}
			</Text>
			<Text style={styles.explanationText}>
				{explanationLoading && !explanation ? "Thinking through the pattern..." : explanation}
			</Text>
			{example ? (
				<Text style={styles.exampleText}>
					{example}
				</Text>
			) : null}
		</View>
	) : null;

	useEffect(() => {
		if (Platform.OS === "web") {
			slideY.setValue(0);
			return;
		}

		if (visible) {
			Animated.spring(slideY, {
				toValue: 0,
				useNativeDriver: true,
				speed: 20,
				bounciness: 4,
			}).start();
		} else {
			Animated.timing(slideY, {
				toValue: HIDDEN_DRAWER_OFFSET,
				duration: 200,
				useNativeDriver: true,
			}).start();
		}
	}, [visible, slideY]);

	if (!visible) return null;

	return (
		<>
			<View style={styles.overlay} />

			<Animated.View
				style={[
					styles.drawer,
					{
						...(Platform.OS === "web"
							? {}
							: { transform: [{ translateY: slideY }] }),
						backgroundColor: isCorrect ? "#D7FFB8" : "#FFDFE0",
						borderTopColor: isCorrect ? "#58CC02" : "#FF4B4B",
					},
				]}
			>
				{isCorrect ? (
					<View style={[styles.content, styles.correctContent]}>
						<View style={styles.headerRow}>
							<Image
								source={images.moscotLogo}
								contentFit="contain"
								className="w-8 h-8 mr-2.5"
							/>
							<Text style={[styles.successTitle, { color: "#58CC02" }]}>
								{successMessage}
							</Text>
						</View>

						{showCombo ? (
							<Text style={styles.comboText}>
								{"\u{1F525} "}{combo} in a row!
							</Text>
						) : null}

						{explanationBlock}
					</View>
				) : (
					<ScrollView
						style={styles.scrollArea}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.content}>
							<View style={styles.headerRow}>
								<Image
									source={images.moscotLogo}
									contentFit="contain"
									className="w-8 h-8 mr-2.5"
								/>
								<Text style={[styles.incorrectTitle, { color: "#FF4B4B" }]}>
									Correct answer:
								</Text>
							</View>

							<Text style={styles.correctAnswerText}>
								{correctAnswer}
							</Text>

							{explanationBlock}
						</View>
					</ScrollView>
				)}

				<View style={styles.buttonStack}>
					{secondaryActionTitle && onSecondaryAction ? (
						<Button3D
							onPress={onSecondaryAction}
							variant="secondary"
							title={secondaryActionTitle}
							fullWidth
						/>
					) : null}

					<Button3D
						onPress={onContinue}
						variant={isCorrect ? "primary" : "danger"}
						title={isCorrect ? "CONTINUE" : "GOT IT"}
						fullWidth
					/>
				</View>
			</Animated.View>
		</>
	);
}

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		position: "absolute",
		backgroundColor: "rgba(0,0,0,0.25)",
		zIndex: 99,
	},
	drawer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		zIndex: 100,
		maxHeight: "88%",
		borderTopWidth: 3,
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	scrollArea: {
		marginBottom: 16,
	},
	scrollContent: {
		paddingBottom: 2,
	},
	content: {
		gap: 8,
	},
	correctContent: {
		marginBottom: 16,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 2,
	},
	successTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 20,
		lineHeight: 28,
	},
	incorrectTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 16,
		lineHeight: 22,
	},
	comboText: {
		color: "#FF9600",
		fontFamily: "Poppins-Bold",
		fontSize: 14,
		lineHeight: 20,
		marginLeft: 42,
	},
	correctAnswerText: {
		color: "#3C3C3C",
		fontFamily: "Poppins-Bold",
		fontSize: 20,
		lineHeight: 28,
		marginLeft: 42,
	},
	explanationTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		letterSpacing: 0.5,
		lineHeight: 17,
		marginBottom: 4,
		textTransform: "uppercase",
	},
	explanationText: {
		color: "#3C3C3C",
		fontFamily: "Poppins-Regular",
		fontSize: 14,
		lineHeight: 20,
	},
	explanationCard: {
		backgroundColor: "rgba(255,255,255,0.58)",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	exampleText: {
		color: "#777777",
		fontFamily: "Poppins-Regular",
		fontSize: 13,
		fontStyle: "italic",
		lineHeight: 18,
		marginTop: 8,
	},
	buttonStack: {
		gap: 12,
	},
});
