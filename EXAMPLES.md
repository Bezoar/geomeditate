# Example Usage

This document provides examples of how to use and extend Geomeditate.

## Basic Usage

### Running the Game

The simplest way to run the game:

```bash
# After installation
geomeditate
```

Or using the demo script:

```bash
python demo.py
```

### Custom Game Configuration

You can customize the game parameters:

```python
from geomeditate.game import Game

# Create a larger grid with higher difficulty
game = Game(grid_radius=6, difficulty=0.5)
game.run()
```

## Working with the Grid

### Creating a Custom Grid

```python
from geomeditate.grid import HexGrid
from geomeditate.cell import HexCell

# Create a grid
grid = HexGrid(radius=3)

# Get a specific cell
center_cell = grid.get_cell(0, 0)

# Get neighbors
neighbors = grid.get_neighbors(center_cell)
print(f"Center cell has {len(neighbors)} neighbors")

# Iterate over all cells
for cell in grid.get_all_cells():
    print(f"Cell at ({cell.q}, {cell.r})")
```

### Hex Coordinate System

The game uses axial coordinates (q, r) for hexagons:
- q: column (increases to the right)
- r: row (increases down-right)
- s: derived coordinate (s = -q - r)

## Puzzle Generation

### Generating Puzzles

```python
from geomeditate.grid import HexGrid
from geomeditate.puzzle import Puzzle

# Create a grid and puzzle
grid = HexGrid(radius=4)
puzzle = Puzzle(grid, difficulty=0.3)

# Generate a random puzzle
puzzle.generate()

# Generate with a specific seed for reproducibility
puzzle.generate(seed=42)
```

### Checking Solutions

```python
# Mark a cell
cell = grid.get_cell(1, 0)
if cell:
    cell.mark_active()
    
    # Check if it's correct
    is_correct = puzzle.check_cell(cell)
    print(f"Move was {'correct' if is_correct else 'incorrect'}")

# Check completion
if puzzle.is_complete():
    print(f"Puzzle solved with {puzzle.mistakes} mistakes!")
```

## Rendering

### Headless Rendering

For testing or non-interactive use:

```python
import os
os.environ['SDL_VIDEODRIVER'] = 'dummy'

import pygame
from geomeditate.game import Game

game = Game(grid_radius=4, difficulty=0.35)
game.render()

# Save screenshot
pygame.image.save(game.renderer.screen, "puzzle.png")
game.cleanup()
```

## Extending the Game

### Custom Clue Types

You can extend the game with custom clue logic:

```python
from geomeditate.cell import ClueType, HexCell

# The ClueType enum can be extended
# Modify puzzle.py's _generate_clues() method to add custom logic
```

### Custom Puzzle Generation

Create your own puzzle generator:

```python
from geomeditate.grid import HexGrid
from geomeditate.cell import CellState

grid = HexGrid(radius=3)

# Manually set up a puzzle
center = grid.get_cell(0, 0)
center.is_solution_active = True

# Set up clues
for neighbor in grid.get_neighbors(center):
    neighbor.state = CellState.REVEALED
    neighbor.clue_value = 1
```

## Running Tests

```bash
# Run all tests
python -m unittest discover tests -v

# Run specific test module
python -m unittest tests.test_grid -v

# Run with coverage (if installed)
coverage run -m unittest discover tests
coverage report
```

## Game Logic Examples

### Consecutive vs Separated Clues

```python
from geomeditate.grid import HexGrid

grid = HexGrid(radius=3)
cell = grid.get_cell(0, 0)

# Mark some neighbors as active
neighbors = grid.get_neighbors(cell)
neighbors[0].is_solution_active = True
neighbors[1].is_solution_active = True  # Adjacent to neighbors[0]

# Check if consecutive
is_consecutive = grid.are_neighbors_consecutive(cell)
print(f"Active neighbors are consecutive: {is_consecutive}")
```

### Counting Active Neighbors

```python
from geomeditate.grid import HexGrid

grid = HexGrid(radius=3)
cell = grid.get_cell(0, 0)

# Mark some neighbors as active
neighbors = grid.get_neighbors(cell)
for i in range(3):
    neighbors[i].is_solution_active = True

# Count them
count = grid.count_active_neighbors(cell)
print(f"Cell has {count} active neighbors")
```

## Tips for Solving Puzzles

1. **Start with simple numbers**: Cells with simple count clues are easiest
2. **Use curly braces**: {n} tells you all n cells must be touching
3. **Use dashes**: -n- tells you the cells have gaps
4. **Process of elimination**: When you know some neighbors, deduce the rest
5. **No guessing needed**: All puzzles are solvable with logic alone!
