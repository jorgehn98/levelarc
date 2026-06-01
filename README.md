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

- Build ID: `8bd52333-65eb-482b-91f3-4f73df2ff152`
- APK: <https://expo.dev/artifacts/eas/iguADr1T7x97fL73PZH7qS.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/8bd52333-65eb-482b-91f3-4f73df2ff152>
- Versión: `1.1.3`, Android versionCode `8`, runtimeVersion `1.1.3`.
- Verificado: contiene `lib/arm64-v8a/librnllama*.so` (14 librerías arm64), compila `:llama.rn:compileReleaseJavaWithJavac` y aplica retry/diagnóstico para instalación JSI.

Antes de publicar:

```bash
pnpm check
npx expo-doctor
```

Después decide el modo de entrega:

- OTA preview para cambios compatibles con el runtime instalado:

```bash
pnpm update:preview --message "Fix UI copy"
```

- Build preview completo solo si cambia el binario nativo:

```bash
pnpm build:android:preview
```

Nota: con `pnpm`, `expo-doctor` puede detectar una duplicidad de `expo-constants` causada por resoluciones internas de Expo SDK 56 (`expo-linking` pide `~56.0.14` y `expo-router` pide `^56.0.15`). El build preview `e37eafc1-40a9-49db-a913-5c58201e902d` terminó bien pese a ese aviso, así que no bloquea el APK interno actual.

`babel-preset-expo` está añadido como devDependency explícita porque el primer build EAS release no lo resolvía de forma transitiva con pnpm.

`@babel/plugin-transform-react-jsx` también está como devDependency explícita porque `expo-updates` lo necesita al crear recursos de updates en EAS con pnpm.

`llama.rn` debe estar aprobado en `package.json` → `pnpm.onlyBuiltDependencies`. Si pnpm ignora su postinstall, EAS puede generar un APK aparentemente correcto pero sin `librnllama*.so`; en Android el síntoma es `JSI bindings not installed`. Antes de dar por válido un APK con LLM, descargarlo e inspeccionar que contiene `lib/arm64-v8a/librnllama*.so`. Además, `llama.rn` 0.12.4 está parcheado en `patches/llama.rn@0.12.4.patch` para Android bridgeless de Expo SDK 56/RN 0.85: usa `ReactApplicationContext.getJSCallInvokerHolder()` en vez de `getCatalystInstance()`, devuelve errores nativos concretos en vez de `false` silencioso, y parchea `installJsi` para esperar a que estén todos los bindings globales antes de moverlos al closure interno. `src/ai/llamaEngine.ts` preinstala JSI antes de `initLlama` para cubrir la carrera de bindings asíncronos.

## EAS Update

EAS Update está configurado para parches internos compatibles:

- `preview`: APK interno de QA.
- `production`: futuro AAB/Play Store.

La app incluye en Ajustes un botón para buscar updates, descargarlos y reiniciar LevelArc. También puede recibir updates al arrancar según el comportamiento por defecto de `expo-updates`.

EAS Update no usa code signing por ahora. Expo lo reserva para cuentas Enterprise; activarlo en esta
cuenta bloquea `eas update`. Replantearlo solo si se sube de plan o si se acepta crear builds
nativos firmados con esa restricción.

Ojo: cambiar esta configuración es cambio nativo. Un APK creado cuando code signing estaba activo
seguirá esperando updates firmadas y no podrá consumir OTAs sin firma; el botón de buscar update puede
fallar con un error genérico aunque haya conexión. En ese caso toca instalar un nuevo APK `preview`
generado con la configuración actual sin code signing.

Último update `preview` publicado:

- Update group: `7b28fb3e-d793-42ac-90be-520c46cde00c`
- Runtime: `1.1.0`
- Mensaje: `Fix AI model download finalization`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/7b28fb3e-d793-42ac-90be-520c46cde00c>

Usar EAS Update para cambios de JS, textos, estilos, pantallas, assets JS y lógica compatible con el runtime instalado.

Crear APK/AAB nuevo cuando cambie algo nativo: librerías nativas, permisos, plugins, icono/splash, `app.json` nativo, SDK Expo o `runtimeVersion`.

## EAS Workflows

Los workflows EAS son manuales. Un push a `main` no debe crear builds completos.

- `.eas/workflows/build.yml`: manual, crea APK Android `preview`.
- `.eas/workflows/update-preview.yml`: manual, publica OTA al canal `preview`.

Regla rápida:

- JS/TS/UI/i18n/assets compatibles → OTA `preview`.
- Native/config/runtime/dependencias nativas → build `preview`.
- `production` siempre manual cuando toque release real.

Para lanzar EAS desde esta máquina hace falta iniciar sesión:

```bash
npx eas-cli login
pnpm build:android:preview
```

En CI, usar `EXPO_TOKEN`.
