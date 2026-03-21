/**
 * Map data structure - 3D tile grid
 * Based on IsoEngine/Map.as
 */

import { Tile } from './Tile';
import type { TilePosition } from '../math/IsoMath';

export interface MapConfig {
  width: number;
  height: number;
  high: number;  // Z-axis layers
}

export class Map {
  public tileTable: Tile[][][];  // [z][y][x] → Tile
  public config: MapConfig;

  constructor(config: MapConfig) {
    this.config = config;
    this.tileTable = [];

    // Initialize 3D array
    for (let z = 0; z < config.high; z++) {
      this.tileTable[z] = [];
      for (let y = 0; y < config.height; y++) {
        this.tileTable[z][y] = [];
        for (let x = 0; x < config.width; x++) {
          this.tileTable[z][y][x] = new Tile({ x, y, z }, 0, false);
        }
      }
    }
  }

  /**
   * Get tile at position
   */
  getTile(x: number, y: number, z: number = 0): Tile | null {
    if (this.isValidPosition(x, y, z)) {
      return this.tileTable[z][y][x];
    }
    return null;
  }

  /**
   * Set tile at position
   */
  setTile(x: number, y: number, z: number, tile: Tile): void {
    if (this.isValidPosition(x, y, z)) {
      this.tileTable[z][y][x] = tile;
    }
  }

  /**
   * Check if position is within map bounds
   */
  isValidPosition(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.config.width &&
           y >= 0 && y < this.config.height &&
           z >= 0 && z < this.config.high;
  }

  /**
   * Get all tiles for depth-sorted rendering
   */
  getAllTiles(): Tile[] {
    const tiles: Tile[] = [];
    for (let z = 0; z < this.config.high; z++) {
      for (let y = 0; y < this.config.height; y++) {
        for (let x = 0; x < this.config.width; x++) {
          const tile = this.tileTable[z][y][x];
          if (tile.frame !== 0) {
            tiles.push(tile);
          }
        }
      }
    }
    // Sort by depth (painter's algorithm)
    return tiles.sort((a, b) => a.depth - b.depth);
  }

  /**
   * Parse tile frame string (compressed format from XML)
   * e.g., "7*1011,1111,1011" = [1011, 1011, 1011, 1011, 1011, 1011, 1011, 1111, 1011]
   */
  static parseTileFrames(frameString: string): number[] {
    const frames: number[] = [];
    const parts = frameString.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('*')) {
        const [countStr, frameStr] = trimmed.split('*');
        const count = parseInt(countStr, 10);
        const frame = parseInt(frameStr, 10);
        for (let i = 0; i < count; i++) {
          frames.push(frame);
        }
      } else {
        frames.push(parseInt(trimmed, 10));
      }
    }

    return frames;
  }

  /**
   * Load map from tile frame array
   */
  loadFromFrames(frames: number[]): void {
    let index = 0;
    for (let z = 0; z < this.config.high; z++) {
      for (let y = 0; y < this.config.height; y++) {
        for (let x = 0; x < this.config.width; x++) {
          if (index < frames.length) {
            const frame = frames[index];
            const parsed = Tile.parseFrame(frame);
            this.tileTable[z][y][x] = new Tile(
              { x, y, z },
              parsed.frame,
              parsed.walkable
            );
            index++;
          }
        }
      }
    }
  }
}
