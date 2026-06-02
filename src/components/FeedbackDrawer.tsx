import React, { useRef, useEffect } from "react";
import {
	StyleSheet,
	Animated,
} from "react-native";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import Button3D from "./Button3D";

interface FeedbackDrawerProps {
	visible: boolean;
	isCorrect: boolean;
	correctAnswer: string;
	explanation?: string;
	combo: number; // consecutive correct answers
	onContinue: () => void;
}

export default function FeedbackDrawer({
	visible,
	isCorrect,
	correctAnswer,
	explanation,
	combo,
	onContinue,
}: FeedbackDrawerProps) {
	const slideY = useRef(new Animated.Value(300)).current;

	useEffect(() => {
		if (visible) {
			Animated.spring(slideY, {
				toValue: 0,
				useNativeDriver: true,
				speed: 20,
				bounciness: 4,
			}).start();
		} else {
			Animated.timing(slideY, {
				toValue: 300,
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
						transform: [{ translateY: slideY }],
						backgroundColor: isCorrect ? "#D7FFB8" : "#FFDFE0",
						borderTopColor: isCorrect ? "#58CC02" : "#FF4B4B",
					},
				]}
			>
				<View className="mb-4">
					{isCorrect ? (
						<View className="flex-row items-center mb-1">
							<Image
								source={images.moscotLogo}
								style={{ width: 32, height: 32 }}
								contentFit="contain"
								className="mr-2.5"
							/>
							<Text style={{ color: "#58CC02" }} className="font-poppins-bold text-[20px]">
								{"Excellent! \u{1F389}"}
							</Text>
						</View>
					) : (
						<View className="flex-row items-center mb-1">
							<Image
								source={images.moscotLogo}
								style={{ width: 32, height: 32 }}
								contentFit="contain"
								className="mr-2.5"
							/>
							<Text style={{ color: "#FF4B4B" }} className="font-poppins-bold text-[16px]">
								Correct answer:
							</Text>
						</View>
					)}

					{isCorrect ? (
						combo >= 3 && (
							<Text style={{ color: "#FF9600" }} className="font-poppins-bold text-[14px] mt-1 ml-[42px]">
								{"\u{1F525} "}{combo} in a row!
							</Text>
						)
					) : (
						<Text style={{ color: "#3C3C3C" }} className="font-poppins-bold text-[20px] mt-1 ml-[42px]">
							{correctAnswer}
						</Text>
					)}

					{!isCorrect && explanation && (
						<Text style={styles.explanationText} className="text-[14px] mt-2 ml-[42px]">
							{explanation}
						</Text>
					)}
				</View>

				<Button3D
					onPress={onContinue}
					variant={isCorrect ? "primary" : "danger"}
					title={isCorrect ? "CONTINUE" : "GOT IT"}
					fullWidth
				/>
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
		borderTopWidth: 3,
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	explanationText: {
		color: "#777777",
		fontFamily: "Poppins-Regular",
		fontStyle: "italic",
	},
});
