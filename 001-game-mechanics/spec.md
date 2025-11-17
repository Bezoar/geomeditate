# Geomeditate app mechanics

## Game 

### Game load/save

- The game must save the current puzzle state between sessions, so that the player can return to it later.

# Game Mechanics: The Geomeditate Grid System

In accordance with Core Principle II in the constitution, the game mechanics must work like this:

## Cells

- The relative directional convention to use with the game grid is north-south-east-west (top-bottom-left-right).
- The game grid consists of unmarked (yellow), marked (blue), open (black), and void (invisible) cells. Cells can be either mined or unmined.
- A player can only mark (right-click or shift-click) or open (unmodified click) a cell.
- If the player opens an unmined cell, the cell becomes open, and any hint associated with the cell is displayed.
- If the player marks an mined cell, the cell becomes marked, and any hint associated with the cell is displayed.
- If the player attempts to open a mined cell, the cell remains unmarked and a mistake is registered. 
- If the player attempts to mark an unmined cell, the cell remains unmarked and a mistake is registered.

## Hints

Marked and open cells can have hints associated with them. For open unmined cells: 
- The character "?" or an empty hint means there is no hint associated with this cell.
- A simple number from 0 to 6 reveals the number of mined cells adjacent to the open cell.
- A number wrapped in dashes ("-2-" through "-5-") means that there are that many mined cells adjacent to the tapped cell, and the mined cells are not contiguous around to the tapped cell.
- A number wrapped in curly braces ("{2}" through "{6}") means that there are that many mined cells adjacent to the tapped cell, and the mines cells are contiguous/joined together around the tapped cell.

For marked mined cells, the presence of a numeric hint turns it into a "flower":
- The hint on a flower contains the number of mined cells within a 2-hex radius of the tapped cell.
- The original Hexcells Infinite did not use dash or curly brace notation in flower hints. Only simple-number hints should be used on flowers unless changed in a subsequent feature.
- Do not put a ? on any marked mined cell.

In addition to hints on cells, there are also diagonal hints. Diagonal hints can appear as numbers just above the top of a hex column, just above and to the left of a NW-to-SE diagonal, or just above and to the right of a NE-to-SW diagonal. The player can click on the number to activate or deactivate a 50% opaque white line that runs through the labeled diagonal on the grid. Diagonal hints contain the number of mined cells on the diagonal. As with open cells, use dash notation to indicate that the mined cells are not contiguous along the diagonal, or curly brace notation to indicate that the mined cells are contiguous.

# Game Difficulty

- There are three modes of operation: tutorial, easy, and hard mode.
- Each new puzzle technique will be exposed to the player one at a time in tutorial mode. Harder puzzles use more complicated, sometimes interlocking sets of hints than easier ones.
- The player can leave and return to the tutorial levels at any time.

# Random Game Generator

Provide a way for a player to auto-generate a new puzzle. The player can either input a seed string, or make the game autogenerate a seed from a local PRNG. The puzzle generator will use the seed string to seed an internal PRNG to use to generate a new puzzle in either Easy or Hard mode. 


Every puzzle, incorporating both cell placement and hint placement, must ultimately have one solution. The same seed string should generate the same deterministic puzzle every time at a given difficulty mode.

# Difficulty and game techniques

Easy mode incorporates the following features:
- Pre-open up to 2% of the cells 