"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DESTINATION_MESSAGE, GRAND_LINE_STOPS, LED_COLUMNS, LED_ROWS, encodeLedText, getLedOffset, getDestinationStartOffset, getRandomDestinationStart } from "@/lib/bus-destinations";

export default function BusDestination({ mats, reducedMotion }: { mats: Record<string, THREE.Material>; reducedMotion: boolean }) {
  const elapsed = useRef(0);
  const previous = useRef(-1);
  const [startingStop] = useState(getRandomDestinationStart);
  const startOffset = useMemo(() => getDestinationStartOffset(startingStop), [startingStop]);
  const message = useMemo(() => encodeLedText(reducedMotion ? GRAND_LINE_STOPS[startingStop] : DESTINATION_MESSAGE), [reducedMotion, startingStop]);
  const display = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = LED_COLUMNS * 8;
    canvas.height = LED_ROWS * 8;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return { canvas, texture, context: canvas.getContext("2d")! };
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
    ctx.fillStyle = "#070b0e";
    ctx.fillRect(0, 0, currentDisplay.canvas.width, currentDisplay.canvas.height);
    for (let x = 0; x < LED_COLUMNS; x++) {
      const column = reducedMotion ? (message[x] ?? 0) : message[(x + offset) % message.length];
      for (let y = 0; y < LED_ROWS; y++) {
        const lit = Boolean(column & (1 << y));
        ctx.beginPath();
        ctx.arc(x * 8 + 4, y * 8 + 4, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = lit ? "#a96b16" : "#211d13";
        ctx.fill();
        if (lit) {
          ctx.beginPath();
          ctx.arc(x * 8 + 4, y * 8 + 4, 2.35, 0, Math.PI * 2);
          ctx.fillStyle = "#ffd46a";
          ctx.fill();
        }
      }
    }
    currentDisplay.texture.needsUpdate = true;
  });
  return <group name="bus-led-destination" userData={{ startingStop, destination: GRAND_LINE_STOPS[startingStop] }} position={[0, 2.975, -4.665]} rotation={[0, Math.PI, 0]}>
    <mesh material={mats.dark}><boxGeometry args={[2.23, 0.35, 0.035]} /></mesh>
    <mesh position={[0, 0, 0.019]}><planeGeometry args={[2.16, 0.27]} />
      <meshBasicMaterial map={display.texture} toneMapped={false} />
    </mesh>
  </group>;
}
