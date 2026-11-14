# Changelog — 2026-11-13 10:38 — Battler Mode, Firearms, Health System & 2-Row Tool Select

## 1. Changes Made

### A. New Empty Circuit & Removal of Quick Stamp -> 2-Row Horizontally Scrollable Tool Select
- **New Empty Circuit Generator (`createEmptyCircuit`)**:
  - Added `+ Empty Race` and `+ Empty Battler` buttons in the **Presets** tab of the Track Inspector so users can start with a clean single-room rectangular or circular arena.
- **Replaced Quick Stamp with 2-Row Horizontally Scrollable Tool Select**:
  - Removed the legacy "Stamp Preset Tiles" and bottom "Quick Stamp (Placed at View Center)" sections.
  - Added the **Tool Select (2 Rows · Scroll ↔)** bar (`grid grid-rows-2 grid-flow-col auto-cols-max gap-1 overflow-x-auto`) in both the Presets tab and the bottom of the Track Inspector.
  - Clicking a tool activates interactive map placement for Circular Rooms (`◎ Circle Room`), Rectangular Halls, Moving Walls, Gates, Barriers, all 5 new firearms (`Uzi`, `UMP`, `AK`, `Mini 14`, `SCAR`), and classic pickups.

### B. Universal Racer Health System (100 HP Default)
- **100 HP Default**:
  - Updated `DEFAULT_TEAMS` and `RacerStateComponent` so every racer initializes with `hp: 100` and `maxHp: 100`.
  - Added individual racer **Health (HP)** steppers and a global **❤️ All 100 HP** button in the **Racers** tab.
  - Added overhead HP bars and hit-flash animations on the 2D simulation canvas.

### C. Dual Track Types (`Races` & `Battler`) & Expandable Sub-Modes
- **Track Mode Switcher**:
  - Added `trackType: 'races' | 'battler'` to `MapData`, with quick toggle buttons on the canvas toolbar and in the Track Editor overview.
- **Battler Sub-Modes (`BattlerSubMode`)**:
  - **Free-For-All (`ffa`)**: Last surviving racer wins.
  - **Team Battle (`team_battle`)**: Team A vs Team B alliances (configurable per racer in the **Racers** tab).
  - **Team vs Boss (`boss_fight`)**: Configurable Boss racer with scaled body size and HP multiplier (`2x–20x`) vs all other racers.
- **Racers List Replaced with Live Health Bar in Battler Mode**:
  - Updated `LeaderboardBar.tsx` so when `trackType === 'battler'`, each racer slot renders a color-coded live **Health Bar** (`emerald` -> `amber` -> `rose`), numeric HP (`100HP` or `KO`), equipped weapon tag (`UZI`, `UMP`, `AK`, `M14`, `SCAR`, `KNF`), and Alliance/Boss badge.

### D. New Preset Circuit: `Battleground Dome` & Circular Room Geometry
- **Circular Room Support (`shape: 'circle'`)**:
  - Extended `Geometry.ts` (`isPointInCorridor`, `isBoxInsideCorridors`, `snapBoxInsideCorridors`, `randomPointInCorridors`) to support circular/elliptical rooms with radial wall bounce normals.
  - Added `MAP_BATTLEGROUND` (**4. Battleground ⚔️**) composed exclusively of 5 interconnected circular rooms (`shape: 'circle'`), no finish line (`hideFinishZone: true`), and periodic random weapon spawning on the floor (`randomWeaponSpawn: true`).

### E. Five New Firearm Weapons (`Uzi`, `UMP`, `AK`, `Mini 14`, `SCAR`)
- Implemented `WEAPON_SPECS` and custom vector sprites in `PickupRegistry.ts` and `RenderSystem.ts` for:
  - **Uzi (`uzi`)**: Fast fire rate SMG (`12 DMG`, `24` ammo).
  - **UMP (`ump`)**: Controlled burst SMG (`20 DMG`, `18` ammo).
  - **AK (`ak`)**: Heavy assault rifle (`30 DMG`, `15` ammo).
  - **Mini 14 (`mini14`)**: High-velocity sniper DMR (`42 DMG`, `10` ammo).
  - **SCAR (`scar`)**: Balanced precision rifle (`26 DMG`, `16` ammo).
- Implemented auto-aiming, projectile physics, tracer rendering, wall/gate collision, shield absorption, and HP damage in `PhysicsSystem.ts` and `RaceSimulation.ts`.

---

## 2. Assessment
- **Gameplay & Physics Integrity**: Circular rooms and rectangular halls seamlessly interconnect using unified point/box containment checks, preventing racers from clipping outside overlapping circular rooms.
- **UI Simplicity & Customizability**: The 2-row horizontally scrollable Tool Select keeps the Track Inspector compact on both desktop and mobile landscape screens while exposing 26 tools without clutter.

---

## 3. Recommendations
1. **Custom Weapon Loadouts**: Allow assigning a starting weapon per racer in the Racers tab for instant skirmish rounds.
2. **Arena Shrinking Zone (Battle Royale Ring)**: Optional shrinking safe-zone ring in `Battler` mode to force late-game engagements in large multi-room circular arenas.
