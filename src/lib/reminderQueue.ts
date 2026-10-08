// Cola única para todo lo que programa o cancela recordatorios y guarda sus ids: la sincronización
// completa, crear/editar/desarchivar un hábito y el recordatorio de fin de día. De una en una, una
// sincronización no puede cancelar el recordatorio que otra operación acaba de programar antes de
// guardar su id, ni dejar dos avisos de fin de día.
//
// No es la cola de mutaciones de la base (src/db/repository.ts): aquí sí cabe IO externo, como el
// diálogo de permisos. Una tarea encolada no debe encolar otra y esperarla: se bloquearía a sí misma.

let queue: Promise<unknown> = Promise.resolve();

export function enqueueReminderWork<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}
