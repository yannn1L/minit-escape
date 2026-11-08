import type { World } from './World';

/**
 * ECS System Interface
 */
export interface ISystem {
  name: string;
  update(world: World, dt: number): void;
}
