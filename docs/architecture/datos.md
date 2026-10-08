# Datos: ledger, caché y backups

Cómo guarda LevelArc el progreso en Android y qué reglas mantienen los datos coherentes. El código vive en `src/db/` y la validación de backups en `src/lib/backupValidation.ts`.

## Ledger y caché

El XP no se guarda como un total que se va sumando. Se guarda como una lista de hechos, y el total se deriva de ellos.

- **Ledger.** La tabla `events` (un evento por hábito completado o fallado, con su `xp_delta` nominal) más los bonus de misión reclamados en `daily_missions` (`xp_bonus` con `reclamada = 1`, `streak_bonus_xp` con `streak_bonus_claimed = 1`).
- **Caché.** La fila única de `player`: `xp_total`, `nivel`, `rango`, `atributos_xp` y `racha_misiones`. Se actualiza en cada acción para no recalcular en cada lectura, pero siempre se puede reconstruir desde el ledger (`projectLedger` en `src/db/repository.ts`).

La regla que protegen los tests es que, tras cualquier secuencia de acciones, la caché coincide con la proyección del ledger.

El orden importa al proyectar. Una penalización nunca baja al jugador de nivel, así que su efecto real depende del XP acumulado en ese instante. Por eso los eventos guardan la penalización nominal (el recorte se aplica al proyectar) y cada bonus de misión guarda el instante real del claim (`reclamada_en`, `streak_bonus_reclamado_en`). El ledger se ordena por ese instante, no por la fecha de la misión.

No todo es derivable. Estos datos no salen del ledger y se conservan tal cual:

- El saldo de **Esencia**, porque se gasta. Puede ser negativo en la base: si completas, gastas y deshaces, el saldo queda en deuda y rehacer solo lo devuelve a donde estaba. El suelo en cero se aplica al mostrarlo y al comprobar si alcanza para comprar.
- `nivel_esencia_otorgado`, el nivel más alto por el que ya se pagó Esencia. Solo sube, así que perder y recuperar un nivel no lo paga dos veces.
- Nombre, recompensas compradas, lo equipado y los logros desbloqueados.

## Reglas de misión y racha

- El bonus de racha perfecta (+30 XP, +25 Esencia) se paga una vez cada 7 días perfectos consecutivos: el día 7, el 14, el 21. `canClaimPerfectWeek` en `src/core/missions.ts` es la única regla; la usan la pantalla Hoy y los dos repositorios.
- Un día sin hábitos programados (`objetivo = 0`) ni rompe ni suma en la racha de misiones ni en la de días perfectos, igual que en las rachas por hábito. Un día sin fila en `daily_missions` sí rompe.
- Las rachas se cuentan recorriendo hasta `MISSION_STREAK_LOOKBACK_DAYS` días hacia atrás, no las últimas N filas.
- Lo ya reclamado no se reescribe: el `xp_bonus` y la Esencia de una misión reclamada no cambian aunque después se archive o edite un hábito. Si el día deja de estar completo, el bonus se revoca entero y se devuelve exactamente la Esencia concedida.

## Mutaciones: una cola y una transacción

Toda función exportada que escribe pasa por `mutate` en `src/db/repository.ts`.

- **Una cola a nivel de módulo.** Las mutaciones se ejecutan de una en una. Dos toques seguidos sobre el mismo hábito no pueden intercalar su comprobación y su escritura: el segundo ve el estado que dejó el primero.
- **Una transacción por mutación.** El evento, el progreso del día, la misión y la caché del jugador se confirman juntos o no se confirma nada.

Se usa `withTransactionAsync` sobre la conexión principal. `withExclusiveTransactionAsync` abre otra conexión en cada llamada (expo-sqlite 56), donde `PRAGMA foreign_keys` vuelve a estar apagado y los helpers del repositorio escribirían fuera de la transacción. A cambio, `withTransactionAsync` no admite anidarse; la cola lo garantiza siempre que se respeten dos reglas:

1. Dentro de una mutación se llaman los helpers internos, nunca otra función exportada que mute. Esperaría a la cola que la propia mutación ocupa.
2. Dentro de una mutación solo hay SQL. Los recordatorios se programan antes y se cancelan después, fuera de la cola, porque programar puede abrir el diálogo de permisos.

Las lecturas no pasan por la cola. Una lectura lanzada mientras corre una mutación puede ver su estado intermedio; la app refresca al terminar cada mutación, que es cuando el dato es firme. `exportAllData` sí espera su turno para exportar un estado consistente. `getDailyMission` sincroniza la misión antes de devolverla, así que cuenta como mutación.

## Esquema y migraciones

`src/db/migrate.ts` es la única fuente del esquema. No hay ORM ni SQL generado.

- La versión del esquema es `PRAGMA user_version`. `MIGRATIONS[n]` lleva la base de la versión n a la n + 1.
- Cada migración corre en una transacción junto con el cambio de `user_version`. Si falla, la base queda como estaba y el arranque se rechaza.
- Un cambio de esquema se añade al final de `MIGRATIONS`. Las migraciones publicadas no se editan.

| Versión | Contenido |
| --- | --- |
| 1 | Esquema base, idempotente: crea las tablas que falten y añade las columnas que faltaban en instalaciones antiguas. Una base nueva y una instalada en versión 0 convergen al mismo esquema. |
| 2 | `daily_missions.reclamada_en` y `streak_bonus_reclamado_en`. Los claims anteriores se fechan al final del día local de su misión. |

## Backup

El backup es un JSON compacto: `{ version, exportedAt, data }`. Lo crea y lo lee `src/lib/backup.ts`.

- **Versión actual: 2.** Añade el instante de cada claim, admite saldo de Esencia negativo y limita el historial de chat. La versión 1 se sigue leyendo; lo que le falta se deriva al importar.
- `data` lleva las filas de cada tabla. La app nativa exporta en `snake_case` y el fallback web en `camelCase`; la importación acepta ambos.

`normalizeBackupData` (`src/lib/backupValidation.ts`) valida antes de tocar la base, y es la misma función en nativo y en web:

- Números finitos, enteros y dentro de rango. Lo que forma parte del ledger (deltas de XP, bonus de misión, Esencia concedida) se rechaza si está fuera de rango o tiene el signo cambiado; los valores de caché o de configuración (meta, importancia, saldo de Esencia) se recortan.
- Fechas `AAAA-MM-DD` reales, instantes ISO, días de la semana `1..7` sin repetir, ids únicos.
- El progreso y los eventos de un hábito que no viene en el backup se descartan.
- Un bonus de misión solo cuenta si ese día quedó completo.
- Recompensas y logros fuera de catálogo se descartan; solo se equipa lo que el backup dice poseer.
- El historial de chat nunca hace fallar la importación: se conservan los 1000 mensajes más recientes y el texto se corta a 4000 caracteres. La tabla `ai_messages` se poda al mismo tamaño en cada inserción.

Al importar no se copia la caché del jugador que trae el fichero. XP, nivel, rango, atributos y racha se recalculan desde el ledger importado. La configuración de IA vuelve a plantilla porque la ruta del modelo no es portable, y los recordatorios se reprograman en el dispositivo.

## Tests

`src/db/repository.test.ts` y `src/db/migrate.test.ts` ejecutan el SQL real contra una base `node:sqlite` en memoria, mediante el adaptador `test/expoSqlite.js`. Cubren las reglas, las migraciones, la cola y el rollback. No cubren el comportamiento de `expo-sqlite` en un dispositivo (conexión, bloqueos, rendimiento con historiales grandes), que sigue necesitando QA en Android.
