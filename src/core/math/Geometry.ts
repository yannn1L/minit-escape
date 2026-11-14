import type { CorridorRect } from '../../types/game';

const SNAP_DX = [1, -1, 0, 0, 0.707, -0.707, 0.707, -0.707] as const;
const SNAP_DY = [0, 0, 1, -1, 0.707, 0.707, -0.707, -0.707] as const;

export class Geometry {
  /**
   * Axis-Aligned Bounding Box overlap
   */
  static aabbOverlap(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  /**
   * Point in rectangle check
   */
  static pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  /**
   * Zero-allocation check if a single point is inside a specific corridor or circular room
   */
  static isPointInCorridor(px: number, py: number, c: CorridorRect): boolean {
    if (c.shape === 'circle') {
      const rx = Math.max(1, c.w / 2);
      const ry = Math.max(1, c.h / 2);
      const dx = (px - (c.x + rx)) / rx;
      const dy = (py - (c.y + ry)) / ry;
      return dx * dx + dy * dy <= 1.0;
    }
    return px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h;
  }

  /**
   * Zero-allocation check if a single point is inside any walkable corridor or circular room
   */
  static isPointInCorridors(px: number, py: number, corridors: CorridorRect[]): boolean {
    const len = corridors.length;
    for (let j = 0; j < len; j++) {
      if (this.isPointInCorridor(px, py, corridors[j])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Zero-allocation check if a square box (cx, cy, halfSize) is completely inside the union of walkable track corridors/rooms.
   * - Stage 1 (Fast Path): If the entire box lies within any single corridor or circle room, returns true immediately.
   * - Stage 2 (Junction Path): Checks all 9 boundary points (4 corners, 4 edge midpoints, center) using pure scalars.
   */
  static isBoxInsideCorridors(cx: number, cy: number, half: number, corridors: CorridorRect[]): boolean {
    const len = corridors ? corridors.length : 0;
    if (len === 0) return true;
    const h = Math.max(1, half - 1.0);
    const minX = cx - h;
    const maxX = cx + h;
    const minY = cy - h;
    const maxY = cy + h;

    // Fast path: check if any single corridor/room completely contains the box
    let centerInsideAny = false;
    for (let j = 0; j < len; j++) {
      const c = corridors[j];
      if (c.shape === 'circle') {
        const rx = Math.max(1, c.w / 2);
        const ry = Math.max(1, c.h / 2);
        const ccx = c.x + rx;
        const ccy = c.y + ry;
        const cdx = (cx - ccx) / rx;
        const cdy = (cy - ccy) / ry;
        if (cdx * cdx + cdy * cdy <= 1.0) {
          centerInsideAny = true;
          const maxDx = (Math.abs(cx - ccx) + h) / rx;
          const maxDy = (Math.abs(cy - ccy) + h) / ry;
          if (maxDx * maxDx + maxDy * maxDy <= 1.0) {
            return true;
          }
        }
      } else {
        const cMaxX = c.x + c.w;
        const cMaxY = c.y + c.h;
        if (cx >= c.x && cx <= cMaxX && cy >= c.y && cy <= cMaxY) {
          centerInsideAny = true;
          if (minX >= c.x && maxX <= cMaxX && minY >= c.y && maxY <= cMaxY) {
            return true;
          }
        }
      }
    }

    if (!centerInsideAny) return false;

    // Junction path: box straddles 2+ corridors/rooms, verify remaining 8 perimeter points without allocating objects
    return (
      this.isPointInCorridors(minX, minY, corridors) &&
      this.isPointInCorridors(maxX, minY, corridors) &&
      this.isPointInCorridors(minX, maxY, corridors) &&
      this.isPointInCorridors(maxX, maxY, corridors) &&
      this.isPointInCorridors(cx, minY, corridors) &&
      this.isPointInCorridors(cx, maxY, corridors) &&
      this.isPointInCorridors(minX, cy, corridors) &&
      this.isPointInCorridors(maxX, cy, corridors)
    );
  }

  /**
   * If a racer box ever gets pushed slightly into a wall (by a moving barrier, gate, or racer-to-racer collision),
   * snap it back to the nearest valid interior point inside the walkable corridors/rooms so it never gets stuck on a wall.
   */
  static snapBoxInsideCorridors(
    cx: number,
    cy: number,
    half: number,
    corridors: CorridorRect[]
  ): { x: number; y: number; snapped: boolean } {
    if (!corridors || corridors.length === 0 || this.isBoxInsideCorridors(cx, cy, half, corridors)) {
      return { x: cx, y: cy, snapped: false };
    }

    // 1. Search nearby offsets in concentric rings (1px to 18px) for the closest valid position
    for (let dist = 1; dist <= 18; dist += 1.5) {
      for (let d = 0; d < 8; d++) {
        const tx = cx + SNAP_DX[d] * dist;
        const ty = cy + SNAP_DY[d] * dist;
        if (this.isBoxInsideCorridors(tx, ty, half, corridors)) {
          return { x: tx, y: ty, snapped: true };
        }
      }
    }

    // 2. Fallback: clamp to the interior of the closest corridor or circular room
    let bestX = cx;
    let bestY = cy;
    let bestDistSq = Infinity;
    const pad = half + 1.5;

    for (let i = 0; i < corridors.length; i++) {
      const c = corridors[i];
      let clampedX = cx;
      let clampedY = cy;

      if (c.shape === 'circle') {
        const rx = Math.max(1, c.w / 2);
        const ry = Math.max(1, c.h / 2);
        const ccx = c.x + rx;
        const ccy = c.y + ry;
        const safeRx = Math.max(2, rx - pad);
        const safeRy = Math.max(2, ry - pad);
        const ndx = (cx - ccx) / safeRx;
        const ndy = (cy - ccy) / safeRy;
        const nLen = Math.hypot(ndx, ndy);
        if (nLen > 1) {
          clampedX = ccx + (ndx / nLen) * safeRx;
          clampedY = ccy + (ndy / nLen) * safeRy;
        }
      } else {
        const minX = c.x + Math.min(pad, c.w / 2);
        const maxX = c.x + c.w - Math.min(pad, c.w / 2);
        const minY = c.y + Math.min(pad, c.h / 2);
        const maxY = c.y + c.h - Math.min(pad, c.h / 2);
        clampedX = Math.max(minX, Math.min(maxX, cx));
        clampedY = Math.max(minY, Math.min(maxY, cy));
      }

      const dSq = (clampedX - cx) * (clampedX - cx) + (clampedY - cy) * (clampedY - cy);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestX = clampedX;
        bestY = clampedY;
      }
    }

    return { x: bestX, y: bestY, snapped: true };
  }

  /**
   * Pick a random valid floor point inside a specific corridor or circular room
   */
  static randomPointInSingleCorridor(c: CorridorRect, pad = 22): { x: number; y: number } {
    if (c.shape === 'circle') {
      const rx = Math.max(8, c.w / 2 - pad);
      const ry = Math.max(8, c.h / 2 - pad);
      const ccx = c.x + c.w / 2;
      const ccy = c.y + c.h / 2;
      const r = Math.sqrt(Math.random()) * 0.85;
      const theta = Math.random() * Math.PI * 2;
      return {
        x: Math.round(ccx + Math.cos(theta) * rx * r),
        y: Math.round(ccy + Math.sin(theta) * ry * r),
      };
    }
    const safePadX = Math.min(pad, Math.max(4, c.w * 0.3));
    const safePadY = Math.min(pad, Math.max(4, c.h * 0.3));
    const safeW = Math.max(6, c.w - safePadX * 2);
    const safeH = Math.max(6, c.h - safePadY * 2);
    return {
      x: Math.round(c.x + safePadX + Math.random() * safeW),
      y: Math.round(c.y + safePadY + Math.random() * safeH),
    };
  }

  /**
   * Pick a random valid floor point inside any walkable corridor or circular room
   */
  static randomPointInCorridors(corridors: CorridorRect[], pad = 22): { x: number; y: number } {
    if (!corridors || corridors.length === 0) {
      return { x: 250, y: 400 };
    }
    const c = corridors[Math.floor(Math.random() * corridors.length)];
    return this.randomPointInSingleCorridor(c, pad);
  }

  /**
   * Distance between two points
   */
  static dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  /**
   * Clamp value between min and max
   */
  static clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }
}

