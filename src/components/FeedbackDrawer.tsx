import React, { useRef, useEffect } from "react";
import {
	StyleSheet,
	Animated,
	Platform,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { learning } from "@/theme/colors";
import Button3D from "./Button3D";
import { Feather } from "@expo/vector-icons";

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
	const successMessage = successTitle || "Nice!";
	const statusColor = isCorrect ? learning.action : learning.correction;
	const drawerBackground = isCorrect ? learning.actionLight : learning.correctionLight;
	const mascotSource = isCorrect ? images.mascotJump : images.mascotLogo;
	const showCombo = isCorrect && combo >= 3;
	const statusPillText = isCorrect ? "Correct" : "Review";
	const supportText = isCorrect
		? "Answer accepted. Keep your rhythm going."
		: "Here is the right answer to remember.";
	const exampleCopy = example?.replace(/^Example:\s*/i, "").trim();
	const explanationBlock = (explanationLoading || explanation) ? (
		<View
			style={[
				styles.explanationCard,
				isCorrect ? styles.correctExplanationCard : styles.incorrectExplanationCard,
				{ borderLeftColor: statusColor },
			]}
		>
			<View style={styles.explanationTitleRow}>
				<View
					style={[
						styles.explanationIcon,
						{ backgroundColor: isCorrect ? learning.actionLight : learning.correctionLight },
					]}
				>
					<Feather
						name={isCorrect ? "zap" : "book-open"}
						size={13}
						color={statusColor}
					/>
				</View>
				<Text
					style={[
						styles.explanationTitle,
						{ color: statusColor },
					]}
				>
					{explanationTitle || "Why this works"}
				</Text>
			</View>
			<Text style={styles.explanationText}>
				{explanationLoading && !explanation ? "Thinking through the pattern..." : explanation}
			</Text>
			{exampleCopy ? (
				<View style={styles.exampleBox}>
					<View style={[styles.exampleAccent, { backgroundColor: statusColor }]} />
					<View style={styles.exampleCopyWrap}>
						<Text style={[styles.exampleLabel, { color: statusColor }]}>
							Example
						</Text>
						<Text style={styles.exampleText}>
							{exampleCopy}
						</Text>
					</View>
				</View>
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
						backgroundColor: drawerBackground,
						borderTopColor: statusColor,
					},
				]}
			>
				<View style={styles.drawerInner}>
					<View style={styles.handle} />

					{isCorrect ? (
						<View style={[styles.content, styles.correctContent]}>
							<View style={styles.resultHeader}>
								<View style={styles.headerRow}>
									<View style={[styles.mascotBubble, styles.correctMascotBubble]}>
										<Image
											source={mascotSource}
											contentFit="contain"
											style={styles.mascot}
										/>
										<View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
											<Feather name="check" size={12} color="#FFFFFF" />
										</View>
									</View>
									<View style={styles.headerCopy}>
										<Text style={[styles.successTitle, { color: statusColor }]}>
											{successMessage}
										</Text>
										<Text style={styles.supportingCopy}>
											{supportText}
										</Text>
									</View>
									<View
										style={[
											styles.statusPill,
											{ backgroundColor: "rgba(255,255,255,0.72)" },
										]}
									>
										<Feather name="check-circle" size={13} color={statusColor} />
										<Text style={[styles.statusPillText, { color: statusColor }]}>
											{statusPillText}
										</Text>
									</View>
								</View>
							</View>

							{showCombo ? (
								<View style={styles.comboCard}>
									<Text style={styles.comboText}>
										{"\u{1F525} "}{combo} in a row!
									</Text>
								</View>
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
								<View style={styles.resultHeader}>
									<View style={styles.headerRow}>
										<View style={[styles.mascotBubble, styles.incorrectMascotBubble]}>
											<Image
												source={mascotSource}
												contentFit="contain"
												style={styles.mascot}
											/>
											<View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
												<Feather name="x" size={12} color="#FFFFFF" />
											</View>
										</View>
										<View style={styles.headerCopy}>
											<Text style={[styles.incorrectTitle, { color: statusColor }]}>
												Correct answer:
											</Text>
											<Text style={styles.supportingCopy}>
												{supportText}
											</Text>
										</View>
										<View
											style={[
												styles.statusPill,
												{ backgroundColor: "rgba(255,255,255,0.72)" },
											]}
										>
											<Feather name="refresh-cw" size={12} color={statusColor} />
											<Text style={[styles.statusPillText, { color: statusColor }]}>
												{statusPillText}
											</Text>
										</View>
									</View>
								</View>

								<View style={styles.answerCard}>
									<Text style={styles.answerLabel}>Correct answer</Text>
									<Text style={styles.correctAnswerText}>
										{correctAnswer}
									</Text>
								</View>

								{explanationBlock}
							</View>
						</ScrollView>
					)}

					<View style={styles.buttonStack}>
						{secondaryActionTitle && onSecondaryAction ? (
							<TouchableOpacity
								onPress={onSecondaryAction}
								activeOpacity={0.84}
								accessibilityRole="button"
								accessibilityLabel={secondaryActionTitle}
								style={styles.repairActionButton}
							>
								<View style={styles.repairActionIcon}>
									<Feather name="repeat" size={16} color={learning.selectedDark} />
								</View>
								<View style={styles.repairActionCopy}>
									<Text style={styles.repairActionTitle}>
										{secondaryActionTitle}
									</Text>
									<Text style={styles.repairActionSubtitle}>
										Try one similar question now.
									</Text>
								</View>
								<Feather name="chevron-right" size={19} color={learning.selectedDark} />
							</TouchableOpacity>
						) : null}

						<Button3D
							onPress={onContinue}
							variant={isCorrect ? "primary" : "danger"}
							title={isCorrect ? "CONTINUE" : "GOT IT"}
							fullWidth
						/>
					</View>
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
		maxHeight: "82%",
		borderTopWidth: 3,
		paddingHorizontal: 0,
		paddingTop: 0,
		paddingBottom: 0,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		...Platform.select({
			ios: {
				shadowColor: "#000000",
				shadowOffset: { width: 0, height: -4 },
				shadowOpacity: 0.12,
				shadowRadius: 12,
			},
			android: {
				elevation: 10,
			},
		}),
	},
	drawerInner: {
		width: "100%",
		maxWidth: 480,
		alignSelf: "center",
		paddingHorizontal: 20,
		paddingTop: 10,
		paddingBottom: 22,
	},
	handle: {
		width: 40,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(60,60,60,0.14)",
		alignSelf: "center",
		marginBottom: 12,
	},
	scrollArea: {
		marginBottom: 10,
	},
	scrollContent: {
		paddingBottom: 2,
	},
	content: {
		gap: 12,
	},
	correctContent: {
		marginBottom: 10,
	},
	resultHeader: {
		paddingHorizontal: 2,
		paddingTop: 2,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	mascotBubble: {
		width: 46,
		height: 46,
		borderRadius: 23,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		position: "relative",
		overflow: "hidden",
	},
	correctMascotBubble: {
		borderColor: "rgba(88,204,2,0.22)",
	},
	incorrectMascotBubble: {
		borderColor: "rgba(255,75,75,0.18)",
	},
	mascot: {
		width: 33,
		height: 33,
	},
	statusBadge: {
		position: "absolute",
		right: -4,
		bottom: -4,
		width: 18,
		height: 18,
		borderRadius: 9,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	headerCopy: {
		flex: 1,
		minWidth: 0,
	},
	successTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 20,
		lineHeight: 26,
	},
	incorrectTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 18,
		lineHeight: 24,
	},
	supportingCopy: {
		color: learning.muted,
		fontFamily: "Poppins-Regular",
		fontSize: 12,
		lineHeight: 16,
		marginTop: 1,
	},
	statusPill: {
		minHeight: 30,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.64)",
		paddingHorizontal: 9,
		paddingVertical: 5,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},
	statusPillText: {
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		lineHeight: 15,
		textTransform: "uppercase",
	},
	comboCard: {
		alignSelf: "flex-start",
		backgroundColor: "#FFFFFF",
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginLeft: 54,
	},
	comboText: {
		color: learning.streak,
		fontFamily: "Poppins-Bold",
		fontSize: 14,
		lineHeight: 20,
	},
	answerCard: {
		backgroundColor: "rgba(255,255,255,0.82)",
		borderColor: "rgba(255,75,75,0.18)",
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 13,
	},
	answerLabel: {
		color: learning.correction,
		fontFamily: "Poppins-Bold",
		fontSize: 11,
		letterSpacing: 0.6,
		lineHeight: 16,
		marginBottom: 5,
		textTransform: "uppercase",
	},
	correctAnswerText: {
		color: learning.text,
		fontFamily: "Poppins-Bold",
		fontSize: 22,
		lineHeight: 30,
	},
	explanationTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 6,
	},
	explanationIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	explanationTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		letterSpacing: 0.5,
		lineHeight: 17,
		textTransform: "uppercase",
		flex: 1,
	},
	explanationText: {
		color: learning.text,
		fontFamily: "Poppins-Regular",
		fontSize: 14,
		lineHeight: 21,
	},
	explanationCard: {
		backgroundColor: "rgba(255,255,255,0.82)",
		borderLeftWidth: 5,
		borderRadius: 20,
		paddingHorizontal: 15,
		paddingVertical: 13,
		boxShadow: "0px 5px 12px rgba(13, 19, 43, 0.045)",
	},
	correctExplanationCard: {
		borderColor: "rgba(88,204,2,0.16)",
	},
	incorrectExplanationCard: {
		borderColor: "rgba(255,75,75,0.16)",
	},
	exampleBox: {
		flexDirection: "row",
		alignItems: "stretch",
		backgroundColor: "rgba(255,255,255,0.82)",
		borderWidth: 1,
		borderColor: "rgba(229,229,229,0.78)",
		borderRadius: 14,
		marginTop: 10,
		overflow: "hidden",
	},
	exampleAccent: {
		width: 4,
	},
	exampleCopyWrap: {
		flex: 1,
		paddingHorizontal: 11,
		paddingVertical: 8,
	},
	exampleLabel: {
		fontFamily: "Poppins-Bold",
		fontSize: 9,
		letterSpacing: 0.45,
		lineHeight: 12,
		textTransform: "uppercase",
		marginBottom: 2,
	},
	exampleText: {
		color: learning.muted,
		fontFamily: "Poppins-SemiBold",
		fontSize: 13,
		lineHeight: 18,
	},
	buttonStack: {
		gap: 10,
		paddingTop: 4,
	},
	repairActionButton: {
		minHeight: 64,
		borderWidth: 1.5,
		borderBottomWidth: 4,
		borderColor: "#BDEAFF",
		borderBottomColor: learning.selectedDark,
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 13,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		boxShadow: "0px 5px 14px rgba(28, 176, 246, 0.1)",
	},
	repairActionIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: learning.selectedLight,
		borderWidth: 1,
		borderColor: "#BDEAFF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 11,
	},
	repairActionCopy: {
		flex: 1,
		minWidth: 0,
	},
	repairActionTitle: {
		color: learning.selectedDark,
		fontFamily: "Poppins-Bold",
		fontSize: 13,
		letterSpacing: 0.6,
		lineHeight: 18,
		textTransform: "uppercase",
	},
	repairActionSubtitle: {
		color: learning.muted,
		fontFamily: "Poppins-Medium",
		fontSize: 11,
		lineHeight: 15,
		marginTop: 1,
	},
});
