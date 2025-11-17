"""Tests for the hexagonal grid."""

import unittest
from geomeditate.grid import HexGrid
from geomeditate.cell import HexCell, CellState


class TestHexGrid(unittest.TestCase):
    """Test cases for HexGrid class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.grid = HexGrid(radius=2)
    
    def test_grid_initialization(self):
        """Test that grid initializes with correct number of cells."""
        # For radius 2, we should have cells in the hexagonal pattern
        # Formula: 1 + 3*r*(r+1) for r=2 gives us 19 cells
        expected_cells = 1 + 3 * 2 * (2 + 1)
        self.assertEqual(len(self.grid.get_all_cells()), expected_cells)
    
    def test_get_cell(self):
        """Test getting a cell by coordinates."""
        cell = self.grid.get_cell(0, 0)
        self.assertIsNotNone(cell)
        self.assertEqual(cell.q, 0)
        self.assertEqual(cell.r, 0)
    
    def test_get_nonexistent_cell(self):
        """Test getting a cell that doesn't exist."""
        cell = self.grid.get_cell(10, 10)
        self.assertIsNone(cell)
    
    def test_get_neighbors(self):
        """Test getting neighbors of a cell."""
        center = self.grid.get_cell(0, 0)
        neighbors = self.grid.get_neighbors(center)
        # Center cell should have 6 neighbors
        self.assertEqual(len(neighbors), 6)
    
    def test_count_active_neighbors(self):
        """Test counting active neighbors."""
        center = self.grid.get_cell(0, 0)
        neighbors = self.grid.get_neighbors(center)
        
        # Mark first 3 neighbors as active
        for i in range(3):
            neighbors[i].is_solution_active = True
        
        count = self.grid.count_active_neighbors(center)
        self.assertEqual(count, 3)


class TestHexCell(unittest.TestCase):
    """Test cases for HexCell class."""
    
    def test_cell_initialization(self):
        """Test cell initialization."""
        cell = HexCell(1, 2)
        self.assertEqual(cell.q, 1)
        self.assertEqual(cell.r, 2)
        self.assertEqual(cell.s, -3)
        self.assertEqual(cell.state, CellState.UNKNOWN)
    
    def test_mark_active(self):
        """Test marking a cell as active."""
        cell = HexCell(0, 0)
        cell.mark_active()
        self.assertEqual(cell.state, CellState.ACTIVE)
    
    def test_mark_inactive(self):
        """Test marking a cell as inactive."""
        cell = HexCell(0, 0)
        cell.mark_inactive()
        self.assertEqual(cell.state, CellState.INACTIVE)
    
    def test_is_correct(self):
        """Test correctness checking."""
        cell = HexCell(0, 0)
        cell.is_solution_active = True
        cell.mark_active()
        self.assertTrue(cell.is_correct())
        
        cell2 = HexCell(1, 1)
        cell2.is_solution_active = False
        cell2.mark_active()
        self.assertFalse(cell2.is_correct())


if __name__ == '__main__':
    unittest.main()
