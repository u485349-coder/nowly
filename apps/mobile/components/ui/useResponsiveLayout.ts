import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const COMPACT_PHONE_BREAKPOINT = 390;
const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1100;

export const useResponsiveLayout = () => {
  const { height, width } = useWindowDimensions();

  return useMemo(() => {
    const isCompactPhone = width < COMPACT_PHONE_BREAKPOINT;
    const isDesktop = width >= DESKTOP_BREAKPOINT;
    const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
    const screenPadding = isDesktop ? 32 : isTablet ? 28 : isCompactPhone ? 16 : 20;
    const topPadding = isDesktop ? 40 : isTablet ? 30 : isCompactPhone ? 18 : 26;
    const sectionGap = isDesktop ? 26 : isTablet ? 22 : isCompactPhone ? 16 : 20;
    const shellWidth = isDesktop
      ? Math.min(width - screenPadding * 2, 1240)
      : isTablet
        ? Math.min(width - screenPadding * 2, 540)
        : width - screenPadding * 2;
    const splitGap = isDesktop ? 28 : isTablet ? 22 : isCompactPhone ? 16 : 20;
    const leftColumnWidth = isDesktop ? Math.min(448, shellWidth * 0.4) : shellWidth;
    const rightColumnWidth = isDesktop
      ? Math.max(320, shellWidth - leftColumnWidth - splitGap)
      : shellWidth;
    const cardRadius = isDesktop ? 30 : isTablet ? 28 : isCompactPhone ? 24 : 26;
    const cardPadding = isDesktop ? 22 : isTablet ? 20 : isCompactPhone ? 16 : 18;
    const heroTitleSize = isDesktop ? 34 : isTablet ? 32 : isCompactPhone ? 28 : 30;
    const heroTitleLineHeight = isDesktop ? 38 : isTablet ? 36 : isCompactPhone ? 32 : 34;
    const pageTitleSize = isDesktop ? 34 : isTablet ? 32 : isCompactPhone ? 28 : 30;
    const pageTitleLineHeight = isDesktop ? 38 : isTablet ? 36 : isCompactPhone ? 32 : 34;
    const bodySize = isCompactPhone ? 13 : 14;
    const bodyLineHeight = isCompactPhone ? 20 : 22;
    const compactControlHeight = isCompactPhone ? 50 : 54;

    return {
      bodyLineHeight,
      bodySize,
      cardPadding,
      cardRadius,
      compactControlHeight,
      height,
      isDesktop,
      isCompactPhone,
      isMobile: !isTablet && !isDesktop,
      isTablet,
      heroTitleLineHeight,
      heroTitleSize,
      leftColumnWidth,
      pageTitleLineHeight,
      pageTitleSize,
      rightColumnWidth,
      screenPadding,
      sectionGap,
      shellWidth,
      splitGap,
      topPadding,
      width,
    };
  }, [height, width]);
};
