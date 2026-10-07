// Cola de inferencias del LLM local. Módulo PURO (sin llama.rn) para poder testearlo.
//
// Por qué existe: hay UN solo LlamaContext y `stopCompletion` actúa sobre el contexto entero. Sin
// serializar, briefing, comentario de hábito, aparición y chat podían llamar a `completion` a la vez,
// y cancelar el chat podía abortar la inferencia de otra superficie.
//
// Reglas:
//  - Las inferencias corren de una en una, en orden de llegada.
//  - 'background' (briefing, hábito, aparición) NO espera: si el motor está ocupado se descarta con
//    InferenceSkippedError y la superficie se queda con su plantilla, que ya está en pantalla.
//  - 'chat' tiene prioridad: si llega mientras corre una de fondo, la corta (su `stop`) y esa de fondo
//    termina como descartada, aunque el nativo devuelva texto parcial.
//  - `cancel(prioridad)` solo afecta a trabajos de esa prioridad: detiene el que corre y descarta los
//    que esperan sin llegar a ejecutarlos.

export type InferencePriority = 'chat' | 'background';

// La inferencia no se ejecutó o su resultado se descartó (motor ocupado, desplazada por el chat o
// cancelada). No es un fallo del LLM: quien la pidió debe quedarse con su fallback sin registrar error.
export class InferenceSkippedError extends Error {
  constructor() {
    super('Inference skipped: engine busy, preempted or cancelled');
    this.name = 'InferenceSkippedError';
  }
}

export function isInferenceSkipped(error: unknown): boolean {
  return error instanceof InferenceSkippedError;
}

type Job = {
  priority: InferencePriority;
  stop: () => void;
  started: boolean;
  dropped: boolean;
};

type InferenceQueue = {
  // `stop` debe cortar la operación nativa de ESTE trabajo; solo se llama si ya está corriendo.
  run<T>(priority: InferencePriority, task: () => Promise<T>, stop?: () => void): Promise<T>;
  cancel(priority: InferencePriority): void;
};

export function createInferenceQueue(): InferenceQueue {
  // `tail` nunca rechaza: un trabajo fallido no debe bloquear a los siguientes.
  let tail: Promise<void> = Promise.resolve();
  const jobs: Job[] = [];

  function drop(job: Job): void {
    if (job.dropped) return;
    job.dropped = true;
    if (job.started) job.stop();
  }

  return {
    run<T>(priority: InferencePriority, task: () => Promise<T>, stop: () => void = () => undefined): Promise<T> {
      if (priority === 'background' && jobs.length > 0) {
        return Promise.reject(new InferenceSkippedError());
      }
      // Solo llega aquí un 'background' con la cola vacía o un 'chat': el chat desplaza al de fondo.
      for (const other of jobs) {
        if (other.priority === 'background') drop(other);
      }

      const job: Job = { priority, stop, started: false, dropped: false };
      jobs.push(job);

      const result = tail.then(async () => {
        try {
          if (job.dropped) throw new InferenceSkippedError();
          job.started = true;
          const value = await task();
          if (job.dropped) throw new InferenceSkippedError();
          return value;
        } catch (error) {
          // Un trabajo descartado puede fallar por el propio corte: sigue siendo "descartado".
          throw job.dropped ? new InferenceSkippedError() : error;
        } finally {
          jobs.splice(jobs.indexOf(job), 1);
        }
      });
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    cancel(priority: InferencePriority): void {
      for (const job of jobs) {
        if (job.priority === priority) drop(job);
      }
    },
  };
}
