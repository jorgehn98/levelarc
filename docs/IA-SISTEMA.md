# LevelArc — IA local "el Sistema"

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Este documento es la referencia del plan de IA local de LevelArc: qué hay implementado hoy y qué falta para el LLM real on-device.

El camino de menor riesgo ya está tomado: hoy "el Sistema" funciona offline con un motor de plantillas entregado por OTA. El LLM local real es un build nativo posterior, bien acotado, documentado aquí como Fase 5B.

## Estado actual (Fase 5A — implementado)

"El Sistema" es un chat con personalidad RPG accesible desde Hoy (tarjeta "Hablar con el Sistema") y Ajustes (sección Sistema). Pantalla `app/system-chat.tsx`.

Tono actual de NYX: exigente, sobrio y breve, pero útil. Puede apretar al jugador, no humillarlo: prohibido responder que sus dudas/emociones no importan, insultar o repetir "haz misiones" ante cualquier conversación. Si el usuario pide ideas, debe dar opciones concretas; si pide bajar la dureza, baja el filo sin perder exigencia. Si el usuario dice que no puede hacerlo ahora o que lo hará después de otra tarea, NYX debe aceptar el plan y concretar el siguiente paso realista, no exigir "inmediatamente".

Funciona **OFFLINE con un motor determinista por plantillas (reglas)** y con LLM local cuando el modelo está activo. La arquitectura es enchufable para poder cambiar el motor sin tocar el resto.

- **Arquitectura enchufable**: interface `SystemChatEngine` en `src/ai/engine.ts` con dos adapters:
  - `templateEngine` (activo): respuestas deterministas por reglas.
  - `llamaEngine`: LLM local real sobre `llama.rn`, activo solo en build nativo compatible con modelo listo.
  - Selector de motor en `src/ai/index.ts`.
- **Contexto determinista desde SQLite**: `src/core/aiContext.ts` arma el `SystemContext` y su serialización a partir del estado local (pendientes, racha, nivel, etc.).
- **Voz por reglas**: `src/core/systemVoice.ts` genera el saludo proactivo según estado (pendientes / día perfecto / fallo / cerca de nivel / racha) y las respuestas por intención detectada por palabras (saludo, estado, ayuda, ideas, ajuste de tono, día completado, gracias, motivación). Todo puro y testeado.
- **Bilingüe sin acoplar el motor al idioma**: el motor devuelve `{key, params}` (clave i18n abstracta); el store `src/stores/aiStore.ts` traduce con i18n y guarda el **texto ya resuelto**. Banco de frases `sys_*` en ES/EN.
- **Persistencia**: tablas `ai_profile` (singleton: `enabled`, `engine` `'template'|'llama'`, `modelStatus`, `modelPath`) y `ai_messages` (historial), definidas en `src/db/migrate.ts`. Export/import y reset cubren ambas tablas.
- **Entrega**: por OTA (EAS Update). Es JS puro, no requiere build nativo. Commit `f617d89`.

### Archivos que lo componen

- `app/system-chat.tsx` — pantalla del chat.
- `src/ai/engine.ts` — interface `SystemChatEngine`.
- `src/ai/index.ts` — selector de motor.
- `src/ai/templateEngine.ts` — motor de plantillas activo.
- `src/ai/llamaEngine.ts` — motor LLM real (`initLlama` + `completion`), con carga perezosa de `llama.rn`.
- `src/core/aiContext.ts` — `SystemContext` + serialización desde SQLite.
- `src/core/systemVoice.ts` — voz por reglas (greeting proactivo + respuestas por intención).
- `src/stores/aiStore.ts` — store, traducción i18n y persistencia del texto resuelto.
- Tablas `ai_profile` y `ai_messages`, banco de frases `sys_*` en `src/i18n/index.ts`.

## Fase 5B — LLM local real (implementada en código, commit `3d5d509`; build nativo conseguido)

El LLM on-device ya está implementado sobre la misma interface `SystemChatEngine` y validado para chat en Android real con el build `1.1.6`. El camino hasta ahí dejó varias causas raíz: builds sin `.so` por postinstall ignorado, `llama.rn` 0.12.4 usando `getCatalystInstance()` en bridgeless, instalación frágil capturando `JavaScriptContextHolder`, entrypoints compilados `lib/module`/`lib/commonjs` sin el patch JS, y por último la necesidad de usar el patrón oficial RN 0.85 `TurboModuleWithJSIBindings` + `BindingsInstallerHolder`. El APK válido `9b238105` incluye el patch JS en `src`, `lib/module` y `lib/commonjs`, fuerza C++20 en el wrapper JNI, y el diagnóstico en dispositivo confirma import, `installJsi`, backends, lectura del modelo e `initLlama + release` en verde.

### Librería y dependencias

- **`llama.rn` 0.12.4**: binding de llama.cpp, módulo nativo, New Architecture, soporta GGUF.
- **`expo-file-system` 56.0.7**: NEW File API para la descarga del modelo.
- **`expo-build-properties` 56.0.16**: config nativa del build.

### Modelo

- **Gemma 4 E2B GGUF Q4_K_M (~3,1 GB)** desde `unsloth/gemma-4-E2B-it-GGUF`. Decisión del usuario frente a Gemma 3 1B. llama.cpp lo soporta (gemma4.cpp, PLE resuelto, Q4 seguro) y `llama.rn` 0.12.4 trae un build reciente que lo carga.
- **URL anclada a una revisión inmutable**: `src/ai/modelMetadata.ts` descarga de `resolve/739965d73654c0ead8020786aa998fc813070087/…`, no de `resolve/main/`. La validación final exige el tamaño exacto (`3 106 736 256` bytes) y el publicador resube el fichero: desde el 2026-07-17 `main` sirve `3 106 738 272` bytes (plantilla de chat nueva), así que con `main` toda descarga nueva fallaba al 100 %. La revisión anclada es la última con el tamaño validado en dispositivo (SHA-256 LFS `9378bc47…b8672d`). Para cambiar de modelo hay que actualizar a la vez `MODEL_REVISION` y `MODEL_SIZE_BYTES` (el `size` de `https://huggingface.co/api/models/unsloth/gemma-4-E2B-it-GGUF/tree/<revisión>`) y revalidar en Android real; el test `modelMetadata.test.ts` fija ambos.
- **Stop**: `<end_of_turn>`. CPU-only en el primer build.
- **Peso**: ~3,1 GB. Cómodo en 6 GB de RAM, justo en 4 GB. El manejo de error cubre el fallo de carga sin romper la app.
- Plan B (no usado): Llama 3.2 1B o Qwen 2.5 1.5B.

### CRÍTICO — esto NO es OTA

`llama.rn` requiere **New Architecture + módulo nativo** → requiere el **build nativo nuevo (runtime `1.1.0`)** + instalar el APK.

- NO funciona en Expo Go.
- NO se entrega por OTA: EAS Update solo entrega JS, estilos e imágenes, no binarios nativos.
- El LLM solo llega instalando un build nativo que incluya las `.so` de `llama.rn`, el patch bridgeless, la instalación JSI vía `TurboModuleWithJSIBindings` + `BindingsInstallerHolder` y la espera robusta de JSI. El build válido actual es `9b238105` (`1.1.6`, versionCode `11`): corrige el fallo de C++20 visto en `d212dc78`, está inspeccionado a nivel de APK y validado en Android real para chat IA local. No volver a usar `5cf2587d` (`1.1.5`) como referencia actual: reproducía `JSI bindings not installed`.
- El modelo NO viene en el APK ni por OTA: la IA es **opcional** y el GGUF se descarga bajo demanda dentro de la app. La app funciona perfecta sin modelo.
- El chat por plantillas (runtime `1.0.2`) sigue funcionando por OTA para quien no instale el build nuevo.

### Aislamiento de `llama.rn` (triple barrera)

`llamaEngine` carga `llama.rn` con **dynamic import perezoso**: ni la web ni el motor de plantillas importan el módulo nativo. Solo se carga cuando se resuelve el motor `llama` en native con el modelo `ready`.

### `SystemReply` como union

`SystemReply` pasó a `{kind:'key'} | {kind:'text'}`: el LLM devuelve **texto directo**; las plantillas siguen devolviendo clave i18n (`{kind:'key'}`). El store traduce solo las de clave.

### Descarga del modelo

`src/ai/modelManager.ts` descarga el GGUF con la **NEW File API de `expo-file-system`**:

- `File.createDownloadTask` con progreso y cancelación.
- Guardado en `Paths.document` (NO en cache, que puede vaciarse).
- Solo native; en web no aplica.
- **Comprobación previa de espacio**: antes de empezar se lee `Paths.availableDiskSpace` y se exige el tamaño del modelo más 500 MB de margen (~3,6 GB). Si no cabe, no se descarga nada y la pantalla muestra un error específico (`aiDownloadNoSpace`) en vez del genérico. Una lectura no fiable del sistema no bloquea la descarga.
- **Sin reanudación**: si la red cae o la app se cierra a mitad, el parcial se borra y hay que empezar de nuevo. `DownloadTask` expone `pause`/`resumeAsync`/`savable`, pero reanudar tras matar el proceso exige persistir ese estado y validar el parcial; queda pendiente.
- **La pantalla se mantiene encendida durante la descarga**: `aiStore.downloadModel` activa `expo-keep-awake` con una etiqueta propia al empezar y lo desactiva siempre en el `finally`, también si la descarga falla o se cancela. Si no se puede activar, la descarga sigue. Falta validarlo en dispositivo.

### Pantalla de gestión

`app/system-ai.tsx`: descargar / progreso / activar IA avanzada / eliminar modelo, con estados `none` → `downloading` → `ready` → `error` y aviso en web. Accesible desde Ajustes (sección Sistema → "IA avanzada") y desde la cabecera del chat.

**Diagnóstico solo en builds internos.** `isInternalBuild()` (`src/lib/buildInfo.ts`) es una lista de permitidos: `__DEV__` o canal `preview` / `development` (predicado puro y testeado en `src/lib/buildChannel.ts`). Solo con ese helper en `true` (dev client, Expo Go, APK `preview`) la pantalla enseña versión/build/runtime/canal/update, los botones **Diagnóstico IA** y **Probar superficies IA** y el detalle en crudo del último fallo del motor. En `production` el usuario ve un aviso corto ("El motor local falló") con **Reintentar**, que suelta el contexto cargado y limpia el aviso; nunca una traza. La traza JS tampoco se guarda en producción. Un build sin canal reconocible (canal vacío, o `expo-updates` arrancado sin cabeceras) cuenta como build de usuario: ante la duda, el diagnóstico se oculta.

El toggle "activar IA avanzada" es **OBLIGATORIO**: la generación consume RAM y batería y produce throttling térmico en generaciones largas.

### Store (`aiStore`)

- `downloadModel` / `deleteModel` / `cancelDownload`.
- Reconciliación del estado del modelo en `loadAi` (reglas puras en `src/ai/modelReconcile.ts`): limpia descargas huérfanas, degrada estados `ready` sin fichero en disco y **adopta como `ready` un modelo completo que siga en disco con el perfil en `none`**. Esto último ocurre tras "Resetear todo" o importar un backup, que reescriben `ai_profile` sin tocar el fichero: antes la pantalla ofrecía "Descargar" con 3,1 GB huérfanos imposibles de borrar. Al adoptar no se activa el motor; lo decide el usuario.
- `resetAiSession()` (export de `aiStore`): vacía chat, mensaje del día, comentarios de hábito, aparición y avisos en memoria/cache y relee el perfil. Hay que llamarla después de resetear o importar datos.
- El chat carga en memoria como mucho los 200 mensajes más recientes. La tabla `ai_messages` se poda a los 1000 más recientes en cada inserción.
- Selección de motor vía `resolveEngine`: usa `llama` solo si `engine='llama'` + `modelStatus='ready'` + `modelPath` + native; en cualquier otro caso cae a plantillas.
- Observabilidad runtime: los fallos del LLM en chat, briefing diario, micro-comentarios de hábito y apariciones autónomas se guardan en Ajustes IA con source/perfil/modelo para no confundir una plantilla de fallback con una respuesta LLM real. La misma pantalla tiene una prueba manual de superficies IA que genera briefing, micro-comentario y aparición con Gemma.

### Motor (`llamaEngine`)

- `src/ai/llamaEngine.ts`: `initLlama` con `modelPath` + `completion`, implementando la misma interface `SystemChatEngine`.
- **Inferencias serializadas** (`src/ai/inferenceQueue.ts`, puro y testeado): hay un solo `LlamaContext` y `stopCompletion` corta lo que esté corriendo, así que todas las `completion` pasan por una cola. El chat (saludo y respuestas) espera turno; briefing, comentario de hábito y aparición son de fondo y **no esperan**: si el motor está ocupado se descartan y la superficie se queda con su plantilla, sin registrar fallo. Si el chat llega mientras corre una de fondo, la corta y su texto parcial se desecha. Cancelar el chat solo afecta a inferencias del chat. La carga del modelo va dentro del trabajo, así que cancelar durante una carga en frío lo descarta de verdad. Tras un timeout de inferencia se esperan hasta 5 s a que el nativo suelte el contexto antes de ceder el turno. `releaseLlama()` vacía la cola y espera antes de soltar el modelo, de modo que borrar el modelo con una respuesta a medias termina en `none` y la respuesta cae a plantilla. Cada carga de modelo lleva su propio token de aborto: una carga que vence el timeout de 180 s se libera sola si acaba más tarde.
- Reusa `buildSystemContextText` (de `src/core/aiContext.ts`) dentro del bloque de instrucciones de Gemma: el tono ya está definido. Gemma no se invoca con rol `system` separado; las instrucciones de NYX, el estado y el mensaje/evento actual van en el primer turno `user`, manteniendo los delimitadores reales observados en el GGUF (`<|turn>` / `<turn|>`).

### Config nativa

- `app.json`: `newArchEnabled`, plugins `llama.rn` + `expo-build-properties`, version `1.1.0` / versionCode `5`.
- `eas.json`: node `22.15.1` en los 3 perfiles. Esto evita el gotcha `ERR_REQUIRE_ESM` al cargar el config plugin de `llama.rn`.
- `pnpm-workspace`: `allowBuilds` con `llama.rn: true` (postinstall que descarga los artefactos nativos).
- **Primer build CPU-only** (sin `enableOpenCL`, `n_gpu_layers=0`) por estabilidad. Tras validar en device se puede reactivar OpenCL / `n_gpu_layers`.

### Gotcha del build en Windows (`EAS_NO_VCS`)

El primer intento de build falló por un bug de `eas-cli` en Windows: al hacer git clone de `file:///C:/...` con git 2.53 devuelve código 128 ("does not appear to be a git repository"). Se resolvió con `EAS_NO_VCS=1`, que empaqueta el working dir directamente sin pasar por git clone. El build histórico `1c04b308` se lanzó así; el APK `e37eafc1` también es histórico y quedó superado; el APK válido actual para IA local es `9b238105` (`1.1.6`).

### Integración de la IA en la app (más allá del chat)

La IA no es solo una pantalla de chat: aparece en el flujo de juego.

- **Mensaje del Sistema en Hoy (banner)**: la app te recibe cada día con una línea contextual del Sistema. Componente `SystemMessageCard`. La línea depende de la situación del día (`getDayState` en `src/core/systemVoice.ts`): sin hábitos registrados invita a crear la primera misión, sin nada programado hoy lo dice, con pendientes da el briefing (singular si queda una) y sin pendientes cierra el día o señala los fallos; nunca habla de "0 misiones pendientes". El texto de plantilla **se recalcula siempre** (al enfocar Hoy y cada vez que cambian hábitos, estados de hoy o idioma) y no se cachea. Solo se cachea el texto de Gemma, con clave **día + idioma + firma del estado** (`situación:pendientes`): cambiar de idioma o completar una misión lo invalida, y el progreso parcial o el XP no. Mientras Gemma regenera se ve la plantilla correcta.
- **Apariciones autónomas del Sistema**: el Sistema salta solo en momentos clave (completar la misión diaria, volver tras ausencia) con un personaje y bocadillo (overlay `SystemInterjectionOverlay`), con **cooldown** (1/sesión, 1/día por trigger). El botón "Continuar" abre el chat heredando el contexto de por qué saltó.
  - Personaje placeholder enchufable (sprites en `assets/character/`).
  - Toggle "Apariciones del Sistema" en Ajustes.
  - Funciona offline con plantillas; con IA activa lo genera Gemma.
  - El botón atrás de Android cierra la aparición (no navega la pantalla de detrás). Cuando el texto de Gemma sustituye al de plantilla no se repite la entrada ni se reinician los 14 s de auto-cierre.
  - Triggers extra preparados (`streak`, `near_level`, `mission_failed`) pero **no cableados aún**.

### Prompt de sistema

Tono "NYX / el Sistema": máximo 2 frases, sin emojis, sin inventar datos, usa solo el estado proporcionado y el mensaje del jugador. Debe sonar firme y con autoridad, no antipática: exigente con la inacción, no despreciativa con la persona. Debe poder conversar de forma breve cuando el usuario pide ideas, matices o ayuda concreta. No debe usar presión temporal falsa ("actúa ahora", "inmediatamente", "el tiempo no espera") si el usuario ya dio un plan viable; en ese caso debe reforzar el plan y pedir el siguiente paso.

## Cómo validar 5B (pendiente — única tarea abierta)

El build `5cf2587d` ya no se considera suficiente para validar IA local. El build `1.1.6` sí quedó validado para el chat IA local en Android real; lo que queda es QA secundaria:

1. Mantener como APK preview válido el EAS build `9b238105-e0db-460e-a69e-92110759df24` (`1.1.6`, versionCode `11`, commit `631d914`): <https://expo.dev/artifacts/eas/ka7LYDJr7W4QTMiu7Qbeqh.apk>. Ya está inspeccionado a nivel de APK: `14` `librnllama*.so` en `arm64-v8a`, SHA-256 `f7f60b3f92ad4b2e198cd2cadd2fba3c3023e8a041cabff62438b5570e0ae186`, bundle JS con el `installJsi` parcheado y `.so` JNI con `BindingsInstallerHolder`.
2. Chat IA local validado por el usuario en Android real: ya responde con el modelo local y no reproduce el fallo inicial de JSI/desactivación al primer mensaje.
3. Si vuelve a caer a plantillas, ejecutar **Diagnóstico IA** desde esa pantalla (solo visible en builds internos: dev o canal `preview`); ahora incluye entorno/perfil/modelo además de `import llama.rn`, `installJsi`, `getBackendDevicesInfo`, `loadLlamaModelInfo` e `initLlama + release`. El error runtime se guarda también para briefing, micro-comentarios y apariciones si `engine=llama` acaba en plantilla o no cumple precondiciones de modelo.
4. Ejecutar **Probar superficies IA** en la misma pantalla: fuerza generación real de briefing, comentario de hábito y aparición con el LLM local, sin esperar a eventos naturales del juego. El diagnóstico corta en el primer ERROR, libera el contexto al terminar para no dejar el modelo ocupando RAM tras la prueba y guarda el último resultado con timestamp/build/runtime/update para que la evidencia no se pierda al salir de la pantalla.
5. QA secundaria: revisar briefing diario, micro-comentarios de hábito y apariciones en flujo real, más estabilidad RAM/batería/calor.
6. Si estable, reactivar OpenCL / `n_gpu_layers` y relanzar build.
7. EAS Build `production`.

## Copia de seguridad de Android y el modelo

El GGUF vive en `files/models/` (`Paths.document` de `expo-file-system` es `context.filesDir`). `plugins/withAndroidBackupRules.js` excluye ese directorio de la copia automática de Android y de la transferencia entre dispositivos: con 3,1 GB dentro, la copia superaba el tope de 25 MB y la base de datos se quedaba sin respaldo. Tras restaurar en otro teléfono, `ai_profile` puede decir `ready` sin fichero en disco; `planModelReconcile` lo degrada a `none` con motor de plantillas al cargar, y el usuario vuelve a descargar el modelo si lo quiere.

## Riesgos

- **Peso del binario**: el módulo nativo aumenta el tamaño; valorar ABI splits.
- **New Arch / RN 0.85**: superficie de compatibilidad nueva.
- **Bump de `runtimeVersion`**: corta el OTA; los usuarios reinstalan binario desde la store.
- **Gama baja**: Gemma 4 E2B Q4 pesa ~3,1 GB; cómodo en 6 GB de RAM, justo en 4 GB. El manejo de error cubre el fallo de carga sin romper la app.
- **Batería y calor**: generación larga calienta y descarga; de ahí el toggle obligatorio.

## Resumen de la decisión

Motor de plantillas entregado por OTA (Fase 5A, hecho). El LLM real (Fase 5B) ya está implementado sobre la misma interface enchufable (commit `3d5d509`), con Gemma 4 E2B. Tras varios builds fallidos o insuficientes (`aad21dd9`, `5cf2587d`, `d212dc78`), el build válido actual es `9b238105` (`1.1.6` / versionCode `11`): instala JSI con `TurboModuleWithJSIBindings` + `BindingsInstallerHolder`, incluye `.so` verificadas y el usuario confirmó que el chat IA local ya funciona. La IA es opcional y se integra en el flujo (banner en Hoy + apariciones autónomas), no solo como chat. Su mayor riesgo sigue siendo que no es OTA para binarios: requiere instalar build nativo compatible y descargar el GGUF de ~3,1 GB on-device. Queda QA no bloqueante de superficies secundarias, estabilidad prolongada y build de production.
