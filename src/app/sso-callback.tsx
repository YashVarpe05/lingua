import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Text } from "@/tw";

export default function SSOCallback() {
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
			<ActivityIndicator size="large" color="#6C4EF5" />
			<Text className="font-poppins-medium text-[15px] text-neutral-secondary mt-4">
				Completing sign in...
			</Text>
		</View>
	);
}
