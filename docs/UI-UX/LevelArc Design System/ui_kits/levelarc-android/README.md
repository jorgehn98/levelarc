# LevelArc · Android UI Kit

Interactive hi-fi recreation of the LevelArc Android app. **Mostly cosmetic** — state lives in component memory, no persistence — but every visual rule from `DESIGN.md` is enforced.

## Run

Open `index.html`. Tabs and the **Nuevo hábito** flow are clickable; completing pending habits awards XP and can trigger the **rank-up cinematic** on level fill (also reachable from the *Sistema* tab → "Demo simular ascenso").

## Screens

| Screen | What |
|---|---|
| **Hoy** (`HomeScreen`) | Player header with rank/XP/streak, current System mission, today's habit cards (pending → completed/failed). |
| **Hábitos** (`HabitsScreen`) | Full list of registered habits with metadata. |
| **Nuevo hábito** (`AddHabitScreen`) | Modal form — name, frequency, importance, icon. |
| **Stats** (`StatsScreen`) | Summary chips + weekly completion chart + rank-progress panel. |
| **Sistema** (`SystemScreen`) | System notification feed, primary + alert variants. |
| **Rank-up** (`RankUpOverlay`) | Cinematic overlay — flash → rank-color settle → continue. |

## Components

| File | Exports |
|---|---|
| `Primitives.jsx`     | `Icon`, `SystemLabel`, `LAButton`, `LAPanel`, `ProgressBar`, `RankBadge`, `LA_COLORS`, `RANK_COLORS` |
| `Chrome.jsx`         | `PlayerHeader`, `TabBar` |
| `HabitCard.jsx`      | `HabitCard` (pending / completed / failed states) |
| `Screens.jsx`        | `HomeScreen`, `HabitsScreen`, `AddHabitScreen`, `StatsScreen`, `SystemScreen`, `SystemMessage`, `ScreenHeader`, `SummaryStat` |
| `RankUpOverlay.jsx`  | `RankUpOverlay` |
| `android-frame.jsx`  | Starter Pixel-style device frame (`AndroidDevice`). Dark mode used here. |

## Notes & limits

- **Recreation, not production.** Components are small cosmetic versions — no real persistence, no offline DB.
- **Icons** are inline Lucide-style paths (see `Icon` in `Primitives.jsx`). Substitute when a final icon set is selected.
- **No data viz lib.** The weekly chart is hand-drawn bars; swap in your real lib at integration time.
- **No animations beyond rank-up.** Per the brief, the system should feel crisp, not springy.
