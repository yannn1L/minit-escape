# Changelog — 2026-11-13 11:25 — Gun VFX/SFX, Overhead Ammo Cartridges, SVG Iconography & Tool Select Cleanup (Index 2)

## 1. Changes Made

### A. Deleted Tool Select in Canvas Editor & Preset Tab
- **Canvas Editor (`src/components/scenes/EditorScene.tsx`)**:
  - Removed the bottom 2-row `Tool Select` bar from the Track Editor panel and removed the `TOOLS (...)` mode indicator from the canvas top-left floating bar (renamed to a clean `VIEW` controls bar).
  - Restored direct `+ Rect`, `+ Circle`, `+ Gate (H)`, `+ Gate (V)`, `+ Bar (H)`, `+ Bar (V)`, and `+ Add Pickup` action buttons on the object group headers inside the **Editor** tab so elements can be added and dragged directly without cluttering the canvas or inspector bottom.
- **Preset Tab (`src/components/scenes/EditorScene.tsx`)**:
  - Deleted the `Tool Select` card from `inspectorTab === 'preset_tile'`, keeping the Preset Tab focused on Saved Inspector Configs, New Empty Circuit creation, Preset Circuits, and JSON Import/Export.

### B. Replaced All Emoticons with Crisp Vector SVGs
- Replaced every emoji/emoticon and unicode symbol across `EditorScene.tsx`, `LeaderboardBar.tsx`, `SpawnerToolbar.tsx`, `TopControls.tsx`, `MapEditorModal.tsx`, `RacerStudioModal.tsx`, `SynthLabModal.tsx`, `RenderSystem.ts`, and `README.md` with Lucide React SVG icons or custom inline `<svg>` / Canvas2D vector paths.
- Enhanced `PaperDropdown` in `EditorScene.tsx` to support an `icon?: React.ReactNode` property so dropdown items (weapons, pickups, keyholders, boss racers, race leader) render crisp SVG icons.

### C. Improved All Gun VFX & SFX (Satisfying, Juicy, Simple)
- **WebAudio SFX (`src/core/audio/SoundEngine.ts`)**:
  - Added `playLayeredGunshot` combining a pitch-dropping body transient oscillator with a filtered noise burst so every firearm has a distinct, punchy acoustic signature (`gun_uzi`, `gun_ump`, `gun_ak`, `gun_mini14`, `gun_scar`).
  - Added `gun_pickup` (metallic two-click slide rack), `bullet_hit` (punchy sub-thud + crisp hitmarker ping), and `ammo_empty` (dry mechanical click when the last round is fired).
- **2.5D Paper-Cut Gun VFX (`src/core/systems/RenderSystem.ts`, `src/core/systems/PhysicsSystem.ts`, `src/simulation/RaceSimulation.ts`)**:
  - **Recoil Kickback**: Added `recoilTimer` to `RacerStateComponent` so the equipped gun kicks backward along its barrel axis on every shot.
  - **Muzzle Flash**: Added `muzzleFlashTimer` to render a 2.5D paper-cut 3-spike golden star burst and white-hot core at the barrel tip when firing.
  - **Brass Shell Ejection**: Added `spawnShellCasing(x, y, aimAngle)` in `RaceSimulation.ts` to eject spinning brass casings sideways from the gun receiver on each shot.
  - **Dual-Layer Bullet Tracers**: Upgraded `drawProjectiles` in `RenderSystem.ts` with a colored outer glow trail, bright white inner core, and an oriented brass/copper bullet head with dark paper outline.

### D. Gun Ammo Visual Above Racers & Auto-Disappear When Empty
- **Overhead Visual Ammo Cartridge Belt (`src/core/systems/RenderSystem.ts`)**:
  - Whenever a racer holds a firearm with `weaponAmmo > 0`, a miniature belt of vertical bullet cartridges (dark paper outline, brass casing body, copper bullet tip, and empty dark slots for spent rounds) renders directly at the top of the racer in the simulation canvas.
  - In `LeaderboardBar.tsx`, added `BulletCartridgeSvg` alongside the live ammo count badge.
- **Disappear on Empty (`src/core/systems/PhysicsSystem.ts`)**:
  - When `state.weaponAmmo <= 0` after firing a round, `state.weapon` is immediately cleared to `null` (`state.weaponAmmo = 0`, `state.weaponMaxAmmo = 0`) and `Sound.play('ammo_empty')` is triggered, causing both the gun and the overhead ammo visual to disappear immediately.

---

## 2. Technical Assessment
- **Visual Clarity & Juiciness**: The combination of barrel-tip muzzle flash, recoil kickback, sideways brass shell ejection, dual-layer bullet tracers, and the overhead visual bullet cartridge belt gives immediate, readable combat feedback while staying faithful to the 2.5D paper-cut aesthetic.
- **Zero Emoticon Compliance**: Verified via regex search (`grep -rnP '[^\x00-\x7F]' src/`) that zero emoticons remain anywhere in the codebase.
- **Performance**: Muzzle flashes, recoil kickback, and overhead ammo cartridges are rendered with lightweight Canvas2D primitives with zero allocations per frame.

---

## 3. Recommendations
1. **Reload Crate Pickup**: Consider adding an optional `ammo_box` floor pickup in Battler mode that refills 50% of a racer's current magazine before their gun disappears.
2. **Custom Weapon Tuning in Inspector**: Expose per-weapon ammo capacity and damage sliders inside the Battler configuration card for custom arena rulesets.
