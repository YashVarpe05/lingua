import React from "react";
import { Text, View } from "@/tw";

export default function TeacherScreen() {
	return (
		<View className="flex-1 items-center justify-center p-6 bg-white">
			<Text className="h1 text-center text-neutral-primary mb-2">AI Teacher</Text>
			<Text className="body-md text-center text-neutral-secondary">
				Talk to your AI teacher in real-time.
			</Text>
		</View>
	);
}
