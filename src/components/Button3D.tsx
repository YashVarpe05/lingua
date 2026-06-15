import React, { useRef } from "react";
import {
	Pressable,
	StyleSheet,
	Animated,
	ViewStyle,
	TextStyle,
	ActivityIndicator,
} from "react-native";
import { Text } from "@/tw";
import { brand, learning, neutral } from "@/theme/colors";
import * as Haptics from "expo-haptics";

type Button3DVariant =
	| "primary"
	| "secondary"
	| "warning"
	| "accent"
	| "brand"
	| "danger"
	| "gray"
	| "ghost";

interface Button3DProps {
	onPress?: () => void;
	disabled?: boolean;
	loading?: boolean;
	variant?: Button3DVariant;
	children?: React.ReactNode;
	title?: string;
	style?: ViewStyle;
	textStyle?: TextStyle;
	size?: "sm" | "md" | "lg";
	fullWidth?: boolean;
}

const buttonColors: Record<Button3DVariant, { bg: string; shadow: string; text: string; border: string }> = {
	primary: {
		bg: learning.action,
		shadow: learning.actionDark,
		text: "#FFFFFF",
		border: "rgba(255, 255, 255, 0.18)",
	},
	secondary: {
		bg: learning.selected,
		shadow: learning.selectedDark,
		text: "#FFFFFF",
		border: "rgba(255, 255, 255, 0.18)",
	},
	warning: {
		bg: learning.reward,
		shadow: learning.rewardDark,
		text: learning.text,
		border: "rgba(255, 255, 255, 0.28)",
	},
	accent: {
		bg: brand.primary,
		shadow: brand.primaryDark,
		text: "#FFFFFF",
		border: "rgba(255, 255, 255, 0.18)",
	},
	brand: {
		bg: brand.primary,
		shadow: brand.primaryDark,
		text: "#FFFFFF",
		border: "rgba(255, 255, 255, 0.18)",
	},
	danger: {
		bg: learning.correction,
		shadow: learning.correctionDark,
		text: "#FFFFFF",
		border: "rgba(255, 255, 255, 0.18)",
	},
	gray: {
		bg: neutral.border,
		shadow: "#C5C7CB",
		text: "#9CA3AF",
		border: "rgba(255, 255, 255, 0.18)",
	},
	ghost: {
		bg: "#FFFFFF",
		shadow: neutral.border,
		text: learning.selected,
		border: neutral.border,
	},
};

export default function Button3D({
	onPress,
	disabled = false,
	loading = false,
	variant = "primary",
	children,
	title,
	style,
	textStyle,
	size = "md",
	fullWidth = true,
}: Button3DProps) {
	const pressedAnim = useRef(new Animated.Value(0)).current;

	const handlePressIn = () => {
		if (disabled || loading) return;

		// Instantaneous tactile response
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
			// Fail silently on unsupported platforms (Web, etc.)
		});

		Animated.timing(pressedAnim, {
			toValue: 1,
			duration: 50,
			useNativeDriver: true,
		}).start();
	};

	const handlePressOut = () => {
		if (disabled || loading) return;
		Animated.timing(pressedAnim, {
			toValue: 0,
			duration: 80,
			useNativeDriver: true,
		}).start();
	};

	const isButtonDisabled = disabled || loading;
	const activeVariant = isButtonDisabled ? "gray" : variant;
	const selectedColors = buttonColors[activeVariant];

	// Translate button surface downwards by 4px when pressed, simulating mechanical press
	const translateY = pressedAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [-4, 0],
	});

	const getPadding = () => {
		if (size === "sm") return { py: 8, px: 16, fontSize: 13 };
		if (size === "lg") return { py: 16, px: 32, fontSize: 16 };
		return { py: 12, px: 24, fontSize: 15 };
	};

	const paddingSettings = getPadding();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: isButtonDisabled, busy: loading }}
			disabled={isButtonDisabled}
			hitSlop={4}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			onPress={onPress}
			style={[
				styles.container,
				{
					backgroundColor: selectedColors.shadow,
					borderRadius: 16,
					alignSelf: fullWidth ? "stretch" : "center",
				},
				style,
			]}
		>
			<Animated.View
				style={[
					styles.surface,
					{
						backgroundColor: selectedColors.bg,
						transform: [{ translateY }],
						borderRadius: 16,
						borderColor: selectedColors.border,
						paddingVertical: paddingSettings.py,
						paddingHorizontal: paddingSettings.px,
					},
				]}
			>
				{loading ? (
					<ActivityIndicator size="small" color={selectedColors.text} />
				) : (children || title) ? (
					<Text
						style={[
							styles.text,
							{
								color: selectedColors.text,
								fontSize: paddingSettings.fontSize,
							},
							textStyle,
						]}
						className="font-poppins-bold text-center tracking-wide"
					>
						{children || title}
					</Text>
				) : null}
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "relative",
		marginTop: 4,
	},
	surface: {
		width: "100%",
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1.5,
	},
	text: {
		textAlign: "center",
	},
});
