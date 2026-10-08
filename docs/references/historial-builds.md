# LevelArc — Historial de builds y updates

Registro histórico de los builds de EAS y de los updates OTA publicados hasta la versión `1.1.6`, con las notas de cada corrección. Se movió aquí desde [`../ESTADO-ACTUAL.md`](../ESTADO-ACTUAL.md) para que aquel documento describa solo el estado vigente. Las entradas se conservan tal como se escribieron en su momento: hablan en presente de cosas que ya no lo son y no siguen un orden cronológico estricto.

El build válido más reciente es `9b238105-e0db-460e-a69e-92110759df24` (`1.1.6`, versionCode `11`). La versión `1.2.0` (versionCode `12`) todavía no tiene build.

## Builds de EAS y parche de `llama.rn`

Primer build preview Android lanzado en EAS:

- ID: `6914231b-d85a-464a-83a3-2794f392ca65`
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/6914231b-d85a-464a-83a3-2794f392ca65>
- Estado: falló en `:app:createBundleReleaseJsAndAssets` porque EAS no resolvió `babel-preset-expo` como dependencia directa.
- Acción tomada: `babel-preset-expo@~56.0.12` añadido como devDependency.

Build preview Android válido:

- ID: `86105d10-d74e-4300-870a-a0081e7aee6c`
- APK: <https://expo.dev/artifacts/eas/hybi6oNPHUQChncupNRcNd.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/86105d10-d74e-4300-870a-a0081e7aee6c>
- Estado: terminado correctamente.
- Fingerprint: `378cdeec443ebd5ab8ec2fa11c66dc4dcc6e394c`
- Perfil: `preview`, distribución interna, SDK `56.0.0`, version `1.0.0`, versionCode `1`.

Build preview Android actual tras QA:

- ID: `a620ba5d-55a7-429c-bdb7-f67bda80bae9`
- APK: <https://expo.dev/artifacts/eas/mvPFAjN55GCXsGkBCnGxtx.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/a620ba5d-55a7-429c-bdb7-f67bda80bae9>
- Estado: terminado correctamente.
- Fingerprint: `2ad4b4a2ba5c04a2538a5959d9a4b35a8387142a`
- Perfil: `preview`, distribución interna, SDK `56.0.0`, version `1.0.1`, versionCode `2`.
- Cambios: hábitos nuevos sin días preseleccionados, chips seleccionados legibles en modo oscuro y test para weekdays lunes=1/domingo=7.

Build preview Android actual con EAS Update:

- ID: `f8c42fc9-d766-4e58-8859-d2b0a48e76e1`
- APK: <https://expo.dev/artifacts/eas/wHFNQL4UtiQ5TjGhaY1c1V.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/f8c42fc9-d766-4e58-8859-d2b0a48e76e1>
- Estado: terminado correctamente.
- Fingerprint: `5b23a8e20edbbc1bd0f4b5e29ca41b94ae1b4a56`
- Perfil: `preview`, canal `preview`, runtimeVersion `1.0.2`, SDK `56.0.0`, version `1.0.2`, versionCode `3`.
- Incluye `expo-updates`, botón de actualización interna en Ajustes y canales EAS Update.

Build preview Android actual con actualización automática al arranque:

- ID: `6e5e6b06-bb05-481d-bcb0-85808bce2981`
- APK: <https://expo.dev/artifacts/eas/eCtjS5na8CNGaV6SxaiN2X.apk>
- Logs: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/6e5e6b06-bb05-481d-bcb0-85808bce2981>
- Estado: terminado correctamente.
- Fingerprint: `2d844f8e79f4e7f2343903a11d0843d6228a08d5`
- Perfil: `preview`, canal `preview`, runtimeVersion `1.0.2`, SDK `56.0.0`, version `1.0.2`, versionCode `4`.
- Incluye comprobación automática de EAS Update al arrancar, manteniendo el botón manual de Ajustes como fallback.

Build preview Android con LLM (llama.rn + Gemma 4 E2B):

- ID: `1c04b308-ea9a-44a9-afb1-da7ecb837927`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/1c04b308-ea9a-44a9-afb1-da7ecb837927>
- Estado: terminado correctamente.
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.0`, version `1.1.0`, versionCode `5`.
- Compiló con `llama.rn` 0.12.4 (New Arch). El config plugin cargó sin el gotcha `ERR_REQUIRE_ESM` porque EAS usa Node 22.15.1 (fijado en `eas.json`). El postinstall de `llama.rn` descargó los binarios nativos (`allowBuilds` `llama.rn: true` en `pnpm-workspace`).
- Gotcha del build: el primer intento falló por un bug de `eas-cli` en Windows (git clone `file:///C:/...` con git 2.53 da código 128, "does not appear to be a git repository"). Se resolvió con `EAS_NO_VCS=1` para empaquetar el working dir sin git clone.
- Estado posterior: este build quedó superado por `1.1.6`; se mantiene aquí como histórico.

Build preview Android histórico con LLM diagnostics y EAS Update sin code signing:

- ID: `e37eafc1-40a9-49db-a913-5c58201e902d`
- APK: <https://expo.dev/artifacts/eas/u6kBoGBLi8EzzfmEdZtEet.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/e37eafc1-40a9-49db-a913-5c58201e902d>
- Estado: terminado correctamente.
- Fingerprint: `6d61e4d4e680d39f836c293fb329a116e16f85e0`
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.0`, version `1.1.0`, versionCode `5`.
- Commit: `84264be` (`Add LLM runtime diagnostics`).
- Nota posterior: este APK NO es válido para IA local; al inspeccionarlo no contiene `lib/arm64-v8a/librnllama*.so` porque EAS/pnpm ignoró el postinstall de `llama.rn`. Sí compiló, pero en device sigue dando `JSI bindings not installed`.
- Estado posterior: sustituido por builds posteriores; se mantiene como histórico del fallo de postinstall sin `.so`.


Patch Android bridgeless para llama.rn 0.12.4:

- Problema: incluso con `.so` nativas presentes, `llama.rn` 0.12.4 puede devolver `JSI bindings not installed` en Expo SDK 56 / RN 0.85 bridgeless porque su módulo Android llama a `context.getCatalystInstance().getJSCallInvokerHolder()`.
- Evidencia: issue upstream `mybigday/llama.rn#354` describe el mismo fallo en Expo/RN bridgeless; RN 0.85 expone `ReactContext.getJSCallInvokerHolder()` para este caso.
- Fix local: `patches/llama.rn@0.12.4.patch`, aplicado por `pnpm.patchedDependencies`, cambia `RNLlamaModule.java` para usar `context.getJSCallInvokerHolder()` y sincronizar `JavaScriptContextHolder` antes de instalar JSI.
- Build nativo generado: `aad21dd9`, `1.1.2`, Android versionCode `7`, runtimeVersion `1.1.2`.


Build preview Android histórico con patch JSI bridgeless:

- ID: `aad21dd9-d706-4e48-b1ec-f835ccf28374`
- APK: <https://expo.dev/artifacts/eas/n6r8rLtNE1HaZ5Mk9QcKq1.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/aad21dd9-d706-4e48-b1ec-f835ccf28374>
- Estado: terminado correctamente.
- Fingerprint: `9e98f365cd0766f978cbba3f70f4c87c41425a2b`
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.2`, version `1.1.2`, versionCode `7`.
- Commit: `9f2887b` (`Pin pnpm version for EAS builds`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so` y compila con `patches/llama.rn@0.12.4.patch`, que evita `getCatalystInstance()` en Android bridgeless.
- Estado posterior: sustituido por builds posteriores; se mantiene como histórico.

Build preview Android histórico con runtime JSI vía CallInvoker:

- ID: `5cf2587d-df9d-4020-a247-2dffdb48fa79`
- APK: <https://expo.dev/artifacts/eas/ctG9fY6ohiBC8AZebmwBE2.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/5cf2587d-df9d-4020-a247-2dffdb48fa79>
- Estado: terminado correctamente.
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.5`, version `1.1.5`, versionCode `10`.
- Commit: `c45e521` (`Fix llama JSI runtime install`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so`; `librnllama_jni*.so` contiene las trazas `CallInvoker runtime` / `installing JSI bindings on JS invoker runtime`; el bundle contiene `LevelArc 1.1.5` y la espera robusta de JSI.
- Estado posterior: instalado en Android real y descartado; seguía cayendo a `JSI bindings not installed`. Lo sustituye `1.1.6`.

Build preview Android histórico con espera robusta de bindings JSI:

- ID: `f95b548a-d6d1-4379-91f2-bfee60649269`
- APK: <https://expo.dev/artifacts/eas/wMV4BwbAmNUZJH8ch8xwEe.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/f95b548a-d6d1-4379-91f2-bfee60649269>
- Estado: terminado correctamente.
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.4`, version `1.1.4`, versionCode `9`.
- Commit: `c2fbb03` (`Harden llama JSI binding install`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so`, recompila `librnllama_jni*.so` y el bundle contiene los mensajes de espera robusta (`JSI bindings not installed after native install`, `Native install returned false`).
- Estado posterior: sustituido por `1.1.5` y luego por el build válido `1.1.6`; se mantiene como histórico.

Build preview Android histórico con LLM native libs verificadas:

- ID: `114d891f-0f8e-4dd9-8706-b6dec7d886e1`
- APK: <https://expo.dev/artifacts/eas/38VCEbYsGPo5eFAYrXCVJZ.apk>
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/builds/114d891f-0f8e-4dd9-8706-b6dec7d886e1>
- Estado: terminado correctamente.
- Fingerprint: `88fe111454de9c5b049ac5ac5ab003aa9311401f`
- Perfil: `preview`, distribución interna, runtimeVersion `1.1.1`, version `1.1.1`, versionCode `6`.
- Commit: `68b8412` (`Fix llama native artifact build approval`).
- Verificación del APK: contiene 14 librerías `lib/arm64-v8a/librnllama*.so`, incluyendo `librnllama.so` y `librnllama_jni*.so`. Este sí corrige la causa raíz del error `JSI bindings not installed` causado por el APK anterior sin `.so` nativas.
- Estado posterior: sustituido por builds posteriores; se mantiene como histórico.

Update `preview` inicial publicado:

- Update group: `ec18e587-1d1a-416a-ae1e-0afb28c12237`
- Runtime: `1.0.2`
- Mensaje: `Initial preview update`

Update `preview` con base de design system:

- Update group: `6efa229b-71a2-4dc8-9746-5fbb51bdb918`
- Runtime: `1.0.2`
- Mensaje: `Add design system foundation`
- Commit: `ef9115f52af4eba0ed36115fc986598e5ac05cf1`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/6efa229b-71a2-4dc8-9746-5fbb51bdb918>

Update `preview` con pasada visual completa:

- Update group: `996dc459-2fb5-4b3e-8ba0-1d058783e0a8`
- Runtime: `1.0.2`
- Mensaje: `Polish app UI from design kit`
- Commit: `1dc1b4f57da17f410476f051bfda52f9d9ddd823`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/996dc459-2fb5-4b3e-8ba0-1d058783e0a8>

Update `preview` con corrección de renderizado de Hábitos:

- Update group: `709aa195-5cd6-4c98-b05b-b97c1ea5c44f`
- Runtime: `1.0.2`
- Mensaje: `Fix habits screen rendering`
- Commit: `5fbe2af397f337e995ab9457dac41a7b928c8ff9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/709aa195-5cd6-4c98-b05b-b97c1ea5c44f>

Update `preview` final con filas de Hábitos ordenadas:

- Update group: `6f9318d9-082b-4cd3-a4a6-c75b5b6e6d5d`
- Runtime: `1.0.2`
- Mensaje: `Stabilize habit row layout`
- Commit: `aef11e7f93a50a32e629afcd00594e3f1095419c`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/6f9318d9-082b-4cd3-a4a6-c75b5b6e6d5d>

Update `preview` con onboarding y nombre de jugador:

- Update group: `98feb9cf-db9d-45dd-9501-ab7c3126416e`
- Runtime: `1.0.2`
- Mensaje: `Add player name onboarding flow`
- Commit: `cc75f8aa55f7c8cca01ce1c50872c46d869736f2`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/98feb9cf-db9d-45dd-9501-ab7c3126416e>

Update `preview` con CTA fijo y motion real en onboarding:

- Update group: `d142d5c3-b55c-4465-983a-5312d92f90e6`
- Runtime: `1.0.2`
- Mensaje: `Fix onboarding CTA and motion`
- Commit: `0288fb02fd4456782da0822cde0d2b56b2b1429b`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/d142d5c3-b55c-4465-983a-5312d92f90e6>

Update `preview` alineando CTA onboarding con la referencia:

- Update group: `57dd61c0-fd65-4b29-83ff-6c6eecf4bb13`
- Runtime: `1.0.2`
- Mensaje: `Align onboarding CTA with reference`
- Commit: `12d99a52cb6afe1957b3d6ebfcb3ddf2dcec973a`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/57dd61c0-fd65-4b29-83ff-6c6eecf4bb13>

Update `preview` cambiando el rol de usuario a Jugador:

- Update group: `e4b7f8ed-70a2-4333-bcff-fd64f76f4b39`
- Runtime: `1.0.2`
- Mensaje: cambio de terminología a `Jugador` / `Player`
- Commit: `7b4dab63adb7338eb5c062a0d9306aa7d0837e8b`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/e4b7f8ed-70a2-4333-bcff-fd64f76f4b39>

Update `preview` corrigiendo entrada desde onboarding:

- Update group: `58cdb2ed-16e6-46c0-90d5-4b2bdeca1c69`
- Runtime: `1.0.2`
- Mensaje: evita el bucle de redirección al continuar desde onboarding
- Commit: `ae54d748bbecc084a79d51e4d5748fea2e0f074b`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/58cdb2ed-16e6-46c0-90d5-4b2bdeca1c69>

Update `preview` con comprobación automática al arranque:

- Update group: `1239381d-cd03-4c48-b500-658f7f38ca10`
- Runtime: `1.0.2`
- Mensaje: comprueba updates al arrancar y avisa para reiniciar si descarga uno
- Commit: `bf1fff37aa17566dd021331dd9fb5ae764d32f63`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/1239381d-cd03-4c48-b500-658f7f38ca10>

Update `preview` centrando el CTA de onboarding:

- Update group: `d58e75f6-da76-428b-b052-3ef3c756751f`
- Runtime: `1.0.2`
- Mensaje: centra el texto del CTA y cambia los textos a `Iniciar juego` / `Continuar jugando`
- Commit: `67e194c1b982e25a0cd9d497826af8ea1dc93704`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/d58e75f6-da76-428b-b052-3ef3c756751f>

Update `preview` simplificando cabecera de jugador:

- Update group: `f291b585-62c1-4596-a722-2505a064e169`
- Runtime: `1.0.2`
- Mensaje: elimina la cabecera de jugador de Hoy y deja Ajustes con identidad simple
- Commit: `76d88882f6d1dbeecab6756b59797a3a695eb459`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/f291b585-62c1-4596-a722-2505a064e169>

Update `preview` capando el multiplicador de racha por hábito:

- Update group: `ddd5452e-5106-4479-9c82-49d4015e708c`
- Runtime: `1.0.2`
- Mensaje: `Cap habit streak multiplier`
- Commit: `2a3755c1a52cfac7fdd40ca2eb6b7b692fe9d0b9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/ddd5452e-5106-4479-9c82-49d4015e708c>

Update `preview` respetando días programados en rachas:

- Update group: `d2cc9514-5569-487d-870d-a3b1b23d87ad`
- Runtime: `1.0.2`
- Mensaje: `Respect habit schedules in streaks`
- Commit: `ec2e0b780937dd013a634914b31cb262d5dd41e4`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/d2cc9514-5569-487d-870d-a3b1b23d87ad>

Update `preview` refrescando al cambiar el día local:

- Update group: `2adc1e21-aff1-4c41-8009-4ff97e0bd818`
- Runtime: `1.0.2`
- Mensaje: `Refresh app on local day changes`
- Commit: `a4148c60e8e31e07ff75231e7b60050080ecd79c`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/2adc1e21-aff1-4c41-8009-4ff97e0bd818>

Update `preview` con recordatorio configurable de cierre:

- Update group: `7d1ebc24-8f8d-436b-a484-cca0c362a49e`
- Runtime: `1.0.2`
- Mensaje: `Add end of day reminder setting`
- Commit: `79a7ea0da3cf4acf4bac504ed7533473eb999254`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/7d1ebc24-8f8d-436b-a484-cca0c362a49e>

Update `preview` con selector de hora para recordatorios:

- Update group: `70e19809-c073-484f-ba91-ec052fb3165f`
- Runtime: `1.0.2`
- Mensaje: `Use time picker for reminders`
- Commit: `5c5cb9a0889c4f56a0095a2257b9fa8deb485877`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/70e19809-c073-484f-ba91-ec052fb3165f>

Update `preview` con pulido visual de Hoy:

- Update group: `b82db624-fa8b-422a-a546-d4395542338e`
- Runtime: `1.0.2`
- Mensaje: `Polish today habit cards`
- Commit: `096ea469e048a0f1a9e4d2fd0e04984b3a61125a`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/b82db624-fa8b-422a-a546-d4395542338e>

Update `preview` con widgets de actividad en Progreso:

- Update group: `9e86fe1b-9162-49d3-8ee6-fb464a422340`
- Runtime: `1.0.2`
- Mensaje: `Add progress activity widgets`
- Commit: `73520cd542ddd7c099270dbe6def3e41ace462a9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/9e86fe1b-9162-49d3-8ee6-fb464a422340>

Update `preview` con rediseño de Ajustes:

- Update group: `2f83ad06-7893-4b49-922d-71c4b7364c5a`
- Runtime: `1.0.2`
- Mensaje: `Redesign settings screen`
- Commit: `5d9aaa41e246c0b59d7cafd8ea38e5ccd7dd7bde`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/2f83ad06-7893-4b49-922d-71c4b7364c5a>

Update `preview` con botones del formulario de habito:

- Update group: `bf0c34fe-544c-40d9-b587-866d2efd38a3`
- Runtime: `1.0.2`
- Mensaje: `Polish habit form actions`
- Commit: `cafca2e8a44018834ff2072486d6e7c5f4fff88a`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/bf0c34fe-544c-40d9-b587-866d2efd38a3>

Update `preview` con botones del formulario de edicion de habito:

- Update group: `580f555f-0ad5-4ed0-af1b-6421b0af3ac6`
- Runtime: `1.0.2`
- Mensaje: `Polish edit habit form actions`
- Commit: `ef84146044482bce4b2fcecb583c4bcb6967654d`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/580f555f-0ad5-4ed0-af1b-6421b0af3ac6>

Update `preview` con cierre automatico de dias perdidos:

- Update group: `0a64cf90-5025-4dde-84af-abb14298cb0c`
- Runtime: `1.0.2`
- Mensaje: `Auto close missed habit days`
- Commit: `f630ee746b56c61e4937bc648de965d2c45a0431`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/0a64cf90-5025-4dde-84af-abb14298cb0c>

Update `preview` corrigiendo contraste de botones principales:

- Update group: `1c916ec3-9c6d-42b6-8688-fcc2adca12f5`
- Runtime: `1.0.2`
- Mensaje: `Fix primary button contrast`
- Commit: `7412b9a66d11d296284e204dda502518aebfe548`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/1c916ec3-9c6d-42b6-8688-fcc2adca12f5>

Update `preview` con detalle de hábito y métricas simples:

- Update group: `e5777047-0f20-4a48-b043-c88485cb0597`
- Runtime: `1.0.2`
- Mensaje: `Add habit detail metrics`
- Commit: `e2158e5fbe9c0b511f2ed30f542d15619131cc51`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/e5777047-0f20-4a48-b043-c88485cb0597>

Update `preview` corrigiendo layout nativo de botones de acción:

- Update group: `a7886bb4-5643-402e-9d88-3aa0f7176059`
- Runtime: `1.0.2`
- Mensaje: `Fix native action button layout`
- Commit: `da4bc9f14de7b1caa95c7d67ae2a7f666622f5d7`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/a7886bb4-5643-402e-9d88-3aa0f7176059>

Update `preview` corrigiendo cajas de botones en Android:

- Update group: `10c9eee1-f606-4378-854c-87e2d4b6d2e3`
- Runtime: `1.0.2`
- Mensaje: `Fix native button boxes`
- Commit: `aec9976ced5657cba5242f03dac5e8708a4ac0a4`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/10c9eee1-f606-4378-854c-87e2d4b6d2e3>

Update `preview` corrigiendo el boton Crear habito deshabilitado:

- Update group: `f4d2330b-ed19-4205-84b5-0d2272a02567`
- Runtime: `1.0.2`
- Mensaje: `Fix disabled create habit button`
- Commit: `db2eb5101a4500c7f56cde496a5414c59d40bf7d`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/f4d2330b-ed19-4205-84b5-0d2272a02567>

Update `preview` manteniendo azul el boton Crear habito deshabilitado:

- Update group: `385d7af6-43f8-4bd7-925c-87e3b5b7f238`
- Runtime: `1.0.2`
- Mensaje: `Use blue disabled create button`
- Commit: `7bca409f5b62c811249afc007f529a73135de7e9`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/385d7af6-43f8-4bd7-925c-87e3b5b7f238>

Update `preview` igualando visualmente botones primary deshabilitados:

- Update group: `bb5fb7cc-ea82-4ffb-a930-8527cbf862ec`
- Runtime: `1.0.2`
- Mensaje: `Use identical primary button visuals`
- Commit: `d0f646ad35da1699f7dd79fc85fb5c9cc37fb6f4`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/bb5fb7cc-ea82-4ffb-a930-8527cbf862ec>

Build preview fallido durante la configuración de EAS Update:

- ID: `bd0a55b6-69a7-42db-838e-2dab83f5c4ac`
- Causa: `:app:createReleaseUpdatesResources` no encontraba `@babel/plugin-transform-react-jsx` bajo pnpm.
- Acción tomada: `@babel/plugin-transform-react-jsx` añadido como devDependency explícita.

## Notas de la fase 1.1.x

Build nativo EAS con LLM: el build válido actual es `9b238105-e0db-460e-a69e-92110759df24` (runtime `1.1.6`, versionCode `11`). Sustituye al build `5cf2587d` (`1.1.5`), que seguía reproduciendo `JSI bindings not installed` en Android real. El APK `1.1.6` incluye `TurboModuleWithJSIBindings` + `BindingsInstallerHolder`, fuerza C++20 para compilar el wrapper JNI, y el usuario validó que el chat IA local ya funciona.

Build preview `1.1.6` válido: `9b238105-e0db-460e-a69e-92110759df24`, APK `https://expo.dev/artifacts/eas/ka7LYDJr7W4QTMiu7Qbeqh.apk`, runtime `1.1.6`, versionCode `11`. APK inspeccionado: contiene `.so` de `llama.rn`, bundle JS parcheado y JNI con `TurboModuleWithJSIBindings`/`BindingsInstallerHolder`. Diagnóstico en Android real y chat IA local validados.

Ajuste de tono de NYX: el chat local funcionaba, pero el usuario detectó respuestas demasiado duras y robóticas. El prompt del LLM y las plantillas se han reajustado para mantener exigencia sin desprecio, responder a peticiones de ideas con opciones concretas y no reciclar el briefing de misiones ante cualquier mensaje casual.

Segundo ajuste de tono: NYX ya no debe exigir inmediatez falsa si el usuario da una restricción real o un plan viable (por ejemplo, terminar una tarea actual y caminar después). En ese caso debe aceptar el plan, mantener exigencia suave y concretar el siguiente paso realista. También se evita usar el nombre completo del jugador en respuestas LLM.

Ajuste de barra inferior Android: las pantallas base ya no reservan safe-area inferior dentro del contenido cuando van bajo tabs, el tab bar pinta explícitamente el inset inferior con su fondo y el root view usa el fondo oscuro de LevelArc vía `expo-system-ui`. Esto evita la franja negra visible encima/debajo de la navegación inferior.

Segundo ajuste de barra inferior Android: el fondo raíz pasa a coincidir con la tab bar (`surface`) y la tab bar aumenta su cobertura del inset inferior para tapar la línea negra residual. Las apariciones de NYX también se agrandan y se anclan más abajo para que el personaje nazca desde la zona de navegación inferior en vez de flotar separado.

Tercer ajuste de apariciones NYX: el overlay pasa a ser modal, oscurece y bloquea el fondo mientras NYX está visible. El layout cambia de fila a composición vertical: bocadillo arriba y sprite grande centrado debajo, con la base de la imagen anclada justo en la línea superior de la tab bar.

Ajuste Gemma tras instalar la skill `gemma-dev`: el prompt manual del LLM ya no abre un turno `system`. Las instrucciones de NYX, el estado y el mensaje/evento actual se empaquetan dentro del primer turno `user`, que es el formato recomendado para Gemma IT, manteniendo los delimitadores reales del GGUF usado por LevelArc.

## Updates OTA de los runtimes 1.1.x

Update `preview` runtime `1.1.6` con tono conversacional de NYX:

- Grupo: `5b3eaf73-d1d3-4f9c-95ed-e020e47caa37`
- Android update ID: `019e8546-7385-77c1-8e77-5ca56ef8a6c7`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/5b3eaf73-d1d3-4f9c-95ed-e020e47caa37>
- Commit: `8e58318` (`Soften NYX conversational tone`).

Update `preview` runtime `1.1.6` con respeto de planes realistas en NYX:

- Grupo: `a3d73449-3855-4308-9653-ca0043bd57f0`
- Android update ID: `019e86f1-fe48-7179-b4d9-fcf4918bf1ef`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/a3d73449-3855-4308-9653-ca0043bd57f0>
- Commit: `cb2f6c6` (`Make NYX respect realistic plans`).

Update `preview` runtime `1.1.6` corrigiendo franja negra inferior Android:

- Grupo: `283ca94c-c5f6-48a0-84b0-ab283b907665`
- Android update ID: `019e86f9-a81a-73da-be9f-b32a3022bb2a`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/283ca94c-c5f6-48a0-84b0-ab283b907665>
- Commit: `86cedd8` (`Fix Android bottom navigation strip`).

Update `preview` runtime `1.1.6` refinando cobertura inferior y overlay NYX:

- Grupo: `311205d3-6846-4222-848b-ef5aa8816fb6`
- Android update ID: `019e86ff-9ba9-7f11-8c0b-c25aa3a99dcf`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/311205d3-6846-4222-848b-ef5aa8816fb6>
- Commit: `77661d2` (`Refine bottom bar coverage and NYX overlay`).
Update `preview` runtime `1.1.6` convirtiendo apariciones NYX en modal:

- Grupo: `6dba4e24-f8d0-47c3-8089-bd096bf89182`
- Android update ID: `019e8718-9954-7f22-a3d3-f52d898799e7`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/6dba4e24-f8d0-47c3-8089-bd096bf89182>
- Commit: `43eb9ee` (`Make NYX interjection modal`).
Update `preview` runtime `1.1.6` alineando prompt de Gemma con instrucciones en turno user:

- Grupo: `394ee813-749a-48a7-8297-81c5bd0d6d43`
- Android update ID: `019e8747-e9fc-7e72-bd3f-a218273ed34f`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/394ee813-749a-48a7-8297-81c5bd0d6d43>
- Commit: `471fb77` (`Align Gemma prompt with user-turn instructions`).

Update `preview` runtime `1.1.5` con diagnóstico IA por fases:

- Grupo: `85cefc2c-f00f-4f85-80af-48e4b3655626`
- Android update ID: `019e833e-4859-7cc6-b612-0310710254e6`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/85cefc2c-f00f-4f85-80af-48e4b3655626>
- Commit: `9a55784` (`Add local AI engine diagnostics`).
- Llega a los APK runtime `1.1.5`, incluido el build `5cf2587d`.
- Añade en Ajustes → IA del Sistema un diagnóstico manual que prueba por fases `import llama.rn`, `installJsi`, `getBackendDevicesInfo`, `loadLlamaModelInfo` e `initLlama + release`.

Update `preview` runtime `1.1.5` con error runtime IA enriquecido:

- Grupo: `19c66b2d-7b9d-42a9-98f2-a9d27da64d6d`
- Android update ID: `019e8344-9964-78aa-952f-6cd7eff560fd`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/19c66b2d-7b9d-42a9-98f2-a9d27da64d6d>
- Commit: `7045592` (`Improve AI runtime error diagnostics`).
- Llega a los APK runtime `1.1.5`, incluido el build `5cf2587d`.
- Si el chat cae a plantillas, Ajustes → IA del Sistema muestra un error con `source`, timestamp, plataforma, engine/model status, existencia del fichero y stack truncado.

Update `preview` runtime `1.1.5` con patch JS ampliado para entrypoints compilados de `llama.rn`:

- Grupo: `856cc783-29b3-4134-a13d-f64602f724ed`
- Android update ID: `019e8350-eb50-7bef-aea3-00c01a8bc3d4`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/856cc783-29b3-4134-a13d-f64602f724ed>
- Commit: `5b77c59` (`Patch llama compiled JSI entrypoints`).
- Llega a los APK runtime `1.1.5`, incluido el build `5cf2587d`.
- `patches/llama.rn@0.12.4.patch` ahora aplica el mismo `installJsi` robusto también a `lib/module/index.js` y `lib/commonjs/index.js`, no solo a `src/index.ts`.
- Evidencia local y de publicación: `pnpm install --frozen-lockfile`, `pnpm check` y `expo export --platform android` pasan; el Hermes bundle publicado contiene `JSI bindings not installed after native install` y `Native install returned false`.

Update `preview` runtime `1.1.0` con banner del Sistema, apariciones autónomas y Gemma 4:

- Update group: `a1d8f4ab-79b3-42e8-9604-890c5b5847b3`
- Runtime: `1.1.0`
- Mensaje: `System daily message, autonomous interjections and Gemma 4 model`
- Commit: `0cac468`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/a1d8f4ab-79b3-42e8-9604-890c5b5847b3>
- Llega a los APK runtime 1.1.0, incluido el build actual `e37eafc1`; no llega a los APK 1.0.x.

## Updates OTA anteriores (runtime 1.0.2)

Update `preview` con el chat del Sistema (IA base por reglas):

- Update group: `4c58d8ad-5ef5-460c-80ea-b3ab4bbfbef8`
- Runtime: `1.0.2`
- Mensaje: `Add System chat (offline rule-based AI)`
- Commit: `f617d89c80fcabd2da719a286357a06d4f47febb`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/4c58d8ad-5ef5-460c-80ea-b3ab4bbfbef8>

Update `preview` con logros, celebraciones y rank-up automático:

- Update group: `7e4d12a2-c1d6-4a7c-ba69-999952e61c9c`
- Runtime: `1.0.2`
- Mensaje: `Add achievements, progress celebrations and auto rank-up`
- Commit: `f9f763ba6a260a6def216f98ae0a398bac4756a0`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/7e4d12a2-c1d6-4a7c-ba69-999952e61c9c>

Update `preview` con economía de Esencia y Tienda del Sistema:

- Update group: `960b7e0a-7f53-41f1-817b-b6ebf9f73997`
- Runtime: `1.0.2`
- Mensaje: `Add Essence economy and System Shop (titles + auras)`
- Commit: `7869bd0f51167dfa6e6ae2e19852fab07d101d6f`
- Dashboard: <https://expo.dev/accounts/jorgex-tech/projects/levelarc/updates/960b7e0a-7f53-41f1-817b-b6ebf9f73997>
