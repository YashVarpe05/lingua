import React from "react";
import { Text, View } from "@/tw";

export default function ProfileScreen() {
	return (
		<View className="flex-1 items-center justify-center p-6 bg-white">
			<Text className="h1 text-center text-neutral-primary mb-2">Profile</Text>
			<Text className="body-md text-center text-neutral-secondary">
				View your progress, statistics, and settings.
			</Text>
		</View>
	);
}
