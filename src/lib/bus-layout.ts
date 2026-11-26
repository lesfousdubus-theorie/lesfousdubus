export const BASE_ROWS = 6;

// Le vestibule se trouve après l'essieu avant et derrière les deux navigateurs.
export const BUS_FRONT_Z = -4.6;
export const FIRST_SEAT_Z = -1.55;
export const SEAT_ROW_SPACING = 1.2;
const FULL_ROWS_PER_SECTION = 8;
export const DOOR_SECTION_ROWS = FULL_ROWS_PER_SECTION + 1;
export const DOOR_VESTIBULE_LENGTH = 1.65;
const DOOR_SECTION_LENGTH = FULL_ROWS_PER_SECTION * SEAT_ROW_SPACING + DOOR_VESTIBULE_LENGTH;
// L'avant de l'assise reste derrière les mollets, à z = -0,10.
export const SEAT_CUSHION_DEPTH = 0.4;
export const SEAT_CUSHION_Z = 0.14;
export const SEAT_BASE_DEPTH = 0.3;
export const BUS_DOOR = { x: 1.32, z: -2.93, width: 1.26, bottom: 0.5, top: 2.76, innerX: 0.4 } as const;
export interface BusDoorLayout {
  index: number;
  x: number;
  z: number;
  width: number;
  bottom: number;
  top: number;
  innerX: number;
}
export const DOOR_FRONT_Z = BUS_DOOR.z - BUS_DOOR.width / 2;
export const DOOR_REAR_Z = BUS_DOOR.z + BUS_DOOR.width / 2;
export const ENTRY_SEAT_POSITION: [number, number, number] = [-0.84, 0, BUS_DOOR.z];
export const CREW_SEATS = {
  kamal: [-0.84, 0, -4.03],
  kyta: [0.84, 0, -4.03],
} satisfies Record<string, [number, number, number]>;

// Chaque section se termine par une demi-rangée, en face des marches.
export function getSeatCountInRow(row: number): number {
  return (row + 1) % DOOR_SECTION_ROWS === 0 ? 2 : 4;
}

function getWholeSeatRowZ(row: number): number {
  const section = Math.floor(Math.max(0, row) / DOOR_SECTION_ROWS);
  const rowInSection = row - section * DOOR_SECTION_ROWS;
  const frontZ = FIRST_SEAT_Z + section * DOOR_SECTION_LENGTH;
  if (rowInSection === FULL_ROWS_PER_SECTION) {
    const lastFullRowZ = frontZ + (FULL_ROWS_PER_SECTION - 1) * SEAT_ROW_SPACING;
    return (lastFullRowZ + frontZ + DOOR_SECTION_LENGTH) / 2;
  }
  return frontZ + rowInSection * SEAT_ROW_SPACING;
}

export function getSeatRowZ(row: number): number {
  const wholeRow = Math.floor(row);
  const z = getWholeSeatRowZ(wholeRow);
  return row === wholeRow ? z : z + (getWholeSeatRowZ(wholeRow + 1) - z) * (row - wholeRow);
}

/** Le mur arrière suit la dernière rangée sans ajouter un vestibule inutilisé. */
export function getBusRearWallZ(numRows: number): number {
  return getSeatRowZ(Math.max(0, numRows - 1)) + SEAT_ROW_SPACING;
}

/** Nombre total de portes pour `numRows` rangées (porte d'entrée + 1 par section de 9 rangées). */
export function getBusDoorCount(numRows: number): number {
  return 1 + Math.floor(Math.max(0, numRows) / DOOR_SECTION_ROWS);
}

/** Calcule la géométrie exacte de la porte d'indice `index` en O(1). */
export function getBusDoorAt(index: number): BusDoorLayout {
  if (index <= 0) return { ...BUS_DOOR, index: 0 };
  return { ...BUS_DOOR, index, z: getSeatRowZ(index * DOOR_SECTION_ROWS - 1) };
}

/** La porte d’entrée fait face au siège du relais, les autres à une demi-rangée. */
export function getBusDoors(numRows: number): BusDoorLayout[] {
  const doors: BusDoorLayout[] = [{ ...BUS_DOOR, index: 0 }];
  for (let row = DOOR_SECTION_ROWS - 1; row < numRows; row += DOOR_SECTION_ROWS) {
    doors.push({ ...BUS_DOOR, index: doors.length, z: getSeatRowZ(row) });
  }
  return doors;
}

const MAX_FULL_DOOR_COUNT = 96;

/** Retourne toutes les portes jusqu'à ~860 rangées, puis une fenêtre O(1) autour de `focusZ` (+ extrémités). */
export function getWindowedBusDoors(numRows: number, focusZ: number, radiusM = 420): BusDoorLayout[] {
  const totalDoors = getBusDoorCount(numRows);
  if (totalDoors <= MAX_FULL_DOOR_COUNT) return getBusDoors(numRows);
  const indices = new Set<number>();
  for (let i = 0; i < Math.min(4, totalDoors); i++) {
    indices.add(i);
    indices.add(totalDoors - 1 - i);
  }
  const centerIndex = getNearestBusDoor(focusZ, numRows).index;
  const halfWindow = Math.ceil(radiusM / DOOR_SECTION_LENGTH);
  const start = Math.max(0, centerIndex - halfWindow);
  const end = Math.min(totalDoors - 1, centerIndex + halfWindow);
  for (let i = start; i <= end; i++) {
    indices.add(i);
  }
  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((index) => getBusDoorAt(index));
}

export function getBusDoorBounds(door: BusDoorLayout): { frontZ: number; rearZ: number } {
  return { frontZ: door.z - door.width / 2, rearZ: door.z + door.width / 2 };
}

export function getNearestBusDoor(seatZ: number, numRows: number): BusDoorLayout {
  const lastIndex = Math.max(0, Math.floor(numRows / DOOR_SECTION_ROWS));
  if (!lastIndex) return { ...BUS_DOOR, index: 0 };
  const firstZ = getSeatRowZ(DOOR_SECTION_ROWS - 1);
  const index = Math.min(lastIndex, Math.max(1, Math.round((seatZ - firstZ) / DOOR_SECTION_LENGTH) + 1));
  const z = getSeatRowZ(index * DOOR_SECTION_ROWS - 1);
  return Math.abs(BUS_DOOR.z - seatZ) <= Math.abs(z - seatZ)
    ? { ...BUS_DOOR, index: 0 } : { ...BUS_DOOR, index, z };
}

/** Un essieu ne doit jamais fermer un puits de marches lors d'une extension. */
export function getWheelZClearOfDoors(z: number, doors: readonly BusDoorLayout[], rearWallZ: number, wheelRadius = 0.66): number {
  const margin = wheelRadius + 0.08;
  for (const door of doors) {
    const { frontZ, rearZ } = getBusDoorBounds(door);
    if (z + margin <= frontZ || z - margin >= rearZ) continue;
    const before = frontZ - margin, after = rearZ + margin;
    const canUseBefore = before - wheelRadius >= BUS_FRONT_Z;
    const canUseAfter = after + wheelRadius <= rearWallZ;
    z = canUseBefore && (!canUseAfter || Math.abs(before - z) <= Math.abs(after - z)) ? before : after;
  }
  return z;
}

export function getWheelPositions(rearWallZ: number, doors: readonly BusDoorLayout[]): [number, number][] {
  const rearAxle = getWheelZClearOfDoors(rearWallZ - 1.6, doors, rearWallZ);
  return [[-1.2, -4.3], [1.2, -4.3], [-1.2, rearAxle], [1.2, rearAxle]];
}

/** Interrompt tout habillage aux baies des portes, même hors de la zone détaillée. */
export function splitAtDoors(from: number, to: number, doors: readonly BusDoorLayout[], rightSide = true, clearance = 0): Array<[number, number]> {
  if (to <= from) return [];
  if (!rightSide) return [[from, to]];
  const spans: Array<[number, number]> = [];
  let start = from;
  for (const door of doors) {
    const bounds = getBusDoorBounds(door);
    const front = bounds.frontZ - clearance;
    const rear = bounds.rearZ + clearance;
    if (rear <= start) continue;
    if (front >= to) break;
    if (front > start) spans.push([start, Math.min(front, to)]);
    start = Math.max(start, rear);
    if (start >= to) break;
  }
  if (start < to) spans.push([start, to]);
  return spans;
}

/** Compatibilité de la porte avant pour les scènes et tests historiques. */
export function splitAtDoor(from: number, to: number, rightSide = true): Array<[number, number]> {
  return splitAtDoors(from, to, [{ ...BUS_DOOR, index: 0 }], rightSide);
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
  for (let row = 0; row < 12; row++) {
    add(row);
    add(numRows - 1 - row);
  }
  for (let row = focusRow - 68; row <= focusRow + 68; row++) add(row);
  return Array.from(rows).sort((a, b) => a - b);
}

export type TvPosition = [number, number, number];

export function getTvPositions(
  numRows: number,
  frontPosition: { x: number; y: number; z: number },
  focusRow?: number,
): TvPosition[] {
  const positions: TvPosition[] = [[frontPosition.x, frontPosition.y, frontPosition.z]];
  if (numRows > 6) {
    const stride = Math.max(4, Math.ceil((numRows - 6) / 8));
    for (let row = 4; row <= numRows - 3 && positions.length <= 8; row += stride) {
      positions.push([0, 2.55, getSeatRowZ(row - 0.25)]);
    }
    // Sur un très long bus, garantit toujours une TV bien visible juste devant la rangée du passager
    // (~3 rangées devant les yeux, soit ~3,6 m) même tout au fond du bus.
    if (focusRow !== undefined && numRows > 18) {
      const clampedFocus = Math.max(0, Math.min(numRows - 1, focusRow));
      const desiredRow = Math.max(4, Math.min(numRows - 3, clampedFocus - 3));
      const desiredZ = getSeatRowZ(desiredRow - 0.25);
      const eyeZ = getSeatRowZ(clampedFocus) + 0.15;
      const hasNearbyFrontTv = positions.some(([, , z]) => {
        const dist = eyeZ - z;
        return dist >= 2.5 && dist <= 12;
      });
      if (!hasNearbyFrontTv && eyeZ - desiredZ >= 2.5) {
        if (positions.length >= 9) {
          // Remplace l'écran secondaire le plus éloigné du passager (jamais la TV avant #0).
          let farthestIdx = 1;
          let farthestDist = -1;
          for (let i = 1; i < positions.length; i++) {
            const dist = Math.abs(positions[i][2] - desiredZ);
            if (dist > farthestDist) {
              farthestDist = dist;
              farthestIdx = i;
            }
          }
          positions[farthestIdx] = [0, 2.55, desiredZ];
        } else {
          positions.push([0, 2.55, desiredZ]);
        }
        positions.sort((a, b) => a[2] - b[2]);
      }
    }
  }
  return positions;
}

/**
 * Place une télé fixe toutes les 7 rangées (~8,4 m, à partir de la rangée 4) sur toute
 * la fenêtre de rangées affichées (avant, arrière et autour de la caméra/du passager).
 */
export function getCabinTvPositions(
  numRows: number,
  frontPosition: { x: number; y: number; z: number },
  renderedRowIndices: readonly number[],
): TvPosition[] {
  const positions: TvPosition[] = [[frontPosition.x, frontPosition.y, frontPosition.z]];
  if (numRows > 6) {
    const seenRows = new Set<number>();
    for (let i = 0; i < renderedRowIndices.length; i++) {
      const row = renderedRowIndices[i];
      if (row < 4 || row > numRows - 3 || (row - 4) % 7 !== 0 || seenRows.has(row)) continue;
      seenRows.add(row);
      positions.push([0, 2.55, getSeatRowZ(row - 0.25)]);
    }
    positions.sort((a, b) => a[2] - b[2]);
  }
  return positions;
}

export function getActiveTvIndex(positions: TvPosition[], seatRow: number, minDistance = 2.5): number {
  const eyeZ = getSeatRowZ(seatRow) + 0.15;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  positions.forEach((position, index) => {
    const distance = eyeZ - position[2];
    if (distance < minDistance) return;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}
