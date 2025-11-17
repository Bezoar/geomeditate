"""Cell data structures for the hexagonal grid."""

from enum import Enum
from typing import Optional


class CellState(Enum):
    """State of a cell in the game."""
    UNKNOWN = 0      # Not yet revealed
    ACTIVE = 1       # Marked as active (blue)
    INACTIVE = 2     # Marked as inactive (black)
    REVEALED = 3     # Clue cell that is visible


class ClueType(Enum):
    """Type of clue displayed on a cell."""
    NONE = 0         # No clue
    SIMPLE = 1       # Simple number: count of active neighbors
    CONSECUTIVE = 2  # Curly braces: all active neighbors are consecutive
    SEPARATED = 3    # Dashes: active neighbors have gaps


class HexCell:
    """Represents a single hexagonal cell in the grid."""
    
    def __init__(self, q: int, r: int):
        """
        Initialize a hex cell with axial coordinates.
        
        Args:
            q: Column coordinate (axial)
            r: Row coordinate (axial)
        """
        self.q = q
        self.r = r
        self.s = -q - r  # Derived coordinate for hexagonal math
        
        # Game state
        self.is_solution_active = False  # True if this cell should be active in solution
        self.state = CellState.UNKNOWN
        
        # Clue information
        self.clue_type = ClueType.NONE
        self.clue_value = 0  # Number of active neighbors
        
    def __repr__(self):
        return f"HexCell(q={self.q}, r={self.r}, state={self.state.name})"
    
    def __eq__(self, other):
        if not isinstance(other, HexCell):
            return False
        return self.q == other.q and self.r == other.r
    
    def __hash__(self):
        return hash((self.q, self.r))
    
    def mark_active(self):
        """Mark this cell as active (player action)."""
        if self.state == CellState.UNKNOWN:
            self.state = CellState.ACTIVE
            
    def mark_inactive(self):
        """Mark this cell as inactive (player action)."""
        if self.state == CellState.UNKNOWN:
            self.state = CellState.INACTIVE
            
    def reset(self):
        """Reset cell to unknown state."""
        if self.state != CellState.REVEALED:
            self.state = CellState.UNKNOWN
    
    def is_correct(self) -> bool:
        """Check if the player's marking is correct."""
        if self.state == CellState.ACTIVE:
            return self.is_solution_active
        elif self.state == CellState.INACTIVE:
            return not self.is_solution_active
        return True  # Unknown state is not wrong yet
