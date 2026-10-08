# AGENTS.md

## Regla cero

Expo HAS CHANGED. Before changing Expo-specific code, read the exact versioned docs for SDK 56:

https://docs.expo.dev/versions/v56.0.0/

Do not assume older Expo Router, Expo SQLite, notifications, or NativeWind setup still applies.

## Referencias obligatorias

Read these before making product, design, architecture, or UX changes:

- `docs/LevelArc-PROYECTO.md` — project bible. Product decisions, scope, gamification, DB concept, tone, stack.
- `docs/ESTADO-ACTUAL.md` — current built state and known implementation deviations.
- `docs/ROADMAP.md` — MVP/v1/v2 roadmap and release sequence.
- `docs/PENDIENTES.md` — prioritized pending work checklist.
- `docs/UI-UX/` — design system, screenshots, prototypes, and UI kit references for the visual direction.
- `DESIGN.md` — design tokens and UI rules.
- `README.md` — current implementation status, commands, architecture, build notes.

If any instruction conflicts, prefer:

1. Current user request.
2. `AGENTS.md`.
3. `docs/LevelArc-PROYECTO.md`.
4. `DESIGN.md`.
5. Existing code patterns.

## Documentacion viva

Keep the `docs/` folder current when the project changes:

- `docs/LevelArc-PROYECTO.md` is the original source of truth. Do not rewrite it casually.
- Update `docs/ESTADO-ACTUAL.md` after implementing, removing, or significantly changing features.
- Update `docs/ROADMAP.md` when scope, version order, MVP/v1/v2 boundaries, or release strategy changes.
- Update `docs/PENDIENTES.md` when finishing tasks, discovering new blockers, or changing priorities.

If a change affects MVP status, release readiness, architecture, UX direction, or future scope, update the relevant docs in the same task.

## Proyecto

LevelArc is an offline-first Android habit tracker. No server, no accounts, no remote sync. All user data lives locally.

MVP stack:

- Expo SDK 56 + React Native + TypeScript.
- Expo Router.
- Expo Updates / EAS Update.
- Zustand.
- NativeWind/Tailwind.
- SQLite on native through `expo-sqlite` with raw SQL (no ORM).
- AsyncStorage fallback on web for development preview only.
- Vitest for pure business logic and for the SQLite repository (real SQL through `node:sqlite`; needs Node >= 22.13).

Use Spanish UI copy as the default, with English supported through `src/i18n/index.ts`.

## Comandos

Use pnpm. Do not introduce npm/yarn lockfiles.

```bash
pnpm install
pnpm start
pnpm web
pnpm android
pnpm check
pnpm test
pnpm exec tsc --noEmit
pnpm run doctor
pnpm build:android:preview
pnpm build:android:production
pnpm update:preview --message "Fix UI copy"
pnpm update:production --message "Fix UI copy"
```

`pnpm check` is the main local gate: TypeScript + ESLint + tests.

Run expo-doctor with `pnpm run doctor`: plain `pnpm doctor` is a pnpm built-in and does not run the script. It currently fails three checks: duplicate `expo-constants` under pnpm (`56.0.14` through `expo-linking`, `56.0.15` elsewhere), Expo SDK 56 packages behind the latest patch, and a Hermes V1 memory regression fixed only in SDK 57. Do not hide these with random dependency hacks; the `1.1.6` preview build passed with the duplicate. Upgrading Expo changes the native binary and needs device QA.

Keep `babel-preset-expo` as an explicit devDependency. EAS Android release bundling failed without it under pnpm because Metro could not resolve the preset transitively.

Keep `@babel/plugin-transform-react-jsx` as an explicit devDependency. After enabling `expo-updates`, EAS Android failed in `:app:createReleaseUpdatesResources` because Metro/Babel could not resolve it transitively under pnpm.

Keep `llama.rn` in `package.json` → `pnpm.onlyBuiltDependencies`. EAS uses pnpm with ignored dependency build scripts unless approved there; if `llama.rn` postinstall is ignored, the APK compiles but ships without `librnllama*.so`, and the chat fails on device with `JSI bindings not installed`. After any LLM native build, inspect the APK and verify `lib/arm64-v8a/librnllama*.so` exists. Also keep the local pnpm patch `patches/llama.rn@0.12.4.patch`: upstream `llama.rn` 0.12.4 is not compatible enough with Expo SDK 56 / RN 0.85 bridgeless. The patch implements the official RN 0.85 JSI pattern on Android: `RNLlamaModule` implements `TurboModuleWithJSIBindings`, exposes a native `BindingsInstallerHolder`, and lets RN core call the installer with the correct `jsi::Runtime&` + `CallInvoker`. Do not go back to capturing `JavaScriptContextHolder` raw pointers or manually scheduling JSI install from `install()` with `CallInvoker.invokeAsync`; Android real kept failing that way. The JNI wrapper must compile as C++20: `BindingsInstallerHolder.h` includes React Native bridging headers that use C++20 concepts (`requires`). Keep `android/src/main/CMakeLists.txt` in the pnpm patch at `CMAKE_CXX_STANDARD 20` plus `target_compile_features(... cxx_std_20)`; EAS build `d212dc78` failed in `RUN_GRADLEW` when the wrapper stayed on C++17. The JS patch still waits for all async JSI globals before binding/deleting them, and the app calls `installJsi` before `initLlama` as a readiness check. Important: keep the same JS install patch in `src/index.ts`, `lib/module/index.js`, and `lib/commonjs/index.js`; Metro/EAS can bundle the compiled `lib/*` entrypoints even if `src` is patched, and leaving `lib/*` stale makes Android keep throwing the old generic `JSI bindings not installed` error.

EAS Update is configured. Use `preview` for internal APK QA and `production` for future Play Store builds. Only publish updates for JS/assets/UI changes compatible with the current native runtime. If native code/config changes, bump app version/runtime as needed and create a new build.

EAS workflows are manual by design. Do not trigger full builds on every push to `main`.

- `.eas/workflows/build.yml` is manual and creates a `preview` Android APK.
- `.eas/workflows/update-preview.yml` is manual and publishes an OTA update to the `preview` channel.
- Normal commits/pushes to `main` should not launch EAS Build automatically.
- Prefer OTA update for JS/TS/UI/i18n/assets changes that are compatible with the installed runtime.
- Use full EAS Build only for native/runtime changes: `app.json` native config, Expo plugins, permissions, native dependencies, Expo SDK/RN changes, `version`/`versionCode`/`runtimeVersion`, or anything that changes the native binary.
- EAS Update code signing is disabled. Do not re-enable `updates.codeSigningCertificate`, `updates.codeSigningMetadata`, or `--private-key-path` unless the Expo account has EAS Enterprise. On the current account it blocks `eas update`.
- Important gotcha: changing EAS Update native config (including enabling/disabling code signing) requires a new APK/AAB. Devices already installed with a binary that expects signed updates cannot receive later unsigned OTAs; they will show generic update check failures even with good WiFi.
- Current recovery path after code-signing mismatch: create/install a new `preview` APK from the unsigned config, then use OTA again for JS-compatible fixes. If EAS Free build quota is exhausted, wait for quota reset or use an older compatible unsigned `runtimeVersion: 1.1.0` APK if available.

## Arquitectura

- `app/` — Expo Router screens.
- `app/(tabs)/index.tsx` — Today screen.
- `app/(tabs)/habits.tsx` — habit list.
- `app/(tabs)/progress.tsx` — rank/XP/history.
- `app/(tabs)/settings.tsx` — language, notifications, backup, close day, About. The Demo section renders only when `isInternalBuild()`.
- `app/habit/new.tsx` and `app/habit/[id].tsx` — create/edit habit.
- `src/core/` — pure gamification logic. Keep UI/db out of here.
- `src/db/types.ts` — public repository types, shared by the native and web repositories.
- `src/db/repository.ts` — native SQLite implementation.
- `src/db/repository.web.ts` — web AsyncStorage fallback. Keep API compatible with native repository.
- `src/db/migrate.ts` — single source of the SQLite schema; versioned migrations on `PRAGMA user_version`.
- `src/lib/backupValidation.ts` — pure backup validation shared by both repositories.
- `src/lib/backupFile.ts`, `src/lib/backupTransfer.ts` (+ `.web.ts`) — backup as a file: pure naming/size rules, and export through `expo-sharing` / import through `expo-document-picker`.
- `src/i18n/deviceLanguage.ts` — initial language from the device locale; a stored preference wins.
- `plugins/withAndroidBackupRules.js` — local config plugin: Android auto backup rules that exclude the AI model directory (`files/models/`). Keep its path in sync with `MODELS_DIR` in `src/ai/modelManager.ts`.
- `docs/guides/release.md` — release path and device QA checklist. `docs/references/play-store.md` — store listing. `docs/references/historial-builds.md` — old build/update log.
- `test/` — test-only stand-ins (`expo-sqlite` over `node:sqlite`, notifications, AsyncStorage) wired in `vitest.config.mjs`.
- `docs/architecture/datos.md` — ledger/cache model, mutation queue, migrations, backup format.
- `src/stores/appStore.ts` — Zustand state and app actions.
- `src/lib/reminders.ts`, `src/lib/reminderPlan.ts`, `src/lib/notifications.ts` — reminder sync, pure reminder planning and the `expo-notifications` wrapper (`notifications.web.ts` is a no-op).
- `src/components/` — shared UI.
- `src/i18n/index.ts` — typed ES/EN dictionary.
- `src/theme/` — color, type, spacing, radius, shadow, and rank tokens.

Do not create backend code, auth, remote sync, or cloud dependencies unless the user explicitly changes the product direction.

## Datos y reglas de negocio

Important invariants:

- `events` is the immutable XP source of truth.
- `player` is cached and recalculable: after any sequence of actions it must equal the projection of the ledger (`events` + claimed mission bonuses, ordered by real instant).
- Every write in `src/db/repository.ts` goes through `mutate` (one module-level queue, one transaction per mutation). Inside a mutation use the internal helpers, never an exported mutator, and never await notifications or other external IO.
- The stored Esencia balance may be negative (spend, then undo); clamp to zero only when exposing it.
- The perfect-streak bonus is paid once every 7 consecutive perfect days. `canClaimPerfectWeek` in `src/core/missions.ts` is the single rule for UI and repositories.
- Days without scheduled habits neither break nor advance mission streaks or the perfect-day streak.
- The bonus of an already claimed mission is never rewritten.
- `habit_daily_progress` is mutable per-day state for partial countable habits.
- Habits should be archived, not hard-deleted, so history remains valid.
- Completing a habit creates a positive XP event.
- Failing a habit creates a negative XP event.
- XP penalties must never drop the user below the current level floor.
- Countable habits award XP only when the full daily target is reached.
- Countable habits with partial progress are not penalized by close-day.
- Close-day is automatic for past days: `closeMissedDays` (`src/stores/appStore.ts`) closes every day from the last active date up to yesterday at boot and when the local day changes while the app is open. It never closes the current day; the manual close-day button in Settings is the only way to do that. `closeDay` is idempotent.
- Weekly habit frequency uses LevelArc convention: Monday=1 ... Sunday=7.
- Expo weekly notifications use Sunday=1; the mapping lives in `src/lib/reminderPlan.ts` (`toExpoWeekday`).
- Reminders: `src/lib/reminderPlan.ts` is the pure part (triggers, sync plan), `src/lib/notifications.ts` talks to `expo-notifications` (one Android channel, text from i18n in the language passed in) and `src/lib/reminders.ts` owns `syncReminders`, which rebuilds the OS schedule from the database and the end-of-day preference. It runs at boot, after import/reset and on language change, and never prompts for permission. A habit is saved even when its reminder cannot be scheduled; the status is returned to the caller.
- Store actions in `src/stores/appStore.ts` go through `runAction`: they never reject, report failures to the user and return `false`/`null`. Screens check that result before navigating; `isBusy` and `pendingHabitIds` drive the pending state of buttons.

## Tono de NYX / el Sistema

NYX debe ser exigente, sobria y breve, no humillante. Mantener la fantasía de Sistema/RPG sin caer en desprecio: no responder que las dudas o emociones del usuario no importan, no insultar, no repetir "haz misiones" ante cualquier frase casual. Si el usuario pide ideas, dar 2-3 opciones concretas; si pide bajar la dureza, bajar el filo sin perder exigencia. No exigir inmediatez absurda: si el usuario dice que hará algo después de otra tarea o que ahora no puede, aceptar el plan y concretar el siguiente paso realista. Evitar "actúa ahora", "inmediatamente" o "el tiempo no espera" salvo emergencia real. No usar nombre completo del jugador; si hace falta, usar solo primer nombre. Cualquier cambio de IA debe tocar las dos capas cuando aplique: prompt LLM en `src/ai/llamaEngine.ts` y fallback determinista/i18n en `src/core/systemVoice.ts` + `src/i18n/index.ts`.

## Accesibilidad

- Every pressable declares `accessibilityRole`, a label when it has no readable text, and its state (`checked`, `selected`, `disabled`, `expanded`, `busy`) through `accessibilityState`.
- Minimum touch target is 44pt, through `minHeight` or `hitSlop`.
- Selection is never conveyed by colour alone: selected options in the habit form also carry a check mark.
- A disabled primary `Button` has its own flat look; when a form cannot be saved, say what is missing.

## Diseño

Follow `DESIGN.md` and `docs/UI-UX/`.

Key points:

- Dark mode only.
- Cian brand accent is constant.
- Rank color is dynamic and should be used only for XP/rank moments.
- Orbitron is for short display/system text only.
- Inter is for readable UI/body text.
- Max radius is 8px unless there is a very clear reason.
- No decorative gradient/orb/bokeh filler.
- No marketing-style hero screens inside the app.
- Do not use Solo Leveling IP, names, copied visuals, or protected marks.

## Web vs native

Native is the real target.

Web exists for fast preview and agent/browser QA. It uses `src/db/repository.web.ts` because `expo-sqlite` web can require WASM/SharedArrayBuffer and break local browser verification.

When adding repository functions, update both:

- `src/db/repository.ts`
- `src/db/repository.web.ts`

Keep exported types and function names compatible.

## Migrations

`src/db/migrate.ts` is the only schema source. There is no ORM and no generated SQL.

To change the schema:

1. Append a new function to `MIGRATIONS` in `src/db/migrate.ts`. Its position is its version: `MIGRATIONS[n]` moves the database from `user_version` n to n + 1.
2. Never edit a migration that has shipped; installed databases already ran it. Use `addColumnIfMissing` for new columns and backfill existing rows in the same migration.
3. Update the row types and SQL in `src/db/repository.ts`, the shared types in `src/db/types.ts`, and `src/db/repository.web.ts`. If the backup format changes, bump `BACKUP_VERSION` in `src/lib/backup.ts`, keep reading older versions and update `src/lib/backupValidation.ts`.
4. Extend `src/db/migrate.test.ts` (fresh database and upgrade from the previous version) and run `pnpm check`.

Each migration runs in a transaction together with its `user_version` bump, and a failure rejects: the app must not start on a half-migrated schema.

## i18n

Use `src/i18n/index.ts`.

Do not hardcode user-facing strings in screens/components unless they are temporary debug strings. Add ES and EN entries together. Display names that belong to data (weekdays, attributes, habit icons) are looked up by id: `weekday_<n>`, `weekdayShort_<n>`, `attr_<id>`, `attr_<id>_code`, `attr_<id>_desc`, `icon_<id>`. Keep the ids themselves untouched: they are stored in the database.

On first launch the language follows the device (`en*` → English, anything else → Spanish); a stored preference always wins.

The active typed dictionary is `src/i18n/index.ts`. Keep ES and EN entries together there.

## Testing and verification

For any meaningful code change:

```bash
pnpm check
```

Repository tests (`src/db/*.test.ts`) run the real SQL against an in-memory `node:sqlite` database through `test/expoSqlite.js`. They prove the rules and the transaction logic, not the behaviour of `expo-sqlite` on a device: connection, locking and performance still need Android QA.

For UI/frontend changes:

- Start Expo web with `pnpm web` or `pnpm exec expo start --web --port 8081 --clear`.
- Use browser/agent-browser to verify the affected flow.
- Check console errors.

For React changes, `react-doctor` can be useful:

```bash
npx -y react-doctor@latest . --verbose
```

Known note: React Doctor may report false "unused file" warnings because of Expo Router and TS path aliases. Prioritize real correctness issues.

## Build readiness

EAS profiles live in `eas.json`:

- `preview` builds an internal APK.
- `production` builds an AAB.

Channels:

- `preview` receives internal QA updates.
- `production` receives future Play Store updates.

Before publishing:

1. `pnpm check`
2. `pnpm run doctor`
3. Decide delivery mode:
   - OTA preview: `pnpm update:preview --message "Short description"` or run `.eas/workflows/update-preview.yml` manually.
   - Full preview build: `pnpm build:android:preview` or run `.eas/workflows/build.yml` manually.
4. Test on real Android device/emulator.
5. Validate LevelArc logo/icon/splash/adaptive icon on real Android sizes after full builds.

The full path to a production release, the device QA checklist and rollback are in `docs/guides/release.md`. The last build validated on a device is `1.1.6`; `1.2.0` changes native config (modules, backup rules, permissions) and needs a new build. The old build/update log is in `docs/references/historial-builds.md`.

## Coding style

- Keep solutions simple.
- Prefer readable local functions over premature abstractions.
- Keep business logic in `src/core/` where possible.
- Keep repository/database logic out of UI components.
- Preserve TypeScript strictness.
- Avoid unrelated refactors.
- Do not delete or revert user changes unless explicitly asked.

## Current known gaps

- Nothing after build `1.1.6` has run on a device. The checklist in `docs/guides/release.md` is the gate before a production build.
- Store assets (screenshots, feature graphic) are missing.
- The merged Android permission list has only been derived from library manifests; confirm it on the built binary.
- `accessibilityState` is not reflected by `react-native-web`, so screen-reader state can only be verified on Android.
- `expo-doctor` still reports three known failures (see Comandos).
