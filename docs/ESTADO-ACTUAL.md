# LevelArc — Estado actual

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Ese documento sigue siendo la biblia original. Este archivo refleja lo implementado ahora mismo en el repo.

## Resumen

El MVP funcional está implementado en Expo + React Native + TypeScript. La app ya permite crear hábitos, marcarlos en el día, ganar/perder XP, ver progreso, cambiar idioma, exportar/importar backup y usar la primera identidad visual real de LevelArc.

Todavía no está lista para Play Store: faltan QA real en Android, validar assets en tamaños reales, pulido visual y seguir monitorizando el aviso de `expo-doctor`.

## Implementado

### Base técnica

- Expo SDK 56 con Expo Router.
- TypeScript estricto.
- Zustand para estado global.
- NativeWind/Tailwind configurado.
- Fuentes Inter y Orbitron.
- EAS configurado con `preview` y `production`.
- Proyecto EAS enlazado: `@jorgex-tech/levelarc`, projectId `2c6af84a-6180-48ac-ad12-f1b7b61bbf58`.
- `expo-splash-screen` configurado con el emblema LevelArc.
- `pnpm check` funcionando: typecheck + tests.

### Documentación

- `docs/LevelArc-PROYECTO.md`: biblia original.
- `DESIGN.md`: tokens y reglas de diseño.
- `README.md`: estado, comandos, arquitectura y build notes.
- `AGENTS.md`: instrucciones para agentes/coding assistants.

### Marca y assets

- Logos guardados en `assets/brand/`.
- `levelarc-emblem-rich-circuit.png`: versión rica para splash/brand.
- `levelarc-emblem-simple-dark.png`: versión simple para icono/fav.
- `levelarc-emblem-detailed-transparent.png`: emblema transparente para UI y adaptive foreground.
- SVG detallado y SVG simplificado preservados como fuentes editables.
- `app.json` ya apunta a icono, splash, favicon y adaptive icon derivados del set de marca.
- Onboarding y Progreso ya usan el emblema dentro de la UI.

### Navegación

- Tabs:
  - Hoy.
  - Hábitos.
  - Progreso.
  - Ajustes.
- Pantallas:
  - Crear hábito.
  - Editar hábito.
  - Onboarding inicial con marca real.
  - Rank-up placeholder.

### Hábitos

- Crear hábitos.
- Editar hábitos.
- Archivar hábitos.
- Importancia 1-5.
- Tipo binario.
- Tipo contable con meta diaria.
- Días de la semana.
- Hora de recordatorio.

### Hoy

- Lista de hábitos que aplican al día actual.
- Completar hábito binario.
- Sumar progreso `+1` en hábito contable.
- Fallar hábito.
- Deshacer acción del día.
- Progreso visual para contables.
- Estado pendiente/completado/fallado.

### XP y progreso

- Eventos de XP.
- `events` como fuente de verdad inmutable.
- `player` cacheado.
- Niveles según curva `50 * nivel^1.8`.
- Rangos E/D/C/B/A/S.
- Penalización con suelo de nivel: nunca baja de nivel/rango.
- Pantalla Progreso con rango, nivel, barra XP e historial.

### Misión diaria

- Misión fija: completar 3 hábitos.
- Progreso diario.
- Reclamar bonus de XP.

### Persistencia

- SQLite nativo en `src/db/repository.ts`.
- Drizzle schema en `src/db/schema.ts`.
- Migraciones generadas en `src/db/migrations/`.
- `src/db/migrate.ts` crea/actualiza tablas en runtime.
- Fallback web con AsyncStorage en `src/db/repository.web.ts`.

### Backup

- Exportación JSON vía share sheet.
- Importación/restauración pegando el JSON exportado desde Ajustes.
- La restauración reemplaza los datos locales y reprograma recordatorios nativos para hábitos activos.

### Idiomas

- ES/EN con diccionario tipado en `src/i18n/index.ts`.
- Español por defecto.

### Notificaciones

- Permisos locales.
- Recordatorios semanales nativos según días del hábito.
- Web usa stub en `src/lib/notifications.web.ts`.

## Desviaciones conscientes frente a la biblia inicial

### `habit_daily_progress`

La biblia conceptual no incluía tabla de progreso diario mutable. Se añadió porque los hábitos contables necesitan guardar progreso parcial, por ejemplo `3/4`, sin crear evento de XP hasta completar la meta.

Eventos sigue siendo la fuente de verdad del XP; `habit_daily_progress` solo representa estado del día.

### Cierre del día manual

La biblia habla de cierre del día con app activa. En el MVP se implementó como acción manual en Ajustes para evitar automatismos frágiles sin background jobs.

### Web fallback

El target real es Android/native con SQLite. Web usa AsyncStorage porque `expo-sqlite` web puede romper por WASM/SharedArrayBuffer. Es solo para preview y QA rápida.

## Verificación actual

Comandos verdes:

```bash
pnpm check
pnpm db:generate
pnpm exec expo export --platform web --output-dir .expo-export-check --clear
```

`react-doctor` quedó en 96/100 cuando se ejecutó. Los avisos restantes eran menores o falsos positivos por Expo Router/aliases.

`expo-doctor` queda 20/21 por duplicado `expo-constants` bajo pnpm. El build preview nativo ya se ha validado correctamente, así que no bloquea el APK interno actual.

Primer build preview Android lanzado en EAS:

- ID: `6914231b-d85a-464a-83a3-2794f392ca65`
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/6914231b-d85a-464a-83a3-2794f392ca65>
- Estado: falló en `:app:createBundleReleaseJsAndAssets` porque EAS no resolvió `babel-preset-expo` como dependencia directa.
- Acción tomada: `babel-preset-expo@~56.0.12` añadido como devDependency.

Build preview Android válido:

- ID: `86105d10-d74e-4300-870a-a0081e7aee6c`
- APK: <https://expo.dev/artifacts/eas/hybi6oNPHUQChncupNRcNd.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/86105d10-d74e-4300-870a-a0081e7aee6c>
- Estado: terminado correctamente.
- Fingerprint: `378cdeec443ebd5ab8ec2fa11c66dc4dcc6e394c`
- Perfil: `preview`, distribución interna, SDK `56.0.0`, version `1.0.0`, versionCode `1`.

## Estado real

MVP funcional: sí.

MVP listo para publicar: no.

Siguiente paso recomendado: instalar el APK preview en Android real/emulador y pasar QA manual.
