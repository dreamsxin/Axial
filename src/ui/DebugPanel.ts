/**
 * Debug Panel - Reusable UI component for isometric demo debugging
 * 
 * Usage:
 *   const panel = new DebugPanel(renderer, map);
 *   panel.init();
 */

import type { IsoRenderer } from '../render/IsoRenderer';
import type { Map } from '../core/Map';
import type { Tile } from '../core/Tile';
import { Graphics, Text } from 'pixi.js';

export interface DebugPanelConfig {
  showGridMarkers?: boolean;
  showTileDots?: boolean;
  showTileBounds?: boolean;
  showLayerInfo?: boolean;
  showAxes?: boolean;  // Show X,Y,Z axis indicators
  showGrid?: boolean;  // Show grid lines (independent of map tiles)
  title?: string;
  layerColors?: string[];  // Custom colors for each Z layer
  layerSizes?: Array<{ width: number; height: number }>;  // Custom size per layer
}

export class DebugPanel {
  private renderer: IsoRenderer;
  private map: Map;
  private config: Required<DebugPanelConfig>;
  
  // DOM elements
  private panel: HTMLElement | null = null;
  private chkGridLines: HTMLInputElement | null = null;  // Show grid lines
  private chkGrid: HTMLInputElement | null = null;       // Grid markers
  private chkCoords: HTMLInputElement | null = null;
  private chkBounds: HTMLInputElement | null = null;
  private chkAxes: HTMLInputElement | null = null;
  private mouseScreenEl: HTMLElement | null = null;
  private mouseWorldEl: HTMLElement | null = null;
  private mouseZEl: HTMLElement | null = null;
  private tileInfoEl: HTMLElement | null = null;
  private cursorZDisplay: HTMLElement | null = null;
  private layerInfoEl: HTMLElement | null = null;

  // State
  private cursorX = 0;
  private cursorY = 0;
  private cursorZ = 0;

  // Default layer colors (distinct for each Z level)
  private static DEFAULT_LAYER_COLORS = ['#4a90a4', '#ff69b4', '#4aa44a', '#a44a4a', '#aaa44a'];

  constructor(renderer: IsoRenderer, map: Map, config: DebugPanelConfig = {}) {
    this.renderer = renderer;
    this.map = map;
    this.config = {
      showGridMarkers: config.showGridMarkers ?? true,
      showTileDots: config.showTileDots ?? true,
      showTileBounds: config.showTileBounds ?? false,
      showLayerInfo: config.showLayerInfo ?? true,
      showAxes: config.showAxes ?? false,
      showGrid: config.showGrid ?? false,
      title: config.title ?? '🔧 Debug',
      layerColors: config.layerColors ?? DebugPanel.DEFAULT_LAYER_COLORS,
      layerSizes: config.layerSizes ?? [],
    };
  }

  /**
   * Initialize the debug panel (call after DOM is ready)
   */
  init(): void {
    console.log('[DebugPanel] init() called');
    
    this.createPanel();
    this.setupEventListeners();
    this.updateCursorHighlight();
    
    // Set initial checkbox states (don't trigger render, event listeners will handle it)
    if (this.chkGridLines) {
      this.chkGridLines.checked = this.config.showGrid;
    }
    if (this.chkAxes) {
      this.chkAxes.checked = this.config.showAxes;
    }
    
    // Initial render after a short delay (only once)
    setTimeout(() => {
      if (this.config.showGrid && this.chkGridLines?.checked) {
        this.renderGridLines();
      }
      if (this.config.showAxes && this.chkAxes?.checked) {
        this.renderAxes();
      }
    }, 100);
  }

  /**
   * Create the debug panel DOM
   */
  private createPanel(): void {
    // Main debug panel
    this.panel = document.createElement('div');
    this.panel.id = 'debug-panel';
    this.panel.innerHTML = `
      <h2>${this.config.title}</h2>
      <hr style="border: 0; border-top: 1px solid #333; margin: 8px 0;" />
      <label style="display: flex; align-items: center; gap: 8px; margin: 5px 0;">
        <input type="checkbox" id="chk-grid-lines" ${this.config.showGrid ? 'checked' : ''} />
        <span>Show Grid</span>
      </label>
      <label style="display: flex; align-items: center; gap: 8px; margin: 5px 0;">
        <input type="checkbox" id="chk-grid" ${this.config.showGridMarkers ? 'checked' : ''} />
        <span>Grid Markers</span>
      </label>
      <label style="display: flex; align-items: center; gap: 8px; margin: 5px 0;">
        <input type="checkbox" id="chk-coords" ${this.config.showTileDots ? 'checked' : ''} />
        <span>Tile Dots</span>
      </label>
      <label style="display: flex; align-items: center; gap: 8px; margin: 5px 0;">
        <input type="checkbox" id="chk-bounds" ${this.config.showTileBounds ? 'checked' : ''} />
        <span>Tile Bounds</span>
      </label>
      <label style="display: flex; align-items: center; gap: 8px; margin: 5px 0;">
        <input type="checkbox" id="chk-axes" ${this.config.showAxes ? 'checked' : ''} />
        <span>Show Axes</span>
      </label>
      <hr style="border: 0; border-top: 1px solid #333; margin: 8px 0;" />
      <p style="font-size: 11px; color: #666;">Mouse: <span id="mouse-screen">--</span></p>
      <p style="font-size: 11px; color: #666;">World: <span id="mouse-world">--</span></p>
      <p style="font-size: 11px; color: #f0a500;">Detected Z: <span id="mouse-z">--</span></p>
      <p style="font-size: 11px; color: #aaa;">Tile: <span id="tile-info">--</span></p>
    `;

    // Add styles if not already present
    if (!document.getElementById('debug-panel-styles')) {
      const style = document.createElement('style');
      style.id = 'debug-panel-styles';
      style.textContent = `
        #debug-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          min-width: 180px;
          font-family: 'Segoe UI', sans-serif;
          color: #fff;
          z-index: 1000;
        }
        #debug-panel h2 {
          font-size: 14px;
          margin: 0 0 8px 0;
          color: #f0a500;
        }
        #debug-panel label {
          cursor: pointer;
          user-select: none;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 5px 0;
        }
        #debug-panel input[type="checkbox"] {
          cursor: pointer;
        }
        #debug-panel p {
          margin: 4px 0;
          font-family: 'Consolas', monospace;
          font-size: 11px;
        }
        #layer-info {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
          font-family: 'Segoe UI', sans-serif;
          color: #fff;
          z-index: 1000;
        }
        #layer-info h3 {
          font-size: 13px;
          margin-bottom: 8px;
          color: #4a90a4;
        }
        .layer-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 4px 0;
          font-size: 11px;
        }
        .layer-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.panel);

    // Cache DOM elements
    this.chkGridLines = document.getElementById('chk-grid-lines') as HTMLInputElement;
    this.chkGrid = document.getElementById('chk-grid') as HTMLInputElement;
    this.chkCoords = document.getElementById('chk-coords') as HTMLInputElement;
    this.chkBounds = document.getElementById('chk-bounds') as HTMLInputElement;
    this.chkAxes = document.getElementById('chk-axes') as HTMLInputElement;
    this.mouseScreenEl = document.getElementById('mouse-screen');
    this.mouseWorldEl = document.getElementById('mouse-world');
    this.mouseZEl = document.getElementById('mouse-z');
    this.tileInfoEl = document.getElementById('tile-info');

    // Create layer info panel if enabled
    if (this.config.showLayerInfo) {
      this.createLayerInfo();
    }
  }

  /**
   * Create layer info panel
   */
  private createLayerInfo(): void {
    this.layerInfoEl = document.createElement('div');
    this.layerInfoEl.id = 'layer-info';
    
    // Count actual tiles per layer
    const layerTileCounts = new Map<number, number>();
    for (let z = 0; z < this.map.config.high; z++) {
      layerTileCounts.set(z, 0);
    }
    
    for (let z = 0; z < this.map.config.high; z++) {
      for (let y = 0; y < this.map.config.height; y++) {
        for (let x = 0; x < this.map.config.width; x++) {
          const tile = this.map.getTile(x, y, z);
          if (tile && tile.frame !== 0) {
            layerTileCounts.set(z, (layerTileCounts.get(z) || 0) + 1);
          }
        }
      }
    }
    
    // Generate layer rows
    let layerRows = '';
    for (let z = 0; z < this.map.config.high; z++) {
      const color = this.config.layerColors[z % this.config.layerColors.length];
      const tileCount = layerTileCounts.get(z) || 0;
      
      // Show actual tile count if different from full grid
      const sizeInfo = this.config.layerSizes[z] 
        ? `${this.config.layerSizes[z].width}×${this.config.layerSizes[z].height}`
        : tileCount > 0 && tileCount < this.map.config.width * this.map.config.height
          ? `${tileCount} tiles`
          : `${this.map.config.width}×${this.map.config.height}`;
      
      layerRows += `
        <div class="layer-row">
          <div class="layer-color" style="background: ${color};"></div>
          <span>Layer Z=${z} - ${sizeInfo}</span>
        </div>
      `;
    }

    this.layerInfoEl.innerHTML = `
      <h3>📊 Layers</h3>
      ${layerRows}
      <div class="layer-row" style="margin-top: 8px;">
        <span>Cursor Z: <strong id="cursor-z-display" style="color: #ffff00;">0</strong></span>
      </div>
    `;

    document.body.appendChild(this.layerInfoEl);
    this.cursorZDisplay = document.getElementById('cursor-z-display');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.chkGridLines?.addEventListener('change', () => {
      this.renderGridLines();
    });
    
    this.chkGrid?.addEventListener('change', () => {
      this.onSettingsChange();
    });
    
    this.chkCoords?.addEventListener('change', () => {
      this.onSettingsChange();
    });
    
    this.chkBounds?.addEventListener('change', () => {
      this.onSettingsChange();
    });
    
    this.chkAxes?.addEventListener('change', () => {
      this.renderAxes();
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.cursorY = Math.max(0, this.cursorY - 1);
          break;
        case 's':
        case 'arrowdown':
          this.cursorY = Math.min(this.map.config.height - 1, this.cursorY + 1);
          break;
        case 'a':
        case 'arrowleft':
          this.cursorX = Math.max(0, this.cursorX - 1);
          break;
        case 'd':
        case 'arrowright':
          this.cursorX = Math.min(this.map.config.width - 1, this.cursorX + 1);
          break;
        case 'q':
          this.cursorZ = Math.max(0, this.cursorZ - 1);
          break;
        case 'e':
          this.cursorZ = Math.min(this.map.config.high - 1, this.cursorZ + 1);
          break;
        case 'x':
          // Toggle axes
          if (this.chkAxes) {
            this.chkAxes.checked = !this.chkAxes.checked;
            this.renderAxes();
          }
          break;
      }
      this.updateCursorHighlight();
    });
  }

  /**
   * Called when debug settings change (grid, coords, bounds)
   */
  private onSettingsChange(): void {
    // Sync settings to renderer
    this.renderer.setDebugSettings({
      showGridMarkers: this.chkGrid?.checked ?? false,
      showTileDots: this.chkCoords?.checked ?? false,
      showTileBounds: this.chkBounds?.checked ?? false,
    });
    
    console.log('[DebugPanel] Settings changed:', {
      grid: this.chkGrid?.checked,
      coords: this.chkCoords?.checked,
      bounds: this.chkBounds?.checked,
    });
  }

  /**
   * Get current checkbox states
   */
  getSettings(): {
    showGrid: boolean;
    showGridMarkers: boolean;
    showTileDots: boolean;
    showTileBounds: boolean;
    showAxes: boolean;
  } {
    return {
      showGrid: this.chkGridLines?.checked ?? false,
      showGridMarkers: this.chkGrid?.checked ?? false,
      showTileDots: this.chkCoords?.checked ?? false,
      showTileBounds: this.chkBounds?.checked ?? false,
      showAxes: this.chkAxes?.checked ?? false,
    };
  }

  /**
   * Update cursor highlight and tile info
   */
  updateCursorHighlight(): void {
    const tile = this.map.getTile(this.cursorX, this.cursorY, this.cursorZ);
    if (tile) {
      this.renderer.highlightTile(tile);
      this.updateTileInfo(this.cursorX, this.cursorY, this.cursorZ, tile);
    }
    if (this.cursorZDisplay) {
      this.cursorZDisplay.textContent = this.cursorZ.toString();
    }
  }

  /**
   * Update tile info display
   */
  private updateTileInfo(x: number, y: number, z: number, tile: Tile): void {
    if (this.tileInfoEl) {
      const walkableColor = tile.walkable ? '#4a90a4' : '#8b4513';
      this.tileInfoEl.innerHTML = `
        <strong style="color:#fff">(${x}, ${y}, ${z})</strong> | 
        Walkable: <strong style="color:${walkableColor}">${tile.walkable}</strong> | 
        Frame: ${tile.frame}
      `;
    }
  }

  /**
   * Update mouse position display
   */
  updateMouseDisplay(screenX: number, screenY: number, tileX: number, tileY: number, detectedZ: number | string): void {
    if (this.mouseScreenEl) {
      this.mouseScreenEl.textContent = `(${Math.round(screenX)}, ${Math.round(screenY)})`;
    }
    if (this.mouseWorldEl) {
      this.mouseWorldEl.textContent = `(${tileX}, ${tileY}, ${this.cursorZ})`;
    }
    if (this.mouseZEl) {
      this.mouseZEl.textContent = detectedZ.toString();
    }
  }

  /**
   * Set cursor position
   */
  setCursor(x: number, y: number, z: number): void {
    this.cursorX = x;
    this.cursorY = y;
    this.cursorZ = z;
    this.updateCursorHighlight();
  }

  /**
   * Get cursor position
   */
  getCursor(): { x: number; y: number; z: number } {
    return { x: this.cursorX, y: this.cursorY, z: this.cursorZ };
  }

  /**
   * Get checkbox states
   */
  getDebugState(): { grid: boolean; coords: boolean; bounds: boolean } {
    return {
      grid: this.chkGrid?.checked ?? false,
      coords: this.chkCoords?.checked ?? false,
      bounds: this.chkBounds?.checked ?? false,
    };
  }

  /**
   * Render grid lines (independent of map tiles, covers entire world)
   */
  renderGridLines(): void {
    console.log('[DebugPanel] renderGridLines called, checked:', this.chkGridLines?.checked);
    
    // Clear existing grid lines
    const existingGrid = this.renderer.debugContainer.getChildByLabel('gridLines');
    if (existingGrid) {
      existingGrid.destroy({ children: true });
    }

    if (!this.chkGridLines?.checked) {
      console.log('[DebugPanel] Grid lines not checked, skipping');
      return;
    }

    const graphics = new Graphics();
    graphics.label = 'gridLines';
    
    // Use map dimensions, or default to large grid
    const width = this.map.config.width;
    const height = this.map.config.height;
    const { tileWidth, tileHeight } = this.renderer.config;

    // Draw grid lines along X axis (vertical in isometric view)
    for (let x = 0; x <= width; x++) {
      const start = this.renderer.isoMath.tileToScreen({ x, y: 0, z: 0 });
      const end = this.renderer.isoMath.tileToScreen({ x, y: height, z: 0 });
      
      graphics.moveTo(start.x, start.y);
      graphics.lineTo(end.x, end.y);
    }

    // Draw grid lines along Y axis (horizontal in isometric view)
    for (let y = 0; y <= height; y++) {
      const start = this.renderer.isoMath.tileToScreen({ x: 0, y, z: 0 });
      const end = this.renderer.isoMath.tileToScreen({ x: width, y, z: 0 });
      
      graphics.moveTo(start.x, start.y);
      graphics.lineTo(end.x, end.y);
    }

    // Style - subtle grid
    graphics.stroke({ width: 1, color: 0x444466, alpha: 0.4 });

    this.renderer.debugContainer.addChild(graphics);
    console.log('[DebugPanel] Grid lines rendered:', width, '×', height);
  }

  /**
   * Render axis indicators (public method for external calls)
   */
  renderAxes(): void {
    console.log('[DebugPanel] renderAxes called, checked:', this.chkAxes?.checked);
    
    // Clear existing axes from debugContainer
    this.renderer.debugContainer.removeChildren();

    if (!this.chkAxes?.checked) {
      console.log('[DebugPanel] Axes checkbox not checked, skipping');
      return;
    }

    const graphics = new Graphics();
    // Get origin position in rootContainer coordinates (same as mapContainer)
    const originPos = this.renderer.isoMath.tileToScreen({ x: 0, y: 0, z: 0 });
    const axisLength = 120;

    console.log('[DebugPanel] Origin position in rootContainer:', originPos.x, originPos.y);
    console.log('[DebugPanel] rootContainer offset:', this.renderer.getOffset().x, this.renderer.getOffset().y);

    // X axis (red) - points right-down in isometric view
    const xAxisEnd = this.renderer.isoMath.tileToScreen({ x: 4, y: 0, z: 0 });
    const xEndX = originPos.x + (xAxisEnd.x - originPos.x) * 3;
    const xEndY = originPos.y + (xAxisEnd.y - originPos.y) * 3;
    
    graphics.moveTo(originPos.x, originPos.y);
    graphics.lineTo(xEndX, xEndY);
    graphics.stroke({ width: 3, color: 0xff4444, alpha: 0.9 });
    
    // X axis arrow - perpendicular to axis direction
    const xAngle = Math.atan2(xEndY - originPos.y, xEndX - originPos.x);
    const xArrowSize = 10;
    const xArrowAngle1 = xAngle - Math.PI / 6;  // 30 degrees
    const xArrowAngle2 = xAngle + Math.PI / 6;
    graphics.moveTo(xEndX, xEndY);
    graphics.lineTo(
      xEndX - xArrowSize * Math.cos(xArrowAngle1),
      xEndY - xArrowSize * Math.sin(xArrowAngle1)
    );
    graphics.moveTo(xEndX, xEndY);
    graphics.lineTo(
      xEndX - xArrowSize * Math.cos(xArrowAngle2),
      xEndY - xArrowSize * Math.sin(xArrowAngle2)
    );
    graphics.stroke({ width: 2, color: 0xff4444, alpha: 0.9 });

    // Y axis (green) - points left-down in isometric view
    const yAxisEnd = this.renderer.isoMath.tileToScreen({ x: 0, y: 4, z: 0 });
    const yEndX = originPos.x + (yAxisEnd.x - originPos.x) * 3;
    const yEndY = originPos.y + (yAxisEnd.y - originPos.y) * 3;
    
    graphics.moveTo(originPos.x, originPos.y);
    graphics.lineTo(yEndX, yEndY);
    graphics.stroke({ width: 3, color: 0x44ff44, alpha: 0.9 });
    
    // Y axis arrow - perpendicular to axis direction
    const yAngle = Math.atan2(yEndY - originPos.y, yEndX - originPos.x);
    const yArrowSize = 10;
    const yArrowAngle1 = yAngle - Math.PI / 6;
    const yArrowAngle2 = yAngle + Math.PI / 6;
    graphics.moveTo(yEndX, yEndY);
    graphics.lineTo(
      yEndX - yArrowSize * Math.cos(yArrowAngle1),
      yEndY - yArrowSize * Math.sin(yArrowAngle1)
    );
    graphics.moveTo(yEndX, yEndY);
    graphics.lineTo(
      yEndX - yArrowSize * Math.cos(yArrowAngle2),
      yEndY - yArrowSize * Math.sin(yArrowAngle2)
    );
    graphics.stroke({ width: 2, color: 0x44ff44, alpha: 0.9 });

    // Z axis (blue) - points straight up in screen space
    const zEndY = originPos.y - axisLength;
    graphics.moveTo(originPos.x, originPos.y);
    graphics.lineTo(originPos.x, zEndY);
    graphics.stroke({ width: 3, color: 0x4444ff, alpha: 0.9 });
    
    // Z axis arrow - same size as X/Y axes (10px)
    const zAngle = -Math.PI / 2;  // Pointing up (-90 degrees)
    const zArrowSize = 10;  // Same as X/Y axes
    const zArrowAngle1 = zAngle - Math.PI / 6;
    const zArrowAngle2 = zAngle + Math.PI / 6;
    graphics.moveTo(originPos.x, zEndY);
    graphics.lineTo(
      originPos.x - zArrowSize * Math.cos(zArrowAngle1),
      zEndY - zArrowSize * Math.sin(zArrowAngle1)
    );
    graphics.moveTo(originPos.x, zEndY);
    graphics.lineTo(
      originPos.x - zArrowSize * Math.cos(zArrowAngle2),
      zEndY - zArrowSize * Math.sin(zArrowAngle2)
    );
    graphics.stroke({ width: 2, color: 0x4444ff, alpha: 0.9 });

    this.renderer.debugContainer.addChild(graphics);

    // Labels
    const xLabel = new Text('X', {
      fontSize: 16,
      fill: 0xff4444,
      fontFamily: 'Consolas, monospace',
      fontWeight: 'bold',
    });
    xLabel.anchor.set(0, 0.5);
    xLabel.x = xEndX + 15;
    xLabel.y = xEndY;
    this.renderer.debugContainer.addChild(xLabel);

    const yLabel = new Text('Y', {
      fontSize: 16,
      fill: 0x44ff44,
      fontFamily: 'Consolas, monospace',
      fontWeight: 'bold',
    });
    yLabel.anchor.set(1, 0.5);
    yLabel.x = yEndX - 15;
    yLabel.y = yEndY + 20;
    this.renderer.debugContainer.addChild(yLabel);

    const zLabel = new Text('Z', {
      fontSize: 16,
      fill: 0x4444ff,
      fontFamily: 'Consolas, monospace',
      fontWeight: 'bold',
    });
    zLabel.anchor.set(0.5, 1);
    zLabel.x = originPos.x;
    zLabel.y = zEndY - 15;
    this.renderer.debugContainer.addChild(zLabel);

    console.log('[DebugPanel] Axes rendered successfully at origin:', originPos.x, originPos.y);
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    this.panel?.remove();
    this.layerInfoEl?.remove();
    const styles = document.getElementById('debug-panel-styles');
    styles?.remove();
  }
}
