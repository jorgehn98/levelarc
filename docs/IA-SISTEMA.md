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
- `src/ai/llamaEngine.ts` — adapter STUB del LLM (delega en plantillas).
- `src/core/aiContext.ts` — `SystemContext` + serialización desde SQLite.
- `src/core/systemVoice.ts` — voz por reglas (greeting proactivo + respuestas por intención).
- `src/stores/aiStore.ts` — store, traducción i18n y persistencia del texto resuelto.
- Tablas `ai_profile` y `ai_messages` (migración 0010), banco de frases `sys_*` en `src/i18n/index.ts`.

## Fase 5B — LLM local real (pendiente, requiere build nativo)

Plan para enchufar un modelo de lenguaje on-device manteniendo la misma interface `SystemChatEngine`.

### Librería

- **`llama.rn`**: binding de llama.cpp, MIT, soporta GGUF. Opción principal.
- Alternativa: **`react-native-executorch`** (Software Mansion, formato `.pte`).

### Modelo

- **Gemma 3 1B GGUF Q4_K_M (~720 MB)**: el único que corre digno en Android de gama media (4 GB RAM).
- Plan B: Llama 3.2 1B o Qwen 2.5 1.5B.

### CRÍTICO — esto NO es OTA

`llama.rn` requiere **New Architecture + módulo nativo** → development build + **nuevo build EAS** + bump de `runtimeVersion`.

- NO funciona en Expo Go.
- NO se puede entregar por OTA: EAS Update solo entrega JS, estilos e imágenes, no binarios nativos.
- Los usuarios necesitarían **instalar el nuevo binario desde la store**, no recibirlo por OTA.

### Gotcha conocido (pnpm)

El config plugin de `llama.rn` peta con `require() of ES Module not supported` (issue [mybigday/llama.rn#243](https://github.com/mybigday/llama.rn/issues/243)), frecuente con pnpm.

Mitigación: probar el prebuild en rama aislada; hoist en pnpm o `patch-package` del `app.plugin.js`.

### Build en la nube

Compilar nativo en Windows es frágil (C++/CMake/OpenCL). Usar **EAS Build** (los perfiles `preview`/`production` ya existen), no build local.

### Descarga del modelo

El modelo no cabe en el APK; se descarga bajo demanda.

- Usar la **NEW File API de `expo-file-system`**: `File.createDownloadTask` con `onProgress` / `pause` / `resume`.
- Guardar en `Paths.document`, **NO en cache** (cache puede vaciarse).
- Verificar tamaño y carga del fichero descargado.
- UX "Descargar el Sistema" con progreso y reanudación.
- Toggle "activar IA del Sistema" **OBLIGATORIO**: la generación consume RAM y batería y produce throttling térmico tras 60-90s de generación.

### Implementación

- Rellenar `src/ai/llamaEngine.ts` (`initLlama` con `modelPath`, `completion` con streaming) implementando la misma interface `SystemChatEngine`.
- `ai_profile.engine` pasa a `'llama'` cuando el modelo está `ready`.
- Reusar `buildSystemContextText` (de `src/core/aiContext.ts`) como prompt de sistema: el tono ya está definido.

### Prompt de sistema

Tono "el Sistema": seco, imperativo, máximo 2 frases, sin emojis, sin inventar datos, usa solo el estado proporcionado.

## Pasos concretos para 5B (checklist)

1. Crear rama aislada para el prebuild.
2. Instalar `llama.rn` + `expo-build-properties`.
3. Configurar el config plugin (resolver el gotcha de pnpm).
4. `expo prebuild`.
5. Implementar descarga de modelo (NEW File API) + pantalla de gestión "Descargar el Sistema" (progreso, pausa, reanudación, verificación).
6. Implementar el `llamaEngine` real con streaming sobre la interface `SystemChatEngine`.
7. Bump de `runtimeVersion` (rompe OTA con builds anteriores, es esperado).
8. EAS Build `preview` nativo.
9. Validar en Android real (gama media, RAM/batería/calor).
10. EAS Build `production`.

## Riesgos

- **Peso del binario**: el módulo nativo aumenta el tamaño; valorar ABI splits.
- **New Arch / RN 0.85**: superficie de compatibilidad nueva.
- **Bump de `runtimeVersion`**: corta el OTA; los usuarios reinstalan binario desde la store.
- **Gama baja**: riesgo de OOM con 1B Q4 en dispositivos de poca RAM.
- **Batería y calor**: generación larga calienta y descarga; de ahí el toggle obligatorio.

## Resumen de la decisión

Motor de plantillas entregado por OTA **ahora** (Fase 5A, hecho). El LLM real es un build nativo posterior, bien acotado (Fase 5B), con su mayor riesgo en que no es OTA: requiere nueva instalación desde store.
