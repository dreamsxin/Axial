/**
 * Resource Test Demo - Verify texture loading
 */

import { ResourceManager } from '../src/core/ResourceManager';
import { Application, Sprite } from 'pixi.js';

const resourceManager = new ResourceManager();

async function init(): Promise<void> {
  const configStatus = document.getElementById('config-status');
  const textureStatus = document.getElementById('texture-status');
  const tilesetsCount = document.getElementById('tilesets-count');
  const charactersCount = document.getElementById('characters-count');
  const fxCount = document.getElementById('fx-count');
  const preview = document.getElementById('preview');

  try {
    // Load texture configuration
    console.log('[Test] Loading texture.xml...');
    await resourceManager.loadTextureConfig('assets/xml/texture.xml');
    
    if (configStatus) {
      configStatus.textContent = '✅';
      configStatus.className = 'success';
    }

    // Update counts
    if (tilesetsCount) {
      tilesetsCount.textContent = resourceManager.tilesets.size.toString();
    }
    if (charactersCount) {
      charactersCount.textContent = resourceManager.characters.size.toString();
    }
    if (fxCount) {
      fxCount.textContent = resourceManager.fx.size.toString();
    }

    // Load textures
    console.log('[Test] Loading textures...');
    await resourceManager.loadTextures('assets');
    
    if (textureStatus) {
      textureStatus.textContent = `✅ ${resourceManager.textures.size} textures`;
      textureStatus.className = 'success';
    }

    // Preview tilesets
    resourceManager.tilesets.forEach((config, name) => {
      const card = createPreviewCard(`Tileset: ${name}`, config.tileWidth, config.tileHeight);
      preview?.appendChild(card);
      
      // Show first few frames
      const texture = resourceManager.getTilesetTexture(name);
      if (texture && preview) {
        showFrames(preview, texture, config, 'tileset', name);
      }
    });

    // Preview characters
    resourceManager.characters.forEach((config, name) => {
      const card = createPreviewCard(`Character: ${name}`, config.tileWidth, config.tileHeight);
      preview?.appendChild(card);
      
      const texture = resourceManager.getCharacterTexture(name);
      if (texture && preview) {
        showFrames(preview, texture, config, 'character', name);
      }
    });

    console.log('[Test] Resource test complete!');
  } catch (error) {
    console.error('[Test] Error:', error);
    if (configStatus) {
      configStatus.textContent = `❌ ${error}`;
      configStatus.className = 'error';
    }
    if (textureStatus) {
      textureStatus.textContent = '❌ Failed';
      textureStatus.className = 'error';
    }
  }
}

function createPreviewCard(title: string, frameWidth: number, frameHeight: number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'preview-card';
  
  const h3 = document.createElement('h3');
  h3.textContent = title;
  card.appendChild(h3);
  
  const frameGrid = document.createElement('div');
  frameGrid.className = 'frame-grid';
  frameGrid.style.gridTemplateColumns = `repeat(${Math.min(8, Math.floor(200 / frameWidth))}, 1fr)`;
  card.appendChild(frameGrid);
  
  return card;
}

function showFrames(
  container: HTMLElement,
  texture: any,
  config: any,
  type: string,
  name: string
): void {
  const frameGrid = container.querySelector('.frame-grid') as HTMLElement;
  if (!frameGrid) return;

  const totalFrames = config.tileX * config.tileY;
  const displayFrames = Math.min(totalFrames, 32); // Show max 32 frames

  for (let i = 0; i < displayFrames; i++) {
    const frameCell = document.createElement('div');
    frameCell.className = 'frame-cell';
    
    // Create mini canvas for each frame
    const canvas = document.createElement('canvas');
    canvas.width = config.tileWidth;
    canvas.height = config.tileHeight;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const frameX = i % config.tileX;
      const frameY = Math.floor(i / config.tileX);
      
      ctx.drawImage(
        texture.source.resource as HTMLImageElement,
        frameX * config.tileWidth,
        frameY * config.tileHeight,
        config.tileWidth,
        config.tileHeight,
        0,
        0,
        config.tileWidth,
        config.tileHeight
      );
    }
    
    frameCell.appendChild(canvas);
    frameGrid.appendChild(frameCell);
  }
}

init();
