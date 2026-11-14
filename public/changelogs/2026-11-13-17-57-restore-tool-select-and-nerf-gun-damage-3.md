# Changelog — 2026-11-13 17:57 — Restore Bottom Tool Select Bar & 85% Gun Damage Nerf (Index 3)

## 1. Changes Made

### A. Restored Bottom 2-Row Tool Select Bar & Removed All Other Select Tools
- **Restored Bottom 2-Row Tool Select (`src/components/scenes/EditorScene.tsx`)**:
  - Restored the 2-row horizontally scrollable **Tool Select** bar at the bottom of the Track Editor (`grid-rows-2 grid-flow-col auto-cols-max gap-1 overflow-x-auto`).
  - Equipped every tool button (`Select / Drag`, `Place Spawns`, `Rect Room`, `Circle Room`, `Moving Wall`, `Gate (H)`, `Gate (V)`, `Bar (H)`, `Bar (V)`, `Static Bar`, `Uzi SMG`, `UMP SMG`, `AK Rifle`, `Mini 14`, `SCAR-L`, `Knife`, `Shield`, `Star Dash`, `Cherry x2`, and `Delete Click`) with crisp Lucide SVG icons and bound them to valid `EditorMode` handlers so clicking directly on the SVG canvas places or deletes objects immediately.
- **Removed All Other Select/Add Tools**:
  - Kept the duplicate Tool Select card in the **Preset Tab** and on the **Canvas Floating Overlay** removed, and removed the inline `+ Rect`, `+ Circle`, `+ Gate (H/V)`, `+ Bar (H/V)`, and `+ Add Pickup` buttons from the object list headers so only the single 2-row Tool Select bar is used.

### B. Nerfed All Gun Damages by 85%
- **Firearm Specifications (`src/core/registry/PickupRegistry.ts`)**:
  - Reduced all 5 firearm damage values by 85% (`* 0.15`):
    - **Uzi (`uzi`)**: `9` -> `1.4 DMG`
    - **UMP (`ump`)**: `14` -> `2.1 DMG`
    - **AK (`ak`)**: `22` -> `3.3 DMG`
    - **Mini 14 (`mini14`)**: `34` -> `5.1 DMG`
    - **SCAR (`scar`)**: `24` -> `3.6 DMG`
- **Fractional HP Precision & Display (`src/simulation/RaceSimulation.ts`, `src/components/LeaderboardBar.tsx`)**:
  - Updated `damageRacer` to preserve fractional HP precision (`Math.round((vicState.hp - damage) * 100) / 100`) and display clean 1-decimal floating damage numbers (`-1.4 HP`, `-2.1 HP`, `-3.3 HP`, `-5.1 HP`, `-3.6 HP`).
  - Updated `LeaderboardBar.tsx` so live HP badges display `Math.ceil(safeHp)` cleanly while alive and full fractional HP in the tooltip.

---

## 2. Technical Assessment
- **Combat Pacing**: With an 85% reduction in per-bullet damage against 100 HP racers, a full magazine from an Uzi (`16 * 1.4 = 22.4 DMG`) or AK (`10 * 3.3 = 33.0 DMG`) chips away roughly 22%–36% of a racer's health bar instead of instantly eliminating them, resulting in much longer, more dramatic Battler survival matches and multi-magazine skirmishes.
- **Editor Workflow**: Consolidating all placement/selection tools into the single 2-row horizontally scrollable Tool Select bar at the bottom of the Track Inspector keeps the UI focused and consistent.

---

## 3. Recommendations
1. **Per-Match Gun Damage Multiplier Slider**: Consider adding a `Weapon Damage Scale` slider (`0.25x` to `3.0x`) inside the Battler configuration card so players can tune time-to-kill per circuit.
2. **Keyboard Shortcuts for Tool Select**: Consider binding number keys (`1`–`9`) or `Esc` (to return to `Select / Drag`) for rapid tool switching while editing large circuits.
