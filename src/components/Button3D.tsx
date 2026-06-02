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
import * as Haptics from "expo-haptics";

interface Button3DProps {
	onPress?: () => void;
	disabled?: boolean;
	loading?: boolean;
	variant?: "primary" | "secondary" | "warning" | "accent" | "danger" | "gray" | "ghost";
	children?: React.ReactNode;
	title?: string;
	style?: ViewStyle;
	textStyle?: TextStyle;
	size?: "sm" | "md" | "lg";
	fullWidth?: boolean;
}

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

	const colors = {
		primary: { bg: "#58CC02", shadow: "#58A700", text: "#FFFFFF" }, // duo green / green dark
		secondary: { bg: "#1CB0F6", shadow: "#0D90D0", text: "#FFFFFF" }, // duo blue / blue dark
		warning: { bg: "#FFC800", shadow: "#E5A000", text: "#FFFFFF" }, // duo yellow / yellow dark
		accent: { bg: "#6C4EF5", shadow: "#5537D2", text: "#FFFFFF" }, // purple / deep purple
		danger: { bg: "#FF4B4B", shadow: "#EA2B2B", text: "#FFFFFF" }, // duo red / red dark
		gray: { bg: "#E5E7EB", shadow: "#C5C7CB", text: "#9CA3AF" }, // disabled / neutral gray
		ghost: { bg: "#FFFFFF", shadow: "#E5E7EB", text: "#1CB0F6" }, // white bg, gray border/shadow, blue/primary text
	};

	const isButtonDisabled = disabled || loading;
	const activeVariant = isButtonDisabled ? "gray" : variant;
	const selectedColors = colors[activeVariant];

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
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			onPress={isButtonDisabled ? undefined : onPress}
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
		marginTop: 4, // Compensation for translation offset
	},
	surface: {
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1.5,
		borderColor: "rgba(255, 255, 255, 0.18)",
	},
	text: {
		textAlign: "center",
	},
});

