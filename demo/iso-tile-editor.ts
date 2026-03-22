/**
 * Isometric Tile Editor - Using IsoRenderer Framework
 * Left: Tile Palette (2 columns) | Right: 10x10 Grid
 */

import { Assets, Texture, Sprite, Graphics, Container, Text } from 'pixi.js';
import { IsoRenderer } from '../src/render/IsoRenderer';
import { Map } from '../src/core/Map';
import { Tile } from '../src/core/Tile';
import { DebugPanel } from '../src/ui/DebugPanel';

// Tileset configuration interface
interface TilesetConfig {
  name: string;
  path: string;
  tileWidth: number;
  tileHeight: number;
  tileX: number;  // columns
  tileY: number;  // rows
  offsetX?: number;
  offsetY?: number;
}

// Default tileset configuration
let TILE_WIDTH = 60;
let TILE_HEIGHT = 40;
let TILE_COLUMNS = 5;
let TILE_ROWS = 6;

// Loaded tilesets
let tilesets: TilesetConfig[] = [];
let currentTileset: TilesetConfig | null = null;

// Valid tiles layout - will be recalculated when tileset changes
let VALID_TILES: number[] = [];
let TILES_PER_ROW: number[] = [5, 4, 1, 1, 1, 1];  // Default for 60x40 tiles
let TOTAL_TILES = 0;

// Grid configuration
const GRID_SIZE = 10;

// Palette layout - will be recalculated
let PALETTE_WIDTH = 260;
const PALETTE_COLS = 2;
let PALETTE_ROWS = 0;
let PALETTE_SLOT_WIDTH = 70;
let PALETTE_SLOT_HEIGHT = 55;
const PALETTE_PADDING = 8;

/**
 * Recalculate palette layout based on current tile dimensions
 */
function updatePaletteLayout(): void {
  // Recalculate valid tiles based on tileset dimensions
  VALID_TILES = [];
  // Adjust TILES_PER_ROW based on tile width
  if (TILE_WIDTH <= 32) {
    TILES_PER_ROW = [10, 8, 6, 4, 2, 1, 1, 1, 1, 1];
  } else if (TILE_WIDTH <= 48) {
    TILES_PER_ROW = [7, 5, 3, 2, 1, 1, 1, 1];
  } else {
    TILES_PER_ROW = [5, 4, 1, 1, 1, 1];  // Default for 60px tiles
  }
  
  for (let row = 0; row < TILE_ROWS; row++) {
    const tilesInRow = TILES_PER_ROW[row] || 0;
    for (let col = 0; col < tilesInRow; col++) {
      VALID_TILES.push(row * TILE_COLUMNS + col);
    }
  }
  TOTAL_TILES = VALID_TILES.length;
  
  // Recalculate palette dimensions
  PALETTE_WIDTH = PALETTE_COLS * (TILE_WIDTH + 15);
  PALETTE_SLOT_WIDTH = TILE_WIDTH + 10;
  PALETTE_SLOT_HEIGHT = TILE_HEIGHT + 15;
  PALETTE_ROWS = Math.ceil(TOTAL_TILES / PALETTE_COLS);
  
  console.log(`[TileEditor] Palette layout: ${PALETTE_WIDTH}×${PALETTE_ROWS * PALETTE_SLOT_HEIGHT}, ${TOTAL_TILES} tiles`);
}

// Renderer config - will be updated when tileset changes
let RENDERER_CONFIG = {
  tileWidth: TILE_WIDTH,
  tileHeight: TILE_HEIGHT,
  tileHigh: 10,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x1a1a2e,
  offsetX: window.innerWidth / 2,  // Center origin horizontally
  offsetY: window.innerHeight / 2, // Center origin vertically
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
let initialized = false;
let currentProjection: 'isometric' | 'dimetric' | 'staggered' = 'isometric';
let currentViewAngle: number = 45;  // View angle in degrees (default 45°)
let tileOffsetX: number = 0;  // Tile sprite offset X
let tileOffsetY: number = 0;  // Tile sprite offset Y

/**
 * Parse texture.xml and load tilesets
 */
async function loadTilesets(): Promise<void> {
  try {
    const response = await fetch('assets/xml/texture.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Parse tileset nodes
    const tilesetNodes = xmlDoc.querySelectorAll('tileset > png, addtileset > png');
    
    tilesets = [];
    for (const node of Array.from(tilesetNodes)) {
      const tilesetName = node.getAttribute('tilesetName') || 'unknown';
      const tileWidth = parseInt(node.getAttribute('tileWidth') || '60', 10);
      const tileHeight = parseInt(node.getAttribute('tileHeight') || '40', 10);
      const tileX = parseInt(node.getAttribute('tileX') || '5', 10);
      const tileY = parseInt(node.getAttribute('tileY') || '6', 10);
      const offsetX = node.getAttribute('offsetX');
      const offsetY = node.getAttribute('offsetY');
      const xmlPath = node.textContent?.trim() || '';
      
      // Convert XML path to actual asset path (texture/tile/ → assets/tilesets/)
      const path = xmlPath.replace('texture/tile/', 'assets/tilesets/');

      tilesets.push({
        name: tilesetName,
        path,
        tileWidth,
        tileHeight,
        tileX,
        tileY,
        offsetX: offsetX ? parseInt(offsetX, 10) : undefined,
        offsetY: offsetY ? parseInt(offsetY, 10) : undefined,
      });
    }

    console.log('[TileEditor] Loaded tilesets:', tilesets.length);
    tilesets.forEach(ts => {
      console.log(`  - ${ts.name}: ${ts.tileWidth}×${ts.tileHeight}, ${ts.tileX}×${ts.tileY} frames`);
    });

    // Populate tileset selector
    populateTilesetSelector();
  } catch (error) {
    console.error('[TileEditor] Failed to load tilesets:', error);
  }
}

function populateTilesetSelector(): void {
  const selectEl = document.getElementById('tileset-select') as HTMLSelectElement;
  if (!selectEl) return;

  selectEl.innerHTML = '';
  
  tilesets.forEach((ts, index) => {
    const option = document.createElement('option');
    option.value = index.toString();
    option.textContent = `${ts.name} (${ts.tileWidth}×${ts.tileHeight})`;
    selectEl.appendChild(option);
  });

  // Select first tileset by default (but don't load texture yet)
  if (tilesets.length > 0) {
    selectEl.selectedIndex = 0;
    // Store the index to load after renderer is initialized
    (selectEl as any)._pendingIndex = 0;
  }

  selectEl.addEventListener('change', () => {
    const index = parseInt(selectEl.value, 10);
    selectTileset(index);
  });
}

function selectTileset(index: number): void {
  if (index < 0 || index >= tilesets.length) return;
  
  currentTileset = tilesets[index];
  TILE_WIDTH = currentTileset.tileWidth;
  TILE_HEIGHT = currentTileset.tileHeight;
  TILE_COLUMNS = currentTileset.tileX;
  TILE_ROWS = currentTileset.tileY;

  // Update palette layout
  updatePaletteLayout();
  
  // Update renderer config (but preserve angle-adjusted tileHeight and center offset)
  RENDERER_CONFIG.tileWidth = TILE_WIDTH;
  // Keep origin centered - don't update offsetX/Y
  // Don't update RENDERER_CONFIG.tileHeight - it will be set by setViewAngle
  
  // Apply offset from tileset config (default to 0 if not specified)
  tileOffsetX = currentTileset.offsetX ?? 0;
  tileOffsetY = currentTileset.offsetY ?? 0;
  
  // Update offset inputs
  const offsetXInput = document.getElementById('offset-x') as HTMLInputElement;
  const offsetYInput = document.getElementById('offset-y') as HTMLInputElement;
  if (offsetXInput) offsetXInput.value = tileOffsetX.toString();
  if (offsetYInput) offsetYInput.value = tileOffsetY.toString();

  console.log(`[TileEditor] Selected tileset: ${currentTileset.name}`);
  console.log(`  Size: ${TILE_WIDTH}×${TILE_HEIGHT}, Grid: ${TILE_COLUMNS}×${TILE_ROWS}`);
  console.log(`  Offset: (${tileOffsetX}, ${tileOffsetY})`);

  // Reload texture and re-apply angle
  loadTilesetTexture(currentTileset.path);
}

async function loadTilesetTexture(path: string): Promise<void> {
  try {
    const statusEl = document.getElementById('status');
    
    // Load new texture (don't unload old one first to avoid race condition)
    const newTexture = await Assets.load(path);
    console.log('[TileEditor] Loaded texture:', path, newTexture.source.width, '×', newTexture.source.height);
    
    // Update status
    if (statusEl) {
      statusEl.textContent = `${currentTileset?.name}: ${newTexture.source.width}×${newTexture.source.height}px`;
    }
    
    // Unload old texture after new one is loaded
    if (tilesetTexture && tilesetTexture.source.url !== path) {
      Assets.unload(tilesetTexture.source.url);
    }
    
    // Update texture reference
    tilesetTexture = newTexture;

    // Reinitialize renderer with new config (only if renderer exists)
    if (renderer) {
      reinitRenderer();
      
      // Re-apply view angle calculation (preserves the angle setting)
      const radians = currentViewAngle * Math.PI / 180;
      const newTileHeight = TILE_WIDTH / (2 * Math.tan(radians));
      renderer.config.tileHeight = newTileHeight;
      renderer.isoMath['config'].tileHeight = newTileHeight;
      console.log(`[TileEditor] Re-applied angle ${currentViewAngle}°: tileHeight=${newTileHeight.toFixed(2)}`);
    }
    
    // Re-render palette (always)
    renderPalette();
    
    // Re-render grid (only if renderer exists)
    if (renderer) {
      renderGrid();
    }
  } catch (error) {
    console.error('[TileEditor] Failed to load texture:', path, error);
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = `Error loading: ${path}`;
    }
  }
}

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

    // Load tilesets from XML and populate selector
    await loadTilesets();

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
    
    // Load first tileset after renderer is ready
    const selectEl = document.getElementById('tileset-select') as HTMLSelectElement;
    if (selectEl && (selectEl as any)._pendingIndex !== undefined) {
      selectTileset((selectEl as any)._pendingIndex);
      delete (selectEl as any)._pendingIndex;
    }

    if (selectedTileEl) {
      selectedTileEl.textContent = 'None';
    }

    // Setup buttons
    document.getElementById('btn-clear')?.addEventListener('click', clearGrid);
    document.getElementById('btn-export')?.addEventListener('click', exportData);
    
    // Setup projection selector
    setupProjectionSelector();

    // Setup tile offset inputs
    setupTileOffsetInputs();

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
 * Reinitialize renderer with new tileset config
 */
function reinitRenderer(): void {
  if (!renderer || !currentTileset) return;
  
  // Update renderer config (tileWidth only, tileHeight is set by angle calculation)
  renderer.config.tileWidth = TILE_WIDTH;
  renderer.isoMath['config'].tileWidth = TILE_WIDTH;
  // Note: tileHeight is NOT updated here - it's set by setViewAngle/loadTilesetTexture
  
  // Keep origin centered on screen
  renderer.rootContainer.x = RENDERER_CONFIG.offsetX;
  renderer.rootContainer.y = RENDERER_CONFIG.offsetY;
  
  console.log('[TileEditor] Renderer reinitialized for new tileset');
}

/**
 * Initialize renderer
 */
async function initRenderer(container: HTMLElement): Promise<void> {
  // Initialize palette layout first
  updatePaletteLayout();
  
  // Update renderer config with current window size
  RENDERER_CONFIG.width = window.innerWidth;
  RENDERER_CONFIG.height = window.innerHeight;
  
  // Center the world origin (0,0) on screen
  RENDERER_CONFIG.offsetX = window.innerWidth / 2;
  RENDERER_CONFIG.offsetY = window.innerHeight / 2;
  
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

  // Palette is now in DOM (bottom-left corner), not in Pixi stage
  // paletteContainer will be used for internal rendering but not added to stage
  paletteContainer = new Container();

  // Apply default view angle (45°) by calculating tileHeight
  const radians = currentViewAngle * Math.PI / 180;
  const initialTileHeight = TILE_WIDTH / (2 * Math.tan(radians));
  renderer.config.tileHeight = initialTileHeight;
  renderer.isoMath['config'].tileHeight = initialTileHeight;
  console.log(`[TileEditor] Initial angle ${currentViewAngle}°: tileHeight=${initialTileHeight.toFixed(2)}`);
  console.log(`[TileEditor] World origin centered at: (${RENDERER_CONFIG.offsetX}, ${RENDERER_CONFIG.offsetY})`);
  
  renderPalette();
  renderGrid();
  setupFrameworkCallbacks();
  setupKeyboardShortcuts();
  
  // Select first tile in palette by default
  if (VALID_TILES.length > 0) {
    selectTile(VALID_TILES[0]);
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (renderer) {
      renderer.app.renderer.resize(window.innerWidth, window.innerHeight);
      RENDERER_CONFIG.width = window.innerWidth;
      RENDERER_CONFIG.height = window.innerHeight;
      
      // Keep origin centered on resize
      RENDERER_CONFIG.offsetX = window.innerWidth / 2;
      RENDERER_CONFIG.offsetY = window.innerHeight / 2;
      renderer.rootContainer.x = RENDERER_CONFIG.offsetX;
      renderer.rootContainer.y = RENDERER_CONFIG.offsetY;
      
      // Re-render grid with new offset
      renderGrid();
    }
  });
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

function setupTileOffsetInputs(): void {
  const offsetXInput = document.getElementById('offset-x') as HTMLInputElement;
  const offsetYInput = document.getElementById('offset-y') as HTMLInputElement;
  
  if (!offsetXInput || !offsetYInput) return;
  
  offsetXInput.value = tileOffsetX.toString();
  offsetYInput.value = tileOffsetY.toString();
  
  offsetXInput.addEventListener('input', () => {
    tileOffsetX = parseInt(offsetXInput.value, 10) || 0;
    renderGrid();
  });
  
  offsetYInput.addEventListener('input', () => {
    tileOffsetY = parseInt(offsetYInput.value, 10) || 0;
    renderGrid();
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
  if (!renderer) return;
  
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
  
  // Re-render grid
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

  // Click callback (grid only - palette clicks handled by DOM)
  renderer.onClick((x, y) => {
    if (hoveredTile && selectedFrameIndex !== null) {
      placeTile(hoveredTile.x, hoveredTile.y);
    }
  });

  // Mouse move - handle tile highlight (palette hover handled by DOM events)
  renderer.app.stage.on('globalpointermove', (e) => {
    if (renderer.isDraggingNow()) return;

    const mouseX = e.global.x;
    const mouseY = e.global.y;

    if (mousePosEl) {
      mousePosEl.textContent = `(${Math.round(mouseX)}, ${Math.round(mouseY)})`;
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
    selectedTileEl.textContent = `#${frameIndex} (col:${col}, row:${row})`;
  }
  renderPalette();
}

/**
 * Render palette as DOM elements (bottom-left corner)
 */
function renderPalette(): void {
  const paletteContent = document.getElementById('palette-content');
  if (!paletteContent || !tilesetTexture) return;
  
  paletteContent.innerHTML = '';
  paletteContent.style.display = 'grid';
  paletteContent.style.gridTemplateColumns = `repeat(${PALETTE_COLS}, ${TILE_WIDTH + 10}px)`;
  paletteContent.style.gap = '5px';

  // Get texture source URL
  const textureUrl = tilesetTexture.source.url;

  // Tiles
  for (let slotIndex = 0; slotIndex < VALID_TILES.length; slotIndex++) {
    const frameIndex = VALID_TILES[slotIndex];
    const frameX = frameIndex % TILE_COLUMNS;
    const frameY = Math.floor(frameIndex / TILE_COLUMNS);
    
    // Create slot container
    const slot = document.createElement('div');
    slot.dataset.frameIndex = frameIndex.toString();
    slot.style.cssText = `
      width: ${TILE_WIDTH + 10}px;
      height: ${TILE_HEIGHT + 15}px;
      background: ${selectedFrameIndex === frameIndex ? 'rgba(74, 222, 128, 0.2)' : 'rgba(26, 26, 46, 0.5)'};
      border: ${selectedFrameIndex === frameIndex ? '2px solid #4ade80' : '1px solid #333344'};
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    `;
    slot.onmouseenter = () => {
      if (selectedFrameIndex !== frameIndex) {
        slot.style.background = 'rgba(255, 255, 255, 0.1)';
        slot.style.borderColor = '#666688';
      }
    };
    slot.onmouseleave = () => {
      if (selectedFrameIndex !== frameIndex) {
        slot.style.background = 'rgba(26, 26, 46, 0.5)';
        slot.style.borderColor = '#333344';
      }
    };
    slot.onclick = () => selectTile(frameIndex);
    
    // Create sprite using canvas - draw immediately from loaded texture
    const canvas = document.createElement('canvas');
    canvas.width = TILE_WIDTH;
    canvas.height = TILE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx && tilesetTexture) {
      // Use Pixi's texture source
      const source = tilesetTexture.source;
      if (source && source.resource) {
        ctx.drawImage(
          source.resource,
          frameX * TILE_WIDTH, frameY * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT,
          0, 0, TILE_WIDTH, TILE_HEIGHT
        );
      }
    }
    slot.appendChild(canvas);
    
    // Label
    const label = document.createElement('div');
    label.textContent = `#${frameIndex}`;
    label.style.cssText = `
      font-size: 10px;
      color: #8888aa;
      font-family: Consolas, monospace;
      margin-top: 2px;
    `;
    slot.appendChild(label);
    
    paletteContent.appendChild(slot);
  }
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
  sprite.x = screenPos.x + tileOffsetX;
  sprite.y = screenPos.y + tileOffsetY;
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
    tileOffset: { x: tileOffsetX, y: tileOffsetY },
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
