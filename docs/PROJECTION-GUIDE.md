# Projection Guide - Tile 投影配置指南

## 📐 支持的投影类型

### 1. Isometric (等距投影 - 30°)

**特点**: 菱形宽高比 2:1，标准等距视角

```typescript
const renderer = new IsoRenderer({
  tileWidth: 64,
  tileHeight: 32,  // 宽高比 2:1
  tileHigh: 10,
  projection: 'isometric',  // 默认值，可省略
});
```

**适用**: 标准等距游戏地图

---

### 2. Dimetric (斜距投影 - 26.565°)

**特点**: 菱形宽高比 2:1，但视角略有不同

```typescript
const renderer = new IsoRenderer({
  tileWidth: 64,
  tileHeight: 32,
  tileHigh: 10,
  projection: 'dimetric',
});
```

**适用**: 2D 游戏常用的伪等距视角（如早期 RPG）

---

### 3. Staggered (交错投影)

**特点**: 矩形布局，奇偶行/列交错排列

```typescript
const renderer = new IsoRenderer({
  tileWidth: 60,
  tileHeight: 40,
  tileHigh: 10,
  projection: 'staggered',
  staggerAxis: 'y',     // 按行交错
  staggerEven: true,    // 偶数行偏移
});
```

**适用**: 六边形地图、特殊布局的 tileset

---

## 🎯 常见 Tileset 配置

### Axial V2 / IsoEngine (60×40)

```typescript
// 地面图块实际尺寸 60×40px
const config = {
  tileWidth: 60,
  tileHeight: 40,
  tileHigh: 10,
  projection: 'isometric',
};
```

### Tiled Map Editor (标准等距)

```typescript
// Tiled 默认等距 tile 尺寸
const config = {
  tileWidth: 64,
  tileHeight: 32,  // 2:1 比例
  tileHigh: 16,
  projection: 'isometric',
};
```

### Pixel Art RPG (32×16)

```typescript
// 小尺寸像素艺术
const config = {
  tileWidth: 32,
  tileHeight: 16,
  tileHigh: 8,
  projection: 'dimetric',
};
```

### Hexagonal (六边形)

```typescript
// 六边形 tile 使用交错投影
const config = {
  tileWidth: 64,
  tileHeight: 56,  // 六边形高度
  tileHigh: 10,
  projection: 'staggered',
  staggerAxis: 'y',
  staggerEven: true,
};
```

---

## 🔧 高级配置

### Z 轴高度

```typescript
const config = {
  tileWidth: 64,
  tileHeight: 32,
  tileHigh: 20,  // 每层 Z 高度 20px
};
```

**效果**: 
- Z=0 → 地面
- Z=1 → 20px 高度
- Z=2 → 40px 高度

### 自定义偏移

```typescript
const config = {
  tileWidth: 64,
  tileHeight: 32,
  offsetX: 400,  // 地图原点 X 偏移
  offsetY: 150,  // 地图原点 Y 偏移
};
```

---

## 📊 投影对比

| 投影类型 | tileWidth | tileHeight | 宽高比 | 适用场景 |
|----------|-----------|------------|--------|----------|
| **Isometric** | 64 | 32 | 2:1 | 标准等距地图 |
| **Dimetric** | 64 | 32 | 2:1 | 2D RPG 游戏 |
| **Staggered** | 60 | 40 | 3:2 | 六边形/特殊布局 |
| **Custom** | 任意 | 任意 | 任意 | 自定义 tileset |

---

## 🎨 实际案例

### 案例 1: 适配现有 tileset

```typescript
// 1. 测量 tile 图片尺寸
// tileset.png 中每个 tile = 60×40px

// 2. 配置 renderer
const renderer = new IsoRenderer({
  tileWidth: 60,
  tileHeight: 40,
  tileHigh: 10,
  projection: 'isometric',  // 默认
});

// 3. 验证投影
const screen = renderer.isoMath.tileToScreen({ x: 0, y: 0, z: 0 });
console.log('Origin:', screen);  // 应为 (0, 0)

const screen2 = renderer.isoMath.tileToScreen({ x: 1, y: 1, z: 0 });
console.log('Tile (1,1):', screen2);  // 应为 (0, 40)
```

### 案例 2: 多层地图

```typescript
const map = new Map({ width: 50, height: 50, high: 3 });

const renderer = new IsoRenderer({
  tileWidth: 64,
  tileHeight: 32,
  tileHigh: 16,  // 每层 16px 高度
  projection: 'isometric',
});

// Z=0: 地面
// Z=1: 16px 高度（如桌子）
// Z=2: 32px 高度（如屋顶）
```

### 案例 3: 六边形地图

```typescript
const renderer = new IsoRenderer({
  tileWidth: 64,
  tileHeight: 56,  // 六边形高度
  tileHigh: 10,
  projection: 'staggered',
  staggerAxis: 'y',    // 行交错
  staggerEven: false,  // 奇数行偏移
});
```

---

## 🔍 调试技巧

### 检查投影配置

```typescript
console.log('Projection:', renderer.isoMath['projection']);
console.log('Tile size:', renderer.config.tileWidth, '×', renderer.config.tileHeight);

// 测试坐标转换
const testTile = { x: 5, y: 5, z: 0 };
const screen = renderer.isoMath.tileToScreen(testTile);
const back = renderer.isoMath.screenToTile(screen, 0);
console.log('Round-trip:', testTile, '→', screen, '→', back);
```

### 可视化验证

```typescript
// 启用调试面板
const debugPanel = new DebugPanel(renderer, map, {
  showAxes: true,  // 显示坐标轴
  showTileDots: true,
  showGridMarkers: true,
});
```

---

## 🎮 实时切换投影

在 **iso-tile-editor.html** 中可以实时切换投影类型：

### 方法 1: 下拉菜单
右下角选择投影类型：
- 🔷 **Isometric (30°)** - 标准等距
- 🔶 **Dimetric (26.5°)** - 斜距
- ▣ **Staggered** - 交错布局

### 方法 2: 键盘快捷键
按 **P** 键循环切换投影类型

### 效果
切换后立即重新渲染网格，可以直观对比不同投影的视觉效果！

---

## 📚 相关文档

- [UI Guide](./UI-GUIDE.md) - 调试面板使用
- [Input Handling](./INPUT-HANDLING.md) - 输入控制
- [IsoMath Source](../src/math/IsoMath.ts) - 投影数学实现
