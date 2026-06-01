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
- SQLite + Drizzle on native.
- AsyncStorage fallback on web for development preview only.
- Vitest for pure business logic.

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
pnpm db:generate
pnpm doctor
pnpm build:android:preview
pnpm build:android:production
pnpm update:preview --message "Fix UI copy"
pnpm update:production --message "Fix UI copy"
```

`pnpm check` is the main local gate: TypeScript + tests.

`pnpm doctor` currently may fail one check because Expo SDK 56 + pnpm resolves duplicate `expo-constants` (`56.0.14` through `expo-linking`, `56.0.15` elsewhere). This is documented in `README.md`. Do not hide this with random dependency hacks; the preview native build has passed with this warning.

Keep `babel-preset-expo` as an explicit devDependency. EAS Android release bundling failed without it under pnpm because Metro could not resolve the preset transitively.

Keep `@babel/plugin-transform-react-jsx` as an explicit devDependency. After enabling `expo-updates`, EAS Android failed in `:app:createReleaseUpdatesResources` because Metro/Babel could not resolve it transitively under pnpm.

Keep `llama.rn` in `package.json` → `pnpm.onlyBuiltDependencies`. EAS uses pnpm with ignored dependency build scripts unless approved there; if `llama.rn` postinstall is ignored, the APK compiles but ships without `librnllama*.so`, and the chat fails on device with `JSI bindings not installed`. After any LLM native build, inspect the APK and verify `lib/arm64-v8a/librnllama*.so` exists. Also keep the local pnpm patch `patches/llama.rn@0.12.4.patch`: upstream `llama.rn` 0.12.4 calls `context.getCatalystInstance().getJSCallInvokerHolder()` on Android, which fails in Expo SDK 56 / RN 0.85 bridgeless. The patch uses `ReactApplicationContext.getJSCallInvokerHolder()` instead, rejects/logs native install failures with specific error codes, and the app calls `installJsi` with a short retry before `initLlama` because upstream installs JSI globals asynchronously.

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
- `app/(tabs)/settings.tsx` — language, notifications, backup, close day.
- `app/habit/new.tsx` and `app/habit/[id].tsx` — create/edit habit.
- `src/core/` — pure gamification logic. Keep UI/db out of here.
- `src/db/schema.ts` — Drizzle schema.
- `src/db/repository.ts` — native SQLite implementation.
- `src/db/repository.web.ts` — web AsyncStorage fallback. Keep API compatible with native repository.
- `src/db/migrate.ts` — runtime SQLite table setup.
- `src/stores/appStore.ts` — Zustand state and app actions.
- `src/components/` — shared UI.
- `src/i18n/index.ts` — typed ES/EN dictionary.
- `src/theme/` — color, type, spacing, radius, shadow, and rank tokens.

Do not create backend code, auth, remote sync, or cloud dependencies unless the user explicitly changes the product direction.

## Datos y reglas de negocio

Important invariants:

- `events` is the immutable XP source of truth.
- `player` is cached and recalculable.
- `habit_daily_progress` is mutable per-day state for partial countable habits.
- Habits should be archived, not hard-deleted, so history remains valid.
- Completing a habit creates a positive XP event.
- Failing a habit creates a negative XP event.
- XP penalties must never drop the user below the current level floor.
- Countable habits award XP only when the full daily target is reached.
- Countable habits with partial progress are not penalized by close-day.
- Close-day is manual in the MVP.
- Weekly habit frequency uses LevelArc convention: Monday=1 ... Sunday=7.
- Expo weekly notifications use Sunday=1, so map weekdays carefully in `src/lib/notifications.ts`.

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

When changing `src/db/schema.ts`:

1. Update `src/db/migrate.ts` if runtime native DB needs the change.
2. Run `pnpm db:generate`.
3. Check generated SQL under `src/db/migrations/`.
4. Run `pnpm check`.

Do not create AI tables yet. The project bible documents future AI tables, but MVP should not create unused IA tables.

## i18n

Use `src/i18n/index.ts`.

Do not hardcode user-facing strings in screens/components unless they are temporary debug strings. Add ES and EN entries together.

The active typed dictionary is `src/i18n/index.ts`. Keep ES and EN entries together there.

## Testing and verification

For any meaningful code change:

```bash
pnpm check
```

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
2. `pnpm doctor`
3. Decide delivery mode:
   - OTA preview: `pnpm update:preview --message "Short description"` or run `.eas/workflows/update-preview.yml` manually.
   - Full preview build: `pnpm build:android:preview` or run `.eas/workflows/build.yml` manually.
4. Test on real Android device/emulator.
5. Validate LevelArc logo/icon/splash/adaptive icon on real Android sizes after full builds.

Latest valid preview APK is documented in `README.md` and `docs/ESTADO-ACTUAL.md`.

## Coding style

- Keep solutions simple.
- Prefer readable local functions over premature abstractions.
- Keep business logic in `src/core/` where possible.
- Keep repository/database logic out of UI components.
- Preserve TypeScript strictness.
- Avoid unrelated refactors.
- Do not delete or revert user changes unless explicitly asked.

## Current known gaps

- Android native QA still needed.
- Brand assets are integrated, but icon/splash/adaptive icon still need real-device validation.
- Backup export/import exists, but needs Android QA.
- `expo-doctor` duplicate `expo-constants` warning remains; preview native build has passed with it.
- UI is MVP-functional, not final Play Store polish.
