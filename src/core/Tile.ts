/**
 * Tile data structure
 * Based on IsoEngine/Map.as and Tile.as
 */

import type { TilePosition } from '../math/IsoMath';

export interface TileData {
  frame: number;           // Texture frame index
  walkable: boolean;       // Can characters walk on this tile
  addFrame?: number;       // Additional frame (ladder, accelerator, etc.)
  depth?: number;          // Render depth for sorting
  position: TilePosition;  // 3D tile coordinates
}

export class Tile implements TileData {
  frame: number;
  walkable: boolean;
  addFrame?: number;
  depth: number;
  position: TilePosition;

  constructor(position: TilePosition, frame: number = 0, walkable: boolean = true) {
    this.position = position;
    this.frame = frame;
    this.walkable = walkable;
    this.depth = position.x + position.y + position.z * 100;
  }

  /**
   * Parse frame value according to IsoEngine encoding
   * 0: Ground (impassable)
   * 1-9: Normal ground (passable)
   * 10-99: Special ground
   * 100-999: frameSet index + frame number
   * 1000+: Impassable marker + frame number
   */
  static parseFrame(frameValue: number): { frameSet: number; frame: number; walkable: boolean } {
    if (frameValue === 0) {
      return { frameSet: 0, frame: 0, walkable: false };
    }
    if (frameValue < 100) {
      return { frameSet: 0, frame: frameValue, walkable: true };
    }
    if (frameValue < 1000) {
      const frameSet = Math.floor(frameValue / 100);
      const frame = frameValue % 100;
      return { frameSet, frame, walkable: true };
    }
    // 1000+ = impassable
    const frameSet = Math.floor((frameValue - 1000) / 100);
    const frame = (frameValue - 1000) % 100;
    return { frameSet, frame, walkable: false };
  }

  /**
   * Check if tile has special properties based on addFrame
   */
  getSpecialEffect(): 'none' | 'ladder' | 'accelerator' | 'bouncer' | 'slow' {
    if (!this.addFrame) return 'none';
    if (this.addFrame >= 11 && this.addFrame <= 15) return 'ladder';
    if (this.addFrame >= 31 && this.addFrame <= 36) return 'accelerator';
    if (this.addFrame >= 41 && this.addFrame <= 49) return 'bouncer';
    if (this.addFrame >= 51 && this.addFrame <= 59) return 'slow';
    return 'none';
  }
}
