import type { ISystem } from '../ecs/System';
import type { World } from '../ecs/World';

export class HazardSystem implements ISystem {
  name = 'HazardSystem';
  private sim: any;

  constructor(sim: any) {
    this.sim = sim;
  }

  update(_world: World, _dt: number): void {
    // Moving wall advancement (floodDist & updateFloodRects) and collision resolution
    // are now executed inside PhysicsSystem's high-frequency substep loop so moving walls
    // never jump across racers in a single frame.
    if (!this.sim.floodActive) return;
  }
}

