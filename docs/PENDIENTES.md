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
- [x] Build nativo conseguido (preview Android `1c04b308-ea9a-44a9-afb1-da7ecb837927`, runtime `1.1.0`, versionCode `5`; resuelto con `EAS_NO_VCS=1` por el bug de git clone en Windows).
- [ ] Validar en device real: instalar APK `1c04b308`, descargar Gemma 4 E2B (~3,1 GB) y probar chat y apariciones (RAM/batería/calor, toggle de IA obligatorio).
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
- [x] Activar code signing de EAS Update (`certs/certificate.pem` + `app.json`; private key local ignorada).
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
