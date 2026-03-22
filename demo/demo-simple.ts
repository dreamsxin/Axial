/**
 * Simple Demo Template - Using reusable DebugPanel component
 * This is a minimal template for creating new isometric demos
 */

import { IsoRenderer } from '../src/render/IsoRenderer';
import { Map } from '../src/core/Map';
import { Tile } from '../src/core/Tile';
import { DebugPanel } from '../src/ui/DebugPanel';
import { Graphics } from 'pixi.js';

// Create map (20x20x2)
const map = new Map({ width: 20, height: 20, high: 2 });

// Generate terrain
function generateTerrain(): void {
  const frames: number[] = [];
  
  for (let z = 0; z < 2; z++) {
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        if (z === 0) {
          frames.push(7); // Ground layer
        } else {
          // Upper platform (8x8)
          if (x > 5 && x < 14 && y > 5 && y < 14) {
            frames.push(1);
          } else {
            frames.push(0);
          }
        }
      }
    }
  }

  map.loadFromFrames(frames);
}

// Custom renderer with distinct layer colors
class ColoredIsoRenderer extends IsoRenderer {
  renderMapWithColors(map: Map): void {
    // Clear existing tiles
    const childrenToRemove = this.mapContainer.children.filter(
      child => child instanceof Graphics
    );
    childrenToRemove.forEach(child => this.mapContainer.removeChild(child));

    // Render colored tiles
    for (const tile of map.getAllTiles()) {
      this.renderColoredTile(tile);
    }

    // Add debug elements based on settings
    this.addDebugElements(map);
  }

  private renderColoredTile(tile: Tile): void {
    const screenPos = this.isoMath.tileToScreen(tile.position);
    const { tileWidth, tileHeight } = this.config;
    const graphics = new Graphics();
    graphics.moveTo(0, 0);
    graphics.lineTo(tileWidth / 2, tileHeight / 2);
    graphics.lineTo(0, tileHeight);
    graphics.lineTo(-tileWidth / 2, tileHeight / 2);
    graphics.closePath();
    // Distinct colors matching DebugPanel: Z=0=blue-teal, Z=1=hot pink
    const baseColor = tile.position.z === 0 ? 0x4a90a4 : 0xff69b4;
    graphics.fill({ color: baseColor, alpha: tile.walkable ? 0.85 : 0.4 });
    graphics.stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    graphics.x = screenPos.x;
    graphics.y = screenPos.y;
    this.mapContainer.addChild(graphics);
  }

  private addDebugElements(map: Map): void {
    const settings = this.getDebugSettings();
    
    for (const tile of map.getAllTiles()) {
      const screenPos = this.isoMath.tileToScreen(tile.position);
      const { tileWidth, tileHeight } = this.config;

      // Tile bounds
      if (settings.showTileBounds) {
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

      // Grid markers
      if (settings.showGridMarkers) {
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

      // Tile dots
      if (settings.showTileDots) {
        const dotGraphics = new Graphics();
        dotGraphics.circle(0, tileHeight / 2, 3);
        dotGraphics.fill({ color: 0x00ff00, alpha: 0.8 });
        dotGraphics.x = screenPos.x;
        dotGraphics.y = screenPos.y;
        this.mapContainer.addChild(dotGraphics);
      }
    }
  }
}

const renderer = new ColoredIsoRenderer({
  width: window.innerWidth,
  height: window.innerHeight,
  tileWidth: 64,
  tileHeight: 32,
  tileHigh: 10,
  backgroundColor: 0x1a1a2e,
});

// Create debug panel with custom layer colors and sizes
const debugPanel = new DebugPanel(renderer, map, {
  showGridMarkers: true,
  showTileDots: true,
  showTileBounds: false,
  showLayerInfo: true,
  showAxes: true,  // Show X,Y,Z axes
  showGrid: true,  // Show grid lines
  title: '🔧 Debug',
  layerColors: ['#4a90a4', '#ff69b4'],
  layerSizes: [
    { width: 20, height: 20 },
    { width: 8, height: 8 },
  ],
});

// Initialize
async function init(): Promise<void> {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  await renderer.init(container);
  generateTerrain();
  renderer.renderMapWithColors(map);
  debugPanel.init();

  // Use framework callbacks for input
  renderer.onPanMove((dx, dy, x, y) => {
    const tile = renderer.getTileAtScreen(x, y, map);
    if (tile) {
      debugPanel.updateMouseDisplay(x, y, tile.position.x, tile.position.y, tile.position.z);
    }
  });

  // Listen for debug settings changes (map-related only)
  const rerenderMap = () => {
    renderer.renderMapWithColors(map);
  };

  debugPanel['chkGrid']?.addEventListener('change', rerenderMap);
  debugPanel['chkCoords']?.addEventListener('change', rerenderMap);
  debugPanel['chkBounds']?.addEventListener('change', rerenderMap);
  
  // Grid lines and axes are handled internally by DebugPanel

  renderer.onClick((x, y) => {
    const tile = renderer.getTileAtScreen(x, y, map);
    if (tile) {
      debugPanel.setCursor(tile.position.x, tile.position.y, tile.position.z);
      console.log('Selected tile:', tile.position, 'walkable:', tile.walkable);
    }
  });

  // Mouse move - highlight tile
  renderer.app.stage.on('globalpointermove', (e) => {
    if (renderer.isDraggingNow()) return;
    
    const tile = renderer.getTileAtScreen(e.global.x, e.global.y, map);
    if (tile) {
      renderer.highlightTile(tile);
      debugPanel.updateMouseDisplay(
        e.global.x,
        e.global.y,
        tile.position.x,
        tile.position.y,
        tile.position.z
      );
    } else {
      renderer.clearHighlight();
      const cursor = debugPanel.getCursor();
      debugPanel.updateMouseDisplay(e.global.x, e.global.y, cursor.x, cursor.y, '--');
    }
  });

  // Setup keyboard controls (WASD + QE)
  renderer.setupKeyboard({
    onMove: (dx, dy, dz) => {
      const cursor = debugPanel.getCursor();
      debugPanel.setCursor(
        Math.max(0, Math.min(map.config.width - 1, cursor.x + dx)),
        Math.max(0, Math.min(map.config.height - 1, cursor.y + dy)),
        Math.max(0, Math.min(map.config.high - 1, cursor.z + dz))
      );
    },
  });

  // Resize handler
  window.addEventListener('resize', () => {
    rerenderMap();
    if (debugPanel['chkGridLines']?.checked) {
      debugPanel.renderGridLines();
    }
    if (debugPanel['chkAxes']?.checked) {
      debugPanel.renderAxes();
    }
  });

  console.log('✅ Simple Demo initialized');
  console.log('🗺️ Map: 20×20×2 (Z=1: 8×8 platform)');
  console.log('🎨 Layer colors: Z=0 (blue-teal), Z=1 (hot pink)');
  console.log('🖱️ Right-drag pan enabled (context menu suppressed)');
  console.log('⌨️ WASD + QE keyboard controls active');
  console.log('📐 Axes: X=red, Y=green, Z=blue (press X to toggle)');
}

init();

// Re-render after pan
renderer.onPanEnd(() => {
  if (debugPanel['chkGridLines']?.checked) {
    debugPanel.renderGridLines();
  }
  if (debugPanel['chkAxes']?.checked) {
    debugPanel.renderAxes();
  }
});
