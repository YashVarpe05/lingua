import React from "react";
import { StyleSheet } from "react-native";
import { View } from "@/tw";

interface PathConnectorProps {
	completed: boolean;
	unitColor: string;
	currentX: number;
	nextX: number;
	currentY: number;
	nodeSize?: number;
}

export default function PathConnector({
	completed,
	unitColor,
	currentX,
	nextX,
	currentY,
	nodeSize = 64,
}: PathConnectorProps) {
	const color = completed ? unitColor + "99" : "#E5E5E5";

	// Spacing between node tops is 96px
	const dy = 96;
	const dx = nextX - currentX;
	const angleRad = Math.atan2(dx, dy);
	const angleDeg = (angleRad * 180) / Math.PI;

	// Length of the connector line
	const length = Math.sqrt(dx * dx + dy * dy) - nodeSize + 8;

	// Midpoint coordinates for positioning
	const midX = currentX + nodeSize / 2 + dx / 2 - 1.5;
	const midY = currentY + nodeSize / 2 + dy / 2 - length / 2;

	return (
		<View
			style={[
				styles.connector,
				{
					height: length,
					borderLeftColor: color,
					position: "absolute",
					left: midX,
					top: midY,
					transform: [{ rotate: `${angleDeg}deg` }],
				},
			]}
		/>
	);
}

const styles = StyleSheet.create({
	connector: {
		width: 3,
		borderLeftWidth: 3,
		borderStyle: "dashed",
	},
});
