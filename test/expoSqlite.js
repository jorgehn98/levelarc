// Adaptador SOLO para tests: implementa sobre `node:sqlite` (en memoria) el subconjunto de la API
// async de expo-sqlite que usan src/db/client.ts, migrate.ts y repository.ts. vitest.config.mjs
// apunta `expo-sqlite` aquí. Cada llamada cede el turno antes de ejecutar, igual que el puente
// nativo, para que dos operaciones lanzadas a la vez se intercalen de verdad en los tests.
import { DatabaseSync } from 'node:sqlite';

class TestDatabase {
  constructor() {
    // node:sqlite activa las foreign keys por defecto y SQLite en Android no: se abre apagado para que
    // los tests dependan del PRAGMA de migrate.ts, como en el dispositivo.
    this.db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false });
  }

  async execAsync(source) {
    await null;
    this.db.exec(source);
  }

  async runAsync(source, ...params) {
    await null;
    const result = this.db.prepare(source).run(...params.flat());
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async getFirstAsync(source, ...params) {
    await null;
    const row = this.db.prepare(source).get(...params.flat());
    return row ? { ...row } : null;
  }

  async getAllAsync(source, ...params) {
    await null;
    return this.db.prepare(source).all(...params.flat()).map((row) => ({ ...row }));
  }

  // Mismo cuerpo que SQLiteDatabase.withTransactionAsync en expo-sqlite 56: una sola conexión.
  async withTransactionAsync(task) {
    try {
      await this.execAsync('BEGIN');
      await task();
      await this.execAsync('COMMIT');
    } catch (error) {
      await this.execAsync('ROLLBACK');
      throw error;
    }
  }
}

export function openDatabaseSync() {
  return new TestDatabase();
}
