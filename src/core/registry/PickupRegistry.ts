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

// Register Pickup Strategies
GlobalRegistry.register('pickup', 'cherry_clone', CHERRY_CLONE_STRATEGY);
GlobalRegistry.register('pickup', 'knife', KNIFE_STRATEGY);
GlobalRegistry.register('pickup', 'star_dash', STAR_DASH_STRATEGY);
GlobalRegistry.register('pickup', 'shield', SHIELD_STRATEGY);
