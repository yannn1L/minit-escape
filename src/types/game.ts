/**
 * Common Game Types, Constants, and Interfaces
 */

export type WeaponType = 'knife' | 'uzi' | 'ump' | 'ak' | 'mini14' | 'scar';

export type TrackType = 'races' | 'battler';

export type BattlerSubMode = 'ffa' | 'team_battle' | 'boss_fight';

export interface BattlerConfig {
  subMode: BattlerSubMode;          // 'ffa' | 'team_battle' | 'boss_fight'
  defaultHp: number;                // Default HP for all racers (default 100)
  bossTeamId?: string;              // Which racer is the Boss in 'boss_fight' mode
  bossHpMultiplier?: number;        // Boss HP multiplier (default 4 -> 400 HP)
  randomWeaponSpawn: boolean;       // Periodically spawn random weapons on the floor
  weaponSpawnInterval: number;      // Seconds between random floor weapon spawns (e.g. 3.5)
  maxFloorWeapons: number;          // Max active floor pickups at once (e.g. 6)
}

export const DEFAULT_BATTLER_CONFIG: BattlerConfig = {
  subMode: 'ffa',
  defaultHp: 100,
  bossTeamId: 'red',
  bossHpMultiplier: 4,
  randomWeaponSpawn: true,
  weaponSpawnInterval: 3.5,
  maxFloorWeapons: 6,
};

export interface TeamConfig {
  id: string;
  name: string;
  hex: number;
  css: string;
  speed: number;       // Base speed factor (default ~3.25)
  elasticity: number;  // Bounce bounciness factor (default 1.0)
  shape?: 'square' | 'rounded' | 'circle';
  enabled?: boolean;   // Whether player selected this racer for the race
  maxHp?: number;      // Default 100 HP
  battleAlliance?: 'A' | 'B'; // Squad assignment in Team Battle mode
}

export const DEFAULT_TEAMS: TeamConfig[] = [
  { id: 'cyan',    name: 'CYAN',    hex: 0x22d3ee, css: '#22d3ee', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'A' },
  { id: 'red',     name: 'RED',     hex: 0xff1e1e, css: '#ff1e1e', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'B' },
  { id: 'yellow',  name: 'YELLOW',  hex: 0xfacc15, css: '#facc15', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'A' },
  { id: 'green',   name: 'GREEN',   hex: 0x22c55e, css: '#22c55e', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'B' },
  { id: 'magenta', name: 'PINK',    hex: 0xff1493, css: '#ff1493', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'A' },
  { id: 'blue',    name: 'BLUE',    hex: 0x1d4ed8, css: '#1d4ed8', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'B' },
  { id: 'orange',  name: 'ORANGE',  hex: 0xf97316, css: '#f97316', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'A' },
  { id: 'purple',  name: 'PURPLE',  hex: 0x9333ea, css: '#9333ea', speed: 3.25, elasticity: 1.0, maxHp: 100, battleAlliance: 'B' }
];

export type MovingWallDirection = 'up' | 'down' | 'left' | 'right';

export interface CorridorRect {
  x: number;
  y: number;
  w: number;
  h: number;
  shape?: 'rect' | 'circle';            // Rectangular corridor or circular battleground room
  rotation?: number;                    // Optional rotation angle in degrees (e.g. for finishZone: 0, 90, 180, 270, etc.)
  hasMovingWall?: boolean;              // Whether this corridor has an active moving wall
  wallDirection?: MovingWallDirection;  // Direction the wall travels inside this corridor
  wallSpeed?: number;                   // Advance speed (default: 55)
  wallDelay?: number;                   // Delay in seconds before this wall activates
  wallOrder?: number;                   // Sequence order: wall moves only after previous order completes
}

export type BarrierMovement = 'static' | 'horizontal' | 'vertical' | 'diagonal_up' | 'diagonal_down';

export interface BarrierConfig {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  movement: BarrierMovement;
  speed: number;       // e.g. 40 px/s
  distance: number;    // e.g. 60 px travel amplitude
  color?: number;
}

export interface GateConfig {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  color: number;
  orientation: 'H' | 'V';
  triggersFlood?: boolean;
  unlockTeamId?: string; // Optional: If specified, only this racer/team key can unlock/pass or destroy the gate immediately!
}

export interface PickupConfig {
  type: string;
  x: number;
  y: number;
}

export interface Waypoint {
  x: number;
  y: number;
}

export interface BaySpawn {
  x: number;
  y: number;
  vx: number;
  vy: number;
  teamId?: string;
}

export type WallTriggerMode = 'gate_destroy' | 'immediate' | 'timer' | 'off';

export type CameraType = 'auto_moving' | 'selected_racer' | 'manual';

export interface CameraConfig {
  type: CameraType;
  defaultZoom: number;        // Default zoom scale (e.g. 1.0)
  minZoom: number;            // Minimum zoom scale (e.g. 0.4)
  maxZoom: number;            // Maximum zoom scale (e.g. 2.5)
  smoothSpeed: number;        // Lerp smoothing factor (e.g. 4.5)
  targetRacerId?: string;     // 'leader' or specific team id (e.g. 'cyan', 'red', etc.)
  predictNextOrderAt?: number;// % progress of current wall order (default 75) to start moving to next order
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  type: 'auto_moving',
  defaultZoom: 1.0,
  minZoom: 0.4,
  maxZoom: 2.5,
  smoothSpeed: 4.5,
  targetRacerId: 'leader',
  predictNextOrderAt: 75,
};

export type ViewportAspectRatio = '1:1' | '16:9' | '4:3' | 'auto';

export interface SimulationLayoutConfig {
  aspectRatio: ViewportAspectRatio;           // '1:1' | '16:9' | '4:3' | 'auto'
  viewportScale?: number;                     // Arena viewport size percentage (default 100)
  viewportOffsetX?: number;                   // Arena viewport X offset in px (default 0)
  viewportOffsetY?: number;                   // Arena viewport Y offset in px (default 0)
  showTitle: boolean;                         // Whether to display the title badge
  customTitle: string;                        // Title text (default 'Minit Escape!')
  titlePosition: 'left' | 'center' | 'right'; // Alignment in top bar
  titleScale?: number;                        // Title size percentage (default 100)
  titleOffsetX?: number;                      // Title X offset in px (default 0)
  titleOffsetY?: number;                      // Title Y offset in px (default 0)
  showTimer: boolean;                         // Whether to display the live timer
  timerPosition: 'left' | 'right';            // Position of timer in header
  timerScale?: number;                        // Timer size percentage (default 100)
  timerOffsetX?: number;                      // Timer X offset in px (default 0)
  timerOffsetY?: number;                      // Timer Y offset in px (default 0)
  showRacersList: boolean;                    // Whether to display the racers leaderboard bar
  racersListPosition: 'bottom' | 'top';       // Above or below the arena canvas
  racersListStyle: 'detailed' | 'compact';    // Card density style
  racersListColumns: 'auto' | '8' | '4';      // Grid column mode
  racersListScale?: number;                   // Racers list size percentage (default 100)
  racersListOffsetX?: number;                 // Racers list X offset in px (default 0)
  racersListOffsetY?: number;                 // Racers list Y offset in px (default 0)
  arenaTheme: 'classic_blue' | 'midnight' | 'emerald' | 'sunset' | 'violet';
  arenaPadding: 'compact' | 'normal' | 'spacious';
}

export const DEFAULT_LAYOUT_CONFIG: SimulationLayoutConfig = {
  aspectRatio: '4:3',
  viewportScale: 100,
  viewportOffsetX: 0,
  viewportOffsetY: 0,
  showTitle: true,
  customTitle: 'Minit Escape!',
  titlePosition: 'center',
  titleScale: 100,
  titleOffsetX: 0,
  titleOffsetY: 0,
  showTimer: true,
  timerPosition: 'left',
  timerScale: 100,
  timerOffsetX: 0,
  timerOffsetY: 0,
  showRacersList: true,
  racersListPosition: 'bottom',
  racersListStyle: 'detailed',
  racersListColumns: 'auto',
  racersListScale: 100,
  racersListOffsetX: 0,
  racersListOffsetY: 0,
  arenaTheme: 'classic_blue',
  arenaPadding: 'normal',
};

export interface MapData {
  id: string;
  name: string;
  trackType?: TrackType;            // 'races' (default) | 'battler'
  hideFinishZone?: boolean;         // True when finish zone is disabled (e.g. Battleground)
  battlerConfig?: BattlerConfig;    // Battler survival / weapon spawn / sub-mode configuration
  corridors: CorridorRect[];
  finishZone: CorridorRect;
  baySpawns: BaySpawn[];
  gates: GateConfig[];
  pickups: PickupConfig[];
  waypoints: Waypoint[];
  barriers?: BarrierConfig[]; // Static and moving barriers with varied trajectories
  wallTriggerMode?: WallTriggerMode; // How moving wall is triggered: 'gate_destroy' (default) | 'immediate' | 'timer' | 'off'
  wallTriggerTimer?: number;        // Countdown seconds if mode is 'timer' (e.g. 5s)
  cameraConfig?: CameraConfig;      // In-game camera configuration
  layoutConfig?: SimulationLayoutConfig; // Simulation Scene layout & viewport configuration
}

export interface TeamLiveStats {
  team: TeamConfig;
  maxProgress: number;
  anyAlive: boolean;
  aliveCount: number;
  hp: number;
  maxHp: number;
  weapon?: WeaponType | null;
  weaponAmmo?: number;
  weaponMaxAmmo?: number;
  kills?: number;
  battleAlliance?: 'A' | 'B' | 'boss';
}


