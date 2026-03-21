# 🎮 Axial V2 - Phase 1: Core Engine

**Status**: ✅ Complete  
**Demo**: http://localhost:8080

---

## 📦 What's Built

### 1. IsoMath (`src/math/IsoMath.ts`)
- ✅ Tile ↔ Screen coordinate conversion
- ✅ Depth calculation for sorting
- ✅ Based on original IsoEngine formulas

### 2. Map System (`src/core/Map.ts`, `src/core/Tile.ts`)
- ✅ 3D tile grid `[z][y][x]`
- ✅ Tile frame parsing (IsoEngine compression format)
- ✅ Walkable/impassable flags
- ✅ Depth-sorted tile retrieval

### 3. PixiJS Renderer (`src/render/IsoRenderer.ts`)
- ✅ WebGL isometric rendering
- ✅ Depth-sorted tile drawing
- ✅ Mouse hover highlight
- ✅ Screen → Tile picking

### 4. ResourceManager (`src/core/ResourceManager.ts`)
- ✅ XML texture configuration parsing
- ✅ Tileset loading (tileset.png, addtileset.png)
- ✅ Character sprite loading (10 character sets)
- ✅ FX texture loading
- ✅ Frame extraction from texture atlases
- ✅ Asset path resolution

### 4. Interactive Demo (`demo/`)
- ✅ 20×15×2 map with terrain
- ✅ Mouse hover/click interaction
- ✅ WASD keyboard cursor movement
- ✅ Q/E for Z-level switching

---

## 🎯 Demo Controls

**Main Demo (index.html):** http://localhost:8080

**Resource Test (resource-test.html):** http://localhost:8080/resource-test.html
- View loaded tilesets with frame preview
- View character sprites (10 character sets)
- Verify texture atlas loading

| Input | Action |
|-------|--------|
| 🖱️ Mouse Hover | Highlight tile |
| 🖱️ Click | Select tile (update cursor) |
| W/A/S/D | Move cursor |
| Q/E | Change Z level |
| G | Toggle grid markers |
| C | Toggle coordinate dots |

## 🔧 Debug Panel

**Right-side panel:**
- **Grid Markers**: Yellow center crosses on tiles
- **Tile Dots**: White dots on walkable tiles
- **Tile Bounds**: Toggle bounds visualization
- **Live Coordinates**: Screen ↔ World position display
- **Detected Z**: Shows which Z layer the mouse is over

**Bottom-right layer info:**
- Layer Z=0 (Ground) - Blue-teal color
- Layer Z=1 (Upper) - Purple color
- Current cursor Z level

**Layer Visualization:**
- Z=0 (ground): Blue-teal tiles
- Z=1 (upper): Purple tiles
- Makes it easy to see which layer you're interacting with

---

## ✅ Phase 1 Acceptance Checklist

- [x] Isometric projection math matches IsoEngine formulas
- [x] 3D tile map data structure implemented
- [x] Tile frame compression parsing works
- [x] WebGL renderer displays isometric grid
- [x] Depth sorting renders tiles in correct order
- [x] Mouse interaction (hover/click) works
- [x] Keyboard controls functional
- [x] Demo runs at 60fps

---

## 🚀 Next: Phase 2

**DynamicTile + Character System**
- Character sprite rendering
- Movement animation
- Jump/fall physics
- Collision detection

---

## 📁 Project Structure

```
AxialV2/
├── src/
│   ├── math/
│   │   ├── IsoMath.ts       # Coordinate conversion
│   │   └── index.ts
│   ├── core/
│   │   ├── Tile.ts          # Tile data structure
│   │   ├── Map.ts           # 3D tile grid
│   │   ├── ResourceManager.ts # Asset loading
│   │   └── index.ts
│   └── render/
│       ├── IsoRenderer.ts   # PixiJS renderer
│       └── index.ts
├── assets/                    # IsoEngine resources
│   ├── tilesets/            # tileset.png, addtileset.png
│   ├── characters/          # 10 character sets
│   ├── fx/                  # Effects
│   ├── emoticons/           # Emoticons
│   ├── items/               # Items
│   └── xml/                 # texture.xml
├── demo/
│   ├── index.html           # Main demo
│   ├── main.ts
│   ├── resource-test.html   # Resource test
│   └── resource-test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── PHASE1_README.md
```

---

## 🐛 Fixes Applied

**Issue**: Two-layer grid, highlight position incorrect
**Fix**: 
- `getTileAtScreen()` now checks all Z layers from top to bottom
- Returns first non-empty tile at the mouse position
- Added `Detected Z` display in debug panel
- Different colors per Z layer for visual clarity

---

*Phase 1 completed: 2026-03-21 22:30 GMT+8*
*Updated: 2026-03-21 22:42 GMT+8 - Multi-layer fix*
