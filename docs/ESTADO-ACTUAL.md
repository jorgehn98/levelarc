# LevelArc — Estado actual

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Ese documento sigue siendo la biblia original. Este archivo refleja lo implementado ahora mismo en el repo.

## Resumen

El MVP funcional está implementado en Expo + React Native + TypeScript. La app ya permite crear hábitos, marcarlos en el día, ganar/perder XP, ver progreso, cambiar idioma, exportar/importar backup y usar la primera identidad visual real de LevelArc.

El diseño base ya se está alineando con `docs/UI-UX`: tokens oscuros, cian de marca `#3FCAE6`, tipografía local Inter/Orbitron y componentes base con radios/bordes/glow disciplinados.

La primera pasada visual completa ya está aplicada en runtime: Hoy, Hábitos, Progreso, Ajustes, formulario de hábito, onboarding y rank-up usan el lenguaje de Sistema/RPG del kit de `docs/UI-UX`.

La pantalla de entrada/onboarding replica el flujo de `docs/UI-UX`: primera activación con nombre de jugador e "Iniciar juego"; siguientes aperturas con resumen de rango/XP/racha y "Continuar jugando". El nombre se guarda en `player.nombre` y se puede modificar desde Ajustes. El CTA queda fijo abajo y el logo usa anillos animados reales; el modo retorno adapta acentos, glow y CTA al rango actual.

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
- Selector manual de icono para cada hábito.
- Selector manual de atributos para cada hábito.
- Cada hábito permite 1-3 atributos entre Fuerza, Vitalidad, Intelecto, Voluntad, Carisma y Destreza.
- Tipo binario.
- Tipo contable con meta diaria.
- Días de la semana.
- Hora de recordatorio.

### Hoy

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

- Pantalla Progreso concentra rango, nivel, XP y racha.
- Eventos de XP.
- `events` como fuente de verdad inmutable.
- `player` cacheado.
- Nombre del jugador guardado en `player.nombre`.
- XP de atributos guardado en `player.atributos_xp`.
- Al completar un hábito, el XP de atributo se reparte entre los atributos seleccionados: 1 atributo 100%, 2 atributos 50% cada uno, 3 atributos 33.33% cada uno.
- Los eventos guardan `attribute_delta` para que deshacer/recalcular no dependa de cambios futuros en el hábito.
- Pantalla Progreso muestra radar chart y barras por atributo.
- Multiplicador de racha por hábito capado a `x1.50`: 4+ días `x1.10`, 8+ `x1.20`, 15+ `x1.35`, 31+ `x1.50`.
- La racha por hábito cuenta ocurrencias programadas consecutivas, no días naturales: un hábito lunes/miércoles no se rompe por el martes, y uno solo de domingo avanza una vez por semana.
- Niveles según curva `50 * nivel^1.8`.
- Rangos E/D/C/B/A/S.
- Penalización con suelo de nivel: nunca baja de nivel/rango.
- Pantalla Progreso con rank hero, ruta E/D/C/B/A/S, estadísticas y eventos de historial.

### Misión diaria

- Misión dinámica: completar todos los hábitos programados para hoy.
- Si no hay hábitos programados para hoy, no hay misión diaria activa.
- Progreso diario basado en `completados / hábitos de hoy`.
- Reclamar bonus de XP escalado por carga diaria: 1 hábito +5 XP, 2-3 +10 XP, 4-5 +15 XP, 6+ +20 XP.
- Misión extra de racha perfecta: si los 6 días anteriores fueron perfectos, en el día 7 aparece una misión de racha. Al completar todos los hábitos del día 7 se puede reclamar un bonus extra de +30 XP.
- La racha de misión (`player.racha_misiones`) sube al reclamar la misión diaria normal; la racha perfecta se calcula desde `daily_missions`.

### Persistencia

- SQLite nativo en `src/db/repository.ts`.
- Drizzle schema en `src/db/schema.ts`.
- Migraciones generadas en `src/db/migrations/`.
- `src/db/migrate.ts` crea/actualiza tablas en runtime.
- `habits.icono` guarda el icono seleccionado y se conserva en backup/importación.
- `habits.atributos` guarda los atributos seleccionados y se conserva en backup/importación.
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

Build preview Android actual con actualización automática al arranque:

- ID: `6e5e6b06-bb05-481d-bcb0-85808bce2981`
- APK: <https://expo.dev/artifacts/eas/eCtjS5na8CNGaV6SxaiN2X.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/6e5e6b06-bb05-481d-bcb0-85808bce2981>
- Estado: terminado correctamente.
- Fingerprint: `2d844f8e79f4e7f2343903a11d0843d6228a08d5`
- Perfil: `preview`, canal `preview`, runtimeVersion `1.0.2`, SDK `56.0.0`, version `1.0.2`, versionCode `4`.
- Incluye comprobación automática de EAS Update al arrancar, manteniendo el botón manual de Ajustes como fallback.

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

Update `preview` con onboarding y nombre de jugador:

- Update group: `98feb9cf-db9d-45dd-9501-ab7c3126416e`
- Runtime: `1.0.2`
- Mensaje: `Add player name onboarding flow`
- Commit: `cc75f8aa55f7c8cca01ce1c50872c46d869736f2`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/98feb9cf-db9d-45dd-9501-ab7c3126416e>

Update `preview` con CTA fijo y motion real en onboarding:

- Update group: `d142d5c3-b55c-4465-983a-5312d92f90e6`
- Runtime: `1.0.2`
- Mensaje: `Fix onboarding CTA and motion`
- Commit: `0288fb02fd4456782da0822cde0d2b56b2b1429b`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/d142d5c3-b55c-4465-983a-5312d92f90e6>

Update `preview` alineando CTA onboarding con la referencia:

- Update group: `57dd61c0-fd65-4b29-83ff-6c6eecf4bb13`
- Runtime: `1.0.2`
- Mensaje: `Align onboarding CTA with reference`
- Commit: `12d99a52cb6afe1957b3d6ebfcb3ddf2dcec973a`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/57dd61c0-fd65-4b29-83ff-6c6eecf4bb13>

Update `preview` cambiando el rol de usuario a Jugador:

- Update group: `e4b7f8ed-70a2-4333-bcff-fd64f76f4b39`
- Runtime: `1.0.2`
- Mensaje: cambio de terminología a `Jugador` / `Player`
- Commit: `7b4dab63adb7338eb5c062a0d9306aa7d0837e8b`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/e4b7f8ed-70a2-4333-bcff-fd64f76f4b39>

Update `preview` corrigiendo entrada desde onboarding:

- Update group: `58cdb2ed-16e6-46c0-90d5-4b2bdeca1c69`
- Runtime: `1.0.2`
- Mensaje: evita el bucle de redirección al continuar desde onboarding
- Commit: `ae54d748bbecc084a79d51e4d5748fea2e0f074b`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/58cdb2ed-16e6-46c0-90d5-4b2bdeca1c69>

Update `preview` con comprobación automática al arranque:

- Update group: `1239381d-cd03-4c48-b500-658f7f38ca10`
- Runtime: `1.0.2`
- Mensaje: comprueba updates al arrancar y avisa para reiniciar si descarga uno
- Commit: `bf1fff37aa17566dd021331dd9fb5ae764d32f63`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/1239381d-cd03-4c48-b500-658f7f38ca10>

Update `preview` centrando el CTA de onboarding:

- Update group: `d58e75f6-da76-428b-b052-3ef3c756751f`
- Runtime: `1.0.2`
- Mensaje: centra el texto del CTA y cambia los textos a `Iniciar juego` / `Continuar jugando`
- Commit: `67e194c1b982e25a0cd9d497826af8ea1dc93704`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/d58e75f6-da76-428b-b052-3ef3c756751f>

Update `preview` simplificando cabecera de jugador:

- Update group: `f291b585-62c1-4596-a722-2505a064e169`
- Runtime: `1.0.2`
- Mensaje: elimina la cabecera de jugador de Hoy y deja Ajustes con identidad simple
- Commit: `76d88882f6d1dbeecab6756b59797a3a695eb459`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/f291b585-62c1-4596-a722-2505a064e169>

Update `preview` capando el multiplicador de racha por hábito:

- Update group: `ddd5452e-5106-4479-9c82-49d4015e708c`
- Runtime: `1.0.2`
- Mensaje: `Cap habit streak multiplier`
- Commit: `2a3755c1a52cfac7fdd40ca2eb6b7b692fe9d0b9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/ddd5452e-5106-4479-9c82-49d4015e708c>

Update `preview` respetando días programados en rachas:

- Update group: `d2cc9514-5569-487d-870d-a3b1b23d87ad`
- Runtime: `1.0.2`
- Mensaje: `Respect habit schedules in streaks`
- Commit: `ec2e0b780937dd013a634914b31cb262d5dd41e4`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/d2cc9514-5569-487d-870d-a3b1b23d87ad>

Build preview fallido durante la configuración de EAS Update:

- ID: `bd0a55b6-69a7-42db-838e-2dab83f5c4ac`
- Causa: `:app:createReleaseUpdatesResources` no encontraba `@babel/plugin-transform-react-jsx` bajo pnpm.
- Acción tomada: `@babel/plugin-transform-react-jsx` añadido como devDependency explícita.

## Estado real

MVP funcional: sí.

MVP listo para publicar: no.

Siguiente paso recomendado: instalar el APK preview en Android real/emulador y pasar QA manual.
