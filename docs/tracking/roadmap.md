# Test App Roadmap

Test applications to prove technology choices before committing them to the
main game. Each app is a self-contained prototype that validates one concern.

All test apps live under `test-apps/`, each with its own tooling, dependencies,
and build system. See the constitution for the test-app-first workflow.

---

## 1. Grid Mechanics

**Directory**: `test-apps/01-grid-mechanics/`

**Proves**: Core game logic — hex grid state management, clue computation, win/loss detection.

**Scope**:
- Set up a hex grid with cells in various states (covered, filled/blue, open empty, missing)
- Implement clue computation:
  - Neighbor clues (plain, `{n}` contiguous, `-n-` discontiguous)
  - Flower clues (2-hex radius count)
  - Line clues along columns and diagonals (full and partial from missing hex positions)
  - `?` (no clue available) cells
- Player actions: mark a cell as filled, open a cell
- Mistake detection (opening a filled cell, marking an empty cell)
- REMAINING counter logic
- Validate all mechanics with tests

**Status**: Not started

---

## 2. Hex Shatter Animation

**Directory**: `test-apps/02-hex-shatter/`

**Proves**: Fragment animation rendering and performance.

**Scope**:
- Render a flat-top hex cell
- On tap/click, subdivide the hex into ~12-30 small triangles
- Animate each fragment: initial outward burst, per-fragment rotation, gravity pull, alpha fade
- Fragments fall off-screen over ~0.5-1s
- Verify smooth performance when multiple cells shatter in quick succession

**Starting tech**: Canvas 2D. Upgrade to PixiJS/WebGL if Canvas can't handle the fragment count.

**Status**: Not started

---

## 3. Tap-to-Tone Audio

**Directory**: `test-apps/03-tap-to-tone/`

**Proves**: Audio latency, musical feedback feel.

**Scope**:
- On cell tap, play a tone from a pentatonic scale
- Gentle attack/decay envelope suitable for a meditative game
- Test latency — sound must feel instant, not laggy
- Experiment with tone assignment (pitch per cell position? per action type? random from scale?)
- Test on mobile (touch events) and desktop (click events)

**Starting tech**: Web Audio API (raw oscillator + gain envelope). Consider Tone.js if the raw API proves too verbose.

**Status**: Not started
