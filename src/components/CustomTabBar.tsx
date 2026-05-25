import React, { useEffect, useState } from "react";
import {
	View,
	TouchableOpacity,
	StyleSheet,
	Platform,
	LayoutChangeEvent,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/tw";

// Icon mapping for each tab route
const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
	index: "home",
	learn: "book-open",
	teacher: "users",
	chat: "message-circle",
	profile: "user",
};

// User-facing labels for tabs
const TAB_LABELS: Record<string, string> = {
	index: "Home",
	learn: "Learn",
	teacher: "AI Teacher",
	chat: "Chat",
	profile: "Profile",
};

interface ActiveCircleIconProps {
	idx: number;
	activeIndex: number;
	iconName: keyof typeof Feather.glyphMap;
}

function ActiveCircleIcon({ idx, activeIndex, iconName }: ActiveCircleIconProps) {
	const iconAnimatedStyle = useAnimatedStyle(() => {
		return {
			opacity: withTiming(activeIndex === idx ? 1 : 0, { duration: 150 }),
		};
	});

	return (
		<Animated.View
			style={[StyleSheet.absoluteFill, styles.circleIconContainer, iconAnimatedStyle]}
			pointerEvents="none"
		>
			<Feather name={iconName} size={22} color="#FFFFFF" />
		</Animated.View>
	);
}

interface TabBarItemProps {
	index: number;
	activeIndex: number;
	label: string;
	iconName: keyof typeof Feather.glyphMap;
	onPress: () => void;
	onLongPress: () => void;
	accessibilityLabel?: string;
	testID?: string;
}

function TabBarItem({
	index,
	activeIndex,
	label,
	iconName,
	onPress,
	onLongPress,
	accessibilityLabel,
	testID,
}: TabBarItemProps) {
	const isFocused = activeIndex === index;

	const animatedTabStyle = useAnimatedStyle(() => {
		return {
			opacity: withTiming(isFocused ? 0 : 1, { duration: 150 }),
		};
	});

	return (
		<TouchableOpacity
			onPress={onPress}
			onLongPress={onLongPress}
			accessibilityLabel={accessibilityLabel}
			testID={testID}
			activeOpacity={0.7}
			style={styles.tabItem}
		>
			<Animated.View style={[styles.tabContent, animatedTabStyle]}>
				<Feather name={iconName} size={22} color="#6B7280" />
				<Text className="font-poppins-medium text-[11px] text-neutral-secondary mt-1 text-center">
					{label}
				</Text>
			</Animated.View>
		</TouchableOpacity>
	);
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const insets = useSafeAreaInsets();
	const { routes, index: activeIndex } = state;

	const [tabWidth, setTabWidth] = useState(0);
	const circleSize = 52;
	const tabHeight = 64;

	const translateX = useSharedValue(0);

	// Animate the active circle to the selected tab position using linear smooth timing
	useEffect(() => {
		if (tabWidth > 0) {
			translateX.value = withTiming(activeIndex * tabWidth + (tabWidth - circleSize) / 2, {
				duration: 200,
				easing: Easing.linear,
			});
		}
	}, [activeIndex, tabWidth, translateX]);

	// Calculate and set single tab width on container layout
	const handleLayout = (e: LayoutChangeEvent) => {
		const { width } = e.nativeEvent.layout;
		const singleTabWidth = width / routes.length;
		setTabWidth(singleTabWidth);
		translateX.value = activeIndex * singleTabWidth + (singleTabWidth - circleSize) / 2;
	};

	const animatedCircleStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: translateX.value }],
		};
	});

	return (
		<View
			onLayout={handleLayout}
			style={[
				styles.tabBarContainer,
				{
					paddingBottom: insets.bottom,
					height: tabHeight + insets.bottom,
				},
			]}
		>
			{/* Sliding Active Circle Background */}
			{tabWidth > 0 && (
				<Animated.View
					style={[
						styles.activeCircle,
						{
							width: circleSize,
							height: circleSize,
							top: (tabHeight - circleSize) / 2,
						},
						animatedCircleStyle,
					]}
				>
					{/* Cross-fading active icons inside the moving circle */}
					{routes.map((route, idx) => {
						const iconName = TAB_ICONS[route.name] || "help-circle";
						return (
							<ActiveCircleIcon
								key={`active-icon-${route.key}`}
								idx={idx}
								activeIndex={activeIndex}
								iconName={iconName}
							/>
						);
					})}
				</Animated.View>
			)}

			{/* Render tabs list */}
			{routes.map((route, i) => {
				const { options } = descriptors[route.key];
				const label = TAB_LABELS[route.name] || route.name;
				const iconName = TAB_ICONS[route.name] || "help-circle";

				const onPress = () => {
					const event = navigation.emit({
						type: "tabPress",
						target: route.key,
						canPreventDefault: true,
					});

					const isFocused = activeIndex === i;
					if (!isFocused && !event.defaultPrevented) {
						navigation.navigate(route.name, route.params);
					}
				};

				const onLongPress = () => {
					navigation.emit({
						type: "tabLongPress",
						target: route.key,
					});
				};

				return (
					<TabBarItem
						key={route.key}
						index={i}
						activeIndex={activeIndex}
						label={label}
						iconName={iconName}
						onPress={onPress}
						onLongPress={onLongPress}
						accessibilityLabel={options.tabBarAccessibilityLabel}
						testID={options.tabBarButtonTestID}
					/>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	tabBarContainer: {
		flexDirection: "row",
		backgroundColor: "#FFFFFF",
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
		position: "relative",
		alignItems: "center",
		width: "100%",
	},
	tabItem: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		height: "100%",
	},
	tabContent: {
		alignItems: "center",
		justifyContent: "center",
	},
	activeCircle: {
		position: "absolute",
		backgroundColor: "#6C4EF5",
		borderRadius: 9999,
		justifyContent: "center",
		alignItems: "center",
		// Add shadow for premium feel
		...Platform.select({
			ios: {
				shadowColor: "#6C4EF5",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 6,
			},
			android: {
				elevation: 5,
			},
		}),
	},
	circleIconContainer: {
		justifyContent: "center",
		alignItems: "center",
	},
});
