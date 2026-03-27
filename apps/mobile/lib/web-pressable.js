import { Platform } from "react-native";
export const webPressableStyle = (pressed, { disabled = false, pressedOpacity = 0.9, pressedScale = 0.992, } = {}) => {
    if (Platform.OS !== "web") {
        return null;
    }
    return {
        cursor: disabled ? "auto" : "pointer",
        opacity: disabled ? 0.45 : pressed ? pressedOpacity : 1,
        transform: [{ scale: pressed ? pressedScale : 1 }],
    };
};
