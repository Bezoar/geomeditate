"""Hexagonal grid implementation."""

import math
from typing import List, Optional, Set, Tuple
from .cell import HexCell, CellState


class HexGrid:
    """Manages a hexagonal grid of cells."""
    
    # Axial coordinate directions for the 6 neighbors of a hex
    DIRECTIONS = [
        (1, 0), (1, -1), (0, -1),
        (-1, 0), (-1, 1), (0, 1)
    ]
    
    def __init__(self, radius: int = 5):
        """
        Initialize a hexagonal grid.
        
        Args:
            radius: Radius of the hexagonal grid (distance from center)
        """
        self.radius = radius
        self.cells: dict[Tuple[int, int], HexCell] = {}
        self._initialize_grid()
        
    def _initialize_grid(self):
        """Create all cells in a hexagonal grid pattern."""
        for q in range(-self.radius, self.radius + 1):
            r1 = max(-self.radius, -q - self.radius)
            r2 = min(self.radius, -q + self.radius)
            for r in range(r1, r2 + 1):
                cell = HexCell(q, r)
                self.cells[(q, r)] = cell
    
    def get_cell(self, q: int, r: int) -> Optional[HexCell]:
        """Get a cell at the given axial coordinates."""
        return self.cells.get((q, r))
    
    def get_neighbors(self, cell: HexCell) -> List[HexCell]:
        """Get all neighboring cells of a given cell."""
        neighbors = []
        for dq, dr in self.DIRECTIONS:
            neighbor = self.get_cell(cell.q + dq, cell.r + dr)
            if neighbor:
                neighbors.append(neighbor)
        return neighbors
    
    def get_neighbor_at_direction(self, cell: HexCell, direction_idx: int) -> Optional[HexCell]:
        """Get the neighbor in a specific direction (0-5)."""
        if 0 <= direction_idx < 6:
            dq, dr = self.DIRECTIONS[direction_idx]
            return self.get_cell(cell.q + dq, cell.r + dr)
        return None
    
    def count_active_neighbors(self, cell: HexCell, use_solution: bool = True) -> int:
        """
        Count the number of active neighbors.
        
        Args:
            cell: The cell to check neighbors for
            use_solution: If True, use solution data; if False, use player markings
        """
        count = 0
        for neighbor in self.get_neighbors(cell):
            if use_solution:
                if neighbor.is_solution_active:
                    count += 1
            else:
                if neighbor.state == CellState.ACTIVE:
                    count += 1
        return count
    
    def are_neighbors_consecutive(self, cell: HexCell, use_solution: bool = True) -> bool:
        """
        Check if all active neighbors are consecutive (touching each other).
        
        Args:
            cell: The cell to check neighbors for
            use_solution: If True, use solution data; if False, use player markings
        """
        active_directions = []
        for i, (dq, dr) in enumerate(self.DIRECTIONS):
            neighbor = self.get_cell(cell.q + dq, cell.r + dr)
            if neighbor:
                is_active = neighbor.is_solution_active if use_solution else (neighbor.state == CellState.ACTIVE)
                if is_active:
                    active_directions.append(i)
        
        if len(active_directions) <= 1:
            return True
        
        # Check if all active directions are consecutive (accounting for wrap-around)
        active_directions.sort()
        gaps = []
        for i in range(len(active_directions)):
            next_i = (i + 1) % len(active_directions)
            gap = (active_directions[next_i] - active_directions[i]) % 6
            gaps.append(gap)
        
        # All active cells are consecutive if there's only one gap and it contains all non-active cells
        non_zero_gaps = [g for g in gaps if g > 1]
        return len(non_zero_gaps) <= 1
    
    def get_all_cells(self) -> List[HexCell]:
        """Get all cells in the grid."""
        return list(self.cells.values())
    
    def reset_all(self):
        """Reset all cells to unknown state."""
        for cell in self.cells.values():
            cell.reset()
