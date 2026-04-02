export const colors = {
  ink: "#040814",
  midnight: "#090D22",
  navy: "#12183A",
  slate: "#1E2B61",
  iris: "#5C4DFF",
  violet: "#7C3AED",
  sky: "#75CFFF",
  aqua: "#8BEAFF",
  cloud: "#F7FBFF",
  muted: "rgba(247,251,255,0.68)",
  glass: "rgba(255,255,255,0.06)",
  glassStrong: "rgba(255,255,255,0.1)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  glow: "rgba(167,139,250,0.32)",
  success: "#7EE1B5",
  warning: "#FFD89A",
  dangerSoft: "#F6A3B4",
  overlay: "rgba(4,8,20,0.72)",
} as const;

export const gradients = {
  appBackground: ["#040814", "#0A1028", "#17133B"] as const,
  hero: ["#F7FBFF", "#E7D9FF", "#9D7BFF"] as const,
  glassSheen: ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.02)"] as const,
  primaryAction: ["#F7FBFF", "#D9EEFF", "#A9D7FF"] as const,
  orb: ["#B68CFF", "#7C3AED", "#5C4DFF"] as const,
  heroSurface: ["rgba(28,18,64,0.96)", "rgba(34,29,91,0.88)", "rgba(7,13,26,0.96)"] as const,
} as const;

export const spacing = {
  0: 0,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
} as const;

export const radii = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  pill: 999,
} as const;

export const shadows = {
  glow: {
    shadowColor: colors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  soft: {
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  card: {
    shadowColor: colors.glow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontFamily: "SpaceGrotesk_700Bold" as const },
  h1: { fontSize: 28, lineHeight: 34, fontFamily: "SpaceGrotesk_700Bold" as const },
  h2: { fontSize: 22, lineHeight: 28, fontFamily: "SpaceGrotesk_700Bold" as const },
  h3: { fontSize: 18, lineHeight: 24, fontFamily: "SpaceGrotesk_500Medium" as const },
  body: { fontSize: 15, lineHeight: 22, fontFamily: "SpaceGrotesk_400Regular" as const },
  bodySmall: { fontSize: 13, lineHeight: 18, fontFamily: "SpaceGrotesk_400Regular" as const },
  label: { fontSize: 12, lineHeight: 16, fontFamily: "SpaceGrotesk_500Medium" as const },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "SpaceGrotesk_500Medium" as const,
    letterSpacing: 1.8,
    textTransform: "uppercase" as const,
  },
} as const;

export const motion = {
  fast: 120,
  normal: 220,
  slow: 320,
} as const;

export const breakpoints = {
  tablet: 768,
  desktop: 1100,
} as const;

export const layout = {
  maxContentPhone: 680,
  maxContentTablet: 760,
  maxContentDesktop: 860,
  desktopRailWidth: 112,
  mobileBottomNavWidth: 360,
} as const;
