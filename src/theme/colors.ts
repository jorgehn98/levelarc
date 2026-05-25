export const colors = {
  brand: {
    cyanGlow: '#7EE0F2',
    cyanCore: '#3FCAE6',
    cyanDeep: '#27A5C2',
    cyanShadow: '#0A4357',
    bone: '#E8E0C9',
    boneMuted: '#A8A39A',
  },
  background: {
    void: '#0A0A0F',
    voidDeep: '#050509',
    surface: '#13131C',
    surfaceRaised: '#1A1A26',
    card: '#1C1C28',
    cardHover: '#23232F',
    border: '#2A2A3A',
    borderBright: '#3A3A4D',
  },
  state: {
    completed: '#3DD68C',
    failed: '#FF6B6B',
    streak: '#FFA94D',
    pending: '#5A5A6E',
  },
  rank: {
    E: '#9A9AAF',
    D: '#4DB8C4',
    C: '#5F9BFF',
    B: '#B589F2',
    A: '#FF6B76',
    S: '#F5C542',
  },
} as const;

export type Rank = keyof typeof colors.rank;

export const typography = {
  font: {
    bodyRegular: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
    displayMedium: 'Orbitron_500Medium',
    displayBold: 'Orbitron_700Bold',
  },
  size: {
    caption: 12,
    bodySmall: 13,
    body: 16,
    bodyLarge: 17,
    title: 28,
    screenTitle: 34,
  },
  lineHeight: {
    caption: 16,
    bodySmall: 18,
    body: 22,
    title: 36,
    screenTitle: 42,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
} as const;

export const shadows = {
  primaryGlow: {
    shadowColor: colors.brand.cyanCore,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  rankGlow: (color: string) => ({
    shadowColor: color,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  }),
} as const;
