# Changelog: Restored Bottom Toolbar Controls, Moving Barrier/Wall Previews & Flood-Safe Gun Spawning

**Date:** 2026-11-13
**Time:** 19:03
**Title:** bottom-toolbar-previews-and-wall-spawn-fix
**Index:** 6

---

## 1. Changes Made

### A. Restored Controls in Bottom Tool Select Bar (`src/components/scenes/EditorScene.tsx`)
- Added a **Compact Utility Header Row** directly above the 2-row horizontally scrollable Tool Select grid at the bottom of the Track Inspector panel (`Track` tab), restoring all controls previously removed from the floating canvas `VIEW` button (`public/changelogs/2026-11-13-18-06-remove-canvas-floating-bar-4.md`):
  - **Mode Switch**: `Races` / `Battler` segmented toggle with SVG icons.
  - **Aspect Ratio Selector**: `1:1`, `16:9`, `4:3`, and `Full` ratio buttons.
  - **Canvas Zoom**: `-` zoom out, percentage reset (`100%`), and `+` zoom in controls.
  - **Undo / Redo**: Full history stack buttons (`Undo` and `Redo`) with disabled states when history stacks are empty.
  - **Save Button**: Instant configuration save trigger with an animated `SAVED` confirmation state.

### B. Track Editor Visual Previews for Moving Barriers & Moving Walls (`src/components/scenes/EditorScene.tsx`)
- **Moving Barriers (`obstacle.movement?.enabled`)**:
  - Rendered a dashed amber trajectory line from `-distance` to `+distance` along the active axis (`horizontal` or `vertical`).
  - Added endpoint pivot dots and translucent dashed ghost bounding boxes showing exact turnaround bounds at both ends of travel.
  - Added an inline telemetry label (`±distance px · speed px/s`) when a moving barrier is selected.
- **Moving Walls (`corridor.movingWall?.enabled`)**:
  - Rendered a high-contrast cyan origin bar on the corridor edge where the flood wall originates (`top`, `bottom`, `left`, or `right`).
  - Rendered a sequence of directional flow chevrons across the corridor interior pointing in the flood advancement direction.
  - Added a stage badge displaying `STAGE #N · DIRECTION · SPEED px/s` (plus `+delay s` when start delay is configured).

### C. Moving Wall & Gun Spawner Protection (`src/simulation/RaceSimulation.ts`, `src/core/systems/PickupSystem.ts`)
- **Flood-Safe Point Sampling (`RaceSimulation.ts`)**:
  - Added `isPointSafeFromFlood(x, y, margin = 12)` to check whether a candidate spawn coordinate plus a 12px safety buffer is clear of any active moving wall flood zone.
  - Added `sampleSafePointInSingleCorridor` and `sampleSafePointInCorridors` with up to 36 rejection-sampling attempts so both Per-Corridor Gun Spawners and the Global Auto-Spawner only place weapons in unflooded space ahead of advancing walls (skipping the spawn cycle if a corridor is completely flooded).
- **Flood Contact Destruction (`PickupSystem.ts`)**:
  - Updated `PickupSystem.update` to check all active floor items against `this.sim.isPointInFlood(pPos.x, pPos.y)` when `this.sim.floodActive` is true.
  - Any weapon or item overtaken by a moving wall is immediately destroyed with a cyan dissolution particle burst (`0x06f9f9`).

---

## 2. Assessment
- **Ergonomics & Canvas Clarity**: Placing the restored `Mode`, `Aspect Ratio`, `Zoom`, `Undo/Redo`, and `Save` controls in the docked bottom bar keeps the Track Editor canvas 100% unobstructed while restoring one-click access to essential workspace actions.
- **Spatial Predictability**: Track designers can now immediately see moving barrier sweep zones and multi-stage moving wall flood directions without having to enter simulation playback to test clearances.
- **Simulation Integrity**: Weapons no longer spawn inside lethal flood zones or linger unreachable behind an advancing moving wall, keeping item counts accurate and encouraging forward progression.

---

## 3. Recommendations
- Consider adding an optional toggle in the Track Inspector header to show/hide trajectory overlays when working on dense obstacle courses.
- Consider adding a subtle warning indicator on a corridor's moving wall badge if two corridors share the exact same `stageOrder` without intentional parallel flooding.
