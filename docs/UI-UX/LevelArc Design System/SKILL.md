---
name: levelarc-design
description: Use this skill to generate well-branded interfaces and assets for LevelArc, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the LevelArc Android gamified habit-tracker app — dark dungeon-system RPG aesthetic with arcane cyan accent (`#00D9C0`) and dynamic hunter rank colors (E → S).
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **Brand:** LevelArc — 100% offline gamified habit tracker for Android. Bilingual (ES default, EN). Dark RPG "System" aesthetic; the app addresses the user as a Hunter ("Cazador"). No Solo Leveling IP.
- **Type:** Orbitron (display only — titles, levels, system labels) + Inter (everything else). Letter-spacing 0.
- **Color:** dark base (`#0A0A0F` / `#13131C` / `#1C1C28`) + cyan `#00D9C0` primary + rank colors E→S (never hardcoded inside components — always read from a token).
- **Shape:** angular, disciplined. 8px default radius. No pill buttons. No drop shadows — depth comes from contrast + borders + occasional glow.
- **Motion:** `cubic-bezier(0.2, 0.7, 0.2, 1)`, 120–200ms. No bounces.
- **No emoji, no decorative gradients, no marketing hero sections inside the app.**

## Key files

- `README.md` — full content + visual foundations. Read first.
- `colors_and_type.css` — every token as CSS custom properties + semantic classes.
- `assets/` — logos (canonical = `logo-detailed.svg`). Use this for app icon, in-app, splash, marketing.
- `ui_kits/levelarc-android/` — reference React components + interactive screens. Copy components from here.
- `preview/` — token specimens, useful as visual reference.

## Tone rules

- Address the user as **Cazador / Hunter** ("tú" in ES, "you" in EN).
- System voice is **terse, factual, slightly solemn** — never cheerful, never marketing.
- No exclamation marks. No emoji. Numbers always in Orbitron.
- Bilingual examples in README.
