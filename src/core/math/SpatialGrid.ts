/**
 * Zero-allocation 2D Uniform Spatial Hash Grid for broadphase collision queries.
 * Uses flat bucket arrays and an incrementing stamp table to avoid Set/Array allocations per frame.
 */
export class SpatialGrid<T> {
  private readonly cellSize: number;
  private readonly invCellSize: number;
  private readonly buckets = new Map<number, T[]>();
  private readonly itemStamps = new WeakMap<object, number>();
  private queryStamp = 1;

  constructor(cellSize = 96) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
  }

  private hashCoords(cx: number, cy: number): number {
    // Pack signed 16-bit cell coordinates into a single 32-bit integer key
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  clear(): void {
    this.buckets.forEach(bucket => {
      bucket.length = 0;
    });
  }

  insertAABB(item: T, x: number, y: number, w: number, h: number): void {
    const minCx = Math.floor(x * this.invCellSize);
    const maxCx = Math.floor((x + w) * this.invCellSize);
    const minCy = Math.floor(y * this.invCellSize);
    const maxCy = Math.floor((y + h) * this.invCellSize);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.hashCoords(cx, cy);
        let bucket = this.buckets.get(key);
        if (!bucket) {
          bucket = [];
          this.buckets.set(key, bucket);
        }
        bucket.push(item);
      }
    }
  }

  queryPoint(px: number, py: number, out: T[]): T[] {
    out.length = 0;
    const cx = Math.floor(px * this.invCellSize);
    const cy = Math.floor(py * this.invCellSize);
    const bucket = this.buckets.get(this.hashCoords(cx, cy));
    if (!bucket) return out;
    for (let i = 0; i < bucket.length; i++) {
      out.push(bucket[i]);
    }
    return out;
  }

  queryAABB(x: number, y: number, w: number, h: number, out: T[]): T[] {
    out.length = 0;
    const minCx = Math.floor(x * this.invCellSize);
    const maxCx = Math.floor((x + w) * this.invCellSize);
    const minCy = Math.floor(y * this.invCellSize);
    const maxCy = Math.floor((y + h) * this.invCellSize);

    // Fast path: single cell query needs no deduplication
    if (minCx === maxCx && minCy === maxCy) {
      const bucket = this.buckets.get(this.hashCoords(minCx, minCy));
      if (bucket) {
        for (let i = 0; i < bucket.length; i++) {
          out.push(bucket[i]);
        }
      }
      return out;
    }

    const stamp = ++this.queryStamp;
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.buckets.get(this.hashCoords(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          const objKey = item as unknown as object;
          if (this.itemStamps.get(objKey) !== stamp) {
            this.itemStamps.set(objKey, stamp);
            out.push(item);
          }
        }
      }
    }
    return out;
  }
}
