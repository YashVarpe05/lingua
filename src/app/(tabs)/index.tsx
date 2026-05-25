import { Text, View, Link, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { useAuth } from "@clerk/expo";
import { languages } from "@/data/languages";
import React from "react";
import { useLanguageStore } from "@/store/useLanguageStore";

export default function Index() {
  const { signOut } = useAuth();
  const selectedLanguageId = useLanguageStore((state) => state.selectedLanguageId);
  const clearStorage = useLanguageStore((state) => state.clearStorage);

  const selectedLanguage = selectedLanguageId
    ? languages.find((lang) => lang.id === selectedLanguageId) || null
    : null;

export default function Index() {
  const blurActiveElement = () => {
    if (typeof document !== "undefined") {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement) {
        activeEl.blur();
      }
    }
  };

  const handleSignOut = async () => {
    try {
      blurActiveElement();
      await signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  const handleClearStorage = async () => {
    try {
      await clearStorage();
    } catch (err) {
      console.error("Failed to clear storage:", err);
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-6 bg-white">
      <Text className="h1 text-center text-neutral-primary mb-2">muolingo</Text>
      
      {selectedLanguage ? (
        <View className="flex-row items-center bg-neutral-surface border border-neutral-border rounded-2xl p-4 mb-8 w-full max-w-[280px]">
          <Image
            source={{ uri: selectedLanguage.flag }}
            className="w-10 h-10 rounded-full"
            contentFit="cover"
          />
          <View className="ml-3 justify-center">
            <Text className="font-poppins-semibold text-[15px] text-neutral-primary">
              Learning {selectedLanguage.name}
            </Text>
            <Text className="font-poppins text-[12px] text-neutral-secondary mt-0.5">
              {selectedLanguage.nativeName}
            </Text>
          </View>
        </View>
      ) : (
        <Text className="body-md text-center text-neutral-secondary mb-8">
          No language selected. Choose one to start!
        </Text>
      )}
      
      <View className="w-full max-w-[280px] gap-4">
        <Link
          href="/languages"
          onPress={() => {
            if (typeof document !== "undefined") {
              (document.activeElement as any)?.blur();
            }
          }}
          className="btn-primary w-full"
        >
          <Text className="btn-primary-text text-center">
            {selectedLanguage ? "Change Language" : "Choose Language"}
          </Text>
        </Link>

        <Link
          href="/onboarding"
          onPress={() => {
            if (typeof document !== "undefined") {
              (document.activeElement as any)?.blur();
            }
          }}
          className="btn-ghost w-full"
        >
          <Text className="btn-ghost-text text-center">Open Onboarding</Text>
        </Link>

        <Pressable
          onPress={handleSignOut}
          className="btn-secondary w-full"
        >
          <Text className="btn-secondary-text text-center">Sign Out</Text>
        </Pressable>

        <Pressable
          onPress={handleClearStorage}
          className="btn-ghost w-full"
        >
          <Text className="btn-ghost-text text-center">Clear Storage</Text>
        </Pressable>
      </View>
    </View>
  );
}
