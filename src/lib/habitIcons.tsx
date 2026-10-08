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

export const habitIcons = [
  { id: 'target', label: 'Base', icon: Target },
  { id: 'dumbbell', label: 'Entreno', icon: Dumbbell },
  { id: 'book', label: 'Leer', icon: BookOpen },
  { id: 'brain', label: 'Estudio', icon: Brain },
  { id: 'briefcase', label: 'Trabajo', icon: Briefcase },
  { id: 'heart', label: 'Salud', icon: HeartPulse },
  { id: 'flame', label: 'Racha', icon: Flame },
  { id: 'moon', label: 'Sueño', icon: Moon },
  { id: 'utensils', label: 'Comida', icon: Utensils },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'sparkles', label: 'Crear', icon: Sparkles },
  { id: 'smile', label: 'Ánimo', icon: Smile },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: ComponentType<LucideProps>;
}[];

export type HabitIconId = (typeof habitIcons)[number]['id'];

export function normalizeHabitIcon(value: unknown): HabitIconId {
  return habitIcons.some((item) => item.id === value) ? (value as HabitIconId) : defaultHabitIcon;
}

export function getHabitIconComponent(value: unknown) {
  return habitIcons.find((item) => item.id === normalizeHabitIcon(value))?.icon ?? Target;
}
