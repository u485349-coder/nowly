import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1100;

export const useResponsiveLayout = () => {
  const { height, width } = useWindowDimensions();

  return useMemo(() => {
    const isDesktop = width >= DESKTOP_BREAKPOINT;
    const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
    const screenPadding = isDesktop ? 32 : isTablet ? 28 : 20;
    const sectionGap = isDesktop ? 26 : 22;
    const shellWidth = isDesktop
      ? Math.min(width - screenPadding * 2, 1240)
      : isTablet
        ? Math.min(width - screenPadding * 2, 540)
        : width - screenPadding * 2;
    const splitGap = isDesktop ? 28 : 22;
    const leftColumnWidth = isDesktop ? Math.min(448, shellWidth * 0.4) : shellWidth;
    const rightColumnWidth = isDesktop
      ? Math.max(320, shellWidth - leftColumnWidth - splitGap)
      : shellWidth;

    return {
      height,
      isDesktop,
      isMobile: !isTablet && !isDesktop,
      isTablet,
      leftColumnWidth,
      rightColumnWidth,
      screenPadding,
      sectionGap,
      shellWidth,
      splitGap,
      width,
    };
  }, [height, width]);
};
