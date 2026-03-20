import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../../constants/theme";

export const GradientMesh = ({ children }: { children: ReactNode }) => (
  <View className="flex-1 bg-ink">
    <View className="absolute inset-0 overflow-hidden">
      <LinearGradient colors={gradients.background} className="absolute inset-0" />
      <View className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-iris/14" />
      <View className="absolute right-[-96] top-28 h-[28rem] w-[28rem] rounded-full bg-aqua/8" />
      <View className="absolute -bottom-14 left-[-32] h-72 w-72 rounded-full bg-violet/8" />
      <BlurView intensity={52} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={["rgba(3, 7, 18, 0.12)", "rgba(3, 7, 18, 0.44)"]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
    <View className="flex-1">{children}</View>
  </View>
);
