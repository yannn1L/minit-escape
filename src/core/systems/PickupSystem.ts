import type { ISystem } from '../ecs/System';
import type { World } from '../ecs/World';
import { GlobalRegistry } from '../registry/StrategyRegistry';
import type { PickupStrategy } from '../registry/PickupRegistry';
import { Geometry } from '../math/Geometry';

export class PickupSystem implements ISystem {
  name = 'PickupSystem';
  private sim: any;

  constructor(sim: any) {
    this.sim = sim;
  }

  update(world: World, dt: number): void {
    const pickups = world.query('Transform', 'Pickup');
    const racers = world.query('Transform', 'RacerState', 'Collider');

    for (let p = 0; p < pickups.length; p++) {
      const pId = pickups[p];
      const pPos = world.getComponent(pId, 'Transform');
      const pickup = world.getComponent(pId, 'Pickup');
      if (!pPos || !pickup) continue;

      if (pickup.spawnDelay > 0) {
        pickup.spawnDelay -= dt;
        continue;
      }

      // Destroy floor pickup immediately if an advancing moving wall covers it
      if (this.sim.floodActive && this.sim.isPointInFlood(pPos.x, pPos.y)) {
        this.sim.spawnConfetti(pPos.x, pPos.y, 0x06f9f9, 5);
        world.destroyEntity(pId);
        continue;
      }

      pickup.bobPhase += dt * 5;

      for (let r = 0; r < racers.length; r++) {
        const rId = racers[r];
        const rState = world.getComponent(rId, 'RacerState');
        if (!rState || !rState.alive) continue;

        // Skip picking up knife if already holding knife
        if (pickup.strategyKey === 'knife' && rState.weapon === 'knife') continue;

        const rPos = world.getComponent(rId, 'Transform')!;
        const dist = Geometry.dist(rPos.x, rPos.y, pPos.x, pPos.y);

        if (dist < 22) {
          const strategy = GlobalRegistry.get<PickupStrategy>('pickup', pickup.strategyKey);
          if (strategy) {
            strategy.onCollect(world, rId, pId, this.sim);
          }
          world.destroyEntity(pId);
          break;
        }
      }
    }
  }
}
