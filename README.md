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

### 3. Five Firearms, Overhead Ammo Visuals & Juicy VFX / SFX
Racers automatically aim and fire at the nearest enemy within line-of-sight when holding a firearm, or slash on contact with a Knife (all firearm damages tuned with an 85% damage nerf for longer tactical firefights):
- **Uzi (`uzi`)**: Rapid-fire SMG (`1.4 DMG`, `0.11s` cooldown, `16` rounds, wide spread).
- **UMP (`ump`)**: Balanced tactical SMG (`2.1 DMG`, `0.17s` cooldown, `12` rounds, steady accuracy).
- **AK (`ak`)**: Heavy assault rifle (`3.3 DMG`, `0.23s` cooldown, `10` rounds, high impact).
- **Mini 14 (`mini14`)**: High-velocity marksman rifle (`5.1 DMG`, `0.34s` cooldown, `7` rounds, sniper range).
- **SCAR (`scar`)**: Precision combat rifle (`3.6 DMG`, `0.20s` cooldown, `10` rounds, tight grouping).
- **Knife (`knife`)**: Melee blade dealing `55 HP` slash damage on contact.
- **Shield (`shield`)**: Absorbs an incoming bullet or knife strike.
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

### 5. 2-Row Horizontally Scrollable Tool Select Bar & 100% Vector SVG Iconography
- Features a single **2-Row Horizontally Scrollable Tool Select** bar at the bottom of the Canvas/Track Inspector (`Select / Drag`, `Place Spawns`, `Rect Room`, `Circle Room`, `Moving Wall`, `Gate (H/V)`, `Bar (H/V)`, `Static Bar`, `Uzi SMG`, `UMP SMG`, `AK Rifle`, `Mini 14`, `SCAR-L`, `Knife`, `Shield`, `Star Dash`, `Cherry x2`, and `Delete Click`) while all duplicate toolbars in the Canvas overlay and Preset Tab are removed.
- All UI icons and canvas indicators use crisp vector SVGs with zero emoticons.

### 6. Persistent Track Inspector Save System & Camera Controls
- Auto-saves all Track Inspector, Layout, Camera, Racer Roster, and Sound settings to `localStorage`, plus provides named Save Slots and JSON Export/Import.
- **Double-Click Title in Simulation Scene**: Double-clicking the title badge in the Simulation Scene immediately returns to the Editor Scene without extra UI clutter.
- **Predictive Auto Camera**: Smoothly transitions toward the next moving wall stage when the active wall reaches a configurable completion threshold (default `75%`).

---

## Development

```bash
npm install
npm run dev
```
