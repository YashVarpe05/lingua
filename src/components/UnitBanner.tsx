import React from "react";
import { StyleSheet, TouchableOpacity, Alert } from "react-native";
import { View, Text } from "@/tw";
import { Unit } from "@/types/learning";

interface UnitBannerProps {
	unit: Unit;
	unitNumber: number;
}

export default function UnitBanner({ unit, unitNumber }: UnitBannerProps) {
	const unitColor = unit.unitColor || "#58CC02";
	const unitEmoji = unit.unitEmoji || "👋";
	const cefr = unit.cefr || "A1";
	const cleanTitle = unit.title.replace(/^Unit \d+:\s*/i, "");
	const guidebookDetails = [
		unit.canDoGoal ? `Goal: ${unit.canDoGoal}` : unit.description,
		unit.targetVocabulary?.length ? `Vocabulary: ${unit.targetVocabulary.join(", ")}` : null,
		unit.grammarFocus?.length ? `Focus: ${unit.grammarFocus.join(", ")}` : null,
	]
		.filter(Boolean)
		.join("\n\n");

	const handleOpenGuidebook = () => {
		Alert.alert(
			`Unit ${unitNumber} Guidebook`,
			guidebookDetails,
			[{ text: "OK" }]
		);
	};

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: unitColor + "1A", // 10% opacity hex
					borderLeftColor: unitColor,
				},
			]}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-row items-center flex-1 mr-2">
					<Text className="text-[28px] mr-3">{unitEmoji}</Text>
					<View className="flex-1">
						<Text
							style={{ color: unitColor }}
							className="font-poppins-bold text-[13px] uppercase tracking-wider"
						>
							Unit {unitNumber} • CEFR {cefr}
						</Text>
						<Text className="font-poppins-bold text-[18px] text-neutral-primary mt-0.5 leading-[24px]">
							{cleanTitle}
						</Text>
					</View>
				</View>
			</View>

			<Text className="font-poppins text-[13px] text-neutral-secondary mt-2 leading-[18px]">
				{unit.description}
			</Text>

			{unit.canDoGoal ? (
				<View className="bg-white/80 border border-white rounded-xl px-3 py-2 mt-3">
					<Text
						style={{ color: unitColor }}
						className="font-poppins-bold text-[11px] uppercase tracking-[0.5px]"
					>
						Can-do goal
					</Text>
					<Text className="font-poppins-semibold text-[12px] text-neutral-primary mt-1 leading-[17px]">
						{unit.canDoGoal}
					</Text>
				</View>
			) : null}

			<TouchableOpacity
				onPress={handleOpenGuidebook}
				activeOpacity={0.7}
				style={styles.guidebookButton}
			>
				<Text
					style={{ color: unitColor }}
					className="font-poppins-bold text-[14px]"
				>
					📖 Guidebook →
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		borderLeftWidth: 4,
		borderRadius: 12,
		padding: 16,
		marginHorizontal: 16,
		marginVertical: 12,
		// Standard card shadow
		shadowColor: "#0D132B",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
		elevation: 1,
	},
	guidebookButton: {
		marginTop: 12,
		alignSelf: "flex-start",
	},
});
