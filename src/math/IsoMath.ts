/**
 * Isometric projection math utilities
 * Based on IsoEngine AS3 original implementation
 */

export interface TilePosition {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPosition {
  x: number;
  y: number;
}

export interface IsoConfig {
  tileWidth: number;
  tileHeight: number;
  tileHigh: number; // Z-axis height per tile
}

export class IsoMath {
  constructor(private config: IsoConfig) {}

  /**
   * Convert isometric tile coordinates to screen coordinates
   * Formula from IsoEngine/IsoGraphic.as
   */
  tileToScreen(tile: TilePosition): ScreenPosition {
    const { tileWidth, tileHeight, tileHigh } = this.config;
    return {
      x: (tile.x - tile.y) * tileWidth / 2,
      y: (tile.x + tile.y) * tileHeight / 2 - tile.z * tileHigh,
    };
  }

  /**
   * Convert screen coordinates to isometric tile coordinates
   * Inverse of tileToScreen formula
   */
  screenToTile(screen: ScreenPosition, z: number = 0): TilePosition {
    const { tileWidth, tileHeight, tileHigh } = this.config;
    const adjustedY = screen.y + z * tileHigh;
    
    // Derived from inverse of tileToScreen:
    // screenX = (tile.x - tile.y) * tileWidth / 2
    // screenY = (tile.x + tile.y) * tileHeight / 2 - z * tileHigh
    // Solving:
    // tile.x = screenX / tileWidth + adjustedY / tileHeight
    // tile.y = adjustedY / tileHeight - screenX / tileWidth
    
    return {
      x: Math.floor(screen.x / tileWidth + adjustedY / tileHeight),
      y: Math.floor(adjustedY / tileHeight - screen.x / tileWidth),
      z: z,
    };
  }

  /**
   * Calculate depth value for sorting (painter's algorithm)
   * Higher values render on top
   */
  getDepth(tile: TilePosition): number {
    return tile.x + tile.y + tile.z * 100;
  }

  /**
   * Get tile center in screen space
   */
  getTileCenter(tile: TilePosition): ScreenPosition {
    const screen = this.tileToScreen(tile);
    return {
      x: screen.x + this.config.tileWidth / 2,
      y: screen.y + this.config.tileHeight / 2,
    };
  }
}
