# Changelog: Upgraded Gun & Knife Models, +50% Equipped Gun Scale, Top Pickup Name Labels, and Per-Corridor Gun Auto-Spawner

**Date:** 2026-11-13
**Time:** 18:30
**Index:** 5

---

## 1. Changes Made

### A. Upgraded All 5 Gun Models & Combat Knife Model (`src/core/registry/PickupRegistry.ts`, `src/core/systems/RenderSystem.ts`)
- **Combat Knife (`drawKnifeShape`)**:
  - Redesigned with a dual-tone bevelled steel blade (`#f8fafc` edge and `#cbd5e1` spine), center blood groove fuller (`#64748b`), metallic crossguard bolster (`#475569`), ergonomic dark grip (`#1e293b`) with twin golden brass rivets (`#facc15`), and steel pommel cap (`#94a3b8`).
  - Used for both floor pickup icons and equipped racer melee weapons.
- **Firearms (`drawFirearmShape`)**:
  - **Uzi (`uzi`)**: Stamped steel receiver, folded top stock, tactical orange cover with ejection port cutout, front/rear sight ears, threaded barrel nut, and central pistol grip with protruding extended magazine & orange floorplate.
  - **UMP-45 (`ump`)**: Skeletonized folding rear polymer stock, sky-blue upper receiver with top Picatinny rail & ejection port, rear pistol grip, forward vertical foregrip, straight `.45 ACP` box magazine with blue band, and heavy suppressor shroud.
  - **AK-47 (`ak`)**: Angled wooden buttstock and wooden pistol grip, stamped dark steel receiver with silver bolt carrier, iconic curved crimson/bakelite 30-round "banana" magazine, wooden handguard, triangle front sight post, and steel barrel.
  - **Mini 14 (`mini14`)**: Full-length emerald tactical rifle chassis with dark cheek rest pad, steel action, dual-ring high-powered telescopic scope with glowing green objective/ocular lenses, short box magazine, stainless precision barrel, and flash hider.
  - **SCAR-L (`scar`)**: Monolithic desert gold upper receiver with highlight strip and vents, folding UGG boot stock with black cheek riser & rubber buttpad, full-length top Picatinny rail with holographic sight housing, straight steel STANAG magazine with tan floorplate, and heavy barrel.

### B. +50% Equipped Gun Model Size (`src/core/systems/RenderSystem.ts`, `src/core/systems/PhysicsSystem.ts`)
- Increased the equipped firearm model scale by **50%** (`equipScale = 1.38`, up from `0.92`) when held by a racer.
- Updated barrel-tip muzzle flash offset (`spec.barrelLen * 1.38`) and projectile spawn distance in `PhysicsSystem.ts` so muzzle flashes and bullets originate cleanly from the barrel tip of the larger equipped gun model.

### C. Top Name Text on Gun Pickup Items (`src/core/systems/RenderSystem.ts`, `src/components/scenes/EditorScene.tsx`)
- Added a high-contrast weapon name label (`UZI`, `UMP-45`, `AK-47`, `MINI 14`, `SCAR-L`, plus multiplier tags such as `x2` when boosted) directly above gun pickup items on the floor in both the live Simulation Canvas (`RenderSystem.ts`) and the SVG Track Editor (`EditorScene.tsx`).
- Added a subtle weapon-colored inner ring on firearm floor stickers and vector gun/knife silhouettes inside SVG editor pickup nodes.

### D. Global & Per-Corridor Auto-Spawn Gun System (`src/types/game.ts`, `src/simulation/RaceSimulation.ts`, `src/components/scenes/EditorScene.tsx`)
- **Global Auto-Spawn Gun Toggle (`ON` / `OFF`)**:
  - Accessible in the Track Editor overview in **both** `Races` and `Battler` modes.
  - Includes quick corridor target chips (`#1`, `#2`, etc.) to toggle corridor-specific gun spawning or jump directly to a corridor's inspector.
- **Per-Corridor Gun Auto-Spawner (`CorridorRect.gunSpawner`)**:
  - Selecting any corridor in the Track Editor reveals the **Corridor Gun Auto-Spawn** section (`Gun Spawn: OFF` / `Gun Spawn: ON`).
  - When enabled on one or more corridors, guns spawn specifically inside the bounds of those selected corridors (`Geometry.randomPointInSingleCorridor`).
  - Configurable per corridor (and globally):
    - **Allowed Guns**: Multi-select toggles for `UZI`, `UMP-45`, `AK-47`, `MINI 14`, `SCAR-L`, and `KNIFE`.
    - **Damage Multiplier**: `0.25x` to `10x` (default `1.0x`).
    - **Ammo Multiplier**: `0.5x` to `10x` (default `1.0x`).
    - **Fire Rate Multiplier**: `0.5x` to `3.0x` (default `1.0x`).
    - **Spawn Interval (`0.5s–25s`)** and **Max Active Guns (`1–20`)**.
  - Added an SVG indicator badge (`GUN SPAWN x1D/x1A`) on corridors with active gun spawners in the Track Editor canvas.
  - Also added **Pickup Weapon Multipliers** (`Damage Mult`, `Ammo Mult`, `Fire Rate`) when inspecting individual placed gun/knife pickups on the track.

---

## 2. Assessment
- **Visual Readability**: The +50% larger equipped gun models and detailed silhouettes make it immediately obvious which racer is carrying an Uzi, UMP-45, AK-47, Mini 14, SCAR-L, or Knife during fast-paced action, while top name labels on floor pickups make floor loot easy to identify at a glance.
- **Level Design Flexibility**: Designers can now create dedicated "armory corridors" or high-stakes power-weapon rooms (e.g., a corridor that only spawns `2x Damage` Mini 14s and SCAR-Ls) in both `Races` and `Battler` circuits.

---

## 3. Recommendations
- Try enabling **Corridor Gun Auto-Spawn** on a central choke-point corridor with `Damage Mult: 2x` and `Ammo Mult: 1.5x` to create contested combat zones in race or battler arenas.
