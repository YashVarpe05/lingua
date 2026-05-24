import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	TextInput,
	Platform,
	KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, View, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import * as SecureStore from "expo-secure-store";

const getLearnerCount = (langId: string): string => {
	const counts: Record<string, string> = {
		es: "28.4M",
		fr: "19.4M",
		ja: "12.7M",
		ko: "9.3M",
		de: "8.1M",
		zh: "7.4M",
		en: "45.2M",
		ar: "11.2M",
		it: "6.8M",
		pt: "5.4M",
		ru: "4.8M",
	};
	return `${counts[langId] || "1.2M"} learners`;
};

export default function LanguageSelection() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
	const [expanded, setExpanded] = useState(false);

	// Load existing selection on mount
	useEffect(() => {
		const loadSelection = async () => {
			try {
				const saved = await SecureStore.getItemAsync("selected_language_id");
				if (saved) {
					setSelectedLanguageId(saved);
				}
			} catch (err) {
				console.error("Failed to load language selection:", err);
			}
		};
		loadSelection();
	}, []);

	// Handle confirmation of selection
	const handleConfirm = async () => {
		if (!selectedLanguageId) return;
		try {
			if (typeof document !== "undefined") {
				(document.activeElement as any)?.blur();
			}
			await SecureStore.setItemAsync("selected_language_id", selectedLanguageId);
			router.replace("/");
		} catch (err) {
			console.error("Failed to save language selection:", err);
		}
	};

	// Filter languages based on search query
	const filteredLanguages = languages.filter(
		(lang) =>
			lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Popular language IDs (displayed by default)
	const popularIds = ["es", "fr", "ja", "ko", "de", "zh"];

	// If there is no search query and we are not expanded, show only popular languages
	const displayLanguages = searchQuery === "" && !expanded
		? filteredLanguages.filter((lang) => popularIds.includes(lang.id))
		: filteredLanguages;

	return (
		<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoid}
			>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={{ flex: 1, justifyContent: "space-between" }}>
						{/* Top Section */}
						<View>
							{/* Header Section */}
							<View className="flex-row items-center justify-between w-full mb-6">
								<TouchableOpacity
									onPress={() => {
										if (typeof document !== "undefined") {
											(document.activeElement as any)?.blur();
										}
										router.replace("/");
									}}
									style={styles.backButton}
									activeOpacity={0.7}
								>
									<Feather name="arrow-left" size={24} color="#0D132B" />
								</TouchableOpacity>
								
								<Text className="font-poppins-bold text-[20px] text-neutral-primary flex-1 text-center mr-8">
									Choose a language
								</Text>
							</View>

							{/* Search Input */}
							<View className="flex-row items-center border border-neutral-border bg-neutral-surface rounded-full px-4 py-2.5 mb-6">
								<Feather name="search" size={20} color="#9CA3AF" />
								<TextInput
									value={searchQuery}
									onChangeText={setSearchQuery}
									placeholder="Search languages"
									placeholderTextColor="#9CA3AF"
									style={styles.textInput}
									autoCapitalize="none"
									autoCorrect={false}
								/>
							</View>

							{/* Popular Section Title */}
							<Text className="font-poppins-bold text-[18px] text-neutral-primary mb-4">
								Popular
							</Text>

							{/* Languages List */}
							<View className="w-full flex-1">
								{displayLanguages.length === 0 ? (
									<Text className="font-poppins text-[15px] text-neutral-secondary text-center my-8">
										No languages found for &quot;{searchQuery}&quot;
									</Text>
								) : (
									displayLanguages.map((item) => {
										const isSelected = selectedLanguageId === item.id;
										return (
											<TouchableOpacity
												key={item.id}
												onPress={() => setSelectedLanguageId(item.id)}
												activeOpacity={0.8}
												style={[
													styles.card,
													isSelected ? styles.cardSelected : styles.cardUnselected,
												]}
											>
												<Image
													source={{ uri: item.flag }}
													className="w-[42px] h-[42px] rounded-full"
													contentFit="cover"
												/>
												
												<View className="flex-1 ml-4 justify-center">
													<Text className="font-poppins-semibold text-[16px] text-neutral-primary leading-[20px]">
														{item.name}
													</Text>
													<Text className="font-poppins text-[13px] text-neutral-secondary mt-0.5">
														{getLearnerCount(item.id)}
													</Text>
												</View>

												{isSelected ? (
													<View className="w-[24px] h-[24px] rounded-full bg-lingua-purple items-center justify-center">
														<Feather name="check" size={14} color="#FFFFFF" />
													</View>
												) : (
													<Feather name="chevron-right" size={20} color="#9CA3AF" />
												)}
											</TouchableOpacity>
										);
									})
								)}
							</View>

							{/* "See all languages" Button (only when not searching) */}
							{searchQuery === "" && (
								<TouchableOpacity
									onPress={() => setExpanded(!expanded)}
									activeOpacity={0.7}
									style={styles.seeAllCard}
								>
									<Feather name="globe" size={20} color="#4B5563" />
									<Text className="font-poppins-semibold text-[15px] text-neutral-primary ml-4 flex-1">
										{expanded ? "Show popular only" : "See all languages"}
									</Text>
									<Feather name={expanded ? "chevron-up" : "chevron-right"} size={20} color="#9CA3AF" />
								</TouchableOpacity>
							)}
						</View>

						{/* Bottom Section */}
						<View>
							{/* Confirm Selection Button */}
							<Pressable
								onPress={handleConfirm}
								className={`w-full mt-6 py-4 rounded-2xl items-center justify-center ${
									selectedLanguageId ? "bg-lingua-purple" : "bg-neutral-border"
								}`}
								disabled={!selectedLanguageId}
							>
								<Text className="font-poppins-semibold text-[16px] text-white">
									Confirm Selection
								</Text>
							</Pressable>

							{/* Earth Illustration at the very bottom */}
							<View style={styles.earthContainer} pointerEvents="none">
								<Image
									source={images.earth}
									style={styles.earthImage}
									contentFit="cover"
								/>
							</View>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	keyboardAvoid: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 24, // standard bottom padding
	},
	backButton: {
		padding: 4,
		marginLeft: -4,
	},
	textInput: {
		flex: 1,
		marginLeft: 8,
		fontFamily: "Poppins-Regular",
		fontSize: 15,
		color: "#0D132B",
		padding: 0,
		height: 24,
		// Remove outline on Web
		...Platform.select({
			web: {
				outlineStyle: "none",
			} as any,
		}),
	},
	card: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 14,
		marginBottom: 12,
		borderWidth: 2,
	},
	cardUnselected: {
		borderColor: "#E5E7EB",
		backgroundColor: "#FFFFFF",
	},
	cardSelected: {
		borderColor: "#6C4EF5",
		backgroundColor: "#FBFBFF",
	},
	seeAllCard: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 14,
		marginBottom: 12,
		borderWidth: 1.5,
		borderColor: "#E5E7EB",
		backgroundColor: "#FFFFFF",
	},
	earthContainer: {
		marginLeft: -24,
		marginRight: -24,
		marginBottom: -24, // Pull to absolute bottom of padded container
		marginTop: 24,
		overflow: "hidden",
	},
	earthImage: {
		width: "100%",
		height: undefined,
		aspectRatio: 2.1,
	},
});
