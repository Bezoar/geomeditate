/**
 * Encode a grid into the compact grid string format.
 *
 * @param width - Grid width in columns
 * @param height - Grid height in rows
 * @param cells - Map from "col,row" key to single character (e.g., 'F', 'E')
 * @param defaultChar - Character for positions not in the cells map (e.g., '.')
 * @returns Array of strings, one per row. Odd rows have a leading space.
 */
export function encodeGridString(
  width: number,
  height: number,
  cells: Map<string, string>,
  defaultChar: string,
): string[] {
  const rows: string[] = [];
  for (let row = 0; row < height; row++) {
    const tokens: string[] = [];
    for (let col = 0; col < width; col++) {
      tokens.push(cells.get(`${col},${row}`) ?? defaultChar);
    }
    const line = tokens.join(' ');
    rows.push(row % 2 === 1 ? ` ${line}` : line);
  }
  return rows;
}

/**
 * Decode grid strings back into a map of "col,row" → character.
 * All positions are returned, including missing ('.') characters.
 *
 * @param rows - Array of grid strings (one per row)
 * @returns Map from "col,row" to the character at that position
 */
export function decodeGridString(rows: string[]): Map<string, string> {
  const cells = new Map<string, string>();
  for (let row = 0; row < rows.length; row++) {
    const tokens = rows[row].trim().split(/\s+/);
    for (let col = 0; col < tokens.length; col++) {
      cells.set(`${col},${row}`, tokens[col]);
    }
  }
  return cells;
}
