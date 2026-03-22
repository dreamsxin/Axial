/**
 * Character - Isometric character sprite with animation support
 * Based on IsoEngine character rendering system
 */

import { Sprite, Container, Rectangle } from 'pixi.js';
import { ResourceManager } from './ResourceManager';
import { IsoMath, TilePosition } from '../math/IsoMath';

export interface CharacterData {
  charsetName: string;
  tileX: number;      // Position in tile coordinates
  tileY: number;
  tileZ: number;
  direction?: number; // 0=Front (East/North), 1=Back (West/South)
  action?: number;    // 0=Stand, 1=Walk, 2=Attack, 3=Hurt
  frame?: number;     // Animation frame (0 to halfColumns-1)
}

export class Character {
  // Position in isometric tile space
  public tileX: number;
  public tileY: number;
  public tileZ: number;

  // View direction: 0=Front (East/North), 1=Back (West/South)
  // Front: use first half of frames (0 to halfColumns-1)
  // Back: use second half of frames (halfColumns to columns-1)
  public direction: number = 0;

  // Action type (row in spritesheet)
  // 0=Stand, 1=Walk, 2=Attack, 3=Hurt
  public action: number = 0;
  
  // Whether action was manually set (prevents auto-switch to Stand)
  public manualAction: boolean = false;

  // Animation frame within current action (0 to halfColumns-1)
  public frame: number = 0;

  // Character configuration
  public charsetName: string;
  public tileWidth: number = 64;
  public tileHeight: number = 64;
  public offsetX: number = 10;
  public offsetY: number = 10;
  
  // Spritesheet layout (from texture.xml)
  // columns (tileX): total frames per row (0-3=front, 4-7=back)
  // rows (tileY): number of actions (Stand, Walk, Attack, Hurt)
  public columns: number = 8;
  public halfColumns: number = 4; // Front/back split point
  public rows: number = 4;

  // Movement state
  public isMoving: boolean = false;
  public moveSpeed: number = 5; // tiles per second

  // PixiJS container for this character
  public container: Container;
  public sprite: Sprite | null = null;

  // Animation timing
  private frameTime: number = 0;
  private frameDuration: number = 100; // ms per frame

  private resourceManager: ResourceManager;
  private isoMath: IsoMath;

  constructor(
    resourceManager: ResourceManager,
    isoMath: IsoMath,
    data: CharacterData
  ) {
    this.resourceManager = resourceManager;
    this.isoMath = isoMath;
    this.tileX = data.tileX;
    this.tileY = data.tileY;
    this.tileZ = data.tileZ;
    this.charsetName = data.charsetName;
    
    if (data.direction !== undefined) {
      this.direction = data.direction;
    }
    if (data.action !== undefined) {
      this.action = data.action;
    }
    if (data.frame !== undefined) {
      this.frame = data.frame;
    }

    // Load character config from resource manager
    const config = this.resourceManager.characters.get(this.charsetName);
    if (config) {
      this.tileWidth = config.tileWidth;
      this.tileHeight = config.tileHeight;
      this.offsetX = config.offsetX;
      this.offsetY = config.offsetY;
      // Spritesheet layout: tileX = columns (frames per row), tileY = rows (actions)
      // columns: total frames (half=front, half=back)
      // rows: number of actions (Stand, Walk, Attack, Hurt, Special)
      this.columns = config.tileX;
      this.rows = config.tileY;
      this.halfColumns = Math.floor(this.columns / 2);
      
      console.log('[Character] Loaded config for', this.charsetName, ':', {
        tileWidth: this.tileWidth,
        tileHeight: this.tileHeight,
        columns: this.columns,
        halfColumns: this.halfColumns,
        rows: this.rows,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
        layout: 'Each row = action, first half = Front(East), second half = Back(West)',
      });
    }

    // Create PixiJS container
    this.container = new Container();
    this.container.sortableChildren = true;
  }

  /**
   * Get the global frame index for current action, direction and frame
   * 
   * Spritesheet layout:
   * - Each ROW = different action (Stand, Walk, Attack, Hurt, Special)
   * - Each row has 'columns' frames
   * - First half (0 to halfColumns-1) = Front view (East/North)
   * - Second half (halfColumns to columns-1) = Back view (West/South)
   * 
   * Global index = action * columns + frameOffset
   *   where frameOffset = frame (Front) or frame + halfColumns (Back)
   * 
   * Example: charset1 has 8 columns × 5 rows, halfColumns = 4
   *   action=0 (Stand), direction=0 (Front), frame=0 → index 0
   *   action=0 (Stand), direction=0 (Front), frame=3 → index 3
   *   action=0 (Stand), direction=1 (Back), frame=0 → index 4
   *   action=1 (Walk), direction=0 (Front), frame=0 → index 8
   *   action=2 (Attack), direction=0 (Front), frame=0 → index 16
   */
  getGlobalFrameIndex(): number {
    // Clamp action to available rows
    const clampedAction = this.action % this.rows;
    // Clamp frame to half columns (animation frames per direction)
    const clampedFrame = this.frame % this.halfColumns;
    
    // Calculate frame offset based on direction
    // direction=0 (Front) → use first half (0 to halfColumns-1)
    // direction=1 (Back) → use second half (halfColumns to columns-1)
    const frameOffset = this.direction === 0 ? clampedFrame : (clampedFrame + this.halfColumns);
    
    const index = clampedAction * this.columns + frameOffset;
    
    const actionNames = ['Stand', 'Walk', 'Attack', 'Hurt'];
    const dirName = this.direction === 0 ? 'Front' : 'Back';
    
    console.log('[Character] getGlobalFrameIndex:', {
      action: this.action,
      actionName: actionNames[this.action] || `Action${this.action}`,
      direction: this.direction,
      dirName,
      frame: this.frame,
      clampedFrame,
      halfColumns: this.halfColumns,
      columns: this.columns,
      rows: this.rows,
      frameOffset,
      index,
      layout: `${this.rows} rows × ${this.columns} cols (0-3=Front, 4-7=Back)`,
    });
    
    return index;
  }

  /**
   * Update the sprite texture based on current direction and frame
   */
  updateSprite(): void {
    const frameIndex = this.getGlobalFrameIndex();
    const texture = this.resourceManager.getCharacterFrame(this.charsetName, frameIndex);
    
    if (texture && this.sprite) {
      this.sprite.texture = texture;
      // Apply offset for proper positioning
      this.sprite.x = -this.offsetX;
      this.sprite.y = -this.offsetY;
    }
  }

  /**
   * Create the sprite for this character
   */
  createSprite(): void {
    const frameIndex = this.getGlobalFrameIndex();
    console.log('[Character] Creating sprite for:', this.charsetName, 'frame:', frameIndex, 'direction:', this.direction);
    const texture = this.resourceManager.getCharacterFrame(this.charsetName, frameIndex);
    
    if (texture) {
      console.log('[Character] Texture created, size:', texture.width, 'x', texture.height);
      this.sprite = new Sprite(texture);
      this.sprite.x = -this.offsetX;
      this.sprite.y = -this.offsetY;
      this.sprite.anchor.set(0.5, 1); // Anchor at bottom center for proper depth
      this.container.addChild(this.sprite);
      console.log('[Character] Sprite added to container');
    } else {
      console.error('[Character] Failed to create sprite for frame:', frameIndex, 'charset:', this.charsetName);
      console.error('[Character] Available characters:', Array.from(this.resourceManager.characters.keys()));
    }
  }

  /**
   * Set direction based on movement delta
   * 
   * Direction mapping (Front/Back views):
   * - D (dx>0) or S (dy>0) → Front view (0) → use first half of frames (0-3)
   * - W (dy<0) or A (dx<0) → Back view (1) → use second half of frames (4-7)
   * 
   * @param dx - Delta X (-1, 0, or 1)
   * @param dy - Delta Y (-1, 0, or 1)
   */
  setDirection(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;

    // Determine Front/Back based on movement
    // D (right) or S (down) → Front view (朝向屏幕)
    // W (up) or A (left) → Back view (背向屏幕)
    if (dx > 0 || dy > 0) {
      this.direction = 0; // Front (D/S)
    } else {
      this.direction = 1; // Back (W/A)
    }
    
    const dirName = this.direction === 0 ? 'Front' : 'Back';
    
    console.log('[Character] setDirection:', { 
      dx, dy, 
      direction: this.direction,
      dirName,
      mapping: 'D/S→Front(0-3), W/A→Back(4-7)',
    });

    this.updateSprite();
  }

  /**
   * Set direction explicitly
   * @param direction - 0=Front (East), 1=Back (West)
   */
  setDirectionExplicit(direction: number): void {
    this.direction = direction === 0 ? 0 : 1;
    const dirName = this.direction === 0 ? 'Front' : 'Back';
    console.log('[Character] setDirectionExplicit:', { 
      input: direction, 
      final: this.direction,
      dirName,
    });
    this.updateSprite();
  }

  /**
   * Set action type (animation row)
   * @param action - 0=Stand, 1=Walk, 2=Attack, 3=Hurt
   * @param manual - Whether this is a manual override (prevents auto-switch)
   */
  setAction(action: number, manual: boolean = true): void {
    this.action = action % this.rows;
    this.frame = 0; // Reset frame when changing action
    this.manualAction = manual;
    const actionNames = ['Stand', 'Walk', 'Attack', 'Hurt'];
    console.log('[Character] setAction:', { 
      action, 
      actionName: actionNames[action] || `Action${action}`,
      row: this.action,
      manual,
    });
    this.updateSprite();
  }

  /**
   * Update animation frame
   * @param deltaTime - Time since last update in milliseconds
   */
  update(deltaTime: number): void {
    // Always animate (Stand also loops)
    this.frameTime += deltaTime;
    
    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0;
      // Cycle through frames for current direction (0 to halfColumns-1)
      this.frame = (this.frame + 1) % this.halfColumns;
      this.updateSprite();
    }
  }

  /**
   * Get screen position for this character
   */
  getScreenPosition(): { x: number, y: number } {
    const pos = this.isoMath.tileToScreen({
      x: this.tileX,
      y: this.tileY,
      z: this.tileZ,
    });
    return { x: pos.x, y: pos.y };
  }

  /**
   * Update character position in screen space
   */
  updatePosition(): void {
    const pos = this.getScreenPosition();
    this.container.x = pos.x;
    this.container.y = pos.y;
    this.container.zIndex = this.getDepth();
  }

  /**
   * Get depth value for sorting (higher = rendered later = in front)
   */
  getDepth(): number {
    // Depth formula: combination of tile position and Z level
    return this.isoMath.getDepth({
      x: this.tileX,
      y: this.tileY,
      z: this.tileZ,
    });
  }

  /**
   * Move character towards target tile
   * @param targetX - Target tile X
   * @param targetY - Target tile Y
   * @param deltaTime - Time since last update in seconds
   * @returns true if reached target
   */
  moveTowards(targetX: number, targetY: number, deltaTime: number): boolean {
    const dx = targetX - this.tileX;
    const dy = targetY - this.tileY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.01) {
      this.tileX = targetX;
      this.tileY = targetY;
      this.isMoving = false;
      this.frame = 0; // Reset to idle frame
      this.updateSprite();
      return true;
    }

    // Normalize and move
    const moveX = (dx / distance) * this.moveSpeed * deltaTime;
    const moveY = (dy / distance) * this.moveSpeed * deltaTime;

    this.tileX += moveX;
    this.tileY += moveY;
    this.isMoving = true;

    // Update direction based on movement
    this.setDirection(dx > 0 ? 1 : -1, dy > 0 ? 1 : -1);

    return false;
  }

  /**
   * Instantly move character to a tile
   */
  moveTo(tileX: number, tileY: number, tileZ: number): void {
    this.tileX = tileX;
    this.tileY = tileY;
    this.tileZ = tileZ;
    this.isMoving = false;
    this.frame = 0;
    this.updateSprite();
    this.updatePosition();
  }

  /**
   * Switch character skin/charset
   * @param charsetName - New charset name
   * @param resourceManager - Resource manager instance
   */
  switchCharset(charsetName: string, resourceManager: ResourceManager): void {
    const config = resourceManager.characters.get(charsetName);
    if (!config) {
      console.error('[Character] Charset not found:', charsetName);
      return;
    }
    
    console.log('[Character] Switching charset from', this.charsetName, 'to', charsetName);
    
    // Update config
    this.charsetName = charsetName;
    this.tileWidth = config.tileWidth;
    this.tileHeight = config.tileHeight;
    this.offsetX = config.offsetX;
    this.offsetY = config.offsetY;
    this.columns = config.tileX;
    this.rows = config.tileY;
    
    // Reset direction and frame
    this.direction = 0;
    this.frame = 0;
    
    // Remove old sprite
    if (this.sprite) {
      this.container.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    
    // Create new sprite
    this.createSprite();
    this.updatePosition();
    
    console.log('[Character] Charset switched:', {
      name: this.charsetName,
      columns: this.columns,
      rows: this.rows,
      totalFrames: this.columns * this.rows,
    });
  }

  /**
   * Render this character
   * @param container - Parent container to add to
   */
  render(container: Container): void {
    if (!this.sprite) {
      this.createSprite();
    }
    
    this.updatePosition();
    
    if (this.container.parent !== container) {
      container.addChild(this.container);
    }
  }

  /**
   * Remove this character from its parent container
   */
  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
