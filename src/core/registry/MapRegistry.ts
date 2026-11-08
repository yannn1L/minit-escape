import { GlobalRegistry } from './StrategyRegistry';
import type { MapData } from '../../types/game';

/**
 * MAP 1: SERPENTINE TOWER
 * Classic multi-bay launch into a vertical S-curve serpentine climb with a 0° Top-Left Finish Zone.
 */
export const MAP_CLASSIC_SERPENTINE: MapData = {
  id: 'classic_serpentine',
  name: 'Serpentine Tower',
  corridors: [
    // Stage 1: 4 Horizontal Starting Bays on Bottom-Left
    { x: 40,  y: 380, w: 135, h: 48,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 48, wallOrder: 1 },
    { x: 40,  y: 460, w: 135, h: 48,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 48, wallOrder: 1 },
    { x: 40,  y: 540, w: 135, h: 48,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 48, wallOrder: 1 },
    { x: 40,  y: 620, w: 135, h: 48,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 48, wallOrder: 1 },
    // Stage 2: Left Ascending Chute
    { x: 170, y: 210, w: 75,  h: 515, hasMovingWall: true, wallDirection: 'up',    wallSpeed: 65, wallOrder: 2 },
    // Stage 3: Upper Mid Bridge
    { x: 170, y: 210, w: 185, h: 70,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 60, wallOrder: 3 },
    // Stage 4: Right Descending Chute
    { x: 280, y: 210, w: 75,  h: 515, hasMovingWall: true, wallDirection: 'down',  wallSpeed: 65, wallOrder: 4 },
    // Stage 5: Bottom U-Turn Sweep
    { x: 280, y: 655, w: 195, h: 70,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 62, wallOrder: 5 },
    // Stage 6: Far-Right High-Speed Ascent
    { x: 405, y: 110, w: 70,  h: 615, hasMovingWall: true, wallDirection: 'up',    wallSpeed: 70, wallOrder: 6 },
    // Stage 7: Top Final Sprint (Right-to-Left)
    { x: 55,  y: 110, w: 420, h: 65,  hasMovingWall: true, wallDirection: 'left',  wallSpeed: 65, wallOrder: 7 },
    // Top-Left Finish Approach & Alcove
    { x: 55,  y: 25,  w: 65,  h: 95 }
  ],
  finishZone: { x: 55, y: 25, w: 65, h: 55, rotation: 0 },
  baySpawns: [
    { x: 105, y: 396, vx: 3.1,  vy: -1.8, teamId: 'cyan' },
    { x: 135, y: 412, vx: -2.9, vy: 2.1,  teamId: 'red' },
    { x: 105, y: 476, vx: 3.2,  vy: 1.7,  teamId: 'yellow' },
    { x: 135, y: 492, vx: -2.8, vy: -2.2, teamId: 'green' },
    { x: 105, y: 556, vx: 3.0,  vy: -1.9, teamId: 'magenta' },
    { x: 135, y: 572, vx: -3.1, vy: 2.0,  teamId: 'blue' },
    { x: 105, y: 636, vx: 2.9,  vy: 2.1,  teamId: 'orange' },
    { x: 135, y: 652, vx: -3.2, vy: -1.8, teamId: 'purple' }
  ],
  gates: [
    { id: 's_bay0',       x: 165, y: 380, w: 12, h: 48, hp: 5,  color: 0x22d3ee, orientation: 'V' },
    { id: 's_bay1',       x: 165, y: 460, w: 12, h: 48, hp: 5,  color: 0x22c55e, orientation: 'V' },
    { id: 's_bay2',       x: 165, y: 540, w: 12, h: 48, hp: 5,  color: 0x1d4ed8, orientation: 'V' },
    { id: 's_bay3',       x: 165, y: 620, w: 12, h: 48, hp: 5,  color: 0xfacc15, orientation: 'V' },
    { id: 's_chute_low',  x: 170, y: 520, w: 75, h: 14, hp: 6,  color: 0xf97316, orientation: 'H' },
    { id: 's_chute_top',  x: 170, y: 340, w: 75, h: 16, hp: 12, color: 0x22c55e, orientation: 'H', triggersFlood: true },
    { id: 's_down_gate',  x: 280, y: 460, w: 75, h: 14, hp: 10, color: 0xff1e1e, orientation: 'H' },
    { id: 's_final_gate', x: 140, y: 110, w: 14, h: 65, hp: 18, color: 0x9333ea, orientation: 'V' }
  ],
  barriers: [
    { id: 's_bar_1', x: 295, y: 350, w: 45, h: 14, movement: 'horizontal', speed: 45, distance: 15, color: 0xf59e0b },
    { id: 's_bar_2', x: 432, y: 390, w: 16, h: 55, movement: 'vertical',   speed: 55, distance: 70, color: 0xf59e0b },
    { id: 's_bar_3', x: 260, y: 120, w: 14, h: 45, movement: 'static',     speed: 0,  distance: 0,  color: 0x475569 }
  ],
  pickups: [
    { type: 'cherry_clone', x: 207, y: 245 },
    { type: 'cherry_clone', x: 317, y: 245 },
    { type: 'star_dash',    x: 317, y: 580 },
    { type: 'shield',       x: 440, y: 520 },
    { type: 'knife',        x: 330, y: 142 }
  ],
  waypoints: [
    { x: 120, y: 644 },
    { x: 207, y: 644 },
    { x: 207, y: 245 },
    { x: 317, y: 245 },
    { x: 317, y: 690 },
    { x: 440, y: 690 },
    { x: 440, y: 142 },
    { x: 87,  y: 142 },
    { x: 87,  y: 50 }
  ]
};

/**
 * MAP 2: WHIRLPOOL SPIRAL
 * Clockwise inward spiral maze starting at Top-Left and winding around the outer perimeter
 * into the central core with a 90° rotated Finish Zone.
 */
export const MAP_DOUBLE_HELIX: MapData = {
  id: 'double_helix',
  name: 'Whirlpool Spiral',
  corridors: [
    // Stage 1: Top Outer Corridor (West-to-East)
    { x: 40,  y: 50,  w: 520, h: 90,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 52, wallOrder: 1 },
    // Stage 2: Right Outer Corridor (North-to-South)
    { x: 470, y: 50,  w: 90,  h: 620, hasMovingWall: true, wallDirection: 'down',  wallSpeed: 58, wallOrder: 2 },
    // Stage 3: Bottom Outer Corridor (East-to-West)
    { x: 40,  y: 580, w: 520, h: 90,  hasMovingWall: true, wallDirection: 'left',  wallSpeed: 58, wallOrder: 3 },
    // Stage 4: Left Inner Ascent (South-to-North)
    { x: 40,  y: 200, w: 90,  h: 470, hasMovingWall: true, wallDirection: 'up',    wallSpeed: 58, wallOrder: 4 },
    // Stage 5: Inner Top Bridge (West-to-East)
    { x: 40,  y: 200, w: 365, h: 85,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 55, wallOrder: 5 },
    // Stage 6: Inner Right Drop into Core (North-to-South)
    { x: 320, y: 200, w: 85,  h: 295, hasMovingWall: true, wallDirection: 'down',  wallSpeed: 55, wallOrder: 6 },
    // Stage 7: Core Finish Chamber (East-to-West into 90° Rotated Finish Zone)
    { x: 185, y: 410, w: 220, h: 85 }
  ],
  finishZone: { x: 190, y: 415, w: 65, h: 75, rotation: 90 },
  baySpawns: [
    { x: 75,  y: 75,  vx: 3.3, vy: -1.6, teamId: 'cyan' },
    { x: 105, y: 75,  vx: 3.1, vy: 1.9,  teamId: 'red' },
    { x: 135, y: 75,  vx: 3.4, vy: -1.7, teamId: 'yellow' },
    { x: 165, y: 75,  vx: 3.0, vy: 2.0,  teamId: 'green' },
    { x: 75,  y: 115, vx: 3.2, vy: 1.8,  teamId: 'magenta' },
    { x: 105, y: 115, vx: 3.3, vy: -1.9, teamId: 'blue' },
    { x: 135, y: 115, vx: 3.1, vy: 1.7,  teamId: 'orange' },
    { x: 165, y: 115, vx: 3.4, vy: -1.8, teamId: 'purple' }
  ],
  gates: [
    { id: 'w_gate_start', x: 225, y: 50,  w: 15, h: 90, hp: 10, color: 0x22c55e, orientation: 'V', triggersFlood: true },
    { id: 'w_gate_east',  x: 470, y: 330, w: 90, h: 15, hp: 12, color: 0x22d3ee, orientation: 'H' },
    { id: 'w_gate_south', x: 270, y: 580, w: 15, h: 90, hp: 14, color: 0xfacc15, orientation: 'V' },
    { id: 'w_gate_west',  x: 40,  y: 380, w: 90, h: 15, hp: 12, color: 0xff1e1e, orientation: 'H' },
    { id: 'w_gate_core',  x: 275, y: 410, w: 15, h: 85, hp: 18, color: 0x9333ea, orientation: 'V' }
  ],
  barriers: [
    { id: 'w_bar_top',   x: 360, y: 65,  w: 16, h: 55, movement: 'vertical',   speed: 55, distance: 18, color: 0xf59e0b },
    { id: 'w_bar_right', x: 488, y: 470, w: 55, h: 16, movement: 'horizontal', speed: 50, distance: 18, color: 0xf59e0b },
    { id: 'w_bar_bot',   x: 160, y: 598, w: 16, h: 55, movement: 'vertical',   speed: 60, distance: 18, color: 0xf59e0b },
    { id: 'w_bar_inner', x: 210, y: 215, w: 16, h: 55, movement: 'static',     speed: 0,  distance: 0,  color: 0x475569 }
  ],
  pickups: [
    { type: 'cherry_clone', x: 515, y: 95 },
    { type: 'star_dash',    x: 515, y: 625 },
    { type: 'cherry_clone', x: 85,  y: 625 },
    { type: 'shield',       x: 85,  y: 242 },
    { type: 'knife',        x: 362, y: 242 }
  ],
  waypoints: [
    { x: 120, y: 95 },
    { x: 515, y: 95 },
    { x: 515, y: 625 },
    { x: 85,  y: 625 },
    { x: 85,  y: 242 },
    { x: 362, y: 242 },
    { x: 362, y: 452 },
    { x: 222, y: 452 }
  ]
};

/**
 * MAP 3: CROSSFIRE CITADEL
 * Wide-format Eastbound Split-Lane Fortress (880×540) with twin North/South bridges,
 * a central cross-connector, and a 270° Right-Facing Finish Zone on the far East!
 */
export const MAP_ARENA_GAUNTLET: MapData = {
  id: 'arena_gauntlet',
  name: 'Crossfire Citadel',
  corridors: [
    // Stage 1: West Starting Courtyard
    { x: 40,  y: 170, w: 155, h: 200, hasMovingWall: true, wallDirection: 'right', wallSpeed: 48, wallOrder: 1 },
    // Stage 2: West Split Junction (North-South Spine)
    { x: 185, y: 80,  w: 85,  h: 380, hasMovingWall: true, wallDirection: 'right', wallSpeed: 55, wallOrder: 2 },
    // Stage 3A: North High-Road Bridge (West-to-East)
    { x: 260, y: 80,  w: 340, h: 85,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 62, wallOrder: 3 },
    // Stage 3B: South Low-Road Bridge (West-to-East)
    { x: 260, y: 375, w: 340, h: 85,  hasMovingWall: true, wallDirection: 'right', wallSpeed: 62, wallOrder: 3 },
    // Mid Crossfire Connector (Allows switching between North & South bridges)
    { x: 395, y: 155, w: 70,  h: 230 },
    // Stage 4A: East Upper Convergence (North-to-Center)
    { x: 590, y: 80,  w: 85,  h: 215, hasMovingWall: true, wallDirection: 'down',  wallSpeed: 58, wallOrder: 4 },
    // Stage 4B: East Lower Convergence (South-to-Center)
    { x: 590, y: 245, w: 85,  h: 215, hasMovingWall: true, wallDirection: 'up',    wallSpeed: 58, wallOrder: 4 },
    // Stage 5: Final Citadel Straightaway (West-to-East)
    { x: 665, y: 220, w: 180, h: 100, hasMovingWall: true, wallDirection: 'right', wallSpeed: 65, wallOrder: 5 },
    // Far-East Finish Alcove Corridor
    { x: 835, y: 225, w: 75,  h: 90 }
  ],
  finishZone: { x: 840, y: 230, w: 65, h: 80, rotation: 270 },
  baySpawns: [
    { x: 75,  y: 195, vx: 3.2, vy: -1.8, teamId: 'cyan' },
    { x: 115, y: 210, vx: 3.3, vy: 1.7,  teamId: 'red' },
    { x: 75,  y: 235, vx: 3.1, vy: -2.0, teamId: 'yellow' },
    { x: 115, y: 255, vx: 3.4, vy: 1.8,  teamId: 'green' },
    { x: 75,  y: 280, vx: 3.2, vy: 1.9,  teamId: 'magenta' },
    { x: 115, y: 300, vx: 3.1, vy: -1.7, teamId: 'blue' },
    { x: 75,  y: 325, vx: 3.3, vy: 2.0,  teamId: 'orange' },
    { x: 115, y: 345, vx: 3.4, vy: -1.9, teamId: 'purple' }
  ],
  gates: [
    { id: 'c_start_gate', x: 180, y: 170, w: 14, h: 200, hp: 12, color: 0x22c55e, orientation: 'V', triggersFlood: true },
    { id: 'c_north_gate', x: 340, y: 80,  w: 14, h: 85,  hp: 10, color: 0x22d3ee, orientation: 'V' },
    { id: 'c_south_gate', x: 340, y: 375, w: 14, h: 85,  hp: 10, color: 0xfacc15, orientation: 'V' },
    { id: 'c_mid_gate',   x: 395, y: 262, w: 70, h: 14,  hp: 8,  color: 0xff1493, orientation: 'H' },
    { id: 'c_final_gate', x: 755, y: 220, w: 16, h: 100, hp: 22, color: 0xff1e1e, orientation: 'V' }
  ],
  barriers: [
    { id: 'c_bar_north', x: 500, y: 92,  w: 16, h: 55, movement: 'vertical',   speed: 65, distance: 16, color: 0xf59e0b },
    { id: 'c_bar_south', x: 500, y: 390, w: 16, h: 55, movement: 'vertical',   speed: 65, distance: 16, color: 0xf59e0b },
    { id: 'c_bar_east',  x: 695, y: 245, w: 16, h: 50, movement: 'vertical',   speed: 55, distance: 22, color: 0xf59e0b },
    { id: 'c_bar_stat',  x: 220, y: 245, w: 20, h: 50, movement: 'static',     speed: 0,  distance: 0,  color: 0x475569 }
  ],
  pickups: [
    { type: 'cherry_clone', x: 225, y: 122 },
    { type: 'cherry_clone', x: 225, y: 418 },
    { type: 'star_dash',    x: 430, y: 122 },
    { type: 'shield',       x: 430, y: 418 },
    { type: 'knife',        x: 430, y: 220 },
    { type: 'cherry_clone', x: 632, y: 270 }
  ],
  waypoints: [
    { x: 100, y: 270 },
    { x: 225, y: 270 },
    { x: 225, y: 122 },
    { x: 632, y: 122 },
    { x: 632, y: 270 },
    { x: 875, y: 270 }
  ]
};

// Register default maps
GlobalRegistry.register('map', 'classic_serpentine', MAP_CLASSIC_SERPENTINE);
GlobalRegistry.register('map', 'double_helix', MAP_DOUBLE_HELIX);
GlobalRegistry.register('map', 'arena_gauntlet', MAP_ARENA_GAUNTLET);

