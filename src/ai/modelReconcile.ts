// Decisión PURA de reconciliación entre lo que dice la BD del modelo y lo que hay en disco. La aplica
// aiStore.reconcileModelState al cargar; aquí solo se decide, para poder testear las combinaciones.

import type { AiEngine, AiModelStatus } from '@/db/repository';

type ModelReconcilePlan = {
  status: 'ready' | 'none';
  // Motor a fijar; undefined = no tocar la elección actual.
  engine?: AiEngine;
  // Borrar del disco el parcial de una descarga interrumpida.
  deletePartial?: boolean;
};

// `hasValidFile`: el GGUF completo (tamaño exacto) está en disco. `downloadActive`: hay una descarga
// viva en este proceso. Devuelve null si BD y disco ya son coherentes.
export function planModelReconcile(
  status: AiModelStatus,
  hasValidFile: boolean,
  downloadActive: boolean,
): ModelReconcilePlan | null {
  if (downloadActive) return null;

  // 'downloading' huérfano (la app se cerró a mitad): si el fichero llegó entero se aprovecha; si no,
  // se limpia el parcial. Sin esto la UI queda atascada en "Descargando…" con un "Cancelar" inerte.
  if (status === 'downloading') {
    return hasValidFile
      ? { status: 'ready', engine: 'llama' }
      : { status: 'none', engine: 'template', deletePartial: true };
  }

  // 'ready' sin fichero (borrado externo): el motor reventaría en initLlama en bucle.
  if (status === 'ready' && !hasValidFile) return { status: 'none', engine: 'template' };

  // 'none' con el modelo entero en disco: "resetear todo" e importar backup reescriben ai_profile sin
  // tocar el fichero. Se adopta para que la pantalla ofrezca usarlo o borrarlo en vez de dejar 3,1 GB
  // huérfanos tras un "Descargar". No se activa el motor: eso lo decide el usuario.
  if (status === 'none' && hasValidFile) return { status: 'ready' };

  return null;
}
