"""Puzzle generation and validation."""

import random
from typing import List
from .grid import HexGrid
from .cell import HexCell, CellState, ClueType


class Puzzle:
    """Generates and validates hexagonal puzzles."""
    
    def __init__(self, grid: HexGrid, difficulty: float = 0.3):
        """
        Initialize a puzzle generator.
        
        Args:
            grid: The hexagonal grid to generate puzzle on
            difficulty: Ratio of active cells (0.0 to 1.0)
        """
        self.grid = grid
        self.difficulty = difficulty
        self.mistakes = 0
        
    def generate(self, seed: int = None):
        """
        Generate a new random puzzle.
        
        Args:
            seed: Random seed for reproducible puzzles
        """
        if seed is not None:
            random.seed(seed)
        
        # Reset all cells
        for cell in self.grid.get_all_cells():
            cell.is_solution_active = False
            cell.state = CellState.UNKNOWN
            cell.clue_type = ClueType.NONE
            cell.clue_value = 0
        
        # Randomly select cells to be active
        all_cells = self.grid.get_all_cells()
        num_active = int(len(all_cells) * self.difficulty)
        active_cells = random.sample(all_cells, num_active)
        
        for cell in active_cells:
            cell.is_solution_active = True
        
        # Generate clues for inactive cells
        self._generate_clues()
        
    def _generate_clues(self):
        """Generate clue information for cells."""
        for cell in self.grid.get_all_cells():
            if not cell.is_solution_active:
                # This is an inactive cell, make it a clue cell
                count = self.grid.count_active_neighbors(cell, use_solution=True)
                
                if count > 0:
                    cell.state = CellState.REVEALED
                    cell.clue_value = count
                    
                    # Determine clue type
                    if self.grid.are_neighbors_consecutive(cell, use_solution=True):
                        # Random choice between simple and consecutive for variety
                        cell.clue_type = random.choice([ClueType.SIMPLE, ClueType.CONSECUTIVE])
                    else:
                        # Has gaps, use separated clue
                        cell.clue_type = ClueType.SEPARATED
                else:
                    # No active neighbors, reveal as empty
                    cell.state = CellState.REVEALED
                    cell.clue_type = ClueType.NONE
    
    def check_cell(self, cell: HexCell) -> bool:
        """
        Check if a cell is correctly marked by the player.
        
        Args:
            cell: The cell to check
            
        Returns:
            True if correct, False if incorrect
        """
        if cell.state == CellState.ACTIVE and not cell.is_solution_active:
            self.mistakes += 1
            return False
        elif cell.state == CellState.INACTIVE and cell.is_solution_active:
            self.mistakes += 1
            return False
        return True
    
    def is_complete(self) -> bool:
        """Check if the puzzle is completely solved."""
        for cell in self.grid.get_all_cells():
            if cell.state == CellState.REVEALED:
                continue
            if cell.state == CellState.UNKNOWN:
                return False
            if not cell.is_correct():
                return False
        return True
    
    def get_completion_percentage(self) -> float:
        """Get the percentage of correctly identified cells."""
        total_cells = 0
        correct_cells = 0
        
        for cell in self.grid.get_all_cells():
            if cell.state != CellState.REVEALED:
                total_cells += 1
                if cell.is_correct() and cell.state != CellState.UNKNOWN:
                    correct_cells += 1
        
        if total_cells == 0:
            return 100.0
        return (correct_cells / total_cells) * 100
