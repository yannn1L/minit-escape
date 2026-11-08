/**
 * Common Game Types, Constants, and Interfaces
 */

export interface TeamConfig {
  id: string;
  name: string;
  hex: number;
  css: string;
  speed: number;       // Base speed factor (default ~3.25)
  elasticity: number;  // Bounce bounciness factor (default 1.0)
  shape?: 'square' | 'rounded' | 'circle';
  enabled?: boolean;   // Whether player selected this racer for the race
}

export const DEFAULT_TEAMS: TeamConfig[] = [
  { id: 'cyan',    name: 'CYAN',    hex: 0x22d3ee, css: '#22d3ee', speed: 3.25, elasticity: 1.0 },
  { id: 'red',     name: 'RED',     hex: 0xff1e1e, css: '#ff1e1e', speed: 3.25, elasticity: 1.0 },
  { id: 'yellow',  name: 'YELLOW',  hex: 0xfacc15, css: '#facc15', speed: 3.25, elasticity: 1.0 },
  { id: 'green',   name: 'GREEN',   hex: 0x22c55e, css: '#22c55e', speed: 3.25, elasticity: 1.0 },
  { id: 'magenta', name: 'PINK',    hex: 0xff1493, css: '#ff1493', speed: 3.25, elasticity: 1.0 },
  { id: 'blue',    name: 'BLUE',    hex: 0x1d4ed8, css: '#1d4ed8', speed: 3.25, elasticity: 1.0 },
  { id: 'orange',  name: 'ORANGE',  hex: 0xf97316, css: '#f97316', speed: 3.25, elasticity: 1.0 },
  { id: 'purple',  name: 'PURPLE',  hex: 0x9333ea, css: '#9333ea', speed: 3.25, elasticity: 1.0 }
];

export type MovingWallDirection = 'up' | 'down' | 'left' | 'right';

export interface CorridorRect {
  x: number;
  y: number;
  w: number;
  h: number;
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

export type WallTriggerMode = 'gate_destroy' | 'immediate' | 'timer';

export type CameraType = 'auto_moving' | 'selected_racer' | 'manual';

export interface CameraConfig {
  type: CameraType;
  defaultZoom: number;      // Default zoom scale (e.g. 1.0)
  minZoom: number;          // Minimum zoom scale (e.g. 0.4)
  maxZoom: number;          // Maximum zoom scale (e.g. 2.5)
  smoothSpeed: number;      // Lerp smoothing factor (e.g. 4.5)
  targetRacerId?: string;   // 'leader' or specific team id (e.g. 'cyan', 'red', etc.)
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  type: 'auto_moving',
  defaultZoom: 1.0,
  minZoom: 0.4,
  maxZoom: 2.5,
  smoothSpeed: 4.5,
  targetRacerId: 'leader',
};

export type ViewportAspectRatio = '1:1' | '16:9' | '4:3' | 'auto';

export interface SimulationLayoutConfig {
  aspectRatio: ViewportAspectRatio;           // '1:1' | '16:9' | '4:3' | 'auto'
  showTitle: boolean;                         // Whether to display the title badge
  customTitle: string;                        // Title text (default 'Minit Escape!')
  titlePosition: 'left' | 'center' | 'right'; // Alignment in top bar
  showTimer: boolean;                         // Whether to display the live timer
  timerPosition: 'left' | 'right';            // Position of timer in header
  showRacersList: boolean;                    // Whether to display the racers leaderboard bar
  racersListPosition: 'bottom' | 'top';       // Above or below the arena canvas
  racersListStyle: 'detailed' | 'compact';    // Card density style
  racersListColumns: 'auto' | '8' | '4';      // Grid column mode
  arenaTheme: 'classic_blue' | 'midnight' | 'emerald' | 'sunset' | 'violet';
  arenaPadding: 'compact' | 'normal' | 'spacious';
}

export const DEFAULT_LAYOUT_CONFIG: SimulationLayoutConfig = {
  aspectRatio: '4:3',
  showTitle: true,
  customTitle: 'Minit Escape!',
  titlePosition: 'center',
  showTimer: true,
  timerPosition: 'left',
  showRacersList: true,
  racersListPosition: 'bottom',
  racersListStyle: 'detailed',
  racersListColumns: 'auto',
  arenaTheme: 'classic_blue',
  arenaPadding: 'normal',
};

export interface MapData {
  id: string;
  name: string;
  corridors: CorridorRect[];
  finishZone: CorridorRect;
  baySpawns: BaySpawn[];
  gates: GateConfig[];
  pickups: PickupConfig[];
  waypoints: Waypoint[];
  barriers?: BarrierConfig[]; // Static and moving barriers with varied trajectories
  wallTriggerMode?: WallTriggerMode; // How moving wall is triggered: 'gate_destroy' (default) | 'immediate' | 'timer'
  wallTriggerTimer?: number;        // Countdown seconds if mode is 'timer' (e.g. 5s)
  cameraConfig?: CameraConfig;      // In-game camera configuration
  layoutConfig?: SimulationLayoutConfig; // Simulation Scene layout & viewport configuration
}

export interface TeamLiveStats {
  team: TeamConfig;
  maxProgress: number;
  anyAlive: boolean;
  aliveCount: number;
}


