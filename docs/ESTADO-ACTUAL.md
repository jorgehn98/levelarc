# LevelArc — Estado actual

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md), la biblia original. Este archivo describe lo que hay en el repositorio ahora. El registro de builds y updates antiguos está en [`references/historial-builds.md`](./references/historial-builds.md).

## Estado en una pantalla

- **Versión del código: `1.2.0`, versionCode `12`.** No tiene build todavía. La configuración nativa cambió (plugin de notificaciones, módulos nuevos, reglas de copia de seguridad, permisos), así que el runtime cambia con ella y hace falta un build nuevo: un OTA no puede llevar estos cambios a un APK `1.1.6`.
- **Último build validado en dispositivo: `1.1.6`** (`9b238105`, versionCode `11`, canal `preview`). Con él se validó el flujo principal y el chat con IA local.
- **Todo lo posterior a `1.1.6` está sin probar en un dispositivo.** Integridad de datos, endurecimiento de la IA, resiliencia, backup en fichero, accesibilidad y manifiesto se verificaron con tests, `expo export`, `expo prebuild` y la previsualización web. La lista de lo que falta por comprobar en Android está en [`guides/release.md`](./guides/release.md).
- **Publicación:** el camino hasta un AAB de producción está en [`guides/release.md`](./guides/release.md) y la ficha de Google Play en [`references/play-store.md`](./references/play-store.md). Faltan capturas, recursos gráficos y la QA en dispositivo.
- **Lo pendiente** está en [`PENDIENTES.md`](./PENDIENTES.md), separado entre QA en dispositivo y decisiones de producto.

## Producto

LevelArc es un tracker de hábitos gamificado para Android. No tiene servidor ni cuentas: los datos viven en el teléfono.

### Hábitos y pantalla Hoy

- Crear, editar, archivar y desarchivar hábitos. Archivar conserva el historial.
- Hábitos binarios y contables con meta diaria, importancia 1-5, icono, de 1 a 3 atributos, días de la semana y recordatorio opcional.
- Hoy agrupa los hábitos del día en pendientes, completados y fallados, con completar, `+1`, fallar y deshacer.
- El formulario indica qué falta para poder guardar y el botón de crear se ve deshabilitado mientras falta algo.
- Detalle de hábito: estado de hoy, racha, consistencia de 30 días, últimos 7 días e historial.

### XP, rangos y atributos

- XP base al completar: importancia × 5, con multiplicador de racha por hábito hasta `x1.50` (4+ `x1.10`, 8+ `x1.20`, 15+ `x1.35`, 31+ `x1.50`). Fallar resta el 80 % del XP base.
- Una penalización nunca baja de nivel ni de rango.
- Niveles con la curva `30 * (nivel - 1)^1.6`, rangos E a S.
- Seis atributos (Fuerza, Vitalidad, Intelecto, Voluntad, Carisma, Destreza) con la misma curva y un potenciador `x1.5` sobre el XP repartido.
- Las rachas por hábito cuentan ocurrencias programadas, no días naturales.

### Misiones

- Misión diaria: completar todos los hábitos programados para hoy y reclamar el bonus (+5 a +20 XP según la carga del día).
- Racha perfecta: el bonus (+30 XP, +25 Esencia) se paga una vez cada 7 días perfectos consecutivos, el día 7, el 14, el 21.
- Un día sin hábitos programados ni rompe ni suma en las rachas de misión y de días perfectos.
- Los días pasados se cierran solos al arrancar y al cambiar el día local con la app abierta. El día en curso solo se cierra con el botón de Ajustes.

### Economía, tienda y logros

- Esencia: moneda del juego, distinta del XP. Se gana al completar hábitos, reclamar misiones, subir de nivel y desbloquear logros. No se compra con dinero.
- El saldo guardado puede ser negativo (gastar y después deshacer); al mostrarlo y al comprar se trata como cero.
- Tienda del Sistema con 5 títulos y 6 auras, con requisitos de nivel o rango.
- 21 logros en 6 categorías, evaluados tras cada acción y al arrancar.
- Celebraciones de logro, subida de nivel y subida de atributo, y cinemática de ascenso de rango.

### NYX, el Sistema

- Mensaje del día en Hoy, chat y apariciones en momentos clave. Funciona sin conexión con plantillas deterministas.
- IA local opcional: Gemma 4 E2B GGUF Q4_K_M (~3,1 GB) sobre `llama.rn`, descargada bajo demanda desde una revisión fijada de Hugging Face, con comprobación previa de espacio libre. La pantalla se mantiene encendida mientras dura la descarga.
- Las inferencias van en cola: el chat tiene prioridad y las superficies de fondo se descartan si el motor está ocupado.
- El historial de chat se limita a los 1000 mensajes más recientes.
- El diagnóstico técnico de la IA solo aparece en builds internos (desarrollo o canales `preview` / `development`).
- Detalle en [`IA-SISTEMA.md`](./IA-SISTEMA.md).

### Ajustes

- Idioma, nombre de jugador, recordatorio de cierre del día y apariciones del Sistema.
- Backup, actualizaciones, tienda, logros, chat y gestión de la IA.
- Zona de peligro: cerrar el día en curso y resetear todo, ambos con confirmación.
- Acerca de: versión y build, enlaces a la política de privacidad y a los términos en el idioma de la app, y contacto.
- La sección Demo (ascenso falso, repetir la pantalla de inicio) solo aparece en builds internos.

### Idioma y accesibilidad

- Español e inglés con un único diccionario tipado (`src/i18n/index.ts`). No quedan textos de interfaz fuera de él.
- En el primer arranque se sigue el idioma del dispositivo: inglés si el locale es `en*`, español en cualquier otro caso. Una preferencia guardada siempre gana.
- Los controles declaran rol, etiqueta y estado para lectores de pantalla, y los objetivos táctiles llegan a 44 pt. Las opciones elegidas del formulario llevan una marca además del color. Falta validarlo con TalkBack en un dispositivo.

## Datos

Detalle en [`architecture/datos.md`](./architecture/datos.md).

- SQLite en Android con `expo-sqlite` y SQL directo. No hay ORM: Drizzle se retiró y el esquema vive solo en `src/db/migrate.ts`, con migraciones versionadas sobre `PRAGMA user_version` (versión actual: 2).
- `events` es el ledger inmutable del XP y `player` una caché que se reconstruye desde él.
- Toda escritura pasa por una cola a nivel de módulo y una transacción por mutación.
- En web, la previsualización usa AsyncStorage (`src/db/repository.web.ts`) con la misma interfaz.
- **Backup como fichero**, formato v2. Exportar escribe `levelarc-backup-AAAA-MM-DD.json` en la caché y abre la hoja de compartir; importar abre el selector de documentos, comprueba el fichero y pide confirmación antes de reemplazar los datos. Los fallos se explican con un motivo en el idioma del usuario. La versión 1 se sigue leyendo.
- **Copia de seguridad de Android.** La copia automática sigue activa para la base de datos y las preferencias. El directorio del modelo de IA (`files/models/`) queda excluido con `plugins/withAndroidBackupRules.js`, porque sus 3,1 GB superaban el tope de 25 MB y dejaban sin copia a quien activaba la IA. Tras restaurar en otro teléfono, el modelo aparece como no descargado y los recordatorios se reprograman al arrancar.

## Resiliencia

- Si la base no abre, el arranque muestra una pantalla de error con Reintentar en vez de un indicador infinito. El layout raíz exporta un `ErrorBoundary` para fallos de render.
- Las acciones del store pasan por `runAction` (`src/stores/runAction.ts`): no rechazan, avisan solo si falló la escritura y marcan los botones como ocupados mientras duran. Lo que viene después de la escritura (releer el estado, logros, recordatorios) no convierte un éxito en fallo, para no invitar a repetir algo que ya se guardó.
- `syncReminders` reconstruye la agenda de notificaciones desde la base al arrancar, tras importar o resetear, al cambiar de idioma y al volver a primer plano si el permiso de notificaciones cambió. Un hábito se guarda aunque su recordatorio no se pueda programar.
- Si el cambio de día falla tres veces seguidas, la app avisa una vez y deja de reintentar hasta la siguiente vuelta a primer plano.

## Base técnica

- Expo SDK 56, React Native 0.85, Expo Router, TypeScript estricto, Zustand.
- EAS con perfiles `preview` (APK interno) y `production` (AAB), y EAS Update con los canales del mismo nombre. `runtimeVersion` sigue la política `appVersion`.
- Proyecto EAS `@jorgex-tech/levelarc`, projectId `2c6af84a-6180-48ac-ad12-f1b7b61bbf58`.
- `llama.rn` 0.12.4 con un parche local para React Native bridgeless.
- Fuentes Inter y Orbitron incluidas en `assets/fonts/`.
- Permisos de Android: se bloquean `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE`. La lista que queda y su justificación están en [`guides/release.md`](./guides/release.md).
- El icono temático de Android 13 usa una silueta monocroma real (`assets/android-icon-monochrome.png`).

## Calidad

- `pnpm check` ejecuta TypeScript, ESLint con cero avisos y Vitest. Es el mismo comando que corre GitHub Actions en cada pull request y en `main` (`.github/workflows/ci.yml`).
- Los tests del repositorio ejecutan el SQL real contra `node:sqlite` en memoria. Prueban las reglas y las transacciones, no el comportamiento de `expo-sqlite` en un dispositivo.
- `pnpm run doctor` ejecuta `expo-doctor`. `pnpm doctor` a secas es un comando propio de pnpm y no lo lanza. Quedan tres avisos conocidos: el duplicado de `expo-constants`, los parches de Expo SDK 56 por detrás de los últimos publicados y una regresión de memoria de Hermes V1 que solo se corrige en SDK 57.

## Desviaciones conscientes frente a la biblia inicial

- **`habit_daily_progress`.** La biblia no incluía una tabla de progreso diario mutable. Los hábitos contables la necesitan para guardar un `3/4` sin crear un evento de XP hasta completar la meta.
- **Sin ORM.** La biblia proponía Drizzle. Se retiró: el esquema y las migraciones son SQL directo en `src/db/migrate.ts`.
- **Cierre automático del día.** No depende de tareas en segundo plano. La app guarda el último día activo y cierra los días pendientes al volver.
- **Fallback web.** El objetivo real es Android con SQLite. La web usa AsyncStorage solo para previsualizar y hacer QA rápida.
