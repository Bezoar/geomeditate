"""Main game loop and controller."""

import pygame
import sys
from .grid import HexGrid
from .puzzle import Puzzle
from .renderer import GameRenderer
from .input_handler import InputHandler


class Game:
    """Main game controller."""
    
    def __init__(self, grid_radius: int = 5, difficulty: float = 0.3):
        """
        Initialize the game.
        
        Args:
            grid_radius: Radius of the hexagonal grid
            difficulty: Puzzle difficulty (0.0 to 1.0)
        """
        self.grid = HexGrid(radius=grid_radius)
        self.puzzle = Puzzle(self.grid, difficulty=difficulty)
        self.renderer = GameRenderer()
        self.input_handler = InputHandler(self.renderer, self.grid)
        
        self.running = True
        self.clock = pygame.time.Clock()
        
        # Generate initial puzzle
        self.puzzle.generate()
        
    def reset_puzzle(self):
        """Reset the current puzzle."""
        self.grid.reset_all()
        self.puzzle.mistakes = 0
        
    def new_puzzle(self):
        """Generate a new puzzle."""
        self.puzzle.generate()
        
    def handle_events(self):
        """Handle all input events."""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                
            elif event.type == pygame.MOUSEBUTTONDOWN:
                cell = self.input_handler.handle_mouse_click(event.pos, event.button)
                if cell:
                    # Check if the move is correct
                    self.puzzle.check_cell(cell)
                    
            elif event.type == pygame.KEYDOWN:
                action = self.input_handler.handle_keyboard(event.key)
                if action == 'reset':
                    self.reset_puzzle()
                elif action == 'new':
                    self.new_puzzle()
                elif action == 'quit':
                    self.running = False
    
    def update(self):
        """Update game state."""
        # Check if puzzle is complete
        if self.puzzle.is_complete():
            print(f"Puzzle complete! Mistakes: {self.puzzle.mistakes}")
    
    def render(self):
        """Render the game."""
        completion = self.puzzle.get_completion_percentage()
        self.renderer.render(self.grid, self.puzzle.mistakes, completion)
    
    def run(self):
        """Main game loop."""
        while self.running:
            self.handle_events()
            self.update()
            self.render()
            self.clock.tick(60)  # 60 FPS
        
        self.cleanup()
    
    def cleanup(self):
        """Clean up resources."""
        self.renderer.cleanup()


def main():
    """Entry point for the game."""
    print("Starting Geomeditate...")
    print("Controls:")
    print("  Left Click: Mark cell as Active (Blue)")
    print("  Right Click: Mark cell as Inactive (Black)")
    print("  R: Reset current puzzle")
    print("  N: Generate new puzzle")
    print("  ESC: Quit")
    print()
    
    game = Game(grid_radius=4, difficulty=0.35)
    game.run()
    
    print("Thanks for playing!")


if __name__ == "__main__":
    main()
