import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { breakpoints, layout, spacing } from "../../theme";

export const useBreakpoint = () => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isPhone = width < breakpoints.tablet;
    const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
    const isDesktop = width >= breakpoints.desktop;

    const horizontalPadding = isPhone ? spacing[16] : isTablet ? spacing[24] : spacing[32];
    const topPadding = isPhone ? spacing[20] : isTablet ? spacing[24] : spacing[32];
    const sectionGap = isPhone ? spacing[24] : spacing[32];
    const maxContentWidth = isDesktop
      ? layout.maxContentDesktop
      : isTablet
        ? layout.maxContentTablet
        : layout.maxContentPhone;

    return {
      width,
      height,
      isPhone,
      isTablet,
      isDesktop,
      horizontalPadding,
      topPadding,
      sectionGap,
      maxContentWidth,
      railOffset: 0,
      bottomNavInset: isPhone ? 104 : 0,
    };
  }, [height, width]);
};
