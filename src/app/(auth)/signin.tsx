import React, { useState } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	TextInput,
	Platform,
	KeyboardAvoidingView,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import VerificationModal from "@/components/VerificationModal";
import { useSignIn, useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import { usePostHog } from "posthog-react-native";
import { blurActiveElement } from "@/utils/dom";

export default function SignIn() {
	const router = useRouter();
	const posthog = usePostHog();
	const signInSignal = useSignIn();
	const { signIn } = signInSignal;
	const isLoaded = signIn !== null;
	const { startSSOFlow } = useSSO();

	const [email, setEmail] = useState("");
	const [emailFocused, setEmailFocused] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);

	const handleSignIn = async () => {
		if (!isLoaded) return;

		if (!email || !email.includes("@")) {
			setError("Please enter a valid email address.");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Start the sign-in flow in Clerk
			const result = await signIn.create({
				identifier: email,
			});

			if (result.error) {
				setError(result.error.message);
				setLoading(false);
				return;
			}

			// Find email_code strategy in supported first factors
			const emailCodeFactor = signIn.supportedFirstFactors.find(
				(factor) => factor.strategy === "email_code"
			) as any;

			if (!emailCodeFactor) {
				throw new Error("Passwordless email sign-in is not supported on this account. Please use standard authentication.");
			}

			// Send verification email code
			const sendResult = await signIn.emailCode.sendCode({
				emailAddressId: emailCodeFactor.emailAddressId,
			});

			if (sendResult.error) {
				setError(sendResult.error.message);
				setLoading(false);
				return;
			}

			// Open modal to enter code
			setModalVisible(true);
		} catch (err: any) {
			posthog.captureException(err, { flow: "signin", method: "email", step: "initiate" });
			const errMsg = err?.message || "Sign in failed. Please try again.";
			setError(errMsg);
		} finally {
			setLoading(false);
		}
	};

	const handleVerify = async (code: string) => {
		if (!isLoaded) return;

		try {
			// Attempt sign-in with the OTP using the new emailCode verification API
			const verifyResult = await signIn.emailCode.verifyCode({
				code,
			});

			if (verifyResult.error) {
				throw verifyResult.error;
			}

			if (signIn.status === "complete") {
				// Mark session active, which completes authentication and logs user in
				const finalizeResult = await signIn.finalize();
				if (finalizeResult.error) {
					throw finalizeResult.error;
				}
				const userId = signIn.createdSessionId;
				if (userId) {
					posthog.identify(userId, {
						$set: { email },
					});
				}
				posthog.capture("sign_in_completed", { method: "email" });
			} else {
				throw new Error("Sign in not complete. Please check status: " + signIn.status);
			}
		} catch (err: any) {
			posthog.captureException(err, { flow: "signin", method: "email", step: "verify" });
			throw err;
		}
	};

	const handleSocialAuth = async (strategy: "oauth_google" | "oauth_facebook" | "oauth_apple") => {
		posthog.capture("social_auth_started", { strategy, screen: "signin" });
		setLoading(true);
		setError("");
		try {
			const redirectUrl = Linking.createURL("/sso-callback");
			const { createdSessionId, setActive } = await startSSOFlow({
				strategy,
				redirectUrl,
			});
			if (createdSessionId && setActive) {
				await setActive({ session: createdSessionId });
				posthog.capture("sign_in_completed", { method: strategy });
			}
		} catch (err: any) {
			if (err?.message?.includes("cancel") || err?.code === "CANCELLED") {
				return;
			}
			posthog.captureException(err, {
				flow: "signin",
				method: strategy,
				step: "oauth",
			});
			setError(err?.message || "Social authentication failed.");
		} finally {
			setLoading(false);
		}
	};

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
					{/* Header section with back button */}
					<View className="w-full">
						<TouchableOpacity
							onPress={() => {
								blurActiveElement();
								router.replace("/onboarding" as any);
							}}
							style={styles.backButton}
							activeOpacity={0.7}
							disabled={loading}
						>
							<Feather name="arrow-left" size={24} color="#0D132B" />
						</TouchableOpacity>

						<Text className="font-poppins-bold text-[32px] text-neutral-primary mt-4">
							Welcome back
						</Text>
						<Text className="font-poppins text-[15px] text-neutral-secondary mt-1">
							Continue your language journey today ✨
						</Text>
					</View>

					{/* Mascot Waving */}
					<View className="items-center justify-center my-4">
						<Image
							source={images.mascotAuth}
							className="w-[180px] h-[130px]"
							contentFit="contain"
						/>
					</View>

					{/* Inputs Form */}
					<View className="w-full">
						{error ? (
							<Text className="font-poppins-medium text-[13px] text-error mb-3 text-center">
								{error}
							</Text>
						) : null}

						{/* Email Field */}
						<View
							style={[
								styles.inputContainer,
								emailFocused ? styles.inputContainerFocused : null,
								styles.emailContainerMargin,
							]}
						>
							<Text className="font-poppins-medium text-[11px] text-neutral-secondary uppercase tracking-wider">
								Email
							</Text>
							<TextInput
								value={email}
								onChangeText={(text) => {
									setEmail(text);
									if (error) setError("");
								}}
								onFocus={() => setEmailFocused(true)}
								onBlur={() => setEmailFocused(false)}
								placeholder="alex@gmail.com"
								placeholderTextColor="#9CA3AF"
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								style={styles.textInput}
								editable={!loading}
							/>
						</View>

						<TouchableOpacity
							style={styles.signInButton}
							activeOpacity={0.85}
							onPress={handleSignIn}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator size="small" color="#FFFFFF" />
							) : (
								<Text style={styles.signInButtonText}>Sign In</Text>
							)}
						</TouchableOpacity>

						{/* CAPTCHA widget container for Clerk on Web (custom flows) */}
						{Platform.OS === "web" && (
							<View nativeID="clerk-captcha" className="mt-4" />
						)}
					</View>

					{/* Divider */}
					<View className="flex-row items-center my-5 w-full">
						<View className="flex-1 h-[1px] bg-neutral-border" />
						<Text className="font-poppins text-[13px] text-neutral-secondary mx-4">
							or continue with
						</Text>
						<View className="flex-1 h-[1px] bg-neutral-border" />
					</View>

					{/* Social Buttons */}
					<View className="w-full mb-6">
						{/* Google */}
						<TouchableOpacity
							style={styles.socialButton}
							activeOpacity={0.75}
							disabled={loading}
							onPress={() => handleSocialAuth("oauth_google")}
						>
							<View style={styles.socialIconContainer}>
								<FontAwesome name="google" size={20} color="#EA4335" />
							</View>
							<Text style={styles.socialButtonText}>Continue with Google</Text>
						</TouchableOpacity>

						{/* Facebook */}
						<TouchableOpacity
							style={styles.socialButton}
							activeOpacity={0.75}
							disabled={loading}
							onPress={() => handleSocialAuth("oauth_facebook")}
						>
							<View style={styles.socialIconContainer}>
								<FontAwesome name="facebook" size={20} color="#1877F2" />
							</View>
							<Text style={styles.socialButtonText}>Continue with Facebook</Text>
						</TouchableOpacity>

						{/* Apple */}
						<TouchableOpacity
							style={styles.socialButton}
							activeOpacity={0.75}
							disabled={loading}
							onPress={() => handleSocialAuth("oauth_apple")}
						>
							<View style={styles.socialIconContainer}>
								<FontAwesome name="apple" size={22} color="#000000" />
							</View>
							<Text style={styles.socialButtonText}>Continue with Apple</Text>
						</TouchableOpacity>
					</View>

					{/* Footer link to sign up */}
					<View className="flex-row justify-center items-center mt-auto pb-4">
						<Text className="font-poppins text-[14px] text-neutral-secondary">
							{"Don't have an account? "}
						</Text>
						<TouchableOpacity
							onPress={() => {
								blurActiveElement();
								router.replace("/signup" as any);
							}}
							activeOpacity={0.7}
							disabled={loading}
						>
							<Text className="font-poppins-semibold text-[14px] text-lingua-purple">
								Sign up
							</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			{/* OTP Verification Modal */}
			<VerificationModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				email={email}
				onVerify={handleVerify}
			/>
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
		paddingBottom: 24,
	},
	backButton: {
		alignSelf: "flex-start",
		padding: 4,
		marginLeft: -4,
	},
	inputContainer: {
		borderWidth: 1.5,
		borderColor: "#E5E7EB",
		borderRadius: 16,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 8,
	},
	inputContainerFocused: {
		borderColor: "#6C4EF5",
	},
	emailContainerMargin: {
		marginBottom: 24,
	},
	textInput: {
		fontFamily: "Poppins-Regular",
		fontSize: 15,
		color: "#0D132B",
		marginTop: 2,
		padding: 0,
		height: 24,
	},
	signInButton: {
		backgroundColor: "#6C4EF5",
		borderRadius: 16,
		height: 56,
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		shadowColor: "#6C4EF5",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 3,
	},
	signInButtonText: {
		color: "#FFFFFF",
		fontFamily: "Poppins-SemiBold",
		fontSize: 16,
	},
	socialButton: {
		borderWidth: 1.5,
		borderColor: "#E5E7EB",
		borderRadius: 16,
		height: 54,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FFFFFF",
		marginBottom: 12,
		position: "relative",
	},
	socialIconContainer: {
		position: "absolute",
		left: 20,
	},
	socialButtonText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 14,
		color: "#0D132B",
	},
});
