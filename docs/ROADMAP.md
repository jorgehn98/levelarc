# LevelArc — Roadmap

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Este roadmap traduce la biblia original y el estado actual del repo en fases de ejecución.

## v1.0 — MVP funcional

Estado: implementado a nivel código, con APK preview generado y QA inicial validada en Android real por el usuario.

Objetivo: demostrar el loop principal offline de hábitos + XP + progreso.

Incluye:

- Crear/editar/archivar hábitos.
- Hábitos binarios.
- Hábitos contables con meta.
- Frecuencia semanal por días.
- Marcar completado/fallado.
- Deshacer acción del día.
- XP positivo/negativo.
- Suelo de nivel/rango ante penalización.
- Rangos E-S.
- Multiplicador de racha por hábito capado a `x1.50`.
- Rachas por hábito basadas en ocurrencias programadas, no días naturales.
- Atributos RPG manuales por hábito con reparto de XP.
- Radar chart inicial de atributos en Progreso.
- Pantalla Hoy.
- Pantalla Hábitos.
- Pantalla Progreso.
- Pantalla Ajustes.
- Misión diaria dinámica: completar todos los hábitos programados para hoy.
- Misión extra de racha perfecta de 7 días.
- Cierre automático de días pasados usando fecha local del dispositivo.
- Recordatorios locales opcionales con selector de hora.
- Recordatorio diario configurable de cierre del día con selector de hora.
- Exportación JSON.
- Importación/restauración JSON.
- Nombre de jugador persistente, definido en onboarding y editable en Ajustes.
- ES/EN.
- Modo oscuro.

No incluye:

- Estadísticas avanzadas.
- Balance definitivo de atributos/rangos.
- Logros complejos.
- IA local.
- Misiones generativas.
- Store polish completo.

## v1.0 QA / Release candidate

Estado: QA inicial validada. Mantener esta fase abierta solo para bugs concretos que aparezcan al seguir usando la app.

Objetivo: mantener el MVP funcional estable mientras se construyen las siguientes versiones de producto.

Tareas:

- Probar en Android real/emulador: validado inicialmente por el usuario.
- Validar SQLite en dispositivo.
- Validar migraciones desde instalación limpia.
- Validar recordatorios con permisos reales.
- Validar exportación JSON en Android.
- Validar importación/restauración JSON en Android.
- Validar navegación y formularios en pantallas pequeñas.
- Validar ES/EN.
- Revisar `expo-doctor` y duplicado `expo-constants`: validado como no bloqueante para el APK preview actual.
- Crear build `preview` con EAS: hecho.
- Validar EAS Update en canal `preview` para parches JS/UI sin reinstalar APK.
- Corregir crashes o warnings nativos.

## v1.1 — Offline serio

Estado: pendiente.

Objetivo: mejorar confianza de datos y recuperación.

Incluye:

- Confirmaciones antes de restaurar.
- Recalcular player desde events.
- Pantalla simple de datos/exportación.
- Mejor manejo de errores de DB.
- Tests de repositorio o capa de datos.

## v1.2 — Pulido de producto

Estado: implementado y validado en Android real por el usuario.

Objetivo: que la app se sienta publicable.

Incluye:

- Logo final.
- Icono final.
- Splash final.
- Pantalla onboarding real.
- Pantalla rank-up real.
- Pulido visual siguiendo `DESIGN.md`.
- Textos del Sistema más consistentes.
- Estados vacíos mejores.
- Microinteracciones razonables.
- Accesibilidad básica.
- Revisión de contraste.
- QA de pantallas pequeñas.
- Warnings estructurales de React Doctor resueltos.

## v1.3 — Producto, métricas simples y uso real

Estado: fase activa, primer bloque implementado.

Objetivo: hacer que LevelArc sea más útil al usarla varios días seguidos, sin meter todavía complejidad de IA ni sistemas grandes.

Incluye:

- Rachas por hábito visibles: implementado en detalle de hábito.
- Historial por hábito: implementado en detalle de hábito.
- Completados/fallados por semana.
- Mejor pantalla de detalle de hábito: implementada primera versión.
- Filtro básico de historial.
- Métricas útiles de consistencia: implementada consistencia 30 días por hábito.
- Lectura más clara de progreso por atributo.
- Ajustes de producto que salgan usando la app con datos reales.
- Mantener backup import/export como salvavidas antes de cerrar release, pero sin bloquear esta fase.

## v2.0 — Gamificación avanzada

Estado: fase activa, primer bloque implementado.

Objetivo: aumentar retención sin meter IA todavía.

Implementado (primer bloque):

- Economía de Esencia: moneda gastable distinta del XP, ganada al completar hábitos, reclamar misión diaria, racha perfecta y subir de nivel; reversión exacta y no farmeable. Lógica pura en `src/core/economy.ts`, migraciones 0006-0007.
- Tienda del Sistema (`/shop`, accesible desde Ajustes y Progreso): se gasta Esencia en cosméticos que no afectan al motor de XP.
- Títulos de Jugador (5) y auras del emblema (6), con requisitos de nivel/rango y compra atómica. Catálogo y reglas en `src/core/shop.ts`, migración 0008.

Implementado (segundo bloque):

- Logros / medallas: 21 logros en 6 categorías, catálogo puro con condición por logro en `src/core/achievements.ts`, evaluación tras cada acción y al arrancar, Esencia al desbloquear y persistencia idempotente en `achievements_unlocked` (migración 0009). Pantalla `/achievements` accesible desde Progreso y Ajustes.
- Celebraciones de rango (rank-up automático): la cinemática de ascenso se dispara sola al subir de rango jugando, con rango origen/destino.
- Feedback de recompensa: overlay global de celebración (logro, subida de nivel del jugador y subida de nivel de atributo), micro-feedback al completar un hábito y lectura de progreso por atributos en Progreso (`AttributeRow`).

Pendiente dentro de v2.0:

- Más misiones, no generativas.
- Estadísticas avanzadas.
- Evolución del sistema de rachas si los datos reales lo piden.
- Ajuste de curva XP si los datos reales lo piden.

## v2.x — IA local "el Sistema"

Estado: chat por reglas (Fase 5A) implementado; LLM on-device (Fase 5B) pendiente de build nativo.

Objetivo: añadir personalidad del Sistema sin romper privacidad. Referencia completa en `docs/IA-SISTEMA.md`.

Implementado (Fase 5A — chat del Sistema por reglas):

- Chat "el Sistema" (tono Solo Leveling) accesible desde Hoy y Ajustes, pantalla `app/system-chat.tsx`.
- Funciona offline con motor determinista por plantillas (reglas), no un LLM todavía.
- Arquitectura enchufable: interface `SystemChatEngine` con adapters `templateEngine` (activo) y `llamaEngine` (STUB).
- Contexto determinista desde SQLite (`src/core/aiContext.ts`) y voz por reglas (`src/core/systemVoice.ts`), puros y testeados.
- Bilingüe vía `{key, params}` + i18n, tablas `ai_profile` y `ai_messages` (migración 0010).
- Entregado por OTA (JS puro).

Pendiente (Fase 5B — LLM on-device, build nativo):

- Modelo local descargable: Gemma 3 1B GGUF Q4_K_M (~720 MB). Plan B: Llama 3.2 1B / Qwen 2.5 1.5B.
- Integración con `llama.rn` (binding de llama.cpp, GGUF). Alternativa: `react-native-executorch`.
- Sin tool calling. Sin subagentes.
- Requiere New Architecture + módulo nativo: development build + nuevo EAS Build + bump de `runtimeVersion`. NO es OTA.
- Descarga del modelo bajo demanda con la NEW File API de `expo-file-system`, toggle de IA obligatorio.
- Rellenar `src/ai/llamaEngine.ts` (real, con streaming) sobre la misma interface.

Plan, checklist y riesgos detallados en `docs/IA-SISTEMA.md`.

## Play Store

Estado: paso final, no objetivo inmediato.

La intención de producto es publicar cuando LevelArc esté más completa, no sacar un MVP temprano. Antes de tiendas deben cerrarse las fases de pulido, producto, gamificación avanzada y valorar IA local. Play Store y App Store quedan al final del roadmap.

Tareas:

- Confirmar marca en USPTO si se va en serio con registro.
- Política de privacidad.
- Ficha Play Store.
- Screenshots.
- Descripción ES/EN.
- Clasificación de contenido.
- AAB production.
- Definir si habrá build iOS/App Store y preparar la configuración nativa cuando toque.
- Pruebas internas.
- Revisión de permisos.
