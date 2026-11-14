# Changelog — Smooth Flexible Studio UI/UX & Engine Performance Architecture

- **Date**: 2026-11-13
- **Clock**: 19:28
- **Title**: smooth-ui-ux-and-engine-performance
- **Index**: 7

---

## 1. Changes Made

### A. Flexible Studio UI & Smooth UX (`src/components/scenes/EditorScene.tsx`, `src/index.css`)
1. **Resizable & Collapsible Track Inspector Sidebar with Drag Splitter**:
   - Added an interactive vertical splitter handle between the Track Editor canvas stage and the right Track Inspector sidebar (`280px–560px` range, default `380px`, double-click splitter handle to reset width).
   - Added a one-click collapse button in the Inspector header that hides the sidebar so the Track Canvas expands to 100% width, paired with a floating paper-cut **Open Inspector** button in the top-right corner of the canvas.
2. **Spacebar / Middle-Click Canvas Pan & Cursor-Centered Wheel Zoom**:
   - Added `isSpacePressed` keyboard tracking and `tryStartPanOverride` so holding `Space` + dragging or middle-clicking (`e.button === 1`) pans the canvas anywhere—even when clicking directly over corridors, gates, barriers, pickups, or spawns.
   - Upgraded `handleCanvasWheel` to perform cursor-centered zooming so the world coordinate under the pointer remains anchored while zooming in or out (`8%–600%`).
   - Added a bottom-left canvas status pill (`Hold Space or Middle-Click to Pan · Scroll to Zoom`) and a contextual `Reset View` button whenever the canvas is zoomed or panned away from default.
3. **Collapsible Inspector Accordions & Paper-Cut Spring Transitions**:
   - Created a reusable `InspectorAccordion` component with vector SVG chevron rotation, header status badges, and tactile paper-cut borders.
   - Organized the Track Editor overview into clean collapsible accordion sections: **Track Game Mode**, **Auto-Spawn Gun System**, **Wall Trigger Condition**, **Rooms & Corridors**, **Obstacle Gates**, **Barriers**, and **Pickups & Weapons**.
   - Enhanced `.paper-card` and `.paper-btn` in `src/index.css` with smooth spring transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).

### B. Simulation & Editor Performance Optimizations
1. **Uniform 2D Spatial Hash Grid (`src/core/math/SpatialGrid.ts` & `src/core/systems/PhysicsSystem.ts`)**:
   - Implemented `SpatialGrid<T>` (`96px` cell size) with zero-allocation stamp deduplication (`WeakMap<object, number>`).
   - Integrated `gateGrid`, `barrierGrid`, and `racerGrid` into `PhysicsSystem.ts` alongside pre-allocated entity wrapper pools (`racerPool`, `gatePool`, `barrierPool`), accelerating `checkGateSweep`, `checkBarrierSweep`, `boxOverlapsAnyObstacle`, `resolveRemainingGateAndBarrierOverlaps`, and `handleFirearmAutoShoot`.
2. **Zero-Allocation Object Pooling (`src/simulation/RaceSimulation.ts`)**:
   - Added object pools for `Particle` (`particlePool`), `Projectile` (`projectilePool`), and `FloatingText` (`floatingTextPool`).
   - Updated `spawnShellCasing`, `spawnConfetti`, `spawnProjectile`, `spawnFloatingText`, and `tick()` to recycle instances via swap-and-pop (`releaseProjectileAt`), eliminating per-shot garbage collection spikes.
3. **Offscreen Static Track Layer Caching (`src/core/systems/RenderSystem.ts`)**:
   - Added `trackCacheCanvas` and `ensureTrackCache()` keyed by a lightweight geometry signature (`computeMapGeometrySignature`).
   - Renders the 4-pass paper corridor geometry (drop shadow, dark border, inner recess, walkable surface) and checkered finish alcove once onto an offscreen HiDPI canvas and blits it via a single `ctx.drawImage` call per frame.
4. **Throttled React HUD Updates & Memoized SVG Layers (`src/simulation/RaceSimulation.ts`, `src/components/scenes/EditorScene.tsx`)**:
   - Throttled routine `notifyStatsChanged(false)` calls to `60ms` (~16.6 Hz) while keeping `notifyStatsChanged(true)` immediate for eliminations, pickups, and race completion.
   - Memoized static SVG corridor shadow and border layers (`memoizedCorridorBackdrop`) in `EditorScene.tsx` so dragging gates, barriers, pickups, or spawns does not re-render static corridor SVG nodes.

---

## 2. Assessment
- **UI Responsiveness & Ergonomics**: The resizable/collapsible sidebar, collapsible accordions, and Spacebar/middle-click canvas panning make editing large multi-room circuits significantly smoother and less cluttered across both desktop and mobile viewports.
- **Frame-Time Stability**: Combining the 2D spatial grid, object pooling, offscreen static track caching, and throttled React HUD updates eliminates GC churn and redundant canvas/DOM work during high-fire-rate Battler matches.
- **Compliance**: 100% vector SVG icons used throughout (zero emoticons).

---

## 3. Recommendations
- **Minimap Navigator Overlay**: For very large custom circuits (`>3000px`), a toggleable corner minimap in the Track Editor could allow single-click camera teleportation.
- **Spatial Grid Debug Overlay**: An optional developer toggle to visualize the `96×96` spatial hash cells and active broadphase queries on the simulation canvas.
