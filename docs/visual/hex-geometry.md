# Hex Grid Geometry Reference

Technical reference for reproducing the Hexcells Infinite hex grid layout.

## Hex Orientation: Flat-Top

Hexcells uses **flat-top** hexagons. The flat edges are horizontal (top and bottom);
the pointy vertices are on the left and right.

```
    ____
   /    \
  /      \
  \      /
   \____/
```

This is the opposite of "pointy-top" orientation (where the flat edges are vertical).

## Coordinate System

The grid uses an **offset column** layout (also called "even-q" or "odd-q" offset):

- Columns run vertically.
- Even-numbered columns are shifted down by half a cell height relative to odd columns
  (or vice versa — the specific parity doesn't matter as long as it's consistent).

```
  col 0   col 1   col 2   col 3
  ____          ____
 /    \  ____  /    \  ____
/  0,0 \/    \/  2,0 \/    \
\      /\ 1,0/\      /\ 3,0/
 \____/  \  /  \____/  \  /
 /    \   \/   /    \   \/
/  0,1 \  /\  /  2,1 \  /\
\      / / 1,1\      / / 3,1
 \____/ /  \   \____/ /  \
        \  /          \  /
         \/            \/
```

## Dimensions

For a regular flat-top hexagon with **circumradius** `R` (center to vertex):

| Measurement | Formula | Example (R=16) |
|-------------|---------|----------------|
| Width | `2R` | 32px |
| Height | `R * sqrt(3)` | ~27.7px |
| Inradius (center to flat edge) | `R * sqrt(3) / 2` | ~13.9px |
| Column step (horizontal) | `R * 1.5` | 24px |
| Row step (vertical) | `R * sqrt(3)` | ~27.7px |
| Half-row offset | `R * sqrt(3) / 2` | ~13.9px |

## Vertex Coordinates

For a flat-top hexagon centered at origin with circumradius `R`, the six vertices are:

| Vertex | Angle | X | Y |
|--------|-------|---|---|
| 0 (right) | 0deg | `R` | `0` |
| 1 (upper-right) | 60deg | `R/2` | `-R*sqrt(3)/2` |
| 2 (upper-left) | 120deg | `-R/2` | `-R*sqrt(3)/2` |
| 3 (left) | 180deg | `-R` | `0` |
| 4 (lower-left) | 240deg | `-R/2` | `R*sqrt(3)/2` |
| 5 (lower-right) | 300deg | `R/2` | `R*sqrt(3)/2` |

## SVG Polygon Points (R=16, centered at 16,14)

```svg
<polygon points="32,14 24,0.1 8,0.1 0,14 8,27.9 24,27.9" />
```

## Cell-to-Pixel Conversion

Given a cell at grid position `(col, row)` with circumradius `R` and gap `G`:

```
pixelX = col * (R * 1.5 + G)
pixelY = row * (R * sqrt(3) + G) + (col % 2 == 1 ? (R * sqrt(3) + G) / 2 : 0)
```

## Neighbor Offsets (Flat-Top, Even-Column-Down)

For a cell at `(col, row)`:

| Direction | Even col offset | Odd col offset |
|-----------|-----------------|----------------|
| Upper-right | `(+1, -1)` | `(+1, 0)` |
| Right | `(+1, 0)` | `(+1, +1)` |
| Lower-right | `(0, +1)` | `(0, +1)` |
| Lower-left | `(-1, 0)` | `(-1, +1)` |
| Left | `(-1, -1)` | `(-1, 0)` |
| Upper-left | `(0, -1)` | `(0, -1)` |

## Hex Line Axes

A flat-top hex grid has three natural axes along which cells align into straight lines:

1. **Vertical** — cells in the same column (constant `col`, varying `row`)
2. **Upper-left to lower-right** — diagonal axis (ascending-right)
3. **Upper-right to lower-left** — diagonal axis (descending-right)

Hexcells uses constraints along all three axes (indicated by directional markers on cells).
