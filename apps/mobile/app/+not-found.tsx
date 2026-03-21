import { Text, View } from "react-native";
import { router } from "expo-router";
import { GradientMesh } from "../components/ui/GradientMesh";
import { PillButton } from "../components/ui/PillButton";

export default function NotFoundScreen() {
  return (
    <GradientMesh>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-display text-4xl text-cloud">Lost the vibe</Text>
        <Text className="mt-3 text-center font-body text-base text-white/60">
          That screen is gone, expired, or was never live in the first place.
        </Text>
        <View className="mt-6">
          <PillButton label="Back home" onPress={() => router.replace("/home")} />
        </View>
      </View>
    </GradientMesh>
  );
}
