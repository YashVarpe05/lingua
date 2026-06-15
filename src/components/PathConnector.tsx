import React from "react";
import { StyleSheet } from "react-native";
import { View } from "@/tw";

export type PathConnectorState = "completed" | "active" | "checkpoint" | "locked";

interface PathConnectorProps {
	state: PathConnectorState;
	unitColor: string;
	currentX: number;
	nextX: number;
	currentY: number;
	nodeSize?: number;
}

const withAlpha = (color: string, alpha: string, fallback: string) => {
	if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
		return `${color}${alpha}`;
	}
	return fallback;
};

const getConnectorVisual = (state: PathConnectorState, unitColor: string) => {
	if (state === "active") {
		return { color: "#CE82FF", width: 4 };
	}
	if (state === "checkpoint") {
		return { color: "#FFC800", width: 4 };
	}
	if (state === "completed") {
		return { color: withAlpha(unitColor, "99", "#58CC0299"), width: 3 };
	}
	return { color: "#E5E5E5", width: 3 };
};

export default function PathConnector({
	state,
	unitColor,
	currentX,
	nextX,
	currentY,
	nodeSize = 64,
}: PathConnectorProps) {
	const connectorVisual = getConnectorVisual(state, unitColor);

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
					width: connectorVisual.width,
					borderLeftWidth: connectorVisual.width,
					borderLeftColor: connectorVisual.color,
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
