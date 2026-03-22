# 🎮 Axial V2 - Phase 2: Character System

**Status**: 🔄 In Progress  
**Started**: 2026-03-22 14:57 GMT+8  
**Phase 2.1 Complete**: 2026-03-22 15:05 GMT+8

---

## 📋 Development Plan

### Phase 2.1: Character Sprite Rendering ✅ COMPLETE

**Completed**: 2026-03-22 15:05 GMT+8

**Files Created**:
- `src/core/Character.ts` - Character class (220 lines)
- `demo/character-demo.html` - Demo HTML
- `demo/character-demo.ts` - Demo logic

**Files Modified**:
- `src/core/index.ts` - Export Character class
- `src/core/ResourceManager.ts` - Fixed Rectangle type for PixiJS v8

**Features Implemented**:
- Character sprite rendering from texture atlas
- Dynamic direction support based on spritesheet rows (charset1: 5 directions)
- Dynamic frames per direction based on spritesheet columns (charset1: 8 frames)
- Frame extraction with proper offset (10, 10)
- WASD movement with direction facing
- Direction keys (1-5 for charset1) for manual direction setting
- Animation toggle (Space)
- Position reset (R)
- Real-time info panel showing direction, frame, position, spritesheet layout

**Spritesheet Configuration** (from texture.xml):
```xml
<png charsetName="charset1" type="char" 
     tileWidth="64" tileHeight="64" 
     tileX="8" tileY="5" 
     offsetX="10" offsetY="10">
```
- `tileX="8"` → 8 columns (frames per direction)
- `tileY="5"` → 5 rows (directions)
- Total: 40 frames (8 × 5)
- Frame formula: `globalIndex = direction * tileX + frame`

**Demo Controls**:
- **WASD** - Move character (auto Walk animation, clears manual mode)
- **1** - Stand | **2** - Walk | **3** - Attack | **4** - Hurt (hold to maintain)
- **F** - Flip direction (Front ↔ Back)
- **R** - Reset position to (5, 5, 0) (clears manual action)
- **Character Dropdown** - Switch between 10 character sets

**Note**: 
- All animations loop continuously (including Stand).
- Pressing 1-4 sets manual action mode (overrides auto-switch).
- Pressing WASD to move automatically clears manual mode and restores auto-switch.
- Press R to clear manual mode and restore auto-switch behavior.

---

## 🎨 IsoEngine Spritesheet Layout (4 rows × 8 columns)

### Row = Action Type
| Row | Action | Description |
|-----|--------|-------------|
| 0 | **Stand** | Standing idle |
| 1 | **Walk** | Walking cycle |
| 2 | **Attack** | Attack animation |
| 3 | **Hurt** | Take damage |

### Column = Frame + View Direction
| Columns | 0-3 | 4-7 |
|---------|-----|-----|
| **View** | **Front** (East/North) | **Back** (West/South) |
| **When** | Moving Right (D) or Up (W) | Moving Left (A) or Down (S) |

### Frame Index Calculation
```
halfColumns = columns / 2  // e.g., 8/2 = 4 frames per view

globalFrameIndex = action * columns + frameOffset

where frameOffset = 
  frame (when direction = Front)
  frame + halfColumns (when direction = Back)
```

**Examples** (charset1: 8 columns × 5 rows, halfColumns=4):
| Action | View | Frame | Global Index |
|--------|------|-------|--------------|
| Stand | Front | 0 | 0×8 + 0 = **0** |
| Stand | Front | 3 | 0×8 + 3 = **3** |
| Stand | Back | 0 | 0×8 + 4 = **4** |
| Walk | Front | 0 | 1×8 + 0 = **8** |
| Walk | Back | 2 | 1×8 + 6 = **14** |
| Attack | Front | 0 | 2×8 + 0 = **16** |
| Attack | Back | 0 | 2×8 + 4 = **20** |

---

## 🎮 Auto Action Switching

| State | Action |
|-------|--------|
| Standing still | **Stand** (Row 0) |
| Moving (WASD) | **Walk** (Row 1) |
| Manual override | Use keys 1-5 |

---

## 🧭 Direction Mapping

| Move Key | dx | dy | View | Uses Frames |
|----------|----|----|------|-------------|
| **D** (East) | +1 | 0 | Front | 0-3 |
| **S** (South) | 0 | +1 | Front | 0-3 |
| **W** (North) | 0 | -1 | Back | 4-7 |
| **A** (West) | -1 | 0 | Back | 4-7 |

**Mnemonic**: D/S → Front (朝向屏幕), W/A → Back (背向屏幕) |

**Available Characters** (from texture.xml):
| Name | Tile Size | Spritesheet | Total Frames |
|------|-----------|-------------|--------------|
| templeKnight | 64×64 | 8×4 | 32 |
| bandit | 64×64 | 8×4 | 32 |
| fallen | 64×64 | 8×4 | 32 |
| wolf | 64×64 | 8×4 | 32 |
| rat | 64×64 | 8×4 | 32 |
| orc | 64×64 | 8×4 | 32 |
| orge | 64×64 | 8×4 | 32 |
| zombie | 64×64 | 8×4 | 32 |
| **charset1** | 64×64 | **8×5** | **40** |
| charset2 | 64×64 | 8×4 | 32 |

**Debug Features**:
- Isometric grid overlay (12×12)
- Axis indicators: X=red, Y=green, Z=blue
- Tile center dots
- Real-time position panels (screen + tile coordinates)
- Mouse tracking (shows tile under cursor)

**Access**: http://localhost:8081/character-demo.html

**Debug**: Open browser console (F12) to see loading logs:
- `[CharacterDemo]` - Demo initialization
- `[ResourceManager]` - Asset loading
- `[Character]` - Sprite creation

### Phase 2.2: Character Movement
- [ ] WASD keyboard movement
- [ ] Smooth interpolation between tiles
- [ ] Direction facing based on movement
- [ ] Animation frame cycling while moving

### Phase 2.3: Multiple Characters
- [ ] Character container/manager
- [ ] Depth sorting (characters + tiles)
- [ ] Multiple character rendering
- [ ] Character selection/clicking

### Phase 2.4: Collision & Physics
- [ ] Tile collision detection
- [ ] Character-to-character collision
- [ ] Jump/fall mechanics (Z-axis movement)
- [ ] Gravity simulation

### Phase 2.5: Animation System
- [ ] Idle animation loop
- [ ] Walk animation cycle
- [ ] Attack animation
- [ ] State machine (idle/walk/attack/hurt)

---

## 🎯 Phase 2.1: Character Sprite Rendering

### Character Sprite Format (IsoEngine)
- **Tile Size**: 64×64 pixels
- **Grid**: 8 columns × 5 rows (charset1: 40 frames total)
- **Offset**: 10px X, 10px Y (for centering)
- **Directions**: 8 directions (N, NE, E, SE, S, SW, W, NW)
- **Frames per direction**: ~5 frames for walk cycle

### Frame Layout (8×5 grid)
```
Row 0: Direction 0 (South) - Frames 0-7
Row 1: Direction 1 (South-West) - Frames 8-15
Row 2: Direction 2 (West) - Frames 16-23
Row 3: Direction 3 (North-West) - Frames 24-31
Row 4: Direction 4 (North) - Frames 32-39
... (continues for all 8 directions)
```

### Character Class API
```typescript
interface CharacterConfig {
  charsetName: string;      // e.g., "charset1"
  tileWidth: number;        // 64
  tileHeight: number;       // 64
  offsetX: number;          // 10
  offsetY: number;          // 10
}

class Character {
  // Position in isometric tile space
  tileX: number;
  tileY: number;
  tileZ: number;
  
  // Direction (0-7, where 0=South, 2=East, 4=North, 6=West)
  direction: number;
  
  // Current animation frame (0-7 for walk cycle)
  frame: number;
  
  // Movement state
  isMoving: boolean;
  moveSpeed: number;
  
  // Render
  render(renderer: IsoRenderer): void;
  setDirection(dx: number, dy: number): void;
  update(deltaTime: number): void;
}
```

### Demo Requirements
- Load charset1.png texture
- Parse texture.xml for charset1 config
- Render character at center of map
- Display frame info (direction, frame index)
- Debug overlay showing sprite bounds

---

## 📁 Files to Create/Modify

### New Files
- `src/core/Character.ts` - Character class
- `src/core/CharacterManager.ts` - Manage multiple characters
- `demo/character-demo.html` - Character rendering demo
- `demo/character-demo.ts` - Demo logic

### Modified Files
- `src/core/index.ts` - Export Character
- `src/render/IsoRenderer.ts` - Add character rendering support

---

## 🧪 Testing Checklist

- [ ] Character loads from charset1.png
- [ ] All 8 directions render correctly
- [ ] Animation frames cycle properly
- [ ] Character positions correctly in isometric space
- [ ] Depth sorting works (characters behind/in-front of tiles)
- [ ] Multiple characters render without issues

---

## 🚀 Commands

```bash
cd AxialV2
npm run dev          # Start dev server
# Access: http://localhost:8081/character-demo.html
```

---

*Phase 2 Start: 2026-03-22 14:57 GMT+8*
