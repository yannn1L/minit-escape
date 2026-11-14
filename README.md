# Minit Escape! — 2.5D Paper-Cut Physics Race & Battler Arena

**Minit Escape!** is a customizable 2.5D paper-cut physics simulation and track editor featuring two core game modes (**Races** and **Battler**), a 100 HP health and projectile combat system, juicy firearm VFX/SFX with overhead visual ammo belts, circular and rectangular arena rooms, and an interactive SVG Track Inspector.

---

## Core Features

### 1. Dual Track Types: `Races` & `Battler`
- **Races (Classic Mode)**:
  - Racers navigate corridors, break obstacle gates, outrun staged moving walls, and compete to reach the Finish Line alcove first.
  - The Racers List (Leaderboard) displays real-time route completion percentage (`0%–100%`).
- **Battler (Survival Combat Mode)**:
  - No finish line — whoever survives until the end wins.
  - The Racers List (Leaderboard) automatically transforms into a **Live Health Bar HUD** displaying each racer's remaining HP (`100 HP` default), equipped weapon badge (`UZI`, `UMP`, `AK`, `M14`, `SCAR`, `KNF`) with an SVG bullet cartridge icon and live ammo counter, survival status (`KO`), and team/boss badge.
  - **Expandable Battler Sub-Modes**:
    - **Free-For-All (`ffa`)**: Every racer fights for themselves; last racer alive wins.
    - **Team Battle (`team_battle`)**: Racers are assigned to **Team A** or **Team B**; surviving alliance wins.
    - **Team vs Boss (`boss_fight`)**: One designated Boss racer scales up with a configurable HP multiplier (e.g., `5x` = `500 HP`) and battles all other challengers.

### 2. Racer Health System (100 HP Default)
- Every racer spawns with **100 HP** by default (customizable globally or per-racer in the **Racers** tab from `10 HP` to `1000 HP`).
- Overhead health bars render dynamically above racers in Battler mode or whenever a racer takes damage.
- Reaching `0 HP` eliminates (`petrifies`) the racer with hit-flash and particle feedback.

### 3. Upgraded Gun & Knife Models, +50% Equipped Scale, Top Pickup Labels & Corridor Gun Auto-Spawner
Racers automatically aim and fire at the nearest enemy within line-of-sight when holding a firearm, or slash on contact with a Knife (all firearm damages tuned with an 85% damage nerf for longer tactical firefights):
- **Detailed 2.5D Vector Weapon Models**:
  - **Knife (`knife`)**: Dual-bevel brushed steel combat blade (`55 HP` base slash damage), blood groove fuller, metallic crossguard bolster, ergonomic dark grip with brass rivets, and steel pommel cap.
  - **Uzi (`uzi`)**: Stamped steel receiver, folded top stock, tactical orange upper cover with ejection port, front/rear sight ears, threaded barrel nut, and extended grip magazine (`1.4 DMG`, `0.11s` cooldown, `16` rounds).
  - **UMP-45 (`ump`)**: Skeletonized folding polymer stock, sky-blue tactical receiver with Picatinny rail, forward vertical grip, straight `.45 ACP` box magazine, and suppressor shroud (`2.1 DMG`, `0.17s` cooldown, `12` rounds).
  - **AK-47 (`ak`)**: Angled wooden buttstock & grip, ribbed dark steel receiver with silver bolt carrier, curved crimson 30-round "banana" magazine, wooden handguard, and triangle front sight post (`3.3 DMG`, `0.23s` cooldown, `10` rounds).
  - **Mini 14 (`mini14`)**: Full-length emerald tactical rifle chassis with raised cheek rest, dual-ring telescopic sniper scope with glowing green lenses, precision stainless barrel, and flash hider (`5.1 DMG`, `0.34s` cooldown, `7` rounds).
  - **SCAR-L (`scar`)**: Monolithic desert gold upper receiver, folding UGG boot stock with black cheek riser, top Picatinny rail with holographic sight, steel STANAG magazine, and heavy barrel (`3.6 DMG`, `0.20s` cooldown, `10` rounds).
- **+50% Larger Equipped Gun Model**:
  - When equipped by a racer, the firearm model scales up by **50%** (`1.38x` scale vs `0.92x` floor icon scale) with matching barrel-tip muzzle flash and projectile spawn alignment.
- **Top Gun Name Text on Floor Pickup Items**:
  - Floor gun pickup items display their weapon name (`UZI`, `UMP-45`, `AK-47`, `MINI 14`, `SCAR-L`, plus custom multiplier tags like `x2` when boosted) directly above the pickup sticker in both the live Simulation Canvas and the SVG Track Editor.
- **Global & Per-Corridor Auto-Spawn Gun System**:
  - **Master Auto-Spawn Toggle (`ON` / `OFF`)**: Enable or disable automatic floor gun spawning in both `Races` and `Battler` modes.
  - **Per-Corridor Gun Spawner**: Select any corridor on the track canvas (or toggle corridor chips in the inspector) to turn **Corridor Gun Auto-Spawn (`ON` / `OFF`)** on that specific corridor so guns spawn exclusively inside the selected corridor(s).
  - **Customizable Spawner & Pickup Multipliers**: Configure which weapons can spawn (`UZI`, `UMP-45`, `AK-47`, `MINI 14`, `SCAR-L`, `KNIFE`), **Damage Multiplier** (`0.25x–10x`), **Ammo Multiplier** (`0.5x–10x`), **Fire Rate Multiplier** (`0.5x–3x`), **Spawn Interval**, and **Max Active Floor Guns** per corridor, globally, or per placed pickup.
  - **Flood-Safe Spawning & Wall Contact Cleanup**: Both per-corridor and global gun auto-spawners validate candidate coordinates against active moving wall flood zones (`!isPointInFlood` with a 12px buffer) so weapons only spawn in safe unflooded areas ahead of the wall, and any existing floor weapon touched by an advancing moving wall is immediately destroyed with a cyan dissolution burst.
- **Overhead Visual Ammo Cartridge Belt & Auto-Disappear**:
  - Whenever a racer holds a firearm, a row of miniature vertical bullet cartridges (brass casing + copper bullet tip) renders directly above the racer in the simulation canvas.
  - Each shot depletes a cartridge in real time and ejects a spinning brass shell casing sideways from the gun receiver.
  - When `weaponAmmo` reaches `0`, an empty-magazine click plays (`ammo_empty`) and both the firearm and overhead ammo belt immediately disappear (`state.weapon = null`).
- **Juicy Gun VFX & WebAudio SFX**:
  - **VFX**: 2.5D paper-cut star muzzle flash with white-hot core at the barrel tip, weapon recoil kickback animation, sideways brass shell casing ejection, dual-layer glowing bullet tracers with oriented copper tips, and impact spark particles.
  - **SFX**: Layered WebAudio synthesis (`playLayeredGunshot`) combining a low-end pitch-drop punch transient and filtered noise burst tailored for each firearm (`gun_uzi`, `gun_ump`, `gun_ak`, `gun_mini14`, `gun_scar`), plus mechanical slide-rack pickup (`gun_pickup`), hitmarker thud (`bullet_hit`), and empty magazine click (`ammo_empty`).

### 4. Preset Circuits & New Empty Circuit Generator
- **Preset Circuits**:
  1. **Classic Escape** (`Races`)
  2. **Serpent Maze** (`Races`)
  3. **Fortress Siege** (`Races`)
  4. **Battleground Dome** (`Battler` — interconnected circular rooms without a finish line and periodic random floor weapon spawning)
- **New Empty Circuit**:
  - One-click **+ Empty Race** or **+ Empty Battler** circuit creation in the **Presets** tab for building custom arenas from scratch.

### 5. Docked Bottom Tool Select Bar, Restored Utility Header & Track Canvas Previews
- **Compact Utility Header Row**: Docked directly above the bottom 2-row Tool Select grid in the Track Inspector, providing instant access to **Mode Switch (`Races` / `Battler`)**, **Aspect Ratio (`1:1`, `16:9`, `4:3`, `Full`)**, **Canvas Zoom (`-`, `100%`, `+`)**, **Undo / Redo**, and **Save** without obstructing the track canvas.
- **2-Row Horizontally Scrollable Tool Select Grid**: Includes `Select / Drag`, `Place Spawns`, `Rect Room`, `Circle Room`, `Moving Wall`, `Gate (H/V)`, `Bar (H/V)`, `Static Bar`, `Uzi SMG`, `UMP SMG`, `AK Rifle`, `Mini 14`, `SCAR-L`, `Knife`, `Shield`, `Star Dash`, `Cherry x2`, and `Delete Click`.
- **Track Editor Trajectory & Flow Previews**:
  - **Moving Barriers**: Dashed travel path line, endpoint pivot dots, translucent dashed ghost bounding boxes at `-distance` and `+distance`, and live `±distance px · speed px/s` telemetry when selected.
  - **Moving Walls**: High-contrast cyan origin edge bar, directional flow chevrons across the corridor interior, and a stage badge (`STAGE #N · DIR · SPEED px/s`).
- **100% Vector SVG Iconography**: All UI icons and canvas indicators use crisp vector SVGs with zero emoticons.

### 6. Flexible Studio UI/UX: Resizable & Collapsible Inspector, Spacebar Pan & Accordions
- **Resizable & Collapsible Inspector Sidebar with Drag Splitter**:
  - Drag the interactive vertical splitter handle between the Track Canvas and the Track Inspector to resize the sidebar (`280px–560px`, double-click splitter to reset to `380px`).
  - Collapse the Inspector sidebar with one click (`ArrowRight` button) to expand the Track Canvas to 100% width, with a floating **Open Inspector** pill button on the canvas for instant restoration.
- **Smooth Canvas Pan & Cursor-Centered Zoom**:
  - Hold **Spacebar + Drag** or **Middle-Click + Drag** anywhere on the Track Editor canvas (even directly over corridors, gates, barriers, or pickups) to pan smoothly across large circuits.
  - Scroll wheel zooms smoothly around the cursor position with a bottom-left status indicator and one-click **Reset View** button.
- **Collapsible Inspector Accordions & Spring Physics**:
  - Track Editor sections (**Track Game Mode**, **Auto-Spawn Gun System**, **Wall Trigger Condition**, **Rooms & Corridors**, **Obstacle Gates**, **Barriers**, and **Pickups & Weapons**) are organized into collapsible `InspectorAccordion` cards with live summary badges and smooth spring transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).

### 7. High-Performance Simulation & Editor Architecture
- **2D Uniform Spatial Hash Grid Broadphase (`SpatialGrid.ts`)**:
  - Indexes active gates, barriers, and racers into `96×96` spatial cells each frame with stamp-based zero-allocation deduplication for fast collision and firearm line-of-sight queries.
- **Zero-Allocation Object Pooling (`RaceSimulation.ts` & `PhysicsSystem.ts`)**:
  - Pre-allocated pools reuse `Particle` (confetti & brass shell casings), `Projectile` (bullets), `FloatingText` (`+HP`, weapon pickups), and physics entity records to eliminate garbage collection frame spikes during intense firefights.
- **Offscreen Static Track Layer Caching (`RenderSystem.ts`)**:
  - Pre-renders the 4-pass paper corridor geometry (drop shadow, dark border, inner recess, walkable surface) and checkered finish alcove onto an offscreen HiDPI canvas and blits it in a single `drawImage` call per frame.
- **Throttled React HUD Updates & Memoized SVG Layers**:
  - Throttles non-critical React HUD leaderboard updates to `60ms` (~16.6 Hz) while keeping critical state transitions immediate, and memoizes static SVG corridor shadow/border layers in the Track Editor.

### 8. Persistent Track Inspector Save System & Camera Controls
- Auto-saves all Track Inspector, Layout, Camera, Racer Roster, and Sound settings to `localStorage`, plus provides named Save Slots and JSON Export/Import.
- **Double-Click Title in Simulation Scene**: Double-clicking the title badge in the Simulation Scene immediately returns to the Editor Scene without extra UI clutter.
- **Predictive Auto Camera**: Smoothly transitions toward the next moving wall stage when the active wall reaches a configurable completion threshold (default `75%`).

---

## Development

```bash
npm install
npm run dev
```

