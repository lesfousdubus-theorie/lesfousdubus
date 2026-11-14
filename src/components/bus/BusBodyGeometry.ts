import * as THREE from "three";

export const WHEEL_RADIUS = 0.55;
export const WHEEL_CENTER_Y = 0.55;
export const WHEEL_ARCH_RADIUS = 0.66;
export const PANEL_BOTTOM = 0.5;
export const PANEL_TOP = 1.75;
export const SIDE_LABEL_Y = (PANEL_BOTTOM + PANEL_TOP) / 2;

/** Un panneau plein, avec de vraies découpes plutôt qu'un cache sur les pneus. */
export function createLowerBodyGeometry(cabinLength: number, wheelZs: number[]): THREE.ExtrudeGeometry {
  const start = -cabinLength / 2;
  const end = cabinLength / 2;
  const shape = new THREE.Shape();
  const baselineAngle = Math.asin((PANEL_BOTTOM - WHEEL_CENTER_Y) / WHEEL_ARCH_RADIUS);
  const halfOpening = Math.sqrt(WHEEL_ARCH_RADIUS ** 2 - (PANEL_BOTTOM - WHEEL_CENTER_Y) ** 2);
  const arches = [...wheelZs].sort((a, b) => a - b)
    .filter((z) => z + halfOpening > start && z - halfOpening < end);
  const first = arches[0];
  const startY = first !== undefined && first - halfOpening < start
    ? WHEEL_CENTER_Y + Math.sqrt(WHEEL_ARCH_RADIUS ** 2 - (start - first) ** 2)
    : PANEL_BOTTOM;
  shape.moveTo(start, startY);
  for (const z of arches) {
    const left = Math.max(start, z - halfOpening);
    const right = Math.min(end, z + halfOpening);
    const startAngle = left === start && z - halfOpening < start
      ? Math.acos((left - z) / WHEEL_ARCH_RADIUS)
      : Math.PI - baselineAngle;
    const endAngle = right === end && z + halfOpening > end
      ? Math.acos((right - z) / WHEEL_ARCH_RADIUS)
      : baselineAngle;
    if (left > start) shape.lineTo(left, PANEL_BOTTOM);
    shape.absarc(z, WHEEL_CENTER_Y, WHEEL_ARCH_RADIUS, startAngle, endAngle, true);
  }
  if (!arches.length || arches[arches.length - 1] + halfOpening < end) shape.lineTo(end, PANEL_BOTTOM);
  shape.lineTo(end, PANEL_TOP);
  shape.lineTo(start, PANEL_TOP);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.044, steps: 1, curveSegments: 20,
    bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2,
  });
  geometry.translate(0, 0, -0.022);
  // Shape X devient le Z longitudinal ; la profondeur devient l'épaisseur X.
  geometry.rotateY(-Math.PI / 2);
  return geometry;
}
