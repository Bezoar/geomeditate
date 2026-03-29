# Quickstart: Hex Grid Test App

**Branch**: `002-hex-grid-test-mechanics`

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm

## Setup

```bash
cd test-apps/01-grid-mechanics
npm install
```

## Development

```bash
npm run dev
```

Opens a browser at `http://localhost:5173` with hot reload.

## Testing

```bash
npm test           # Run tests once
npm run test:watch # Watch mode
npm run coverage   # With coverage report
```

## Build

```bash
npm run build      # Production build to dist/
```

## Project Structure

```
test-apps/01-grid-mechanics/
├── index.html              # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts             # App bootstrap, event wiring
│   ├── model/
│   │   ├── hex-coord.ts    # HexCoord type and neighbor/line utilities
│   │   ├── hex-cell.ts     # HexCell type and state transitions
│   │   └── hex-grid.ts     # HexGrid: cell collection, clue computation
│   ├── clues/
│   │   ├── neighbor.ts     # Neighbor clue computation + contiguity
│   │   ├── flower.ts       # Flower clue computation (2-hex radius)
│   │   └── line.ts         # Line clue computation (3 axes)
│   ├── grids/
│   │   ├── test-grids.ts   # Predefined test grid configurations
│   │   └── random-grid.ts  # Random grid generator
│   └── view/
│       ├── grid-renderer.ts  # SVG hex grid rendering
│       ├── clue-renderer.ts  # Clue text rendering (with notation toggle)
│       └── controls.ts       # UI controls (grid selector, restart, toggles)
└── tests/
    ├── hex-coord.test.ts
    ├── hex-cell.test.ts
    ├── hex-grid.test.ts
    ├── neighbor.test.ts
    ├── flower.test.ts
    ├── line.test.ts
    └── random-grid.test.ts
```

## Interaction Model

| Action | Input | Effect |
|--------|-------|--------|
| Open cell | Click covered cell | Reveals as empty (dark + clue) or filled (blue) |
| Mark cell | Shift+click covered cell | Marks as filled (blue) |
| Toggle ground truth | Option+click any cell | Switches filled↔empty, recomputes all clues |
| Re-cover cell | Shift+Option+click open/marked cell | Returns cell to covered state |
| Restart grid | Restart button | Resets all cells to initial revealed state |
| Switch grid | Grid selector dropdown | Loads a different test grid |
| Cover all | Cover All button | Sets all cells to covered state |
| Toggle contiguity | Contiguity toggle | Shows/hides `{n}` and `-n-` notation |
