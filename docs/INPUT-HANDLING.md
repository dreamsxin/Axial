# Input Handling Guide

## 🎯 Overview

IsoRenderer now provides **unified input handling** that automatically manages:
- ✅ Mouse drag (pan)
- ✅ Click detection
- ✅ Keyboard controls
- ✅ Context menu suppression

No more manual event setup needed!

---

## 🖱️ Mouse Handling

### Default Behavior

```typescript
const renderer = new IsoRenderer({
  width: 800,
  height: 600,
  tileWidth: 64,
  tileHeight: 32,
  enablePan: true,      // Enable right-drag pan (default: true)
  panButton: 2,         // 0=left, 1=middle, 2=right (default: right)
});

await renderer.init(container);
// Input handlers are automatically setup!
```

### Callbacks

```typescript
// Pan start
renderer.onPanStart((x, y) => {
  console.log('Pan started at:', x, y);
});

// Pan move (includes delta and absolute position)
renderer.onPanMove((dx, dy, x, y) => {
  console.log('Panned:', dx, dy, 'Current:', x, y);
});

// Pan end
renderer.onPanEnd(() => {
  console.log('Pan ended');
});

// Click (left button, non-drag)
renderer.onClick((x, y) => {
  const tile = renderer.getTileAtScreen(x, y, map);
  if (tile) {
    console.log('Clicked tile:', tile.position);
  }
});
```

### Context Menu Suppression

The framework **automatically prevents** the browser context menu on right-click:

```typescript
// No need to do this manually anymore!
// renderer.app.canvas.addEventListener('contextmenu', e => e.preventDefault());
```

---

## ⌨️ Keyboard Handling

### Built-in Movement Controls

```typescript
// Setup keyboard with default movement (WASD + QE)
renderer.setupKeyboard({
  onMove: (dx, dy, dz) => {
    // dx: -1 (left) or 1 (right)
    // dy: -1 (up) or 1 (down)
    // dz: -1 (down level) or 1 (up level)
    
    cursorX += dx;
    cursorY += dy;
    cursorZ += dz;
  },
});
```

### Custom Key Handlers

```typescript
renderer.setupKeyboard({
  onMove: (dx, dy, dz) => {
    // Handle movement
  },
  onKey: (key, event) => {
    // Handle any other key
    if (key === 'r') {
      console.log('R pressed - reset view');
    }
    if (key === 'd') {
      renderer.toggleDebugOverlay();
    }
  },
});
```

### Common Keys

| Key | Action |
|-----|--------|
| `W` / `↑` | Move up (y-1) |
| `S` / `↓` | Move down (y+1) |
| `A` / `←` | Move left (x-1) |
| `D` / `→` | Move right (x+1) |
| `Q` | Lower Z level |
| `E` | Raise Z level |

---

## 🎯 Complete Example

```typescript
import { IsoRenderer } from './render/IsoRenderer';
import { Map } from './core/Map';
import { DebugPanel } from './ui/DebugPanel';

const renderer = new IsoRenderer({
  width: 800,
  height: 600,
  tileWidth: 64,
  tileHeight: 32,
  enablePan: true,
  panButton: 2,  // Right button
});

const map = new Map({ width: 50, height: 50, high: 2 });
const debugPanel = new DebugPanel(renderer, map);

async function init(): Promise<void> {
  await renderer.init(container);
  renderer.renderMap(map);
  debugPanel.init();

  // Use framework callbacks
  renderer.onPanMove((dx, dy, x, y) => {
    const tile = renderer.getTileAtScreen(x, y, map);
    if (tile) {
      debugPanel.updateMouseDisplay(x, y, tile.position.x, tile.position.y, tile.position.z);
    }
  });

  renderer.onClick((x, y) => {
    const tile = renderer.getTileAtScreen(x, y, map);
    if (tile) {
      debugPanel.setCursor(tile.position.x, tile.position.y, tile.position.z);
    }
  });

  // Mouse highlight (non-drag)
  renderer.app.stage.on('globalpointermove', (e) => {
    if (renderer.isDraggingNow()) return;
    
    const tile = renderer.getTileAtScreen(e.global.x, e.global.y, map);
    if (tile) {
      renderer.highlightTile(tile);
    }
  });

  // Keyboard controls
  renderer.setupKeyboard({
    onMove: (dx, dy, dz) => {
      const cursor = debugPanel.getCursor();
      debugPanel.setCursor(cursor.x + dx, cursor.y + dy, cursor.z + dz);
    },
  });
}

init();
```

---

## 🔧 Advanced Configuration

### Change Pan Button

```typescript
// Use middle mouse button for pan
const renderer = new IsoRenderer({
  // ...
  panButton: 1,  // Middle button
});
```

### Disable Pan

```typescript
const renderer = new IsoRenderer({
  // ...
  enablePan: false,  // Disable built-in pan
});

// Manual pan control
renderer.app.stage.on('pointerdown', (e) => {
  // Custom logic
});
```

### Check Drag State

```typescript
renderer.app.stage.on('globalpointermove', (e) => {
  if (renderer.isDraggingNow()) {
    // Don't process hover during drag
    return;
  }
  
  // Process hover logic
  const tile = renderer.getTileAtScreen(e.global.x, e.global.y, map);
  // ...
});
```

### Get Mouse Position

```typescript
const pos = renderer.getLastMousePosition();
console.log('Last mouse:', pos.x, pos.y);
```

---

## 🎨 Migration Guide

### Before (Manual Setup)

```typescript
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

renderer.app.stage.eventMode = 'static';
renderer.app.stage.hitArea = renderer.app.screen;

renderer.app.stage.on('rightdown', (e) => {
  isDragging = true;
  lastMouseX = e.global.x;
  lastMouseY = e.global.y;
});

renderer.app.stage.on('pointermove', (e) => {
  if (isDragging) {
    const dx = e.global.x - lastMouseX;
    const dy = e.global.y - lastMouseY;
    renderer.setOffset(offset.x + dx, offset.y + dy);
  }
});

renderer.app.canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});
```

### After (Framework)

```typescript
renderer.onPanMove((dx, dy, x, y) => {
  // Pan is automatic!
});

renderer.onClick((x, y) => {
  // Click handling
});

// Context menu automatically suppressed
```

---

## 📋 API Reference

### Renderer Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enablePan` | `boolean` | `true` | Enable right-drag pan |
| `panButton` | `0\|1\|2` | `2` | Mouse button for pan (0=left, 1=middle, 2=right) |

### Callbacks

| Method | Parameters | Description |
|--------|------------|-------------|
| `onPanStart(fn)` | `(x, y) => void` | Called when pan starts |
| `onPanMove(fn)` | `(dx, dy, x, y) => void` | Called during pan |
| `onPanEnd(fn)` | `() => void` | Called when pan ends |
| `onClick(fn)` | `(x, y) => void` | Called on left click (non-drag) |

### Keyboard

| Method | Parameters | Returns |
|--------|------------|---------|
| `setupKeyboard(handlers)` | `{ onMove?, onKey? }` | `() => void` (cleanup) |

### State

| Method | Returns | Description |
|--------|---------|-------------|
| `isDraggingNow()` | `boolean` | Check if currently dragging |
| `getLastMousePosition()` | `{ x, y }` | Get last mouse position |

---

## 🐛 Troubleshooting

### Context menu still appears

Make sure you're calling `renderer.init()`:

```typescript
await renderer.init(container);  // Sets up context menu suppression
```

### Pan not working

Check config:

```typescript
const renderer = new IsoRenderer({
  enablePan: true,  // Must be true
  panButton: 2,     // Right button
});
```

### Keyboard not responding

Make sure window has focus and you're calling `setupKeyboard`:

```typescript
renderer.setupKeyboard({
  onMove: (dx, dy, dz) => { /* ... */ }
});
```
