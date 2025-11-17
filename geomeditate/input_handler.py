"""Input handling for the game."""

import pygame
from typing import Optional, Tuple
from .grid import HexGrid
from .cell import HexCell
from .renderer import GameRenderer


class InputHandler:
    """Handles user input events."""
    
    def __init__(self, renderer: GameRenderer, grid: HexGrid):
        """
        Initialize the input handler.
        
        Args:
            renderer: The game renderer
            grid: The hex grid
        """
        self.renderer = renderer
        self.grid = grid
        
    def get_cell_at_mouse(self, mouse_pos: Tuple[int, int]) -> Optional[HexCell]:
        """
        Get the cell at the mouse position.
        
        Args:
            mouse_pos: (x, y) mouse position
            
        Returns:
            The cell at that position, or None
        """
        q, r = self.renderer.pixel_to_axial(mouse_pos[0], mouse_pos[1])
        return self.grid.get_cell(q, r)
    
    def handle_mouse_click(self, mouse_pos: Tuple[int, int], button: int) -> Optional[HexCell]:
        """
        Handle a mouse click event.
        
        Args:
            mouse_pos: (x, y) mouse position
            button: Mouse button (1=left, 3=right)
            
        Returns:
            The clicked cell, or None
        """
        cell = self.get_cell_at_mouse(mouse_pos)
        if cell is None:
            return None
        
        # Only allow interaction with unknown cells
        from .cell import CellState
        if cell.state != CellState.UNKNOWN:
            return None
        
        if button == 1:  # Left click
            cell.mark_active()
        elif button == 3:  # Right click
            cell.mark_inactive()
        
        return cell
    
    def handle_keyboard(self, key: int) -> str:
        """
        Handle keyboard events.
        
        Args:
            key: Pygame key code
            
        Returns:
            Action string: 'reset', 'new', 'quit', or ''
        """
        if key == pygame.K_r:
            return 'reset'
        elif key == pygame.K_n:
            return 'new'
        elif key == pygame.K_ESCAPE:
            return 'quit'
        return ''
