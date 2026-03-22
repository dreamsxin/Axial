# Axial V2 - Demos

## 🎯 Quick Start

### Simple Demo Template (Recommended for new projects)

```bash
# Open in browser
open demo-simple.html
```

**Features:**
- ✅ Minimal setup (~100 lines)
- ✅ Reusable DebugPanel component
- ✅ Mouse hover/click
- ✅ Right-drag pan
- ✅ Keyboard controls (WASD + QE)

---

## 📁 Demo Files

| File | Description |
|------|-------------|
| `demo-simple.html` + `.ts` | **Starter template** - Use this for new demos |
| `main.ts` + `index.html` | Full Phase 1 demo with layer colors |
| `iso-tile-editor.html` + `.ts` | Tile palette + 10×10 grid editor |

---

## 🔧 Using the DebugPanel Component

### 1. Import

```typescript
import { DebugPanel } from '../src/ui/DebugPanel';
```

### 2. Create

```typescript
const debugPanel = new DebugPanel(renderer, map, {
  showGridMarkers: true,
  showTileDots: true,
  showTileBounds: false,
  showLayerInfo: true,
  title: '🔧 Debug',
});
```

### 3. Initialize

```typescript
async function init(): Promise<void> {
  await renderer.init(container);
  debugPanel.init();  // Call after renderer is ready
}
```

### 4. Use in Event Handlers

```typescript
// Mouse move
renderer.app.stage.on('globalpointermove', (e) => {
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
  }
});

// Tile selection
renderer.app.stage.on('pointerdown', (e) => {
  const tile = renderer.getTileAtScreen(e.global.x, e.global.y, map);
  if (tile) {
    debugPanel.setCursor(tile.position.x, tile.position.y, tile.position.z);
  }
});
```

---

## 🎨 DebugPanel API

### Constructor Options

```typescript
interface DebugPanelConfig {
  showGridMarkers?: boolean;   // Show grid cross markers
  showTileDots?: boolean;      // Show tile center dots
  showTileBounds?: boolean;    // Show tile outlines
  showLayerInfo?: boolean;     // Show layer info panel
  title?: string;              // Panel title
}
```

### Methods

| Method | Description |
|--------|-------------|
| `init()` | Initialize panel (call once) |
| `updateCursorHighlight()` | Refresh cursor highlight |
| `updateMouseDisplay(screenX, screenY, tileX, tileY, z)` | Update mouse position display |
| `setCursor(x, y, z)` | Set cursor position |
| `getCursor()` | Get current cursor position |
| `getDebugState()` | Get checkbox states |
| `destroy()` | Cleanup |

---

## 📐 Using IsoRenderer Framework

### Basic Setup

```typescript
import { IsoRenderer } from '../src/render/IsoRenderer';
import { Map } from '../src/core/Map';

const renderer = new IsoRenderer({
  width: 800,
  height: 600,
  tileWidth: 64,
  tileHeight: 32,
  tileHigh: 10,
  backgroundColor: 0x1a1a2e,
  offsetX: 100,  // Optional: container offset
  offsetY: 80,
});

const map = new Map({ width: 50, height: 50, high: 2 });

await renderer.init(container);
renderer.renderMap(map);
```

### Container Management

The framework handles container hierarchy automatically:

```
app.stage
└── rootContainer (managed by framework)
    ├── mapContainer (tiles)
    ├── highlightContainer (hover)
    └── debugContainer (overlay)
```

### Panning

```typescript
// Get/Set offset
const offset = renderer.getOffset();
renderer.setOffset(offset.x + dx, offset.y + dy);

// Or direct access
renderer.rootContainer.x = 100;
renderer.rootContainer.y = 80;
```

### Mouse → Tile Conversion

```typescript
// Automatically handles container offset
const tile = renderer.getTileAtScreen(mouseX, mouseY, map);
if (tile) {
  console.log('Tile:', tile.position.x, tile.position.y, tile.position.z);
}
```

---

## 🎯 Creating a New Demo

### Step 1: Copy Template

```bash
cp demo-simple.html my-demo.html
cp demo-simple.ts my-demo.ts
```

### Step 2: Update HTML

```html
<title>My Demo</title>
<script type="module" src="./my-demo.ts"></script>
```

### Step 3: Customize

```typescript
// Change map size
const map = new Map({ width: 30, height: 30, high: 1 });

// Change tile size
const renderer = new IsoRenderer({
  tileWidth: 60,
  tileHeight: 40,
  // ...
});
```

---

## 🐛 Debugging Tips

### Enable Debug Overlay

```typescript
renderer.toggleDebugOverlay(true);
renderer.renderDebugOverlay(map);
```

### Print Debug Info

```typescript
console.log('Offset:', renderer.getOffset());
console.log('Tile at mouse:', renderer.getTileAtScreen(x, y, map));
```

### Round-trip Test

```typescript
const tile = { x: 5, y: 5, z: 0 };
const screen = renderer.isoMath.tileToScreen(tile);
const back = renderer.isoMath.screenToTile(screen, 0);
console.log('Round-trip:', tile, '→', screen, '→', back);
```

---

## 📚 Resources

- [IsoRenderer Source](../src/render/IsoRenderer.ts)
- [DebugPanel Source](../src/ui/DebugPanel.ts)
- [IsoMath Source](../src/math/IsoMath.ts)
