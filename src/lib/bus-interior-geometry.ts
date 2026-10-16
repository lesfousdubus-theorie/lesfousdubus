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

// Les poignées restent au-dessus des sièges, hors du cône entre chaque œil et l'écran.
export const GRAB_HANDLE_X = 1.10;
export const TV_HANDLE_CLEARANCE_Z = 3.2;
export function isGrabHandleClearOfTv(z: number, televisions: readonly TvPosition[]): boolean {
  return televisions.every(([, , screenZ]) => z < screenZ - .15 || z > screenZ + TV_HANDLE_CLEARANCE_Z);
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
