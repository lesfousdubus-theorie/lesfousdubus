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
