import React, { useState, useRef, useEffect } from "react";
import {
	Modal,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	TextInput as RNTextInput,
	TouchableOpacity,
	Pressable,
	ActivityIndicator,
} from "react-native";
import { View, Text } from "@/tw";
import { Feather } from "@expo/vector-icons";

interface VerificationModalProps {
	visible: boolean;
	onClose: () => void;
	email: string;
	onVerify: (code: string) => Promise<void>;
}

export default function VerificationModal({
	visible,
	onClose,
	email,
	onVerify,
}: VerificationModalProps) {
	const [code, setCode] = useState("");
	const [focused, setFocused] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [verifyingError, setVerifyingError] = useState("");
	const inputRef = useRef<RNTextInput>(null);

	// Focus the input when the modal becomes visible
	useEffect(() => {
		if (visible) {
			setCode("");
			setVerifyingError("");
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 150);
			return () => clearTimeout(timer);
		} else {
			inputRef.current?.blur();
		}
	}, [visible]);

	const handleTextChange = async (text: string) => {
		if (verifying) return;
		
		// Only allow numeric digits
		const cleanText = text.replace(/[^0-9]/g, "");
		setCode(cleanText);
		setVerifyingError("");

		if (cleanText.length === 6) {
			setVerifying(true);
			inputRef.current?.blur();
			try {
				await onVerify(cleanText);
				// Slight delay for feedback, then close
				setTimeout(() => {
					onClose();
				}, 150);
			} catch (err: any) {
				const errMsg = err?.errors?.[0]?.message || err?.message || "Verification failed. Please try again.";
				setVerifyingError(errMsg);
				setCode(""); // Clear inputs on error so they can re-enter
				// Re-focus the input after short delay
				setTimeout(() => {
					inputRef.current?.focus();
				}, 150);
			} finally {
				setVerifying(false);
			}
		}
	};

	const handlePressContainer = () => {
		if (!verifying) {
			inputRef.current?.focus();
		}
	};

	// We will display 6 boxes
	const codeLengthArray = Array(6).fill(0);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={verifying ? undefined : onClose}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.keyboardAvoidingView}
				>
					<Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
						{/* Close button */}
						{!verifying && (
							<TouchableOpacity
								style={styles.closeButton}
								onPress={onClose}
								activeOpacity={0.7}
							>
								<Feather name="x" size={20} color="#6B7280" />
							</TouchableOpacity>
						)}

						{/* Icon / Illustration */}
						<View className="w-16 h-16 rounded-full bg-neutral-surface items-center justify-center mb-4 mt-2">
							{verifying ? (
								<ActivityIndicator size="large" color="#6C4EF5" />
							) : (
								<Feather name="mail" size={28} color="#6C4EF5" />
							)}
						</View>

						{/* Title */}
						<Text className="font-poppins-bold text-[22px] text-neutral-primary text-center">
							{verifying ? "Verifying code" : "Verify your email"}
						</Text>

						{/* Subtitle */}
						<Text className="font-poppins text-[14px] text-neutral-secondary text-center leading-[22px] mt-2 px-2">
							We sent a 6-digit verification code to{"\n"}
							<Text className="font-poppins-semibold text-neutral-primary">
								{email || "your email"}
							</Text>
						</Text>

						{/* Error Message */}
						{verifyingError ? (
							<Text className="font-poppins-medium text-[12px] text-error text-center mt-3 px-2">
								{verifyingError}
							</Text>
						) : null}

						{/* Hidden TextInput for keyboard input */}
						<RNTextInput
							ref={inputRef}
							value={code}
							onChangeText={handleTextChange}
							keyboardType="number-pad"
							maxLength={6}
							onFocus={() => setFocused(true)}
							onBlur={() => setFocused(false)}
							style={styles.hiddenInput}
							caretHidden
							textContentType="oneTimeCode"
							autoFocus
							editable={!verifying}
						/>

						{/* OTP code fields row */}
						<TouchableOpacity
							activeOpacity={1}
							onPress={handlePressContainer}
							style={styles.otpRow}
							disabled={verifying}
						>
							{codeLengthArray.map((_, index) => {
								const digit = code[index] || "";
								const isCurrent = index === code.length;
								const isBoxFocused = focused && isCurrent && !verifying;

								return (
									<View
										key={index}
										style={[
											styles.otpBox,
											digit ? styles.otpBoxFilled : null,
											isBoxFocused ? styles.otpBoxFocused : null,
										]}
									>
										{/* Cursor blink representation */}
										{isBoxFocused ? (
											<View style={styles.cursor} />
										) : (
											<Text className="font-poppins-semibold text-[20px] text-neutral-primary text-center">
												{digit}
											</Text>
										)}
									</View>
								);
							})}
						</TouchableOpacity>

						{/* Footer / Resend */}
						{!verifying && (
							<View className="flex-row items-center justify-center mt-2">
								<Text className="font-poppins text-[13px] text-neutral-secondary">
									{"Didn't receive the code? "}
								</Text>
								<TouchableOpacity activeOpacity={0.7}>
									<Text className="font-poppins-semibold text-[13px] text-lingua-purple">
										Resend
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</Pressable>
				</KeyboardAvoidingView>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(13, 19, 43, 0.4)", // Dark blue tint with transparency
		justifyContent: "center",
		alignItems: "center",
	},
	keyboardAvoidingView: {
		width: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 24,
		width: "90%",
		maxWidth: 360,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 5,
		position: "relative",
	},
	closeButton: {
		position: "absolute",
		top: 16,
		right: 16,
		padding: 4,
	},
	hiddenInput: {
		position: "absolute",
		opacity: 0,
		width: 1,
		height: 1,
	},
	otpRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
		marginTop: 24,
		marginBottom: 24,
		paddingHorizontal: 4,
	},
	otpBox: {
		width: 44,
		height: 52,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: "#E5E7EB",
		backgroundColor: "#F6F7FB",
		justifyContent: "center",
		alignItems: "center",
	},
	otpBoxFilled: {
		borderColor: "#E5E7EB",
		backgroundColor: "#F6F7FB",
	},
	otpBoxFocused: {
		borderColor: "#6C4EF5",
		backgroundColor: "#FFFFFF",
		shadowColor: "#6C4EF5",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 2,
	},
	cursor: {
		width: 2,
		height: 20,
		backgroundColor: "#6C4EF5",
	},
});
