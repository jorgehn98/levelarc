# LevelArc — Pendientes

Referencia base: [`LevelArc-PROYECTO.md`](./LevelArc-PROYECTO.md). Este archivo es checklist de ejecución, no biblia conceptual.

## Prioridad alta

- [ ] Probar en Android real o emulador.
- [x] Ejecutar `pnpm build:android:preview`.
- [x] Revisar resultado del build preview EAS `6914231b-d85a-464a-83a3-2794f392ca65`.
- [x] Relanzar build preview tras añadir `babel-preset-expo`.
- [x] Validar si el duplicado `expo-constants` de `expo-doctor` afecta al build nativo.
- [ ] Instalar APK preview `86105d10-d74e-4300-870a-a0081e7aee6c` en Android.
- [ ] Probar crear hábito en Android.
- [ ] Probar editar hábito en Android.
- [ ] Probar archivar hábito en Android.
- [ ] Probar hábito contable hasta completar meta.
- [ ] Probar fallar hábito y confirmar que no baja de nivel.
- [ ] Probar deshacer acción del día.
- [ ] Probar misión diaria y reclamar bonus.
- [ ] Probar cierre manual del día.
- [ ] Probar exportación JSON vía Android share sheet.
- [ ] Probar importación/restauración JSON en Android.
- [ ] Probar permisos y scheduling de notificaciones.

## Backup

- [x] Implementar importación/restauración de backup JSON.
- [x] Validar versión de backup.
- [ ] Añadir confirmación explícita antes de sobrescribir datos locales.
- [x] Restaurar `player` desde backup.
- [x] Documentar flujo de backup en Ajustes.
- [ ] Mejorar importación con selector de archivo si hace falta.

## Assets y marca

- [x] Guardar set de logos en `assets/brand/`.
- [x] Integrar logo en icono, favicon, splash y adaptive icon.
- [x] Usar logo dentro de la UI inicial.
- [x] Crear logo vector simplificado.
- [ ] Validar icono app en tamaños pequeños reales, especialmente 48px.
- [ ] Crear icono app 48px simplificado.
- [ ] Validar adaptive icon Android en build real.
- [ ] Validar splash en build real.
- [ ] Revisar dominio `levelarc.app`.
- [ ] Confirmar USPTO si se va a registrar marca.

## UX / UI

- [ ] Pulir pantalla Hoy.
- [ ] Pulir pantalla Hábitos.
- [ ] Pulir pantalla Progreso.
- [ ] Pulir pantalla Ajustes.
- [ ] Crear onboarding real.
- [ ] Crear pantalla rank-up real.
- [ ] Mejorar estados vacíos.
- [ ] Añadir confirmación al archivar hábito.
- [ ] Añadir confirmación al cerrar día.
- [ ] Revisar textos del Sistema.
- [ ] Revisar contraste de rangos E-S.
- [ ] Revisar pantallas pequeñas.

## Datos / lógica

- [ ] Añadir tests para rachas por hábito.
- [ ] Añadir tests para cierre de día.
- [ ] Añadir tests para misión diaria.
- [ ] Añadir tests para recalcular player desde events.
- [ ] Revisar multiplicador de racha real: ahora el MVP usa base simple en web fallback.
- [ ] Revisar si `racha_misiones` debe resetearse si no se reclama misión.

## i18n

- [ ] Revisar todo el copy ES.
- [ ] Revisar todo el copy EN.
- [ ] Eliminar o reutilizar `src/i18n/es.json` y `src/i18n/en.json` si quedan obsoletos.
- [ ] Confirmar idioma inicial por configuración del dispositivo o dejar español por defecto.

## Calidad técnica

- [x] Resolver o validar `expo-doctor` duplicado `expo-constants`.
- [ ] Añadir tests de repositorio o integración local.
- [ ] Revisar warnings de React Doctor.
- [ ] Revisar rendimiento de SQLite sync/async.
- [ ] Revisar imports y dead code antes de release.
- [ ] Añadir manejo de errores visible para backup/notificaciones.

## Store / release

- [x] Crear build preview.
- [ ] Test interno.
- [ ] Crear build production AAB.
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
