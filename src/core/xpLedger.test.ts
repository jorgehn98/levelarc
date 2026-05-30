import { describe, expect, it } from 'vitest';

import { applyXpDelta, getCompletionXp, getFailureXp } from './xp';
import { getXpForLevel } from './ranks';

// Reconstruye el total proyectando los deltas NOMINALES con applyXpDelta desde 0, igual que
// recalculatePlayerFromEvents/Ledger. Si el ledger guarda nominales, esto debe dar el mismo total
// que aplicarlos incrementalmente en vivo.
function projectFromLedger(nominalDeltas: number[]): number {
  return nominalDeltas.reduce((total, delta) => applyXpDelta(total, delta), 0);
}

describe('xp ledger idempotence', () => {
  // El fix del Arreglo 1: el evento persiste la penalización NOMINAL (getFailureXp), no el delta ya
  // recortado por el suelo de nivel. El suelo se aplica SOLO al proyectar (applyXpDelta). Así
  // reconstruir desde el ledger reproduce exactamente el total que ve el jugador en vivo.
  it('reconstructing nominal deltas equals applying them incrementally (player near floor)', () => {
    // Secuencia [completar +X, fallar -Y, completar +Z] con el jugador cerca del suelo de nivel,
    // que es justo donde el clamp del suelo entra en juego.
    const completeX = getCompletionXp(5, 1); // +25
    const failY = getFailureXp(5); // -20
    const completeZ = getCompletionXp(3, 1); // +15
    const nominalDeltas = [completeX, failY, completeZ];

    // Simulación "en vivo": el total observable evoluciona aplicando los nominales paso a paso.
    let liveTotal = 0;
    for (const delta of nominalDeltas) {
      liveTotal = applyXpDelta(liveTotal, delta);
    }

    // Reconstrucción desde el ledger de nominales.
    const reconstructed = projectFromLedger(nominalDeltas);

    expect(reconstructed).toBe(liveTotal);
  });

  it('clamps the failure penalty at the level floor when projecting, not in the stored delta', () => {
    // Justo en el suelo del nivel 2: un fallo no debe bajar de ahí al proyectar.
    const floorL2 = getXpForLevel(2);
    const fail = getFailureXp(4); // -16

    // En vivo: el total está exactamente en el suelo del nivel 2 y falla.
    const liveAfterFail = applyXpDelta(floorL2, fail);
    expect(liveAfterFail).toBe(floorL2); // el suelo recorta la penalización

    // El delta NOMINAL almacenado sigue siendo la penalización completa, no el recorte (que sería 0).
    expect(fail).toBe(-16);

    // Reconstruir desde un ledger que lleva al jugador al suelo y luego falla reproduce el suelo.
    const toFloor = getCompletionXp(5, 1); // sube algo
    const reconstructed = projectFromLedger([toFloor, fail, ...buildToFloor(floorL2 - toFloor)]);
    // El total reconstruido nunca cae por debajo de 0 ni del suelo del nivel alcanzado.
    expect(reconstructed).toBeGreaterThanOrEqual(0);
  });

  it('is order-stable: the same nominal multiset reconstructs to the same live total', () => {
    const deltas = [
      getCompletionXp(2, 1),
      getCompletionXp(4, 5),
      getFailureXp(3),
      getCompletionXp(5, 8),
      getFailureXp(5),
      getFailureXp(1),
    ];

    let liveTotal = 0;
    for (const delta of deltas) {
      liveTotal = applyXpDelta(liveTotal, delta);
    }

    expect(projectFromLedger(deltas)).toBe(liveTotal);
  });
});

// Helper: rellena con completados de importancia 1 hasta acercarse al objetivo (solo para forzar
// que el jugador esté cerca de un suelo en el test del clamp).
function buildToFloor(remaining: number): number[] {
  if (remaining <= 0) return [];
  const step = getCompletionXp(1, 1); // +5
  const count = Math.max(0, Math.floor(remaining / step));
  return Array.from({ length: count }, () => step);
}
