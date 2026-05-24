import { Text, View, Link, Pressable } from "@/tw";
import { useAuth } from "@clerk/expo";

export default function Index() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      if (typeof document !== "undefined") {
        (document.activeElement as any)?.blur();
      }
      await signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-6 bg-white">
      <Text className="h1 text-center text-neutral-primary mb-2">muolingo</Text>
      <Text className="body-md text-center text-neutral-secondary mb-8">
        Welcome to your AI language teacher app.
      </Text>
      
      <View className="w-full max-w-[280px] gap-4">
        <Link
          href="/onboarding"
          onPress={() => {
            if (typeof document !== "undefined") {
              (document.activeElement as any)?.blur();
            }
          }}
          className="btn-primary w-full"
        >
          <Text className="btn-primary-text text-center">Open Onboarding</Text>
        </Link>

        <Pressable
          onPress={handleSignOut}
          className="btn-secondary w-full"
        >
          <Text className="btn-secondary-text text-center">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
