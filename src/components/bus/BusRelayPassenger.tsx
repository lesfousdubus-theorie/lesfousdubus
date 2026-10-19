"use client";

import { memo, useCallback, useMemo } from "react";
import * as THREE from "three";
import { BUS_RELAY } from "@/lib/bus-crew";
import { ENTRY_SEAT_POSITION } from "@/lib/bus-layout";
import { Passenger, getArchetypeMaterials } from "./Passengers";
import { Accessory } from "./PassengerAppearance";
import type { NakamaArchetype } from "./passenger-archetypes";

const archetype: NakamaArchetype = {
  id: "foudubustv", name: BUS_RELAY.name,
  skinColor: "#f5f3ea", hairColor: "#17243d", hairStyle: "crop",
  shirtColor: "#24569c", pantsColor: "#253449",
  accessory: "straw_hat", accessoryColor: "#eebc41", accessorySubColor: "#b82a36",
};

// Avatar public : une pièce de puzzle blanche coiffée d'un chapeau de paille.
let puzzleGeometry: THREE.ExtrudeGeometry | undefined;
function getPuzzleGeometry() {
  if (puzzleGeometry) return puzzleGeometry;
  const shape = new THREE.Shape();
  shape.moveTo(-.10, -.12);
  shape.lineTo(-.045, -.12);
  shape.bezierCurveTo(-.085, -.20, .085, -.20, .045, -.12);
  shape.lineTo(.10, -.12); shape.quadraticCurveTo(.12, -.12, .12, -.10);
  shape.lineTo(.12, -.045);
  shape.bezierCurveTo(.035, -.075, .035, .075, .12, .045);
  shape.lineTo(.12, .10); shape.quadraticCurveTo(.12, .12, .10, .12);
  shape.lineTo(.045, .12);
  shape.bezierCurveTo(.085, .20, -.085, .20, -.045, .12);
  shape.lineTo(-.10, .12); shape.quadraticCurveTo(-.12, .12, -.12, .10);
  shape.lineTo(-.12, .045);
  shape.bezierCurveTo(-.20, .085, -.20, -.085, -.12, -.045);
  shape.lineTo(-.12, -.10); shape.quadraticCurveTo(-.12, -.12, -.10, -.12);
  puzzleGeometry = new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: true, bevelThickness: .01, bevelSize: .008, bevelSegments: 2, curveSegments: 10, steps: 1 });
  puzzleGeometry.translate(0, 0, -.09);
  return puzzleGeometry;
}

function BusRelayPassenger({ hornPulse, reducedMotion, partyOn }: { hornPulse: number; reducedMotion: boolean; partyOn: boolean }) {
  const mats = useMemo(() => getArchetypeMaterials(archetype), []);
  const onActivate = useCallback(() => {
    window.dispatchEvent(new CustomEvent("bus-show-toast", { detail: {
      badge: "📣 FOUDUBUSTV", text: "Le relais de la théorie sur X / Twitter", sub: BUS_RELAY.handle,
    } }));
  }, []);
  return <Passenger name="bus-entry-passenger" label={BUS_RELAY.name} onActivate={onActivate}
    seat={{ x: ENTRY_SEAT_POSITION[0], z: ENTRY_SEAT_POSITION[2], row: -1, seatInRow: 0 }}
    index={16} archetype={archetype} hornPulse={hornPulse} reducedMotion={reducedMotion} partyOn={partyOn}
    head={<group name="bus-relay-puzzle-head">
      <mesh name="nakama-face" material={mats.skin} geometry={getPuzzleGeometry()} dispose={null} castShadow />
      <Accessory archetype={archetype} mats={mats} />
    </group>} />;
}

export default memo(BusRelayPassenger);
