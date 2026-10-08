# Publicar LevelArc en Google Play

Pasos desde el código actual hasta un build de producción en Google Play, con la QA en dispositivo que hay que pasar antes.

> **La versión `1.2.0` no se ha ejecutado en ningún dispositivo.** Todo lo que cambió después del build `1.1.6` se verificó con tests, `expo export`, `expo prebuild` y la previsualización web. Nada de eso prueba el comportamiento en Android: SQLite real, notificaciones, selector de ficheros, hoja de compartir, copia de seguridad del sistema, TalkBack y el modelo de IA. La [lista de QA](#qa-en-dispositivo) existe para cerrar ese hueco y es obligatoria antes del build de producción.

## 1. Comprobaciones previas

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm run doctor
```

- `pnpm check` debe terminar en verde: TypeScript, ESLint sin avisos y tests.
- Usa `pnpm run doctor`. `pnpm doctor` a secas es un comando propio de pnpm y no ejecuta `expo-doctor`.
- `expo-doctor` deja tres avisos conocidos. Ninguno se arregla con trucos de dependencias:
  - Duplicado de `expo-constants` (`56.0.14` vía `expo-linking`). El build `1.1.6` se generó con él.
  - Paquetes de Expo SDK 56 por detrás del último parche. Actualizarlos cambia el binario y exige repetir la QA.
  - Regresión de memoria de Hermes V1 en `expo@56.0.4`, corregida solo en SDK 57. Afecta sobre todo a sesiones largas y al uso con el modelo de IA cargado: vigila el consumo de memoria en la QA.

## 2. OTA o build

| Cambio | Entrega |
| --- | --- |
| JavaScript, TypeScript, textos, estilos, imágenes usadas desde JS | OTA con EAS Update, si el runtime instalado es el mismo |
| `app.json` nativo, plugins, permisos, dependencias nativas, SDK de Expo, `version`, `versionCode`, `runtimeVersion`, iconos o splash | Build nuevo |

`runtimeVersion` sigue la política `appVersion`: cada versión de la app es un runtime distinto y un OTA solo llega a los binarios de su misma versión. `eas.json` usa `appVersionSource: local`, así que `version` y `android.versionCode` se cambian a mano en `app.json` (y `version` también en `package.json`). Google Play rechaza un `versionCode` ya subido.

La `1.2.0` necesita build: añade módulos nativos (`expo-sharing`, `expo-document-picker`, `expo-keep-awake`), el plugin de reglas de copia de seguridad y cambia permisos.

## 3. Build de preview

```bash
pnpm build:android:preview
```

Genera un APK interno en el canal `preview`. En ese canal la app se comporta como build interno: muestra la sección Demo de Ajustes y el diagnóstico de la IA.

### Comprobar que el binario lleva `llama.rn`

Si el `postinstall` de `llama.rn` no se ejecuta en EAS, el APK compila pero sale sin sus librerías nativas y el chat falla en el dispositivo con `JSI bindings not installed`.

```bash
# APK
unzip -l levelarc.apk | grep 'lib/arm64-v8a/librnllama'

# AAB
unzip -l levelarc.aab | grep 'base/lib/arm64-v8a/librnllama'
```

Deben salir varias `librnllama*.so` (14 en el build `1.1.6`), entre ellas `librnllama.so` y una `librnllama_jni*.so`. Si no sale ninguna, el build no vale: revisa que `llama.rn` sigue en `pnpm.onlyBuiltDependencies`.

### Comprobar los permisos del binario

`expo prebuild` solo enseña el manifiesto de la app. El definitivo sale de fusionarlo con los de las librerías al compilar:

```bash
aapt2 dump permissions levelarc.apk
```

Permisos esperados y por qué:

| Permiso | Origen | Para qué |
| --- | --- | --- |
| `INTERNET` | plantilla, `expo-file-system` | Descargar el modelo de IA y recibir updates OTA |
| `ACCESS_NETWORK_STATE` | `expo-updates` | Saber si hay red antes de buscar un update |
| `POST_NOTIFICATIONS` | `expo-notifications` | Recordatorios en Android 13 o superior |
| `RECEIVE_BOOT_COMPLETED` | `expo-notifications` | Reprogramar los recordatorios tras reiniciar el teléfono |
| `VIBRATE` | plantilla | Vibración de las notificaciones |
| `WAKE_LOCK`, `com.google.android.c2dm.permission.RECEIVE` | Firebase Messaging, dependencia de `expo-notifications` | La app no usa notificaciones push; llegan con la librería |
| Permisos de contador de icono de varios fabricantes | ShortcutBadger, dependencia de `expo-notifications` | Sin uso en la app; llegan con la librería |
| `app.levelarc.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | AndroidX | Permiso interno de la propia app |

`SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` están bloqueados en `app.json` y no deben aparecer. Las tres últimas filas no se han podido confirmar sin compilar: si la salida de `aapt2` no coincide, corrige esta tabla.

## 4. QA en dispositivo

Instala el APK de preview en un Android real. Marca cada punto con el resultado, y apunta modelo y versión de Android.

### Actualización desde una instalación existente

- [ ] Instalar la `1.2.0` encima de una `1.1.6` con datos. La base pasa de `user_version` 0 a 2 y hábitos, historial, XP, Esencia, compras y logros siguen intactos.
- [ ] Instalación limpia: onboarding, primer hábito y primera misión.

### Acciones y datos

- [ ] Completar, fallar, deshacer y reclamar con toques muy rápidos y repetidos. No se duplica XP ni Esencia y los botones se ven ocupados.
- [ ] En un hábito contable, varios `+1` seguidos a ritmo normal entran todos.
- [ ] Cerrar la app a la fuerza a mitad de una acción y volver a abrir. El estado es coherente: la acción entró entera o no entró.
- [ ] Dejar la app abierta al cruzar la medianoche. Hoy pasa al día nuevo y el día anterior se cierra.
- [ ] Cambiar la zona horaria del teléfono sin conexión. Hoy usa la fecha local nueva.

### Backup en fichero

- [ ] Exportar: se abre la hoja de compartir con `levelarc-backup-AAAA-MM-DD.json`. Guardarlo en Archivos y en Drive.
- [ ] Desinstalar, reinstalar e importar ese fichero. Los datos vuelven y los recordatorios se reprograman.
- [ ] En el selector se puede elegir el `.json` desde Archivos y desde Drive (no sale deshabilitado).
- [ ] Importar un fichero que no es un backup: aviso con el motivo, sin tocar los datos.
- [ ] Importar un backup grande (miles de eventos): medir cuánto tarda y que la app no se cierra.

### Notificaciones

- [ ] El diálogo de permiso aparece al guardar el primer recordatorio.
- [ ] Existe un único canal, "Recordatorios", en los ajustes del sistema.
- [ ] Un recordatorio salta el día de la semana y a la hora local correctos.
- [ ] El icono de la notificación es la silueta del emblema y el tinte es cian.
- [ ] Con el permiso denegado, el aviso lo explica y "Abrir ajustes" lleva a los ajustes de la app.
- [ ] Conceder el permiso en los ajustes del sistema y volver a la app sin cerrarla: el recordatorio queda programado.
- [ ] Con el recordatorio de cierre activo, revocar el permiso y volver: Ajustes muestra la hora guardada, el aviso de notificaciones desactivadas y "Abrir ajustes".
- [ ] Crear dos hábitos con recordatorio seguidos y cambiar de idioma justo después: cada hábito conserva un único recordatorio.
- [ ] Tras cambiar de idioma, el texto de los recordatorios programados cambia.
- [ ] Tras importar un backup y tras resetear, la agenda coincide con los hábitos.

### Arranque y errores

- [ ] Pantalla de error de arranque. No se puede forzar con facilidad en un dispositivo: solo se ha visto en la previsualización web provocando el fallo. Si aparece durante la QA, comprobar que Reintentar funciona y anotar el motivo.

### Accesibilidad

- [ ] TalkBack en Hoy: cada tarjeta anuncia el hábito y sus acciones con nombre (Completar, Fallar, Deshacer).
- [ ] TalkBack en el formulario de hábito: iconos, atributos, importancia, tipo y días anuncian rol y si están elegidos; el botón de crear anuncia qué falta.
- [ ] TalkBack en la aparición de NYX: el foco queda dentro del overlay y se puede cerrar.
- [ ] Los interruptores de Ajustes anuncian nombre y estado.

### Icono y arranque

- [ ] Icono normal, icono temático (Android 13 o superior, con "Iconos temáticos" activado) y splash.
- [ ] Primer arranque con el teléfono en inglés: la app sale en inglés. Con otro idioma: en español.

### IA local

- [ ] Descarga del modelo de principio a fin desde la URL fijada, con WiFi.
- [ ] Sin espacio suficiente: error específico de espacio, sin descargar nada.
- [ ] La pantalla no se apaga durante la descarga y vuelve a apagarse con normalidad al terminar o cancelar.
- [ ] Chat con el modelo cargado.
- [ ] Cancelar el chat durante la carga en frío del modelo.
- [ ] Borrar el modelo mientras genera una respuesta.
- [ ] El botón atrás del sistema cierra la aparición de NYX.
- [ ] Consumo de memoria y temperatura en una sesión larga con el modelo cargado.

### Copia de seguridad de Android

- [ ] Con la copia de Google activada y el modelo descargado, forzar una copia (`adb shell bmgr backupnow app.levelarc`) y comprobar que termina.
- [ ] Restaurar en un segundo dispositivo o tras desinstalar (`adb shell bmgr restore`): los hábitos y el progreso vuelven, la IA aparece como no descargada y los recordatorios se reprograman al abrir.

### Canal de producción

- [ ] En un build del canal `production`, Ajustes no muestra la sección Demo y la pantalla de IA no muestra diagnóstico, versiones internas ni trazas. Esto solo se puede comprobar con el AAB de producción instalado desde la prueba interna de Play.

## 5. Build de producción

Cuando la QA esté cerrada sobre el mismo commit:

```bash
pnpm build:android:production
```

Genera un AAB en el canal `production`. Repite sobre el AAB las dos comprobaciones del binario (`librnllama` y permisos).

## 6. Play Console

`eas submit` no está configurado: el AAB se sube a mano.

1. Crear la aplicación con el paquete `app.levelarc`, gratuita.
2. Aceptar Play App Signing en la primera subida.
3. Rellenar la ficha con [`../references/play-store.md`](../references/play-store.md): textos en español e inglés, seguridad de los datos, clasificación de contenido, público objetivo y declaración de anuncios.
4. Subir icono, gráfico de funciones y capturas. Están pendientes.
5. Indicar la URL de la política de privacidad y comprobar que la página responde.
6. Subir el AAB a **Prueba interna** e instalarlo desde Play en un dispositivo. Repetir ahí los puntos de [canal de producción](#canal-de-producción) y un recorrido rápido.
7. Pasar a prueba cerrada si la cuenta lo exige. Las cuentas personales nuevas necesitan una prueba cerrada con testers durante un periodo mínimo antes de poder publicar en producción; Play Console indica el requisito vigente.
8. Publicar en producción con lanzamiento escalonado.

## 7. Marcha atrás

Depende de qué se rompió.

- **Un update OTA roto.** Se revierte con EAS Update, sin pasar por Play:

  ```bash
  npx eas-cli update:rollback
  ```

  El comando es interactivo: pide el canal (`production`) y deja elegir entre volver al update anterior o al JavaScript incluido en el binario. También se puede volver a publicar un grupo concreto con `npx eas-cli update:republish --group <id>`. Solo afecta a los binarios de ese runtime y los usuarios lo reciben en el siguiente arranque.

- **Un binario roto.** Google Play no permite volver a un `versionCode` anterior. Hay que detener el lanzamiento escalonado en Play Console y subir un build nuevo con un `versionCode` mayor. Si el fallo está solo en JavaScript, un OTA al runtime afectado lo corrige antes que un build.

- **Una migración de base de datos rota.** No tiene marcha atrás: las migraciones publicadas no se editan y los datos ya migrados se quedan así. Por eso la actualización desde `1.1.6` es el primer punto de la QA.
