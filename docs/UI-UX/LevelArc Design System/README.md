# LevelArc — Design System

> **LevelArc** is a 100% offline, gamified habit tracker for Android. The user earns XP by completing their own habits, levels up, and ascends through hunter ranks (E → S). The aesthetic is a private RPG "System" interface — dark, quiet, arcane, slightly solemn — inspired by the tone of *Solo Leveling* (without using any of its IP).

- **Platform:** Android (Play Store, global).
- **Languages:** Spanish (default) + English.
- **Privacy:** 100% on-device. No accounts, no servers, no sync.
- **Monetization:** paid / IAP product.

## Sources provided

| Source | Where |
|---|---|
| `uploads/DESIGN.md` | Author's brand brief — colors, type, components, do's/don'ts. The canonical source. Read it first. |
| Logo (multiple variants) | Provided as PNG + SVG. Copied to `assets/`. See **Brand assets** below. |
| Codebase / Figma | _Not provided._ All foundations were synthesized from `DESIGN.md`. |

### Brand assets in `assets/`

| File | Use |
|---|---|
| `logo-detailed.svg` | **Canonical mark** — metallic 3D version. Use for app icon, in-app headers, favicons, splash, marketing. Vector with transparent background. **This is the primary logo.** |
| `logo-detailed-light.png` / `logo-detailed-light-alt.png` | Same mark, rasterized on light backgrounds — for press kits, light-theme contexts. |
| `logo-simplified-dark.png` | Same mark rasterized on dark background — useful when SVG isn't possible. |
| `logo-mark.svg` | **Flat 2-color fallback.** Use only when the detailed SVG won't render (e.g. extreme size constraints, monochrome stamping). |
| `logo-hero-circuit.png` | High-fidelity hero render with circuit/hex backdrop. **Splash & marketing only** — never UI chrome. |
| `logo-hero-circuit.png` | High-fidelity hero render with circuit/hex backdrop. **Splash & marketing only** — never UI chrome. |

✅ **Unified cyan.** The UI primary now matches the logo's identity cyan exactly: `#3FCAE6`. Every cyan in the system (primary, glow, pressed, shadow) is derived from this single hue. The original DESIGN.md value (`#00D9C0`) has been retired.

This is a **brand-new project**. No existing UI to recreate. The UI kit in this system is a **proposed reference implementation** of the brief, not a recreation.

---

## CONTENT FUNDAMENTALS

LevelArc's copy is bilingual (Spanish default, English secondary) and reads like terse, slightly formal **system messages** — never marketing, never chummy.

- **Persona:** the app is a "Sistema" / "System" addressing **the user as the Hunter** ("Cazador"). It speaks **to you**, never about itself in first person. Use *tú* in Spanish, *you* in English.
- **Tone:** direct, observational, solemn-game. The system reports facts; it does not coach or cheerlead.
- **Casing:** sentence case for body copy. Display labels in **UPPERCASE** sparingly — used only for "SYSTEM" tags, rank letters, and key callouts.
- **Length:** prefer 1–3 word labels and one-sentence system messages. No paragraphs in the app.
- **Numbers / units:** always rendered in Orbitron (display). Levels, XP, ranks, streak counts.
- **No emoji.** Iconography is line-style SVG.
- **No exclamation marks in the system voice.** Celebrations are quiet ("Rango ascendido a D." / "Rank ascended to D.").
- **No Solo Leveling IP.** Never use "Sung Jinwoo", "Monarca", "Arise", "Shadow Monarch", or copied marks/visuals. The vocabulary we *do* use: *Cazador / Hunter, Rango / Rank, Sistema / System, Ascensión / Ascension, Misión / Mission*.

**Copy examples — system messages**

| ES | EN |
|---|---|
| "Misión diaria registrada." | "Daily mission logged." |
| "Rango ascendido a D." | "Rank ascended to D." |
| "Racha de 7 días." | "7-day streak." |
| "Hábito archivado." | "Habit archived." |
| "Nivel 12 · 240 / 600 XP" | "Level 12 · 240 / 600 XP" |

**Copy examples — buttons**

| ES | EN |
|---|---|
| "Completar" | "Complete" |
| "Fallar" | "Fail" |
| "Nuevo hábito" | "New habit" |
| "Archivar" | "Archive" |

---

## VISUAL FOUNDATIONS

### The metaphor
A dungeon interface with an **arcane cyan System overlay**. Most of the screen is dark neutral surfaces. Cyan is the brand signal — used deliberately, not flooded. Rank color is reserved for player-progression moments (XP bar, rank badge, rank-up glow).

### Color
- Base is **always dark**. No light mode unless the product explicitly changes direction.
- **Brand cyan `#3FCAE6`** = identity, primary actions, active tabs, links, focus, system labels.
- **Rank accents (E/D/C/B/A/S)** = XP bar fill, rank badge, rank-up glow. **Never hardcoded inside a component** — always read from a rank token.
- State: green `#3DD68C` complete, red `#FF6B6B` failed, orange `#FFA94D` streak, muted gray `#5A5A6E` pending.
- Avoid one-note cyan saturation. If a screen looks "all cyan", it's wrong.

### Typography
- **Orbitron** (display) — only for brief moments: screen titles, level/rank numbers, "SYSTEM" labels, solemn notifications. Never paragraphs, never settings rows, never habit descriptions.
- **Inter** (body) — every other piece of UI text.
- Letter-spacing `0`. No negative tracking. No viewport-relative scaling.

### Layout
- Mobile, full-width, compact. Operational app — **not a landing page**.
- Screen padding **20px**. Panel padding **16px**. Vertical rhythm 12–18px between related controls.
- Stable dimensions for buttons, progress bars, tab items, icon buttons. They never resize between states.
- Repeated items may be cards. **Do not nest cards inside cards.** Do not wrap whole sections in decorative floating containers.

### Shapes & radii
- Default radius: **8px** (`--radius-md`).
- Progress bars: **4px** (`--radius-sm`).
- Icon buttons: square-ish, **44px** hit target, 8px radius.
- **No pill buttons** unless there is a strong functional reason (e.g. filter chips).
- Shape language is **angular and disciplined**. Sharp, not soft.

### Backgrounds
- Flat dark surfaces — `#0A0A0F` background, `#13131C` panels, `#1C1C28` cards.
- **No decorative gradients, orbs, bokeh, or abstract SVG hero art.**
- Optional fine-grain noise/scanline overlay (≤5% opacity) is allowed on the rank-up celebration only.

### Elevation & depth
Depth comes from **contrast, borders, and occasional rank glow** — not from soft drop-shadows.
- `--border-hairline` (`1px solid #2A2A3A`) for all separator/card edges.
- `--glow-primary` for active System messages and the XP/rank header.
- `--glow-rank` (uses `currentColor`) for rank-up celebration only.
- No `box-shadow: 0 8px 24px rgba(...)` blurry card lifts. The app is a crisp system UI, not a soft dashboard.

### Borders
- 1px borders everywhere structural separation is needed.
- Border color is `--color-border` (`#2A2A3A`) by default.
- Active/focus uses cyan: `1px solid var(--color-primary)` + `var(--glow-primary)`.

### Animation
- **Easing:** `cubic-bezier(0.2, 0.7, 0.2, 1)` (`--ease-system`) — quick out, gentle in. Game-UI feel, not springy.
- **Durations:** 120ms (taps), 200ms (panels). Never longer than 240ms outside of celebrations.
- **No bouncy easing.** No overshoot. The System is precise.
- Allowed transitions: fade, vertical slide ≤8px, scale on press (0.97).
- **Rank-up** is the one cinematic exception: a 600–900ms sequence with a brief cyan flash → rank-color glow expansion → settle.

### Hover & press states
- **Hover (desktop builds only):** background lightens by ~6% (e.g. card `#1C1C28` → `#23232F`). Cyan elements brighten to `--color-primary-glow`.
- **Press:** `transform: scale(0.97)`, primary cyan darkens to `--color-primary-pressed` (`#27A5C2`). No ripple, no Material splash.
- **Focus:** 1px cyan ring + `--glow-primary`. No browser default outlines.
- **Disabled:** 40% opacity. No color change.

### Transparency & blur
- Use sparingly. The dungeon has weight; it should not look glassy.
- Allowed: modal/sheet backdrops at `rgba(10,10,15,0.72)` with `backdrop-filter: blur(8px)`.
- **No frosted-glass cards on the main screens.** No translucent navigation bars.

### Imagery
- The brand uses **almost no photography**. If imagery is needed, it should read as **cool, desaturated, near-monochrome with cyan accent** — never warm.
- Rank badges are typographic ("E", "D" … in Orbitron 700) inside a square chip, **not illustrated avatars**.

### Corner radii summary

| Surface | Radius |
|---|---|
| Cards / panels / buttons / inputs | 8px |
| Progress bars / chips | 4px |
| Icon button | 8px (44×44) |
| Modal sheet | 8px top corners only |

### What a card looks like
- Background: `--color-card` (`#1C1C28`).
- Border: 1px `--color-border`.
- Radius: 8px.
- Padding: 16px.
- **No drop shadow.** Depth is from the border on a darker background.
- Active card (selected habit, focused mission): swap border to `--color-primary` and add `--glow-primary`.

---

## ICONOGRAPHY

- **No icon assets shipped with the brief.** We use **[Lucide](https://lucide.dev)** from CDN as the working icon set. It is **line-style, 24px nominal, 1.75–2px stroke** — which matches the angular, disciplined, low-ornament feel of the brand.
- Treat Lucide as a **placeholder / substitution** until LevelArc commissions or selects a final set. **Flagged in Caveats below.**
- **Inline SVG** only. Do not use raster icons. Do not use icon fonts.
- **Stroke color** follows text: `currentColor`. Default 1.75px stroke, 24px box.
- **No emoji anywhere** in the product UI.
- **No unicode symbols** as icons (no ✓, ✗, ★). Use proper SVG.
- Rank badges are **typographic**, not iconographic — render the letter in Orbitron 700 inside a square chip tinted with the rank token.

Sample icons in use: `swords` (missions), `flame` (streak), `target` (goal), `archive`, `check`, `x`, `plus`, `settings`, `chevron-right`, `bar-chart-3`, `shield`, `book-open`. All loaded inline from Lucide.

---

## File index

| Path | What |
|---|---|
| `README.md` | This file. Read first. |
| `SKILL.md` | Agent-skill manifest. |
| `colors_and_type.css` | All design tokens as CSS custom properties + semantic type classes. |
| `preview/` | Small HTML cards previewing every token group. Surfaced in the Design System tab. |
| `ui_kits/levelarc-android/` | Android app UI kit — interactive click-through prototype + JSX components. |
| `assets/` | Logos, marks, and any shared visual assets. |
| `uploads/DESIGN.md` | Original brief from the author. |

### UI Kits
- **`ui_kits/levelarc-android`** — the LevelArc Android app. Home / Habits / Add habit / Stats / Rank-up. Built as an interactive Android-frame prototype.

---

## Caveats / Asks for the user

> **Read these — they affect what the design system can claim to be.**

1. **Cyan now unified** at `#3FCAE6` (logo identity). The original DESIGN.md spec used `#00D9C0` — that legacy color is no longer referenced. If you change your mind and want to go back to the greener variant, swap one line in `colors_and_type.css`.
2. **No real codebase or Figma.** Everything in this system is synthesized from `uploads/DESIGN.md`. If you have an existing Android Compose codebase or Figma file, **attach it** via the Import menu and I will rebuild the UI kit against your actual components.
3. **Icon substitution.** Lucide is acting as a stand-in. If you have a preferred icon family (e.g. a custom hunter/RPG set), **point me at it** and I will swap.
4. **Fonts self-hosted ✅.** Inter + Orbitron variable fonts are bundled in `fonts/` (Inter-VariableFont.ttf, Orbitron-VariableFont.ttf) with their OFL licenses. The design system, previews, and UI kit all load from disk — no Google Fonts dependency. For the Android build, copy these `.ttf` files into `app/src/main/res/font/` and reference them via `font-family` resource entries.
5. **No slide template.** No deck templates were provided, so `slides/` is intentionally omitted.
