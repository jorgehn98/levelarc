import {
  BookOpen,
  Brain,
  Briefcase,
  Dumbbell,
  Flame,
  HeartPulse,
  Moon,
  Music,
  Smile,
  Sparkles,
  Target,
  Utensils,
  type LucideProps,
} from 'lucide-react-native';
import type { ComponentType } from 'react';

export const defaultHabitIcon = 'target';

// El nombre visible de cada icono sale de i18n: `icon_<id>`.
export const habitIcons = [
  { id: 'target', icon: Target },
  { id: 'dumbbell', icon: Dumbbell },
  { id: 'book', icon: BookOpen },
  { id: 'brain', icon: Brain },
  { id: 'briefcase', icon: Briefcase },
  { id: 'heart', icon: HeartPulse },
  { id: 'flame', icon: Flame },
  { id: 'moon', icon: Moon },
  { id: 'utensils', icon: Utensils },
  { id: 'music', icon: Music },
  { id: 'sparkles', icon: Sparkles },
  { id: 'smile', icon: Smile },
] as const satisfies readonly {
  id: string;
  icon: ComponentType<LucideProps>;
}[];

export type HabitIconId = (typeof habitIcons)[number]['id'];

export function normalizeHabitIcon(value: unknown): HabitIconId {
  return habitIcons.some((item) => item.id === value) ? (value as HabitIconId) : defaultHabitIcon;
}

export function getHabitIconComponent(value: unknown) {
  return habitIcons.find((item) => item.id === normalizeHabitIcon(value))?.icon ?? Target;
}
