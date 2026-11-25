import { getSeatCountInRow } from "@/lib/bus-layout";
import { getBusPhysicalRows } from "@/lib/bus-occupancy";

export const LOCAL_SEAT_STORAGE_KEY = "fdb-local-seat";

export interface SavedLocalSeat {
  row: number;
  column: number;
}

export function readSavedLocalSeat(): SavedLocalSeat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SEAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const { row, column } = parsed as { row?: unknown; column?: unknown };
    if (
      typeof row !== "number" || !Number.isSafeInteger(row) || row < 0
      || typeof column !== "number" || !Number.isSafeInteger(column) || column < 0 || column > 3
    ) {
      return null;
    }
    return { row, column };
  } catch {
    return null;
  }
}

export function writeSavedLocalSeat(row: number, column: number): void {
  if (typeof window === "undefined") return;
  const safeRow = Math.max(0, Math.floor(row));
  const safeColumn = Math.max(0, Math.min(3, Math.floor(column)));
  try {
    window.localStorage.setItem(
      LOCAL_SEAT_STORAGE_KEY,
      JSON.stringify({ row: safeRow, column: safeColumn }),
    );
  } catch {
    /* Le stockage local reste optionnel. */
  }
}

export function clearSavedLocalSeat(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_SEAT_STORAGE_KEY);
  } catch {
    /* Le stockage local reste optionnel. */
  }
}

export function clampLocalSeat(seat: SavedLocalSeat, seatCapacity: number): SavedLocalSeat {
  const maxRow = Math.max(0, getBusPhysicalRows(seatCapacity) - 1);
  const row = Math.max(0, Math.min(maxRow, Math.floor(seat.row)));
  const maxColumn = Math.max(0, getSeatCountInRow(row) - 1);
  const column = Math.max(0, Math.min(maxColumn, Math.floor(seat.column)));
  return { row, column };
}
