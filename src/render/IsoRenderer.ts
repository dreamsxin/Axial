/**
 * Isometric renderer using PixiJS
 * Based on IsoEngine/IsoGraphic.as
 */

import { Application, Container, Graphics, Texture, Sprite, Text } from 'pixi.js';
import type { TilePosition, ScreenPosition, IsoConfig } from '../math/IsoMath';
import { IsoMath } from '../math/IsoMath';
import type { Tile } from '../core/Tile';
import type { Map } from '../core/Map';

export interface RendererConfig extends IsoConfig {
  width: number;
  height: number;
  backgroundColor?: number;
}

export class IsoRenderer {
  public app: Application;
  public isoMath: IsoMath;
  public mapContainer: Container;
  public highlightContainer: Container;
  public debugContainer: Container;
  public config: RendererConfig;

  private currentMap: Map | null = null;
  private tileGraphics: Map<number, Graphics> = new Map();
  private showGrid: boolean = true;
  private showCoordinates: boolean = true;
  private showTileBounds: boolean = false;

  constructor(config: RendererConfig) {
    this.config = config;
    this.isoMath = new IsoMath(config);
    this.app = new Application();
    this.mapContainer = new Container();
    this.highlightContainer = new Container();
    this.debugContainer = new Container();
  }

  /**
   * Initialize the renderer
   */
  async init(canvas?: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: this.config.backgroundColor ?? 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (canvas) {
      canvas.appendChild(this.app.canvas);
    }

    // Center the map container
    this.mapContainer.x = this.config.width / 2;
    this.mapContainer.y = 100;

    this.app.stage.addChild(this.mapContainer);
    this.app.stage.addChild(this.highlightContainer);
    this.app.stage.addChild(this.debugContainer);
  }

  /**
   * Render a map with depth-sorted tiles
   */
  renderMap(map: Map): void {
    this.currentMap = map;
    
    // Clear existing tiles
    this.mapContainer.removeChildren();
    this.debugContainer.removeChildren();
    this.tileGraphics.clear();

    // Get all tiles sorted by depth
    const tiles = map.getAllTiles();

    // Render each tile
    for (const tile of tiles) {
      this.renderTile(tile);
    }
  }

  /**
   * Re-render with current settings
   */
  rerender(): void {
    if (this.currentMap) {
      this.renderMap(this.currentMap);
    }
  }

  // === Debug Visualization Toggles ===

  setShowGrid(show: boolean): void {
    this.showGrid = show;
    this.rerender();
  }

  setShowCoordinates(show: boolean): void {
    this.showCoordinates = show;
    this.rerender();
  }

  setShowTileBounds(show: boolean): void {
    this.showTileBounds = show;
    this.rerender();
  }

  getDebugState(): { grid: boolean; coordinates: boolean; bounds: boolean } {
    return {
      grid: this.showGrid,
      coordinates: this.showCoordinates,
      bounds: this.showTileBounds,
    };
  }

  /**
   * Render a single tile
   */
  private renderTile(tile: Tile): void {
    const screenPos = this.isoMath.tileToScreen(tile.position);
    
    const graphics = new Graphics();
    
    // Draw isometric tile shape (diamond)
    const { tileWidth, tileHeight } = this.config;
    
    // Diamond shape for top face
    graphics.moveTo(0, 0);
    graphics.lineTo(tileWidth / 2, tileHeight / 2);
    graphics.lineTo(0, tileHeight);
    graphics.lineTo(-tileWidth / 2, tileHeight / 2);
    graphics.closePath();

    // Color based on frame/walkability
    const color = tile.walkable ? 0x4a90a4 : 0x8b4513;
    const alpha = tile.walkable ? 0.8 : 0.5;
    
    graphics.fill({ color, alpha });
    graphics.stroke({ width: 1, color: 0xffffff, alpha: 0.3 });

    graphics.x = screenPos.x;
    graphics.y = screenPos.y;

    this.mapContainer.addChild(graphics);

    // Draw coordinate text if enabled
    if (this.showCoordinates) {
      this.renderTileLabel(tile, screenPos);
    }

    // Draw grid lines if enabled
    if (this.showGrid) {
      this.renderGridLines(tile, screenPos);
    }
  }

  /**
   * Render tile coordinate label
   */
  private renderTileLabel(tile: Tile, screenPos: ScreenPosition): void {
    const { tileWidth, tileHeight } = this.config;
    
    // Create container for coordinate text
    const labelContainer = new Container();
    
    // Background for better readability
    const bg = new Graphics();
    bg.rect(-15, tileHeight / 2 - 8, 30, 14).fill({ color: 0x000000, alpha: 0.6 });
    labelContainer.addChild(bg);
    
    // Coordinate text (x, y)
    const text = new Text(`${tile.position.x},${tile.position.y}`, {
      fontSize: 10,
      fill: 0xffffff,
      fontFamily: 'Consolas, monospace',
    });
    text.anchor.set(0.5, 0.5);
    text.x = 0;
    text.y = tileHeight / 2;
    labelContainer.addChild(text);
    
    labelContainer.x = screenPos.x;
    labelContainer.y = screenPos.y;
    
    this.mapContainer.addChild(labelContainer);
  }

  /**
   * Render grid lines for debugging
   */
  private renderGridLines(tile: Tile, screenPos: ScreenPosition): void {
    const { tileWidth, tileHeight } = this.config;
    
    const gridGraphics = new Graphics();
    
    // Draw center cross
    gridGraphics.moveTo(-5, tileHeight / 2);
    gridGraphics.lineTo(5, tileHeight / 2);
    gridGraphics.moveTo(0, tileHeight / 2 - 5);
    gridGraphics.lineTo(0, tileHeight / 2 + 5);
    
    gridGraphics.stroke({ width: 1, color: 0xffff00, alpha: 0.5 });
    gridGraphics.x = screenPos.x;
    gridGraphics.y = screenPos.y;
    
    this.mapContainer.addChild(gridGraphics);
  }

  /**
   * Highlight a tile (for mouse hover)
   */
  highlightTile(tile: Tile): void {
    this.highlightContainer.removeChildren();

    // Get tile's local screen position (relative to mapContainer)
    const localScreenPos = this.isoMath.tileToScreen(tile.position);
    const { tileWidth, tileHeight } = this.config;

    const graphics = new Graphics();
    
    // Highlight diamond
    graphics.moveTo(0, 0);
    graphics.lineTo(tileWidth / 2, tileHeight / 2);
    graphics.lineTo(0, tileHeight);
    graphics.lineTo(-tileWidth / 2, tileHeight / 2);
    graphics.closePath();

    graphics.fill({ color: 0xffff00, alpha: 0.5 });
    graphics.stroke({ width: 2, color: 0xffffff });

    // Convert to global coordinates (highlightContainer is at stage level, tiles are in mapContainer)
    graphics.x = localScreenPos.x + this.mapContainer.x;
    graphics.y = localScreenPos.y + this.mapContainer.y;

    this.highlightContainer.addChild(graphics);
  }

  /**
   * Clear highlight
   */
  clearHighlight(): void {
    this.highlightContainer.removeChildren();
  }

  /**
   * Get tile under screen position
   * Checks all Z layers and returns the highest tile at that position
   */
  getTileAtScreen(screenX: number, screenY: number, map: Map, z: number = 0): Tile | null {
    // Adjust for container offset (center of screen)
    const adjustedX = screenX - this.mapContainer.x;
    const adjustedY = screenY - this.mapContainer.y;

    const tilePos = this.isoMath.screenToTile({ x: adjustedX, y: adjustedY }, z);
    
    // Check all Z layers from top to bottom, return first valid tile
    for (let checkZ = map.config.high - 1; checkZ >= 0; checkZ--) {
      if (map.isValidPosition(tilePos.x, tilePos.y, checkZ)) {
        const tile = map.getTile(tilePos.x, tilePos.y, checkZ);
        if (tile && tile.frame !== 0) {
          return tile;
        }
      }
    }
    
    // Fallback: return tile at specified Z even if empty
    if (map.isValidPosition(tilePos.x, tilePos.y, z)) {
      return map.getTile(tilePos.x, tilePos.y, z);
    }
    
    return null;
  }

  /**
   * Get tile at specific Z layer (ignores other layers)
   */
  getTileAtScreenZ(screenX: number, screenY: number, map: Map, z: number): Tile | null {
    const adjustedX = screenX - this.mapContainer.x;
    const adjustedY = screenY - this.mapContainer.y;
    const tilePos = this.isoMath.screenToTile({ x: adjustedX, y: adjustedY }, z);
    
    if (!map.isValidPosition(tilePos.x, tilePos.y, z)) {
      return null;
    }
    
    return map.getTile(tilePos.x, tilePos.y, z);
  }

  /**
   * Resize renderer
   */
  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    this.config.width = width;
    this.config.height = height;
    this.mapContainer.x = width / 2;
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    this.app.destroy();
  }
}
