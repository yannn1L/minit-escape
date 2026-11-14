import type { TeamConfig, BarrierMovement, WeaponType } from '../../types/game';

/**
 * Pure ECS Components (Data-only structs)
 */

export interface TransformComponent {
  x: number;
  y: number;
}

export interface VelocityComponent {
  vx: number;
  vy: number;
}

export interface ColliderComponent {
  size: number;
}

export interface RacerStateComponent {
  team: TeamConfig;
  alive: boolean;
  hp: number;
  maxHp: number;
  progress: number;
  weapon: WeaponType | null;
  weaponCooldown: number;
  weaponAmmo: number;
  weaponMaxAmmo: number;
  muzzleFlashTimer: number;
  recoilTimer: number;
  aimAngle: number;
  hitFlashTimer: number;
  kills: number;
  battleAlliance?: 'A' | 'B' | 'boss';
  shield: boolean;
  speedBoostTimer: number;
  invulnTimer: number;
  petrifiedBy: 'knife' | 'flood' | 'gun' | null;
}

export interface GateComponent {
  id: string;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: number;
  orientation: 'H' | 'V';
  triggersFlood: boolean;
  unlockTeamId?: string;
  lastHitTime: number;
  hitFlash: number;
}

export interface BarrierComponent {
  id: string;
  w: number;
  h: number;
  baseX: number;
  baseY: number;
  movement: BarrierMovement;
  speed: number;
  distance: number;
  phase: number;
  color: number;
}

export interface PickupComponent {
  strategyKey: string;
  bobPhase: number;
  spawnDelay: number;
}

export interface PaperRenderComponent {
  scaleX: number;
  scaleY: number;
  trail: Array<{ x: number; y: number }>;
}

export type ComponentMap = {
  Transform: TransformComponent;
  Velocity: VelocityComponent;
  Collider: ColliderComponent;
  RacerState: RacerStateComponent;
  Gate: GateComponent;
  Barrier: BarrierComponent;
  Pickup: PickupComponent;
  PaperRender: PaperRenderComponent;
};

export type ComponentName = keyof ComponentMap;

// Bitmask index mapping for O(1) query matching and cache invalidation
export const COMPONENT_MASK: Record<ComponentName, number> = {
  Transform: 1 << 0,
  Velocity: 1 << 1,
  Collider: 1 << 2,
  RacerState: 1 << 3,
  Gate: 1 << 4,
  Barrier: 1 << 5,
  Pickup: 1 << 6,
  PaperRender: 1 << 7,
};
