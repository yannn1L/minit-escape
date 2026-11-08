/**
 * Generic Category & Key Strategy Registry
 * Allows dynamic plugin registration for Pickups, Weapons, Audio Synthesizers, Maps, etc.
 */
export class StrategyRegistry {
  private categories = new Map<string, Map<string, any>>();

  register<T>(category: string, key: string, strategy: T): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Map());
    }
    this.categories.get(category)!.set(key, strategy);
  }

  get<T>(category: string, key: string): T | null {
    const cat = this.categories.get(category);
    if (!cat || !cat.has(key)) {
      console.warn(`[StrategyRegistry] Missing strategy: ${category}/${key}`);
      return null;
    }
    return cat.get(key) as T;
  }

  getAll<T>(category: string): Map<string, T> {
    return (this.categories.get(category) || new Map()) as Map<string, T>;
  }

  has(category: string, key: string): boolean {
    const cat = this.categories.get(category);
    return !!cat && cat.has(key);
  }
}

export const GlobalRegistry = new StrategyRegistry();
