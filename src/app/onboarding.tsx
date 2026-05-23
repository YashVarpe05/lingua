import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Onboarding() {
  const router = useRouter();

  const handleGetStarted = () => {
    // Navigate back or to home screen
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View className="flex-1 justify-between px-6 py-6 bg-white">
        
        {/* Brand Header */}
        <View className="flex-row items-center justify-center mt-2">
          <Image
            source={images.moscotLogo}
            className="w-9 h-9"
            contentFit="contain"
          />
          <Text className="font-poppins-bold text-[28px] text-neutral-primary ml-2.5">
            muolingo
          </Text>
        </View>

        {/* Text Heading & Subtitle */}
        <View className="items-center mt-6">
          <Text className="font-poppins-bold text-[36px] text-neutral-primary text-center leading-[44px]">
            Your AI language{"\n"}
            <Text className="text-lingua-purple">teacher.</Text>
          </Text>
          <Text className="font-poppins text-[15px] text-neutral-secondary text-center leading-[24px] mt-4">
            Real conversations, personalized{"\n"}lessons, anytime, anywhere.
          </Text>
        </View>

        {/* Mascot & Speech Bubbles Section */}
        <View className="items-center justify-center my-4 relative h-[360px] w-full">
          <View className="relative w-[340px] h-[340px] items-center justify-center">
            <Image
              source={images.mascotWelcome}
              className="w-[280px] h-[280px]"
              contentFit="contain"
            />
            
            {/* Speech Bubble: Hello! */}
            <View style={styles.helloBubble}>
              <Text className="font-poppins-semibold text-[15px] text-neutral-primary">
                Hello!
              </Text>
              <View style={styles.helloTail} />
            </View>

            {/* Speech Bubble: ¡Hola! */}
            <View style={styles.holaBubble}>
              <Text className="font-poppins-semibold text-[15px] text-lingua-purple">
                ¡Hola!
              </Text>
              <View style={styles.holaTail} />
            </View>

            {/* Speech Bubble: 你好! */}
            <View style={styles.nihaoBubble}>
              <Text className="font-poppins-semibold text-[15px] text-error">
                你好!
              </Text>
              <View style={styles.nihaoTail} />
            </View>
          </View>
        </View>

        {/* Bottom Section: Get Started Button (Without pagination dots) */}
        <View className="mb-4">
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  button: {
    backgroundColor: "#6C4EF5",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
  },
  iconContainer: {
    position: "absolute",
    right: 24,
  },
  /* Speech Bubbles with Creative Rotation Angles */
  helloBubble: {
    position: "absolute",
    left: 10,
    top: 25,
    backgroundColor: "#EBF3FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    transform: [{ rotate: "-8deg" }],
  },
  holaBubble: {
    position: "absolute",
    right: 15,
    top: 5,
    backgroundColor: "#F0EDFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    transform: [{ rotate: "8deg" }],
  },
  nihaoBubble: {
    position: "absolute",
    right: 8,
    top: 120,
    backgroundColor: "#FFF0ED",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    transform: [{ rotate: "-6deg" }],
  },
  /* Speech Bubble pointers (tails) */
  helloTail: {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "#EBF3FF",
    transform: [{ rotate: "45deg" }],
    bottom: -6,
    right: 20,
  },
  holaTail: {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "#F0EDFF",
    transform: [{ rotate: "45deg" }],
    bottom: -6,
    left: 20,
  },
  nihaoTail: {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "#FFF0ED",
    transform: [{ rotate: "45deg" }],
    left: -6,
    top: 16,
  },
});
