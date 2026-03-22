/**
 * Isometric Tile Editor - Using IsoRenderer Framework
 * Left: Tile Palette (2 columns) | Right: 10x10 Grid
 */

import { Assets, Texture, Sprite, Graphics, Container, Text } from 'pixi.js';
import { IsoRenderer } from '../src/render/IsoRenderer';
import { Map } from '../src/core/Map';
import { Tile } from '../src/core/Tile';
import { DebugPanel } from '../src/ui/DebugPanel';

// Tileset configuration
const TILE_WIDTH = 60;
const TILE_HEIGHT = 40;
const TILE_COLUMNS = 5;
const TILE_ROWS = 6;

// Valid tiles layout
const VALID_TILES: number[] = [];
const TILES_PER_ROW = [5, 4, 1, 1, 1, 1];
for (let row = 0; row < TILE_ROWS; row++) {
  const tilesInRow = TILES_PER_ROW[row] || 0;
  for (let col = 0; col < tilesInRow; col++) {
    VALID_TILES.push(row * TILE_COLUMNS + col);
  }
}
const TOTAL_TILES = VALID_TILES.length;

// Grid configuration
const GRID_SIZE = 10;

// Layout configuration - match tile actual size (60x40)
const PALETTE_WIDTH = 260;  // 2 cols * (60 + padding)
const PALETTE_COLS = 2;
const PALETTE_ROWS = Math.ceil(TOTAL_TILES / PALETTE_COLS);
const PALETTE_TILE_WIDTH = 60;   // Match actual tile width
const PALETTE_TILE_HEIGHT = 40;  // Match actual tile height
const PALETTE_SLOT_WIDTH = 70;   // Slot includes padding
const PALETTE_SLOT_HEIGHT = 55;  // Slot includes label space
const PALETTE_PADDING = 8;

// Renderer config
const RENDERER_CONFIG = {
  tileWidth: TILE_WIDTH,
  tileHeight: TILE_HEIGHT,
  tileHigh: 10,
  width: 900,
  height: 650,
  backgroundColor: 0x1a1a2e,
  offsetX: PALETTE_WIDTH + 80,
  offsetY: 100,
  projection: 'isometric' as 'isometric' | 'dimetric' | 'staggered',
};

// State
let selectedFrameIndex: number | null = null;
let gridData: (number | null)[][] = [];
let renderer: IsoRenderer;
let map: Map;
let debugPanel: DebugPanel;
let paletteContainer: Container;
let tilesetTexture: Texture | null = null;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let hoveredTile: { x: number; y: number } | null = null;
let hoveredPaletteTile: number | null = null;
let initialized = false;
let currentProjection: 'isometric' | 'dimetric' | 'staggered' = 'isometric';
let currentViewAngle: number = 45;  // View angle in degrees (default 45°)

/**
 * Initialize the editor
 */
async function init(): Promise<void> {
  if (initialized) return;

  const containerEl = document.getElementById('canvas-container');
  const selectedTileEl = document.getElementById('selected-tile');
  const mousePosEl = document.getElementById('mouse-pos');
  const tilePosEl = document.getElementById('tile-pos');
  const statusEl = document.getElementById('status');

  try {
    console.log('[TileEditor] Starting...');

    // Load tileset
    tilesetTexture = await Assets.load('assets/tilesets/tileset.png');
    console.log('[TileEditor] Loaded tileset:', tilesetTexture.source.width, '×', tilesetTexture.source.height);

    if (statusEl) {
      statusEl.textContent = `Loaded: ${tilesetTexture.source.width}×${tilesetTexture.source.height}px`;
    }

    // Initialize grid data
    for (let y = 0; y < GRID_SIZE; y++) {
      gridData[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        gridData[y][x] = null;
      }
    }

    // Initialize renderer and map
    if (containerEl) {
      await initRenderer(containerEl);
    }

    if (selectedTileEl) {
      selectedTileEl.textContent = 'None';
    }

    // Setup buttons
    document.getElementById('btn-clear')?.addEventListener('click', clearGrid);
    document.getElementById('btn-export')?.addEventListener('click', exportData);
    
    // Setup projection selector
    setupProjectionSelector();

    console.log('[TileEditor] Ready!');
    initialized = true;
  } catch (error) {
    console.error('[TileEditor] Error:', error);
    if (statusEl) {
      statusEl.textContent = `Error: ${error}`;
    }
  }
}

/**
 * Initialize renderer
 */
async function initRenderer(container: HTMLElement): Promise<void> {
  renderer = new IsoRenderer(RENDERER_CONFIG);
  await renderer.init(container);  // Auto setup input handlers

  map = new Map({ width: GRID_SIZE, height: GRID_SIZE, high: 1 });

  // Create debug panel with grid enabled
  debugPanel = new DebugPanel(renderer, map, {
    showGrid: true,        // Enable grid lines from DebugPanel
    showGridMarkers: false,
    showTileDots: false,
    showTileBounds: false,
    showLayerInfo: false,
    title: '🔧 Tile Editor',
  });
  debugPanel.init();

  // Apply default view angle (45°)
  setViewAngle(currentViewAngle);

  // Palette container on stage (left side)
  paletteContainer = new Container();
  paletteContainer.x = PALETTE_PADDING;
  paletteContainer.y = PALETTE_PADDING;
  renderer.app.stage.addChild(paletteContainer);

  renderPalette();
  renderGrid();
  setupFrameworkCallbacks();
  setupKeyboardShortcuts();
}

/**
 * Toggle debug overlay (grid lines via DebugPanel)
 */
function toggleDebug(): void {
  // Toggle grid via DebugPanel checkbox
  if (debugPanel) {
    const chkGrid = document.getElementById('chk-grid-lines') as HTMLInputElement;
    if (chkGrid) {
      chkGrid.checked = !chkGrid.checked;
      // Trigger change event to render grid lines
      chkGrid.dispatchEvent(new Event('change'));
    }
  }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 'd':
        toggleDebug();
        break;
      case 'p':
        cycleProjection();
        break;
    }
  });
}

/**
 * Setup projection selector
 */
function setupProjectionSelector(): void {
  const selectEl = document.getElementById('projection-select') as HTMLSelectElement;
  const labelEl = document.getElementById('projection-mode');
  
  if (!selectEl || !labelEl) return;
  
  selectEl.value = currentProjection;
  updateProjectionLabel(labelEl, currentProjection);
  
  selectEl.addEventListener('change', () => {
    const newProjection = selectEl.value as 'isometric' | 'dimetric' | 'staggered';
    setProjection(newProjection);
  });
  
  // Setup view angle slider
  setupViewAngleSlider();
}

function setupViewAngleSlider(): void {
  const slider = document.getElementById('angle-slider') as HTMLInputElement;
  const angleValue = document.getElementById('angle-value');
  const viewAngleDisplay = document.getElementById('view-angle');
  
  if (!slider || !angleValue) return;
  
  slider.value = currentViewAngle.toString();
  
  slider.addEventListener('input', () => {
    currentViewAngle = parseInt(slider.value, 10);
    angleValue.textContent = `${currentViewAngle}°`;
    if (viewAngleDisplay) viewAngleDisplay.textContent = `${currentViewAngle}°`;
    setViewAngle(currentViewAngle);
  });
}

function updateProjectionLabel(labelEl: HTMLElement, projection: string): void {
  const names: Record<string, string> = {
    isometric: 'Isometric (30°)',
    dimetric: 'Dimetric (26.5°)',
    staggered: 'Staggered',
  };
  labelEl.textContent = names[projection] || projection;
}

function setProjection(projection: 'isometric' | 'dimetric' | 'staggered'): void {
  currentProjection = projection;
  
  // Update renderer's projection (this recreates isoMath)
  renderer.setProjection(projection);
  
  const labelEl = document.getElementById('projection-mode');
  if (labelEl) updateProjectionLabel(labelEl, projection);
  
  // Debug: test coordinate conversion
  const testTile = { x: 5, y: 5, z: 0 };
  const screenPos = renderer.isoMath.tileToScreen(testTile);
  console.log(`[TileEditor] Projection ${projection}: Tile(5,5) → Screen(${screenPos.x}, ${screenPos.y})`);
  
  // Re-render grid and grid lines
  renderGrid();
  
  // Re-render grid lines if enabled (they depend on isoMath)
  const chkGrid = document.getElementById('chk-grid-lines') as HTMLInputElement;
  if (chkGrid?.checked && debugPanel) {
    debugPanel.renderGridLines();
  }
  
  // Re-render axes if enabled (they depend on isoMath)
  const chkAxes = document.getElementById('chk-axes') as HTMLInputElement;
  if (chkAxes?.checked && debugPanel) {
    debugPanel.renderAxes();
  }
  
  console.log('[TileEditor] Projection:', projection);
}

function cycleProjection(): void {
  const projections = ['isometric', 'dimetric', 'staggered'] as const;
  const idx = projections.indexOf(currentProjection);
  const next = projections[(idx + 1) % projections.length];
  
  const selectEl = document.getElementById('projection-select') as HTMLSelectElement;
  if (selectEl) selectEl.value = next;
  
  setProjection(next);
}

/**
 * Set view angle by adjusting tileHeight
 * Formula: tileHeight = tileWidth / (2 * tan(angle))
 * For isometric (30°): tileHeight = tileWidth / 2
 */
function setViewAngle(angle: number): void {
  // Convert angle to radians
  const radians = angle * Math.PI / 180;
  
  // Calculate new tileHeight based on view angle
  // The formula derives from isometric projection geometry
  const newTileHeight = TILE_WIDTH / (2 * Math.tan(radians));
  
  // Update renderer config
  renderer.config.tileHeight = newTileHeight;
  
  // Update isoMath config
  renderer.isoMath['config'].tileHeight = newTileHeight;
  
  // Debug output
  const testTile = { x: 5, y: 5, z: 0 };
  const screenPos = renderer.isoMath.tileToScreen(testTile);
  console.log(`[TileEditor] Angle ${angle}°: tileHeight=${newTileHeight.toFixed(2)}, Tile(5,5) → Screen(${screenPos.x}, ${screenPos.y.toFixed(2)})`);
  
  // Re-render
  renderGrid();
  
  // Re-render grid lines if enabled
  const chkGrid = document.getElementById('chk-grid-lines') as HTMLInputElement;
  if (chkGrid?.checked && debugPanel) {
    debugPanel.renderGridLines();
  }
  
  // Re-render axes if enabled (they depend on isoMath)
  const chkAxes = document.getElementById('chk-axes') as HTMLInputElement;
  if (chkAxes?.checked && debugPanel) {
    debugPanel.renderAxes();
  }
}

/**
 * Print debug info
 */
function printDebugInfo(): void {
  console.group('🔍 Debug Info');
  console.log('Offset:', renderer.getOffset());
  console.log('Tile size:', TILE_WIDTH, 'x', TILE_HEIGHT);
  const testTile = { x: 3, y: 4, z: 0 };
  const screenPos = renderer.isoMath.tileToScreen(testTile);
  const back = renderer.isoMath.screenToTile(screenPos, 0);
  console.log('Round-trip:', testTile, '→', screenPos, '→', back);
  console.groupEnd();
}

/**
 * Setup framework callbacks (uses built-in input handling)
 */
function setupFrameworkCallbacks(): void {
  const mousePosEl = document.getElementById('mouse-pos');
  const tilePosEl = document.getElementById('tile-pos');

  // Pan callbacks (framework handles the drag)
  renderer.onPanStart((x, y) => {
    if (x >= PALETTE_WIDTH) {
      isDragging = true;
    }
  });

  renderer.onPanMove((dx, dy, x, y) => {
    // Update mouse display during pan
    updateMouseDisplay(x, y, mousePosEl, tilePosEl);
  });

  renderer.onPanEnd(() => {
    isDragging = false;
  });

  // Click callback
  renderer.onClick((x, y) => {
    if (x < PALETTE_WIDTH + PALETTE_PADDING * 2 && hoveredPaletteTile !== null) {
      selectTile(hoveredPaletteTile);
    } else if (hoveredTile && selectedFrameIndex !== null) {
      placeTile(hoveredTile.x, hoveredTile.y);
    }
  });

  // Mouse move - handle palette hover and tile highlight
  renderer.app.stage.on('globalpointermove', (e) => {
    if (renderer.isDraggingNow()) return;

    const mouseX = e.global.x;
    const mouseY = e.global.y;

    if (mousePosEl) {
      mousePosEl.textContent = `(${Math.round(mouseX)}, ${Math.round(mouseY)})`;
    }

    // Palette area
    if (mouseX < PALETTE_WIDTH + PALETTE_PADDING * 2) {
      const paletteX = mouseX - PALETTE_PADDING;
      const paletteY = mouseY - PALETTE_PADDING;
      const slotCol = Math.floor(paletteX / PALETTE_SLOT_WIDTH);
      const slotRow = Math.floor(paletteY / PALETTE_SLOT_HEIGHT);

      if (slotCol >= 0 && slotCol < PALETTE_COLS && slotRow >= 0 && slotRow < PALETTE_ROWS) {
        const slotIndex = slotRow * PALETTE_COLS + slotCol;
        if (slotIndex < VALID_TILES.length) {
          hoveredPaletteTile = VALID_TILES[slotIndex];
          if (tilePosEl) tilePosEl.textContent = `Palette: #${hoveredPaletteTile}`;
          renderPaletteHighlight();
          return;
        }
      }
      hoveredPaletteTile = null;
      renderPaletteHighlight();
      return;
    }

    // Grid area - highlight tile
    updateMouseDisplay(mouseX, mouseY, mousePosEl, tilePosEl);
  });

  // Right click - clear tile (framework suppresses context menu)
  renderer.app.stage.on('pointerdown', (e) => {
    if (e.button === 2 && hoveredTile) {  // Right button
      e.preventDefault();
      clearTile(hoveredTile.x, hoveredTile.y);
    }
  });
}

/**
 * Update mouse display and highlight
 */
function updateMouseDisplay(mouseX: number, mouseY: number, mousePosEl: HTMLElement | null, tilePosEl: HTMLElement | null): void {
  const tile = renderer.getTileAtScreen(mouseX, mouseY, map, 0);
  if (tile && tile.position.x >= 0 && tile.position.x < GRID_SIZE && 
      tile.position.y >= 0 && tile.position.y < GRID_SIZE) {
    if (tilePosEl) tilePosEl.textContent = `(${tile.position.x}, ${tile.position.y})`;
    hoveredTile = { x: tile.position.x, y: tile.position.y };
    renderer.highlightTile(tile);
  } else {
    if (tilePosEl) tilePosEl.textContent = '--';
    hoveredTile = null;
    renderer.clearHighlight();
  }
}

/**
 * Select tile from palette
 */
function selectTile(frameIndex: number): void {
  selectedFrameIndex = frameIndex;
  const selectedTileEl = document.getElementById('selected-tile');
  if (selectedTileEl) {
    const col = frameIndex % TILE_COLUMNS;
    const row = Math.floor(frameIndex / TILE_COLUMNS);
    selectedTileEl.textContent = `Frame ${frameIndex} (col:${col}, row:${row})`;
  }
  renderPalette();
}

/**
 * Render palette
 */
function renderPalette(): void {
  if (!paletteContainer || !tilesetTexture) return;
  paletteContainer.removeChildren();

  // Background
  const bg = new Graphics();
  bg.roundRect(0, 0, PALETTE_COLS * PALETTE_SLOT_WIDTH + PALETTE_PADDING, 
               PALETTE_ROWS * PALETTE_SLOT_HEIGHT + PALETTE_PADDING, 8);
  bg.fill({ color: 0x0a0a1a, alpha: 0.8 });
  bg.stroke({ width: 2, color: 0x333355 });
  paletteContainer.addChild(bg);

  // Tiles
  for (let slotIndex = 0; slotIndex < VALID_TILES.length; slotIndex++) {
    const frameIndex = VALID_TILES[slotIndex];
    const col = slotIndex % PALETTE_COLS;
    const row = Math.floor(slotIndex / PALETTE_COLS);
    const x = col * PALETTE_SLOT_WIDTH + PALETTE_PADDING / 2;
    const y = row * PALETTE_SLOT_HEIGHT + PALETTE_PADDING / 2;

    // Slot background
    const slotBg = new Graphics();
    slotBg.roundRect(x, y, PALETTE_SLOT_WIDTH - PALETTE_PADDING, 
                     PALETTE_SLOT_HEIGHT - PALETTE_PADDING, 4);
    if (selectedFrameIndex === frameIndex) {
      slotBg.fill({ color: 0x4ade80, alpha: 0.2 });
      slotBg.stroke({ width: 2, color: 0x4ade80 });
    } else if (hoveredPaletteTile === frameIndex) {
      slotBg.fill({ color: 0xffffff, alpha: 0.1 });
      slotBg.stroke({ width: 2, color: 0x666688 });
    } else {
      slotBg.fill({ color: 0x1a1a2e, alpha: 0.5 });
      slotBg.stroke({ width: 1, color: 0x333344 });
    }
    paletteContainer.addChild(slotBg);

    // Sprite - centered with actual tile size (60x40)
    const frameX = frameIndex % TILE_COLUMNS;
    const frameY = Math.floor(frameIndex / TILE_COLUMNS);
    const frame = new Texture({
      source: tilesetTexture.source,
      frame: { x: frameX * TILE_WIDTH, y: frameY * TILE_HEIGHT, width: TILE_WIDTH, height: TILE_HEIGHT },
    });
    const sprite = new Sprite(frame);
    sprite.anchor.set(0.5);
    sprite.x = x + (PALETTE_SLOT_WIDTH - PALETTE_PADDING) / 2;
    sprite.y = y + (PALETTE_SLOT_HEIGHT - PALETTE_PADDING) / 2 - 5;  // Up for label
    paletteContainer.addChild(sprite);

    // Label - below sprite
    const label = new Text(`#${frameIndex}`, {
      fontSize: 10,
      fill: 0x8888aa,
      fontFamily: 'Consolas, monospace',
    });
    label.anchor.set(0.5, 0);
    label.x = x + (PALETTE_SLOT_WIDTH - PALETTE_PADDING) / 2;
    label.y = y + (PALETTE_SLOT_HEIGHT - PALETTE_PADDING) / 2 + 18;
    paletteContainer.addChild(label);
  }

  // Title
  const title = new Text('📦 Tile Palette', {
    fontSize: 14,
    fill: 0x4ade80,
    fontFamily: 'Segoe UI, sans-serif',
    fontWeight: 'bold',
  });
  title.x = PALETTE_PADDING;
  title.y = -25;
  paletteContainer.addChild(title);
}

function renderPaletteHighlight(): void {
  renderPalette();
}

/**
 * Render grid
 */
function renderGrid(): void {
  renderer.renderMap(map);
  
  // Clear mapContainer and re-render with custom tiles
  const childrenToRemove = renderer.mapContainer.children.filter(
    child => child instanceof Sprite || child instanceof Graphics
  );
  childrenToRemove.forEach(child => renderer.mapContainer.removeChild(child));

  // Render placed tiles
  const tilesToRender: Array<{ x: number; y: number; frame: number; depth: number }> = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const frameIndex = gridData[y][x];
      if (frameIndex !== null) {
        tilesToRender.push({ x, y, frame: frameIndex, depth: x + y });
      }
    }
  }
  tilesToRender.sort((a, b) => a.depth - b.depth);

  for (const tile of tilesToRender) {
    renderIsoTile(tile.x, tile.y, tile.frame);
  }

  // Title
  const title = new Text('📐 10×10 Isometric Grid', {
    fontSize: 14,
    fill: 0x4ade80,
    fontFamily: 'Segoe UI, sans-serif',
    fontWeight: 'bold',
  });
  title.anchor.set(0.5, 1);
  title.x = renderer.isoMath.tileToScreen({ x: GRID_SIZE / 2, y: 0, z: 0 }).x;
  title.y = -30;
  renderer.mapContainer.addChild(title);

  // Bring containers to front
  renderer['bringContainersToFront']();
}

/**
 * Render single tile
 */
function renderIsoTile(gridX: number, gridY: number, frameIndex: number): void {
  if (!tilesetTexture) return;
  const screenPos = renderer.isoMath.tileToScreen({ x: gridX, y: gridY, z: 0 });

  const frameX = frameIndex % TILE_COLUMNS;
  const frameY = Math.floor(frameIndex / TILE_COLUMNS);
  const frame = new Texture({
    source: tilesetTexture.source,
    frame: { x: frameX * TILE_WIDTH, y: frameY * TILE_HEIGHT, width: TILE_WIDTH, height: TILE_HEIGHT },
  });

  const sprite = new Sprite(frame);
  sprite.anchor.set(0.5, 0);
  sprite.x = screenPos.x;
  sprite.y = screenPos.y;
  renderer.mapContainer.addChild(sprite);
}

/**
 * Place tile
 */
function placeTile(gridX: number, gridY: number): void {
  if (selectedFrameIndex === null) return;
  gridData[gridY][gridX] = selectedFrameIndex;
  renderGrid();
  const slot = document.querySelector(`[data-frame-index="${selectedFrameIndex}"]`);
  selectTile(selectedFrameIndex);
}

/**
 * Clear tile
 */
function clearTile(gridX: number, gridY: number): void {
  gridData[gridY][gridX] = null;
  renderGrid();
}

/**
 * Clear grid
 */
function clearGrid(): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      gridData[y][x] = null;
    }
  }
  renderGrid();
}

/**
 * Export data
 */
function exportData(): void {
  const tiles: Array<{ x: number; y: number; frame: number }> = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const frame = gridData[y][x];
      if (frame !== null) tiles.push({ x, y, frame });
    }
  }

  const data = {
    gridSize: GRID_SIZE,
    tileConfig: { tileWidth: TILE_WIDTH, tileHeight: TILE_HEIGHT, tileColumns: TILE_COLUMNS, tileRows: TILE_ROWS },
    tiles,
  };

  const json = JSON.stringify(data, null, 2);
  navigator.clipboard?.writeText(json).then(() => {
    alert('Grid data copied to clipboard!');
  }).catch(() => {
    alert('Export:\n' + json);
  });
}

/**
 * Cleanup
 */
function destroy(): void {
  if (renderer) renderer.destroy();
  initialized = false;
}

window.addEventListener('beforeunload', () => destroy());
init();
