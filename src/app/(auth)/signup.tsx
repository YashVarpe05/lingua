import React, { useState } from "react";
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
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import VerificationModal from "@/components/VerificationModal";
import { useSignUp, useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import { usePostHog } from "posthog-react-native";
import { blurActiveElement } from "@/utils/dom";
import Button3D from "@/components/Button3D";

export default function SignUp() {
	const router = useRouter();
	const posthog = usePostHog();
	const signUpSignal = useSignUp();
	const { signUp } = signUpSignal;
	const isLoaded = signUp !== null;
	const { startSSOFlow } = useSSO();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [secureText, setSecureText] = useState(true);
	const [emailFocused, setEmailFocused] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);

	const handleSignUp = async () => {
		if (!isLoaded) return;

		if (!email || !email.includes("@")) {
			setError("Please enter a valid email address.");
			return;
		}
		if (!password || password.length < 6) {
			setError("Password must be at least 6 characters.");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Start the sign-up process in Clerk using the new password API
			const result = await signUp.password({
				emailAddress: email,
				password: password,
			});

			if (result.error) {
				setError(result.error.message);
				setLoading(false);
				return;
			}

			// Send verification email code
			const sendResult = await signUp.verifications.sendEmailCode();

			if (sendResult.error) {
				setError(sendResult.error.message);
				setLoading(false);
				return;
			}

			// Open modal to enter code
			setModalVisible(true);
		} catch (err: unknown) {
			const errorInstance = err instanceof Error ? err : new Error(String(err));
			posthog.captureException(errorInstance, { flow: "signup", method: "email", step: "initiate" });
			setError(errorInstance.message || "Sign up failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleVerify = async (code: string) => {
		if (!isLoaded) return;

		try {
			// Submit verification code
			const verifyResult = await signUp.verifications.verifyEmailCode({
				code,
			});

			if (verifyResult.error) {
				throw verifyResult.error;
			}

			if (signUp.status === "complete") {
				// Mark session active, which completes authentication and logs user in
				const finalizeResult = await signUp.finalize();
				if (finalizeResult.error) {
					throw finalizeResult.error;
				}
				const userId = signUp.createdUserId;
				if (userId) {
					posthog.identify(userId, {
						$set: { email: signUp.emailAddress },
						$set_once: { sign_up_date: new Date().toISOString() },
					});
				}
				posthog.capture("sign_up_completed", {
					method: "email",
				});
			} else if (signUp.status === "missing_requirements") {
				// Inform developer about missing fields (e.g. phone number required in dashboard)
				const missing = signUp.missingFields.join(", ");
				const unverified = signUp.unverifiedFields.join(", ");
				
				throw new Error(
					`Sign up incomplete. Status: ${signUp.status}. Missing: ${missing || "none"}. Unverified: ${unverified || "none"}.\n\n` +
					`If "phone_number" is required, please disable it under "Email, Phone, and Username" in your Clerk Dashboard.`
				);
			} else {
				throw new Error("Sign up not complete. Please check status: " + signUp.status);
			}
		} catch (err: unknown) {
			const errorInstance = err instanceof Error ? err : new Error(String(err));
			posthog.captureException(errorInstance, { flow: "signup", method: "email", step: "verify" });
			throw errorInstance;
		}
	};

	const handleSocialAuth = async (strategy: "oauth_google" | "oauth_facebook" | "oauth_apple") => {
		posthog.capture("social_auth_started", { strategy, screen: "signup" });
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
				posthog.capture("sign_up_completed", { method: strategy });
			}
		} catch (err: unknown) {
			const errorInstance = err instanceof Error ? err : new Error(String(err));
			const errCode = typeof err === "object" && err !== null && "code" in err ? (err as any).code : undefined;
			if (errorInstance.message.includes("cancel") || errCode === "CANCELLED") {
				return;
			}
			posthog.captureException(errorInstance, {
				flow: "signup",
				method: strategy,
				step: "oauth",
			});
			setError(errorInstance.message || "Social authentication failed.");
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
							Create your account
						</Text>
						<Text className="font-poppins text-[15px] text-neutral-secondary mt-1">
							Start your language journey today ✨
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

						{/* Password Field */}
						<View
							style={[
								styles.inputContainer,
								passwordFocused ? styles.inputContainerFocused : null,
								styles.passwordContainer,
							]}
						>
							<View style={styles.passwordInputWrapper}>
								<Text className="font-poppins-medium text-[11px] text-neutral-secondary uppercase tracking-wider">
									Password
								</Text>
								<TextInput
									value={password}
									onChangeText={(text) => {
										setPassword(text);
										if (error) setError("");
									}}
									onFocus={() => setPasswordFocused(true)}
									onBlur={() => setPasswordFocused(false)}
									placeholder="•••••••••"
									placeholderTextColor="#9CA3AF"
									secureTextEntry={secureText}
									autoCapitalize="none"
									autoCorrect={false}
									style={styles.textInput}
									editable={!loading}
								/>
							</View>
							<TouchableOpacity
								onPress={() => setSecureText(!secureText)}
								activeOpacity={0.7}
								style={styles.eyeButton}
								disabled={loading}
							>
								<Feather
									name={secureText ? "eye" : "eye-off"}
									size={20}
									color="#6B7280"
								/>
							</TouchableOpacity>
						</View>

						{/* Main Sign Up Button */}
						<Button3D
							onPress={handleSignUp}
							variant="primary"
							size="lg"
							loading={loading}
						>
							Sign Up
						</Button3D>

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

					{/* Footer link to sign in */}
					<View className="flex-row justify-center items-center mt-auto pb-4">
						<Text className="font-poppins text-[14px] text-neutral-secondary">
							Already have an account?{" "}
						</Text>
						<TouchableOpacity
							onPress={() => {
								blurActiveElement();
								router.replace("/signin" as any);
							}}
							activeOpacity={0.7}
							disabled={loading}
						>
							<Text className="font-poppins-semibold text-[14px] text-lingua-purple">
								Log in
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
		marginBottom: 16,
	},
	inputContainerFocused: {
		borderColor: "#6C4EF5",
	},
	passwordContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 24,
	},
	passwordInputWrapper: {
		flex: 1,
	},
	textInput: {
		fontFamily: "Poppins-Regular",
		fontSize: 15,
		color: "#0D132B",
		marginTop: 2,
		padding: 0,
		height: 24,
	},
	eyeButton: {
		padding: 8,
		marginRight: -4,
	},
	signUpButton: {
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
	signUpButtonText: {
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
