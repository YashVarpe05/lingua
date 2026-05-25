import React from "react";
import { Text, View } from "@/tw";

export default function LearnScreen() {
	return (
		<View className="flex-1 items-center justify-center p-6 bg-white">
			<Text className="h1 text-center text-neutral-primary mb-2">Learn</Text>
			<Text className="body-md text-center text-neutral-secondary">
				Curriculum activities and lessons will appear here.
			</Text>
		</View>
	);
}
