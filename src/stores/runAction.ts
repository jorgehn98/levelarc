// Único punto por el que pasan las acciones del usuario. Puro: recibe lo que necesita del store,
// para poder probar sus garantías sin montar la app.
//
// 1. Una acción repetida mientras la anterior sigue en curso se descarta y devuelve `busy`: no es
//    un fallo y no se avisa de nada; el botón ya se ve ocupado.
// 2. Si la tarea (la escritura) falla, se avisa al usuario y se devuelve `failed`. Nunca rechaza:
//    las pantallas llaman con `void`.
// 3. Lo que viene después de la escritura (releer el estado, logros, apariciones) no cambia el
//    resultado. Si falla, la escritura ya está hecha: decir "no se guardó" invitaría a repetirla y
//    duplicaría un hábito o un +1. El estado se vuelve a leer en la siguiente acción.

export type ActionOutcome<T> = { ok: true; value: T } | { ok: false; reason: 'failed' | 'busy' };

type BusyState = { isBusy: boolean; pendingHabitIds: string[] };

export type ActionHost = {
  getState: () => BusyState;
  setState: (update: (state: BusyState) => Partial<BusyState>) => void;
  // Relee del repositorio el estado que pintan las pantallas.
  refresh: () => Promise<void>;
  // Aviso por defecto cuando la tarea falla.
  reportFailure: (error: unknown) => void;
  // Fallo posterior a la escritura: no se enseña al usuario.
  onAfterError: (error: unknown) => void;
};

export type ActionOptions<T> = {
  // Acción de un hábito: solo bloquea ese hábito. Sin él, la acción es global.
  habitId?: string;
  // Aviso propio cuando el motivo del fallo importa.
  report?: (error: unknown) => void;
  // false si la tarea no cambia datos del repositorio.
  refresh?: boolean;
  // Trabajo posterior a la escritura y al refresco. Corre ya sin la marca de ocupado: lecturas y
  // comprobaciones lentas no deben retener el botón.
  after?: (value: T) => Promise<void> | void;
};

export async function runAction<T>(
  host: ActionHost,
  task: () => Promise<T>,
  options: ActionOptions<T> = {},
): Promise<ActionOutcome<T>> {
  const { habitId, refresh = true, after } = options;
  const current = host.getState();
  if (habitId ? current.pendingHabitIds.includes(habitId) : current.isBusy) return { ok: false, reason: 'busy' };

  host.setState((state) => (habitId ? { pendingHabitIds: [...state.pendingHabitIds, habitId] } : { isBusy: true }));
  let value: T;
  try {
    try {
      value = await task();
    } catch (error) {
      (options.report ?? host.reportFailure)(error);
      return { ok: false, reason: 'failed' };
    }
    if (refresh) await settle(host, host.refresh);
  } finally {
    host.setState((state) =>
      habitId ? { pendingHabitIds: state.pendingHabitIds.filter((id) => id !== habitId) } : { isBusy: false },
    );
  }

  if (after) await settle(host, () => after(value));
  return { ok: true, value };
}

async function settle(host: ActionHost, step: () => Promise<void> | void) {
  try {
    await step();
  } catch (error) {
    host.onAfterError(error);
  }
}
