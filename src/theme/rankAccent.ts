import { colors, type Rank } from './colors';

export function getRankAccent(rank: Rank): string {
  return colors.rank[rank];
}
