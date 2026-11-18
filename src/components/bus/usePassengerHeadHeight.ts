"use client";

import { useLayoutEffect, useSyncExternalStore, type RefObject } from "react";
import { Matrix4, Mesh, Vector3, type Object3D } from "three";
import { getPassengerSkeleton } from "@/lib/passenger-proportions";

let headHeights: ReadonlyMap<string, number> = new Map();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function usePassengerHeadHeights() {
  return useSyncExternalStore(subscribe, () => headHeights, () => headHeights);
}

/** Enregistre la hauteur de tête mesurée pour un archétype et notifie les abonnés si nouvelle. */
export function recordPassengerHeadHeight(id: string, top: number) {
  if (!Number.isFinite(top) || headHeights.has(id)) return;
  headHeights = new Map(headHeights).set(id, top);
  listeners.forEach(listener => listener());
}

/** Mesure une fois le vrai sommet du modèle, cheveux et accessoires compris. */
export function usePassengerHeadHeight(id: string, modelRef: RefObject<Object3D | null>, enabled = true) {
  useLayoutEffect(() => {
    const model = modelRef.current;
    if (!enabled || !model || headHeights.has(id)) return;
    model.updateWorldMatrix(true, true);
    const toHead = model.matrixWorld.clone().invert();
    const transform = new Matrix4();
    const point = new Vector3();
    let top = -Infinity;
    model.traverseVisible((object) => {
      if (!(object instanceof Mesh)) return;
      const vertices = object.geometry.getAttribute("position");
      if (!vertices) return;
      transform.multiplyMatrices(toHead, object.matrixWorld);
      for (let index = 0; index < vertices.count; index++) {
        point.set(vertices.getX(index), vertices.getY(index), vertices.getZ(index)).applyMatrix4(transform);
        top = Math.max(top, point.y);
      }
    });
    recordPassengerHeadHeight(id, top);
  }, [enabled, id, modelRef]);

  return useSyncExternalStore(subscribe, () => headHeights.get(id), () => undefined);
}

/** Centre du sprite mesuré depuis le bassin, avec la même marge pour chaque personnage. */
export function getPassengerNameHeightFromHip(id: string, headTop: number) {
  const rig = getPassengerSkeleton(id);
  return rig.neckAboveHip + rig.headAboveNeck + headTop + .105;
}
