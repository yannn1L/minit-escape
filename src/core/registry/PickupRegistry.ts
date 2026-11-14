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

export function drawKnifeShape(ctx: CanvasRenderingContext2D, scale = 1.0): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Pommel Cap at rear of handle
  ctx.fillStyle = '#94a3b8';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-11.5, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Ergonomic Tactical Grip
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(-11, -2.5, 8.5, 5, 1.5);
  ctx.fill();
  ctx.stroke();

  // Grip Rivets (Golden brass pins)
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(-8.5, 0, 0.95, 0, Math.PI * 2);
  ctx.arc(-5.2, 0, 0.95, 0, Math.PI * 2);
  ctx.fill();

  // 3. Crossguard / Bolster
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(-3, -4.8, 2.4, 9.6, 1);
  ctx.fill();
  ctx.stroke();

  // 4. Main Combat Blade (Dual-tone bevelled steel)
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-0.6, -3.6);
  ctx.lineTo(10.5, -2.2);
  ctx.lineTo(15.5, 0.4);
  ctx.quadraticCurveTo(9.5, 4.2, -0.6, 3.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Upper Brushed Steel Spine Bevel
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(0, -3.0);
  ctx.lineTo(10.2, -1.7);
  ctx.lineTo(14.2, 0.3);
  ctx.lineTo(0, 0.2);
  ctx.closePath();
  ctx.fill();

  // Blood Groove (Fuller)
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(1.5, -0.6);
  ctx.lineTo(9.2, -0.3);
  ctx.stroke();

  ctx.restore();
}

export const KNIFE_STRATEGY: PickupStrategy = {
  label: 'KNIFE!',
  color: 0xe2e8f0,
  drawIcon(ctx: CanvasRenderingContext2D, _size: number) {
    ctx.save();
    ctx.rotate(-0.55);
    drawKnifeShape(ctx, 0.82);
    ctx.restore();
  },
  onCollect(world: World, racerId: number, pickupId: number, sim: any) {
    const state = world.getComponent(racerId, 'RacerState');
    const pos = world.getComponent(racerId, 'Transform');
    const pickup = world.getComponent(pickupId, 'Pickup');
    if (!state || !pos) return;
    const dmgMult = Math.max(0.1, pickup?.damageMultiplier ?? 1.0);
    state.weapon = 'knife';
    state.weaponDamageMultiplier = dmgMult;
    state.weaponCooldown = 0.15;
    Sound.play('knife_pickup');
    const multTag = dmgMult !== 1 ? ` x${dmgMult}` : '';
    sim.spawnFloatingText(pos.x, pos.y - 14, `KNIFE${multTag}!`, 0xf8fafc);
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
  displayName: string;
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
    displayName: 'UZI',
    cooldown: 0.11,
    damage: 1.4,
    range: 185,
    bulletSpeed: 460,
    spread: 0.17,
    ammo: 16,
    color: 0xf97316,
    css: '#f97316',
    barrelLen: 10.5,
  },
  ump: {
    label: 'UMP-45!',
    shortLabel: 'UMP',
    displayName: 'UMP-45',
    cooldown: 0.17,
    damage: 2.1,
    range: 230,
    bulletSpeed: 500,
    spread: 0.09,
    ammo: 12,
    color: 0x38bdf8,
    css: '#38bdf8',
    barrelLen: 12,
  },
  ak: {
    label: 'AK-47!',
    shortLabel: 'AK',
    displayName: 'AK-47',
    cooldown: 0.23,
    damage: 3.3,
    range: 280,
    bulletSpeed: 550,
    spread: 0.08,
    ammo: 10,
    color: 0xef4444,
    css: '#ef4444',
    barrelLen: 14.5,
  },
  mini14: {
    label: 'MINI 14!',
    shortLabel: 'MINI14',
    displayName: 'MINI 14',
    cooldown: 0.34,
    damage: 5.1,
    range: 360,
    bulletSpeed: 680,
    spread: 0.02,
    ammo: 7,
    color: 0x22c55e,
    css: '#22c55e',
    barrelLen: 15.5,
  },
  scar: {
    label: 'SCAR-L!',
    shortLabel: 'SCAR',
    displayName: 'SCAR-L',
    cooldown: 0.20,
    damage: 3.6,
    range: 300,
    bulletSpeed: 590,
    spread: 0.04,
    ammo: 10,
    color: 0xfacc15,
    css: '#facc15',
    barrelLen: 13.5,
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
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';

  if (weapon === 'uzi') {
    // 1. Central Pistol Grip & Extended Protruding Magazine
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2.2, 1.2, 3.4, 7.6);
    ctx.strokeRect(-2.2, 1.2, 3.4, 7.6);
    // Orange magazine floorplate
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-2.4, 7.6, 3.8, 1.4);

    // 2. Boxy Stamped Steel Receiver
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6.5, -3.6, 11.8, 5.2);
    ctx.strokeRect(-6.5, -3.6, 11.8, 5.2);

    // 3. Folded Top Wireframe Stock & Tactical Orange Cover
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-5.2, -3.2, 8.8, 2.4);
    // Ejection port cutout
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1.5, -2.8, 3.2, 1.4);

    // Front & Rear Sight Ears
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-5.8, -4.8, 1.6, 1.3);
    ctx.fillRect(3.2, -4.8, 1.5, 1.3);

    // 4. Threaded Barrel Nut & Short Protruding Barrel
    ctx.fillStyle = '#475569';
    ctx.fillRect(5.3, -2.8, 1.8, 3.4);
    ctx.strokeRect(5.3, -2.8, 1.8, 3.4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(7.1, -2.1, 3.2, 2.0);
    ctx.strokeRect(7.1, -2.1, 3.2, 2.0);
  } else if (weapon === 'ump') {
    // 1. Skeletonized Folding Polymer Rear Stock
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-10.5, -3.2);
    ctx.lineTo(-5.2, -3.0);
    ctx.lineTo(-5.2, 1.0);
    ctx.lineTo(-10.5, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rear Pistol Grip & Forward Vertical Grip
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4.8, 1.2, 2.8, 4.6);
    ctx.strokeRect(-4.8, 1.2, 2.8, 4.6);
    ctx.fillRect(3.8, 1.2, 1.8, 3.8);

    // 2. Straight .45 ACP Box Magazine
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0.2, 1.2, 2.8, 6.8);
    ctx.strokeRect(0.2, 1.2, 2.8, 6.8);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0.2, 5.2, 2.8, 1.2);

    // 3. Tactical Sky-Blue Polymer Upper Receiver
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-5.4, -3.8, 11.8, 5.2);
    ctx.strokeRect(-5.4, -3.8, 11.8, 5.2);
    // Ejection port & top Picatinny rail
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1.8, -2.4, 3.4, 1.5);
    ctx.fillRect(-4.2, -4.6, 8.8, 0.9);

    // 4. Heavy Barrel & Suppressor Shroud
    ctx.fillStyle = '#475569';
    ctx.fillRect(6.4, -2.5, 5.2, 2.8);
    ctx.strokeRect(6.4, -2.5, 5.2, 2.8);
  } else if (weapon === 'ak') {
    // 1. Angled Warm Wooden Buttstock & Pistol Grip
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(-11.5, -1.8);
    ctx.lineTo(-5.2, -3.0);
    ctx.lineTo(-5.2, 0.8);
    ctx.lineTo(-11.5, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Wooden pistol grip
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-4.8, 1.0, 2.6, 4.4);
    ctx.strokeRect(-4.8, 1.0, 2.6, 4.4);

    // 2. Curved Crimson/Bakelite 30-Round "Banana" Magazine
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-0.2, 1.0);
    ctx.lineTo(3.2, 1.0);
    ctx.quadraticCurveTo(4.2, 4.8, 5.8, 7.6);
    ctx.lineTo(2.4, 8.2);
    ctx.quadraticCurveTo(0.8, 5.0, -0.2, 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Stamped Dark Steel Receiver & Silver Bolt Carrier
    ctx.fillStyle = '#334155';
    ctx.fillRect(-5.4, -3.5, 9.8, 4.8);
    ctx.strokeRect(-5.4, -3.5, 9.8, 4.8);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-1.2, -2.4, 3.2, 1.3);

    // 4. Wooden Handguard & Gas Tube
    ctx.fillStyle = '#d97706';
    ctx.fillRect(4.4, -3.2, 4.8, 3.8);
    ctx.strokeRect(4.4, -3.2, 4.8, 3.8);

    // 5. Steel Barrel, Front Sight Post & Slant Muzzle Brake
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(9.2, -2.2, 5.0, 2.0);
    ctx.strokeRect(9.2, -2.2, 5.0, 2.0);
    // Triangle front sight post
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(11.5, -2.2);
    ctx.lineTo(12.4, -4.4);
    ctx.lineTo(13.2, -2.2);
    ctx.closePath();
    ctx.fill();
  } else if (weapon === 'mini14') {
    // 1. Short Box Magazine
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-0.5, 1.2, 3.2, 4.4);
    ctx.strokeRect(-0.5, 1.2, 3.2, 4.4);

    // 2. Full-Length Tactical Emerald Rifle Chassis & Stock
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(-11.5, -2.2);
    ctx.lineTo(6.8, -2.8);
    ctx.lineTo(6.8, 1.4);
    ctx.lineTo(-4.5, 1.4);
    ctx.lineTo(-11.5, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Raised Dark Cheek Rest Pad & Steel Action
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10.2, -3.0, 4.2, 1.2);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-3.2, -2.6, 5.0, 1.5);

    // 3. Dual-Ring High-Powered Telescopic Scope
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3.2, -3.8, 1.2, 1.4);
    ctx.fillRect(0.6, -3.8, 1.2, 1.4);
    ctx.fillRect(-5.0, -5.8, 8.8, 2.4);
    ctx.strokeRect(-5.0, -5.8, 8.8, 2.4);
    // Glowing green objective & ocular lenses
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(2.4, -5.5, 1.3, 1.8);
    ctx.fillRect(-4.8, -5.5, 0.9, 1.8);

    // 4. Long Stainless Precision Barrel & Slotted Flash Hider
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(6.8, -2.0, 6.8, 1.9);
    ctx.strokeRect(6.8, -2.0, 6.8, 1.9);
    ctx.fillStyle = '#334155';
    ctx.fillRect(13.6, -2.3, 2.2, 2.5);
  } else {
    // SCAR-L: Heavy Desert Gold/Tan Battle Rifle
    // 1. Folding UGG Boot Stock with Black Cheek Riser & Buttpad
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-11.2, -3.2, 5.4, 4.6);
    ctx.strokeRect(-11.2, -3.2, 5.4, 4.6);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-11.6, -3.2, 1.2, 4.8);
    ctx.fillRect(-10.2, -3.6, 3.8, 1.0);

    // 2. Pistol Grip & Straight Steel STANAG Magazine
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4.6, 1.4, 2.6, 4.4);
    ctx.strokeRect(-4.6, 1.4, 2.6, 4.4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0.0, 1.4, 3.6, 6.2);
    ctx.strokeRect(0.0, 1.4, 3.6, 6.2);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-0.2, 6.6, 4.0, 1.2);

    // 3. Monolithic Desert Gold Upper Receiver
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-5.8, -3.8, 12.6, 5.4);
    ctx.strokeRect(-5.8, -3.8, 12.6, 5.4);
    // Upper receiver highlight strip & vents
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-5.2, -3.2, 11.4, 1.5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2.2, -1.6, 1.4, 1.0);
    ctx.fillRect(4.2, -1.6, 1.4, 1.0);

    // 4. Top Picatinny Rail & Holographic Sight Housing
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-5.4, -4.8, 11.6, 1.0);
    ctx.fillRect(-2.4, -6.4, 3.8, 1.8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-0.8, -6.0, 1.2, 1.0);

    // 5. Heavy Combat Barrel & Compensator
    ctx.fillStyle = '#334155';
    ctx.fillRect(6.8, -2.3, 6.2, 2.4);
    ctx.strokeRect(6.8, -2.3, 6.2, 2.4);
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
      drawFirearmShape(ctx, weaponKey, 0.92);
      ctx.restore();
    },
    onCollect(world: World, racerId: number, pickupId: number, sim: any) {
      const state = world.getComponent(racerId, 'RacerState');
      const pos = world.getComponent(racerId, 'Transform');
      const pickup = world.getComponent(pickupId, 'Pickup');
      if (!state || !pos) return;
      const dmgMult = Math.max(0.1, pickup?.damageMultiplier ?? 1.0);
      const ammoMult = Math.max(0.1, pickup?.ammoMultiplier ?? 1.0);
      const rateMult = Math.max(0.1, pickup?.fireRateMultiplier ?? 1.0);
      const finalAmmo = Math.max(1, Math.round(spec.ammo * ammoMult));

      state.weapon = weaponKey;
      state.weaponAmmo = finalAmmo;
      state.weaponMaxAmmo = finalAmmo;
      state.weaponDamageMultiplier = dmgMult;
      state.weaponFireRateMultiplier = rateMult;
      state.weaponCooldown = 0.08;
      state.muzzleFlashTimer = 0;
      state.recoilTimer = 0;
      Sound.play('gun_pickup');
      const dmgTag = dmgMult !== 1 ? ` x${dmgMult}` : '';
      sim.spawnFloatingText(pos.x, pos.y - 14, `${spec.displayName}${dmgTag} (${finalAmmo})`, spec.color);
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

