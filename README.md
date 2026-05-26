# LevelArc

Tracker de hábitos gamificado para Android, offline-first, sin cuentas ni servidor.

La biblia inicial del proyecto está guardada en [`docs/LevelArc-PROYECTO.md`](docs/LevelArc-PROYECTO.md). Ese documento manda sobre producto, tono, paleta, gamificación y alcance del MVP.

La guía de diseño operativa está en [`DESIGN.md`](DESIGN.md). Define tokens, criterios visuales y reglas para que futuras pantallas mantengan la misma dirección.

## Estado

MVP funcional:

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

## Stack

- Expo + React Native + TypeScript
- Expo Router
- Expo Splash Screen
- Expo Updates / EAS Update
- Zustand
- NativeWind/Tailwind
- SQLite + Drizzle en native
- AsyncStorage como fallback web de desarrollo
- Vitest para lógica pura

## Comandos

```bash
pnpm install
pnpm start
pnpm web
pnpm android
pnpm check
pnpm test
pnpm exec tsc --noEmit
pnpm db:generate
npx expo-doctor
pnpm build:android:preview
pnpm build:android:production
pnpm update:preview --message "Fix UI copy"
pnpm update:production --message "Fix UI copy"
```

## Arquitectura

- `app/`: rutas de Expo Router.
- `src/core/`: reglas puras de XP, rangos, rachas y misión diaria.
- `src/db/schema.ts`: esquema Drizzle.
- `src/db/repository.ts`: repositorio native con SQLite.
- `src/db/repository.web.ts`: fallback web con AsyncStorage para poder probar en navegador.
- `src/stores/appStore.ts`: estado global y acciones del MVP.
- `src/components/`: UI reutilizable.
- `assets/brand/`: set de logos/emblemas LevelArc.
- `src/i18n/index.ts`: diccionario ES/EN.
- `DESIGN.md`: tokens y reglas de diseño para agentes/herramientas.

## Notas importantes

- `events` es la fuente de verdad inmutable del XP.
- `habit_daily_progress` guarda progreso diario mutable, necesario para hábitos contables.
- La fecha, hora y zona horaria salen del dispositivo; la app no consulta Internet para calcular el día actual.
- Si la app cruza medianoche abierta o en segundo plano, refresca Hoy al detectar el nuevo día local.
- Las rachas por hábito cuentan solo los días en los que ese hábito está programado.
- Las penalizaciones nunca bajan al usuario de nivel/rango: se clampa al suelo del nivel actual.
- El cierre del día es manual en el MVP para evitar automatismos frágiles.
- En web no se usa SQLite porque `expo-sqlite` requiere WASM/SharedArrayBuffer; Android/native sí usa SQLite.

## Siguiente bloque lógico

La QA inicial en Android real ya está validada por el usuario y el icono de marca se ve bien. El objetivo no es publicar un MVP temprano, sino seguir construyendo hasta que LevelArc esté completa.

1. Seguir validando las métricas simples de v1.3 con datos reales.
2. Añadir más profundidad: resumen semanal, estadísticas, logros y gamificación avanzada.
3. Valorar IA local cuando la base esté madura.
4. Dejar Play Store y App Store como paso final.

## Build Android

El repo incluye `eas.json` con dos perfiles útiles:

- `preview`: genera APK interno para probar en dispositivo.
- `production`: genera AAB para Play Store.

Proyecto EAS enlazado:

- `@jorgex-tech/levelarc`
- Project ID: `2c6af84a-6180-48ac-ad12-f1b7b61bbf58`

Último APK preview válido:

- Build ID: `6e5e6b06-bb05-481d-bcb0-85808bce2981`
- APK: <https://expo.dev/artifacts/eas/eCtjS5na8CNGaV6SxaiN2X.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/6e5e6b06-bb05-481d-bcb0-85808bce2981>
- Versión: `1.0.2`, Android versionCode `4`, runtimeVersion `1.0.2`.

Antes de publicar:

```bash
pnpm check
npx expo-doctor
pnpm build:android:preview
```

Nota: con `pnpm`, `expo-doctor` puede detectar una duplicidad de `expo-constants` causada por resoluciones internas de Expo SDK 56 (`expo-linking` pide `~56.0.14` y `expo-router` pide `^56.0.15`). El build preview `6e5e6b06-bb05-481d-bcb0-85808bce2981` terminó bien pese a ese aviso, así que no bloquea el APK interno actual.

`babel-preset-expo` está añadido como devDependency explícita porque el primer build EAS release no lo resolvía de forma transitiva con pnpm.

`@babel/plugin-transform-react-jsx` también está como devDependency explícita porque `expo-updates` lo necesita al crear recursos de updates en EAS con pnpm.

## EAS Update

EAS Update está configurado para parches internos compatibles:

- `preview`: APK interno de QA.
- `production`: futuro AAB/Play Store.

La app incluye en Ajustes un botón para buscar updates, descargarlos y reiniciar LevelArc. También puede recibir updates al arrancar según el comportamiento por defecto de `expo-updates`.

Último update `preview` publicado:

- Update group: `bb5fb7cc-ea82-4ffb-a930-8527cbf862ec`
- Runtime: `1.0.2`
- Mensaje: `Use identical primary button visuals`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/bb5fb7cc-ea82-4ffb-a930-8527cbf862ec>

Usar EAS Update para cambios de JS, textos, estilos, pantallas, assets JS y lógica compatible con el runtime instalado.

Crear APK/AAB nuevo cuando cambie algo nativo: librerías nativas, permisos, plugins, icono/splash, `app.json` nativo, SDK Expo o `runtimeVersion`.

Para lanzar EAS desde esta máquina hace falta iniciar sesión:

```bash
npx eas-cli login
pnpm build:android:preview
```

En CI, usar `EXPO_TOKEN`.
