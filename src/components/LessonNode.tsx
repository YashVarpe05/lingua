import React, { useRef, useEffect } from "react";
import {
	Pressable,
	StyleSheet,
	Animated,
	Text as RNText,
	Platform,
} from "react-native";
import { View } from "@/tw";
import { Feather } from "@expo/vector-icons";
import { Lesson } from "@/types/learning";
import * as Haptics from "expo-haptics";

interface LessonNodeProps {
	lesson: Lesson;
	state: "completed" | "active" | "locked" | "checkpoint";
	unitColor: string;
	onPress: () => void;
}

const getDarkerColor = (color: string): string => {
	if (color === "#58CC02") return "#58A700";
	if (color === "#1CB0F6") return "#0D90D0";
	if (color === "#FF9600") return "#E58800";
	if (color === "#FFC800") return "#E5A000";

	// Fallback darkener
	const hex = color.replace("#", "");
	if (hex.length === 6) {
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		const darken = (val: number) => Math.max(0, Math.floor(val * 0.8)).toString(16).padStart(2, "0");
		return `#${darken(r)}${darken(g)}${darken(b)}`;
	}
	return color;
};

const getLessonEmoji = (lesson: Lesson): string => {
	const title = lesson.title.toLowerCase();
	if (title.includes("greet") || title.includes("meet") || title.includes("hello") || title.includes("contact")) {
		return "👋";
	}
	if (title.includes("chat") || title.includes("conversation") || title.includes("partner")) {
		return "💬";
	}
	if (title.includes("food") || title.includes("drink") || title.includes("café") || title.includes("dining")) {
		return "🍕";
	}
	if (title.includes("home") || title.includes("family") || title.includes("routine")) {
		return "🏠";
	}
	if (lesson.type === "video") return "📹";
	if (lesson.type === "audio") return "🎧";
	return "📖";
};

export default function LessonNode({
	lesson,
	state,
	unitColor,
	onPress,
}: LessonNodeProps) {
	const pressAnim = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(0)).current;
	const isLocked = state === "locked";

	useEffect(() => {
		if (state === "active") {
			pulseAnim.setValue(0);
			Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 750,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 0,
						duration: 750,
						useNativeDriver: true,
					}),
				])
			).start();
		} else {
			pulseAnim.setValue(0);
		}
	}, [state, pulseAnim]);

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

	// Determine dimensions and colors
	const isCheckpoint = state === "checkpoint" || lesson.isCheckpoint;
	const size = isCheckpoint ? 76 : 64;
	const borderRadius = size / 2;

	let bgColor = unitColor;
	let shadowColor = getDarkerColor(unitColor);
	let opacity = 1.0;

	if (state === "completed") {
		opacity = 0.9;
	} else if (state === "locked") {
		bgColor = "#E5E5E5";
		shadowColor = "#C5C7CB";
	} else if (isCheckpoint) {
		bgColor = "#FFC800";
		shadowColor = "#E5A000";
	}

	const pulseScale = pulseAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [1.0, 1.25],
	});

	const pulseOpacity = pulseAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.8, 0.0],
	});

	return (
		<View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
			{/* Pulsing ring for active state */}
			{state === "active" && (
				<Animated.View
					style={[
						styles.pulseRing,
						{
							width: size,
							height: size,
							borderRadius: borderRadius,
							borderColor: unitColor,
							transform: [{ scale: pulseScale }],
							opacity: pulseOpacity,
						},
					]}
				/>
			)}

			<Pressable
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={onPress}
				disabled={isLocked}
				style={[
					styles.outerNode,
					{
						width: size,
						height: size,
						borderRadius: borderRadius,
						backgroundColor: shadowColor,
						borderBottomWidth: 4,
						borderColor: shadowColor,
						opacity,
					},
				]}
			>
				<Animated.View
					style={[
						styles.innerNode,
						{
							borderRadius: borderRadius - 2,
							backgroundColor: bgColor,
							transform: [{ translateY: pressAnim }],
						},
					]}
				>
					{state === "completed" && (
						<Feather name="check" size={28} color="#FFFFFF" style={styles.iconShadow} />
					)}
					{state === "locked" && (
						<Feather name="lock" size={24} color="#A1A1AA" style={{ opacity: 0.4 }} />
					)}
					{state === "active" && (
						<RNText style={styles.emojiText}>
							{getLessonEmoji(lesson)}
						</RNText>
					)}
					{isCheckpoint && state !== "completed" && (
						<Feather name="star" size={32} color="#FFFFFF" style={styles.iconShadow} />
					)}
				</Animated.View>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	outerNode: {
		position: "relative",
		overflow: "hidden",
	},
	innerNode: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1.5,
		borderColor: "rgba(255, 255, 255, 0.25)",
	},
	pulseRing: {
		position: "absolute",
		borderWidth: 4,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	emojiText: {
		fontSize: 28,
		textAlign: "center",
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
