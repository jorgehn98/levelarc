# LevelArc — Pendientes

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Este archivo es checklist de ejecución, no biblia conceptual.

La primera parte recoge lo que falta de verdad, con su responsable. El resto es el historial de lo ya hecho, por áreas.

## Pendiente: QA en dispositivo

Nada de la versión `1.2.0` se ha ejecutado en un Android real. La lista completa, punto por punto, está en [`guides/release.md`](./guides/release.md#qa-en-dispositivo). En resumen:

- [ ] Actualización desde `1.1.6` con datos (base de `user_version` 0 a 2).
- [ ] Acciones con toques rápidos y cierre forzado a mitad de una acción.
- [ ] Cambio de día con la app abierta y cambio de zona horaria sin conexión.
- [ ] Backup en fichero: exportar, reinstalar e importar; fichero inválido; backup grande.
- [ ] Notificaciones: permiso, canal, hora y día correctos, icono, aviso con permiso denegado, y agenda tras cambiar idioma, importar y resetear.
- [ ] TalkBack en Hoy, formulario de hábito, aparición de NYX y Ajustes.
- [ ] Icono temático, splash e idioma inicial según el dispositivo.
- [ ] IA local: descarga completa, error por falta de espacio, pantalla encendida durante la descarga, chat, cancelaciones, borrado durante una respuesta, memoria y temperatura.
- [ ] Copia de seguridad de Android: copia con el modelo descargado y restauración en otro dispositivo.
- [ ] Canal `production`: sin sección Demo ni diagnóstico de IA.
- [ ] Permisos del binario final con `aapt2 dump permissions`.

## Pendiente: decisión de producto

- [ ] Recursos de la ficha de Play: icono 512 × 512, gráfico de funciones 1024 × 500 y capturas en español e inglés.
- [ ] Público objetivo y cuestionario de clasificación de contenido en Play Console (borrador en [`references/play-store.md`](./references/play-store.md)).
- [ ] Texto de la política de privacidad de la web: debe mencionar la copia de seguridad de Android en la cuenta de Google del usuario. Decidir también si "Sin nubes" del onboarding se mantiene con esa copia activada.
- [ ] Proveedor para la lista de espera de la web.
- [ ] Sprites reales de NYX (hoy hay un placeholder en `assets/character/`).
- [ ] Inferencia con GPU (OpenCL / `n_gpu_layers`); el motor es solo CPU.
- [ ] Reanudar la descarga del modelo tras un corte; hoy se empieza de nuevo.
- [ ] iOS y App Store.
- [ ] Subir a Expo SDK 57 o a los últimos parches de SDK 56 (avisos de `expo-doctor`, incluida la regresión de memoria de Hermes V1). Cambia el binario y exige repetir la QA.
- [ ] Retirar NativeWind/Tailwind: está configurado pero ninguna pantalla usa `className`.
- [ ] Quitar la referencia a "Solo Leveling" del prompt interno del LLM (`src/ai/llamaEngine.ts`). No se muestra al usuario, pero el proyecto evita esa marca.
- [ ] Registro de marca (USPTO) si se va a registrar.
- [ ] Más misiones no generativas y estadísticas avanzadas.

## Pendiente: release

- [ ] Build `preview` de la `1.2.0` y QA en dispositivo.
- [ ] Build `production` (AAB) y prueba interna en Play.
- [ ] Publicación en producción.

# Historial por áreas

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
- [x] Probar fallar hábito y confirmar que no baja de nivel.
- [x] Probar deshacer acción del día.
- [x] Probar misión diaria y reclamar bonus.
- [x] Probar cierre manual del día.
- [x] Probar permisos y scheduling de notificaciones.
- [x] Probar recordatorio de cierre del día: configurar hora, recibir notificación y desactivar.

## Backup

- [x] Implementar importación/restauración de backup JSON.
- [x] Validar versión de backup.
- [x] Añadir confirmación explícita antes de sobrescribir datos locales.
- [x] Restaurar `player` desde backup.
- [x] Documentar flujo de backup en Ajustes.
- [x] Backup como fichero: exportar comparte `levelarc-backup-AAAA-MM-DD.json` e importar usa el selector de documentos (formato v2).

## Assets y marca

- [x] Guardar set de logos en `assets/brand/`.
- [x] Integrar logo en icono, favicon, splash y adaptive icon.
- [x] Usar logo dentro de la UI inicial.
- [x] Crear logo vector simplificado.
- [x] Validar icono app en Android real.
- [x] Capa monocroma del adaptive icon como silueta real para los iconos temáticos de Android 13.
- [x] Dominio `levelarc.app` en uso: la app enlaza a la política de privacidad y a los términos.

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
- [x] Pasada de accesibilidad: roles, etiquetas, estados y objetivos de 44 pt; marca de selección además del color; botón primario deshabilitado con aspecto propio; el formulario dice qué falta.
- [x] Ajustes: sección Demo solo en builds internos, fuera los interruptores de Vibración y Sonido, y Acerca de con versión, build, enlaces legales y contacto.

## Producto / métricas

- [x] Definir métricas v1.3 sin sobrecargar la app.
- [x] Mejorar detalle de hábito con historial y consistencia.
- [x] Mostrar rachas por hábito de forma más accionable.
- [x] Resumen semanal simple de completados/fallados: descartado (el detalle de hábito ya cubre historial/consistencia).
- [x] Mejorar lectura de progreso por atributos: componente `AttributeRow` debajo del radar en Progreso.
- [x] Revisar si hacen falta logros simples antes de v2: van dentro de v2.0 (ver Gamificación).
- [x] Recoger fricciones del uso real: se mantiene como práctica, no como tarea.

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
- [x] Descargar/inspeccionar APK `1.1.6` (`https://expo.dev/artifacts/eas/ka7LYDJr7W4QTMiu7Qbeqh.apk`): contiene `14` librerías `lib/arm64-v8a/librnllama*.so`; SHA-256 `f7f60b3f92ad4b2e198cd2cadd2fba3c3023e8a041cabff62438b5570e0ae186`; bundle JS con `JSI bindings not installed after native install` / `Native install returned false`; `.so` JNI con `getBindingsInstaller` / `BindingsInstallerHolder` / `TurboModuleWithJSIBindings`.
- [x] Validar en Android real el chat IA local con APK `1.1.6`: el usuario confirma que el chat ya funciona y el diagnóstico nativo previo cargaba/liberaba el contexto correctamente.
- [x] Añadir diagnóstico manual de superficies IA en Ajustes → IA del Sistema: genera briefing, micro-comentario de hábito y aparición con Gemma para validar la integración más allá del chat sin esperar a que cada evento ocurra.
- [x] Ajustar tono de NYX: exigente y sobria, pero no humillante; añade respuestas útiles para ideas, ajuste de tono y día completado.
- [x] Ajustar presión temporal de NYX: no exigir "inmediatamente" cuando el usuario da un plan viable; debe aceptar restricciones reales y concretar siguiente paso.
- [x] Corregir franja negra junto a la navegación inferior en Android: safe-area inferior gestionada por el tab bar, no por cada pantalla base.
- [x] Refinar franja inferior residual y apariciones de NYX: fondo raíz igual a tab bar, más cobertura de inset y sprite más grande/anclado abajo.
- [x] Convertir apariciones de NYX en overlay modal: fondo oscurecido/bloqueado, bocadillo arriba y sprite grande con base en la línea superior de la tab bar.
- [x] Endurecer la IA: URL del modelo fijada a una revisión, comprobación de espacio libre, inferencias en cola con prioridad para el chat, diagnóstico solo en builds internos e historial de chat limitado a 1000 mensajes.
- [x] Mantener la pantalla encendida durante la descarga del modelo (`expo-keep-awake`).
- [x] Cablear triggers extra de apariciones (`streak_milestone`, `near_level`, `mission_failed`, `level_up`, `streak_broken`).

## Datos / lógica

- [x] Añadir tests para rachas por hábito.
- [x] Añadir tests para cierre de día.
- [x] Añadir tests para misión diaria.
- [x] Añadir tests para recalcular player desde events y misiones reclamadas.
- [x] Revisar y ajustar balance de XP/niveles/rangos.
- [x] Añadir tests para normalización, reparto y nivel de atributos.
- [x] Revisar balance final de curva de atributos frente a nivel/rango.
- [x] Igualar multiplicador de racha por hábito en web fallback.
- [x] Revisar si `racha_misiones` debe resetearse si no se reclama misión.
- [x] Retirar Drizzle: esquema solo en `src/db/migrate.ts` sobre `PRAGMA user_version` (versión 2).
- [x] Cola de mutaciones y una transacción por mutación.
- [x] Bonus de racha perfecta cada 7 días perfectos; los días de descanso no rompen rachas.
- [x] Esencia negativa admitida en la base y mostrada como cero.

## i18n

- [x] Revisar todo el copy ES.
- [x] Revisar todo el copy EN.
- [x] Llevar a i18n los textos que quedaban fuera: días, atributos, iconos, radar y motivos de fallo de importación.
- [x] Eliminar `src/i18n/es.json` y `src/i18n/en.json` obsoletos.
- [x] Idioma inicial según el dispositivo (`en*` inglés, el resto español); la preferencia guardada gana.

## Calidad técnica

- [x] Resolver o validar `expo-doctor` duplicado `expo-constants`.
- [x] Resolver `pnpm audit --prod`: override de `uuid` transitivo de `xcode` a `11.1.1`.
- [x] Validar EAS Update end-to-end en preview.
- [x] Desactivar code signing de EAS Update: Expo lo bloquea sin plan Enterprise y rompía `eas update` en `preview`.
- [x] Crear nuevo APK preview sin code signing tras reset de cuota EAS Free (`e37eafc1-40a9-49db-a913-5c58201e902d`), aunque queda descartado para IA local porque faltan las `.so` de `llama.rn`.
- [x] Verificar APK preview inspeccionando que contiene `lib/arm64-v8a/librnllama*.so` antes de entregar URL (`114d891f`).
- [x] Añadir tests de repositorio sobre `node:sqlite`.
- [x] ESLint con cero avisos y CI en GitHub Actions.
- [x] Revisar warnings estructurales de React Doctor.
- [x] Revisar rendimiento de SQLite sync/async: añadidos índices para consultas frecuentes de `events`.
- [x] Revisar imports y dead code antes de release.
- [x] Endurecer importación de backup: límites básicos y no restaurar rutas/estado local del modelo IA.
- [x] Manejo de errores visible: pantalla de error de arranque, `ErrorBoundary`, acciones que avisan del fallo, motivo en las importaciones y aviso de notificaciones denegadas.
- [x] Sincronización de recordatorios al arrancar, tras importar o resetear y al cambiar de idioma.

## Store / release

- [x] Crear build preview.
- [x] QA inicial en Android real.
- [x] Política de privacidad y términos enlazados desde Ajustes.
- [x] Descripción Play Store ES/EN, seguridad de los datos y borrador de clasificación de contenido (`docs/references/play-store.md`).
- [x] Revisión de permisos Android: bloqueados `SYSTEM_ALERT_WINDOW` y almacenamiento externo.
- [x] Copia de seguridad de Android sin el modelo de IA.
- [x] Guía de publicación y lista de QA en dispositivo (`docs/guides/release.md`).
- [x] Versión `1.2.0`, versionCode `12`.
