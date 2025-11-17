# Geomeditate Game Specification

## Overview
Geomeditate is a hexagonal logic puzzle game inspired by Hexcells Infinite, where players use logic to identify which hexagonal tiles should be active (revealed) and which should be inactive, without making mistakes.

## Core Game Mechanics

### Grid System
- Hexagonal grid layout with 6 neighbors per cell
- Grid sizes: configurable (default: 10x10 hex grid)
- Cells have three states: unknown, active (blue), inactive (black)

### Cell Types
1. **Active Cells**: Blue hexagons that need to be identified
2. **Inactive Cells**: Black hexagons to be eliminated
3. **Clue Cells**: Cells that provide information about surrounding cells

### Clue System
1. **Simple Number (e.g., "3")**: Indicates how many active cells surround this cell
2. **Curly Braces (e.g., "{3}")**: Three active cells, all consecutive (touching each other)
3. **Dashes (e.g., "-3-")**: Three active cells, with at least one gap between them
4. **Question Mark ("?")**: No information about adjacent cells

### User Interactions
- Left Click: Mark a cell as active (blue)
- Right Click: Mark a cell as inactive (black)
- Mistakes are tracked
- All puzzles solvable through logic alone (no guessing required)

## Technical Architecture

### Module Structure
```
geomeditate/
├── __init__.py
├── game.py          # Main game loop
├── grid.py          # Hexagonal grid implementation
├── cell.py          # Cell data structures
├── puzzle.py        # Puzzle generation and validation
├── renderer.py      # Pygame rendering
├── input_handler.py # User input handling
└── utils.py         # Helper functions
```

### Core Classes
1. **HexCell**: Represents a single hexagonal cell
2. **HexGrid**: Manages the grid of hexagonal cells
3. **Puzzle**: Generates and validates puzzles
4. **GameRenderer**: Renders the game using Pygame
5. **InputHandler**: Handles user input events
6. **Game**: Main game controller

## Dependencies
- pygame: 2D game rendering
- numpy: Grid calculations (optional)

## Success Criteria
- Player can interact with hexagonal grid
- Cells display clue information correctly
- Player actions (reveal/mark) work properly
- Game validates player solutions
- Mistakes are tracked
- Basic puzzle generation works
