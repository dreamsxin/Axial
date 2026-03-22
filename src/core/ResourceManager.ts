/**
 * Resource Manager - Load and manage game assets
 * Based on IsoEngine/DataManager.as
 */

import { Assets, Texture, Sprite, Rectangle } from 'pixi.js';

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
        const path = node.textContent?.trim() || '';
        const name = node.getAttribute('tilesetName') || '';
        if (!path || !name) {
          console.warn('[ResourceManager] Skipping tileset with missing path or name:', { path, name });
          return;
        }
        const config: TilesetConfig = {
          name,
          tileWidth: parseInt(node.getAttribute('tileWidth') || '60'),
          tileHeight: parseInt(node.getAttribute('tileHeight') || '40'),
          tileX: parseInt(node.getAttribute('tileX') || '10'),
          tileY: parseInt(node.getAttribute('tileY') || '6'),
          path,
        };
        this.tilesets.set(config.name, config);
        console.log('[ResourceManager] Added tileset:', config.name, '->', config.path);
      });

      // Parse characters
      const charNodes = xml.querySelectorAll('charset png');
      charNodes.forEach((node) => {
        const path = node.textContent?.trim() || '';
        const name = node.getAttribute('charsetName') || '';
        if (!path || !name) {
          console.warn('[ResourceManager] Skipping character with missing path or name:', { path, name });
          return;
        }
        const config: CharacterConfig = {
          name,
          tileWidth: parseInt(node.getAttribute('tileWidth') || '64'),
          tileHeight: parseInt(node.getAttribute('tileHeight') || '64'),
          tileX: parseInt(node.getAttribute('tileX') || '8'),
          tileY: parseInt(node.getAttribute('tileY') || '4'),
          offsetX: parseInt(node.getAttribute('offsetX') || '0'),
          offsetY: parseInt(node.getAttribute('offsetY') || '0'),
          path,
        };
        this.characters.set(config.name, config);
        console.log('[ResourceManager] Added character:', config.name, '->', config.path);
      });

      // Parse fx
      const fxNodes = xml.querySelectorAll('fxset png');
      fxNodes.forEach((node) => {
        const path = node.textContent?.trim() || '';
        const name = node.getAttribute('fxsetName') || '';
        if (!path || !name) {
          console.warn('[ResourceManager] Skipping fx with missing path or name:', { path, name });
          return;
        }
        const config: FxConfig = {
          name,
          tileWidth: parseInt(node.getAttribute('tileWidth') || '30'),
          tileHeight: parseInt(node.getAttribute('tileHeight') || '30'),
          tileX: parseInt(node.getAttribute('tileX') || '4'),
          tileY: parseInt(node.getAttribute('tileY') || '3'),
          offsetX: parseInt(node.getAttribute('offsetX') || '0'),
          offsetY: parseInt(node.getAttribute('offsetY') || '0'),
          path,
        };
        this.fx.set(config.name, config);
        console.log('[ResourceManager] Added fx:', config.name, '->', config.path);
      });

      console.log(`[ResourceManager] Loaded ${this.tilesets.size} tilesets, ${this.characters.size} characters, ${this.fx.size} fx`);
    } catch (error) {
      console.error('[ResourceManager] Failed to load texture config:', error);
      throw error;
    }
  }

  /**
   * Convert XML path to actual asset path
   */
  private resolveAssetPath(xmlPath: string): string {
    if (!xmlPath) {
      console.warn('[ResourceManager] Empty xmlPath provided');
      return '';
    }
    
    // If path already starts with assets/, use it directly
    if (xmlPath.startsWith('assets/')) {
      console.log('[ResourceManager] Path already resolved:', xmlPath);
      return xmlPath;
    }
    
    // Map XML paths to our asset folder structure
    // texture/tile/tileset.png → assets/tilesets/tileset.png
    // texture/character/xxx.png → assets/characters/xxx.png
    // texture/fx/fxset.png → assets/fx/fxset.png
    // texture/emoticon/xxx.png → assets/emoticons/xxx.png
    // texture/item/xxx.png → assets/items/xxx.png
    
    const parts = xmlPath.split('/');
    console.log('[ResourceManager] Resolving path:', xmlPath, 'parts:', parts);
    
    if (parts.length < 2) {
      return `assets/${xmlPath}`;
    }
    
    // Handle "texture/..." prefix
    if (parts[0] === 'texture' && parts.length >= 3) {
      const category = parts[1]; // tile, character, fx, emoticon, item
      const filename = parts[2];
      
      switch (category) {
        case 'tile':
          return `assets/tilesets/${filename}`;
        case 'character':
          return `assets/characters/${filename}`;
        case 'fx':
          return `assets/fx/${filename}`;
        case 'emoticon':
          return `assets/emoticons/${filename}`;
        case 'item':
          return `assets/items/${filename}`;
      }
    }
    
    return `assets/${xmlPath}`;
  }

  /**
   * Load all textures
   */
  async loadTextures(): Promise<void> {
    const assetsToLoad: Record<string, string> = {};

    // Add tilesets
    this.tilesets.forEach((config, name) => {
      const resolvedPath = this.resolveAssetPath(config.path);
      const key = `tileset:${name}`;
      if (resolvedPath) {
        assetsToLoad[key] = resolvedPath;
        console.log('[ResourceManager] Will load tileset:', key, '->', resolvedPath);
      }
    });

    // Add characters
    this.characters.forEach((config, name) => {
      const resolvedPath = this.resolveAssetPath(config.path);
      const key = `character:${name}`;
      if (resolvedPath) {
        assetsToLoad[key] = resolvedPath;
        console.log('[ResourceManager] Will load character:', key, '->', resolvedPath);
      }
    });

    // Add fx
    this.fx.forEach((config, name) => {
      const resolvedPath = this.resolveAssetPath(config.path);
      const key = `fx:${name}`;
      if (resolvedPath) {
        assetsToLoad[key] = resolvedPath;
        console.log('[ResourceManager] Will load fx:', key, '->', resolvedPath);
      }
    });

    console.log('[ResourceManager] Total assets to load:', Object.keys(assetsToLoad).length);
    console.log('[ResourceManager] Assets:', JSON.stringify(assetsToLoad, null, 2));

    if (Object.keys(assetsToLoad).length === 0) {
      console.warn('[ResourceManager] No assets to load!');
      this.loaded = true;
      return;
    }

    try {
      // Validate all URLs are valid strings
      const validAssets: Record<string, string> = {};
      for (const [key, url] of Object.entries(assetsToLoad)) {
        if (typeof url === 'string' && url.length > 0) {
          validAssets[key] = url;
        } else {
          console.error('[ResourceManager] Invalid URL for key:', key, 'url:', url);
        }
      }

      // Load all assets using array format for PixiJS v8
      const assetArray = Object.entries(validAssets).map(([alias, url]) => ({
        alias,
        src: url,
      }));

      console.log('[ResourceManager] Loading asset array:', assetArray);

      // Load all assets
      const assets = await Assets.load(assetArray);
      
      // Store textures
      Object.entries(assets).forEach(([key, texture]) => {
        this.textures.set(key, texture as Texture);
      });

      this.loaded = true;
      console.log(`[ResourceManager] Successfully loaded ${this.textures.size} textures`);
    } catch (error) {
      console.error('[ResourceManager] Failed to load assets:', error);
      throw error;
    }
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
    
    const frameRect = new Rectangle(
      frameX * frameWidth,
      frameY * frameHeight,
      frameWidth,
      frameHeight
    );
    
    const frame = new Texture({
      source: texture.source,
      frame: frameRect,
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
