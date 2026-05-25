import { Tabs } from "expo-router";
import CustomTabBar from "@/components/CustomTabBar";
import React from "react";

export default function TabsLayout() {
	return (
		<Tabs
			tabBar={(props) => <CustomTabBar {...props} />}
			screenOptions={{
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
				}}
			/>
			<Tabs.Screen
				name="learn"
				options={{
					title: "Learn",
				}}
			/>
			<Tabs.Screen
				name="teacher"
				options={{
					title: "AI Teacher",
				}}
			/>
			<Tabs.Screen
				name="chat"
				options={{
					title: "Chat",
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
				}}
			/>
		</Tabs>
	);
}
