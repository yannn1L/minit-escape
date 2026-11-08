import type { ISystem } from '../ecs/System';
import type { World } from '../ecs/World';
import { GlobalRegistry } from '../registry/StrategyRegistry';
import type { PickupStrategy } from '../registry/PickupRegistry';

export class RenderSystem implements ISystem {
  name = 'RenderSystem';
  private sim: any;
  private hexCache = new Map<number, string>();

  // Camera viewport frustum bounds in world coordinates
  private visMinX = 0;
  private visMinY = 0;
  private visMaxX = 500;
  private visMaxY = 800;

  constructor(sim: any) {
    this.sim = sim;
  }

  private getHexCss(hex: number): string {
    let css = this.hexCache.get(hex);
    if (!css) {
      css = `#${hex.toString(16).padStart(6, '0')}`;
      this.hexCache.set(hex, css);
    }
    return css;
  }

  private getArenaThemeColor(): string {
    const theme = this.sim.layoutConfig?.arenaTheme || 'classic_blue';
    if (theme === 'midnight') return '#1e293b';
    if (theme === 'emerald') return '#059669';
    if (theme === 'sunset') return '#d97706';
    if (theme === 'violet') return '#7c3aed';
    return '#4895ef';
  }

  private isRectVisible(x: number, y: number, w: number, h: number): boolean {
    return x + w >= this.visMinX && x <= this.visMaxX && y + h >= this.visMinY && y <= this.visMaxY;
  }

  private renderTrackGeometry(ctx: CanvasRenderingContext2D): void {
    const corridors = this.sim.currentMap.corridors;
    const len = corridors.length;

    // 1. Outer Dark Drop Shadow (frustum-culled)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    for (let i = 0; i < len; i++) {
      const c = corridors[i];
      if (!this.isRectVisible(c.x - 4, c.y - 4, c.w + 12, c.h + 12)) continue;
      ctx.fillRect(c.x + 5, c.y + 6, c.w, c.h);
    }

    // 2. Crisp Black Outer Cutout Border
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < len; i++) {
      const c = corridors[i];
      if (!this.isRectVisible(c.x - 4, c.y - 4, c.w + 12, c.h + 12)) continue;
      ctx.fillRect(c.x - 3, c.y - 3, c.w + 6, c.h + 6);
    }

    // 3. Inner Paper Bevel
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < len; i++) {
      const c = corridors[i];
      if (!this.isRectVisible(c.x - 4, c.y - 4, c.w + 12, c.h + 12)) continue;
      ctx.fillRect(c.x, c.y, c.w, c.h);
    }

    // 4. Bright White Paper Track Interior
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < len; i++) {
      const c = corridors[i];
      if (!this.isRectVisible(c.x - 4, c.y - 4, c.w + 12, c.h + 12)) continue;
      ctx.fillRect(c.x + 3, c.y + 3, c.w - 3, c.h - 3);
    }

    // 5. Green Checkered Finish Alcove (supports rotation, frustum-culled)
    const fz = this.sim.currentMap.finishZone;
    const padFz = Math.max(fz.w, fz.h);
    if (!this.isRectVisible(fz.x - padFz, fz.y - padFz, fz.w + padFz * 2, fz.h + padFz * 2)) {
      return;
    }

    const fzCx = fz.x + fz.w / 2;
    const fzCy = fz.y + fz.h / 2;
    const rotRad = ((fz.rotation || 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(fzCx, fzCy);
    if (rotRad !== 0) ctx.rotate(rotRad);
    ctx.translate(-fzCx, -fzCy);

    // Outer border for finish alcove
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(fz.x - 2.5, fz.y - 2.5, fz.w + 5, fz.h + 5);

    ctx.fillStyle = '#4ade80';
    ctx.fillRect(fz.x, fz.y, fz.w, Math.max(4, fz.h - 14));

    // Checkered Finish Line (2 rows, batched by color)
    const cols = 6;
    const cellW = fz.w / cols;
    const cellH = 7;
    const startY = fz.y + fz.h - 14;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fz.x, startY, fz.w, 14);
    ctx.fillStyle = '#0f172a';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(fz.x + c * cellW, startY + r * cellH, cellW, cellH);
        }
      }
    }
    ctx.restore();
  }

  update(world: World, dt: number): void {
    const ctx: CanvasRenderingContext2D = this.sim.ctx;
    if (!ctx) return;

    const w = this.sim.virtualWidth || 500;
    const h = this.sim.virtualHeight || 800;
    const canvas = this.sim.canvas as HTMLCanvasElement | null;
    const physW = canvas ? canvas.width : w;
    const physH = canvas ? canvas.height : h;

    // 1. Reset transform & scale to physical pixel buffer
    ctx.setTransform(physW / w, 0, 0, physH / h, 0, 0);

    ctx.save();

    // Apply Screen Shake
    if (this.sim.shakeIntensity > 0.1) {
      const sx = (Math.random() - 0.5) * this.sim.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.sim.shakeIntensity;
      ctx.translate(sx, sy);
    }

    const camX = this.sim.camX ?? 250;
    const camY = this.sim.camY ?? 400;
    const camZoom = Math.max(0.1, this.sim.camZoom ?? 1.0);

    // Center of screen, zoom, then pan to world camera
    ctx.translate(w / 2, h / 2);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camX, -camY);

    // Compute camera frustum bounds in world coordinates
    const visW = w / camZoom + 36;
    const visH = h / camZoom + 36;
    const visX = camX - visW / 2;
    const visY = camY - visH / 2;
    this.visMinX = visX;
    this.visMinY = visY;
    this.visMaxX = visX + visW;
    this.visMaxY = visY + visH;

    // 1b. Fast Solid Arena Background + Batched Paper Grid Dots (avoids slow WebView CanvasPattern shaders)
    ctx.fillStyle = this.getArenaThemeColor();
    ctx.fillRect(visX, visY, visW, visH);

    if (camZoom >= 0.45) {
      const gridStep = camZoom < 0.75 ? 64 : 32;
      const startGX = Math.floor(visX / gridStep) * gridStep + 15;
      const startGY = Math.floor(visY / gridStep) * gridStep + 15;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      for (let gx = startGX; gx < this.visMaxX; gx += gridStep) {
        for (let gy = startGY; gy < this.visMaxY; gy += gridStep) {
          ctx.rect(gx, gy, 2.4, 2.4);
        }
      }
      ctx.fill();
    }

    // 2. Draw Track Corridors directly with frustum culling
    this.renderTrackGeometry(ctx);

    // 3. Draw Persistent Splatters
    this.drawSplatters(ctx);

    // 4. Draw Cyan Corruption Flood
    this.drawFlood(ctx);

    // 5. Draw Gates
    this.drawGates(world, ctx, dt);

    // 5b. Draw Static & Moving Barriers
    this.drawBarriers(world, ctx);

    // 6. Draw Pickups
    this.drawPickups(world, ctx);

    // 7. Draw Racers
    this.drawRacers(world, ctx, dt);

    // 8. Draw Confetti Particles
    this.drawParticles(ctx);

    // 9. Draw Floating Texts
    this.drawFloatingTexts(ctx);

    ctx.restore();
  }

  private drawSplatters(ctx: CanvasRenderingContext2D): void {
    const splatters = this.sim.splatters;
    for (let i = 0; i < splatters.length; i++) {
      const s = splatters[i];
      if (!this.isRectVisible(s.x - s.radius, s.y - s.radius, s.radius * 2, s.radius * 2)) continue;
      ctx.fillStyle = s.colorCss;
      if (s.radius <= 6) {
        ctx.fillRect(s.x - s.radius, s.y - s.radius, s.radius * 2, s.radius * 2);
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawFlood(ctx: CanvasRenderingContext2D): void {
    if (!this.sim.floodActive || !this.sim.floodRects) return;
    const rects = this.sim.floodRects;
    if (rects.length === 0) return;

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!this.isRectVisible(r.x, r.y, r.w, r.h)) continue;
      ctx.fillStyle = '#06f9f9';
      ctx.fillRect(r.x, r.y, r.w, r.h);

      // Subtle inner stripe accent without bitmap shader overhead
      ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
      const step = 16;
      if (r.w >= r.h) {
        for (let sx = r.x; sx < r.x + r.w - 4; sx += step) {
          ctx.fillRect(sx, r.y, Math.min(8, r.x + r.w - sx), r.h);
        }
      } else {
        for (let sy = r.y; sy < r.y + r.h - 4; sy += step) {
          ctx.fillRect(r.x, sy, r.w, Math.min(8, r.y + r.h - sy));
        }
      }

      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  private drawGates(world: World, ctx: CanvasRenderingContext2D, dt: number): void {
    const gates = world.query('Transform', 'Gate');
    for (let i = 0; i < gates.length; i++) {
      const id = gates[i];
      const pos = world.getComponent(id, 'Transform')!;
      const gate = world.getComponent(id, 'Gate')!;

      if (gate.hitFlash > 0) {
        gate.hitFlash = Math.max(0, gate.hitFlash - dt * 6);
      }

      if (!this.isRectVisible(pos.x - 4, pos.y - 4, gate.w + 8, gate.h + 8)) continue;

      ctx.save();
      const cx = pos.x + gate.w / 2;
      const cy = pos.y + gate.h / 2;
      ctx.translate(cx, cy);

      if (gate.hitFlash > 0.01) {
        const scale = 1 + gate.hitFlash * 0.08;
        ctx.scale(scale, scale);
      }

      const hw = gate.w / 2;
      const hh = gate.h / 2;

      // Base colored barrier
      ctx.fillStyle = this.getHexCss(gate.color);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.fillRect(-hw, -hh, gate.w, gate.h);
      ctx.strokeRect(-hw, -hh, gate.w, gate.h);

      // Paper white hazard stripes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      if (gate.orientation === 'H' && gate.w >= gate.h) {
        ctx.fillRect(-hw + 2, -hh + 3, gate.w - 4, 3);
        ctx.fillRect(-hw + 2, hh - 6, gate.w - 4, 3);
      } else {
        ctx.fillRect(-hw + 3, -hh + 2, 3, gate.h - 4);
        if (gate.w >= 12) {
          ctx.fillRect(hw - 6, -hh + 2, 3, gate.h - 4);
        }
      }

      // If locked to a specific racer/team, draw keyhole / lock symbol
      if (gate.unlockTeamId) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-1.5, 0, 3, 4);
      }

      ctx.restore();
    }
  }

  private drawBarriers(world: World, ctx: CanvasRenderingContext2D): void {
    const barriers = world.query('Transform', 'Barrier');
    if (barriers.length === 0) return;

    for (let i = 0; i < barriers.length; i++) {
      const id = barriers[i];
      const pos = world.getComponent(id, 'Transform')!;
      const bar = world.getComponent(id, 'Barrier')!;

      const bx = pos.x;
      const by = pos.y;
      const bw = bar.w;
      const bh = bar.h;

      if (!this.isRectVisible(bx - 4, by - 4, bw + 10, bh + 10)) continue;

      // Paper drop shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
      ctx.fillRect(bx + 3, by + 4, bw, bh);

      // Barrier Body
      ctx.fillStyle = bar.color ? this.getHexCss(bar.color) : '#475569';
      ctx.fillRect(bx, by, bw, bh);

      // Fast direct hazard stripes without CanvasPattern shader overhead
      const isHoriz = bw >= bh;
      const isStatic = bar.movement === 'static';
      ctx.fillStyle = isStatic ? '#e2e8f0' : '#facc15';
      if (isHoriz) {
        for (let sx = bx + 5; sx < bx + bw - 5; sx += 12) {
          ctx.fillRect(sx, by + 2.5, 4, Math.max(2, bh - 5));
        }
      } else {
        for (let sy = by + 5; sy < by + bh - 5; sy += 12) {
          ctx.fillRect(bx + 2.5, sy, Math.max(2, bw - 5), 4);
        }
      }

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Movement indicator arrow on moving barriers
      if (!isStatic) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let label = '↔';
        if (bar.movement === 'vertical') label = '↕';
        else if (bar.movement === 'diagonal_up') label = '↗';
        else if (bar.movement === 'diagonal_down') label = '↘';
        ctx.fillText(label, bx + bw / 2, by + bh / 2);
      }
    }
  }

  private drawPickups(world: World, ctx: CanvasRenderingContext2D): void {
    const pickups = world.query('Transform', 'Pickup');
    for (let i = 0; i < pickups.length; i++) {
      const id = pickups[i];
      const pos = world.getComponent(id, 'Transform')!;
      const pickup = world.getComponent(id, 'Pickup')!;

      if (pickup.spawnDelay > 0) continue;
      if (!this.isRectVisible(pos.x - 16, pos.y - 16, 32, 32)) continue;

      const bobY = pos.y + Math.sin(pickup.bobPhase) * 2.5;

      ctx.save();
      ctx.translate(pos.x, bobY);

      // Paper sticker drop shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.arc(1.5, 2.5, 12, 0, Math.PI * 2);
      ctx.fill();

      // White paper backing circle
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const strategy = GlobalRegistry.get<PickupStrategy>('pickup', pickup.strategyKey);
      if (strategy) {
        strategy.drawIcon(ctx, 12);
      }

      ctx.restore();
    }
  }

  private drawRacers(world: World, ctx: CanvasRenderingContext2D, dt: number): void {
    const racers = world.query('Transform', 'Velocity', 'RacerState', 'PaperRender', 'Collider');

    for (let i = 0; i < racers.length; i++) {
      const id = racers[i];
      const pos = world.getComponent(id, 'Transform')!;
      const vel = world.getComponent(id, 'Velocity')!;
      const st = world.getComponent(id, 'RacerState')!;
      const render = world.getComponent(id, 'PaperRender')!;
      const col = world.getComponent(id, 'Collider')!;

      // Spring squash & stretch back to 1.0
      render.scaleX += (1.0 - render.scaleX) * Math.min(1, dt * 16);
      render.scaleY += (1.0 - render.scaleY) * Math.min(1, dt * 16);

      // Zero-allocation in-place trail point update
      const trail = render.trail;
      if (st.alive) {
        if (trail.length < 6) {
          trail.unshift({ x: pos.x, y: pos.y });
        } else {
          for (let t = 5; t > 0; t--) {
            trail[t].x = trail[t - 1].x;
            trail[t].y = trail[t - 1].y;
          }
          trail[0].x = pos.x;
          trail[0].y = pos.y;
        }
      } else if (trail.length > 0) {
        trail.length = 0;
      }

      const size = col.size;
      const half = size / 2;

      if (!this.isRectVisible(pos.x - size * 1.5, pos.y - size * 1.5, size * 3, size * 3)) continue;

      // 1. Motion Smear / Tail
      if (st.alive && trail.length >= 3) {
        const tailPt = trail[trail.length - 1];
        const dx = tailPt.x - pos.x;
        const dy = tailPt.y - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          const nx = -dy / dist;
          const ny = dx / dist;
          const tailColor = st.speedBoostTimer > 0
            ? (Math.floor(performance.now() / 60) % 2 === 0 ? '#facc15' : '#ffffff')
            : st.team.css;

          ctx.fillStyle = tailColor;
          ctx.beginPath();
          ctx.moveTo(pos.x + nx * (half - 1), pos.y + ny * (half - 1));
          ctx.lineTo(pos.x + dx * 1.35, pos.y + dy * 1.35);
          ctx.lineTo(pos.x - nx * (half - 1), pos.y - ny * (half - 1));
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.save();
      ctx.translate(pos.x, pos.y);
      if (Math.abs(render.scaleX - 1) > 0.005 || Math.abs(render.scaleY - 1) > 0.005) {
        ctx.scale(render.scaleX, render.scaleY);
      }

      // 2. Drop Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(-half + 2.5, -half + 3, size, size);

      // 3. Shield Halo
      const shape = st.team.shape || 'square';
      if (st.alive && st.shield) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, half + 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (shape === 'rounded') {
          ctx.beginPath();
          ctx.roundRect(-half - 3.5, -half - 3.5, size + 7, size + 7, 7);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(-half - 3.5, -half - 3.5, size + 7, size + 7);
          ctx.strokeRect(-half - 3.5, -half - 3.5, size + 7, size + 7);
        }
      }

      // 4. Main Body with custom shape
      const bodyColor = st.alive
        ? st.team.css
        : (st.petrifiedBy === 'knife' ? '#78716c' : '#475569');

      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;

      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'rounded') {
        ctx.beginPath();
        ctx.roundRect(-half, -half, size, size, 4.5);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-half, -half, size, size);
        ctx.strokeRect(-half, -half, size, size);
      }

      // Stone Crack Lines if petrified/sliced
      if (!st.alive) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-half + 3, -half + 2);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-half + 2, half - 3);
        ctx.moveTo(half - 2, -half + 4);
        ctx.lineTo(2, 2);
        ctx.lineTo(half - 4, half - 2);
        ctx.stroke();
      }

      // 5. Expressive Cutout Eyes
      const eyeY = -2.5;
      const leftEyeX = -4.2;
      const rightEyeX = 2.8;
      const eyeW = 5.2;
      const eyeH = 5.8;

      if (st.alive) {
        // White sclera
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.fillRect(leftEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);
        ctx.strokeRect(leftEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);
        ctx.fillRect(rightEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);
        ctx.strokeRect(rightEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);

        // Pupils look toward velocity
        const spd = Math.hypot(vel.vx, vel.vy) || 1;
        const px = (vel.vx / spd) * 1.3;
        const py = (vel.vy / spd) * 1.3;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(leftEyeX - 1.3 + px, eyeY - 1.3 + py, 2.8, 2.8);
        ctx.fillRect(rightEyeX - 1.3 + px, eyeY - 1.3 + py, 2.8, 2.8);
      } else {
        // Dark sockets
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(leftEyeX - 2.2, eyeY - 2.2, 4.4, 4.4);
        ctx.fillRect(rightEyeX - 2.2, eyeY - 2.2, 4.4, 4.4);
      }

      // 6. Equipped Rotating Knife
      if (st.alive && st.weapon === 'knife') {
        const angle = Math.atan2(vel.vy, vel.vx);
        const kx = Math.cos(angle) * (half + 6);
        const ky = Math.sin(angle) * (half + 6);

        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate(angle);

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -4.5);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-3, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.sim.particles;
    if (particles.length === 0) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!this.isRectVisible(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2)) continue;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.strokeRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
    const texts = this.sim.floatingTexts;
    if (texts.length === 0) return;
    ctx.save();
    ctx.font = '800 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < texts.length; i++) {
      const ft = texts[i];
      if (!this.isRectVisible(ft.x - 80, ft.y - 16, 160, 32)) continue;
      const alpha = Math.min(1, ft.life * 2.2);
      ctx.strokeStyle = `rgba(15, 23, 42, ${alpha})`;
      ctx.fillStyle = ft.color;
      ctx.strokeText(ft.message, ft.x, ft.y);
      ctx.fillText(ft.message, ft.x, ft.y);
    }
    ctx.restore();
  }
}
