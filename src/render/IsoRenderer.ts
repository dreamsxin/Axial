/**
 * Isometric renderer using PixiJS
 * Based on IsoEngine/IsoGraphic.as
 * 
 * Container hierarchy:
 * app.stage
 * └── rootContainer (positioned at offset, contains all game content)
 *     ├── mapContainer (tiles, grid outlines)
 *     ├── highlightContainer (hover highlight)
 *     └── debugContainer (debug overlay - axes, debug graphics)
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
  offsetX?: number;  // Container offset X (defaults to screen center)
  offsetY?: number;  // Container offset Y (defaults to 100)
  enablePan?: boolean;  // Enable right-drag pan (default: true)
  panButton?: 0 | 1 | 2;  // Mouse button for pan (0=left, 1=middle, 2=right, default: 2)
  
  // Projection settings (passed to IsoMath)
  projection?: 'isometric' | 'dimetric' | 'staggered';
  staggerAxis?: 'x' | 'y';
  staggerEven?: boolean;
}

export class IsoRenderer {
  public app: Application;
  public isoMath: IsoMath;
  public rootContainer: Container;    // Parent container with offset
  public mapContainer: Container;     // Tiles and grid
  public highlightContainer: Container; // Hover highlight
  public debugContainer: Container;   // Debug overlay (axes, debug graphics)
  public config: Required<RendererConfig>;

  private currentMap: Map | null = null;
  private tileGraphics: Map<number, Graphics> = new Map();
  private showDebugOverlay: boolean = false;
  
  // Debug settings (controlled by DebugPanel)
  private showGridMarkers: boolean = true;
  private showTileDots: boolean = true;
  private showTileBounds: boolean = false;
  
  // Input state
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private onPanStart?: (x: number, y: number) => void;
  private onPanMove?: (dx: number, dy: number, x: number, y: number) => void;
  private onPanEnd?: () => void;
  private onClick?: (x: number, y: number) => void;

  constructor(config: RendererConfig) {
    this.isoMath = new IsoMath(config);
    this.app = new Application();
    
    // Create container hierarchy
    this.rootContainer = new Container();
    this.mapContainer = new Container();
    this.highlightContainer = new Container();
    this.debugContainer = new Container();
    
    // Default: center the map on screen
    const centerX = config.width / 2;
    const centerY = 100;  // Offset from top for better view
    
    // Default config values
    this.config = {
      tileWidth: config.tileWidth,
      tileHeight: config.tileHeight,
      tileHigh: config.tileHigh,
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor ?? 0x1a1a2e,
      offsetX: config.offsetX ?? centerX,
      offsetY: config.offsetY ?? centerY,
      enablePan: config.enablePan ?? true,
      panButton: config.panButton ?? 2,  // Right button by default
    };
    
    // Apply offset
    this.rootContainer.x = this.config.offsetX;
    this.rootContainer.y = this.config.offsetY;
  }

  /**
   * Initialize the renderer
   */
  async init(canvas?: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: this.config.backgroundColor,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (canvas) {
      canvas.appendChild(this.app.canvas);
    }

    // Build container hierarchy
    this.rootContainer.addChild(this.mapContainer);
    this.rootContainer.addChild(this.highlightContainer);
    this.rootContainer.addChild(this.debugContainer);
    this.app.stage.addChild(this.rootContainer);

    // Setup input handlers
    this.setupInputHandlers();
  }

  /**
   * Setup unified input handlers (keyboard + mouse)
   */
  private setupInputHandlers(): void {
    // Prevent context menu on canvas
    this.app.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });

    // Make stage interactive
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Pan drag handling
    if (this.config.enablePan) {
      this.app.stage.on('pointerdown', (e) => {
        if (e.button === this.config.panButton) {
          this.isDragging = true;
          this.lastMouseX = e.global.x;
          this.lastMouseY = e.global.y;
          this.app.canvas.style.cursor = 'grabbing';
          this.onPanStart?.(e.global.x, e.global.y);
        }
      });

      this.app.stage.on('pointermove', (e) => {
        if (this.isDragging) {
          const dx = e.global.x - this.lastMouseX;
          const dy = e.global.y - this.lastMouseY;
          this.lastMouseX = e.global.x;
          this.lastMouseY = e.global.y;
          
          const offset = this.getOffset();
          this.setOffset(offset.x + dx, offset.y + dy);
          
          this.onPanMove?.(dx, dy, e.global.x, e.global.y);
        }
      });

      this.app.stage.on('pointerup', () => {
        if (this.isDragging) {
          this.isDragging = false;
          this.app.canvas.style.cursor = 'default';
          this.onPanEnd?.();
        }
      });

      this.app.stage.on('pointerupoutside', () => {
        if (this.isDragging) {
          this.isDragging = false;
          this.app.canvas.style.cursor = 'default';
          this.onPanEnd?.();
        }
      });
    }

    // Click handling (non-drag clicks)
    let clickDownX = 0;
    let clickDownY = 0;
    
    this.app.stage.on('pointerdown', (e) => {
      if (e.button === 0) {  // Left click
        clickDownX = e.global.x;
        clickDownY = e.global.y;
      }
    });

    this.app.stage.on('pointerup', (e) => {
      if (e.button === 0) {
        const dx = Math.abs(e.global.x - clickDownX);
        const dy = Math.abs(e.global.y - clickDownY);
        // If mouse didn't move much, it's a click
        if (dx < 5 && dy < 5) {
          this.onClick?.(e.global.x, e.global.y);
        }
      }
    });
  }

  /**
   * Set container offset (for panning)
   */
  setOffset(x: number, y: number): void {
    this.rootContainer.x = x;
    this.rootContainer.y = y;
  }

  /**
   * Get container offset
   */
  getOffset(): { x: number; y: number } {
    return { x: this.rootContainer.x, y: this.rootContainer.y };
  }

  /**
   * Render a map with depth-sorted tiles
   * Only clears tile graphics, keeps containers intact
   */
  renderMap(map: Map): void {
    this.currentMap = map;
    
    // Clear only tile graphics from mapContainer
    const tilesToRemove = this.mapContainer.children.filter(
      child => child instanceof Sprite || child instanceof Graphics
    );
    tilesToRemove.forEach(child => this.mapContainer.removeChild(child));
    this.tileGraphics.clear();

    // Get all tiles sorted by depth
    const tiles = map.getAllTiles();

    // Render each tile
    for (const tile of tiles) {
      this.renderTile(tile);
    }

    // Ensure highlight and debug containers are on top
    this.bringContainersToFront();
  }

  /**
   * Re-render with current settings
   */
  rerender(): void {
    if (this.currentMap) {
      this.renderMap(this.currentMap);
    }
  }

  /**
   * Bring highlight and debug containers to front (rendered on top)
   */
  private bringContainersToFront(): void {
    const children = this.rootContainer.children;
    const highlightIndex = children.indexOf(this.highlightContainer);
    const debugIndex = children.indexOf(this.debugContainer);
    
    // Move to end if not already there
    if (highlightIndex >= 0 && highlightIndex !== children.length - 2) {
      this.rootContainer.setChildIndex(this.highlightContainer, children.length - 2);
    }
    if (debugIndex >= 0 && debugIndex !== children.length - 1) {
      this.rootContainer.setChildIndex(this.debugContainer, children.length - 1);
    }
  }

  /**
   * Toggle debug overlay
   */
  toggleDebugOverlay(show?: boolean): void {
    this.showDebugOverlay = show ?? !this.showDebugOverlay;
    console.log('[IsoRenderer] Debug overlay:', this.showDebugOverlay ? 'ON' : 'OFF');
  }

  /**
   * Check if debug overlay is visible
   */
  isDebugOverlayVisible(): boolean {
    return this.showDebugOverlay;
  }

  /**
   * Render a single tile
   */
  private renderTile(tile: Tile): void {
    const screenPos = this.isoMath.tileToScreen(tile.position);
    const { tileWidth, tileHeight } = this.config;
    
    const graphics = new Graphics();
    
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

    // Show tile bounds if enabled
    if (this.showTileBounds) {
      const boundsGraphics = new Graphics();
      boundsGraphics.moveTo(0, 0);
      boundsGraphics.lineTo(tileWidth / 2, tileHeight / 2);
      boundsGraphics.lineTo(0, tileHeight);
      boundsGraphics.lineTo(-tileWidth / 2, tileHeight / 2);
      boundsGraphics.closePath();
      boundsGraphics.stroke({ width: 2, color: 0xff00ff, alpha: 0.8 });
      boundsGraphics.x = screenPos.x;
      boundsGraphics.y = screenPos.y;
      this.mapContainer.addChild(boundsGraphics);
    }

    // Show grid markers if enabled
    if (this.showGridMarkers) {
      const markerGraphics = new Graphics();
      markerGraphics.moveTo(-5, tileHeight / 2);
      markerGraphics.lineTo(5, tileHeight / 2);
      markerGraphics.moveTo(0, tileHeight / 2 - 5);
      markerGraphics.lineTo(0, tileHeight / 2 + 5);
      markerGraphics.stroke({ width: 1, color: 0xffff00, alpha: 0.6 });
      markerGraphics.x = screenPos.x;
      markerGraphics.y = screenPos.y;
      this.mapContainer.addChild(markerGraphics);
    }

    // Show tile dots if enabled
    if (this.showTileDots) {
      const dotGraphics = new Graphics();
      dotGraphics.circle(0, tileHeight / 2, 3);
      dotGraphics.fill({ color: 0x00ff00, alpha: 0.8 });
      dotGraphics.x = screenPos.x;
      dotGraphics.y = screenPos.y;
      this.mapContainer.addChild(dotGraphics);
    }
  }

  /**
   * Highlight a tile (for mouse hover)
   * Rendered in local coordinates (same as mapContainer)
   */
  highlightTile(tile: Tile): void {
    this.highlightContainer.removeChildren();

    const screenPos = this.isoMath.tileToScreen(tile.position);
    const { tileWidth, tileHeight } = this.config;

    const graphics = new Graphics();
    
    // Highlight diamond
    graphics.moveTo(screenPos.x, screenPos.y);
    graphics.lineTo(screenPos.x + tileWidth / 2, screenPos.y + tileHeight / 2);
    graphics.lineTo(screenPos.x, screenPos.y + tileHeight);
    graphics.lineTo(screenPos.x - tileWidth / 2, screenPos.y + tileHeight / 2);
    graphics.closePath();

    graphics.fill({ color: 0xffff00, alpha: 0.5 });
    graphics.stroke({ width: 2, color: 0xffffff });

    this.highlightContainer.addChild(graphics);
  }

  /**
   * Clear highlight
   */
  clearHighlight(): void {
    this.highlightContainer.removeChildren();
  }

  /**
   * Render debug overlay
   */
  renderDebugOverlay(map: Map): void {
    if (!this.showDebugOverlay) {
      this.debugContainer.removeChildren();
      return;
    }

    this.debugContainer.removeChildren();
    const graphics = new Graphics();
    const { tileWidth, tileHeight } = this.config;

    // 1. Draw origin point (0,0)
    const originPos = this.isoMath.tileToScreen({ x: 0, y: 0, z: 0 });
    graphics.circle(originPos.x, originPos.y, 6);
    graphics.fill({ color: 0xff0000 });
    graphics.stroke({ width: 2, color: 0xffffff });

    const originLabel = new Text('(0,0)', {
      fontSize: 11,
      fill: 0xff0000,
      fontFamily: 'Consolas, monospace',
      fontWeight: 'bold',
    });
    originLabel.x = originPos.x + 10;
    originLabel.y = originPos.y - 5;
    this.debugContainer.addChild(originLabel);

    // 2. Draw grid vertices
    const maxTile = map ? Math.max(map.config.width, map.config.height) : 50;
    for (let y = 0; y <= maxTile; y++) {
      for (let x = 0; x <= maxTile; x++) {
        const screenPos = this.isoMath.tileToScreen({ x, y, z: 0 });
        graphics.circle(screenPos.x, screenPos.y, 2);
        graphics.fill({ color: 0x00ff00 });
      }
    }

    // 3. Draw coordinate labels
    const renderRange = map ? Math.max(map.config.width, map.config.height) : 10;
    for (let y = 0; y < renderRange; y++) {
      for (let x = 0; x < renderRange; x++) {
        const screenPos = this.isoMath.tileToScreen({ x, y, z: 0 });
        
        const label = new Text(`${x},${y}`, {
          fontSize: 10,
          fill: 0xffff00,
          fontFamily: 'Consolas, monospace',
        });
        label.anchor.set(0.5, 0.5);
        label.x = screenPos.x;
        label.y = screenPos.y + tileHeight / 2;
        this.debugContainer.addChild(label);
      }
    }

    // 4. Draw axis indicators
    const xAxisEnd = this.isoMath.tileToScreen({ x: 1, y: 0, z: 0 });
    const yAxisEnd = this.isoMath.tileToScreen({ x: 0, y: 1, z: 0 });
    
    graphics.moveTo(originPos.x, originPos.y);
    graphics.lineTo(xAxisEnd.x, xAxisEnd.y);
    graphics.stroke({ width: 2, color: 0xff0000, alpha: 0.6 });
    
    graphics.moveTo(originPos.x, originPos.y);
    graphics.lineTo(yAxisEnd.x, yAxisEnd.y);
    graphics.stroke({ width: 2, color: 0x00ff00, alpha: 0.6 });

    const xLabel = new Text('X+', { fontSize: 9, fill: 0xff8888 });
    xLabel.x = xAxisEnd.x + 8;
    xLabel.y = xAxisEnd.y - 5;
    this.debugContainer.addChild(xLabel);

    const yLabel = new Text('Y+', { fontSize: 9, fill: 0x88ff88 });
    yLabel.x = yAxisEnd.x - 20;
    yLabel.y = yAxisEnd.y + 15;
    this.debugContainer.addChild(yLabel);

    this.debugContainer.addChild(graphics);
  }

  /**
   * Get tile under screen position
   * Automatically adjusts for rootContainer offset
   */
  getTileAtScreen(screenX: number, screenY: number, map: Map, z: number = 0): Tile | null {
    // Adjust for rootContainer offset
    const adjustedX = screenX - this.rootContainer.x;
    const adjustedY = screenY - this.rootContainer.y;

    const tilePos = this.isoMath.screenToTile({ x: adjustedX, y: adjustedY }, z);
    
    // Check all Z layers from top to bottom
    for (let checkZ = map.config.high - 1; checkZ >= 0; checkZ--) {
      if (map.isValidPosition(tilePos.x, tilePos.y, checkZ)) {
        const tile = map.getTile(tilePos.x, tilePos.y, checkZ);
        if (tile && tile.frame !== 0) {
          return tile;
        }
      }
    }
    
    if (map.isValidPosition(tilePos.x, tilePos.y, z)) {
      return map.getTile(tilePos.x, tilePos.y, z);
    }
    
    return null;
  }

  /**
   * Get tile at specific Z layer
   */
  getTileAtScreenZ(screenX: number, screenY: number, map: Map, z: number): Tile | null {
    const adjustedX = screenX - this.rootContainer.x;
    const adjustedY = screenY - this.rootContainer.y;
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
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    this.app.destroy();
  }

  // === Input Callbacks ===

  /**
   * Set pan start callback
   */
  onPanStart(callback: (x: number, y: number) => void): void {
    this.onPanStart = callback;
  }

  /**
   * Set pan move callback
   */
  onPanMove(callback: (dx: number, dy: number, x: number, y: number) => void): void {
    this.onPanMove = callback;
  }

  /**
   * Set pan end callback
   */
  onPanEnd(callback: () => void): void {
    this.onPanEnd = callback;
  }

  /**
   * Set click callback (left click, non-drag)
   */
  onClick(callback: (x: number, y: number) => void): void {
    this.onClick = callback;
  }

  // === Keyboard Helpers ===

  /**
   * Setup keyboard handler with common controls
   * Returns cleanup function
   */
  setupKeyboard(
    handlers: {
      onMove?: (dx: number, dy: number, dz: number) => void;
      onKey?: (key: string, e: KeyboardEvent) => void;
    }
  ): () => void {
    const keyHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Movement keys (WASD + QE)
      if (handlers.onMove) {
        let dx = 0, dy = 0, dz = 0;
        
        if (key === 'w' || key === 'arrowup') dy = -1;
        if (key === 's' || key === 'arrowdown') dy = 1;
        if (key === 'a' || key === 'arrowleft') dx = -1;
        if (key === 'd' || key === 'arrowright') dx = 1;
        if (key === 'q') dz = -1;
        if (key === 'e') dz = 1;
        
        if (dx !== 0 || dy !== 0 || dz !== 0) {
          handlers.onMove(dx, dy, dz);
        }
      }
      
      // Custom key handler
      handlers.onKey?.(key, e);
    };

    window.addEventListener('keydown', keyHandler);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', keyHandler);
    };
  }

  /**
   * Check if currently dragging
   */
  isDraggingNow(): boolean {
    return this.isDragging;
  }

  /**
   * Get last mouse position
   */
  getLastMousePosition(): { x: number; y: number } {
    return { x: this.lastMouseX, y: this.lastMouseY };
  }

  // === Debug Settings ===

  /**
   * Set debug display settings
   */
  setDebugSettings(settings: {
    showGridMarkers?: boolean;
    showTileDots?: boolean;
    showTileBounds?: boolean;
  }): void {
    if (settings.showGridMarkers !== undefined) {
      this.showGridMarkers = settings.showGridMarkers;
    }
    if (settings.showTileDots !== undefined) {
      this.showTileDots = settings.showTileDots;
    }
    if (settings.showTileBounds !== undefined) {
      this.showTileBounds = settings.showTileBounds;
    }
  }

  /**
   * Get current debug settings
   */
  getDebugSettings(): {
    showGridMarkers: boolean;
    showTileDots: boolean;
    showTileBounds: boolean;
  } {
    return {
      showGridMarkers: this.showGridMarkers,
      showTileDots: this.showTileDots,
      showTileBounds: this.showTileBounds,
    };
  }
}
