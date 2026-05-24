# LevelArc — Estado actual

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Ese documento sigue siendo la biblia original. Este archivo refleja lo implementado ahora mismo en el repo.

## Resumen

El MVP funcional está implementado en Expo + React Native + TypeScript. La app ya permite crear hábitos, marcarlos en el día, ganar/perder XP, ver progreso, cambiar idioma, exportar/importar backup y usar la primera identidad visual real de LevelArc.

El diseño base ya se está alineando con `docs/UI-UX`: tokens oscuros, cian de marca `#3FCAE6`, tipografía local Inter/Orbitron, componentes base con radios/bordes/glow disciplinados y cabecera de jugador en Hoy.

La primera pasada visual completa ya está aplicada en runtime: Hoy, Hábitos, Progreso, Ajustes, formulario de hábito, onboarding y rank-up usan el lenguaje de Sistema/RPG del kit de `docs/UI-UX`.

La pantalla de entrada/onboarding replica el flujo de `docs/UI-UX`: primera activación con nombre de cazador e "Iniciar ascensión"; siguientes aperturas con resumen de rango/XP/racha y "Continuar ascensión". El nombre se guarda en `player.nombre` y se puede modificar desde Ajustes.

La pantalla Hábitos se corrigió de nuevo tras QA en Android: el update OTA llegaba correctamente, pero la lista anterior con `FlatList` y anchos manuales dejaba huecos y podía renderizar mal los elementos. Ahora usa `ScrollView` + renderizado directo, igual que Hoy, con filtros, tarjetas y empty state a ancho completo. Las filas de hábito usan `View` como tarjeta real y dejan `Pressable` solo como objetivo táctil interno para evitar problemas de layout en Android.

Todavía no está lista para Play Store: faltan QA real en Android, validar assets en tamaños reales, pulido visual y seguir monitorizando el aviso de `expo-doctor`.

## Implementado

### Base técnica

- Expo SDK 56 con Expo Router.
- TypeScript estricto.
- Zustand para estado global.
- NativeWind/Tailwind configurado.
- Fuentes Inter y Orbitron autocontenidas en `assets/fonts/` para mantener el enfoque offline-first.
- EAS configurado con `preview` y `production`.
- EAS Update configurado con canales `preview` y `production`.
- `expo-updates` integrado con runtime policy `appVersion`.
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
- `docs/UI-UX/` contiene el design system y prototipos de referencia añadidos para la pasada visual.

### Navegación

- Tabs:
  - Hoy.
  - Hábitos.
  - Progreso.
  - Ajustes.
- Pantallas:
  - Crear hábito.
  - Editar hábito.
  - Entrada/onboarding con nombre inicial y modo retorno.
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

- Cabecera de jugador con rango, nivel, XP y racha.
- Misión diaria con jerarquía visual de Sistema, icono, contador y estado de bonus.
- Hábitos agrupados por pendiente/completado/fallado.
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
- Nombre del cazador guardado en `player.nombre`.
- Niveles según curva `50 * nivel^1.8`.
- Rangos E/D/C/B/A/S.
- Penalización con suelo de nivel: nunca baja de nivel/rango.
- Pantalla Progreso con rank hero, ruta E/D/C/B/A/S, estadísticas y eventos de historial.

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
- JSONs legacy de idioma eliminados; `src/i18n/index.ts` es la única fuente activa.

### Notificaciones

- Permisos locales.
- Recordatorios semanales nativos según días del hábito.
- Web usa stub en `src/lib/notifications.web.ts`.

### Actualizaciones internas

- EAS Update configurado.
- Canal `preview` para APK interno.
- Canal `production` para futura Play Store.
- Ajustes incluye acción para buscar update, descargarlo y reiniciar la app.
- La APK anterior no puede usar este flujo; hace falta instalar una nueva build que incluya `expo-updates`.

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

`react-doctor` quedó en 96/100 en una pasada anterior, pero actualmente falla con un error interno (`Cannot read properties of undefined (reading 'length')`). No usarlo como bloqueo hasta que la herramienta vuelva a ejecutar correctamente.

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

Build preview Android actual tras QA:

- ID: `a620ba5d-55a7-429c-bdb7-f67bda80bae9`
- APK: <https://expo.dev/artifacts/eas/mvPFAjN55GCXsGkBCnGxtx.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/a620ba5d-55a7-429c-bdb7-f67bda80bae9>
- Estado: terminado correctamente.
- Fingerprint: `2ad4b4a2ba5c04a2538a5959d9a4b35a8387142a`
- Perfil: `preview`, distribución interna, SDK `56.0.0`, version `1.0.1`, versionCode `2`.
- Cambios: hábitos nuevos sin días preseleccionados, chips seleccionados legibles en modo oscuro y test para weekdays lunes=1/domingo=7.

Build preview Android actual con EAS Update:

- ID: `f8c42fc9-d766-4e58-8859-d2b0a48e76e1`
- APK: <https://expo.dev/artifacts/eas/wHFNQL4UtiQ5TjGhaY1c1V.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/f8c42fc9-d766-4e58-8859-d2b0a48e76e1>
- Estado: terminado correctamente.
- Fingerprint: `5b23a8e20edbbc1bd0f4b5e29ca41b94ae1b4a56`
- Perfil: `preview`, canal `preview`, runtimeVersion `1.0.2`, SDK `56.0.0`, version `1.0.2`, versionCode `3`.
- Incluye `expo-updates`, botón de actualización interna en Ajustes y canales EAS Update.

Update `preview` inicial publicado:

- Update group: `ec18e587-1d1a-416a-ae1e-0afb28c12237`
- Runtime: `1.0.2`
- Mensaje: `Initial preview update`

Update `preview` con base de design system:

- Update group: `6efa229b-71a2-4dc8-9746-5fbb51bdb918`
- Runtime: `1.0.2`
- Mensaje: `Add design system foundation`
- Commit: `ef9115f52af4eba0ed36115fc986598e5ac05cf1`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/6efa229b-71a2-4dc8-9746-5fbb51bdb918>

Update `preview` con pasada visual completa:

- Update group: `996dc459-2fb5-4b3e-8ba0-1d058783e0a8`
- Runtime: `1.0.2`
- Mensaje: `Polish app UI from design kit`
- Commit: `1dc1b4f57da17f410476f051bfda52f9d9ddd823`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/996dc459-2fb5-4b3e-8ba0-1d058783e0a8>

Update `preview` con corrección de renderizado de Hábitos:

- Update group: `709aa195-5cd6-4c98-b05b-b97c1ea5c44f`
- Runtime: `1.0.2`
- Mensaje: `Fix habits screen rendering`
- Commit: `5fbe2af397f337e995ab9457dac41a7b928c8ff9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/709aa195-5cd6-4c98-b05b-b97c1ea5c44f>

Update `preview` final con filas de Hábitos ordenadas:

- Update group: `6f9318d9-082b-4cd3-a4a6-c75b5b6e6d5d`
- Runtime: `1.0.2`
- Mensaje: `Stabilize habit row layout`
- Commit: `aef11e7f93a50a32e629afcd00594e3f1095419c`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/6f9318d9-082b-4cd3-a4a6-c75b5b6e6d5d>

Build preview fallido durante la configuración de EAS Update:

- ID: `bd0a55b6-69a7-42db-838e-2dab83f5c4ac`
- Causa: `:app:createReleaseUpdatesResources` no encontraba `@babel/plugin-transform-react-jsx` bajo pnpm.
- Acción tomada: `@babel/plugin-transform-react-jsx` añadido como devDependency explícita.

## Estado real

MVP funcional: sí.

MVP listo para publicar: no.

Siguiente paso recomendado: instalar el APK preview en Android real/emulador y pasar QA manual.
