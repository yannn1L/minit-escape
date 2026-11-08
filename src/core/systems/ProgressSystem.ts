import type { ISystem } from '../ecs/System';
import type { World } from '../ecs/World';

export class ProgressSystem implements ISystem {
  name = 'ProgressSystem';
  private sim: any;
  private uiThrottle = 0;
  private cachedWaypointsRef: any = null;
  private cachedSegLens: number[] = [];
  private cachedTotalLen = 1;

  constructor(sim: any) {
    this.sim = sim;
  }

  update(world: World, dt: number): void {
    this.uiThrottle += dt;
    if (this.uiThrottle < 0.1) return;
    this.uiThrottle = 0;

    const racers = world.query('Transform', 'RacerState');
    const waypoints = this.sim.currentMap.waypoints;
    if (!waypoints || waypoints.length < 2) {
      this.sim.notifyStatsChanged();
      return;
    }

    if (this.cachedWaypointsRef !== waypoints) {
      this.cachedWaypointsRef = waypoints;
      this.cachedSegLens.length = 0;
      let total = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        const d = Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
        this.cachedSegLens.push(d);
        total += d;
      }
      this.cachedTotalLen = total > 0 ? total : 1;
    }

    const segLens = this.cachedSegLens;
    const totalLen = this.cachedTotalLen;

    for (let r = 0; r < racers.length; r++) {
      const id = racers[r];
      const pos = world.getComponent(id, 'Transform')!;
      const st = world.getComponent(id, 'RacerState')!;
      if (!st.alive || st.progress >= 100) continue;

      let bestDistSq = Infinity;
      let bestAlong = 0;
      let accum = 0;

      for (let i = 0; i < waypoints.length - 1; i++) {
        const A = waypoints[i];
        const B = waypoints[i + 1];
        const vx = B.x - A.x;
        const vy = B.y - A.y;
        const lenSq = vx * vx + vy * vy || 1;
        let t = ((pos.x - A.x) * vx + (pos.y - A.y) * vy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = A.x + t * vx;
        const projY = A.y + t * vy;
        const dx = pos.x - projX;
        const dy = pos.y - projY;
        const dSq = dx * dx + dy * dy;

        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestAlong = accum + t * segLens[i];
        }
        accum += segLens[i];
      }

      const pct = Math.min(99, Math.max(0, Math.floor((bestAlong / totalLen) * 100)));
      st.progress = pct;
    }

    this.sim.notifyStatsChanged();
  }
}
