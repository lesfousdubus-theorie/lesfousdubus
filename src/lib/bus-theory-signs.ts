import { getBusDoorBounds, type BusDoorLayout } from "./bus-layout";

// Formulations courtes des pistes de theory-data.ts, écrites pour des écrans et des tags.
export const THEORY_SIGN_MESSAGES = [
  { id: "siecle", lines: ["LE SIÈCLE OUBLIÉ", "C’EST LE PRÉSENT"] },
  { id: "luffy", lines: ["LUFFY EST NIKA", "ET JOY BOY"] },
  { id: "barbe-noire", lines: ["BARBE NOIRE EST", "DAVY D. JONES"] },
  { id: "poneglyphes", lines: ["LES PONÉGLYPHES", "VIENNENT DU FUTUR"] },
  { id: "timing", lines: ["TOUT EST UNE QUESTION", "DE TIMING"] },
  { id: "lili", lines: ["VIVI SERA", "LILY"] },
  { id: "ryuma", lines: ["ZORO SERA", "RYUMA"] },
  { id: "robin", lines: ["ROBIN ÉCRIRA", "LES PONÉGLYPHES"] },
  { id: "harley", lines: ["USOPP ÉCRIRA", "LE HARLEY"] },
  { id: "all-blue", lines: ["LES QUATRE MERS", "FORMERONT ALL BLUE"] },
  { id: "laugh-tale", lines: ["LAUGH TALE EST", "UNE QUESTION DE TEMPS"] },
  { id: "premier-pirate", lines: ["LUFFY SERA LE PREMIER PIRATE", "À PRENDRE LA MER !"] },
] as const;

interface GraffitiPlacement {
  message: number;
  side: -1 | 1;
  z: number;
  width: number;
}

/** Paint the same body sections on both sides and keep the bays and wheels clear. */
export function getBusGraffitiPlacements(
  doors: readonly BusDoorLayout[],
  rearWallZ: number,
  axlePositions: readonly number[],
): GraffitiPlacement[] {
  const placements: GraffitiPlacement[] = [];
  const addTag = (from: number, to: number, message: number, side: -1 | 1) => {
    const width = Math.min(2.9, to - from);
    if (width >= 1.35) placements.push({ message, side, z: (from + to) / 2, width });
  };

  // The title sits opposite the front door, above the front step.
  const front = doors[0] && getBusDoorBounds(doors[0]);
  if (front) {
    const frontAxle = Math.min(...axlePositions);
    addTag(Math.max(front.frontZ - .28, frontAxle + .72), front.rearZ + .16, 0, -1);
  }

  for (const [section, door] of doors.entries()) {
    const from = getBusDoorBounds(door).rearZ + .24;
    const next = doors[section + 1];
    const to = (next ? getBusDoorBounds(next).frontZ : rearWallZ) - .3;
    // Only the rear axle can cross these spans. If it does, finish the signage
    // ahead of the wheel arch so the lettering always rests on painted metal.
    const lastAxle = axlePositions.find(z => z + .72 > from && z - .72 < to);
    const end = lastAxle === undefined ? to : lastAxle - .72;
    const order = section === 0 ? [2, 1, 3, 4]
      : Array.from({ length: 4 }, (_, i) => (5 + (section - 1) * 4 + i) % THEORY_SIGN_MESSAGES.length);
    if (end - from >= 2.98) {
      const middle = (from + end) / 2;
      addTag(from, middle - .14, order[0], -1);
      addTag(middle + .14, end, order[1], -1);
      addTag(from, middle - .14, order[2], 1);
      addTag(middle + .14, end, order[3], 1);
    } else {
      addTag(from, end, order[0], -1);
      addTag(from, end, order[2], 1);
    }
  }
  return placements;
}
