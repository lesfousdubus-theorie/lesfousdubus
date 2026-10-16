import { BUS_DOOR, getBusDoorBounds, splitAtDoors, type BusDoorLayout, type TvPosition } from "./bus-layout";

// Les faces intérieures de la caisse sont à x = 1,26. Le jambage est
// volontairement en retrait : aucun plan bleu ne partage cette profondeur.
export const DOOR_FRAME_X = 1.3175;
export const DOOR_FRAME_THICKNESS = 0.145;
export const DOOR_JAMB_HALF_Z = 0.045;
export const DOOR_INNER_TRIM_X = 1.232;
export const DOOR_INNER_TRIM_DEPTH = 0.08;
export const DOOR_INNER_TRIM_HALF_Z = 0.065;
export const INTERIOR_RAIL_X = 1.225;
export const INTERIOR_RAIL_DEPTH = 0.026;
export const INTERIOR_RAIL_JOINT_GAP = 0.012;

// Anneaux et barres d'origine, de part et d'autre de l'allée centrale.
export const GRAB_HANDLE_X = 0.35;
export const TV_HANDLE_CLEARANCE_Z = 3.2;
export function isGrabHandleClearOfTv(z: number, televisions: readonly TvPosition[]): boolean {
  const halfDepth = .015;
  return televisions.every(([, , screenZ]) => z + halfDepth < screenZ - .15 || z - halfDepth > screenZ + TV_HANDLE_CLEARANCE_Z);
}

/** Les barres ne traversent pas la zone dégagée devant chaque écran. */
export function getGrabRailSpans(from: number, to: number, televisions: readonly TvPosition[]): Array<[number, number]> {
  let spans: Array<[number, number]> = [[from, to]];
  for (const [, , screenZ] of televisions) {
    const front = screenZ - .15, rear = screenZ + TV_HANDLE_CLEARANCE_Z;
    spans = spans.flatMap(([start, end]): Array<[number, number]> => {
      if (end <= front || start >= rear) return [[start, end]];
      const remaining: Array<[number, number]> = [];
      if (start < front) remaining.push([start, front]);
      if (end > rear) remaining.push([rear, end]);
      return remaining;
    });
  }
  return spans;
}

/** Arrête les rails avant les habillages des jambages, avec un vrai jeu. */
export function getInteriorRailSpans(from: number, to: number, rightSide: boolean, doors: readonly BusDoorLayout[] = [{ ...BUS_DOOR, index: 0 }]): Array<[number, number]> {
  return splitAtDoors(from, to, doors, rightSide, DOOR_INNER_TRIM_HALF_Z + INTERIOR_RAIL_JOINT_GAP);
}

/** Un pilier a une demi-épaisseur longitudinale de 5 cm. */
export function isWindowPillarClearOfDoor(z: number, doors: readonly BusDoorLayout[] = [{ ...BUS_DOOR, index: 0 }]): boolean {
  const clearance = DOOR_INNER_TRIM_HALF_Z + 0.05 + INTERIOR_RAIL_JOINT_GAP;
  return doors.every(door => {
    const { frontZ, rearZ } = getBusDoorBounds(door);
    return z < frontZ - clearance || z > rearZ + clearance;
  });
}
