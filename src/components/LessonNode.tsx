import React, { useRef } from "react";
import {
	Pressable,
	StyleSheet,
	Animated,
	Platform,
} from "react-native";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { Feather } from "@expo/vector-icons";
import { learning, neutral } from "@/theme/colors";
import { Lesson } from "@/types/learning";
import * as Haptics from "expo-haptics";
import { images } from "@/constants/images";
import Svg, { Circle } from "react-native-svg";

const ACTIVE_RING_SIZE = 94;
const ACTIVE_RING_CENTER = ACTIVE_RING_SIZE / 2;
const ACTIVE_RING_RADIUS = 39;
const ACTIVE_RING_STROKE = 4;
const ACTIVE_RING_CIRCUMFERENCE = 2 * Math.PI * ACTIVE_RING_RADIUS;

interface LessonNodeProps {
	lesson: Lesson;
	state: "completed" | "active" | "locked" | "checkpoint";
	unitColor: string;
	activeProgress?: number;
	isMasterChallenge?: boolean;
	onPress: () => void;
}

const getDarkerColor = (color: string): string => {
	if (color === learning.action) return learning.actionDark;
	if (color === learning.selected) return learning.selectedDark;
	if (color === learning.streak) return "#E58800";
	if (color === learning.reward) return learning.rewardDark;

	const hex = color.replace("#", "");
	if (hex.length === 6) {
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		const darken = (val: number) =>
			Math.max(0, Math.floor(val * 0.8)).toString(16).padStart(2, "0");
		return `#${darken(r)}${darken(g)}${darken(b)}`;
	}
	return color;
};

const getLessonIcon = (lesson: Lesson): keyof typeof Feather.glyphMap => {
	const title = lesson.title.toLowerCase();

	if (lesson.isCheckpoint) {
		return "star";
	}
	if (title.includes("greet") || title.includes("meet") || title.includes("hello") || title.includes("contact")) {
		return "message-circle";
	}
	if (title.includes("chat") || title.includes("conversation") || title.includes("partner")) {
		return "message-square";
	}
	if (title.includes("food") || title.includes("drink") || title.includes("cafe") || title.includes("café") || title.includes("dining")) {
		return "coffee";
	}
	if (title.includes("home") || title.includes("family") || title.includes("routine")) {
		return "home";
	}
	if (lesson.type === "video") return "video";
	if (lesson.type === "audio") return "headphones";
	if (lesson.type === "chat") return "message-circle";
	return "book-open";
};

const getLessonIconAsset = (lesson: Lesson) => {
	const title = lesson.title.toLowerCase();

	if (lesson.isCheckpoint) return images.appIconStar;
	if (title.includes("home") || title.includes("family") || title.includes("routine")) {
		return images.appIconHome;
	}
	if (lesson.type === "video") return images.appIconVideo;
	if (lesson.type === "audio") return images.appIconHeadphones;
	if (lesson.type === "vocabulary") return images.appIconBook;

	return null;
};

export default function LessonNode({
	lesson,
	state,
	unitColor,
	activeProgress = 0,
	isMasterChallenge = false,
	onPress,
}: LessonNodeProps) {
	const pressAnim = useRef(new Animated.Value(0)).current;
	const isLocked = state === "locked";
	const isCheckpointNode = lesson.isCheckpoint;
	const isCheckpoint = state === "checkpoint" || isCheckpointNode;
	const isLockedCheckpoint = isLocked && isCheckpointNode;
	const isAvailableCheckpoint = state === "checkpoint" && isCheckpointNode;
	const isCompletedCheckpoint = state === "completed" && isCheckpointNode;
	const isMasterChallengeNode = isMasterChallenge && !isCheckpointNode;
	const isUnlockedMasterChallenge = isMasterChallengeNode && !isLocked;
	const isCompletedMasterChallenge = isMasterChallengeNode && state === "completed";
	const activeIcon = getLessonIcon(lesson);
	const activeIconAsset = getLessonIconAsset(lesson);
	const showStartTooltip = state === "active";
	const showCheckpointTooltip = isAvailableCheckpoint;
	const showMasterTooltip = isUnlockedMasterChallenge && state === "active";
	const useDefaultLockedAsset =
		isLocked &&
		!isCheckpoint &&
		(activeIcon === "book-open" || lesson.type === "vocabulary");
	const activeRingProgress = Math.min(1, Math.max(0, activeProgress));
	const visibleRingProgress = state === "active"
		? Math.max(activeRingProgress, 0.08)
		: 0;

	const handlePressIn = () => {
		if (isLocked) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
		Animated.timing(pressAnim, {
			toValue: 4,
			duration: 50,
			useNativeDriver: true,
		}).start();
	};

	const handlePressOut = () => {
		if (isLocked) return;
		Animated.timing(pressAnim, {
			toValue: 0,
			duration: 80,
			useNativeDriver: true,
		}).start();
	};

	const size = 71;
	const height = 65;
	const borderRadius = 36;
	const baseColor = unitColor || learning.action;

	let shadowColor = getDarkerColor(baseColor);
	let opacity = 1;
	const assetSource = isAvailableCheckpoint || isCompletedCheckpoint || isUnlockedMasterChallenge
		? images.pathNodeGold
		: state === "completed"
			? images.pathNodeComplete
			: images.pathNodeNext;

	if (state === "completed") {
		opacity = 0.95;
		if (isCompletedCheckpoint) {
			shadowColor = learning.rewardDark;
		} else if (isUnlockedMasterChallenge) {
			shadowColor = learning.rewardDark;
		}
	} else if (state === "locked") {
		shadowColor = "#C5C7CB";
		opacity = isLockedCheckpoint ? 0.78 : 0.9;
	} else if (isAvailableCheckpoint || isUnlockedMasterChallenge) {
		shadowColor = learning.rewardDark;
	}

	return (
		<View style={[styles.nodeContainer, { width: size, height }]}>
			{isAvailableCheckpoint ? (
				<View style={styles.checkpointReadyRing} pointerEvents="none" />
			) : null}

			{isUnlockedMasterChallenge ? (
				<View style={styles.masterChallengeRing} pointerEvents="none" />
			) : null}

			{state === "active" && !isUnlockedMasterChallenge ? (
				<View style={styles.activeProgressRing} pointerEvents="none">
					<Svg
						width={ACTIVE_RING_SIZE}
						height={ACTIVE_RING_SIZE}
						viewBox={`0 0 ${ACTIVE_RING_SIZE} ${ACTIVE_RING_SIZE}`}
					>
						<Circle
							cx={ACTIVE_RING_CENTER}
							cy={ACTIVE_RING_CENTER}
							r={ACTIVE_RING_RADIUS}
							stroke="#E5E5E5"
							strokeWidth={ACTIVE_RING_STROKE}
							fill="none"
						/>
						<Circle
							cx={ACTIVE_RING_CENTER}
							cy={ACTIVE_RING_CENTER}
							r={ACTIVE_RING_RADIUS}
							stroke="#CE82FF"
							strokeWidth={ACTIVE_RING_STROKE}
							strokeLinecap="round"
							strokeDasharray={`${ACTIVE_RING_CIRCUMFERENCE} ${ACTIVE_RING_CIRCUMFERENCE}`}
							strokeDashoffset={ACTIVE_RING_CIRCUMFERENCE * (1 - visibleRingProgress)}
							fill="none"
							transform={`rotate(-90 ${ACTIVE_RING_CENTER} ${ACTIVE_RING_CENTER})`}
						/>
					</Svg>
				</View>
			) : null}

			<Pressable
				accessibilityRole="button"
				accessibilityLabel={lesson.title}
				accessibilityState={{ disabled: isLocked, selected: state === "active" }}
				disabled={isLocked}
				hitSlop={6}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={onPress}
				style={[
					styles.outerNode,
					{
						width: size,
						height,
						borderRadius,
						backgroundColor: shadowColor,
						opacity,
					},
				]}
			>
				<Animated.View
					style={[
						styles.innerNode,
						{
							transform: [{ translateY: pressAnim }],
						},
					]}
				>
					{state === "locked" ? (
						<>
							<Image
								source={
									useDefaultLockedAsset
										? images.pathNodeUnavailable
										: images.pathNodeUnavailableBlank
								}
								style={styles.nodeAsset}
								contentFit="contain"
							/>
							{useDefaultLockedAsset ? null : (
								isLockedCheckpoint ? (
									<Feather
										name="star"
										size={29}
										color="#AFAFAF"
										style={styles.lockedCheckpointStar}
									/>
								) : activeIconAsset ? (
									<Image
										source={activeIconAsset}
										style={
											isCheckpoint
												? styles.lockedCheckpointIconImage
												: styles.lockedIconImage
										}
										contentFit="contain"
									/>
								) : (
									<Feather
										name={activeIcon}
										size={26}
										color={neutral.textSecondary}
										style={styles.lockedIcon}
									/>
								)
							)}
							{isCheckpoint ? (
								<View style={styles.lockedCheckpointBadge}>
									<Text style={styles.lockedCheckpointBadgeText}>LOCKED</Text>
								</View>
							) : null}
							{isMasterChallengeNode ? (
								<View style={styles.lockedMasterBadge}>
									<Text style={styles.lockedMasterBadgeText}>MASTER</Text>
								</View>
							) : null}
						</>
					) : (
						<>
							<Image
								source={assetSource}
								style={styles.nodeAsset}
								contentFit="contain"
							/>
							{state === "active" && !isCheckpoint && !isUnlockedMasterChallenge ? (
								activeIconAsset ? (
									<Image
										source={activeIconAsset}
										style={styles.centerIconImage}
										contentFit="contain"
									/>
								) : (
									<Feather
										name={activeIcon}
										size={28}
										color="#FFFFFF"
										style={styles.centerIcon}
									/>
								)
							) : null}
						</>
					)}
				</Animated.View>

				{isUnlockedMasterChallenge ? (
					<View
						style={[
							styles.masterBadge,
							isCompletedMasterChallenge ? styles.masteredBadge : null,
						]}
					>
						<Text
							style={[
								styles.masterBadgeText,
								isCompletedMasterChallenge ? styles.masteredBadgeText : null,
							]}
						>
							{isCompletedMasterChallenge ? "MASTERED" : "MASTER"}
						</Text>
					</View>
				) : null}

				{isCompletedCheckpoint ? (
					<View style={styles.checkpointPassedBadge}>
						<Text style={styles.checkpointPassedBadgeText}>PASSED</Text>
					</View>
				) : null}

				{state === "completed" ? (
					<View
						style={[
							styles.completedBadge,
							isCompletedCheckpoint || isCompletedMasterChallenge
								? styles.checkpointCompletedBadge
								: null,
						]}
					>
						<Feather
							name="check"
							size={12}
							color={
								isCompletedCheckpoint || isUnlockedMasterChallenge
									? "#FFFFFF"
									: learning.actionDark
							}
						/>
					</View>
				) : null}

				{showStartTooltip || showCheckpointTooltip ? (
					<View
						style={[
							styles.startTooltip,
							showCheckpointTooltip ? styles.checkpointTooltip : null,
							showMasterTooltip ? styles.masterTooltip : null,
						]}
					>
						<Text
							style={[
								styles.startTooltipText,
								showCheckpointTooltip ? styles.checkpointTooltipText : null,
								showMasterTooltip ? styles.masterTooltipText : null,
							]}
						>
							{showCheckpointTooltip ? "CHECKPOINT" : showMasterTooltip ? "MASTER" : "START"}
						</Text>
						<Text
							style={[
								styles.startTooltipSubText,
								showCheckpointTooltip ? styles.checkpointTooltipSubText : null,
								showMasterTooltip ? styles.masterTooltipSubText : null,
							]}
						>
							+{isMasterChallengeNode ? lesson.xpReward * 2 : lesson.xpReward} XP
						</Text>
						<View
							style={[
								styles.startTooltipPointer,
								showCheckpointTooltip ? styles.checkpointTooltipPointer : null,
								showMasterTooltip ? styles.masterTooltipPointer : null,
							]}
						/>
					</View>
				) : null}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	nodeContainer: {
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	activeProgressRing: {
		position: "absolute",
		width: ACTIVE_RING_SIZE,
		height: ACTIVE_RING_SIZE,
		left: -12,
		top: -15,
	},
	checkpointReadyRing: {
		position: "absolute",
		width: 87,
		height: 81,
		left: -8,
		top: -8,
		borderRadius: 44,
		borderWidth: 3,
		borderColor: "#FFC800",
		backgroundColor: "rgba(255, 248, 225, 0.75)",
	},
	masterChallengeRing: {
		position: "absolute",
		width: 89,
		height: 83,
		left: -9,
		top: -9,
		borderRadius: 45,
		borderWidth: 3,
		borderColor: "#FFC800",
		backgroundColor: "rgba(255, 243, 204, 0.82)",
	},
	outerNode: {
		position: "relative",
		overflow: "visible",
	},
	innerNode: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		overflow: "visible",
	},
	nodeAsset: {
		width: 71,
		height: 65,
	},
	lockedIcon: {
		position: "absolute",
		top: 18,
		left: 22,
		opacity: 0.62,
	},
	lockedIconImage: {
		position: "absolute",
		top: 17,
		left: 20,
		width: 31,
		height: 27,
		opacity: 0.52,
	},
	lockedCheckpointIconImage: {
		position: "absolute",
		top: 13,
		left: 17,
		width: 38,
		height: 34,
		opacity: 0.68,
	},
	lockedCheckpointStar: {
		position: "absolute",
		top: 16,
		left: 21,
		opacity: 0.72,
	},
	lockedCheckpointBadge: {
		position: "absolute",
		bottom: -12,
		alignSelf: "center",
		minWidth: 48,
		height: 17,
		borderRadius: 9,
		borderWidth: 1,
		borderColor: "#C5C7CB",
		backgroundColor: "#F7F7F7",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},
	lockedCheckpointBadgeText: {
		fontFamily: "Poppins-Bold",
		fontSize: 8,
		lineHeight: 10,
		color: "#777777",
		letterSpacing: 0.4,
	},
	lockedMasterBadge: {
		position: "absolute",
		bottom: -12,
		alignSelf: "center",
		minWidth: 48,
		height: 17,
		borderRadius: 9,
		borderWidth: 1,
		borderColor: "#D6B34A",
		backgroundColor: "#F7F7F7",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},
	lockedMasterBadgeText: {
		fontFamily: "Poppins-Bold",
		fontSize: 8,
		lineHeight: 10,
		color: "#A97800",
		letterSpacing: 0.4,
		opacity: 0.72,
	},
	centerIcon: {
		position: "absolute",
		top: 16,
		left: 21,
		...Platform.select({
			ios: {
				shadowColor: "#000000",
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.24,
				shadowRadius: 1,
			},
			android: {
				elevation: 1,
			},
		}),
	},
	centerIconImage: {
		position: "absolute",
		top: 17,
		left: 19,
		width: 33,
		height: 28,
	},
	completedBadge: {
		position: "absolute",
		right: -4,
		top: -3,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "#FFFFFF",
		borderWidth: 2,
		borderColor: learning.actionLight,
		alignItems: "center",
		justifyContent: "center",
	},
	checkpointCompletedBadge: {
		backgroundColor: learning.action,
		borderColor: "#FFFFFF",
	},
	checkpointPassedBadge: {
		position: "absolute",
		bottom: -12,
		alignSelf: "center",
		minWidth: 58,
		height: 18,
		borderRadius: 9,
		borderWidth: 1,
		borderColor: learning.actionDark,
		backgroundColor: learning.action,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 7,
	},
	checkpointPassedBadgeText: {
		fontFamily: "Poppins-Bold",
		fontSize: 8,
		lineHeight: 10,
		color: "#FFFFFF",
		letterSpacing: 0.45,
	},
	masterBadge: {
		position: "absolute",
		bottom: -12,
		alignSelf: "center",
		minWidth: 52,
		height: 18,
		borderRadius: 9,
		borderWidth: 1,
		borderColor: "#D99A00",
		backgroundColor: "#FFF3CC",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 7,
	},
	masteredBadge: {
		minWidth: 62,
		borderColor: "#A97800",
		backgroundColor: "#FFC800",
	},
	masterBadgeText: {
		fontFamily: "Poppins-Bold",
		fontSize: 8,
		lineHeight: 10,
		color: "#A97800",
		letterSpacing: 0.45,
	},
	masteredBadgeText: {
		color: "#FFFFFF",
	},
	startTooltip: {
		position: "absolute",
		bottom: -43,
		alignSelf: "center",
		minWidth: 86,
		minHeight: 42,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "#CE82FF",
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
		paddingVertical: 5,
	},
	checkpointTooltip: {
		minWidth: 112,
		borderColor: learning.rewardDark,
		backgroundColor: "#FFF8E1",
	},
	startTooltipText: {
		fontFamily: "Poppins-Bold",
		fontSize: 12,
		lineHeight: 15,
		color: "#CE82FF",
		letterSpacing: 0.2,
	},
	checkpointTooltipText: {
		color: "#A97800",
	},
	startTooltipSubText: {
		fontFamily: "Poppins-Bold",
		fontSize: 9,
		lineHeight: 12,
		color: learning.streak,
		marginTop: 1,
	},
	checkpointTooltipSubText: {
		color: learning.streak,
	},
	startTooltipPointer: {
		position: "absolute",
		top: -7,
		width: 12,
		height: 12,
		backgroundColor: "#FFFFFF",
		borderLeftWidth: 2,
		borderTopWidth: 2,
		borderColor: "#CE82FF",
		transform: [{ rotate: "45deg" }],
	},
	checkpointTooltipPointer: {
		backgroundColor: "#FFF8E1",
		borderColor: learning.rewardDark,
	},
	masterTooltip: {
		borderColor: "#FFC800",
		backgroundColor: "#FFF3CC",
	},
	masterTooltipText: {
		color: "#A97800",
	},
	masterTooltipSubText: {
		color: learning.streak,
	},
	masterTooltipPointer: {
		backgroundColor: "#FFF3CC",
		borderColor: "#FFC800",
	},
	iconShadow: {
		...Platform.select({
			ios: {
				shadowColor: "#000000",
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.2,
				shadowRadius: 1,
			},
			android: {
				elevation: 1,
			},
		}),
	},
});
