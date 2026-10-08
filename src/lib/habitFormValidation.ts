export type MissingHabitField = 'name' | 'days' | 'attributes';

// Qué le falta a un hábito para poder guardarse, en el orden en que aparece en el formulario.
// Vacío = se puede guardar.
export function getMissingHabitFields(input: { name: string; days: number[]; attributes: string[] }): MissingHabitField[] {
  const missing: MissingHabitField[] = [];
  if (input.attributes.length === 0) missing.push('attributes');
  if (!input.name.trim()) missing.push('name');
  if (input.days.length === 0) missing.push('days');
  return missing;
}
