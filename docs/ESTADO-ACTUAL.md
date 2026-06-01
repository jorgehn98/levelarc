# LevelArc — Estado actual

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Ese documento sigue siendo la biblia original. Este archivo refleja lo implementado ahora mismo en el repo.

## Resumen

El MVP funcional está implementado en Expo + React Native + TypeScript. La app ya permite crear hábitos, marcarlos en el día, ganar/perder XP, ver progreso, cambiar idioma, exportar/importar backup y usar la primera identidad visual real de LevelArc.

La app ya ha entrado en gamificación avanzada (v2.0): tiene una economía propia de Esencia (moneda gastable, distinta del XP) y una Tienda del Sistema donde se canjea Esencia por cosméticos (títulos y auras) que no afectan al motor de XP.

El diseño base ya se está alineando con `docs/UI-UX`: tokens oscuros, cian de marca `#3FCAE6`, tipografía local Inter/Orbitron y componentes base con radios/bordes/glow disciplinados.

La primera pasada visual completa ya está aplicada en runtime: Hoy, Hábitos, Progreso, Ajustes, formulario de hábito, onboarding y rank-up usan el lenguaje de Sistema/RPG del kit de `docs/UI-UX`.

La pantalla de entrada/onboarding replica el flujo de `docs/UI-UX`: primera activación con nombre de jugador e "Iniciar juego"; siguientes aperturas con resumen de rango/XP/racha y "Continuar jugando". El nombre se guarda en `player.nombre` y se puede modificar desde Ajustes. El CTA queda fijo abajo y el logo usa anillos animados reales; el modo retorno adapta acentos, glow y CTA al rango actual.

La pantalla Hábitos se corrigió de nuevo tras QA en Android: el update OTA llegaba correctamente, pero la lista anterior con `FlatList` y anchos manuales dejaba huecos y podía renderizar mal los elementos. Ahora usa `ScrollView` + renderizado directo, igual que Hoy, con filtros, tarjetas y empty state a ancho completo. Las filas de hábito usan `View` como tarjeta real y dejan `Pressable` solo como objetivo táctil interno para evitar problemas de layout en Android.

La primera mejora de producto v1.3 ya está aplicada: tocar un hábito en la pantalla Hábitos abre un detalle con métricas útiles del hábito, y en Hoy solo se abre ese detalle desde el icono para no interferir con completar/fallar/deshacer. La edición queda detrás del botón Editar dentro del detalle.

La QA inicial en Android real ya está validada por el usuario: la app funciona bien en el móvil y el icono de marca se ve correctamente. Aun así, la app no se quiere publicar todavía: Play Store/App Store quedan como paso final, cuando el producto esté más completo y no solo como MVP funcional.

## Implementado

### Base técnica

- Expo SDK 56 con Expo Router.
- TypeScript estricto.
- Zustand para estado global.
- Fecha, hora y zona horaria salen siempre del dispositivo: no se consulta Internet para decidir qué hábitos tocan hoy.
- La app detecta cambio de día local al volver del background y con app abierta mediante una comprobación periódica.
- La app cierra automáticamente los días pasados desde el último día activo local: los hábitos programados que quedaron pendientes con progreso 0 pasan a fallados al arrancar o al cruzar medianoche.
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
  - Detalle de hábito.
  - Editar hábito.
  - Entrada/onboarding con nombre inicial y modo retorno.
  - Rank-up cinematic con anillos/glow de rango y acceso demo desde Ajustes.

### Hábitos

- Crear hábitos.
- Editar hábitos.
- Archivar hábitos.
- Desarchivar hábitos.
- Archivar hábitos pide confirmación antes de retirar la misión activa y conserva el historial.
- Desarchivar hábitos pide confirmación, devuelve la misión al registro activo y reprograma recordatorios nativos si estaban configurados.
- Importancia 1-5.
- Selector manual de icono para cada hábito.
- Selector manual de atributos para cada hábito.
- Cada hábito permite 1-3 atributos entre Fuerza, Vitalidad, Intelecto, Voluntad, Carisma y Destreza.
- Detalle de hábito con estado de hoy, racha actual, consistencia de 30 días, últimos 7 días hacia atrás e historial reciente del hábito.
- En Hoy, el detalle se abre solo tocando el icono del hábito; en Hábitos, tocando la fila completa.
- Tipo binario.
- Tipo contable con meta diaria.
- Días de la semana.
- Hora de recordatorio opcional mediante selector de hora; se puede limpiar para dejar el hábito sin notificación.

### Hoy

- Misión diaria compacta con panel de Sistema, icono, contador y progreso segmentado.
- Hábitos agrupados por Pendientes/Completados/Fallidos con cabecera, contador y línea de sección.
- Tarjetas de hábito rediseñadas en estilo neón: rail lateral, icono, pill de estado, metadatos XP/atributos, CTA principal y fallo separado.
- Lista de hábitos que aplican al día actual.
- Completar hábito binario.
- Sumar progreso `+1` en hábito contable.
- Fallar hábito.
- Deshacer acción del día.
- Progreso visual para contables.
- Estado pendiente/completado/fallado.
- Estado vacío pulido con mensaje del Sistema y CTA directo para crear el primer hábito.

### XP y progreso

- Pantalla Progreso concentra rango, nivel, XP y racha.
- Eventos de XP.
- `events` como fuente de verdad inmutable.
- `player` cacheado.
- El recalculo de `player` conserva los bonus de misiones ya reclamadas al combinar eventos de hábitos con `daily_missions`.
- Si una misión diaria reclamada deja de estar completa al deshacer o cambiar el estado del día, se revoca la reclamación y el recálculo elimina ese bonus del `player`.
- Nombre del jugador guardado en `player.nombre`.
- XP de atributos guardado en `player.atributos_xp`.
- Al completar un hábito, el XP base es importancia x5 antes del multiplicador de racha: importancia 1 = 5 XP, 2 = 10 XP, 3 = 15 XP, 4 = 20 XP, 5 = 25 XP.
- Al fallar un hábito, la penalización es el 80% del XP base sin multiplicador de racha: importancia 1 = -4 XP, 2 = -8 XP, 3 = -12 XP, 4 = -16 XP, 5 = -20 XP, siempre con suelo de nivel.
- Al completar un hábito, el XP de atributo aplica un potenciador fijo x1.5 sobre el XP positivo del hábito y luego se reparte entre los atributos seleccionados: 1 atributo 100%, 2 atributos 50% cada uno, 3 atributos 33.33% cada uno.
- Los niveles de atributo usan la misma curva que el nivel de jugador: `30 * (nivel - 1)^1.6`.
- Los eventos guardan `attribute_delta` para que deshacer/recalcular no dependa de cambios futuros en el hábito.
- Pantalla Progreso muestra radar chart y barras por atributo; el radar visual escala hasta nivel 20 para no saturarse demasiado pronto.
- Debajo del radar, una lectura por atributos (`AttributeRow`) con icono, nombre, nivel y barra de progreso al siguiente nivel para los 6 atributos.
- Pantalla Progreso incluye actividad de los últimos 7 días y mapa de calor de 12 semanas basado en eventos completados.
- Multiplicador de racha por hábito capado a `x1.50`: 4+ días `x1.10`, 8+ `x1.20`, 15+ `x1.35`, 31+ `x1.50`.
- La racha por hábito cuenta ocurrencias programadas consecutivas, no días naturales: un hábito lunes/miércoles no se rompe por el martes, y uno solo de domingo avanza una vez por semana.
- Niveles según curva `30 * (nivel - 1)^1.6`, con nivel 1 en 0 XP.
- Rangos E/D/C/B/A/S.
- Penalización con suelo de nivel: nunca baja de nivel/rango.
- Pantalla Progreso con rank hero, actividad semanal, mapa de calor, ruta E/D/C/B/A/S, estadísticas y eventos de historial.

### Misión diaria

- Misión dinámica: completar todos los hábitos programados para hoy.
- Si no hay hábitos programados para hoy, no hay misión diaria activa.
- Progreso diario basado en `completados / hábitos de hoy`.
- Reclamar bonus de XP escalado por carga diaria: 1 hábito +5 XP, 2-3 +10 XP, 4-5 +15 XP, 6+ +20 XP.
- Misión extra de racha perfecta: si los 6 días anteriores fueron perfectos, en el día 7 aparece una misión de racha. Al completar todos los hábitos del día 7 se puede reclamar un bonus extra de +30 XP.
- La racha de misión (`player.racha_misiones`) cuenta misiones diarias reclamadas en días consecutivos; si hay un día con misión no reclamada, la siguiente reclamación reinicia la racha. La racha perfecta se calcula desde `daily_missions`.
- Al arrancar la app o cambiar de día, se ejecuta cierre automático hasta ayer usando `levelarc.lastActiveDate` en almacenamiento local. La primera ejecución inicializa el marcador sin penalizar historial antiguo.

### Economía (Esencia)

- Moneda de juego "Esencia" gastable, distinta del XP, guardada en `player.esencia`.
- Se gana al completar un hábito (importancia x2), al reclamar la misión diaria (3/5/8/12 según número de hábitos del día), al reclamar la racha perfecta (+25) y al subir de nivel (`10 + (nivel - 1) * 5`: nivel 2 = 15, nivel 10 = 55).
- Se revierte de forma exacta y no farmeable: al deshacer un completado se resta la esencia que otorgó ese evento (persistida en `events.esencia_otorgada`); al revocarse una misión reclamada se resta la persistida en `daily_missions.esencia_otorgada`.
- La esencia por subida de nivel es idempotente con el marcador monotónico `player.nivel_esencia_otorgado`. En instalaciones existentes se ancla al nivel actual en la migración, así la economía empieza a contar desde ahora sin regalo retroactivo.
- Lógica pura en `src/core/economy.ts` con tests; persistencia en `src/db/repository.ts` y `src/db/repository.web.ts`.
- Se muestra en Hoy y Progreso con el componente `EssenceBadge` (icono Gem).
- Migraciones 0006 (`player.esencia`, `player.nivel_esencia_otorgado`) y 0007 (`events.esencia_otorgada`, `daily_missions.esencia_otorgada`).

### Tienda del Sistema

- Pantalla `app/shop.tsx` (ruta `/shop`), accesible desde Ajustes (sección "Sistema") y desde Progreso (junto al balance de Esencia).
- Se gasta Esencia en cosméticos que no afectan al motor de XP.
- Títulos de Jugador: Despierto (30), Cazador (80, nivel 5), Implacable (150, nivel 10), Soberano de Sombras (300, rango B), Monarca del Sistema (600, rango S).
- Auras del emblema: Cian (default gratis), Ámbar (50), Violeta (120, nivel 8), Esmeralda (200, nivel 15), Carmesí (350, rango A), Dorada (700, rango S).
- Cada item puede tener requisito de nivel y/o rango además del coste. Compra atómica en transacción con validación catálogo → poseído → requisito → esencia.
- Tabla `player_rewards` (UNIQUE por `reward_id`) con `player.titulo_equipado` y `player.aura_equipada`.
- El título equipado se muestra junto al nombre del jugador en onboarding (modo retorno) y Progreso. El aura equipada tiñe el glow del emblema en onboarding; el cian por defecto mantiene el look actual.
- Catálogo y reglas puras en `src/core/shop.ts` con tests. Migración 0008 (`player_rewards` + columnas de `player`).
- Backup export/import cubre las tablas y columnas nuevas y restaura backups antiguos con defaults seguros.

### Logros

- 21 logros en 6 categorías: Primeros pasos, Constancia, Progresión, Misiones, Atributos y Colección.
- Catálogo puro en `src/core/achievements.ts`: cada logro tiene su condición `isUnlocked(ctx)`; evaluador testeado.
- Se evalúan tras cada acción y al arrancar. Al desbloquear otorgan Esencia (de 10 a 300 según dificultad).
- Persistencia en tabla `achievements_unlocked` (migración 0009) con `INSERT OR IGNORE` para idempotencia: la Esencia solo se otorga si la fila se inserta de verdad.
- En el primer arranque tras actualizar, los logros ya cumplidos se desbloquean en silencio (sin avalancha de avisos) y se otorga su Esencia de golpe; a partir de ahí cada nuevo logro se celebra.
- Pantalla `app/achievements.tsx` (ruta `/achievements`), accesible desde Progreso y Ajustes, con desglose por categoría, contador "X/21" y estado bloqueado/desbloqueado. Los bloqueados se ven igual, como meta aspiracional.

### Feedback y celebraciones

- Overlay global de celebración `CelebrationOverlay` (sustituye al toast solo-logros): una cola que celebra tres tipos de evento con tarjeta flotante animada — logro desbloqueado, subida de nivel del jugador y subida de nivel de atributo.
- Detección automática de subidas tras las acciones que dan XP: si el jugador sube de nivel se celebra (salvo que coincida con un cambio de rango, que lo cubre la cinemática); si sube el nivel de un atributo, se celebra ese atributo.
- La cinemática de ascenso de rango se dispara sola al subir de rango jugando (antes solo existía el botón demo de Ajustes). Recibe rango origen/destino para narrar "E → D" y está protegida contra abrir dos veces.
- Micro-feedback al completar un hábito: un destello sutil en la tarjeta.
- Mejor lectura de progreso por atributos en Progreso: componente `AttributeRow` con icono, nombre, nivel y barra de progreso al siguiente nivel para los 6 atributos, debajo del radar.

### El Sistema (IA local)

- Chat con personalidad RPG ("el Sistema", tono Solo Leveling: seco, imperativo, breve) accesible desde Hoy (tarjeta "Hablar con el Sistema") y Ajustes (sección Sistema). Pantalla `app/system-chat.tsx`.
- Funciona offline con un motor determinista por plantillas (reglas), no un LLM todavía.
- Arquitectura enchufable: interface `SystemChatEngine` en `src/ai/engine.ts` con dos adapters, `templateEngine` (activo) y `llamaEngine` (STUB que delega en plantillas hasta que haya build nativo); selector en `src/ai/index.ts`.
- Contexto determinista armado desde SQLite en `src/core/aiContext.ts` (`SystemContext` + serialización) y voz por reglas en `src/core/systemVoice.ts` (greeting proactivo según estado y respuestas por intención), ambos puros y testeados.
- Bilingüe sin acoplar el motor al idioma: el motor devuelve `{key, params}` y el store `src/stores/aiStore.ts` traduce con i18n y guarda el texto resuelto. Banco de frases `sys_*` en ES/EN.
- Persistencia en tablas `ai_profile` (singleton: enabled, engine `'template'|'llama'`, modelStatus, modelPath) y `ai_messages` (historial), migración 0010. Export cubre ambas; import restaura mensajes pero reinicia el perfil IA a plantilla segura porque `modelPath` es una ruta local del dispositivo y no es portable.
- Entregado por OTA (es JS puro). El motor de plantillas funciona en runtime `1.0.2`.
- Mensaje del Sistema en Hoy: un banner que te recibe cada día con una línea contextual del Sistema. Instantáneo con plantillas; cuando la IA está activa lo genera Gemma y se cachea por día. Componente `SystemMessageCard`.
- Apariciones autónomas del Sistema: la IA no es solo chat. El Sistema salta solo en momentos clave (completar la misión diaria, volver tras ausencia, hito de racha, cercanía a nivel, misión fallida, subida de nivel y racha rota) con un personaje y bocadillo (overlay `SystemInterjectionOverlay`), con cooldown (1/sesión, 1/día por trigger). El botón "Continuar" abre el chat heredando el contexto de por qué saltó. Personaje placeholder enchufable (sprites en `assets/character/`). Toggle "Apariciones del Sistema" en Ajustes. Funciona offline con plantillas; con IA activa lo genera Gemma.
- La IA es OPCIONAL: la app funciona perfecta sin modelo. Se activa con un botón que descarga el modelo dentro de la app (Ajustes → Sistema → "IA avanzada"). El modelo NO viene por OTA ni en el APK: se descarga on-device bajo demanda.
- LLM local real (Fase 5B) implementado en código detrás de la misma arquitectura enchufable: `llama.rn` 0.12.4 + Gemma 4 E2B GGUF Q4_K_M (~3,1 GB) en `src/ai/llamaEngine.ts` (motor real con carga perezosa, prompt manual Gemma 4 y stops correctos), descarga del modelo on-device (`src/ai/modelManager.ts`, NEW File API) con validación práctica de tamaño exacto + stamp local. No se calcula SHA-256 completo en JS porque en Android deja la descarga clavada al 100% durante el cierre. Pantalla de gestión en `app/system-ai.tsx` (Ajustes → Sistema → "IA avanzada" y cabecera del chat).
- Si el LLM falla en device (OOM, timeout, fichero inválido o incompatibilidad nativa), el chat degrada automáticamente al motor por plantillas para no dejar al usuario en un bucle de "El Sistema no responde".
- Ajuste posterior: si el fichero del modelo sigue descargado y válido, un fallo del motor LLM ya no marca la descarga como fallida. Solo apaga `engine` a `template`, guarda el error runtime en AsyncStorage y Ajustes → IA del Sistema lo muestra. La carga de `llama.rn` usa parámetros más conservadores (`n_ctx=1024`, `n_threads=2`, `no_extra_bufts`) para reducir riesgo de OOM en Android. Además preinstala JSI antes de `initLlama`, parchea `llama.rn` para esperar a que aparezcan todos los bindings JSI antes de consumirlos, y el patch nativo ya no oculta el motivo real si Android no puede instalarlos. El patch nativo (`1.1.5`) deja de capturar `JavaScriptContextHolder` y usa el runtime que RN 0.85 entrega por `CallInvoker`. La pantalla de IA incluye un diagnóstico manual por fases para aislar el primer fallo real si el chat vuelve a caer a plantillas, y el error runtime guardado incluye source, timestamp, platform, engine/model status, existencia del fichero y stack truncado.
- El LLM NO llega por OTA: solo por build nativo nuevo. El APK preview actual es `5cf2587d-df9d-4020-a247-2dffdb48fa79` (`1.1.5`, versionCode `10`, runtime `1.1.5`), URL `https://expo.dev/artifacts/eas/ctG9fY6ohiBC8AZebmwBE2.apk`. Está verificado con 14 librerías `lib/arm64-v8a/librnllama*.so`, wrapper JNI recompilado con runtime del `CallInvoker` y bundle con espera robusta de bindings JSI; pendiente de validación funcional en device real. Detalle en `docs/IA-SISTEMA.md`.

### Persistencia

- SQLite nativo en `src/db/repository.ts`.
- Drizzle schema en `src/db/schema.ts`.
- Migraciones generadas en `src/db/migrations/`.
- `src/db/migrate.ts` crea/actualiza tablas en runtime.
- `habits.icono` guarda el icono seleccionado y se conserva en backup/importación.
- `habits.atributos` guarda los atributos seleccionados y se conserva en backup/importación.
- Fallback web con AsyncStorage en `src/db/repository.web.ts`.
- Índices nativos añadidos en `events` para historial global, historial por hábito y cálculo de rachas (`0011_sour_hemingway.sql`).

### Backup

- Exportación JSON vía share sheet.
- Importación/restauración pegando el JSON exportado desde Ajustes.
- La restauración pide confirmación antes de sobrescribir datos locales y en native se aplica dentro de una transacción exclusiva para evitar estados parciales si falla.
- La restauración reemplaza los datos locales y reprograma recordatorios nativos para hábitos activos.
- La importación tiene límites básicos de tamaño/cantidad para evitar backups absurdamente grandes y reinicia el estado/ruta del modelo IA a plantilla segura.

### Idiomas

- ES/EN con diccionario tipado en `src/i18n/index.ts`.
- Español por defecto.
- JSONs legacy de idioma eliminados; `src/i18n/index.ts` es la única fuente activa.
- El copy visible del Sistema está centralizado en i18n para ES/EN en onboarding, modales, formularios y rank-up.

### Ajustes

- Pantalla rediseñada con secciones compactas: Preferencias, Datos, Demo, Zona peligrosa y Acerca.
- Preferencias incluye idioma, nombre de jugador, tema fijo, recordatorio diario con toggle, vibración y sonido.
- Demo incluye acceso a la cinemática de ascenso de rango y a la pantalla de inicio.
- Zona peligrosa incluye cerrar día y resetear todo con confirmación.

### Pulido UX

- Hábitos y Hoy tienen estados vacíos más claros, con tono de Sistema y acción directa cuando procede.
- Textos del Sistema revisados para sonar más secos, consistentes y centrados en misiones/registro local.
- Rangos E/C/B/A ajustados para mejorar contraste como texto/acento sobre fondos oscuros; D y S ya tenían contraste suficiente.

### Notificaciones

- Permisos locales.
- Recordatorios semanales nativos según días del hábito.
- Recordatorio diario configurable de cierre del día con selector de hora, guardado como preferencia local del dispositivo y programado en hora local.
- Web usa stub en `src/lib/notifications.web.ts`.

### Actualizaciones internas

- EAS Update configurado.
- Canal `preview` para APK interno.
- Canal `production` para futura Play Store.
- Ajustes incluye acción para buscar update, descargarlo y reiniciar la app.
- La APK anterior no puede usar este flujo; hace falta instalar una nueva build que incluya `expo-updates`.
- Workflows EAS separados y manuales: `.eas/workflows/build.yml` crea APK `preview` solo bajo demanda, y `.eas/workflows/update-preview.yml` publica OTA `preview` solo bajo demanda. Los pushes a `main` no deben disparar builds completos automáticamente.
- Code signing de EAS Update está desactivado. Expo lo bloquea sin plan Enterprise y rompía `eas update`. Los APK generados mientras code signing estaba activo no pueden consumir OTAs sin firma y pueden mostrar error genérico de conexión al buscar updates. Solución: instalar un APK `preview` nuevo generado con la config actual sin code signing.

## Desviaciones conscientes frente a la biblia inicial

### `habit_daily_progress`

La biblia conceptual no incluía tabla de progreso diario mutable. Se añadió porque los hábitos contables necesitan guardar progreso parcial, por ejemplo `3/4`, sin crear evento de XP hasta completar la meta.

Eventos sigue siendo la fuente de verdad del XP; `habit_daily_progress` solo representa estado del día.

### Cierre del día automático

La app no depende de background jobs ni de Internet. Guarda el último día activo local y, al volver a abrir o al cruzar medianoche con la app abierta, cierra todos los días pendientes hasta ayer. Ajustes mantiene `Cerrar día` como fallback manual.

### Web fallback

El target real es Android/native con SQLite. Web usa AsyncStorage porque `expo-sqlite` web puede romper por WASM/SharedArrayBuffer. Es solo para preview y QA rápida.

## Verificación actual

Comandos verdes:

```bash
pnpm check
pnpm db:generate
pnpm exec expo export --platform web --output-dir .expo-export-check --clear
npx -y react-doctor@latest . --verbose --diff
```

`react-doctor` queda 100/100 sobre los cambios sin warnings.

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

Build preview Android con LLM (llama.rn + Gemma 4 E2B):

- ID: `1c04b308-ea9a-44a9-afb1-da7ecb837927`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/1c04b308-ea9a-44a9-afb1-da7ecb837927>
- Estado: terminado correctamente.
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.0`, version `1.1.0`, versionCode `5`.
- Compiló con `llama.rn` 0.12.4 (New Arch). El config plugin cargó sin el gotcha `ERR_REQUIRE_ESM` porque EAS usa Node 22.15.1 (fijado en `eas.json`). El postinstall de `llama.rn` descargó los binarios nativos (`allowBuilds` `llama.rn: true` en `pnpm-workspace`).
- Gotcha del build: el primer intento falló por un bug de `eas-cli` en Windows (git clone `file:///C:/...` con git 2.53 da código 128, "does not appear to be a git repository"). Se resolvió con `EAS_NO_VCS=1` para empaquetar el working dir sin git clone.
- Pendiente: validación en device real (cargar el GGUF de ~3,1 GB, probar chat y apariciones).

Build preview Android actual con LLM diagnostics y EAS Update sin code signing:

- ID: `e37eafc1-40a9-49db-a913-5c58201e902d`
- APK: <https://expo.dev/artifacts/eas/u6kBoGBLi8EzzfmEdZtEet.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/e37eafc1-40a9-49db-a913-5c58201e902d>
- Estado: terminado correctamente.
- Fingerprint: `6d61e4d4e680d39f836c293fb329a116e16f85e0`
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.0`, version `1.1.0`, versionCode `5`.
- Commit: `84264be` (`Add LLM runtime diagnostics`).
- Nota posterior: este APK NO es válido para IA local; al inspeccionarlo no contiene `lib/arm64-v8a/librnllama*.so` porque EAS/pnpm ignoró el postinstall de `llama.rn`. Sí compiló, pero en device sigue dando `JSI bindings not installed`.
- Pendiente: sustituir por build `1.1.1` / versionCode `6` con `llama.rn` aprobado en `pnpm.onlyBuiltDependencies` y verificar el APK antes de instalar.


Patch Android bridgeless para llama.rn 0.12.4:

- Problema: incluso con `.so` nativas presentes, `llama.rn` 0.12.4 puede devolver `JSI bindings not installed` en Expo SDK 56 / RN 0.85 bridgeless porque su módulo Android llama a `context.getCatalystInstance().getJSCallInvokerHolder()`.
- Evidencia: issue upstream `mybigday/llama.rn#354` describe el mismo fallo en Expo/RN bridgeless; RN 0.85 expone `ReactContext.getJSCallInvokerHolder()` para este caso.
- Fix local: `patches/llama.rn@0.12.4.patch`, aplicado por `pnpm.patchedDependencies`, cambia `RNLlamaModule.java` para usar `context.getJSCallInvokerHolder()` y sincronizar `JavaScriptContextHolder` antes de instalar JSI.
- Build nativo generado: `aad21dd9`, `1.1.2`, Android versionCode `7`, runtimeVersion `1.1.2`.


Build preview Android actual con patch JSI bridgeless:

- ID: `aad21dd9-d706-4e48-b1ec-f835ccf28374`
- APK: <https://expo.dev/artifacts/eas/n6r8rLtNE1HaZ5Mk9QcKq1.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/aad21dd9-d706-4e48-b1ec-f835ccf28374>
- Estado: terminado correctamente.
- Fingerprint: `9e98f365cd0766f978cbba3f70f4c87c41425a2b`
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.2`, version `1.1.2`, versionCode `7`.
- Commit: `9f2887b` (`Pin pnpm version for EAS builds`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so` y compila con `patches/llama.rn@0.12.4.patch`, que evita `getCatalystInstance()` en Android bridgeless.
- Pendiente: instalar en Android real y validar IA local completa.

Build preview Android actual con runtime JSI vía CallInvoker:

- ID: `5cf2587d-df9d-4020-a247-2dffdb48fa79`
- APK: <https://expo.dev/artifacts/eas/ctG9fY6ohiBC8AZebmwBE2.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/5cf2587d-df9d-4020-a247-2dffdb48fa79>
- Estado: terminado correctamente.
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.5`, version `1.1.5`, versionCode `10`.
- Commit: `c45e521` (`Fix llama JSI runtime install`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so`; `librnllama_jni*.so` contiene las trazas `CallInvoker runtime` / `installing JSI bindings on JS invoker runtime`; el bundle contiene `LevelArc 1.1.5` y la espera robusta de JSI.
- Pendiente: instalar en Android real, confirmar en Ajustes IA `LevelArc 1.1.5 · build 10` y validar que el chat usa Gemma sin caer a plantillas.

Build preview Android actual con espera robusta de bindings JSI:

- ID: `f95b548a-d6d1-4379-91f2-bfee60649269`
- APK: <https://expo.dev/artifacts/eas/wMV4BwbAmNUZJH8ch8xwEe.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/f95b548a-d6d1-4379-91f2-bfee60649269>
- Estado: terminado correctamente.
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.4`, version `1.1.4`, versionCode `9`.
- Commit: `c2fbb03` (`Harden llama JSI binding install`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so`, recompila `librnllama_jni*.so` y el bundle contiene los mensajes de espera robusta (`JSI bindings not installed after native install`, `Native install returned false`).
- Pendiente: instalar en Android real, confirmar en Ajustes IA `LevelArc 1.1.4 · build 9` y validar que el chat usa Gemma sin caer a plantillas.

Build preview Android válido con LLM native libs verificadas:

- ID: `114d891f-0f8e-4dd9-8706-b6dec7d886e1`
- APK: <https://expo.dev/artifacts/eas/38VCEbYsGPo5eFAYrXCVJZ.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/114d891f-0f8e-4dd9-8706-b6dec7d886e1>
- Estado: terminado correctamente.
- Fingerprint: `88fe111454de9c5b049ac5ac5ab003aa9311401f`
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.1`, version `1.1.1`, versionCode `6`.
- Commit: `68b8412` (`Fix llama native artifact build approval`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so`, incluyendo `librnllama.so` y `librnllama_jni*.so`. Este sí corrige la causa raíz del error `JSI bindings not installed` causado por el APK anterior sin `.so` nativas.
- Pendiente: instalar en Android real y validar IA local completa.

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

Update `preview` refrescando al cambiar el día local:

- Update group: `2adc1e21-aff1-4c41-8009-4ff97e0bd818`
- Runtime: `1.0.2`
- Mensaje: `Refresh app on local day changes`
- Commit: `a4148c60e8e31e07ff75231e7b60050080ecd79c`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/2adc1e21-aff1-4c41-8009-4ff97e0bd818>

Update `preview` con recordatorio configurable de cierre:

- Update group: `7d1ebc24-8f8d-436b-a484-cca0c362a49e`
- Runtime: `1.0.2`
- Mensaje: `Add end of day reminder setting`
- Commit: `79a7ea0da3cf4acf4bac504ed7533473eb999254`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/7d1ebc24-8f8d-436b-a484-cca0c362a49e>

Update `preview` con selector de hora para recordatorios:

- Update group: `70e19809-c073-484f-ba91-ec052fb3165f`
- Runtime: `1.0.2`
- Mensaje: `Use time picker for reminders`
- Commit: `5c5cb9a0889c4f56a0095a2257b9fa8deb485877`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/70e19809-c073-484f-ba91-ec052fb3165f>

Update `preview` con pulido visual de Hoy:

- Update group: `b82db624-fa8b-422a-a546-d4395542338e`
- Runtime: `1.0.2`
- Mensaje: `Polish today habit cards`
- Commit: `096ea469e048a0f1a9e4d2fd0e04984b3a61125a`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/b82db624-fa8b-422a-a546-d4395542338e>

Update `preview` con widgets de actividad en Progreso:

- Update group: `9e86fe1b-9162-49d3-8ee6-fb464a422340`
- Runtime: `1.0.2`
- Mensaje: `Add progress activity widgets`
- Commit: `73520cd542ddd7c099270dbe6def3e41ace462a9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/9e86fe1b-9162-49d3-8ee6-fb464a422340>

Update `preview` con rediseño de Ajustes:

- Update group: `2f83ad06-7893-4b49-922d-71c4b7364c5a`
- Runtime: `1.0.2`
- Mensaje: `Redesign settings screen`
- Commit: `5d9aaa41e246c0b59d7cafd8ea38e5ccd7dd7bde`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/2f83ad06-7893-4b49-922d-71c4b7364c5a>

Update `preview` con botones del formulario de habito:

- Update group: `bf0c34fe-544c-40d9-b587-866d2efd38a3`
- Runtime: `1.0.2`
- Mensaje: `Polish habit form actions`
- Commit: `cafca2e8a44018834ff2072486d6e7c5f4fff88a`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/bf0c34fe-544c-40d9-b587-866d2efd38a3>

Update `preview` con botones del formulario de edicion de habito:

- Update group: `580f555f-0ad5-4ed0-af1b-6421b0af3ac6`
- Runtime: `1.0.2`
- Mensaje: `Polish edit habit form actions`
- Commit: `ef84146044482bce4b2fcecb583c4bcb6967654d`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/580f555f-0ad5-4ed0-af1b-6421b0af3ac6>

Update `preview` con cierre automatico de dias perdidos:

- Update group: `0a64cf90-5025-4dde-84af-abb14298cb0c`
- Runtime: `1.0.2`
- Mensaje: `Auto close missed habit days`
- Commit: `f630ee746b56c61e4937bc648de965d2c45a0431`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/0a64cf90-5025-4dde-84af-abb14298cb0c>

Update `preview` corrigiendo contraste de botones principales:

- Update group: `1c916ec3-9c6d-42b6-8688-fcc2adca12f5`
- Runtime: `1.0.2`
- Mensaje: `Fix primary button contrast`
- Commit: `7412b9a66d11d296284e204dda502518aebfe548`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/1c916ec3-9c6d-42b6-8688-fcc2adca12f5>

Update `preview` con detalle de hábito y métricas simples:

- Update group: `e5777047-0f20-4a48-b043-c88485cb0597`
- Runtime: `1.0.2`
- Mensaje: `Add habit detail metrics`
- Commit: `e2158e5fbe9c0b511f2ed30f542d15619131cc51`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/e5777047-0f20-4a48-b043-c88485cb0597>

Update `preview` corrigiendo layout nativo de botones de acción:

- Update group: `a7886bb4-5643-402e-9d88-3aa0f7176059`
- Runtime: `1.0.2`
- Mensaje: `Fix native action button layout`
- Commit: `da4bc9f14de7b1caa95c7d67ae2a7f666622f5d7`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/a7886bb4-5643-402e-9d88-3aa0f7176059>

Update `preview` corrigiendo cajas de botones en Android:

- Update group: `10c9eee1-f606-4378-854c-87e2d4b6d2e3`
- Runtime: `1.0.2`
- Mensaje: `Fix native button boxes`
- Commit: `aec9976ced5657cba5242f03dac5e8708a4ac0a4`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/10c9eee1-f606-4378-854c-87e2d4b6d2e3>

Update `preview` corrigiendo el boton Crear habito deshabilitado:

- Update group: `f4d2330b-ed19-4205-84b5-0d2272a02567`
- Runtime: `1.0.2`
- Mensaje: `Fix disabled create habit button`
- Commit: `db2eb5101a4500c7f56cde496a5414c59d40bf7d`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/f4d2330b-ed19-4205-84b5-0d2272a02567>

Update `preview` manteniendo azul el boton Crear habito deshabilitado:

- Update group: `385d7af6-43f8-4bd7-925c-87e3b5b7f238`
- Runtime: `1.0.2`
- Mensaje: `Use blue disabled create button`
- Commit: `7bca409f5b62c811249afc007f529a73135de7e9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/385d7af6-43f8-4bd7-925c-87e3b5b7f238>

Update `preview` igualando visualmente botones primary deshabilitados:

- Update group: `bb5fb7cc-ea82-4ffb-a930-8527cbf862ec`
- Runtime: `1.0.2`
- Mensaje: `Use identical primary button visuals`
- Commit: `d0f646ad35da1699f7dd79fc85fb5c9cc37fb6f4`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/bb5fb7cc-ea82-4ffb-a930-8527cbf862ec>

Build preview fallido durante la configuración de EAS Update:

- ID: `bd0a55b6-69a7-42db-838e-2dab83f5c4ac`
- Causa: `:app:createReleaseUpdatesResources` no encontraba `@babel/plugin-transform-react-jsx` bajo pnpm.
- Acción tomada: `@babel/plugin-transform-react-jsx` añadido como devDependency explícita.

## Estado real

MVP funcional: sí.

QA Android inicial: validada en móvil real por el usuario.

OTA preview de pulido v1.2: validada por el usuario en Android real.

Flujo principal con datos reales: validado por el usuario. Crear/editar/archivar hábitos, completar/fallar/deshacer, misión diaria, progreso, onboarding, ajustes, recordatorios y actualización preview funcionan correctamente en el móvil.

Backup import/export: implementado, pero queda como comprobación menor pendiente. No bloquea el paso a la siguiente fase de producto porque es un salvavidas, no el loop principal.

MVP listo para publicar: no por decisión de producto, no por bloqueo técnico principal.

Gamificación avanzada (v2.0): en marcha. El primer bloque (economía de Esencia + Tienda del Sistema con títulos y auras) está implementado, con lógica pura testeada en `src/core/economy.ts` y `src/core/shop.ts` y migraciones 0006-0008. El segundo bloque (logros + feedback/celebraciones) también está implementado: 21 logros con catálogo puro testeado en `src/core/achievements.ts` y migración 0009, overlay global de celebración, rank-up automático al subir de rango jugando y lectura de progreso por atributos en Progreso.

El chat del Sistema (IA base por reglas) está implementado (Fase 5A): chat con motor de plantillas determinista y arquitectura enchufable, entregado por OTA. La IA se ha ampliado más allá del chat: banner del Sistema en Hoy (`SystemMessageCard`) y apariciones autónomas en momentos clave (`SystemInterjectionOverlay`), ambas offline con plantillas y generadas por Gemma cuando la IA está activa. El LLM local real (Fase 5B) ya está implementado en código (commit `3d5d509`) detrás de la misma interface enchufable: `llama.rn` 0.12.4 + Gemma 4 E2B GGUF Q4_K_M (~3,1 GB), descarga del modelo on-device bajo demanda y pantalla de gestión. La IA es opcional: la app funciona sin modelo. Solo se entrega por build nativo (runtime `1.1.0`), no por OTA, y queda pendiente de validación en device real. Detalle en `docs/IA-SISTEMA.md`.

Build nativo EAS con LLM: build actual `5cf2587d-df9d-4020-a247-2dffdb48fa79` (runtime `1.1.5`, versionCode `10`) incluye las librerías nativas `librnllama*.so`, el patch Android bridgeless, instalación JSI con runtime del `CallInvoker` y la espera robusta de bindings JSI para `llama.rn` 0.12.4. Pendiente de validación funcional en device real.

Update `preview` runtime `1.1.5` con diagnóstico IA por fases:

- Grupo: `85cefc2c-f00f-4f85-80af-48e4b3655626`
- Android update ID: `019e833e-4859-7cc6-b612-0310710254e6`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/85cefc2c-f00f-4f85-80af-48e4b3655626>
- Commit: `9a55784` (`Add local AI engine diagnostics`).
- Llega a los APK runtime `1.1.5`, incluido el build `5cf2587d`.
- Añade en Ajustes → IA del Sistema un diagnóstico manual que prueba por fases `import llama.rn`, `installJsi`, `getBackendDevicesInfo`, `loadLlamaModelInfo` e `initLlama + release`.

Update `preview` runtime `1.1.0` con banner del Sistema, apariciones autónomas y Gemma 4:

- Update group: `a1d8f4ab-79b3-42e8-9604-890c5b5847b3`
- Runtime: `1.1.0`
- Mensaje: `System daily message, autonomous interjections and Gemma 4 model`
- Commit: `0cac468`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/a1d8f4ab-79b3-42e8-9604-890c5b5847b3>
- Llega a los APK runtime 1.1.0, incluido el build actual `e37eafc1`; no llega a los APK 1.0.x.

Fase actual: gamificación avanzada v2.0 en marcha; bloque de economía + tienda, bloque de logros + feedback/celebraciones y chat del Sistema (IA base por reglas) implementados sobre la base de producto v1.3. El LLM local real (Fase 5B) está implementado en código con Gemma 4 E2B y ya tiene build nativo `1.1.5` actual (`5cf2587d`) con `.so` de `llama.rn` verificadas, patch Android bridgeless aplicado, runtime JSI vía `CallInvoker` y espera robusta de bindings JSI. Entra en validación funcional en device.

Update `preview` con el chat del Sistema (IA base por reglas):

- Update group: `4c58d8ad-5ef5-460c-80ea-b3ab4bbfbef8`
- Runtime: `1.0.2`
- Mensaje: `Add System chat (offline rule-based AI)`
- Commit: `f617d89c80fcabd2da719a286357a06d4f47febb`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/4c58d8ad-5ef5-460c-80ea-b3ab4bbfbef8>

Update `preview` con logros, celebraciones y rank-up automático:

- Update group: `7e4d12a2-c1d6-4a7c-ba69-999952e61c9c`
- Runtime: `1.0.2`
- Mensaje: `Add achievements, progress celebrations and auto rank-up`
- Commit: `f9f763ba6a260a6def216f98ae0a398bac4756a0`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/7e4d12a2-c1d6-4a7c-ba69-999952e61c9c>

Update `preview` con economía de Esencia y Tienda del Sistema:

- Update group: `960b7e0a-7f53-41f1-817b-b6ebf9f73997`
- Runtime: `1.0.2`
- Mensaje: `Add Essence economy and System Shop (titles + auras)`
- Commit: `7869bd0f51167dfa6e6ae2e19852fab07d101d6f`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/960b7e0a-7f53-41f1-817b-b6ebf9f73997>

Siguiente paso recomendado: seguir usando la app con datos reales, validar en Android la economía/tienda y el nuevo bloque de logros + feedback/celebraciones, y publicar el update OTA correspondiente. Dentro de v2.0 queda pendiente las estadísticas avanzadas; la IA local "el Sistema" va en su propia fase v2.x, como futuro opcional tras validar que la app base tiene suficiente valor y uso real.
