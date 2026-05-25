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
- [ ] Validar botón Ajustes > Actualizaciones en Android.
- [ ] Probar crear hábito en Android.
- [ ] Probar selector de hora en hábitos: seleccionar hora, guardar, editar y limpiar recordatorio.
- [ ] Probar onboarding inicial en Android: guardar nombre y entrar con "Iniciar juego".
- [ ] Probar entrada de retorno en Android: resumen de rango/XP y "Continuar jugando".
- [ ] Probar cambio de nombre desde Ajustes.
- [ ] Probar editar hábito en Android.
- [ ] Probar archivar hábito en Android.
- [x] Confirmar en Android que Hábitos muestra todos los hábitos activos y que las tarjetas/empty states ocupan ancho completo.
- [ ] Probar hábito contable hasta completar meta.
- [ ] Confirmar que un hábito lunes/miércoles/viernes/sábado no aparece en domingo.
- [ ] Probar cambio de día local en Android: dejar la app abierta hasta medianoche y confirmar que Hoy pasa al día nuevo.
- [ ] Probar cambio de zona horaria del teléfono sin Internet y confirmar que Hoy usa la fecha local nueva.
- [ ] Probar fallar hábito y confirmar que no baja de nivel.
- [ ] Probar deshacer acción del día.
- [ ] Probar misión diaria y reclamar bonus.
- [ ] Probar cierre manual del día.
- [ ] Probar exportación JSON vía Android share sheet.
- [ ] Probar importación/restauración JSON en Android.
- [ ] Probar permisos y scheduling de notificaciones.
- [ ] Probar recordatorio de cierre del día: configurar hora, recibir notificación y desactivar.

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
- [ ] Revisar pantallas pequeñas.

## Datos / lógica

- [x] Añadir tests para rachas por hábito.
- [ ] Añadir tests para cierre de día.
- [x] Añadir tests para misión diaria.
- [ ] Añadir tests para recalcular player desde events y misiones reclamadas.
- [x] Añadir tests para normalización, reparto y nivel de atributos.
- [ ] Revisar balance final de curva de atributos frente a nivel/rango.
- [x] Igualar multiplicador de racha por hábito en web fallback.
- [ ] Revisar si `racha_misiones` debe resetearse si no se reclama misión.

## i18n

- [ ] Revisar todo el copy ES.
- [ ] Revisar todo el copy EN.
- [x] Eliminar `src/i18n/es.json` y `src/i18n/en.json` obsoletos.
- [ ] Confirmar idioma inicial por configuración del dispositivo o dejar español por defecto.

## Calidad técnica

- [x] Resolver o validar `expo-doctor` duplicado `expo-constants`.
- [ ] Validar EAS Update end-to-end en preview.
- [ ] Añadir tests de repositorio o integración local.
- [x] Revisar warnings estructurales de React Doctor.
- [ ] Revisar rendimiento de SQLite sync/async.
- [ ] Revisar imports y dead code antes de release.
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
