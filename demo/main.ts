/**
 * Axial V2 - Phase 1 Demo (Updated)
 * Interactive isometric grid with mouse hover/click + debug visualization
 */

import { IsoRenderer } from '../src/render/IsoRenderer';
import { Map } from '../src/core/Map';
import { Tile } from '../src/core/Tile';
import { IsoMath } from '../src/math/IsoMath';
import { Graphics, Text } from 'pixi.js';

// Create renderer
const renderer = new IsoRenderer({
  width: window.innerWidth,
  height: window.innerHeight,
  tileWidth: 64,
  tileHeight: 32,
  tileHigh: 10,
  backgroundColor: 0x1a1a2e,
});

// Create map (50x50x2 layers)
const map = new Map({ width: 50, height: 50, high: 2 });

// Generate sample terrain with different patterns per layer
function generateTerrain(): void {
  const frames: number[] = [];
  
  for (let z = 0; z < 2; z++) {
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        if (z === 0) {
          // Ground layer: full 50x50 walkable area
          frames.push(7); // Walkable ground
        } else {
          // Upper layer: smaller floating platform (18x18)
          if (x > 15 && x < 34 && y > 15 && y < 34) {
            frames.push(1); // Walkable upper tile
          } else {
            frames.push(0); // Empty
          }
        }
      }
    }
  }

  map.loadFromFrames(frames);
}

// Keyboard cursor
let cursorX = 25;
let cursorY = 25;
let cursorZ = 0;

// Pan/drag state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// UI Elements
const chkGrid = document.getElementById('chk-grid') as HTMLInputElement;
const chkCoords = document.getElementById('chk-coords') as HTMLInputElement;
const chkBounds = document.getElementById('chk-bounds') as HTMLInputElement;
const mouseScreenEl = document.getElementById('mouse-screen');
const mouseWorldEl = document.getElementById('mouse-world');
const mouseZEl = document.getElementById('mouse-z');
const tileInfoEl = document.getElementById('tile-info');
const cursorZDisplay = document.getElementById('cursor-z-display');

function updateCursorHighlight(): void {
  const tile = map.getTile(cursorX, cursorY, cursorZ);
  if (tile) {
    renderer.highlightTile(tile);
    updateTileInfo(cursorX, cursorY, cursorZ, tile);
  }
  if (cursorZDisplay) {
    cursorZDisplay.textContent = cursorZ.toString();
  }
}

function updateTileInfo(x: number, y: number, z: number, tile: Tile): void {
  if (tileInfoEl) {
    const walkableColor = tile.walkable ? '#4a90a4' : '#8b4513';
    tileInfoEl.innerHTML = `Tile: <strong style="color:#fff">(${x}, ${y}, ${z})</strong> | Walkable: <strong style="color:${walkableColor}">${tile.walkable}</strong> | Frame: ${tile.frame}`;
  }
}

// Custom renderer that shows different colors per Z layer
class DebugIsoRenderer extends IsoRenderer {
  renderMapWithLayerColors(map: Map): void {
    this.currentMap = map;
    
    // Clear existing tiles
    this.mapContainer.removeChildren();
    this.debugContainer.removeChildren();
    this.tileGraphics.clear();

    // Get all tiles sorted by depth
    const tiles = map.getAllTiles();

    // Render each tile with layer-specific colors
    for (const tile of tiles) {
      this.renderColoredTile(tile);
    }
  }

  private renderColoredTile(tile: Tile): void {
    const screenPos = this.isoMath.tileToScreen(tile.position);
    const { tileWidth, tileHeight } = this.config;
    
    const graphics = new Graphics();
    
    // Diamond shape
    graphics.moveTo(0, 0);
    graphics.lineTo(tileWidth / 2, tileHeight / 2);
    graphics.lineTo(0, tileHeight);
    graphics.lineTo(-tileWidth / 2, tileHeight / 2);
    graphics.closePath();

    // Different colors for different Z layers
    let baseColor: number;
    if (tile.position.z === 0) {
      baseColor = 0x4a90a4; // Blue-teal for ground
    } else if (tile.position.z === 1) {
      baseColor = 0xa44a90; // Purple for upper layer
    } else {
      baseColor = 0x4a90a4;
    }

    const alpha = tile.walkable ? 0.85 : 0.4;
    graphics.fill({ color: baseColor, alpha });
    graphics.stroke({ width: 1, color: 0xffffff, alpha: 0.4 });

    graphics.x = screenPos.x;
    graphics.y = screenPos.y;

    this.mapContainer.addChild(graphics);

    // Draw coordinate text if enabled
    if (this.showCoordinates && tile.frame !== 0) {
      const text = new Text(`${tile.position.x},${tile.position.y}`, {
        fontSize: 10,
        fill: 0xffffff,
        fontFamily: 'Consolas, monospace',
      });
      text.anchor.set(0.5, 0.5);
      text.x = 0;
      text.y = tileHeight / 2;
      
      // Semi-transparent background
      const bg = new Graphics();
      bg.rect(-14, tileHeight / 2 - 7, 28, 12).fill({ color: 0x000000, alpha: 0.5 });
      bg.x = screenPos.x;
      bg.y = screenPos.y;
      
      text.x = screenPos.x;
      text.y = screenPos.y;
      
      this.mapContainer.addChild(bg);
      this.mapContainer.addChild(text);
    }

    // Draw grid markers if enabled
    if (this.showGrid && tile.frame !== 0) {
      const gridGraphics = new Graphics();
      gridGraphics.moveTo(-5, tileHeight / 2);
      gridGraphics.lineTo(5, tileHeight / 2);
      gridGraphics.moveTo(0, tileHeight / 2 - 5);
      gridGraphics.lineTo(0, tileHeight / 2 + 5);
      gridGraphics.stroke({ width: 1, color: 0xffff00, alpha: 0.5 });
      gridGraphics.x = screenPos.x;
      gridGraphics.y = screenPos.y;
      this.mapContainer.addChild(gridGraphics);
    }
  }
}

// Use debug renderer
const debugRenderer = new DebugIsoRenderer({
  width: window.innerWidth,
  height: window.innerHeight,
  tileWidth: 64,
  tileHeight: 32,
  tileHigh: 10,
  backgroundColor: 0x1a1a2e,
});

// Initialize
async function init(): Promise<void> {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  await debugRenderer.init(container);
  generateTerrain();
  debugRenderer.renderMapWithLayerColors(map);
  updateCursorHighlight();

  // Setup debug panel checkboxes
  chkGrid?.addEventListener('change', (e) => {
    debugRenderer.setShowGrid((e.target as HTMLInputElement).checked);
    debugRenderer.renderMapWithLayerColors(map);
  });
  
  chkCoords?.addEventListener('change', (e) => {
    debugRenderer.setShowCoordinates((e.target as HTMLInputElement).checked);
    debugRenderer.renderMapWithLayerColors(map);
  });
  
  chkBounds?.addEventListener('change', (e) => {
    debugRenderer.setShowTileBounds((e.target as HTMLInputElement).checked);
    debugRenderer.renderMapWithLayerColors(map);
  });

  // Mouse interaction with debug info
  debugRenderer.app.stage.eventMode = 'static';
  debugRenderer.app.stage.hitArea = debugRenderer.app.screen;

  // Right-click drag to pan
  debugRenderer.app.stage.on('rightdown', (e) => {
    isDragging = true;
    lastMouseX = e.global.x;
    lastMouseY = e.global.y;
    debugRenderer.app.canvas.style.cursor = 'grabbing';
  });

  debugRenderer.app.stage.on('rightup', () => {
    isDragging = false;
    debugRenderer.app.canvas.style.cursor = 'default';
  });

  debugRenderer.app.stage.on('rightupoutside', () => {
    isDragging = false;
    debugRenderer.app.canvas.style.cursor = 'default';
  });

  debugRenderer.app.stage.on('globalpointermove', (e) => {
    if (isDragging) {
      const dx = e.global.x - lastMouseX;
      const dy = e.global.y - lastMouseY;
      
      debugRenderer.mapContainer.x += dx;
      debugRenderer.mapContainer.y += dy;
      
      lastMouseX = e.global.x;
      lastMouseY = e.global.y;
    }
    
    const screenX = e.global.x;
    const screenY = e.global.y;
    
    // Update screen coordinates display
    if (mouseScreenEl) {
      mouseScreenEl.textContent = `(${Math.round(screenX)}, ${Math.round(screenY)})`;
    }

    // Calculate world position at cursor Z
    const adjustedX = screenX - debugRenderer.mapContainer.x;
    const adjustedY = screenY - debugRenderer.mapContainer.y;
    const tilePos = debugRenderer.isoMath.screenToTile({ x: adjustedX, y: adjustedY }, cursorZ);
    
    // Update world coordinates display
    if (mouseWorldEl) {
      mouseWorldEl.textContent = `(${tilePos.x}, ${tilePos.y}, ${cursorZ})`;
    }

    // Get tile under mouse (auto-detect Z layer)
    const tile = debugRenderer.getTileAtScreen(screenX, screenY, map, cursorZ);
    if (tile) {
      debugRenderer.highlightTile(tile);
      updateTileInfo(tile.position.x, tile.position.y, tile.position.z, tile);
      
      // Update detected Z display
      if (mouseZEl) {
        mouseZEl.textContent = tile.position.z.toString();
      }
    } else {
      debugRenderer.clearHighlight();
      if (mouseZEl) {
        mouseZEl.textContent = '--';
      }
    }
  });

  // Left-click to select tile (button 0)
  debugRenderer.app.stage.on('pointerdown', (e) => {
    if (e.button !== 0) return; // Only left-click
    
    const tile = debugRenderer.getTileAtScreen(e.global.x, e.global.y, map, cursorZ);
    if (tile) {
      cursorX = tile.position.x;
      cursorY = tile.position.y;
      cursorZ = tile.position.z;
      updateCursorHighlight();
      console.log('Selected tile:', tile.position, 'walkable:', tile.walkable);
    }
  });

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        cursorY = Math.max(0, cursorY - 1);
        break;
      case 's':
      case 'arrowdown':
        cursorY = Math.min(49, cursorY + 1);
        break;
      case 'a':
      case 'arrowleft':
        cursorX = Math.max(0, cursorX - 1);
        break;
      case 'd':
      case 'arrowright':
        cursorX = Math.min(49, cursorX + 1);
        break;
      case 'q':
        cursorZ = Math.max(0, cursorZ - 1);
        break;
      case 'e':
        cursorZ = Math.min(1, cursorZ + 1);
        break;
      case 'g':
        // Toggle grid
        chkGrid.checked = !chkGrid.checked;
        debugRenderer.setShowGrid(chkGrid.checked);
        debugRenderer.renderMapWithLayerColors(map);
        break;
      case 'c':
        // Toggle coordinates
        chkCoords.checked = !chkCoords.checked;
        debugRenderer.setShowCoordinates(chkCoords.checked);
        debugRenderer.renderMapWithLayerColors(map);
        break;
    }
    updateCursorHighlight();
  });

  // Resize handler
  window.addEventListener('resize', () => {
    debugRenderer.resize(window.innerWidth, window.innerHeight);
    debugRenderer.renderMapWithLayerColors(map);
  });

  console.log('✅ Axial V2 Phase 1 Demo initialized');
  console.log('📐 IsoMath: tile ↔ screen conversion ready');
  console.log('🗺️ Map: 3D tile grid loaded (2 layers)');
  console.log('🎨 Renderer: PixiJS isometric renderer active');
  console.log('🔧 Debug: Layer colors - Z=0 (blue-teal), Z=1 (purple)');
}

init();
