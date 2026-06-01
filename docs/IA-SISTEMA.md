# LevelArc — IA local "el Sistema"

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Este documento es la referencia del plan de IA local de LevelArc: qué hay implementado hoy y qué falta para el LLM real on-device.

El camino de menor riesgo ya está tomado: hoy "el Sistema" funciona offline con un motor de plantillas entregado por OTA. El LLM local real es un build nativo posterior, bien acotado, documentado aquí como Fase 5B.

## Estado actual (Fase 5A — implementado)

"El Sistema" es un chat con personalidad RPG (tono Solo Leveling: seco, imperativo, breve) accesible desde Hoy (tarjeta "Hablar con el Sistema") y Ajustes (sección Sistema). Pantalla `app/system-chat.tsx`.

Funciona **OFFLINE con un motor determinista por plantillas (reglas)**, no un LLM todavía. La arquitectura es enchufable para poder cambiar el motor sin tocar el resto.

- **Arquitectura enchufable**: interface `SystemChatEngine` en `src/ai/engine.ts` con dos adapters:
  - `templateEngine` (activo): respuestas deterministas por reglas.
  - `llamaEngine` (STUB): delega en plantillas hasta que haya build nativo con el modelo.
  - Selector de motor en `src/ai/index.ts`.
- **Contexto determinista desde SQLite**: `src/core/aiContext.ts` arma el `SystemContext` y su serialización a partir del estado local (pendientes, racha, nivel, etc.).
- **Voz por reglas**: `src/core/systemVoice.ts` genera el saludo proactivo según estado (pendientes / día perfecto / fallo / cerca de nivel / racha) y las respuestas por intención detectada por palabras (saludo, estado, ayuda, gracias, motivación). Todo puro y testeado.
- **Bilingüe sin acoplar el motor al idioma**: el motor devuelve `{key, params}` (clave i18n abstracta); el store `src/stores/aiStore.ts` traduce con i18n y guarda el **texto ya resuelto**. Banco de frases `sys_*` en ES/EN.
- **Persistencia**: tablas `ai_profile` (singleton: `enabled`, `engine` `'template'|'llama'`, `modelStatus`, `modelPath`) y `ai_messages` (historial). Migración 0010. Export/import y reset cubren ambas tablas.
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
- Tablas `ai_profile` y `ai_messages` (migración 0010), banco de frases `sys_*` en `src/i18n/index.ts`.

## Fase 5B — LLM local real (implementada en código, commit `3d5d509`; build nativo conseguido)

El LLM on-device ya está implementado en código sobre la misma interface `SystemChatEngine`. Tras validar que el build `114d891f` sí incluía `librnllama*.so`, el mismo error `JSI bindings not installed` apuntó a una segunda causa raíz: `llama.rn` 0.12.4 instala JSI en Android usando `context.getCatalystInstance().getJSCallInvokerHolder()`, incompatible con Expo SDK 56 / RN 0.85 bridgeless. Se añadió `patches/llama.rn@0.12.4.patch` para usar `ReactApplicationContext.getJSCallInvokerHolder()`. Después, al seguir apareciendo el genérico en device, se detectó una tercera causa probable: en RN 0.85 el `CallInvoker` ya entrega el `jsi::Runtime&` a la lambda, así que capturar un puntero crudo de `JavaScriptContextHolder` es frágil en bridgeless. El siguiente build `1.1.5` / versionCode `10` instala los bindings con el runtime entregado por `CallInvoker` y mantiene la espera JS de 8s a todos los bindings globales. Al seguir apareciendo el mismo error exacto tras instalarlo, la investigación encontró otra causa más concreta: el patch JS solo cubría `src/index.ts`, pero Metro/EAS puede resolver `llama.rn` desde `lib/module` o `lib/commonjs`, que seguían con el `installJsi` viejo. El patch ahora cubre las tres entradas (`src`, `lib/module`, `lib/commonjs`) y el export Android local confirma que el bundle incluye los nuevos mensajes `JSI bindings not installed after native install` / `Native install returned false`.

### Librería y dependencias

- **`llama.rn` 0.12.4**: binding de llama.cpp, módulo nativo, New Architecture, soporta GGUF.
- **`expo-file-system` 56.0.7**: NEW File API para la descarga del modelo.
- **`expo-build-properties` 56.0.16**: config nativa del build.

### Modelo

- **Gemma 4 E2B GGUF Q4_K_M (~3,1 GB)** desde `unsloth/gemma-4-E2B-it-GGUF`. Decisión del usuario frente a Gemma 3 1B. llama.cpp lo soporta (gemma4.cpp, PLE resuelto, Q4 seguro) y `llama.rn` 0.12.4 trae un build reciente que lo carga.
- **Stop**: `<end_of_turn>`. CPU-only en el primer build.
- **Peso**: ~3,1 GB. Cómodo en 6 GB de RAM, justo en 4 GB. El manejo de error cubre el fallo de carga sin romper la app.
- Plan B (no usado): Llama 3.2 1B o Qwen 2.5 1.5B.

### CRÍTICO — esto NO es OTA

`llama.rn` requiere **New Architecture + módulo nativo** → requiere el **build nativo nuevo (runtime `1.1.0`)** + instalar el APK.

- NO funciona en Expo Go.
- NO se entrega por OTA: EAS Update solo entrega JS, estilos e imágenes, no binarios nativos.
- El LLM solo llega instalando un build nativo que incluya las `.so` de `llama.rn`, el patch bridgeless, la instalación JSI vía runtime del `CallInvoker` y la espera robusta de JSI. Usar el build `5cf2587d` (`1.1.5`, versionCode `10`), ya verificado a nivel de APK.
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

### Pantalla de gestión

`app/system-ai.tsx`: descargar / progreso / activar IA avanzada / eliminar modelo, con estados `none` → `downloading` → `ready` → `error` y aviso en web. Accesible desde Ajustes (sección Sistema → "IA avanzada") y desde la cabecera del chat.

El toggle "activar IA avanzada" es **OBLIGATORIO**: la generación consume RAM y batería y produce throttling térmico en generaciones largas.

### Store (`aiStore`)

- `downloadModel` / `deleteModel` / `cancelDownload`.
- Reconciliación del estado del modelo en `loadAi`: limpia descargas huérfanas y estados `ready` sin fichero en disco.
- Selección de motor vía `resolveEngine`: usa `llama` solo si `engine='llama'` + `modelStatus='ready'` + `modelPath` + native; en cualquier otro caso cae a plantillas.

### Motor (`llamaEngine`)

- `src/ai/llamaEngine.ts`: `initLlama` con `modelPath` + `completion`, implementando la misma interface `SystemChatEngine`.
- Reusa `buildSystemContextText` (de `src/core/aiContext.ts`) como prompt de sistema: el tono ya está definido.

### Config nativa

- `app.json`: `newArchEnabled`, plugins `llama.rn` + `expo-build-properties`, version `1.1.0` / versionCode `5`.
- `eas.json`: node `22.15.1` en los 3 perfiles. Esto evita el gotcha `ERR_REQUIRE_ESM` al cargar el config plugin de `llama.rn`.
- `pnpm-workspace`: `allowBuilds` con `llama.rn: true` (postinstall que descarga los artefactos nativos).
- **Primer build CPU-only** (sin `enableOpenCL`, `n_gpu_layers=0`) por estabilidad. Tras validar en device se puede reactivar OpenCL / `n_gpu_layers`.

### Gotcha del build en Windows (`EAS_NO_VCS`)

El primer intento de build falló por un bug de `eas-cli` en Windows: al hacer git clone de `file:///C:/...` con git 2.53 devuelve código 128 ("does not appear to be a git repository"). Se resolvió con `EAS_NO_VCS=1`, que empaqueta el working dir directamente sin pasar por git clone. El build histórico `1c04b308` se lanzó así; el APK actual `e37eafc1` salió desde el commit `84264be`.

### Integración de la IA en la app (más allá del chat)

La IA no es solo una pantalla de chat: aparece en el flujo de juego.

- **Mensaje del Sistema en Hoy (banner)**: la app te recibe cada día con una línea contextual del Sistema. Componente `SystemMessageCard`. Instantáneo con plantillas; cuando la IA está activa lo genera Gemma y se **cachea por día**.
- **Apariciones autónomas del Sistema**: el Sistema salta solo en momentos clave (completar la misión diaria, volver tras ausencia) con un personaje y bocadillo (overlay `SystemInterjectionOverlay`), con **cooldown** (1/sesión, 1/día por trigger). El botón "Continuar" abre el chat heredando el contexto de por qué saltó.
  - Personaje placeholder enchufable (sprites en `assets/character/`).
  - Toggle "Apariciones del Sistema" en Ajustes.
  - Funciona offline con plantillas; con IA activa lo genera Gemma.
  - Triggers extra preparados (`streak`, `near_level`, `mission_failed`) pero **no cableados aún**.

### Prompt de sistema

Tono "el Sistema": seco, imperativo, máximo 2 frases, sin emojis, sin inventar datos, usa solo el estado proporcionado.

## Cómo validar 5B (pendiente — única tarea abierta)

El build válido actual es `5cf2587d`; lo que queda es la validación en device:

1. Instalar el APK del build `5cf2587d` (`1.1.5`, versionCode `10`): <https://expo.dev/artifacts/eas/ctG9fY6ohiBC8AZebmwBE2.apk>.
2. Abrir la pantalla de gestión (Ajustes → Sistema → "IA avanzada" o cabecera del chat) y descargar el GGUF de ~3,1 GB de Gemma 4 E2B.
3. Si el chat vuelve a caer a plantillas, ejecutar **Diagnóstico IA** desde esa pantalla. El diagnóstico prueba por fases: `import llama.rn`, `installJsi`, `getBackendDevicesInfo`, `loadLlamaModelInfo` e `initLlama + release`; copiar el primer paso con `ERROR`.
4. Activar la IA avanzada y probar conversación y apariciones autónomas; verificar RAM/batería/calor (cómodo en 6 GB, justo en 4 GB).
5. Si estable, reactivar OpenCL / `n_gpu_layers` y relanzar build.
6. EAS Build `production`.

## Riesgos

- **Peso del binario**: el módulo nativo aumenta el tamaño; valorar ABI splits.
- **New Arch / RN 0.85**: superficie de compatibilidad nueva.
- **Bump de `runtimeVersion`**: corta el OTA; los usuarios reinstalan binario desde la store.
- **Gama baja**: Gemma 4 E2B Q4 pesa ~3,1 GB; cómodo en 6 GB de RAM, justo en 4 GB. El manejo de error cubre el fallo de carga sin romper la app.
- **Batería y calor**: generación larga calienta y descarga; de ahí el toggle obligatorio.

## Resumen de la decisión

Motor de plantillas entregado por OTA (Fase 5A, hecho). El LLM real (Fase 5B) ya está implementado en código sobre la misma interface enchufable (commit `3d5d509`), con Gemma 4 E2B. Tras el build `aad21dd9` (`1.1.2` / versionCode `7`) el usuario seguía viendo `JSI bindings not installed`; el build actual `5cf2587d` (`1.1.5` / versionCode `10`) instala JSI usando el `jsi::Runtime&` entregado por RN 0.85 `CallInvoker`, espera hasta 8s a que existan todos los bindings globales, evita consumir bindings parciales y mantiene diagnósticos nativos para saber si falla librería o call invoker. La IA es opcional y se integra en el flujo (banner en Hoy + apariciones autónomas), no solo como chat. Su mayor riesgo sigue siendo que no es OTA: requiere instalar el build nativo nuevo y descargar el GGUF de ~3,1 GB on-device. Queda pendiente la validación en device real y el build de production.
