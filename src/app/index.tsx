import { Text, View, Link } from "@/tw";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center p-6 bg-white">
      <Text className="h1 text-center text-neutral-primary mb-2">muolingo</Text>
      <Text className="body-md text-center text-neutral-secondary mb-8">
        Welcome to your AI language teacher app.
      </Text>
      <Link href="/onboarding" className="btn-primary w-full max-w-[280px]">
        <Text className="btn-primary-text text-center">Open Onboarding</Text>
      </Link>
    </View>
  );
}
