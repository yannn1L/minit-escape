import { GlobalRegistry } from './StrategyRegistry';
import type { World } from '../ecs/World';
import { Sound } from '../audio/SoundEngine';

export interface PickupStrategy {
  label: string;
  color: number;
  drawIcon(ctx: CanvasRenderingContext2D, size: number): void;
  onCollect(world: World, racerId: number, pickupId: number, sim: any): void;
}

export const CHERRY_CLONE_STRATEGY: PickupStrategy = {
  label: '+1 CLONE!',
  color: 0xff1e56,
  drawIcon(ctx: CanvasRenderingContext2D, _size: number) {
    ctx.save();
    // Stems
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.quadraticCurveTo(-2, -11, 2, -12);
    ctx.moveTo(6, 2);
    ctx.quadraticCurveTo(4, -9, 2, -12);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(5, -12, 5, 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Twin Cherries
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(-6, 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(6, 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-8, 3, 1.8, 0, Math.PI * 2);
    ctx.arc(4, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  onCollect(world: World, racerId: number, _pickupId: number, sim: any) {
    const pos = world.getComponent(racerId, 'Transform');
    const vel = world.getComponent(racerId, 'Velocity');
    const state = world.getComponent(racerId, 'RacerState');
    if (!pos || !vel || !state) return;

    const speed = Math.hypot(vel.vx, vel.vy) || 195;
    const angle = Math.atan2(vel.vy, vel.vx);

    const cloneId = sim.spawnRacer(
      state.team,
      pos.x + 4,
      pos.y + 4,
      Math.cos(angle + 0.45) * (speed / 60),
      Math.sin(angle + 0.45) * (speed / 60)
    );
    const cloneState = world.getComponent(cloneId, 'RacerState');
    if (cloneState) cloneState.invulnTimer = 0.35;

    Sound.play('cherry_clone');
    sim.spawnFloatingText(pos.x, pos.y - 12, '2X CLONE!', state.team.hex);
    sim.spawnConfetti(pos.x, pos.y, state.team.hex, 14);
  }
};

export const KNIFE_STRATEGY: PickupStrategy = {
  label: 'KNIFE!',
  color: 0xe2e8f0,
  drawIcon(ctx: CanvasRenderingContext2D, _size: number) {
    ctx.save();
    ctx.rotate(-0.55);

    // Blade
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(20, -6);
    ctx.quadraticCurveTo(18, 5, -4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Handle
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.rect(-18, -5, 14, 8);
    ctx.fill();
    ctx.stroke();

    // Handle Rivets
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-14, -1, 1.2, 0, Math.PI * 2);
    ctx.arc(-8, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
  onCollect(world: World, racerId: number, _pickupId: number, sim: any) {
    const state = world.getComponent(racerId, 'RacerState');
    const pos = world.getComponent(racerId, 'Transform');
    if (!state || !pos) return;
    state.weapon = 'knife';
    state.weaponCooldown = 0.15;
    Sound.play('knife_pickup');
    sim.spawnFloatingText(pos.x, pos.y - 14, 'ARMED!', 0xf8fafc);
  }
};

export const STAR_DASH_STRATEGY: PickupStrategy = {
  label: 'TURBO!',
  color: 0xfacc15,
  drawIcon(ctx: CanvasRenderingContext2D, _size: number) {
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 11 : 5.5;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
  onCollect(world: World, racerId: number, _pickupId: number, sim: any) {
    const state = world.getComponent(racerId, 'RacerState');
    const pos = world.getComponent(racerId, 'Transform');
    if (!state || !pos) return;
    state.speedBoostTimer = 4.5;
    Sound.play('cherry_clone');
    sim.spawnFloatingText(pos.x, pos.y - 14, 'SPEED UP!', 0xfacc15);
    sim.spawnConfetti(pos.x, pos.y, 0xfacc15, 14);
  }
};

export const SHIELD_STRATEGY: PickupStrategy = {
  label: 'SHIELD!',
  color: 0x38bdf8,
  drawIcon(ctx: CanvasRenderingContext2D, _size: number) {
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(10, -6);
    ctx.lineTo(8, 5);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 5);
    ctx.lineTo(-10, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
  onCollect(world: World, racerId: number, _pickupId: number, sim: any) {
    const state = world.getComponent(racerId, 'RacerState');
    const pos = world.getComponent(racerId, 'Transform');
    if (!state || !pos) return;
    state.shield = true;
    Sound.play('cherry_clone');
    sim.spawnFloatingText(pos.x, pos.y - 14, 'SHIELDED!', 0x38bdf8);
  }
};

export interface FirearmSpec {
  label: string;
  shortLabel: string;
  cooldown: number;
  damage: number;
  range: number;
  bulletSpeed: number;
  spread: number;
  ammo: number;
  color: number;
  css: string;
  barrelLen: number;
}

export const WEAPON_SPECS: Record<'uzi' | 'ump' | 'ak' | 'mini14' | 'scar', FirearmSpec> = {
  uzi: {
    label: 'UZI SMG!',
    shortLabel: 'UZI',
    cooldown: 0.11,
    damage: 1.4,
    range: 185,
    bulletSpeed: 460,
    spread: 0.17,
    ammo: 16,
    color: 0xf97316,
    css: '#f97316',
    barrelLen: 12,
  },
  ump: {
    label: 'UMP-45!',
    shortLabel: 'UMP',
    cooldown: 0.17,
    damage: 2.1,
    range: 230,
    bulletSpeed: 500,
    spread: 0.09,
    ammo: 12,
    color: 0x38bdf8,
    css: '#38bdf8',
    barrelLen: 14,
  },
  ak: {
    label: 'AK-47!',
    shortLabel: 'AK',
    cooldown: 0.23,
    damage: 3.3,
    range: 280,
    bulletSpeed: 550,
    spread: 0.08,
    ammo: 10,
    color: 0xef4444,
    css: '#ef4444',
    barrelLen: 17,
  },
  mini14: {
    label: 'MINI 14!',
    shortLabel: 'MINI14',
    cooldown: 0.34,
    damage: 5.1,
    range: 360,
    bulletSpeed: 680,
    spread: 0.02,
    ammo: 7,
    color: 0x22c55e,
    css: '#22c55e',
    barrelLen: 19,
  },
  scar: {
    label: 'SCAR-L!',
    shortLabel: 'SCAR',
    cooldown: 0.20,
    damage: 3.6,
    range: 300,
    bulletSpeed: 590,
    spread: 0.04,
    ammo: 10,
    color: 0xfacc15,
    css: '#facc15',
    barrelLen: 17,
  },
};

export function drawFirearmShape(
  ctx: CanvasRenderingContext2D,
  weapon: 'uzi' | 'ump' | 'ak' | 'mini14' | 'scar',
  scale = 1.0
): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;

  if (weapon === 'uzi') {
    // Compact T-shape Micro SMG
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -3.5, 11, 5);
    ctx.strokeRect(-6, -3.5, 11, 5);
    // Orange receiver accent
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-4, -2.5, 6, 3);
    // Grip + Extended mag in grip
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-2.5, 1.5, 4, 6.5);
    ctx.strokeRect(-2.5, 1.5, 4, 6.5);
    // Stubby barrel
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(5, -2.2, 4, 2.5);
    ctx.strokeRect(5, -2.2, 4, 2.5);
  } else if (weapon === 'ump') {
    // Tactical SMG with stock & forward mag
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-9, -2.5, 4, 3.5); // stock
    ctx.strokeRect(-9, -2.5, 4, 3.5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-5, -3.5, 11, 5); // receiver
    ctx.strokeRect(-5, -3.5, 11, 5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(1, 1.5, 3, 6); // straight mag
    ctx.fillRect(6, -2.2, 4.5, 2.5); // suppressor barrel
    ctx.strokeRect(6, -2.2, 4.5, 2.5);
  } else if (weapon === 'ak') {
    // Classic wooden stock + curved mag + long barrel
    ctx.fillStyle = '#b45309'; // wood stock
    ctx.fillRect(-10, -2.5, 5, 4);
    ctx.strokeRect(-10, -2.5, 5, 4);
    ctx.fillStyle = '#334155'; // receiver
    ctx.fillRect(-5, -3.5, 10, 4.8);
    ctx.strokeRect(-5, -3.5, 10, 4.8);
    ctx.fillStyle = '#ef4444'; // banana mag
    ctx.beginPath();
    ctx.moveTo(0, 1.3);
    ctx.lineTo(3.5, 1.3);
    ctx.lineTo(5.5, 7);
    ctx.lineTo(2, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b45309'; // handguard
    ctx.fillRect(5, -3, 4, 3.5);
    ctx.strokeRect(5, -3, 4, 3.5);
    ctx.fillStyle = '#64748b'; // barrel
    ctx.fillRect(9, -2.2, 4.5, 2);
    ctx.strokeRect(9, -2.2, 4.5, 2);
  } else if (weapon === 'mini14') {
    // Long sniper/DMR rifle with optic scope
    ctx.fillStyle = '#15803d'; // tactical green stock & body
    ctx.fillRect(-10, -2.5, 16, 4.2);
    ctx.strokeRect(-10, -2.5, 16, 4.2);
    // Scope on top
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -5.5, 7, 2.6);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(2, -5.2, 1.5, 2);
    // Long precision barrel
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(6, -1.8, 7, 2);
    ctx.strokeRect(6, -1.8, 7, 2);
  } else {
    // SCAR: Heavy tan/gold battle rifle
    ctx.fillStyle = '#eab308'; // desert gold receiver & stock
    ctx.fillRect(-10, -3.5, 15, 5.2);
    ctx.strokeRect(-10, -3.5, 15, 5.2);
    // Upper rail
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-5, -5, 9, 1.5);
    // Heavy straight mag
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 1.7, 3.8, 5.5);
    ctx.strokeRect(0, 1.7, 3.8, 5.5);
    // Barrel
    ctx.fillStyle = '#334155';
    ctx.fillRect(5, -2.2, 6, 2.4);
    ctx.strokeRect(5, -2.2, 6, 2.4);
  }

  ctx.restore();
}

function createFirearmStrategy(weaponKey: 'uzi' | 'ump' | 'ak' | 'mini14' | 'scar'): PickupStrategy {
  const spec = WEAPON_SPECS[weaponKey];
  return {
    label: spec.label,
    color: spec.color,
    drawIcon(ctx: CanvasRenderingContext2D, _size: number) {
      ctx.save();
      ctx.rotate(-0.35);
      drawFirearmShape(ctx, weaponKey, 0.95);
      ctx.restore();
    },
    onCollect(world: World, racerId: number, _pickupId: number, sim: any) {
      const state = world.getComponent(racerId, 'RacerState');
      const pos = world.getComponent(racerId, 'Transform');
      if (!state || !pos) return;
      state.weapon = weaponKey;
      state.weaponAmmo = spec.ammo;
      state.weaponMaxAmmo = spec.ammo;
      state.weaponCooldown = 0.08;
      state.muzzleFlashTimer = 0;
      state.recoilTimer = 0;
      Sound.play('gun_pickup');
      sim.spawnFloatingText(pos.x, pos.y - 14, `${spec.shortLabel} (${spec.ammo})`, spec.color);
      sim.spawnConfetti(pos.x, pos.y, spec.color, 8);
      sim.notifyStatsChanged(true);
    },
  };
}

export const UZI_STRATEGY = createFirearmStrategy('uzi');
export const UMP_STRATEGY = createFirearmStrategy('ump');
export const AK_STRATEGY = createFirearmStrategy('ak');
export const MINI14_STRATEGY = createFirearmStrategy('mini14');
export const SCAR_STRATEGY = createFirearmStrategy('scar');

// Register Pickup Strategies
GlobalRegistry.register('pickup', 'cherry_clone', CHERRY_CLONE_STRATEGY);
GlobalRegistry.register('pickup', 'knife', KNIFE_STRATEGY);
GlobalRegistry.register('pickup', 'star_dash', STAR_DASH_STRATEGY);
GlobalRegistry.register('pickup', 'shield', SHIELD_STRATEGY);
GlobalRegistry.register('pickup', 'uzi', UZI_STRATEGY);
GlobalRegistry.register('pickup', 'ump', UMP_STRATEGY);
GlobalRegistry.register('pickup', 'ak', AK_STRATEGY);
GlobalRegistry.register('pickup', 'mini14', MINI14_STRATEGY);
GlobalRegistry.register('pickup', 'scar', SCAR_STRATEGY);

