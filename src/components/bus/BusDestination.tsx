"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DESTINATION_MESSAGE, GRAND_LINE_STOPS, LED_COLUMNS, LED_ROWS, encodeLedText, getLedOffset, getDestinationStartOffset, getRandomDestinationStart } from "@/lib/bus-destinations";

const REDUCED_MOTION_STOP_LABELS: Record<string, string> = {
  "Île de Gaimon": "Ile Gaimon",
  "Syrup Village": "Syrup",
  "Cactus Island": "Cactus Isl",
  "Little Garden": "Ltl Garden",
  "Long Ring Long Land": "Long Ring",
  "Thriller Bark": "Thriller",
  "Archipel Sabaody": "Sabaody",
  "Île des Hommes-Poissons": "H-Poissons",
  "Whole Cake Island": "Whole Cake",
};

function formatReducedMotionStop(stop: string): string {
  if (stop.length <= 12) return stop;
  const mapped = REDUCED_MOTION_STOP_LABELS[stop];
  if (mapped) return mapped;
  const words = stop.split(" ");
  let result = "";
  for (const word of words) {
    const candidate = result ? `${result} ${word}` : word;
    if (candidate.length > 12) break;
    result = candidate;
  }
  return result || stop.slice(0, 12);
}

export default function BusDestination({ mats, reducedMotion }: { mats: Record<string, THREE.Material>; reducedMotion: boolean }) {
  const elapsed = useRef(0);
  const previous = useRef(-1);
  const [startingStop] = useState(getRandomDestinationStart);
  const startOffset = useMemo(() => getDestinationStartOffset(startingStop), [startingStop]);
  const message = useMemo(
    () => encodeLedText(reducedMotion ? formatReducedMotionStop(GRAND_LINE_STOPS[startingStop]) : DESTINATION_MESSAGE),
    [reducedMotion, startingStop],
  );
  const staticPadding = useMemo(() => {
    if (!reducedMotion) return 0;
    const litColumns = Math.max(0, message.length - 1);
    return Math.max(0, Math.floor((LED_COLUMNS - litColumns) / 2));
  }, [message, reducedMotion]);
  const display = useMemo(() => {
    const cell = 8;
    const width = LED_COLUMNS * cell;
    const height = LED_ROWS * cell;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext("2d")!;
    baseCtx.fillStyle = "#070b0e";
    baseCtx.fillRect(0, 0, width, height);
    baseCtx.fillStyle = "#211d13";
    for (let x = 0; x < LED_COLUMNS; x++) {
      for (let y = 0; y < LED_ROWS; y++) {
        baseCtx.beginPath();
        baseCtx.arc(x * cell + 4, y * cell + 4, 3.2, 0, Math.PI * 2);
        baseCtx.fill();
      }
    }
    const litDot = document.createElement("canvas");
    litDot.width = cell;
    litDot.height = cell;
    const dotCtx = litDot.getContext("2d")!;
    dotCtx.beginPath();
    dotCtx.arc(4, 4, 3.2, 0, Math.PI * 2);
    dotCtx.fillStyle = "#5533a8";
    dotCtx.fill();
    dotCtx.beginPath();
    dotCtx.arc(4, 4, 2.35, 0, Math.PI * 2);
    dotCtx.fillStyle = "#c4a5ff";
    dotCtx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
    return { canvas, baseCanvas, litDot, texture, context: canvas.getContext("2d")! };
  }, []);
  const displayRef = useRef(display);
  useEffect(() => { displayRef.current = display; }, [display]);
  useEffect(() => { previous.current = -1; elapsed.current = 0; }, [message]);
  useEffect(() => () => display.texture.dispose(), [display]);
  useFrame((_, dt) => {
    elapsed.current += Math.min(dt, 0.1);
    const offset = reducedMotion ? 0 : getLedOffset(elapsed.current, message.length, startOffset);
    if (previous.current === offset) return;
    previous.current = offset;
    const currentDisplay = displayRef.current;
    const ctx = currentDisplay.context;
    ctx.drawImage(currentDisplay.baseCanvas, 0, 0);
    for (let x = 0; x < LED_COLUMNS; x++) {
      const column = reducedMotion
        ? (x >= staticPadding ? (message[x - staticPadding] ?? 0) : 0)
        : message[(x + offset) % message.length];
      if (!column) continue;
      for (let y = 0; y < LED_ROWS; y++) {
        if (column & (1 << y)) {
          ctx.drawImage(currentDisplay.litDot, x * 8, y * 8);
        }
      }
    }
    currentDisplay.texture.needsUpdate = true;
  });
  return <group name="bus-led-destination" userData={{ startingStop, destination: GRAND_LINE_STOPS[startingStop] }} position={[0, 2.975, -4.655]} rotation={[0, Math.PI, 0]}>
    <mesh material={mats.dark}><boxGeometry args={[2.23, 0.35, 0.035]} /></mesh>
    <mesh position={[0, 0, 0.022]}><planeGeometry args={[2.16, 0.27]} />
      <meshBasicMaterial map={display.texture} toneMapped={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
  </group>;
}
