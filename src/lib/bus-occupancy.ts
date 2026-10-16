import { BASE_ROWS, getRenderedRowIndices, getSeatRowZ, type SeatInfo } from "./bus-layout";
export const PASSENGER_SEAT_X = [-0.94, -0.5, 0.5, 0.94] as const;

/** Les places correspondent uniquement aux visiteurs enregistrés. */
export const getVisitorRows = (seatCapacity: number) => Math.max(1, Math.ceil(Math.max(0, seatCapacity) / 4));
/** Une place de secours permet un échange local avant l'attribution d'un siège. */
export const getBusPhysicalRows = (seatCapacity: number) => Math.max(BASE_ROWS, Math.ceil((Math.max(0, seatCapacity) + 1) / 4));

export function getPhysicalSeat(physicalSeatIndex: number): SeatInfo {
  const row = Math.floor(physicalSeatIndex / 4), seatInRow = physicalSeatIndex % 4;
  return { x: PASSENGER_SEAT_X[seatInRow], z: getSeatRowZ(row), row, seatInRow };
}

export function getAvatarSeat(seatCapacity: number, row: number, passengerIndex: number | null) {
  const assigned = passengerIndex !== null && passengerIndex >= 0 && passengerIndex < seatCapacity;
  const originSeatIndex = assigned ? passengerIndex : Math.max(0, seatCapacity);
  const seatInRow = assigned ? passengerIndex % 4 : 3;
  const clampedRow = Math.max(0, Math.min(getBusPhysicalRows(seatCapacity) - 1, row));
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
  currentPassengerIndex: number | null;
  avatarAboard: boolean;
  lowPower: boolean;
}

/** Attribue chaque position physique une seule fois, sans modifier les identifiants persistants. */
export function getBusOccupancy({ passengerCount, seatCapacity, vacantSeatRanges = [], renderedRowIndices,
  reservedRow, currentPassengerIndex, avatarAboard, lowPower }: OccupancyOptions) {
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
  const avatar = getAvatarSeat(capacity, reservedRow, currentPassengerIndex);
  const relocate = (index: number) => avatarAboard && index === avatar.physicalSeatIndex ? avatar.originSeatIndex : index;
  const make = (index: number): BusOccupant => {
    const physicalSeatIndex = relocate(index);
    return { index, passengerKind: "visitor", physicalSeatIndex, seat: getPhysicalSeat(physicalSeatIndex) };
  };
  const detailLimit = lowPower ? 2 : 8;
  // Les rangées visibles sont bornées par la virtualisation. Partir de leurs
  // places évite de parcourir tous les rangs occupés quand un long bus est vide
  // à l'avant, même si ses seuls visiteurs visibles sont tout à l'arrière.
  const candidates: BusOccupant[] = [];
  for (const row of renderedRows) for (let column = 0; column < 4; column++) {
    const index = row * 4 + column;
    if ((avatarAboard && index === currentPassengerIndex) || !occupied(index)) continue;
    const occupant = make(index);
    if (renderedRows.has(occupant.seat.row)) candidates.push(occupant);
  }
  // Un passager échangé peut se trouver hors des rangées normalement visibles.
  if (avatarAboard && occupied(avatar.physicalSeatIndex) && avatar.physicalSeatIndex !== currentPassengerIndex
    && !candidates.some(occupant => occupant.index === avatar.physicalSeatIndex)) {
    candidates.push(make(avatar.physicalSeatIndex));
  }
  const focusIndex = Math.max(0, reservedRow * 4);
  const detailedVisitors = [...candidates].sort((left, right) =>
    Math.abs(left.physicalSeatIndex - focusIndex) - Math.abs(right.physicalSeatIndex - focusIndex) || left.index - right.index)
    .slice(0, detailLimit);
  const detailed = detailedVisitors;
  const detailedIds = new Set(detailedVisitors.map(occupant => occupant.index));
  const distant = candidates.filter(occupant => !detailedIds.has(occupant.index));
  const simplified = distant.length <= 160 ? distant : Array.from({ length: 160 }, (_, sample) =>
    distant[Math.floor(sample * (distant.length - 1) / 159)]);
  return { detailed, simplified, avatar, detailLimit, occupiedCount, visitorRows, numRows };
}
