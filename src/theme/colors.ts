export const colors = {
  brand: {
    cyanGlow: '#2DE8D0',
    cyanCore: '#00D9C0',
    cyanDeep: '#00A896',
    cyanShadow: '#054A42',
    bone: '#E8E0C9',
  },
  background: {
    void: '#0A0A0F',
    surface: '#13131C',
    card: '#1C1C28',
    border: '#2A2A3A',
  },
  state: {
    completed: '#3DD68C',
    failed: '#FF6B6B',
    streak: '#FFA94D',
    pending: '#5A5A6E',
  },
  rank: {
    E: '#7A7A8C',
    D: '#4DB8C4',
    C: '#4D8BE0',
    B: '#9B6BE0',
    A: '#E84855',
    S: '#F5C542',
  },
} as const;

export type Rank = keyof typeof colors.rank;
