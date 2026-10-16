import { ease } from "./bus-journey";

export const ENTRY_STEPS = [
  { x: 1.46, y: 0.29, width: 0.42 },
  { x: 1.03, y: 0.46, width: 0.44 },
  { x: 0.6, y: 0.63, width: 0.44 },
] as const;

/** Les marches sortent horizontalement du logement, puis descendent à plat. */
export function getEntryStepPose(index: number, deployment: number) {
  const step = ENTRY_STEPS[index];
  const slide = ease(deployment / 0.55);
  const lower = ease((deployment - 0.35) / 0.65);
  return { x: 0.6 + (step.x - 0.6) * slide, y: 0.63 + (step.y - 0.63) * lower };
}
