# Design Principles Extracted from Hexcells Infinite

These principles describe the visual design philosophy observable in the Hexcells
Infinite screenshot. They can serve as guiding constraints when adapting this style.

---

## 1. Two-Color Semantic System

The entire puzzle state is communicated through exactly two accent colors:

- **Orange/amber** = unknown, unsolved, requires player attention
- **Blue** = known, solved, confirmed

There is no third accent for cells. A player can glance at the board and instantly
read progress from the orange-to-blue ratio alone. This is the single most important
visual design choice in the game.

**Implication**: When adapting, resist adding more cell-state colors. If you need
additional states, vary brightness or opacity within the existing two hues before
introducing a new hue.

---

## 2. Dark-Background-First

The background is near-black (#141414). Every other element is placed on top of this
void. This creates:

- Maximum luminance contrast for the colored cells
- Reduced eye strain during long puzzle sessions
- A "floating" quality — cells appear suspended in space
- Natural focus funneling toward the puzzle grid

**Implication**: The dark background is not decoration. It is a functional choice that
makes the two-color cell system legible. Switching to a light background would require
rethinking the entire palette.

---

## 3. The Puzzle IS the Interface

The game's HUD consists of exactly two numbers (remaining count, mistake count)
tucked into a corner. There are no toolbars, sidebars, inventories, or menus visible
during play. The hex grid occupies the vast majority of screen real estate.

**Implication**: Any adapted design should resist the temptation to add persistent
chrome around the puzzle. Information that isn't needed every second should be hidden
or placed in an overlay triggered by user action.

---

## 4. Flat-With-Depth

The visual style is modern flat design, but not aggressively so. Each hex cell has a
very subtle top-lit gradient giving it a gentle pillow or button quality. This serves
two purposes:

1. **Tactile affordance** — cells look "pressable," reinforcing that they are interactive
2. **Visual separation** — the gradient prevents adjacent same-color cells from merging
   into a single undifferentiated blob

The depth effect is restrained enough to read as contemporary rather than skeuomorphic.

**Implication**: When rendering cells, apply a subtle linear gradient (maybe 5-10%
lighter at top, 5-10% darker at bottom). Do not add drop shadows, glows, or bevels.

---

## 5. Information Density Through Geometry

The hex grid itself is the complex, information-rich element. Numbers, positions,
adjacency relationships, and line constraints all emerge from the grid's geometry.
The visual styling intentionally stays simple so it doesn't compete with this logical
content.

**Implication**: Fancy cell textures, animated backgrounds, or decorative borders would
actively harm usability. Visual simplicity is a prerequisite for the puzzle to be
readable at the density shown in the screenshot (~200+ cells with numbers).

---

## 6. Disciplined Palette

The entire game uses effectively five colors:

| Color | Usage |
|-------|-------|
| Orange | Unsolved cells |
| Blue | Solved cells |
| Dark grey | Empty cells, background |
| White | All text |
| Red | Mistake counter (HUD only) |

No gradients across the palette. No color mixing. Each color has exactly one semantic
role. This discipline makes the game instantly readable even at a glance.

**Implication**: Adding colors should be done with extreme reluctance. Each new color
needs a clear, exclusive semantic role.

---

## 7. Typography as Data, Not Decoration

Text in Hexcells serves exactly one purpose: communicating numeric constraints. There
are no labels on cells, no flavor text, no decorative typography. The typeface is
chosen for legibility at small sizes inside hexagons, not for personality.

**Implication**: Choose a typeface that is:
- Geometric sans-serif (matches hex shapes)
- Legible at 8-10px
- Has clear numeral differentiation (especially 6/9, 3/8)
- Looks good in white on both orange and blue backgrounds
