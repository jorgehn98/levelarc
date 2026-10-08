import { Brain, Dumbbell, Flame, HeartPulse, MessageCircle, Wrench } from 'lucide-react-native';

import type { AttributeId } from '@/core/attributes';
import { colors } from '@/theme/colors';

// Solo datos visuales. Nombre, código y descripción salen de i18n: `attr_<id>`, `attr_<id>_code` y
// `attr_<id>_desc`.
export const habitAttributes: {
  id: AttributeId;
  color: string;
  icon: typeof Dumbbell;
}[] = [
  {
    id: 'fuerza',
    color: '#FF6B6B',
    icon: Dumbbell,
  },
  {
    id: 'vitalidad',
    color: colors.state.completed,
    icon: HeartPulse,
  },
  {
    id: 'intelecto',
    color: colors.brand.cyanCore,
    icon: Brain,
  },
  {
    id: 'voluntad',
    color: colors.rank.S,
    icon: Flame,
  },
  {
    id: 'carisma',
    color: '#C084FC',
    icon: MessageCircle,
  },
  {
    id: 'destreza',
    color: '#60A5FA',
    icon: Wrench,
  },
];

export function getHabitAttribute(id: AttributeId) {
  return habitAttributes.find((attribute) => attribute.id === id) ?? habitAttributes[3];
}
