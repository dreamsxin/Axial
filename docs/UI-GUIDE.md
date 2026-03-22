# UI Guide - Axial V2 Debug Panel

## 📐 UI 布局规范

### 标准布局

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────┐                           ┌─────────────┐  │
│  │  Info Panel │                           │ Debug Panel │  │
│  │  (Left)     │                           │  (Right)    │  │
│  │             │                           │             │  │
│  │ - Title     │                           │ - Checkboxes│  │
│  │ - Controls  │                           │ - Mouse pos │  │
│  │ - Hint      │                           │ - Tile info │  │
│  └─────────────┘                           └─────────────┘  │
│                                                              │
│  ┌─────────────┐                                            │
│  │ Layer Info  │                                            │
│  │ (Bottom Rt) │                                            │
│  │             │                                            │
│  │ - Z layers  │                                            │
│  │ - Colors    │                                            │
│  │ - Cursor Z  │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### 面板职责

| 面板 | 位置 | 内容 | 用途 |
|------|------|------|------|
| **Info Panel** | 左上 | 标题、控制说明、提示 | 展示 demo 基本信息和操作指南 |
| **Debug Panel** | 右上 | 复选框、鼠标坐标、Tile 信息 | 调试功能开关和实时数据 |
| **Layer Info** | 右下 | 图层信息、颜色、Cursor Z | 显示多层地图的图层状态 |

---

## 🎨 Debug Panel 详解

### 复选框选项

```
┌──────────────────────────┐
│ 🔧 Debug                 │
├──────────────────────────┤
│ ☑ Grid Markers           │  ← 显示网格标记（黄色十字）
│ ☑ Tile Dots              │  ← 显示 Tile 中心点（绿色圆点）
│ ☐ Tile Bounds            │  ← 显示 Tile 边界（粉色框）
│ ☑ Show Axes              │  ← 显示 XYZ 坐标轴
├──────────────────────────┤
│ Mouse: (450, 320)        │  ← 屏幕坐标
│ World: (10, 4, 0)        │  ← 等距世界坐标
│ Detected Z: 0            │  ← 自动检测的 Z 层
│ Tile: (10, 4, 0) | ...   │  ← Tile 详细信息
└──────────────────────────┘
```

### 开关功能说明

| 开关 | 显示内容 | 颜色 | 用途 |
|------|----------|------|------|
| **Grid Markers** | 黄色十字 | `#ffff00` | 标记每个 Tile 的中心点 |
| **Tile Dots** | 绿色圆点 | `#00ff00` | 显示 Tile 中心位置 |
| **Tile Bounds** | 粉色边框 | `#ff00ff` | 显示 Tile 的菱形边界 |
| **Show Axes** | XYZ 坐标轴 | R/G/B | 显示世界坐标系方向 |

### Tile 信息格式

```
Tile: (x, y, z) | Walkable: true/false | Frame: N
```

**示例**:
```
Tile: (10, 4, 0) | Walkable: true | Frame: 7
```

**字段说明**:
| 字段 | 说明 |
|------|------|
| `x, y, z` | Tile 在地图网格中的坐标 |
| `Walkable` | 是否可通行（绿色=可通行，棕色=不可通行） |
| `Frame` | 使用的纹理帧索引 |

---

## 🎯 统一使用规范

### 所有 Demo 必须包含

1. **Info Panel** (左上)
   - Demo 标题
   - 控制说明（鼠标 + 键盘）
   - 可选：指向 Debug Panel 的提示

2. **Debug Panel** (右上)
   - 通过 `DebugPanel` 组件自动创建
   - 必须启用 `showLayerInfo: true`
   - 可选：`showAxes: true`

3. **Layer Info** (右下)
   - 通过 `DebugPanel` 组件自动创建
   - 显示每个 Z 层的颜色和大小

### 代码示例

```typescript
import { DebugPanel } from '../src/ui/DebugPanel';

// 创建 DebugPanel（标准配置）
const debugPanel = new DebugPanel(renderer, map, {
  showGridMarkers: true,      // 显示网格标记
  showTileDots: true,         // 显示 Tile 点
  showTileBounds: false,      // 不显示边界
  showLayerInfo: true,        // 显示图层信息 ✅
  showAxes: true,             // 显示坐标轴
  title: '🔧 Debug',
  layerColors: ['#4a90a4', '#ff69b4'],  // 每层颜色
  layerSizes: [
    { width: 20, height: 20 },  // Z=0 尺寸
    { width: 8, height: 8 },    // Z=1 尺寸
  ],
});

// 初始化
debugPanel.init();
```

### HTML 模板

```html
<!-- Info Panel (左上) -->
<div id="ui">
  <h1>🎮 Demo Title</h1>
  <p><strong>Subtitle</strong></p>
  <hr />
  <p>🖱️ <strong>Hover:</strong> Highlight tiles</p>
  <p>🖱️ <strong>Left Click:</strong> Select tile</p>
  <p>🖱️ <strong>Right Drag:</strong> Pan world</p>
  <p>⌨️ <strong>WASD:</strong> Move cursor</p>
  <p>⌨️ <strong>QE:</strong> Change Z level</p>
  <p>⌨️ <strong>X:</strong> Toggle axes</p>
  <hr />
  <p style="color: #888; font-size: 12px;">📍 Tile info in Debug Panel →</p>
</div>

<!-- DebugPanel 和 LayerInfo 由组件自动创建 -->
<script type="module" src="./demo.ts"></script>
```

---

## 🎨 颜色规范

### Layer 颜色

| Z 层 | 颜色 | Hex | 用途 |
|------|------|-----|------|
| Z=0 | 🔵 蓝绿色 | `#4a90a4` | 地面层 |
| Z=1 | 🔴 粉红色 | `#ff69b4` | 上层平台 |
| Z=2 | 🟢 绿色 | `#4aa44a` | 更高层 |
| Z=3 | 🟠 橙色 | `#a44a4a` | 特殊层 |

### 坐标轴颜色

| 轴 | 颜色 | Hex | 方向 |
|----|------|-----|------|
| X | 🔴 红色 | `#ff4444` | 右下方 |
| Y | 🟢 绿色 | `#44ff44` | 左下方 |
| Z | 🔵 蓝色 | `#4444ff` | 垂直向上 |

### Walkable 颜色

| 状态 | 颜色 | Hex |
|------|------|-----|
| 可通行 | 🟦 蓝绿色 | `#4a90a4` |
| 不可通行 | 🟫 棕色 | `#8b4513` |

---

## 📋 检查清单

创建新 Demo 时检查：

- [ ] Info Panel 在左上角
- [ ] Debug Panel 在右上角（组件自动生成）
- [ ] Layer Info 在右下角（组件自动生成）
- [ ] Tile 信息在 Debug Panel 中显示
- [ ] 图层颜色与规范一致
- [ ] 控制说明完整（WASD+QE+X）
- [ ] 响应式布局（窗口缩放正常）

---

## 🔧 常见问题

### Q: Tile 信息不显示？

**A**: 确保调用了 `debugPanel.init()` 并且鼠标在地图上移动。

### Q: Layer Info 显示错误的尺寸？

**A**: 在配置中指定 `layerSizes`：
```typescript
layerSizes: [
  { width: 20, height: 20 },  // Z=0
  { width: 8, height: 8 },    // Z=1
]
```

### Q: 坐标轴不显示？

**A**: 
1. 设置 `showAxes: true`
2. 检查控制台是否有 `[DebugPanel] renderAxes` 日志
3. 确保 `debugPanel.renderAxes()` 在 `renderer.init()` 之后调用

### Q: 两个面板内容不一致？

**A**: 
- Info Panel 只显示静态信息（标题、控制说明）
- Debug Panel 显示动态信息（坐标、Tile 详情）
- **不要**在 Info Panel 中显示 Tile 信息

---

## 📚 相关文档

- [Input Handling Guide](./INPUT-HANDLING.md)
- [IsoRenderer API](../src/render/IsoRenderer.ts)
- [DebugPanel Source](../src/ui/DebugPanel.ts)
