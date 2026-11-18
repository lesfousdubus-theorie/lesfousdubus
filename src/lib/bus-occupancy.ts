import { BASE_ROWS, DOOR_SECTION_ROWS, getRenderedRowIndices, getSeatCountInRow, getSeatRowZ, type SeatInfo } from "./bus-layout";
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
}

/** Attribue chaque position physique une seule fois, sans modifier les identifiants persistants. */
export function getBusOccupancy({ passengerCount, seatCapacity, vacantSeatRanges = [], renderedRowIndices,
  reservedRow, reservedColumn = null, currentPassengerIndex, avatarAboard, lowPower, detailLimit, simplifiedLimit, detailFocus }: OccupancyOptions) {
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
  // Les rangées visibles sont bornées par la virtualisation. Partir de leurs
  // places évite de parcourir tous les rangs occupés quand un long bus est vide
  // à l'avant, même si ses seuls visiteurs visibles sont tout à l'arrière.
  const candidates: BusOccupant[] = [];
  for (const row of renderedRows) for (let column = 0; column < getSeatCountInRow(row); column++) {
    const index = getRegisteredSeatIndex(row, column);
    // Dès que son identité est connue, le visiteur local est représenté par
    // BoardingAvatar, y compris pendant sa sortie et après son départ.
    // Le réinsérer ici quand la caméra passe dehors le faisait réapparaître assis.
    if (index === currentPassengerIndex || !occupied(index)) continue;
    const occupant = make(index);
    if (renderedRows.has(occupant.seat.row)) candidates.push(occupant);
  }
  // Un passager échangé peut se trouver hors des rangées normalement visibles.
  if (avatarAboard && occupied(avatarSeatIndex) && avatarSeatIndex !== currentPassengerIndex
    && !candidates.some(occupant => occupant.index === avatarSeatIndex)) {
    candidates.push(make(avatarSeatIndex));
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
  const simplified = resolvedSimplifiedLimit === 0
    ? []
    : distant.length <= resolvedSimplifiedLimit
      ? distant
      : resolvedSimplifiedLimit === 1
        ? [distant[0]]
        : Array.from({ length: resolvedSimplifiedLimit }, (_, sample) =>
          distant[Math.floor(sample * (distant.length - 1) / (resolvedSimplifiedLimit - 1))]);
  return { detailed, simplified, avatar, detailLimit: resolvedDetailLimit, occupiedCount, visitorRows, numRows };
}
