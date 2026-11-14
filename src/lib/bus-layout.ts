export const BASE_ROWS = 6;

/**
 * Calcule le nombre de rangées nécessaires pour asseoir `passengerCount` personnes.
 * Les 6 rangées de base offrent 24 positions logiques (4 par rangée). Le passager
 * courant utilise l'une de ces positions et est simplement déplacé vers la caméra
 * en vue intérieure, il ne consomme donc pas une place supplémentaire.
 */
export function computeNumRows(passengerCount: number): number {
  if (passengerCount <= BASE_ROWS * 4) return BASE_ROWS;
  return BASE_ROWS + Math.ceil((passengerCount - BASE_ROWS * 4) / 4);
}

export interface SeatInfo {
  x: number;
  z: number;
  row: number;
  seatInRow: number;
}

const MAX_STRUCTURAL_ROWS = 180;

export function getRenderedRowIndices(numRows: number, focusRow: number): number[] {
  if (numRows <= MAX_STRUCTURAL_ROWS) return Array.from({ length: numRows }, (_, index) => index);
  const rows = new Set<number>();
  const add = (row: number) => {
    if (row >= 0 && row < numRows) rows.add(row);
  };
  for (let row = 0; row < 16; row++) {
    add(row);
    add(numRows - 1 - row);
  }
  for (let row = focusRow - 48; row <= focusRow + 48; row++) add(row);
  for (let index = 0; index < 48; index++) add(Math.round((index * (numRows - 1)) / 47));
  return Array.from(rows).sort((a, b) => a - b);
}

export type TvPosition = [number, number, number];

export function getTvPositions(numRows: number, frontPosition: { x: number; y: number; z: number }): TvPosition[] {
  const positions: TvPosition[] = [[frontPosition.x, frontPosition.y, frontPosition.z]];
  if (numRows > 6) {
    const stride = Math.max(4, Math.ceil((numRows - 6) / 8));
    for (let row = 4; row <= numRows - 3 && positions.length <= 8; row += stride) {
      positions.push([0, 2.55, -2.6 + (row - 0.25) * 1.2]);
    }
  }
  return positions;
}

export function getActiveTvIndex(positions: TvPosition[], seatRow: number): number {
  const eyeZ = -2.6 + seatRow * 1.2 + 0.15;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  positions.forEach((position, index) => {
    const distance = eyeZ - position[2];
    // Un écran derrière le passager ou à moins de 2,5 m sort du champ sur mobile.
    if (distance < 2.5) return;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}
