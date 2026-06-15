import React from "react";
import { StyleSheet, TouchableOpacity, Alert } from "react-native";
import { View, Text } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { learning, neutral } from "@/theme/colors";
import { Unit } from "@/types/learning";

interface UnitBannerProps {
	unit: Unit;
	unitNumber: number;
}

const withAlpha = (color: string, alpha: string, fallback: string) => {
	if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
		return `${color}${alpha}`;
	}
	return fallback;
};

export default function UnitBanner({ unit, unitNumber }: UnitBannerProps) {
	const unitColor = unit.unitColor || learning.action;
	const cefr = unit.cefr || "A1";
	const cleanTitle = unit.title.replace(/^Unit \d+:\s*/i, "");
	const vocabularyPreview = unit.targetVocabulary?.slice(0, 3) ?? [];
	const focusPreview = unit.grammarFocus?.slice(0, 2) ?? [];
	const hasPreviewChips = vocabularyPreview.length > 0 || focusPreview.length > 0;
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
					backgroundColor: withAlpha(unitColor, "1A", learning.actionLight),
					borderLeftColor: unitColor,
				},
			]}
		>
			<View
				style={[
					styles.headerGlow,
					{ backgroundColor: withAlpha(unitColor, "22", "rgba(88,204,2,0.14)") },
				]}
			/>
			<View className="flex-row items-center justify-between">
				<View className="flex-row items-center flex-1 mr-2">
					<View
						style={[
							styles.unitIcon,
							{
								backgroundColor: withAlpha(unitColor, "22", learning.actionLight),
								borderColor: withAlpha(unitColor, "44", learning.action),
							},
						]}
					>
						{unit.unitEmoji ? (
							<Text className="text-[24px] leading-[30px]">{unit.unitEmoji}</Text>
						) : (
							<Image
								source={images.appIconBook}
								style={styles.unitImageIcon}
								contentFit="contain"
							/>
						)}
					</View>
					<View className="flex-1">
						<View className="flex-row flex-wrap items-center">
							<View
								style={[
									styles.unitPill,
									{ backgroundColor: unitColor },
								]}
							>
								<Text className="font-poppins-bold text-[11px] text-white uppercase">
									Unit {unitNumber}
								</Text>
							</View>
							<Text
								style={{ color: unitColor }}
								className="font-poppins-bold text-[11px] uppercase tracking-[0.5px] ml-2"
							>
								{cefr} Chapter
							</Text>
						</View>
						<Text className="font-poppins-bold text-[18px] text-neutral-primary mt-0.5 leading-[24px]">
							{cleanTitle}
						</Text>
					</View>
				</View>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel={`Open Unit ${unitNumber} guidebook`}
					hitSlop={8}
					onPress={handleOpenGuidebook}
					activeOpacity={0.75}
					style={[
						styles.guidebookButton,
						{ borderColor: withAlpha(unitColor, "33", neutral.border) },
					]}
				>
					<Image
						source={images.appIconBook}
						style={styles.guidebookIconImage}
						contentFit="contain"
					/>
				</TouchableOpacity>
			</View>

			<Text className="font-poppins text-[13px] text-neutral-secondary mt-2 leading-[18px]">
				{unit.description}
			</Text>

			{unit.canDoGoal ? (
				<View
					style={[
						styles.canDoCard,
						{ borderColor: withAlpha(unitColor, "33", neutral.border) },
					]}
				>
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

			{hasPreviewChips ? (
				<View className="flex-row flex-wrap mt-3">
					{vocabularyPreview.map((item) => (
						<View
							key={`vocab-${item}`}
							style={[
								styles.chip,
								{ borderColor: withAlpha(unitColor, "33", neutral.border) },
							]}
						>
							<Text
								style={{ color: unitColor }}
								className="font-poppins-semibold text-[12px]"
								numberOfLines={1}
							>
								{item}
							</Text>
						</View>
					))}
					{focusPreview.map((item) => (
						<View
							key={`focus-${item}`}
							style={[
								styles.chip,
								{ borderColor: withAlpha(unitColor, "33", neutral.border) },
							]}
						>
							<Image
								source={images.appIconTarget}
								style={styles.chipIconImage}
								contentFit="contain"
							/>
							<Text
								style={{ color: unitColor }}
								className="font-poppins-semibold text-[12px] ml-1"
								numberOfLines={1}
							>
								{item}
							</Text>
						</View>
					))}
				</View>
			) : null}

		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		borderLeftWidth: 4,
		borderRadius: 18,
		padding: 16,
		marginHorizontal: 16,
		marginVertical: 12,
		shadowColor: neutral.textPrimary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 1,
	},
	headerGlow: {
		position: "absolute",
		top: 0,
		right: 0,
		width: 92,
		height: 92,
		borderBottomLeftRadius: 92,
		borderTopRightRadius: 18,
	},
	unitIcon: {
		width: 50,
		height: 50,
		borderRadius: 16,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	unitImageIcon: {
		width: 28,
		height: 28,
	},
	unitPill: {
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 4,
	},
	canDoCard: {
		backgroundColor: "rgba(255,255,255,0.82)",
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginTop: 12,
	},
	chip: {
		maxWidth: "100%",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.76)",
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
		marginRight: 8,
		marginBottom: 8,
	},
	chipIconImage: {
		width: 13,
		height: 13,
	},
	guidebookButton: {
		width: 42,
		height: 42,
		borderRadius: 15,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.82)",
	},
	guidebookIconImage: {
		width: 24,
		height: 24,
	},
});
