# Geomeditate

A hexagonal logic puzzle game inspired by Hexcells Infinite, where players use logic to identify active and inactive hexagonal tiles.

![Game Screenshot](https://github.com/user-attachments/assets/a24dba8e-e262-41fe-aeb7-b5ea83b678c1)

## Overview

Geomeditate is a hexagonal minesweeper-style logic puzzle game where mistakes are okay. Using clues displayed on the grid, players must determine which hexagonal cells should be active (blue) and which should be inactive (black), all through pure logic - no guessing required!

## Game Mechanics

### Controls
- **Left Click**: Mark a cell as Active (Blue)
- **Right Click**: Mark a cell as Inactive (Black)
- **R**: Reset the current puzzle
- **N**: Generate a new puzzle
- **ESC**: Quit the game

### Clue Types

The game uses several types of clues to help you solve the puzzle:

1. **Simple Number (e.g., "3")**: Indicates how many active cells surround this clue cell
2. **Curly Braces (e.g., "{3}")**: Three active cells surround this cell, and they are all consecutive (touching each other)
3. **Dashes (e.g., "-3-")**: Three active cells surround this cell, but they have at least one gap between them

All puzzles are solvable using pure logic - no guessing required!

## Installation

### Prerequisites
- Python 3.8 or higher
- pip

### Install from source

```bash
# Clone the repository
git clone https://github.com/Bezoar/geomeditate.git
cd geomeditate

# Install dependencies
pip install -r requirements.txt

# Install the package
pip install -e .
```

## Usage

### Running the game

```bash
# Run directly
python -m geomeditate.game

# Or use the installed command
geomeditate
```

### As a Python module

```python
from geomeditate.game import Game

# Create and run a game
game = Game(grid_radius=4, difficulty=0.35)
game.run()
```

## Development

### Project Structure

```
geomeditate/
├── geomeditate/
│   ├── __init__.py
│   ├── game.py          # Main game loop and controller
│   ├── grid.py          # Hexagonal grid implementation
│   ├── cell.py          # Cell data structures and states
│   ├── puzzle.py        # Puzzle generation and validation
│   ├── renderer.py      # Pygame rendering engine
│   └── input_handler.py # User input handling
├── tests/
│   ├── test_grid.py     # Grid and cell tests
│   ├── test_puzzle.py   # Puzzle generation tests
│   └── test_game_visual.py # Visual rendering tests
├── GAME_SPEC.md         # Game specification document
├── requirements.txt     # Python dependencies
├── setup.py            # Package setup configuration
└── README.md           # This file
```

### Running Tests

```bash
# Run all tests
python -m unittest discover tests -v

# Run specific test file
python -m unittest tests.test_grid -v
```

### Architecture

The game follows a modular architecture:

- **HexCell**: Represents individual hexagonal cells with state and clue information
- **HexGrid**: Manages the hexagonal grid layout and neighbor calculations
- **Puzzle**: Handles puzzle generation and solution validation
- **GameRenderer**: Renders the game using Pygame with hexagonal geometry
- **InputHandler**: Processes user input and maps to game actions
- **Game**: Main controller that orchestrates the game loop

## Spec Kit Methodology

This project was developed using the Spec Kit methodology for specification-driven development:

1. **Specification First**: Started with `GAME_SPEC.md` to define game mechanics and architecture
2. **Modular Design**: Each component has a clear, single responsibility
3. **Test-Driven**: Core logic is validated through unit tests
4. **Iterative Development**: Built incrementally with frequent testing

## Credits

Inspired by [Hexcells Infinite](https://store.steampowered.com/app/304410/Hexcells_Infinite/) by Matthew Brown.

## License

See [LICENSE](LICENSE) file for details.
