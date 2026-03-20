import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

export const GlassCard = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <View className={`overflow-hidden rounded-[28px] border border-white/12 bg-white/8 ${className}`}>
    <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFillObject} />
    <View className="relative">{children}</View>
  </View>
);
