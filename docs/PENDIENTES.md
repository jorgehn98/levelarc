# LevelArc — Pendientes

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Este archivo es checklist de ejecución, no biblia conceptual.

## Prioridad alta

- [x] Probar en Android real o emulador.
- [x] Ejecutar `pnpm build:android:preview`.
- [x] Revisar resultado del build preview EAS `6914231b-d85a-464a-83a3-2794f392ca65`.
- [x] Relanzar build preview tras añadir `babel-preset-expo`.
- [x] Validar si el duplicado `expo-constants` de `expo-doctor` afecta al build nativo.
- [x] Instalar APK preview `86105d10-d74e-4300-870a-a0081e7aee6c` en Android.
- [x] Instalar APK preview en Android real para QA inicial.
- [x] Crear APK preview con EAS Update activado.
- [x] Instalar APK preview `f8c42fc9-d766-4e58-8859-d2b0a48e76e1` en Android.
- [x] Publicar un update JS de prueba en canal `preview`.
- [x] Validar botón Ajustes > Actualizaciones en Android.
- [x] Probar crear hábito en Android.
- [x] Probar selector de hora en hábitos: seleccionar hora, guardar, editar y limpiar recordatorio.
- [x] Probar onboarding inicial en Android: guardar nombre y entrar con "Iniciar juego".
- [x] Probar entrada de retorno en Android: resumen de rango/XP y "Continuar jugando".
- [x] Probar cambio de nombre desde Ajustes.
- [x] Probar editar hábito en Android.
- [x] Probar archivar hábito en Android.
- [x] Confirmar en Android que Hábitos muestra todos los hábitos activos y que las tarjetas/empty states ocupan ancho completo.
- [x] Probar hábito contable hasta completar meta.
- [x] Confirmar que un hábito lunes/miércoles/viernes/sábado no aparece en domingo.
- [ ] Probar cambio de día local en Android: dejar la app abierta hasta medianoche y confirmar que Hoy pasa al día nuevo.
- [ ] Probar cambio de zona horaria del teléfono sin Internet y confirmar que Hoy usa la fecha local nueva.
- [x] Probar fallar hábito y confirmar que no baja de nivel.
- [x] Probar deshacer acción del día.
- [x] Probar misión diaria y reclamar bonus.
- [x] Probar cierre manual del día.
- [ ] Probar exportación JSON vía Android share sheet.
- [ ] Probar importación/restauración JSON en Android.
- [x] Probar permisos y scheduling de notificaciones.
- [x] Probar recordatorio de cierre del día: configurar hora, recibir notificación y desactivar.

## Backup

- [x] Implementar importación/restauración de backup JSON.
- [x] Validar versión de backup.
- [x] Añadir confirmación explícita antes de sobrescribir datos locales.
- [x] Restaurar `player` desde backup.
- [x] Documentar flujo de backup en Ajustes.
- [ ] Mejorar importación con selector de archivo si hace falta.

## Assets y marca

- [x] Guardar set de logos en `assets/brand/`.
- [x] Integrar logo en icono, favicon, splash y adaptive icon.
- [x] Usar logo dentro de la UI inicial.
- [x] Crear logo vector simplificado.
- [x] Validar icono app en Android real.
- [ ] Crear icono app 48px simplificado.
- [ ] Validar adaptive icon Android en build real.
- [ ] Validar splash en build real.
- [ ] Revisar dominio `levelarc.app`.
- [ ] Confirmar USPTO si se va a registrar marca.

## UX / UI

- [x] Portar fundamentos de `docs/UI-UX` al design system runtime.
- [x] Cargar Inter/Orbitron desde `assets/fonts/`.
- [x] Unificar cian de marca en `#3FCAE6`.
- [x] Concentrar rango, nivel, XP y racha en Progreso.
- [x] Dejar Ajustes con cabecera simple de identidad.
- [x] Pulir pantalla Hoy completa contra `docs/UI-UX`.
- [x] Pulir pantalla Hábitos.
- [x] Pulir pantalla Progreso.
- [x] Pulir pantalla Ajustes.
- [x] Crear onboarding real.
- [x] Añadir nombre de jugador persistente y editable.
- [x] Crear pantalla rank-up real.
- [x] Pulir formulario crear/editar hábito.
- [x] Añadir selector manual de icono al crear/editar hábito.
- [x] Añadir selector manual de atributos al crear/editar hábito.
- [x] Añadir radar chart inicial de atributos en Progreso.
- [x] Mejorar estados vacíos.
- [x] Corregir layout de Hábitos tras QA Android: eliminar lista con ancho manual y usar tarjetas a ancho completo.
- [x] Añadir confirmación al archivar hábito.
- [x] Añadir confirmación al cerrar día.
- [x] Revisar textos del Sistema.
- [x] Revisar contraste de rangos E-S.
- [x] Revisar pantallas pequeñas.

## Producto / métricas

- [x] Definir métricas v1.3 sin sobrecargar la app.
- [x] Mejorar detalle de hábito con historial y consistencia.
- [x] Mostrar rachas por hábito de forma más accionable.
- [x] Resumen semanal simple de completados/fallados: descartado (el detalle de hábito ya cubre historial/consistencia).
- [x] Mejorar lectura de progreso por atributos: componente `AttributeRow` debajo del radar en Progreso.
- [x] Revisar si hacen falta logros simples antes de v2: van dentro de v2.0 (ver Gamificación).
- [ ] Recoger fricciones que aparezcan usando la app varios días.

## Gamificación (v2.0)

- [x] Economía de Esencia.
- [x] Tienda del Sistema (títulos + auras).
- [x] Logros / medallas.
- [x] Celebraciones y feedback de recompensa.
- [x] Lectura de progreso por atributos mejorada.
- [x] IA local "el Sistema" (chat base por reglas, Fase 5A).

## IA local — LLM on-device (5B, build nativo)

Referencia: `docs/IA-SISTEMA.md`. La Fase 5A (chat por reglas, OTA) ya está hecha; esto es el LLM real on-device.

- [x] Instalar `llama.rn` 0.12.4 + `expo-file-system` 56.0.7 + `expo-build-properties` 56.0.16.
- [x] Configurar el config plugin (`app.json` con newArch + plugins, `pnpm-workspace` allowBuilds `llama.rn`).
- [x] Implementar descarga de modelo (NEW File API de `expo-file-system`, `src/ai/modelManager.ts`) + pantalla de gestión `app/system-ai.tsx` con progreso/cancelación.
- [x] Implementar `llamaEngine` real (`initLlama` + `completion`, carga perezosa) sobre la interface `SystemChatEngine`.
- [x] Bump de `runtimeVersion` a `1.1.0` (corta OTA: requiere instalar el build nativo nuevo).
- [x] Cambiar el modelo a Gemma 4 E2B GGUF Q4_K_M (`unsloth/gemma-4-E2B-it-GGUF`, ~3,1 GB, prompt manual Gemma 4 con stop `<turn|>`).
- [x] Validar tamaño exacto + SHA-256 del GGUF tras descarga para no marcar como listo un modelo parcial/corrupto.
- [x] Mensaje del Sistema en Hoy (banner `SystemMessageCard`, cacheado por día con IA activa).
- [x] Apariciones autónomas del Sistema (`SystemInterjectionOverlay`, triggers misión completada / vuelta tras ausencia, cooldown 1/sesión y 1/día por trigger, "Continuar" abre el chat con contexto).
- [x] Build nativo con `.so` de `llama.rn` incluidas (`114d891f`, runtime `1.1.1`, versionCode `6`; APK verificado con 14 librerías `lib/arm64-v8a/librnllama*.so`).
- [x] Parchear `llama.rn` 0.12.4 para Android bridgeless (Expo SDK 56/RN 0.85): usar `ReactApplicationContext.getJSCallInvokerHolder()` en vez de `getCatalystInstance()`.
- [x] Lanzar build `1.1.2` / versionCode `7` con el patch de JSI bridgeless (`aad21dd9`).
- [x] Añadir retry explícito de `installJsi` y diagnósticos nativos para dejar de ocultar el fallo como `JSI bindings not installed` genérico.
- [x] Lanzar build `1.1.3` / versionCode `8` con retry/diagnóstico de JSI (`8bd52333`).
- [x] Parchear `installJsi` de `llama.rn` para esperar todos los bindings JSI antes de consumirlos y mostrar versión/build en Ajustes IA.
- [x] Lanzar build `1.1.4` / versionCode `9` con espera robusta de bindings JSI (`f95b548a`).
- [x] Investigar tercera causa del fallo persistente: en RN 0.85 bridgeless no se debe capturar `JavaScriptContextHolder` como puntero crudo; el `CallInvoker` entrega el `jsi::Runtime&` correcto a la lambda.
- [x] Parchear `llama.rn` para instalar JSI usando el runtime del `CallInvoker` y subir a `1.1.5` / versionCode `10`.
- [x] Lanzar build `1.1.5` / versionCode `10` con el patch de runtime JSI (`5cf2587d`).
- [x] Añadir diagnóstico manual por fases en Ajustes → IA del Sistema: `import llama.rn`, `installJsi`, `getBackendDevicesInfo`, `loadLlamaModelInfo`, `initLlama + release`.
- [x] Publicar OTA `preview` runtime `1.1.5` con diagnóstico IA (`85cefc2c-f00f-4f85-80af-48e4b3655626`).
- [x] Enriquecer el error runtime guardado tras fallo LLM con source, timestamp, platform, estado del perfil, existencia del modelo y stack truncado.
- [x] Publicar OTA `preview` runtime `1.1.5` con error runtime IA enriquecido (`19c66b2d-7b9d-42a9-98f2-a9d27da64d6d`).
- [x] Investigar causa persistente del mismo error tras APK `1.1.5`: Metro/EAS podía empaquetar `llama.rn/lib/module` o `lib/commonjs`, que seguían con el `installJsi` viejo aunque `src/index.ts` estuviera parcheado.
- [x] Extender `patches/llama.rn@0.12.4.patch` para cubrir `src/index.ts`, `lib/module/index.js` y `lib/commonjs/index.js`; verificado con `expo export --platform android`.
- [x] Publicar OTA `preview` runtime `1.1.5` con el patch JS ampliado para `llama.rn/lib/*` (`856cc783-29b3-4134-a13d-f64602f724ed`).
- [x] Detectar que el fallo persiste tras OTA `856cc783`: el usuario vuelve a ver `JSI bindings not installed` y la IA se apaga al primer mensaje.
- [x] Replantear el patch nativo a patrón oficial RN 0.85: `TurboModuleWithJSIBindings` + `BindingsInstallerHolder` en `llama.rn`, en vez de instalar JSI manualmente desde `install()` con `CallInvoker.invokeAsync`.
- [x] Cambiar política de fallback: un fallo runtime ya no persiste `engine=template` si el modelo sigue descargado/válido; solo la respuesta actual cae a plantillas y se guarda diagnóstico.
- [x] Lanzar build `1.1.6` / versionCode `11` con el patch nativo nuevo (`116ff7cb` cancelado; `d212dc78` falló en Gradle).
- [x] Diagnosticar fallo EAS `d212dc78`: `BindingsInstallerHolder` requiere headers RN con C++20 (`requires`) y el CMake de `llama.rn` compilaba el wrapper JNI con C++17.
- [x] Parchear `llama.rn` para compilar el wrapper JNI con C++20 (`CMAKE_CXX_STANDARD 20` + `target_compile_features(... cxx_std_20)`).
- [x] Relanzar build `1.1.6` / versionCode `11` desde el commit con C++20 (`9b238105-e0db-460e-a69e-92110759df24`, commit `631d914`).
- [x] Descargar/inspeccionar APK `1.1.6` (`https://expo.dev/artifacts/eas/ka7LYDJr7W4QTMiu7Qbeqh.apk`): contiene `14` librerías `lib/arm64-v8a/librnllama*.so`; SHA-256 `f7f60b3f92ad4b2e198cd2cadd2fba3c3023e8a041cabff62438b5570e0ae186`.
- [ ] Validar en Android real: instalar APK `1.1.6`, confirmar en Ajustes IA `LevelArc 1.1.6 · build 11`, probar primer mensaje, varias conversaciones seguidas, briefing diario, micro-comentarios de hábito, apariciones autónomas, botón de updates y estabilidad (RAM/batería/calor, toggle de IA obligatorio).
- [ ] Sprites del personaje real (hoy placeholder en `assets/character/`).
- [ ] Reactivar GPU / OpenCL / `n_gpu_layers` tras validar (primer build es CPU-only).
- [x] Cablear triggers extra de apariciones (`streak_milestone`, `near_level`, `mission_failed`, `level_up`, `streak_broken`).
- [ ] EAS Build production.

## Datos / lógica

- [x] Añadir tests para rachas por hábito.
- [ ] Añadir tests para cierre de día.
- [x] Añadir tests para misión diaria.
- [ ] Añadir tests para recalcular player desde events y misiones reclamadas.
- [x] Revisar y ajustar balance de XP/niveles/rangos.
- [x] Añadir tests para normalización, reparto y nivel de atributos.
- [x] Revisar balance final de curva de atributos frente a nivel/rango.
- [x] Igualar multiplicador de racha por hábito en web fallback.
- [x] Revisar si `racha_misiones` debe resetearse si no se reclama misión.

## i18n

- [ ] Revisar todo el copy ES.
- [ ] Revisar todo el copy EN.
- [x] Eliminar `src/i18n/es.json` y `src/i18n/en.json` obsoletos.
- [ ] Confirmar idioma inicial por configuración del dispositivo o dejar español por defecto.

## Calidad técnica

- [x] Resolver o validar `expo-doctor` duplicado `expo-constants`.
- [x] Resolver `pnpm audit --prod`: override de `uuid` transitivo de `xcode` a `11.1.1`.
- [x] Validar EAS Update end-to-end en preview.
- [x] Desactivar code signing de EAS Update: Expo lo bloquea sin plan Enterprise y rompía `eas update` en `preview`.
- [x] Crear nuevo APK preview sin code signing tras reset de cuota EAS Free (`e37eafc1-40a9-49db-a913-5c58201e902d`), aunque queda descartado para IA local porque faltan las `.so` de `llama.rn`.
- [x] Verificar APK preview inspeccionando que contiene `lib/arm64-v8a/librnllama*.so` antes de entregar URL (`114d891f`).
- [ ] Añadir tests de repositorio o integración local.
- [x] Revisar warnings estructurales de React Doctor.
- [x] Revisar rendimiento de SQLite sync/async: añadidos índices para consultas frecuentes de `events`.
- [x] Revisar imports y dead code antes de release.
- [x] Endurecer importación de backup: límites básicos y no restaurar rutas/estado local del modelo IA.
- [ ] Añadir manejo de errores visible para backup/notificaciones.

## Store / release

- [x] Crear build preview.
- [x] QA inicial en Android real.
- [ ] Test interno amplio cuando el producto este mas completo.
- [ ] Crear build production AAB.
- [ ] Definir build iOS/App Store cuando el producto este listo para tiendas.
- [ ] Política de privacidad.
- [ ] Descripción Play Store ES/EN.
- [ ] Screenshots.
- [ ] Clasificación de contenido.
- [ ] Revisión de permisos Android.

## v2+

- [ ] Logros.
- [ ] Estadísticas avanzadas.
- [ ] Misiones no generativas adicionales.
- [ ] IA local opcional.
- [ ] Tablas `AI_MESSAGES` y `AI_PROFILE` cuando toque implementar IA.
- [ ] Chat con el Sistema.
