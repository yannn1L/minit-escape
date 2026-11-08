import type { ISystem } from '../ecs/System';
import type { World } from '../ecs/World';
import type {
  TransformComponent,
  VelocityComponent,
  ColliderComponent,
  RacerStateComponent,
  PaperRenderComponent,
  GateComponent,
  BarrierComponent,
} from '../ecs/Component';
import { Geometry } from '../math/Geometry';
import { Sound } from '../audio/SoundEngine';
import type { CorridorRect } from '../../types/game';

interface RacerEntry {
  id: number;
  pos: TransformComponent;
  vel: VelocityComponent;
  col: ColliderComponent;
  state: RacerStateComponent;
  render: PaperRenderComponent;
}

interface GateEntry {
  id: number;
  pos: TransformComponent;
  gate: GateComponent;
}

interface BarrierEntry {
  id: number;
  pos: TransformComponent;
  bar: BarrierComponent;
}

const SQUEEZE_SCALES = [1.0, 0.9, 0.8, 0.75] as const;
const ORTHO_NUDGES = [0, -3, 3, -6, 6] as const;

export class PhysicsSystem implements ISystem {
  name = 'PhysicsSystem';
  private sim: any;
  private racerList: RacerEntry[] = [];
  private gateList: GateEntry[] = [];
  private barrierList: BarrierEntry[] = [];

  constructor(sim: any) {
    this.sim = sim;
  }

  update(world: World, dt: number): void {
    const racerIds = world.query('Transform', 'Velocity', 'Collider', 'RacerState', 'PaperRender');
    const gateIds = world.query('Transform', 'Gate');
    const barrierIds = world.query('Transform', 'Barrier');

    // Pre-fetch flat component references once per frame to avoid Map.get calls inside substep loops
    this.racerList.length = 0;
    for (let i = 0; i < racerIds.length; i++) {
      const id = racerIds[i];
      const state = world.getComponent(id, 'RacerState')!;
      if (!state.alive) continue;
      this.racerList.push({
        id,
        pos: world.getComponent(id, 'Transform')!,
        vel: world.getComponent(id, 'Velocity')!,
        col: world.getComponent(id, 'Collider')!,
        state,
        render: world.getComponent(id, 'PaperRender')!,
      });
    }

    this.gateList.length = 0;
    for (let i = 0; i < gateIds.length; i++) {
      const id = gateIds[i];
      const gate = world.getComponent(id, 'Gate');
      const pos = world.getComponent(id, 'Transform');
      if (gate && pos && gate.hp > 0) {
        this.gateList.push({ id, pos, gate });
      }
    }

    this.barrierList.length = 0;
    for (let i = 0; i < barrierIds.length; i++) {
      const id = barrierIds[i];
      const bar = world.getComponent(id, 'Barrier');
      const pos = world.getComponent(id, 'Transform');
      if (bar && pos) {
        this.barrierList.push({ id, pos, bar });
      }
    }

    // 8 sub-steps per frame (~0.4px movement per step) guarantees zero tunneling and 60fps on low-end devices
    const subSteps = 8;
    const stepDt = dt / subSteps;
    const corridors = this.sim.currentMap.corridors;
    const fz = this.sim.currentMap.finishZone;
    const fzCx = fz.x + fz.w / 2;
    const fzCy = fz.y + fz.h / 2;
    const rotRad = ((fz.rotation || 0) * Math.PI) / 180;
    const cosR = Math.cos(-rotRad);
    const sinR = Math.sin(-rotRad);

    for (let step = 0; step < subSteps; step++) {
      // 0A. Advance moving walls incrementally per substep
      if (this.sim.floodActive) {
        this.sim.floodDist += stepDt * 52;
        this.sim.updateFloodRects();
      }
      const activeFloods: CorridorRect[] = this.sim.floodActive ? this.sim.floodRects : [];

      // 0B. Advance moving barriers incrementally per substep
      for (let b = 0; b < this.barrierList.length; b++) {
        const { pos: bPos, bar } = this.barrierList[b];
        if (bar.movement !== 'static') {
          bar.phase += stepDt * (bar.speed / 25);
          const offset = Math.sin(bar.phase) * bar.distance;
          if (bar.movement === 'horizontal') {
            bPos.x = bar.baseX + offset;
            bPos.y = bar.baseY;
          } else if (bar.movement === 'vertical') {
            bPos.x = bar.baseX;
            bPos.y = bar.baseY + offset;
          } else if (bar.movement === 'diagonal_up') {
            bPos.x = bar.baseX + offset;
            bPos.y = bar.baseY - offset;
          } else if (bar.movement === 'diagonal_down') {
            bPos.x = bar.baseX + offset;
            bPos.y = bar.baseY + offset;
          }
        }
      }

      // 1. Update each alive racer
      for (let i = 0; i < this.racerList.length; i++) {
        const r = this.racerList[i];
        const { pos, vel, col, state, render } = r;
        if (!state.alive) continue;

        // Tick timers once per outer frame
        if (step === 0) {
          if (state.speedBoostTimer > 0) state.speedBoostTimer = Math.max(0, state.speedBoostTimer - dt);
          if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);
          if (state.weaponCooldown > 0) state.weaponCooldown = Math.max(0, state.weaponCooldown - dt);
        }

        const half = col.size / 2;
        const minHalf = half * 0.75; // 75% size threshold
        const prevX = pos.x;
        const prevY = pos.y;

        // 1A. First resolve any moving wall push from Step 0A (kills racer immediately if squeezed < 75%)
        if (activeFloods.length > 0) {
          this.handleMovingWallCollisions(world, pos, vel, col, render, state, corridors, activeFloods);
          if (!state.alive) continue;
        }

        // 1B. Resolve any moving barrier or gate overlap from Step 0B (kills racer immediately if squeezed < 75%)
        this.resolveRemainingGateAndBarrierOverlaps(
          world, activeFloods, pos, vel, col, render, state, prevX, prevY, corridors
        );
        if (!state.alive) continue;

        // 1C. Recover if 75% core drifted outside corridor bounds without jumping across obstacles
        if (!Geometry.isBoxInsideCorridors(pos.x, pos.y, minHalf, corridors)) {
          const preSnap = Geometry.snapBoxInsideCorridors(pos.x, pos.y, minHalf, corridors);
          if (
            preSnap.snapped &&
            !this.boxOverlapsAnyObstacle(preSnap.x, preSnap.y, minHalf, state) &&
            !this.boxOverlapsAnyFlood(preSnap.x, preSnap.y, minHalf, activeFloods)
          ) {
            pos.x = preSnap.x;
            pos.y = preSnap.y;
          }
        }

        // Maintain constant arcade speed
        const baseSpeed = state.team.speed || 3.25;
        const targetSpeed = (state.speedBoostTimer > 0 ? baseSpeed * 1.5 : baseSpeed) * 60;
        const curSpeed = Math.hypot(vel.vx, vel.vy) || 1;
        vel.vx = (vel.vx / curSpeed) * targetSpeed;
        vel.vy = (vel.vy / curSpeed) * targetSpeed;

        // Avoid shallow axial loops
        if (Math.abs(vel.vx) < 32) vel.vx = (vel.vx >= 0 ? 1 : -1) * 40;
        if (Math.abs(vel.vy) < 32) vel.vy = (vel.vy >= 0 ? 1 : -1) * 40;

        // Use full half-size when uncompressed, or 75% minHalf when legitimately squeezed between 75%..99%
        const isCurrentlyCompressed =
          !Geometry.isBoxInsideCorridors(pos.x, pos.y, half, corridors) ||
          this.boxOverlapsAnyObstacle(pos.x, pos.y, half, state) ||
          (activeFloods.length > 0 && this.boxOverlapsAnyFlood(pos.x, pos.y, half, activeFloods));
        const sweepHalf = isCurrentlyCompressed ? minHalf : half;

        let hitXWall = false;
        let hitYWall = false;

        // --- X AXIS MOVEMENT & SWEEP ---
        const nextX = pos.x + vel.vx * stepDt;
        const hitCorridorX = !Geometry.isBoxInsideCorridors(nextX, pos.y, sweepHalf, corridors);
        const hitGateX = !hitCorridorX && this.checkGateSweep(world, nextX, pos.y, sweepHalf, state);
        const hitBarX = !hitCorridorX && !hitGateX && this.checkBarrierSweep(nextX, pos.y, sweepHalf);
        const hitFloodX =
          !hitCorridorX && !hitGateX && !hitBarX && activeFloods.length > 0 &&
          this.boxOverlapsAnyFlood(nextX, pos.y, sweepHalf, activeFloods);

        if (hitCorridorX || hitGateX || hitBarX || hitFloodX) {
          vel.vx = -vel.vx;
          hitXWall = true;
          this.triggerBounce(render, true, false);
          if (hitBarX) Sound.playBounceNote(0.9);
        } else {
          pos.x = nextX;
        }

        // --- Y AXIS MOVEMENT & SWEEP ---
        const nextY = pos.y + vel.vy * stepDt;
        const hitCorridorY = !Geometry.isBoxInsideCorridors(pos.x, nextY, sweepHalf, corridors);
        const hitGateY = !hitCorridorY && this.checkGateSweep(world, pos.x, nextY, sweepHalf, state);
        const hitBarY = !hitCorridorY && !hitGateY && this.checkBarrierSweep(pos.x, nextY, sweepHalf);
        const hitFloodY =
          !hitCorridorY && !hitGateY && !hitBarY && activeFloods.length > 0 &&
          this.boxOverlapsAnyFlood(pos.x, nextY, sweepHalf, activeFloods);

        if (hitCorridorY || hitGateY || hitBarY || hitFloodY) {
          vel.vy = -vel.vy;
          hitYWall = true;
          this.triggerBounce(render, false, true);
          if (hitBarY) Sound.playBounceNote(0.9);
        } else {
          pos.y = nextY;
        }

        // Corner-trap deflection: if both X and Y were blocked in the same substep, deflect angle slightly
        if (hitXWall && hitYWall) {
          const angle = Math.atan2(vel.vy, vel.vx) + 0.22;
          const spd = Math.hypot(vel.vx, vel.vy) || targetSpeed;
          vel.vx = Math.cos(angle) * spd;
          vel.vy = Math.sin(angle) * spd;
        }

        // Check Finish Line Alcove (supports any rotation angle)
        const relX = pos.x - fzCx;
        const relY = pos.y - fzCy;
        const localX = fzCx + relX * cosR - relY * sinR;
        const localY = fzCy + relX * sinR + relY * cosR;
        if (Geometry.aabbOverlap(localX - half - 2, localY - half - 2, col.size + 4, col.size + 4, fz.x, fz.y, fz.w, fz.h)) {
          state.progress = 100;
          if (!this.sim.winnerDeclared) {
            this.sim.declareWinner(state.team);
          }
        }
      }

      // 2. Elastic Racer-to-Racer Collisions & Combat
      // IMPORTANT: Only ALIVE racers collide, and racer-to-racer collisions NEVER push a racer into
      // a moving wall, gate, barrier, or corridor wall (so racers can NEVER die pinched because of other racers).
      for (let i = 0; i < this.racerList.length; i++) {
        const rA = this.racerList[i];
        if (!rA.state.alive) continue;

        for (let j = i + 1; j < this.racerList.length; j++) {
          const rB = this.racerList[j];
          if (!rB.state.alive) continue;

          const pA = rA.pos;
          const pB = rB.pos;
          const minDist = (rA.col.size + rB.col.size) * 0.48;
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;

          if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) {
            this.handleCombatContact(world, rA.id, rB.id, rA.state, rB.state, pA, pB);
            if (!rA.state.alive || !rB.state.alive) continue;

            const vA = rA.vel;
            const vB = rB.vel;
            const overlapX = minDist - Math.abs(dx);
            const overlapY = minDist - Math.abs(dy);
            const checkHalfA = (rA.col.size / 2) * 0.85;
            const checkHalfB = (rB.col.size / 2) * 0.85;

            if (overlapX < overlapY) {
              const sign = dx >= 0 ? 1 : -1;
              const nAx = pA.x - sign * overlapX * 0.5;
              const nBx = pB.x + sign * overlapX * 0.5;
              const canMoveA = this.isPositionClear(nAx, pA.y, checkHalfA, corridors, activeFloods, rA.state);
              const canMoveB = this.isPositionClear(nBx, pB.y, checkHalfB, corridors, activeFloods, rB.state);

              if (canMoveA && canMoveB) {
                pA.x = nAx;
                pB.x = nBx;
                const tmp = vA.vx;
                vA.vx = vB.vx;
                vB.vx = tmp;
              } else if (canMoveA && !canMoveB) {
                const fullAx = pA.x - sign * overlapX;
                if (this.isPositionClear(fullAx, pA.y, checkHalfA, corridors, activeFloods, rA.state)) {
                  pA.x = fullAx;
                } else {
                  pA.x = nAx;
                }
                vA.vx = -sign * Math.abs(vA.vx);
              } else if (!canMoveA && canMoveB) {
                const fullBx = pB.x + sign * overlapX;
                if (this.isPositionClear(fullBx, pB.y, checkHalfB, corridors, activeFloods, rB.state)) {
                  pB.x = fullBx;
                } else {
                  pB.x = nBx;
                }
                vB.vx = sign * Math.abs(vB.vx);
              }
              this.triggerBounce(rA.render, true, false, 0.7);
              this.triggerBounce(rB.render, true, false, 0.7);
            } else {
              const sign = dy >= 0 ? 1 : -1;
              const nAy = pA.y - sign * overlapY * 0.5;
              const nBy = pB.y + sign * overlapY * 0.5;
              const canMoveA = this.isPositionClear(pA.x, nAy, checkHalfA, corridors, activeFloods, rA.state);
              const canMoveB = this.isPositionClear(pB.x, nBy, checkHalfB, corridors, activeFloods, rB.state);

              if (canMoveA && canMoveB) {
                pA.y = nAy;
                pB.y = nBy;
                const tmp = vA.vy;
                vA.vy = vB.vy;
                vB.vy = tmp;
              } else if (canMoveA && !canMoveB) {
                const fullAy = pA.y - sign * overlapY;
                if (this.isPositionClear(pA.x, fullAy, checkHalfA, corridors, activeFloods, rA.state)) {
                  pA.y = fullAy;
                } else {
                  pA.y = nAy;
                }
                vA.vy = -sign * Math.abs(vA.vy);
              } else if (!canMoveA && canMoveB) {
                const fullBy = pB.y + sign * overlapY;
                if (this.isPositionClear(pB.x, fullBy, checkHalfB, corridors, activeFloods, rB.state)) {
                  pB.y = fullBy;
                } else {
                  pB.y = nBy;
                }
                vB.vy = sign * Math.abs(vB.vy);
              }
              this.triggerBounce(rA.render, false, true, 0.7);
              this.triggerBounce(rB.render, false, true, 0.7);
            }
          }
        }
      }
    }
  }

  private isPositionClear(
    cx: number,
    cy: number,
    half: number,
    corridors: CorridorRect[],
    floodRects: CorridorRect[],
    state: RacerStateComponent
  ): boolean {
    return (
      Geometry.isBoxInsideCorridors(cx, cy, half, corridors) &&
      !this.boxOverlapsAnyObstacle(cx, cy, half, state) &&
      !this.boxOverlapsAnyFlood(cx, cy, half, floodRects)
    );
  }

  /**
   * Immediately eliminates a racer that is squeezed into < 75% of its size by a moving wall or moving barrier.
   */
  private crushRacer(pos: TransformComponent, state: RacerStateComponent, label = 'SQUEEZED!'): void {
    if (!state.alive) return;
    state.alive = false;
    state.petrifiedBy = 'flood';
    Sound.play('knife_kill');
    this.sim.spawnInkSplatter(pos.x, pos.y, state.team.hex);
    this.sim.spawnConfetti(pos.x, pos.y, 0x06f9f9, 20);
    this.sim.spawnFloatingText(pos.x, pos.y - 14, label, 0x06f9f9);
    this.sim.triggerHitStop(0.045);
    this.sim.addScreenShake(8.5);
  }

  /**
   * Swept check against all active gates when testing a proposed (testX, testY) position.
   * Applies gate damage/unlock immediately and returns true if blocked.
   */
  private checkGateSweep(
    world: World,
    testX: number,
    testY: number,
    half: number,
    state: RacerStateComponent
  ): boolean {
    const size = half * 2;
    let blocked = false;

    for (let g = 0; g < this.gateList.length; g++) {
      const entry = this.gateList[g];
      const { id: gId, pos: gPos, gate } = entry;
      if (gate.hp <= 0) continue;

      if (Geometry.aabbOverlap(testX - half, testY - half, size, size, gPos.x, gPos.y, gate.w, gate.h)) {
        const isKeyholder = gate.unlockTeamId && gate.unlockTeamId === state.team.id;
        const cx = gPos.x + gate.w / 2;
        const cy = gPos.y + gate.h / 2;

        if (isKeyholder) {
          gate.hp = 0;
          Sound.play('gate_break');
          this.sim.spawnConfetti(cx, cy, state.team.hex, 20);
          this.sim.spawnFloatingText(cx, cy, `${state.team.name} UNLOCKED!`, state.team.hex);
          this.sim.addScreenShake(5);
          if (gate.triggersFlood) {
            this.sim.floodActive = true;
            this.sim.spawnFloatingText(cx, cy, 'MOVING WALL ACTIVATED!', 0x06f9f9);
          }
          world.destroyEntity(gId);
          continue;
        }

        // Damage gate with hit cooldown
        const now = performance.now();
        if (now - gate.lastHitTime > 65) {
          gate.lastHitTime = now;
          gate.hp--;
          gate.hitFlash = 1.0;
          this.sim.spawnConfetti(testX, testY, gate.color, 3);

          if (gate.hp <= 0) {
            Sound.play('gate_break');
            this.sim.spawnConfetti(cx, cy, gate.color, 18);
            this.sim.addScreenShake(5.5);
            if (gate.triggersFlood) {
              this.sim.floodActive = true;
              this.sim.spawnFloatingText(cx, cy, 'MOVING WALL ACTIVATED!', 0x06f9f9);
            }
            world.destroyEntity(gId);
            continue;
          }
        }

        blocked = true;
      }
    }

    return blocked;
  }

  /**
   * Swept check against all barriers when testing a proposed (testX, testY) position.
   */
  private checkBarrierSweep(testX: number, testY: number, half: number): boolean {
    const size = half * 2;
    for (let b = 0; b < this.barrierList.length; b++) {
      const { pos: bPos, bar } = this.barrierList[b];
      if (Geometry.aabbOverlap(testX - half, testY - half, size, size, bPos.x, bPos.y, bar.w, bar.h)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a box at (cx, cy) overlaps any active gate or barrier (used during pushes).
   */
  private boxOverlapsAnyObstacle(
    cx: number,
    cy: number,
    half: number,
    state?: RacerStateComponent
  ): boolean {
    const size = half * 2;
    for (let g = 0; g < this.gateList.length; g++) {
      const { pos: gPos, gate } = this.gateList[g];
      if (gate.hp > 0) {
        if (state && gate.unlockTeamId && gate.unlockTeamId === state.team.id) continue;
        if (Geometry.aabbOverlap(cx - half, cy - half, size, size, gPos.x, gPos.y, gate.w, gate.h)) {
          return true;
        }
      }
    }
    for (let b = 0; b < this.barrierList.length; b++) {
      const { pos: bPos, bar } = this.barrierList[b];
      if (Geometry.aabbOverlap(cx - half, cy - half, size, size, bPos.x, bPos.y, bar.w, bar.h)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolves overlap when a moving barrier sweeps onto a racer.
   * Never blinks across an obstacle: if there is no room >= 75% of racer size, the racer immediately dies.
   */
  private resolveRemainingGateAndBarrierOverlaps(
    _world: World,
    floodRects: CorridorRect[],
    pos: TransformComponent,
    vel: VelocityComponent,
    col: ColliderComponent,
    render: PaperRenderComponent,
    state: RacerStateComponent,
    prevX: number,
    prevY: number,
    corridors: CorridorRect[]
  ): void {
    const half = col.size / 2;
    const minHalf = half * 0.75;
    const minSize = minHalf * 2;

    // 1. Gates (only resolve if the racer's 75% core actually overlaps the gate)
    for (let g = 0; g < this.gateList.length; g++) {
      const { pos: gPos, gate } = this.gateList[g];
      if (gate.hp <= 0) continue;

      if (Geometry.aabbOverlap(pos.x - minHalf, pos.y - minHalf, minSize, minSize, gPos.x, gPos.y, gate.w, gate.h)) {
        const isKeyholder = gate.unlockTeamId && gate.unlockTeamId === state.team.id;
        if (isKeyholder) continue;

        const survived = this.pushOutOfObstacle(
          floodRects, pos, vel, render, half, prevX, prevY,
          gPos.x, gPos.y, gate.w, gate.h, corridors, state
        );
        if (!survived) {
          this.crushRacer(pos, state, 'SQUEEZED!');
          return;
        }
      }
    }

    // 2. Barriers
    for (let b = 0; b < this.barrierList.length; b++) {
      const { pos: bPos, bar } = this.barrierList[b];
      // For static barriers, only resolve if 75% core overlaps; for moving barriers, resolve full half
      const checkH = bar.movement === 'static' ? minHalf : half;
      const checkS = checkH * 2;

      if (Geometry.aabbOverlap(pos.x - checkH, pos.y - checkH, checkS, checkS, bPos.x, bPos.y, bar.w, bar.h)) {
        const survived = this.pushOutOfObstacle(
          floodRects, pos, vel, render, half, prevX, prevY,
          bPos.x, bPos.y, bar.w, bar.h, corridors, state
        );
        if (!survived) {
          if (bar.movement !== 'static') {
            this.crushRacer(pos, state, 'SQUEEZED!');
            return;
          }
        } else {
          Sound.playBounceNote(0.9);
        }
      }
    }
  }

  /**
   * Pushes a racer out of an obstacle rect (ox, oy, ow, oh) on the approach side.
   * Requires at least 75% of the racer's size in clearance and never crosses another obstacle or wall.
   * Returns false if the racer is squeezed with < 75% clearance (triggering immediate death).
   */
  private pushOutOfObstacle(
    floodRects: CorridorRect[],
    pos: TransformComponent,
    vel: VelocityComponent,
    render: PaperRenderComponent,
    half: number,
    prevX: number,
    prevY: number,
    ox: number,
    oy: number,
    ow: number,
    oh: number,
    corridors: CorridorRect[],
    state: RacerStateComponent
  ): boolean {
    const ocx = ox + ow / 2;
    const ocy = oy + oh / 2;
    const refDx = (prevX - ocx) || (pos.x - ocx) || 1;
    const refDy = (prevY - ocy) || (pos.y - ocy) || 1;
    const signX = refDx >= 0 ? 1 : -1;
    const signY = refDy >= 0 ? 1 : -1;

    for (let s = 0; s < SQUEEZE_SCALES.length; s++) {
      const scale = SQUEEZE_SCALES[s];
      const testHalf = half * scale;
      const pushX = signX > 0 ? ox + ow + testHalf + 0.2 : ox - testHalf - 0.2;
      const pushY = signY > 0 ? oy + oh + testHalf + 0.2 : oy - testHalf - 0.2;
      const distX = Math.abs(pushX - pos.x);
      const distY = Math.abs(pushY - pos.y);

      const primaryX = distX <= distY;

      for (let n = 0; n < ORTHO_NUDGES.length; n++) {
        const nudge = ORTHO_NUDGES[n];
        const c1x = primaryX ? pushX : pos.x + nudge;
        const c1y = primaryX ? pos.y + nudge : pushY;
        const c1AxisX = primaryX;
        const c1Dir = primaryX ? signX : signY;

        if (this.isPositionClear(c1x, c1y, testHalf, corridors, floodRects, state)) {
          pos.x = c1x;
          pos.y = c1y;
          if (c1AxisX) {
            vel.vx = Math.abs(vel.vx) * c1Dir;
            this.triggerBounce(render, true, false);
          } else {
            vel.vy = Math.abs(vel.vy) * c1Dir;
            this.triggerBounce(render, false, true);
          }
          return true;
        }

        const c2x = primaryX ? pos.x + nudge : pushX;
        const c2y = primaryX ? pushY : pos.y + nudge;
        const c2AxisX = !primaryX;
        const c2Dir = primaryX ? signY : signX;

        if (this.isPositionClear(c2x, c2y, testHalf, corridors, floodRects, state)) {
          pos.x = c2x;
          pos.y = c2y;
          if (c2AxisX) {
            vel.vx = Math.abs(vel.vx) * c2Dir;
            this.triggerBounce(render, true, false);
          } else {
            vel.vy = Math.abs(vel.vy) * c2Dir;
            this.triggerBounce(render, false, true);
          }
          return true;
        }
      }
    }

    // No valid space >= 75% of racer size exists on the approach side -> squeezed!
    return false;
  }

  /**
   * Handle moving wall collisions (FloodRects).
   * - Pushes racers ahead of the moving wall or around corridor corners.
   * - Damages any gate the racer is pushed into so gates break under pressure.
   * - If the remaining space between the moving wall and any gate, barrier, or corridor wall
   *   is less than 75% of the racer's size, the racer immediately dies!
   */
  private handleMovingWallCollisions(
    world: World,
    pos: TransformComponent,
    vel: VelocityComponent,
    col: ColliderComponent,
    render: PaperRenderComponent,
    state: RacerStateComponent,
    corridors: CorridorRect[],
    floodRects: CorridorRect[]
  ): void {
    const half = col.size / 2;

    for (let f = 0; f < floodRects.length; f++) {
      const rect = floodRects[f];
      if (!Geometry.aabbOverlap(pos.x - half, pos.y - half, col.size, col.size, rect.x, rect.y, rect.w, rect.h)) {
        continue;
      }

      const dir = rect.wallDirection;
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const dx = pos.x - cx;
      const dy = pos.y - cy;
      const sx = dx >= 0 ? 1 : -1;
      const sy = dy >= 0 ? 1 : -1;

      let resolved = false;

      // Test scales from 100% down to 75% minimum squeeze threshold
      for (let s = 0; s < SQUEEZE_SCALES.length; s++) {
        const scale = SQUEEZE_SCALES[s];
        const testHalf = half * scale;

        const rightX = rect.x + rect.w + testHalf + 0.2;
        const leftX = rect.x - testHalf - 0.2;
        const upY = rect.y - testHalf - 0.2;
        const downY = rect.y + rect.h + testHalf + 0.2;

        // 3 ordered directional escape candidates without heap allocations
        for (let c = 0; c < 3; c++) {
          let baseX = pos.x;
          let baseY = pos.y;
          let isAxisX = true;
          let pushDir = 1;

          if (dir === 'right') {
            if (c === 0) { baseX = rightX; isAxisX = true; pushDir = 1; }
            else if (c === 1) { baseY = sy >= 0 ? downY : upY; isAxisX = false; pushDir = sy; }
            else { baseY = sy >= 0 ? upY : downY; isAxisX = false; pushDir = -sy; }
          } else if (dir === 'left') {
            if (c === 0) { baseX = leftX; isAxisX = true; pushDir = -1; }
            else if (c === 1) { baseY = sy >= 0 ? downY : upY; isAxisX = false; pushDir = sy; }
            else { baseY = sy >= 0 ? upY : downY; isAxisX = false; pushDir = -sy; }
          } else if (dir === 'up') {
            if (c === 0) { baseY = upY; isAxisX = false; pushDir = -1; }
            else if (c === 1) { baseX = sx >= 0 ? rightX : leftX; isAxisX = true; pushDir = sx; }
            else { baseX = sx >= 0 ? leftX : rightX; isAxisX = true; pushDir = -sx; }
          } else {
            if (c === 0) { baseY = downY; isAxisX = false; pushDir = 1; }
            else if (c === 1) { baseX = sx >= 0 ? rightX : leftX; isAxisX = true; pushDir = sx; }
            else { baseX = sx >= 0 ? leftX : rightX; isAxisX = true; pushDir = -sx; }
          }

          for (let n = 0; n < ORTHO_NUDGES.length; n++) {
            const nudge = ORTHO_NUDGES[n];
            const candX = isAxisX ? baseX : baseX + nudge;
            const candY = isAxisX ? baseY + nudge : baseY;

            // Allow the pushed racer to damage or unlock any gate in front of it
            this.checkGateSweep(world, candX, candY, half, state);

            if (this.isPositionClear(candX, candY, testHalf, corridors, floodRects, state)) {
              pos.x = candX;
              pos.y = candY;
              if (isAxisX) {
                vel.vx = Math.abs(vel.vx) * (pushDir >= 0 ? 1.15 : -1.15);
                this.triggerBounce(render, true, false, 1.1);
              } else {
                vel.vy = Math.abs(vel.vy) * (pushDir >= 0 ? 1.15 : -1.15);
                this.triggerBounce(render, false, true, 1.1);
              }
              resolved = true;
              break;
            }
          }

          if (resolved) break;
        }

        if (resolved) break;
      }

      // If no valid space >= 75% of the racer's size exists, immediately die!
      if (!resolved) {
        this.crushRacer(pos, state, 'PINCHED!');
        return;
      }
    }
  }

  /**
   * Helper to check if a bounding box overlaps any flood rect
   */
  private boxOverlapsAnyFlood(cx: number, cy: number, half: number, floodRects: CorridorRect[]): boolean {
    const size = half * 2;
    for (let i = 0; i < floodRects.length; i++) {
      const r = floodRects[i];
      if (Geometry.aabbOverlap(cx - half, cy - half, size, size, r.x, r.y, r.w, r.h)) {
        return true;
      }
    }
    return false;
  }

  private handleCombatContact(
    world: World,
    idA: number,
    idB: number,
    stA: RacerStateComponent,
    stB: RacerStateComponent,
    pA: TransformComponent,
    pB: TransformComponent
  ): void {
    if (!stA.alive || !stB.alive) return;
    if (stA.team.id === stB.team.id) return;

    if (stA.weapon === 'knife' && stA.weaponCooldown <= 0 && stB.invulnTimer <= 0) {
      this.executeKnifeStrike(world, idA, idB, stA, stB, pA, pB);
    } else if (stB.weapon === 'knife' && stB.weaponCooldown <= 0 && stA.invulnTimer <= 0) {
      this.executeKnifeStrike(world, idB, idA, stB, stA, pB, pA);
    }
  }

  private executeKnifeStrike(
    _world: World,
    _attId: number,
    _vicId: number,
    attState: RacerStateComponent,
    vicState: RacerStateComponent,
    attPos: TransformComponent,
    vicPos: TransformComponent
  ): void {
    attState.weapon = null;
    const dropX = (attPos.x + vicPos.x) * 0.5;
    const dropY = (attPos.y + vicPos.y) * 0.5;

    if (vicState.shield) {
      vicState.shield = false;
      vicState.invulnTimer = 0.5;
      Sound.play('gate_break');
      this.sim.spawnFloatingText(vicPos.x, vicPos.y - 12, 'SHIELD BLOCK!', 0x38bdf8);
      this.sim.spawnConfetti(vicPos.x, vicPos.y, 0x38bdf8, 12);
    } else {
      vicState.alive = false;
      vicState.petrifiedBy = 'knife';
      Sound.play('knife_kill');
      this.sim.spawnInkSplatter(vicPos.x, vicPos.y, vicState.team.hex);
      this.sim.spawnConfetti(vicPos.x, vicPos.y, vicState.team.hex, 20);
      this.sim.spawnFloatingText(vicPos.x, vicPos.y - 14, 'SLICED!', vicState.team.hex);
      this.sim.triggerHitStop(0.055);
      this.sim.addScreenShake(7.5);
    }

    this.sim.spawnPickup('knife', dropX, dropY, 0.45);
  }

  private triggerBounce(render: PaperRenderComponent, hitX: boolean, hitY: boolean, audioIntensity = 1.0): void {
    if (hitX) {
      render.scaleX = 0.7;
      render.scaleY = 1.3;
    } else if (hitY) {
      render.scaleX = 1.3;
      render.scaleY = 0.7;
    }
    Sound.play('bounce_note', { intensity: audioIntensity });
  }
}
