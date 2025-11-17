# Contributing to Geomeditate

Thank you for your interest in contributing to Geomeditate! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/geomeditate.git
   cd geomeditate
   ```

2. **Install in development mode**
   ```bash
   pip install -e .
   ```

3. **Run tests to ensure everything works**
   ```bash
   python -m unittest discover tests -v
   ```

## Code Style

- Follow PEP 8 guidelines for Python code
- Use meaningful variable and function names
- Add docstrings to all classes and functions
- Keep functions focused and single-purpose

## Testing

- Write tests for all new features
- Ensure all existing tests pass before submitting
- Aim for high test coverage

```bash
# Run all tests
python -m unittest discover tests -v
```

## Project Structure

```
geomeditate/
├── geomeditate/      # Main package
│   ├── cell.py       # Cell data structures
│   ├── grid.py       # Hexagonal grid
│   ├── puzzle.py     # Puzzle generation
│   ├── renderer.py   # Pygame rendering
│   ├── input_handler.py # Input handling
│   └── game.py       # Main game loop
└── tests/            # Test suite
    ├── test_grid.py
    ├── test_puzzle.py
    └── test_game_visual.py
```

## Submitting Changes

1. Create a new branch for your feature
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request on GitHub

## Areas for Contribution

- **New puzzle generators**: Different algorithms for creating puzzles
- **Additional clue types**: New ways to display information
- **Sound effects**: Audio feedback for actions
- **Level packs**: Pre-designed puzzle collections
- **UI improvements**: Better visuals and animations
- **Documentation**: Tutorials, guides, examples
- **Performance**: Optimization and efficiency improvements

## Questions?

Feel free to open an issue for discussion before making major changes!
