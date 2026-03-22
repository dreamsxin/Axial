/**
 * Character Demo - Render charset1.png characters
 * Phase 2.1: Character Sprite Rendering
 */

import { Application, Container, Graphics } from 'pixi.js';
import { ResourceManager } from '../src/core/ResourceManager';
import { Character } from '../src/core/Character';
import { IsoMath, IsoConfig } from '../src/math/IsoMath';

// Action names (4 rows in spritesheet)
const ACTION_NAMES = ['Stand', 'Walk', 'Attack', 'Hurt'];

// Direction names (Front/Back views)
const DIRECTION_NAMES = ['Front', 'Back'];
const DIRECTION_ARROWS = ['→', '←'];

// Debug: log constants on load
console.log('[CharacterDemo] Constants:', {
  ACTION_NAMES,
  DIRECTION_NAMES,
  DIRECTION_ARROWS,
  layout: '4 rows × 8 cols (0-3=Front, 4-7=Back)',
  mapping: 'D/S→Front(0-3), W/A→Back(4-7)',
});

async function main() {
  console.log('[CharacterDemo] Starting...');

  // Create PixiJS application
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.getElementById('canvas-container')!.appendChild(app.canvas);

  // Create IsoMath instance
  const isoConfig: IsoConfig = {
    tileWidth: 60,
    tileHeight: 40,
    tileHigh: 20,
    projection: 'dimetric',
  };
  const isoMath = new IsoMath(isoConfig);

  // Create resource manager
  const resourceManager = new ResourceManager();

  // Load texture configuration
  console.log('[CharacterDemo] Loading texture config from ./assets/xml/texture.xml...');
  await resourceManager.loadTextureConfig('./assets/xml/texture.xml');
  console.log('[CharacterDemo] Loaded configs:', {
    tilesets: resourceManager.tilesets.size,
    characters: resourceManager.characters.size,
    fx: resourceManager.fx.size,
  });
  
  // Log charset1 config specifically
  const charset1Config = resourceManager.characters.get('charset1');
  console.log('[CharacterDemo] charset1 config:', charset1Config);

  // Load textures
  console.log('[CharacterDemo] Loading textures...');
  await resourceManager.loadTextures();
  console.log('[CharacterDemo] Loaded textures:', resourceManager.characters.size);
  
  // Verify charset1 texture loaded
  const charset1Texture = resourceManager.getCharacterTexture('charset1');
  console.log('[CharacterDemo] charset1 texture loaded:', charset1Texture !== null);
  if (charset1Texture) {
    console.log('[CharacterDemo] charset1 texture size:', charset1Texture.width, 'x', charset1Texture.height);
  }

  // Create main container with sorting
  const mainContainer = new Container();
  mainContainer.sortableChildren = true;
  app.stage.addChild(mainContainer);

  // Center the view - offset for character at (5, 5)
  const centerX = app.screen.width / 2;
  const centerY = app.screen.height / 2 + 50;
  mainContainer.x = centerX;
  mainContainer.y = centerY;
  
  console.log('[CharacterDemo] Container centered at:', centerX, centerY);

  // Create debug grid container
  const gridContainer = new Container();
  gridContainer.sortableChildren = true;
  app.stage.addChildAt(gridContainer, 0); // Behind main container
  gridContainer.x = centerX;
  gridContainer.y = centerY;

  // Draw isometric grid
  function drawGrid(): void {
    const gridSize = 12; // 12x12 grid
    const gridGraphics = new Graphics();
    
    // Draw grid lines
    for (let i = -gridSize; i <= gridSize; i++) {
      // X-axis lines
      const startX = isoMath.tileToScreen({ x: i, y: -gridSize, z: 0 }).x;
      const startY = isoMath.tileToScreen({ x: i, y: -gridSize, z: 0 }).y;
      const endX = isoMath.tileToScreen({ x: i, y: gridSize, z: 0 }).x;
      const endY = isoMath.tileToScreen({ x: i, y: gridSize, z: 0 }).y;
      
      gridGraphics.moveTo(startX, startY);
      gridGraphics.lineTo(endX, endY);
      
      // Y-axis lines
      const startX2 = isoMath.tileToScreen({ x: -gridSize, y: i, z: 0 }).x;
      const startY2 = isoMath.tileToScreen({ x: -gridSize, y: i, z: 0 }).y;
      const endX2 = isoMath.tileToScreen({ x: gridSize, y: i, z: 0 }).x;
      const endY2 = isoMath.tileToScreen({ x: gridSize, y: i, z: 0 }).y;
      
      gridGraphics.moveTo(startX2, startY2);
      gridGraphics.lineTo(endX2, endY2);
    }
    
    gridGraphics.stroke({ width: 1, color: 0x444466, alpha: 0.5 });
    gridContainer.addChild(gridGraphics);
    
    // Draw axis indicators
    const axisGraphics = new Graphics();
    
    // X axis (red)
    const xEnd = isoMath.tileToScreen({ x: 5, y: 0, z: 0 });
    axisGraphics.moveTo(0, 0);
    axisGraphics.lineTo(xEnd.x, xEnd.y);
    axisGraphics.stroke({ width: 3, color: 0xff4444, alpha: 0.8 });
    
    // Y axis (green)
    const yEnd = isoMath.tileToScreen({ x: 0, y: 5, z: 0 });
    axisGraphics.moveTo(0, 0);
    axisGraphics.lineTo(yEnd.x, yEnd.y);
    axisGraphics.stroke({ width: 3, color: 0x44ff44, alpha: 0.8 });
    
    // Z axis (blue)
    const zEnd = isoMath.tileToScreen({ x: 0, y: 0, z: 2 });
    axisGraphics.moveTo(0, 0);
    axisGraphics.lineTo(zEnd.x, zEnd.y - 40);
    axisGraphics.stroke({ width: 3, color: 0x4444ff, alpha: 0.8 });
    
    gridContainer.addChild(axisGraphics);
    
    // Draw tile centers
    const dotGraphics = new Graphics();
    for (let x = -gridSize; x <= gridSize; x++) {
      for (let y = -gridSize; y <= gridSize; y++) {
        const pos = isoMath.tileToScreen({ x, y, z: 0 });
        dotGraphics.circle(pos.x, pos.y, 2);
      }
    }
    dotGraphics.fill({ color: 0x6688ff, alpha: 0.6 });
    gridContainer.addChild(dotGraphics);
  }
  
  drawGrid();
  console.log('[CharacterDemo] Debug grid drawn');

  // Wait a moment for resources to fully load
  await new Promise(resolve => setTimeout(resolve, 100));

  // Populate character dropdown
  const characterSelect = document.getElementById('character-select') as HTMLSelectElement;
  if (characterSelect) {
    characterSelect.innerHTML = '';
    resourceManager.characters.forEach((config, name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name} (${config.tileX}×${config.tileY} = ${config.tileX * config.tileY} frames)`;
      characterSelect.appendChild(option);
    });
    
    // Set default selection
    characterSelect.value = 'charset1';
    
    // Handle character change
    let currentCharacterName = 'charset1';
    characterSelect.addEventListener('change', () => {
      const selectedName = characterSelect.value;
      if (selectedName === currentCharacterName) return;
      
      console.log('[CharacterDemo] Switching character from', currentCharacterName, 'to', selectedName);
      
      // Use Character's switchCharset method
      character.switchCharset(selectedName, resourceManager);
      
      currentCharacterName = selectedName;
      console.log('[CharacterDemo] Character switched to:', selectedName);
      updateInfoPanel();
    });
  }

  // Create character at center of map
  // Default: Standing animation (action=0), Front view (direction=0), frame 0
  const character = new Character(resourceManager, isoMath, {
    charsetName: 'charset1',
    tileX: 5,
    tileY: 5,
    tileZ: 0,
    action: 0,      // Stand (Row 0)
    direction: 0,   // Front (frames 0-3)
    frame: 0,
  });
  
  console.log('[CharacterDemo] Character created:', {
    charsetName: character.charsetName,
    action: character.action,
    actionName: ACTION_NAMES[character.action],
    direction: character.direction,
    dirName: DIRECTION_NAMES[character.direction],
    frame: character.frame,
    halfColumns: character.halfColumns,
    columns: character.columns,
    rows: character.rows,
  });

  console.log('[CharacterDemo] Character instance created:', {
    charsetName: character.charsetName,
    columns: character.columns,
    rows: character.rows,
    direction: character.direction,
    frame: character.frame,
    globalFrame: character.getGlobalFrameIndex(),
  });

  // Add character to scene
  character.render(mainContainer);
  console.log('[CharacterDemo] Character created at tile (5, 5, 0)');
  console.log('[CharacterDemo] Character screen position:', character.getScreenPosition());
  
  // Add debug marker at character position
  const debugMarker = new Graphics();
  debugMarker.circle(0, 0, 10);
  debugMarker.fill({ color: 0xff0000, alpha: 0.5 });
  debugMarker.stroke({ width: 2, color: 0xffffff });
  mainContainer.addChild(debugMarker);
  console.log('[CharacterDemo] Debug marker added at (0, 0) in container space');

  // Update info panel
  function updateInfoPanel() {
    const config = resourceManager.characters.get(character.charsetName);
    
    // Safe element access with null checks
    const setPosition = document.getElementById('char-position');
    const setAction = document.getElementById('char-direction');
    const setFrame = document.getElementById('char-frame');
    const setGlobalFrame = document.getElementById('char-global-frame');
    const setTileSize = document.getElementById('tile-size');
    const setOffset = document.getElementById('offset');
    const setSpritesheet = document.getElementById('spritesheet');
    const setTotalFrames = document.getElementById('total-frames');
    const setDirArrow = document.getElementById('direction-arrow');
    const setDirName = document.getElementById('direction-name');
    const setAnimFrame = document.getElementById('anim-frame');
    
    if (setPosition) {
      setPosition.textContent = `${character.tileX.toFixed(2)}, ${character.tileY.toFixed(2)}, ${character.tileZ}`;
    }
    if (setDirName) {
      const actionName = ACTION_NAMES[character.action] || `Action${character.action}`;
      const dirName = DIRECTION_NAMES[character.direction];
      const dirArrow = DIRECTION_ARROWS[character.direction];
      setDirName.textContent = `${actionName} - ${dirName} ${dirArrow}`;
    }
    if (setFrame) {
      setFrame.textContent = `${character.frame}/${character.halfColumns - 1}`;
    }
    if (setGlobalFrame) {
      setGlobalFrame.textContent = character.getGlobalFrameIndex().toString();
    }
    if (config) {
      if (setTileSize) {
        setTileSize.textContent = `${config.tileWidth}×${config.tileHeight}`;
      }
      if (setOffset) {
        setOffset.textContent = `${config.offsetX}, ${config.offsetY}`;
      }
      if (setSpritesheet) {
        setSpritesheet.textContent = `${config.tileX}×${config.tileY}`;
      }
      if (setTotalFrames) {
        setTotalFrames.textContent = `${config.tileX * config.tileY} (${config.tileY} actions × ${config.tileX} frames, ${character.halfColumns} front + ${character.halfColumns} back)`;
      }
    }
    if (setDirArrow) {
      setDirArrow.textContent = DIRECTION_ARROWS[character.direction];
    }
    if (setAnimFrame) {
      setAnimFrame.textContent = character.frame.toString();
    }
    
    // Also update the big direction display panel (top-right)
    const bigArrow = document.getElementById('dir-arrow-big');
    const bigDirName = document.getElementById('dir-name-big');
    const bigFrame = document.getElementById('anim-frame-big');
    const maxFrameEl = document.getElementById('max-frame-big');
    if (bigArrow) {
      bigArrow.textContent = DIRECTION_ARROWS[character.direction];
    }
    if (bigDirName) {
      const actionName = ACTION_NAMES[character.action] || `Action${character.action}`;
      const dirArrow = DIRECTION_ARROWS[character.direction];
      bigDirName.textContent = `${actionName} - ${DIRECTION_NAMES[character.direction]} ${dirArrow}`;
    }
    if (bigFrame) {
      bigFrame.textContent = character.frame.toString();
    }
    if (maxFrameEl) {
      maxFrameEl.textContent = (character.halfColumns - 1).toString();
    }
    
    // Debug log
    console.log('[CharacterDemo] updateInfoPanel:', {
      action: character.action,
      actionName: ACTION_NAMES[character.action],
      direction: character.direction,
      dirName: DIRECTION_NAMES[character.direction],
      dirArrow: DIRECTION_ARROWS[character.direction],
      frame: character.frame,
      halfColumns: character.halfColumns,
    });
  }

  // Input handling
  const keys: Record<string, boolean> = {};
  let targetX = 0;
  let targetY = 0;

  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    // Action keys 1-4 (1=Stand, 2=Walk, 3=Attack, 4=Hurt)
    if (e.key >= '1' && e.key <= '4') {
      const action = parseInt(e.key) - 1;
      console.log('[CharacterDemo] Action key pressed:', e.key, '→ action', action, ACTION_NAMES[action]);
      character.setAction(action);
      updateInfoPanel();
    }

    // Toggle F to flip direction manually
    if (e.key.toLowerCase() === 'f') {
      character.direction = character.direction === 0 ? 1 : 0;
      console.log('[CharacterDemo] Direction flipped:', character.direction === 0 ? 'Front' : 'Back');
      character.updateSprite();
      updateInfoPanel();
    }

    // Reset position (clears manual action flag)
    if (e.key.toLowerCase() === 'r') {
      character.moveTo(5, 5, 0);
      targetX = 5;
      targetY = 5;
      character.manualAction = false; // Clear manual flag
      character.setAction(0, false); // Reset to Stand (auto)
      updateInfoPanel();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    
    // Debug: log W/S key release
    if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 's') {
      console.log('[CharacterDemo] Key released:', e.key.toLowerCase(), 'direction after:', character.direction, DIRECTION_NAMES[character.direction]);
    }
  });

  // Mouse tracking for debug
  app.stage.on('globalpointermove', (e) => {
    const screenX = e.global.x - mainContainer.x;
    const screenY = e.global.y - mainContainer.y;
    const tilePos = isoMath.screenToTile({ x: screenX, y: screenY }, 0);
    document.getElementById('screen-pos')!.textContent = `${screenX.toFixed(0)}, ${screenY.toFixed(0)}`;
    document.getElementById('tile-pos')!.textContent = `${tilePos.x}, ${tilePos.y}, ${tilePos.z}`;
  });

  // Animation loop
  let lastTime = performance.now();

  function gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // seconds
    const deltaMs = currentTime - lastTime;
    lastTime = currentTime;

    // Update grid info panel
    const charScreenPos = character.getScreenPosition();
    document.getElementById('screen-pos')!.textContent = `${mainContainer.x.toFixed(0)}, ${mainContainer.y.toFixed(0)}`;
    document.getElementById('tile-pos')!.textContent = `${character.tileX.toFixed(2)}, ${character.tileY.toFixed(2)}, ${character.tileZ}`;
    document.getElementById('char-screen-pos')!.textContent = `${charScreenPos.x.toFixed(0)}, ${charScreenPos.y.toFixed(0)}`;
    document.getElementById('container-pos')!.textContent = `${mainContainer.x.toFixed(0)}, ${mainContainer.y.toFixed(0)}`;

    // Handle input for movement
    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['arrowup']) dy = -1;
    if (keys['s'] || keys['arrowdown']) dy = 1;
    if (keys['a'] || keys['arrowleft']) dx = -1;
    if (keys['d'] || keys['arrowright']) dx = 1;

    if (dx !== 0 || dy !== 0) {
      // Normalize diagonal movement
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      // Move character
      const moveSpeed = 2; // tiles per second
      character.tileX += dx * moveSpeed * deltaTime;
      character.tileY += dy * moveSpeed * deltaTime;

      // Moving clears manual action and restores auto-switch
      if (character.manualAction) {
        character.manualAction = false;
        console.log('[CharacterDemo] Movement detected, cleared manual action');
      }

      // Auto-switch to Walk action when moving
      if (character.action !== 1) {
        character.setAction(1, false); // Walk (auto)
      }

      // Set direction based on movement (D/S→Front, W/A→Back)
      character.setDirection(dx, dy);
    } else {
      // Auto-switch to Stand when stopped (only if not manually set)
      if (!character.manualAction && character.action !== 0) {
        character.setAction(0, false); // Stand (auto)
      }
    }

    // Update character animation (always looping, including Stand)
    character.update(deltaMs);

    // Update character position
    character.updatePosition();

    // Update info panel
    updateInfoPanel();

    requestAnimationFrame(gameLoop);
  }

  // Start game loop
  requestAnimationFrame(gameLoop);

  console.log('[CharacterDemo] Demo started!');
  console.log('[CharacterDemo] Controls: WASD to move, 1-8 for direction, Space for animation, R to reset');
}

main().catch(console.error);
