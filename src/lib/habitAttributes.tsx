import { Brain, Dumbbell, Flame, HeartPulse, MessageCircle, Wrench } from 'lucide-react-native';

import type { AttributeId } from '@/core/attributes';
import { colors } from '@/theme/colors';

export const habitAttributes: Array<{
  id: AttributeId;
  code: string;
  label: string;
  description: string;
  color: string;
  icon: typeof Dumbbell;
}> = [
  {
    id: 'fuerza',
    code: 'FUE',
    label: 'Fuerza',
    description: 'Potencia física, entrenamiento y resistencia muscular.',
    color: '#FF6B6B',
    icon: Dumbbell,
  },
  {
    id: 'vitalidad',
    code: 'VIT',
    label: 'Vitalidad',
    description: 'Sueño, nutrición, salud, energía y recuperación.',
    color: colors.state.completed,
    icon: HeartPulse,
  },
  {
    id: 'intelecto',
    code: 'INT',
    label: 'Intelecto',
    description: 'Estudio, lectura, aprendizaje y pensamiento profundo.',
    color: colors.brand.cyanCore,
    icon: Brain,
  },
  {
    id: 'voluntad',
    code: 'VOL',
    label: 'Voluntad',
    description: 'Disciplina, constancia, autocontrol y hábitos difíciles.',
    color: colors.rank.S,
    icon: Flame,
  },
  {
    id: 'carisma',
    code: 'CAR',
    label: 'Carisma',
    description: 'Relaciones, comunicación, exposición social y liderazgo.',
    color: '#C084FC',
    icon: MessageCircle,
  },
  {
    id: 'destreza',
    code: 'DES',
    label: 'Destreza',
    description: 'Habilidad práctica, técnica, creatividad y precisión.',
    color: '#60A5FA',
    icon: Wrench,
  },
];

export function getHabitAttribute(id: AttributeId) {
  return habitAttributes.find((attribute) => attribute.id === id) ?? habitAttributes[3];
}
