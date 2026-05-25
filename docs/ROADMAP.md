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

Estado: pendiente.

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

## v1.3 — Estadísticas simples

Estado: pendiente.

Objetivo: dar más feedback sin complicar demasiado.

Incluye:

- Rachas por hábito visibles.
- Historial por hábito.
- Completados/fallados por semana.
- Mejor pantalla de detalle de hábito.
- Filtro básico de historial.

## v2.0 — Gamificación avanzada

Estado: futuro.

Objetivo: aumentar retención sin meter IA todavía.

Incluye:

- Logros.
- Más misiones, no generativas.
- Celebraciones de rango.
- Evolución del sistema de rachas si los datos reales lo piden.
- Estadísticas avanzadas.
- Ajuste de curva XP si los datos reales lo piden.

## v2.x — IA local opcional

Estado: futuro documentado, no implementar aún.

Objetivo: añadir personalidad del Sistema sin romper privacidad.

Según la biblia:

- Modelo local descargable: Gemma 4 E2B GGUF Q4.
- Integración probable: `llama.rn`.
- Sin tool calling.
- Sin subagentes.
- Contexto determinista armado desde SQLite por TypeScript.
- Tablas futuras: `AI_MESSAGES`, `AI_PROFILE`.

No crear tablas IA hasta que se vaya a implementar la feature.

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
