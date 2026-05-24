---
version: alpha
name: LevelArc
description: Offline gamified habit tracker with a dark dungeon-system RPG interface and cyan arcane brand accent.
colors:
  primary: "#00D9C0"
  primary-glow: "#2DE8D0"
  primary-pressed: "#00A896"
  primary-shadow: "#054A42"
  neutral: "#E8E0C9"
  background: "#0A0A0F"
  surface: "#13131C"
  card: "#1C1C28"
  border: "#2A2A3A"
  text-muted: "#5A5A6E"
  success: "#3DD68C"
  danger: "#FF6B6B"
  streak: "#FFA94D"
  rank-e: "#7A7A8C"
  rank-d: "#4DB8C4"
  rank-c: "#4D8BE0"
  rank-b: "#9B6BE0"
  rank-a: "#E84855"
  rank-s: "#F5C542"
typography:
  display-xl:
    fontFamily: Orbitron
    fontSize: 34px
    fontWeight: 700
    lineHeight: 42px
    letterSpacing: 0
  display-lg:
    fontFamily: Orbitron
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: 0
  system-label:
    fontFamily: Orbitron
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0
  body-strong:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 22px
    letterSpacing: 0
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0
rounded:
  sm: 4px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  screen:
    backgroundColor: "{colors.background}"
    textColor: "{colors.neutral}"
    padding: 20px
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 14px
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 14px
  button-danger:
    backgroundColor: "{colors.card}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 14px
  xp-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    height: 8px
  tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
  tab-inactive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
---

## Overview

LevelArc feels like a private RPG system running inside the user's phone: dark, quiet, precise, and slightly solemn. It should not feel like a generic productivity app or a marketing landing page. The interface is a tool the user opens every day, so it needs to be fast to scan, restrained, and motivating without becoming noisy.

The core visual metaphor is "dungeon interface plus arcane cyan system overlay." Use the cian brand accent for constant identity and the current rank color only for progress/rank moments.

## Colors

The app is dark by default and should remain dark. Do not introduce light-mode surfaces unless the product explicitly changes direction.

- **Primary / cian core (`#00D9C0`)**: main actions, active tabs, links, system labels, key focus states.
- **Primary glow (`#2DE8D0`)**: restrained highlights and rare glow details. Do not flood the screen with glow.
- **Background (`#0A0A0F`)**: full-screen base.
- **Surface (`#13131C`)**: panels and tab bar.
- **Card (`#1C1C28`)**: controls, secondary buttons, progress tracks.
- **Border (`#2A2A3A`)**: subtle structure.
- **Neutral (`#E8E0C9`)**: primary readable text and highlighted content.
- **State colors**: green for completed, red for failed, orange for streak, muted gray for pending.
- **Rank colors**: E/D/C/B/A/S are dynamic accents for XP bar, rank badge, and rank glow only.

Avoid one-note cyan saturation. Most of the screen should be dark neutral surfaces, with cyan used as a deliberate signal.

## Typography

Use **Orbitron** only for brief display moments: screen titles, rank/level numbers, system labels, and solemn notifications. Never use Orbitron for paragraphs, long settings text, habit descriptions, or dense lists.

Use **Inter** for all UI body text, habit names, settings, metadata, controls, and explanatory copy. This keeps the app readable while Orbitron provides identity.

Letter spacing is `0`. Do not add negative tracking. Do not scale typography with viewport width.

## Layout

LevelArc is an operational mobile app, not a landing page.

Use compact, full-width mobile layouts with:

- 20px screen padding.
- 16px panel padding.
- 8px radius max for cards, panels, buttons, inputs, and repeated list items.
- Clear vertical rhythm with 12-18px gaps between related controls.
- Stable dimensions for buttons, progress bars, tab items, and icon buttons.

Repeated items may be cards. Do not nest cards inside cards. Do not put page sections into floating decorative containers.

## Elevation & Depth

Depth should come from contrast, borders, and occasional rank glow. Avoid heavy drop shadows on web/native because the app should feel like a crisp system UI, not a soft dashboard.

Use glow sparingly:

- XP/rank header.
- Rank-up celebration.
- Active system messages.

Do not use decorative orbs, bokeh blobs, generic gradients, or abstract SVG hero art.

## Shapes

The shape language is angular and disciplined:

- Default radius: 8px.
- Progress bars: 4px.
- Icon buttons: square-ish 44px with 8px radius.
- No pill buttons unless there is a strong functional reason.

## Components

Primary buttons use cian core on the dark background with dark text. Secondary buttons use card background and bone text. Danger buttons keep the dark card background and use red text/border rather than a filled red block.

Habit cards must show:

- Habit name.
- Importance.
- Type/progress.
- State: pending, completed, failed.
- Immediate actions.

Progress bars must be stable and never resize vertically. The XP bar uses the current rank color; normal mission/progress bars use cian.

System panels use Orbitron labels and Inter body text. They should sound direct and game-like, but the UI must remain practical.

## Do's and Don'ts

Do:

- Keep screens dense enough for daily use.
- Use cian for brand identity and rank color for player progression.
- Keep all business logic readable and testable outside UI.
- Preserve the offline/private feel.
- Make controls obvious and ergonomic on mobile.

Don't:

- Use Solo Leveling IP, names, marks, or copied visuals.
- Use Orbitron for long text.
- Add decorative gradients/orbs.
- Make marketing-style hero sections inside the app.
- Hardcode rank colors inside components; use rank accent tokens/helpers.
- Delete habit history by default; archive instead.
