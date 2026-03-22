/**
 * Isometric projection math utilities
 * Based on IsoEngine AS3 original implementation
 * 
 * Supports multiple projection types:
 * - Isometric (30°): tileWidth = 2 × tileHeight
 * - Dimetric (26.565°): tileWidth = 2 × tileHeight (common in 2D games)
 * - Staggered: Alternative layout for diamond tiles
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

export type ProjectionType = 'isometric' | 'dimetric' | 'staggered';

export interface IsoConfig {
  tileWidth: number;
  tileHeight: number;
  tileHigh: number;  // Z-axis height per tile
  
  // Projection settings
  projection?: ProjectionType;  // Default: 'isometric'
  
  // For staggered projection
  staggerAxis?: 'x' | 'y';  // Which axis to stagger
  staggerEven?: boolean;    // Even rows/cols offset direction
}

export class IsoMath {
  private projection: ProjectionType;
  private staggerAxis: 'x' | 'y';
  private staggerEven: boolean;
  
  constructor(private config: IsoConfig) {
    this.projection = config.projection ?? 'isometric';
    this.staggerAxis = config.staggerAxis ?? 'y';
    this.staggerEven = config.staggerEven ?? true;
  }

  /**
   * Convert isometric tile coordinates to screen coordinates
   */
  tileToScreen(tile: TilePosition): ScreenPosition {
    switch (this.projection) {
      case 'isometric':
      case 'dimetric':
        return this.isoTileToScreen(tile);
      case 'staggered':
        return this.staggeredTileToScreen(tile);
      default:
        return this.isoTileToScreen(tile);
    }
  }

  /**
   * Standard isometric/dimetric projection
   */
  private isoTileToScreen(tile: TilePosition): ScreenPosition {
    const { tileWidth, tileHeight, tileHigh } = this.config;
    return {
      x: (tile.x - tile.y) * tileWidth / 2,
      y: (tile.x + tile.y) * tileHeight / 2 - tile.z * tileHigh,
    };
  }

  /**
   * Staggered projection (alternative diamond layout)
   */
  private staggeredTileToScreen(tile: TilePosition): ScreenPosition {
    const { tileWidth, tileHeight, tileHigh } = this.config;
    let offsetX = 0;
    let offsetY = 0;
    
    if (this.staggerAxis === 'y') {
      // Stagger rows
      const isEven = tile.y % 2 === 0;
      offsetX = (isEven === this.staggerEven) ? 0 : tileWidth / 2;
    } else {
      // Stagger columns
      const isEven = tile.x % 2 === 0;
      offsetY = (isEven === this.staggerEven) ? 0 : tileHeight / 2;
    }
    
    return {
      x: tile.x * tileWidth + offsetX,
      y: tile.y * tileHeight + offsetY - tile.z * tileHigh,
    };
  }

  /**
   * Convert screen coordinates to isometric tile coordinates
   */
  screenToTile(screen: ScreenPosition, z: number = 0): TilePosition {
    switch (this.projection) {
      case 'isometric':
      case 'dimetric':
        return this.isoScreenToTile(screen, z);
      case 'staggered':
        return this.staggeredScreenToTile(screen, z);
      default:
        return this.isoScreenToTile(screen, z);
    }
  }

  /**
   * Standard isometric/dimetric inverse projection
   */
  private isoScreenToTile(screen: ScreenPosition, z: number = 0): TilePosition {
    const { tileWidth, tileHeight, tileHigh } = this.config;
    const adjustedY = screen.y + z * tileHigh;
    
    return {
      x: Math.floor(screen.x / tileWidth + adjustedY / tileHeight),
      y: Math.floor(adjustedY / tileHeight - screen.x / tileWidth),
      z: z,
    };
  }

  /**
   * Staggered inverse projection (approximate)
   */
  private staggeredScreenToTile(screen: ScreenPosition, z: number = 0): TilePosition {
    const { tileWidth, tileHeight, tileHigh } = this.config;
    const adjustedY = screen.y + z * tileHigh;
    
    // First approximation
    const tileX = Math.floor(screen.x / tileWidth);
    const tileY = Math.floor(adjustedY / tileHeight);
    
    // Adjust for stagger
    let offsetX = 0;
    let offsetY = 0;
    
    if (this.staggerAxis === 'y') {
      const isEven = tileY % 2 === 0;
      offsetX = (isEven === this.staggerEven) ? 0 : tileWidth / 2;
    } else {
      const isEven = tileX % 2 === 0;
      offsetY = (isEven === this.staggerEven) ? 0 : tileHeight / 2;
    }
    
    return {
      x: Math.floor((screen.x - offsetX) / tileWidth),
      y: Math.floor((adjustedY - offsetY) / tileHeight),
      z: z,
    };
  }

  /**
   * Calculate depth value for sorting (painter's algorithm)
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

  /**
   * Get tile corner positions (for rendering bounds)
   */
  getTileCorners(tile: TilePosition): ScreenPosition[] {
    const screen = this.tileToScreen(tile);
    const { tileWidth, tileHeight } = this.config;
    
    if (this.projection === 'staggered') {
      // Rectangular bounds for staggered
      return [
        { x: screen.x, y: screen.y },
        { x: screen.x + tileWidth, y: screen.y },
        { x: screen.x + tileWidth, y: screen.y + tileHeight },
        { x: screen.x, y: screen.y + tileHeight },
      ];
    }
    
    // Diamond corners for isometric/dimetric
    return [
      { x: screen.x, y: screen.y },  // Top
      { x: screen.x + tileWidth / 2, y: screen.y + tileHeight / 2 },  // Right
      { x: screen.x, y: screen.y + tileHeight },  // Bottom
      { x: screen.x - tileWidth / 2, y: screen.y + tileHeight / 2 },  // Left
    ];
  }
}
