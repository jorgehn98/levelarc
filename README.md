# LevelArc

Tracker de hábitos gamificado para Android, **offline-first**, sin cuentas ni servidor. Convierte hábitos reales en misiones, XP, atributos, rangos, logros y recompensas cosméticas. Incluye un asistente RPG opcional que puede ejecutarse íntegramente en el dispositivo con Gemma.

> Estado: producto funcional en desarrollo y validado en Android real. Aún no está publicado en Play Store.

## Diferenciales

- **Offline-first real:** hábitos, progreso, recordatorios, backups e IA funcionan sin backend propio.
- **Gamificación con reglas testeadas:** XP, rangos E-S, seis atributos, rachas, misiones, Esencia, tienda y 21 logros.
- **IA local opcional:** `llama.rn` + Gemma 4 E2B GGUF Q4_K_M, con descarga bajo demanda y fallback determinista.
- **Persistencia robusta:** SQLite en Android con migraciones versionadas, mutaciones transaccionales e importación/exportación JSON validada.
- **Producto bilingüe:** interfaz y personalidad del Sistema en español e inglés.

La visión original está en [`docs/LevelArc-PROYECTO.md`](docs/LevelArc-PROYECTO.md), el estado técnico detallado en [`docs/ESTADO-ACTUAL.md`](docs/ESTADO-ACTUAL.md) y las decisiones de la IA local en [`docs/IA-SISTEMA.md`](docs/IA-SISTEMA.md).

## Estado

Producto funcional:

- Crear, editar, archivar y desarchivar hábitos.
- Hábitos binarios y contables con meta diaria.
- Frecuencia por días de la semana.
- Pantalla Hoy con completar, sumar progreso, fallar y deshacer.
- Detalle de hábito con estado de hoy, racha actual, consistencia 30 días, últimos 7 días e historial reciente.
- Recordatorios de hábito opcionales con selector de hora y acción para limpiar.
- XP escalado por importancia, niveles con curva `30 * (nivel - 1)^1.6`, rangos E-S y eventos de historial.
- Atributos RPG con la misma curva de niveles que el jugador y potenciador x1.5 sobre el XP repartido entre 1-3 atributos por hábito.
- Rachas por hábito según ocurrencias programadas, con multiplicador máximo `x1.50`.
- Misión diaria dinámica: completar todos los hábitos de hoy y reclamar bonus.
- Misión extra por racha perfecta de 7 días.
- Racha de misión basada en reclamaciones consecutivas, no en total acumulado de reclamaciones.
- Recordatorios locales en native.
- Recordatorio diario configurable de cierre del día.
- Backup/exportación JSON e importación/restauración pegando JSON.
- Idioma ES/EN.
- Modo oscuro fijo.
- Identidad visual inicial con logo LevelArc en icono, splash y UI.
- Economía de Esencia, tienda de cosméticos y 21 logros persistentes.
- Chat y apariciones contextuales del Sistema con motor por plantillas o LLM local.
- Descarga y ejecución opcional de Gemma en Android, validada en dispositivo real.

## Stack

- Expo + React Native + TypeScript
- Expo Router
- Expo Splash Screen
- Expo Updates / EAS Update
- Zustand
- NativeWind/Tailwind
- SQLite (`expo-sqlite`, SQL directo) en native
- AsyncStorage como fallback web de desarrollo
- Vitest para lógica pura y para el repositorio SQLite (SQL real sobre `node:sqlite`, Node >= 22.13)
- `llama.rn` + Gemma 4 E2B para IA local opcional

## Comandos

```bash
pnpm install
pnpm start
pnpm web
pnpm android
pnpm check
pnpm test
pnpm exec tsc --noEmit
npx expo-doctor
pnpm build:android:preview
pnpm build:android:production
pnpm update:preview --message "Fix UI copy"
pnpm update:production --message "Fix UI copy"
```

## Arquitectura

- `app/`: rutas de Expo Router.
- `src/core/`: reglas puras de XP, rangos, rachas y misión diaria.
- `src/db/migrate.ts`: esquema SQLite y migraciones versionadas (`PRAGMA user_version`).
- `src/db/types.ts`: tipos públicos del repositorio, compartidos por native y web.
- `src/db/repository.ts`: repositorio native con SQLite.
- `src/db/repository.web.ts`: fallback web con AsyncStorage para poder probar en navegador.
- `src/stores/appStore.ts`: estado global y acciones del producto.
- `src/components/`: UI reutilizable.
- `src/ai/`: motores del Sistema, gestión del modelo y diagnóstico de IA local.
- `assets/brand/`: set de logos/emblemas LevelArc.
- `src/i18n/index.ts`: diccionario ES/EN.
- `DESIGN.md`: tokens y reglas de diseño para agentes/herramientas.

## Notas importantes

- `events` es la fuente de verdad inmutable del XP; `player` es una caché que se reconstruye desde ese ledger. El modelo de datos, las migraciones y el formato de backup están en [`docs/architecture/datos.md`](docs/architecture/datos.md).
- `habit_daily_progress` guarda progreso diario mutable, necesario para hábitos contables.
- La fecha, hora y zona horaria salen del dispositivo; la app no consulta Internet para calcular el día actual.
- Si la app cruza medianoche abierta o en segundo plano, refresca Hoy al detectar el nuevo día local.
- Las rachas por hábito cuentan solo los días en los que ese hábito está programado.
- Las penalizaciones nunca bajan al usuario de nivel/rango: se clampa al suelo del nivel actual.
- Los días pendientes se cierran automáticamente al arrancar o al detectar un cambio de día local.
- En web no se usa SQLite porque `expo-sqlite` requiere WASM/SharedArrayBuffer; Android/native sí usa SQLite.

## Próximos pasos

1. Completar la QA prolongada de las superficies secundarias de IA local.
2. Seguir afinando balance, métricas y experiencia con uso real.
3. Preparar publicación en Play Store cuando el producto alcance el nivel de acabado buscado.

## Build Android

El proyecto usa EAS con perfiles separados:

- `preview`: APK interno para QA en dispositivo.
- `production`: AAB preparado para una futura publicación.
- EAS Update: parches de JavaScript, textos, estilos y assets compatibles con el runtime instalado.

```bash
pnpm install
pnpm check
pnpm build:android:preview
```

Los cambios en dependencias nativas, permisos, plugins, SDK de Expo o `runtimeVersion` requieren un build nuevo. Antes de validar una build con IA local se comprueba que el APK contiene las librerías nativas de `llama.rn` para `arm64-v8a`.

La integración de `llama.rn` incluye un parche para React Native bridgeless y `TurboModuleWithJSIBindings`. La explicación técnica, diagnóstico y estado de QA se mantienen en [`docs/IA-SISTEMA.md`](docs/IA-SISTEMA.md) y [`docs/ESTADO-ACTUAL.md`](docs/ESTADO-ACTUAL.md).

## Calidad

El gate local autoritativo ejecuta typecheck y tests:

```bash
pnpm check
```

`expo-doctor` puede advertir de duplicados transitivos de `expo-constants` en Expo SDK 56; el aviso está documentado y no bloquea las builds internas actuales.

## Contribuir

Antes de cambiar código, lee [`AGENTS.md`](AGENTS.md), [`DESIGN.md`](DESIGN.md) y la documentación del dominio afectado. Mantén las reglas de producto en `src/core/`, añade tests cuando cambien invariantes y ejecuta `pnpm check` antes de abrir un PR.

## Licencia

MIT — ver [`LICENSE`](LICENSE).
