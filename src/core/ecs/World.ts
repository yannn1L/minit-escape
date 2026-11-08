import type { ComponentMap, ComponentName } from './Component';
import { COMPONENT_MASK } from './Component';
import type { ISystem } from './System';

/**
 * Pure ECS World
 * - Numeric entity IDs
 * - Component stores decoupled from entity objects
 * - Bitmask query caching for ultra-fast multi-step sub-stepping
 */
export class World {
  private nextId = 1;
  private entities = new Set<number>();
  private entityMasks = new Map<number, number>();
  private componentStores: { [K in ComponentName]?: Map<number, ComponentMap[K]> } = {};
  private systems: ISystem[] = [];

  // Query cache: query mask -> cached entity ID array
  private queryCache = new Map<number, number[]>();
  private cacheDirty = false;

  constructor() {
    this.componentStores = {
      Transform: new Map(),
      Velocity: new Map(),
      Collider: new Map(),
      RacerState: new Map(),
      Gate: new Map(),
      Barrier: new Map(),
      Pickup: new Map(),
      PaperRender: new Map(),
    };
  }

  createEntity(): number {
    const id = this.nextId++;
    this.entities.add(id);
    this.entityMasks.set(id, 0);
    this.queryCache.clear();
    this.cacheDirty = false;
    return id;
  }

  destroyEntity(id: number): void {
    if (!this.entities.has(id)) return;

    for (const compName of Object.keys(this.componentStores) as ComponentName[]) {
      this.componentStores[compName]?.delete(id);
    }

    this.entities.delete(id);
    this.entityMasks.delete(id);
    this.queryCache.clear();
    this.cacheDirty = false;
  }

  addComponent<K extends ComponentName>(id: number, name: K, data: ComponentMap[K]): ComponentMap[K] {
    if (!this.entities.has(id)) {
      throw new Error(`Cannot add component ${name} to non-existent entity ${id}`);
    }

    if (!this.componentStores[name]) {
      this.componentStores[name] = new Map();
    }
    this.componentStores[name]!.set(id, data as any);

    const curMask = this.entityMasks.get(id) || 0;
    this.entityMasks.set(id, curMask | COMPONENT_MASK[name]);
    this.queryCache.clear();
    this.cacheDirty = false;
    return data;
  }

  getComponent<K extends ComponentName>(id: number, name: K): ComponentMap[K] | undefined {
    return this.componentStores[name]?.get(id) as ComponentMap[K] | undefined;
  }

  hasComponent(id: number, name: ComponentName): boolean {
    const mask = this.entityMasks.get(id);
    if (mask === undefined) return false;
    return (mask & COMPONENT_MASK[name]) !== 0;
  }

  removeComponent(id: number, name: ComponentName): void {
    if (!this.entities.has(id)) return;
    this.componentStores[name]?.delete(id);
    const curMask = this.entityMasks.get(id) || 0;
    this.entityMasks.set(id, curMask & ~COMPONENT_MASK[name]);
    this.queryCache.clear();
    this.cacheDirty = false;
  }

  /**
   * Fast bitwise query with O(1) cache lookup
   */
  query(...compNames: ComponentName[]): number[] {
    let targetMask = 0;
    for (let i = 0; i < compNames.length; i++) {
      targetMask |= COMPONENT_MASK[compNames[i]];
    }

    const cached = this.queryCache.get(targetMask);
    if (cached !== undefined) {
      return cached;
    }

    const matches: number[] = [];
    for (const [id, mask] of this.entityMasks.entries()) {
      if ((mask & targetMask) === targetMask) {
        matches.push(id);
      }
    }

    this.queryCache.set(targetMask, matches);
    return matches;
  }

  addSystem(system: ISystem): void {
    this.systems.push(system);
  }

  update(dt: number): void {
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i].update(this, dt);
    }
  }

  clear(): void {
    this.entities.clear();
    this.entityMasks.clear();
    for (const compName of Object.keys(this.componentStores) as ComponentName[]) {
      this.componentStores[compName]?.clear();
    }
    this.nextId = 1;
    this.queryCache.clear();
    this.cacheDirty = false;
  }
}
