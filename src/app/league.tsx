import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	StyleSheet,
	ActivityIndicator,
	Share,
	ScrollView,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View, TouchableOpacity } from "@/tw";
import { Image } from "@/tw/image";
import { useAuth, useUser } from "@clerk/expo";
import { authFetch } from "@/lib/apiClient";
import { blurActiveElement } from "@/utils/dom";

interface LeaderboardRow {
	rank: number;
	clerkUserId: string;
	displayName: string;
	avatarUrl: string | null;
	xp: number;
}

type LeaderboardFetchResponse = {
	rows?: LeaderboardRow[];
	userRow?: LeaderboardRow | null;
	error?: string;
};

export default function LeagueScreen() {
	const router = useRouter();
	const { getToken } = useAuth();
	const { user } = useUser();
	const getTokenRef = useRef(getToken);
	const leaderboardRequestIdRef = useRef(0);
	const [activeTab, setActiveTab] = useState<"weekly" | "alltime" | "friends">("weekly");
	const [loading, setLoading] = useState<boolean>(true);
	const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
	const [currentUserRow, setCurrentUserRow] = useState<LeaderboardRow | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		getTokenRef.current = getToken;
	}, [getToken]);

	const fetchLeaderboard = useCallback(async () => {
		const requestId = leaderboardRequestIdRef.current + 1;
		leaderboardRequestIdRef.current = requestId;
		const isLatestRequest = () => requestId === leaderboardRequestIdRef.current;

		setLoading(true);
		setErrorMessage(null);
		try {
			if (activeTab === "friends") {
				setLeaderboardRows([]);
				setCurrentUserRow(null);
				return;
			}

			const res = await authFetch(getTokenRef.current, `/api/leaderboard/fetch?type=${activeTab}`);
			const data = (await res.json()) as LeaderboardFetchResponse;

			if (!res.ok || data.error) {
				throw new Error(data.error || "Leaderboard request failed");
			}

			if (!isLatestRequest()) return;
			
			if (data.rows) {
				setLeaderboardRows(data.rows);
			}
			if (data.userRow) {
				setCurrentUserRow(data.userRow);
			} else {
				setCurrentUserRow(null);
			}
		} catch (err) {
			if (!isLatestRequest()) return;

			setLeaderboardRows([]);
			setCurrentUserRow(null);
			setErrorMessage(
				err instanceof Error
					? err.message
					: "Leaderboard is unavailable right now."
			);
		} finally {
			if (isLatestRequest()) {
				setLoading(false);
			}
		}
	}, [activeTab]);

	useEffect(() => {
		fetchLeaderboard();
	}, [fetchLeaderboard]);

	const handleInviteFriends = async () => {
		try {
			await Share.share({
				message: "Join me on Muolingo and learn a new language! 🌍",
			});
		} catch (error) {
			console.error("Failed to share invite message:", error);
		}
	};

	const formatXP = (xp: number) => {
		return xp.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " XP";
	};

	const renderRankIcon = (rank: number) => {
		if (rank === 1) return <Text className="text-[20px]">🥇</Text>;
		if (rank === 2) return <Text className="text-[20px]">🥈</Text>;
		if (rank === 3) return <Text className="text-[20px]">🥉</Text>;
		return (
			<Text className="font-poppins-bold text-[14px] text-neutral-secondary text-center w-6">
				{rank}
			</Text>
		);
	};

	const renderRow = (row: LeaderboardRow, index: number, isPinned = false) => {
		const isMe = row.clerkUserId === user?.id;
		const initial = row.displayName ? row.displayName[0].toUpperCase() : "A";

		return (
			<View
				key={row.clerkUserId + (isPinned ? "-pinned" : "")}
				className={`flex-row items-center px-4 py-3.5 border-b border-neutral-border ${
					isMe
						? "bg-[#F0EDFF] border-l-[4px] border-l-lingua-purple"
						: "bg-white"
				}`}
				style={isPinned ? { borderBottomWidth: 0 } : null}
			>
				{/* Rank */}
				<View className="w-10 items-center justify-center">
					{renderRankIcon(row.rank)}
				</View>

				{/* Avatar */}
				<View className="ml-2 mr-3">
					{row.avatarUrl ? (
						<Image
							source={{ uri: row.avatarUrl }}
							style={{ width: 36, height: 36, borderRadius: 18 }}
							contentFit="cover"
						/>
					) : (
						<View className="w-9 h-9 rounded-full bg-lingua-purple items-center justify-center">
							<Text className="font-poppins-bold text-[13px] text-white">
								{initial}
							</Text>
						</View>
					)}
				</View>

				{/* Name */}
				<View className="flex-1">
					<Text
						className={`font-poppins-semibold text-[14px] text-neutral-primary ${
							isMe ? "font-poppins-bold text-lingua-purple" : ""
						}`}
						numberOfLines={1}
					>
						{row.displayName} {isMe ? "(You)" : ""}
					</Text>
				</View>

				{/* XP */}
				<View className="items-end">
					<Text className="font-poppins-bold text-[14px] text-neutral-primary">
						{formatXP(row.xp)}
					</Text>
				</View>
			</View>
		);
	};

	const isUserInTop50 = leaderboardRows.some((row) => row.clerkUserId === user?.id);

	return (
		<SafeAreaView style={styles.safeArea}>
			{/* Custom Header */}
			<View className="flex-row items-center justify-between px-4 pt-3 pb-3 bg-white border-b border-neutral-border">
				<TouchableOpacity
					onPress={() => {
						blurActiveElement();
						if (router.canGoBack()) {
							router.back();
						} else {
							router.replace("/(tabs)");
						}
					}}
					activeOpacity={0.7}
					className="p-1 mr-3"
				>
					<Feather name="chevron-left" size={26} color="#0D132B" />
				</TouchableOpacity>

				<Text className="font-poppins-bold text-[18px] text-neutral-primary leading-[24px] flex-1 text-center mr-8">
					League
				</Text>
			</View>

			{/* Three tabs for standings */}
			<View className="px-4 pt-4 bg-[#F6F7FB]">
				<View className="flex-row bg-[#EAE8F5] rounded-3xl p-1.5 mb-4">
					<TouchableOpacity
						onPress={() => setActiveTab("weekly")}
						activeOpacity={0.8}
						className="flex-1 h-[40px] items-center justify-center rounded-2xl"
						style={activeTab === "weekly" ? styles.tabActive : null}
					>
						<Text
							className={`font-poppins-bold text-[13px] ${
								activeTab === "weekly" ? "text-lingua-purple" : "text-[#6B7280]"
							}`}
						>
							This Week
						</Text>
					</TouchableOpacity>
					
					<TouchableOpacity
						onPress={() => setActiveTab("alltime")}
						activeOpacity={0.8}
						className="flex-1 h-[40px] items-center justify-center rounded-2xl"
						style={activeTab === "alltime" ? styles.tabActive : null}
					>
						<Text
							className={`font-poppins-bold text-[13px] ${
								activeTab === "alltime" ? "text-lingua-purple" : "text-[#6B7280]"
							}`}
						>
							All Time
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => setActiveTab("friends")}
						activeOpacity={0.8}
						className="flex-1 h-[40px] items-center justify-center rounded-2xl"
						style={activeTab === "friends" ? styles.tabActive : null}
					>
						<Text
							className={`font-poppins-bold text-[13px] ${
								activeTab === "friends" ? "text-lingua-purple" : "text-[#6B7280]"
							}`}
						>
							Friends
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Render tab content */}
			{activeTab === "friends" ? (
				<View className="flex-1 items-center justify-center p-6 bg-[#F6F7FB]">
					<View className="items-center max-w-[280px]">
						<Text className="text-[48px] mb-4">👥</Text>
						<Text className="font-poppins-bold text-[17px] text-neutral-primary text-center">
							Friends leaderboard coming soon
						</Text>
						<Text className="font-poppins text-[13px] text-neutral-secondary text-center mt-2 leading-[18px] mb-6">
							Challenge your friends and learn languages together!
						</Text>
						<TouchableOpacity
							onPress={handleInviteFriends}
							className="bg-lingua-purple px-6 py-2.5 rounded-full"
							activeOpacity={0.8}
						>
							<Text className="font-poppins-bold text-white text-[13px]">
								Invite Friends
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<View className="flex-1 bg-[#F6F7FB]">
					{loading ? (
						<View className="flex-1 justify-center items-center">
							<ActivityIndicator size="large" color="#6C4EF5" />
						</View>
					) : errorMessage ? (
						<View className="flex-1 justify-center items-center p-6">
							<Feather name="wifi-off" size={40} color="#FF8A00" />
							<Text className="font-poppins-bold text-[16px] text-neutral-primary mt-3">
								Leaderboard could not load
							</Text>
							<Text className="font-poppins text-[13px] text-neutral-secondary mt-1 text-center leading-[18px] max-w-[260px]">
								{errorMessage}
							</Text>
							<TouchableOpacity
								onPress={fetchLeaderboard}
								className="bg-lingua-purple px-5 py-2.5 rounded-full mt-5"
								activeOpacity={0.8}
							>
								<Text className="font-poppins-bold text-white text-[13px]">
									Try Again
								</Text>
							</TouchableOpacity>
						</View>
					) : leaderboardRows.length === 0 ? (
						<View className="flex-1 justify-center items-center p-6">
							<Text className="text-[40px] mb-2">⭐</Text>
							<Text className="font-poppins-bold text-[16px] text-neutral-primary">
								Leaderboard is empty
							</Text>
							<Text className="font-poppins text-[13px] text-neutral-secondary mt-1 text-center leading-[18px] max-w-[240px]">
								Complete your first daily challenge lesson to appear here!
							</Text>
						</View>
					) : (
						<View className="flex-1">
							<ScrollView
								className="flex-1"
								contentContainerStyle={{ flexGrow: 1 }}
								showsVerticalScrollIndicator={false}
							>
								<View className="border-t border-neutral-border">
									{leaderboardRows.map((row, index) => renderRow(row, index))}
								</View>
							</ScrollView>

							{/* Pin current user at the bottom if outside top 50 */}
							{currentUserRow && !isUserInTop50 && (
								<View className="border-t-[2px] border-neutral-border bg-neutral-surface shadow-lg">
									{renderRow(currentUserRow, -1, true)}
								</View>
							)}
						</View>
					)}
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	tabActive: {
		backgroundColor: "#FFFFFF",
		...Platform.select({
			ios: {
				shadowColor: "#0D132B",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.08,
				shadowRadius: 3,
			},
			android: {
				elevation: 2,
			},
			default: {
				boxShadow: "0px 2px 4px rgba(13, 19, 43, 0.08)",
			},
		}),
	},
});
