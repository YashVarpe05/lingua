import React, { useEffect, useState } from "react";
import {
	View,
	Pressable,
	StyleSheet,
	LayoutChangeEvent,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { learning } from "@/theme/colors";
import * as Haptics from "expo-haptics";

const ACTIVE_TAB_COLOR = "#FFFFFF";
const INACTIVE_TAB_COLOR = "#6E7078";
const TAB_PILL_BACKGROUND = "#07070A";
const TAB_PILL_BORDER = "#1C1B24";
const ACTIVE_DOCK_COLOR = learning.actionLight;
const ACTIVE_DOCK_ICON_COLOR = "#111827";
const ACTIVE_DOCK_SHADOW = "rgba(88, 204, 2, 0.22)";
const ACTIVE_DOCK_SIZE = 52;
const TAB_HORIZONTAL_PADDING = 10;

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
	index: "home",
	learn: "book-open",
	teacher: "video",
	chat: "message-square",
	profile: "user",
};

const TAB_ICON_ASSETS = {
	profile: images.userAvatar,
} as const;

type TabIconAsset = (typeof TAB_ICON_ASSETS)[keyof typeof TAB_ICON_ASSETS];

const TAB_LABELS: Record<string, string> = {
	index: "Home",
	learn: "Learn",
	teacher: "Teacher",
	chat: "Chat",
	profile: "Profile",
};

interface TabBarItemProps {
	index: number;
	activeIndex: number;
	label: string;
	iconName: keyof typeof Feather.glyphMap;
	iconAsset?: TabIconAsset;
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
	iconAsset,
	onPress,
	onLongPress,
	accessibilityLabel,
	testID,
}: TabBarItemProps) {
	const isFocused = activeIndex === index;
	const [isPressed, setIsPressed] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const isInteracting = isPressed || isHovered;

	const animatedIconStyle = useAnimatedStyle(() => {
		return {
			opacity: withTiming(isFocused ? 0 : 1, { duration: 140 }),
			transform: [
				{ translateY: withTiming(isFocused ? 8 : isInteracting ? -1 : 0, { duration: 160 }) },
				{ scale: withTiming(isFocused ? 0.82 : isInteracting ? 1.04 : 1, { duration: 160 }) },
			],
		};
	});

	const handlePress = () => {
		Haptics.selectionAsync().catch(() => {
			// Haptics are optional on web and unsupported devices.
		});
		onPress();
	};

	return (
		<Pressable
			onPress={handlePress}
			onPressIn={() => setIsPressed(true)}
			onPressOut={() => setIsPressed(false)}
			onHoverIn={() => setIsHovered(true)}
			onHoverOut={() => setIsHovered(false)}
			onLongPress={onLongPress}
			accessibilityRole="tab"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected: isFocused }}
			hitSlop={4}
			testID={testID}
			style={styles.tabItem}
		>
			<Animated.View
				style={[
					styles.iconShell,
					isFocused ? styles.iconShellActive : null,
					animatedIconStyle,
				]}
			>
				{iconAsset ? (
					<Image
						source={iconAsset}
						style={[
							styles.tabImageIcon,
							isFocused ? styles.profileImageActive : styles.profileImageInactive,
						]}
						contentFit="contain"
					/>
				) : (
					<Feather
						name={iconName}
						size={20}
						color={isFocused ? ACTIVE_TAB_COLOR : INACTIVE_TAB_COLOR}
					/>
				)}
			</Animated.View>
			<Text
				style={[
					styles.tabLabel,
					isFocused ? styles.tabLabelActive : null,
				]}
				className="font-poppins-bold text-[10px] text-center"
				numberOfLines={1}
			>
				{label}
			</Text>
		</Pressable>
	);
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const insets = useSafeAreaInsets();
	const { routes, index: activeIndex } = state;
	const [tabWidth, setTabWidth] = useState(0);
	const bottomPadding = Math.max(insets.bottom, 10);
	const tabHeight = 64;
	const activeDockX = useSharedValue(0);
	const activeRoute = routes[activeIndex];
	const activeIconName = TAB_ICONS[activeRoute?.name] || "help-circle";
	const activeIconAsset = TAB_ICON_ASSETS[activeRoute?.name as keyof typeof TAB_ICON_ASSETS];

	useEffect(() => {
		if (tabWidth <= 0) return;

		activeDockX.value = withTiming(
			TAB_HORIZONTAL_PADDING + activeIndex * tabWidth + (tabWidth - ACTIVE_DOCK_SIZE) / 2,
			{
				duration: 220,
				easing: Easing.out(Easing.cubic),
			}
		);
	}, [activeDockX, activeIndex, tabWidth]);

	const activeDockStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: activeDockX.value }],
	}));

	const handleTabBarLayout = (event: LayoutChangeEvent) => {
		const width = event.nativeEvent.layout.width;
		const nextTabWidth = (width - TAB_HORIZONTAL_PADDING * 2) / routes.length;
		setTabWidth(nextTabWidth);
		activeDockX.value =
			TAB_HORIZONTAL_PADDING + activeIndex * nextTabWidth + (nextTabWidth - ACTIVE_DOCK_SIZE) / 2;
	};

	return (
		<View
			style={[
				styles.tabBarOuter,
				{
					height: tabHeight + bottomPadding + 14,
					paddingBottom: bottomPadding,
				},
			]}
		>
			<View style={styles.tabBarContainer} onLayout={handleTabBarLayout}>
				<View style={styles.homeIndicator} />
				{tabWidth > 0 ? (
					<Animated.View
						pointerEvents="none"
						style={[styles.activeDockContainer, activeDockStyle]}
					>
						<View style={styles.notchBridge} />
						<View style={styles.activeBubble}>
							{activeIconAsset ? (
								<Image
									source={activeIconAsset}
									style={styles.activeProfileImage}
									contentFit="cover"
								/>
							) : (
								<Feather name={activeIconName} size={22} color={ACTIVE_DOCK_ICON_COLOR} />
							)}
						</View>
					</Animated.View>
				) : null}
				{routes.map((route, i) => {
					const { options } = descriptors[route.key];
					const label = TAB_LABELS[route.name] || route.name;
					const iconName = TAB_ICONS[route.name] || "help-circle";
					const iconAsset = TAB_ICON_ASSETS[route.name as keyof typeof TAB_ICON_ASSETS];

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
							iconAsset={iconAsset}
							onPress={onPress}
							onLongPress={onLongPress}
							accessibilityLabel={options.tabBarAccessibilityLabel}
							testID={options.tabBarButtonTestID}
						/>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	tabBarOuter: {
		width: "100%",
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "flex-start",
		paddingHorizontal: 14,
		paddingTop: 7,
	},
	tabBarContainer: {
		width: "100%",
		maxWidth: 430,
		height: 64,
		flexDirection: "row",
		backgroundColor: TAB_PILL_BACKGROUND,
		borderWidth: 1,
		borderColor: TAB_PILL_BORDER,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "space-around",
		paddingHorizontal: TAB_HORIZONTAL_PADDING,
		paddingTop: 8,
		boxShadow: "0px 14px 32px rgba(10, 10, 16, 0.26)",
		overflow: "visible",
	},
	homeIndicator: {
		position: "absolute",
		top: 4,
		alignSelf: "center",
		width: 64,
		height: 4,
		borderRadius: 999,
		backgroundColor: "#E6E6EA",
		opacity: 0.92,
		zIndex: 1,
	},
	activeDockContainer: {
		position: "absolute",
		left: 0,
		top: -20,
		width: ACTIVE_DOCK_SIZE,
		height: 76,
		alignItems: "center",
		zIndex: 5,
	},
	notchBridge: {
		position: "absolute",
		top: 21,
		width: 72,
		height: 46,
		borderRadius: 36,
		backgroundColor: TAB_PILL_BACKGROUND,
	},
	activeBubble: {
		width: ACTIVE_DOCK_SIZE,
		height: ACTIVE_DOCK_SIZE,
		borderRadius: ACTIVE_DOCK_SIZE / 2,
		backgroundColor: ACTIVE_DOCK_COLOR,
		borderWidth: 5,
		borderColor: TAB_PILL_BACKGROUND,
		alignItems: "center",
		justifyContent: "center",
		boxShadow: `0px 10px 18px ${ACTIVE_DOCK_SHADOW}`,
	},
	activeProfileImage: {
		width: 34,
		height: 34,
		borderRadius: 17,
		borderWidth: 2,
		borderColor: ACTIVE_DOCK_ICON_COLOR,
	},
	tabItem: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		height: "100%",
		minWidth: 48,
		zIndex: 3,
	},
	iconShell: {
		width: 31,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 2,
	},
	iconShellActive: {
		backgroundColor: "rgba(255, 255, 255, 0.06)",
	},
	tabImageIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
	},
	profileImageActive: {
		borderColor: ACTIVE_TAB_COLOR,
		opacity: 1,
	},
	profileImageInactive: {
		borderColor: "#37383E",
		opacity: 0.72,
	},
	tabLabel: {
		color: INACTIVE_TAB_COLOR,
		lineHeight: 13,
		maxWidth: 64,
	},
	tabLabelActive: {
		color: ACTIVE_TAB_COLOR,
	},
});
