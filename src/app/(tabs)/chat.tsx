import React from "react";
import { Text, View } from "@/tw";

export default function ChatScreen() {
	return (
		<View className="flex-1 items-center justify-center p-6 bg-white">
			<Text className="h1 text-center text-neutral-primary mb-2">Chat</Text>
			<Text className="body-md text-center text-neutral-secondary">
				Practice conversations with your AI language tutor.
			</Text>
		</View>
	);
}
