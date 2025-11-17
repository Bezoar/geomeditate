"""Tests for puzzle generation."""

import unittest
from geomeditate.grid import HexGrid
from geomeditate.puzzle import Puzzle
from geomeditate.cell import CellState


class TestPuzzle(unittest.TestCase):
    """Test cases for Puzzle class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.grid = HexGrid(radius=3)
        self.puzzle = Puzzle(self.grid, difficulty=0.3)
    
    def test_puzzle_generation(self):
        """Test that puzzle generates correctly."""
        self.puzzle.generate(seed=42)
        
        # Count active cells in solution
        active_count = sum(1 for cell in self.grid.get_all_cells() 
                          if cell.is_solution_active)
        
        # Should have some active cells
        self.assertGreater(active_count, 0)
        
        # Should have some revealed clue cells
        revealed_count = sum(1 for cell in self.grid.get_all_cells() 
                           if cell.state == CellState.REVEALED)
        self.assertGreater(revealed_count, 0)
    
    def test_check_cell(self):
        """Test checking if a cell is correct."""
        self.puzzle.generate(seed=42)
        
        # Find a cell that should be active
        active_cell = None
        for cell in self.grid.get_all_cells():
            if cell.is_solution_active and cell.state != CellState.REVEALED:
                active_cell = cell
                break
        
        if active_cell:
            # Mark it correctly
            active_cell.mark_active()
            result = self.puzzle.check_cell(active_cell)
            self.assertTrue(result)
    
    def test_completion_tracking(self):
        """Test completion percentage calculation."""
        self.puzzle.generate(seed=42)
        
        # Initially should be 0% (nothing marked)
        completion = self.puzzle.get_completion_percentage()
        self.assertEqual(completion, 0.0)
        
        # Mark all cells correctly
        for cell in self.grid.get_all_cells():
            if cell.state != CellState.REVEALED:
                if cell.is_solution_active:
                    cell.mark_active()
                else:
                    cell.mark_inactive()
        
        # Should be 100%
        completion = self.puzzle.get_completion_percentage()
        self.assertEqual(completion, 100.0)


if __name__ == '__main__':
    unittest.main()
