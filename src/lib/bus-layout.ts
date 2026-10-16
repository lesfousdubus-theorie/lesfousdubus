export const BASE_ROWS = 6;

// Le vestibule se trouve après l'essieu avant et derrière les deux navigateurs.
export const BUS_FRONT_Z = -4.6;
export const FIRST_SEAT_Z = -1.55;
export const SEAT_ROW_SPACING = 1.2;
export const DOOR_SECTION_ROWS = 8;
export const DOOR_VESTIBULE_LENGTH = 1.65;
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

export function getSeatRowZ(row: number): number {
  return FIRST_SEAT_Z + row * SEAT_ROW_SPACING
    + Math.floor(Math.max(0, row) / DOOR_SECTION_ROWS) * DOOR_VESTIBULE_LENGTH;
}

/** Le mur arrière suit la dernière rangée sans ajouter un vestibule inutilisé. */
export function getBusRearWallZ(numRows: number): number {
  return getSeatRowZ(Math.max(0, numRows - 1)) + SEAT_ROW_SPACING;
}

/** Les numéros de place restent inchangés : seuls les intervalles physiques grandissent. */
export function getBusDoors(numRows: number): BusDoorLayout[] {
  const doors: BusDoorLayout[] = [{ ...BUS_DOOR, index: 0 }];
  for (let row = DOOR_SECTION_ROWS; row < numRows; row += DOOR_SECTION_ROWS) {
    doors.push({ ...BUS_DOOR, index: doors.length, z: (getSeatRowZ(row - 1) + getSeatRowZ(row)) / 2 });
  }
  return doors;
}

export function getBusDoorBounds(door: BusDoorLayout): { frontZ: number; rearZ: number } {
  return { frontZ: door.z - door.width / 2, rearZ: door.z + door.width / 2 };
}

export function getNearestBusDoor(seatZ: number, numRows: number): BusDoorLayout {
  const lastIndex = Math.max(0, Math.floor((numRows - 1) / DOOR_SECTION_ROWS));
  if (!lastIndex) return { ...BUS_DOOR, index: 0 };
  const firstZ = (getSeatRowZ(DOOR_SECTION_ROWS - 1) + getSeatRowZ(DOOR_SECTION_ROWS)) / 2;
  const pitch = DOOR_SECTION_ROWS * SEAT_ROW_SPACING + DOOR_VESTIBULE_LENGTH;
  const index = Math.min(lastIndex, Math.max(1, Math.round((seatZ - firstZ) / pitch) + 1));
  const z = firstZ + (index - 1) * pitch;
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
      positions.push([0, 2.55, getSeatRowZ(row - 0.25)]);
    }
  }
  return positions;
}

export function getActiveTvIndex(positions: TvPosition[], seatRow: number): number {
  const eyeZ = getSeatRowZ(seatRow) + 0.15;
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
