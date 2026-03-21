/**
 * Resource Manager - Load and manage game assets
 * Based on IsoEngine/DataManager.as
 */

import { Assets, Texture, Sprite } from 'pixi.js';

export interface TilesetConfig {
  name: string;
  tileWidth: number;
  tileHeight: number;
  tileX: number;  // Columns
  tileY: number;  // Rows
  path: string;
}

export interface CharacterConfig {
  name: string;
  tileWidth: number;
  tileHeight: number;
  tileX: number;
  tileY: number;
  offsetX: number;
  offsetY: number;
  path: string;
}

export interface FxConfig {
  name: string;
  tileWidth: number;
  tileHeight: number;
  tileX: number;
  tileY: number;
  offsetX: number;
  offsetY: number;
  path: string;
}

export interface ResourceConfig {
  tilesets: TilesetConfig[];
  characters: CharacterConfig[];
  fx: FxConfig[];
}

export class ResourceManager {
  public tilesets: Map<string, TilesetConfig> = new Map();
  public characters: Map<string, CharacterConfig> = new Map();
  public fx: Map<string, FxConfig> = new Map();
  
  private textures: Map<string, Texture> = new Map();
  private loaded: boolean = false;

  /**
   * Load texture configuration from XML
   */
  async loadTextureConfig(xmlPath: string): Promise<void> {
    try {
      const response = await fetch(xmlPath);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');

      // Parse tilesets
      const tilesetNodes = xml.querySelectorAll('tileset png');
      tilesetNodes.forEach((node) => {
        const config: TilesetConfig = {
          name: node.getAttribute('tilesetName') || '',
          tileWidth: parseInt(node.getAttribute('tileWidth') || '60'),
          tileHeight: parseInt(node.getAttribute('tileHeight') || '40'),
          tileX: parseInt(node.getAttribute('tileX') || '10'),
          tileY: parseInt(node.getAttribute('tileY') || '6'),
          path: node.textContent?.trim() || '',
        };
        this.tilesets.set(config.name, config);
      });

      // Parse characters
      const charNodes = xml.querySelectorAll('charset png');
      charNodes.forEach((node) => {
        const config: CharacterConfig = {
          name: node.getAttribute('charsetName') || '',
          tileWidth: parseInt(node.getAttribute('tileWidth') || '64'),
          tileHeight: parseInt(node.getAttribute('tileHeight') || '64'),
          tileX: parseInt(node.getAttribute('tileX') || '8'),
          tileY: parseInt(node.getAttribute('tileY') || '4'),
          offsetX: parseInt(node.getAttribute('offsetX') || '0'),
          offsetY: parseInt(node.getAttribute('offsetY') || '0'),
          path: node.textContent?.trim() || '',
        };
        this.characters.set(config.name, config);
      });

      // Parse fx
      const fxNodes = xml.querySelectorAll('fxset png');
      fxNodes.forEach((node) => {
        const config: FxConfig = {
          name: node.getAttribute('fxsetName') || '',
          tileWidth: parseInt(node.getAttribute('tileWidth') || '30'),
          tileHeight: parseInt(node.getAttribute('tileHeight') || '30'),
          tileX: parseInt(node.getAttribute('tileX') || '4'),
          tileY: parseInt(node.getAttribute('tileY') || '3'),
          offsetX: parseInt(node.getAttribute('offsetX') || '0'),
          offsetY: parseInt(node.getAttribute('offsetY') || '0'),
          path: node.textContent?.trim() || '',
        };
        this.fx.set(config.name, config);
      });

      console.log(`[ResourceManager] Loaded ${this.tilesets.size} tilesets, ${this.characters.size} characters, ${this.fx.size} fx`);
    } catch (error) {
      console.error('[ResourceManager] Failed to load texture config:', error);
      throw error;
    }
  }

  /**
   * Load all textures
   */
  async loadTextures(basePath: string = 'assets'): Promise<void> {
    const assetsToLoad: Record<string, string> = {};

    // Add tilesets
    this.tilesets.forEach((config, name) => {
      const key = `tileset:${name}`;
      assetsToLoad[key] = `${basePath}/${config.path}`;
    });

    // Add characters
    this.characters.forEach((config, name) => {
      const key = `character:${name}`;
      assetsToLoad[key] = `${basePath}/${config.path}`;
    });

    // Add fx
    this.fx.forEach((config, name) => {
      const key = `fx:${name}`;
      assetsToLoad[key] = `${basePath}/${config.path}`;
    });

    // Load all assets
    const assets = await Assets.load(assetsToLoad);
    
    // Store textures
    Object.entries(assets).forEach(([key, texture]) => {
      this.textures.set(key, texture as Texture);
    });

    this.loaded = true;
    console.log(`[ResourceManager] Loaded ${this.textures.size} textures`);
  }

  /**
   * Get texture by key
   */
  getTexture(key: string): Texture | null {
    return this.textures.get(key) || null;
  }

  /**
   * Get tileset texture
   */
  getTilesetTexture(name: string): Texture | null {
    return this.getTexture(`tileset:${name}`);
  }

  /**
   * Get character texture
   */
  getCharacterTexture(name: string): Texture | null {
    return this.getTexture(`character:${name}`);
  }

  /**
   * Get frame from texture atlas
   */
  getFrame(texture: Texture | null, frameX: number, frameY: number, frameWidth: number, frameHeight: number): Texture | null {
    if (!texture) return null;
    
    const frame = new Texture({
      source: texture.source,
      frame: {
        x: frameX * frameWidth,
        y: frameY * frameHeight,
        width: frameWidth,
        height: frameHeight,
      },
    });
    
    return frame;
  }

  /**
   * Get tile frame from tileset
   */
  getTileFrame(tilesetName: string, frameIndex: number): Texture | null {
    const config = this.tilesets.get(tilesetName);
    if (!config) return null;

    const texture = this.getTilesetTexture(tilesetName);
    if (!texture) return null;

    const frameX = frameIndex % config.tileX;
    const frameY = Math.floor(frameIndex / config.tileX);

    return this.getFrame(texture, frameX, frameY, config.tileWidth, config.tileHeight);
  }

  /**
   * Get character frame
   */
  getCharacterFrame(charsetName: string, frameIndex: number): Texture | null {
    const config = this.characters.get(charsetName);
    if (!config) return null;

    const texture = this.getCharacterTexture(charsetName);
    if (!texture) return null;

    const frameX = frameIndex % config.tileX;
    const frameY = Math.floor(frameIndex / config.tileX);

    return this.getFrame(texture, frameX, frameY, config.tileWidth, config.tileHeight);
  }

  /**
   * Check if all resources are loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}
