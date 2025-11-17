"""Rendering module using Pygame."""

import pygame
import math
from typing import Optional, Tuple
from .grid import HexGrid
from .cell import HexCell, CellState, ClueType


class GameRenderer:
    """Handles rendering of the hexagonal grid using Pygame."""
    
    # Colors
    COLOR_BACKGROUND = (20, 20, 30)
    COLOR_UNKNOWN = (60, 60, 80)
    COLOR_ACTIVE = (50, 150, 250)
    COLOR_INACTIVE = (30, 30, 40)
    COLOR_REVEALED = (80, 80, 100)
    COLOR_BORDER = (100, 100, 120)
    COLOR_TEXT = (255, 255, 255)
    COLOR_MISTAKE = (250, 50, 50)
    
    def __init__(self, width: int = 1000, height: int = 800):
        """
        Initialize the renderer.
        
        Args:
            width: Window width in pixels
            height: Window height in pixels
        """
        pygame.init()
        self.width = width
        self.height = height
        self.screen = pygame.display.set_mode((width, height))
        pygame.display.set_caption("Geomeditate - Hexagonal Logic Puzzle")
        
        # Hex display parameters
        self.hex_size = 30  # Radius of hexagon
        self.center_x = width // 2
        self.center_y = height // 2
        
        # Font
        self.font = pygame.font.Font(None, 24)
        self.large_font = pygame.font.Font(None, 36)
        
    def axial_to_pixel(self, q: int, r: int) -> Tuple[float, float]:
        """
        Convert axial hex coordinates to pixel coordinates.
        
        Args:
            q: Column coordinate
            r: Row coordinate
            
        Returns:
            Tuple of (x, y) pixel coordinates
        """
        x = self.hex_size * (3/2 * q)
        y = self.hex_size * (math.sqrt(3)/2 * q + math.sqrt(3) * r)
        return (self.center_x + x, self.center_y + y)
    
    def pixel_to_axial(self, x: int, y: int) -> Tuple[int, int]:
        """
        Convert pixel coordinates to axial hex coordinates.
        
        Args:
            x: Pixel x coordinate
            y: Pixel y coordinate
            
        Returns:
            Tuple of (q, r) axial coordinates
        """
        # Translate to origin
        x = x - self.center_x
        y = y - self.center_y
        
        # Convert to axial coordinates
        q = (2/3 * x) / self.hex_size
        r = (-1/3 * x + math.sqrt(3)/3 * y) / self.hex_size
        
        # Round to nearest hex
        return self._hex_round(q, r)
    
    def _hex_round(self, q: float, r: float) -> Tuple[int, int]:
        """Round fractional hex coordinates to nearest hex."""
        s = -q - r
        
        rq = round(q)
        rr = round(r)
        rs = round(s)
        
        q_diff = abs(rq - q)
        r_diff = abs(rr - r)
        s_diff = abs(rs - s)
        
        if q_diff > r_diff and q_diff > s_diff:
            rq = -rr - rs
        elif r_diff > s_diff:
            rr = -rq - rs
            
        return (rq, rr)
    
    def draw_hexagon(self, center: Tuple[float, float], color: Tuple[int, int, int], 
                     border_color: Optional[Tuple[int, int, int]] = None):
        """
        Draw a hexagon at the given center position.
        
        Args:
            center: (x, y) center of hexagon
            color: Fill color
            border_color: Border color (optional)
        """
        points = []
        for i in range(6):
            angle_deg = 60 * i - 30
            angle_rad = math.pi / 180 * angle_deg
            x = center[0] + self.hex_size * math.cos(angle_rad)
            y = center[1] + self.hex_size * math.sin(angle_rad)
            points.append((x, y))
        
        pygame.draw.polygon(self.screen, color, points)
        if border_color:
            pygame.draw.polygon(self.screen, border_color, points, 2)
    
    def draw_cell(self, cell: HexCell):
        """Draw a single hexagonal cell."""
        center = self.axial_to_pixel(cell.q, cell.r)
        
        # Determine color based on state
        if cell.state == CellState.UNKNOWN:
            color = self.COLOR_UNKNOWN
        elif cell.state == CellState.ACTIVE:
            color = self.COLOR_ACTIVE
        elif cell.state == CellState.INACTIVE:
            color = self.COLOR_INACTIVE
        else:  # REVEALED
            color = self.COLOR_REVEALED
        
        # Draw hexagon
        self.draw_hexagon(center, color, self.COLOR_BORDER)
        
        # Draw clue text if revealed
        if cell.state == CellState.REVEALED and cell.clue_type != ClueType.NONE:
            if cell.clue_type == ClueType.SIMPLE:
                text = str(cell.clue_value)
            elif cell.clue_type == ClueType.CONSECUTIVE:
                text = f"{{{cell.clue_value}}}"
            else:  # SEPARATED
                text = f"-{cell.clue_value}-"
            
            text_surface = self.font.render(text, True, self.COLOR_TEXT)
            text_rect = text_surface.get_rect(center=center)
            self.screen.blit(text_surface, text_rect)
    
    def render(self, grid: HexGrid, mistakes: int = 0, completion: float = 0.0, puzzle_complete: bool = False):
        """
        Render the entire game state.
        
        Args:
            grid: The hex grid to render
            mistakes: Number of mistakes made
            completion: Completion percentage
            puzzle_complete: Whether the puzzle is complete
        """
        self.screen.fill(self.COLOR_BACKGROUND)
        
        # Draw all cells
        for cell in grid.get_all_cells():
            self.draw_cell(cell)
        
        # Draw UI elements
        self._draw_ui(mistakes, completion, puzzle_complete)
        
        pygame.display.flip()
    
    def _draw_ui(self, mistakes: int, completion: float, puzzle_complete: bool = False):
        """Draw UI elements like score and mistakes."""
        # Mistakes counter
        mistakes_text = f"Mistakes: {mistakes}"
        text_surface = self.large_font.render(mistakes_text, True, 
                                             self.COLOR_MISTAKE if mistakes > 0 else self.COLOR_TEXT)
        self.screen.blit(text_surface, (10, 10))
        
        # Completion percentage
        completion_text = f"Complete: {completion:.1f}%"
        text_surface = self.font.render(completion_text, True, self.COLOR_TEXT)
        self.screen.blit(text_surface, (10, 50))
        
        # Victory message
        if puzzle_complete:
            victory_text = "🎉 PUZZLE COMPLETE! 🎉"
            text_surface = self.large_font.render(victory_text, True, self.COLOR_ACTIVE)
            text_rect = text_surface.get_rect(center=(self.width // 2, 50))
            self.screen.blit(text_surface, text_rect)
        
        # Instructions
        instructions = [
            "Left Click: Mark as Active (Blue)",
            "Right Click: Mark as Inactive (Black)",
            "R: Reset | N: New Puzzle | ESC: Quit"
        ]
        y = self.height - 80
        for instruction in instructions:
            text_surface = self.font.render(instruction, True, self.COLOR_TEXT)
            self.screen.blit(text_surface, (10, y))
            y += 25
    
    def cleanup(self):
        """Clean up Pygame resources."""
        pygame.quit()
