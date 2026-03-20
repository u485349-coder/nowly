import { ReactNode } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../../constants/theme";

export const GradientMesh = ({ children }: { children: ReactNode }) => (
  <View className="flex-1 bg-ink">
    <LinearGradient colors={gradients.background} className="absolute inset-0" />
    <View className="absolute -left-8 top-12 h-56 w-56 rounded-full bg-iris/20" />
    <View className="absolute right-[-40] top-24 h-64 w-64 rounded-full bg-aqua/10" />
    <View className="absolute bottom-12 left-12 h-40 w-40 rounded-full bg-violet/15" />
    <View className="flex-1">{children}</View>
  </View>
);
