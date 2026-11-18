import { Frustum, Matrix4, type Camera, type Object3D } from "three";
import { BASE_ROWS, DOOR_SECTION_ROWS, FIRST_SEAT_Z, getRenderedRowIndices, getSeatCountInRow, getSeatRowZ, type SeatInfo } from "./bus-layout";
export const PASSENGER_SEAT_X = [-0.94, -0.5, 0.5, 0.94] as const;
const SEATS_PER_SECTION = (DOOR_SECTION_ROWS - 1) * PASSENGER_SEAT_X.length + 2;

/** Les places correspondent uniquement aux visiteurs enregistrés. */
export const getVisitorRows = (seatCapacity: number) => getRegisteredSeat(Math.max(0, seatCapacity - 1)).row + 1;
/** Une place de secours permet un échange local avant l'attribution d'un siège. */
export const getBusPhysicalRows = (seatCapacity: number) => Math.max(BASE_ROWS, getVisitorRows(seatCapacity + 1));

/** Les indices D1 restent contigus et indépendants des places physiques. */
export function getRegisteredSeat(passengerIndex: number): { row: number; column: number } {
  const section = Math.floor(passengerIndex / SEATS_PER_SECTION);
  const offset = passengerIndex % SEATS_PER_SECTION;
  return { row: section * DOOR_SECTION_ROWS + Math.floor(offset / 4), column: offset % 4 };
}

export function getRegisteredSeatIndex(row: number, column = 0): number {
  const section = Math.floor(row / DOOR_SECTION_ROWS);
  return section * SEATS_PER_SECTION + (row % DOOR_SECTION_ROWS) * 4 + column;
}

export function getPhysicalSeat(physicalSeatIndex: number): SeatInfo {
  const row = Math.floor(physicalSeatIndex / 4), seatInRow = physicalSeatIndex % 4;
  return { x: PASSENGER_SEAT_X[seatInRow], z: getSeatRowZ(row), row, seatInRow };
}

export function getAvatarSeat(seatCapacity: number, row: number, passengerIndex: number | null, seatColumn?: number | null) {
  const assigned = passengerIndex !== null && passengerIndex >= 0 && passengerIndex < seatCapacity;
  const originSeatIndex = assigned ? passengerIndex : Math.max(0, seatCapacity);
  const clampedRow = Math.max(0, Math.min(getBusPhysicalRows(seatCapacity) - 1, row));
  const defaultSeatInRow = assigned ? getRegisteredSeat(passengerIndex).column : 3;
  const seatInRow = Math.max(0, Math.min(getSeatCountInRow(clampedRow) - 1, Math.floor(seatColumn ?? defaultSeatInRow)));
  const physicalSeatIndex = clampedRow * 4 + seatInRow;
  return { originSeatIndex, physicalSeatIndex, seat: getPhysicalSeat(physicalSeatIndex) };
}

export interface BusOccupant {
  index: number;
  physicalSeatIndex: number;
  passengerKind: "visitor" | "nakama";
  seat: SeatInfo;
}

export interface BusRowRange {
  minRow: number;
  maxRow: number;
}

export interface VisibleBusRowRangeScratch {
  matrix: Matrix4;
  frustum: Frustum;
}

export function createVisibleBusRowRangeScratch(): VisibleBusRowRangeScratch {
  return { matrix: new Matrix4(), frustum: new Frustum() };
}

/** Calcule en O(1) l'intervalle de rangées de sièges intersectant le champ de vision. */
export function getVisibleBusRowRange(
  camera: Camera,
  busObject: Object3D | null | undefined,
  numRows: number,
  paddingZ = 2.4,
  scratch: VisibleBusRowRangeScratch = createVisibleBusRowRangeScratch(),
): BusRowRange {
  if (numRows <= 0) return { minRow: 1, maxRow: 0 };
  const p = camera.projectionMatrix.elements;
  if (p[0] === 0 && p[5] === 0) return { minRow: 0, maxRow: numRows - 1 };

  camera.updateMatrixWorld();
  if (busObject) {
    busObject.updateWorldMatrix(true, false);
    scratch.matrix.multiplyMatrices(camera.matrixWorldInverse, busObject.matrixWorld);
    scratch.matrix.premultiply(camera.projectionMatrix);
  } else {
    scratch.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  }
  scratch.frustum.setFromProjectionMatrix(scratch.matrix);

  let zMin = FIRST_SEAT_Z - 0.9;
  let zMax = getSeatRowZ(numRows - 1) + 0.9;
  for (const plane of scratch.frustum.planes) {
    const { x: nx, y: ny, z: nz } = plane.normal;
    const support = Math.abs(nx) * 1.45 + (ny >= 0 ? ny * 2.85 : ny * 0.5) + plane.constant;
    if (nz > 1e-6) zMin = Math.max(zMin, -support / nz);
    else if (nz < -1e-6) zMax = Math.min(zMax, -support / nz);
    else if (support < 0) return { minRow: 1, maxRow: 0 };
    if (zMin > zMax) return { minRow: 1, maxRow: 0 };
  }

  const loZ = zMin - paddingZ;
  const hiZ = zMax + paddingZ;
  let lo = 0;
  let hi = numRows - 1;
  let minRow = numRows;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (getSeatRowZ(mid) >= loZ) {
      minRow = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  lo = 0;
  hi = numRows - 1;
  let maxRow = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (getSeatRowZ(mid) <= hiZ) {
      maxRow = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return minRow <= maxRow ? { minRow, maxRow } : { minRow: 1, maxRow: 0 };
}

interface OccupancyOptions {
  passengerCount: number;
  seatCapacity: number;
  vacantSeatRanges?: Array<[number, number, number]>;
  renderedRowIndices?: number[];
  reservedRow: number;
  reservedColumn?: number | null;
  currentPassengerIndex: number | null;
  avatarAboard: boolean;
  lowPower: boolean;
  detailLimit?: number;
  simplifiedLimit?: number;
  detailFocus?: { x: number; z: number };
  visibleRowRange?: BusRowRange | null;
  preserveVisibleSeats?: boolean;
}

/** Attribue chaque position physique une seule fois, sans modifier les identifiants persistants. */
export function getBusOccupancy({ passengerCount, seatCapacity, vacantSeatRanges = [], renderedRowIndices,
  reservedRow, reservedColumn = null, currentPassengerIndex, avatarAboard, lowPower, detailLimit, simplifiedLimit, detailFocus,
  visibleRowRange = null, preserveVisibleSeats = false }: OccupancyOptions) {
  const capacity = Math.max(0, seatCapacity), numRows = getBusPhysicalRows(capacity), visitorRows = getVisitorRows(capacity);
  const renderedRows = new Set(renderedRowIndices ?? getRenderedRowIndices(numRows, reservedRow));
  const vacant = vacantSeatRanges.map(([start, end, before]) => ({ start: Math.max(0, start), end: Math.min(capacity - 1, end), before }))
    .filter(range => range.start <= range.end).sort((a, b) => a.start - b.start);
  const vacantCount = vacant.reduce((sum, range) => sum + range.end - range.start + 1, 0);
  const occupiedCount = Math.max(0, Math.min(passengerCount, capacity - vacantCount));
  const vacantThrough = (seatIndex: number) => {
    let low = 0, high = vacant.length;
    while (low < high) { const middle = (low + high) >>> 1; if (vacant[middle].start <= seatIndex) low = middle + 1; else high = middle; }
    if (!low) return 0;
    const range = vacant[low - 1];
    return range.before + Math.min(range.end, seatIndex) - range.start + 1;
  };
  const occupied = (index: number) => index >= 0 && index < capacity
    && vacantThrough(index) === (index ? vacantThrough(index - 1) : 0)
    && index - vacantThrough(index) < occupiedCount;
  const avatar = getAvatarSeat(capacity, reservedRow, currentPassengerIndex, reservedColumn);
  const avatarSeatIndex = getRegisteredSeatIndex(avatar.seat.row, avatar.seat.seatInRow);
  const make = (index: number): BusOccupant => {
    const { row, column } = getRegisteredSeat(avatarAboard && index === avatarSeatIndex ? avatar.originSeatIndex : index);
    const physicalSeatIndex = row * 4 + column;
    return { index, passengerKind: "visitor", physicalSeatIndex, seat: getPhysicalSeat(physicalSeatIndex) };
  };
  const resolvedDetailLimit = Math.max(0, detailLimit ?? (lowPower ? 2 : 8));
  const resolvedSimplifiedLimit = Math.max(0, simplifiedLimit ?? 160);
  const isRowInView = (row: number) => !visibleRowRange || (row >= visibleRowRange.minRow && row <= visibleRowRange.maxRow);
  if (visibleRowRange && visibleRowRange.minRow > visibleRowRange.maxRow) {
    return { detailed: [], simplified: [], avatar, detailLimit: resolvedDetailLimit, occupiedCount, visitorRows, numRows };
  }
  // Les rangées visibles sont bornées par la virtualisation. Partir de leurs
  // places évite de parcourir tous les rangs occupés quand un long bus est vide
  // à l'avant, même si ses seuls visiteurs visibles sont tout à l'arrière.
  const candidates: BusOccupant[] = [];
  for (const row of renderedRows) {
    if (!isRowInView(row)) continue;
    for (let column = 0; column < getSeatCountInRow(row); column++) {
      const index = getRegisteredSeatIndex(row, column);
      // Dès que son identité est connue, le visiteur local est représenté par
      // BoardingAvatar, y compris pendant sa sortie et après son départ.
      // Le réinsérer ici quand la caméra passe dehors le faisait réapparaître assis.
      if (index === currentPassengerIndex || !occupied(index)) continue;
      const occupant = make(index);
      if (renderedRows.has(occupant.seat.row) && isRowInView(occupant.seat.row)) candidates.push(occupant);
    }
  }
  // Un passager échangé peut se trouver hors des rangées normalement visibles.
  if (avatarAboard && occupied(avatarSeatIndex) && avatarSeatIndex !== currentPassengerIndex
    && !candidates.some(occupant => occupant.index === avatarSeatIndex)) {
    const swapped = make(avatarSeatIndex);
    if (isRowInView(swapped.seat.row)) candidates.push(swapped);
  }
  const focus = detailFocus ?? avatar.seat;
  // Une banquette proche est détaillée ensemble. Le rang réservé ne décrit
  // pas la position de la caméra quand on explore le bus avant d'entrer.
  const distance = (occupant: BusOccupant) => (occupant.seat.z - focus.z) ** 2
    + ((occupant.seat.seatInRow < 2 ? -.72 : .72) - focus.x) ** 2;
  const detailedVisitors = [...candidates].sort((left, right) =>
    distance(left) - distance(right) || left.index - right.index)
    .slice(0, resolvedDetailLimit);
  const detailed = detailedVisitors;
  const detailedIds = new Set(detailedVisitors.map(occupant => occupant.index));
  const distant = candidates.filter(occupant => !detailedIds.has(occupant.index));
  const simplified = (() => {
    if (preserveVisibleSeats) return distant;
    if (resolvedSimplifiedLimit === 0) return [];
    if (distant.length <= resolvedSimplifiedLimit) return distant;
    // Préserver 100 % des sièges proches/moyens autour de la caméra évite qu'un pas
    // de caméra ne décime les rangées voisines par rééchantillonnage global.
    const byDistance = [...distant].sort((left, right) =>
      distance(left) - distance(right) || left.index - right.index);
    const nearQuota = Math.min(distant.length, Math.max(1, Math.floor(resolvedSimplifiedLimit * 0.78)));
    const nearPool = byDistance.slice(0, nearQuota);
    const farPool = byDistance.slice(nearQuota).sort((left, right) => left.index - right.index);
    const farQuota = resolvedSimplifiedLimit - nearPool.length;
    const farSampled = farQuota <= 0 || !farPool.length
      ? []
      : farQuota >= farPool.length
        ? farPool
        : farQuota === 1
          ? [farPool[0]]
          : Array.from({ length: farQuota }, (_, sample) =>
            farPool[Math.floor(sample * (farPool.length - 1) / (farQuota - 1))]);
    return [...nearPool, ...farSampled].sort((left, right) => left.index - right.index);
  })();
  return { detailed, simplified, avatar, detailLimit: resolvedDetailLimit, occupiedCount, visitorRows, numRows };
}
