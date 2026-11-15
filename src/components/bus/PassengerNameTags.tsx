"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { fetchJson } from "@/lib/client/bus-api";
import type { BusOccupant } from "@/lib/bus-occupancy";

type NameEntry = { seatIndex: number; displayName: string | null };
const EMPTY_NAMES = new Map<number, string | null>();
const NAME_PAGE_SIZE = 80;
const MIN_PIXELS = 24;
const MAX_PIXELS = 35;
const CELL_WIDTH = 168;
const CELL_HEIGHT = 52;
const FONT = "900 32px ui-sans-serif, system-ui, sans-serif";

/** Charger les noms des places rendues, même hors de la fenêtre des profils détaillés. */
export function useVisiblePassengerNames(passengers: BusOccupant[], revision: number) {
  const key = passengers.filter(person => person.passengerKind === "visitor")
    .map(person => person.index).sort((a, b) => a - b).join(",");
  const cache = useRef({ revision, names: new Map<number, string | null>() });
  const [result, setResult] = useState<{ revision: number; names: ReadonlyMap<number, string | null> }>();
  useEffect(() => {
    if (!key) return;
    if (cache.current.revision !== revision) cache.current = { revision, names: new Map() };
    const memory = cache.current;
    const ids = key.split(",").map(Number).filter(seat => !memory.names.has(seat));
    if (!ids.length) return;
    const controller = new AbortController();
    let retry: number | undefined;
    const load = async (remaining: number[], canRetry: boolean) => {
      const slices = Array.from({ length: Math.ceil(remaining.length / NAME_PAGE_SIZE) }, (_, index) =>
        remaining.slice(index * NAME_PAGE_SIZE, (index + 1) * NAME_PAGE_SIZE));
      const results = await Promise.allSettled(slices.map(seats => fetchJson<{ names: NameEntry[] }>(
        `/api/bus-entries?names=1&seats=${seats.join(",")}&rev=${revision}`, { signal: controller.signal },
      )));
      if (controller.signal.aborted) return;
      const failed: number[] = [];
      results.forEach((response, index) => {
        if (response.status === "rejected") {
          failed.push(...slices[index]);
          return;
        }
        for (const seat of slices[index]) memory.names.set(seat, null);
        for (const { seatIndex, displayName } of response.value.names) memory.names.set(seatIndex, displayName?.trim() || null);
      });
      setResult({ revision, names: new Map(memory.names) });
      if (canRetry && failed.length) retry = window.setTimeout(() => void load(failed, false), 1400);
    };
    void load(ids, true);
    return () => {
      controller.abort();
      if (retry !== undefined) window.clearTimeout(retry);
    };
  }, [key, revision]);
  return result?.revision === revision ? result.names : EMPTY_NAMES;
}

function paintName(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, width: number) {
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 6;
  ctx.strokeText(name, x, y + 1, width - 12);
  ctx.fillStyle = "#fff";
  ctx.fillText(name, x, y + 1, width - 12);
}

type NameCell = { u: number; v: number; width: number; height: number; aspect: number };

function makeAtlas(names: string[]) {
  const sheet = document.createElement("canvas");
  const columns = Math.min(names.length, 12);
  sheet.width = columns * CELL_WIDTH;
  sheet.height = Math.ceil(names.length / columns) * CELL_HEIGHT;
  const ctx = sheet.getContext("2d")!;
  ctx.font = FONT;
  const cells = new Map<string, NameCell>();
  names.forEach((name, index) => {
    const width = Math.min(CELL_WIDTH, Math.ceil(ctx.measureText(name).width) + 16);
    const x = index % columns * CELL_WIDTH;
    const y = Math.floor(index / columns) * CELL_HEIGHT;
    paintName(ctx, name, x + width / 2, y + CELL_HEIGHT / 2, width);
    cells.set(name, {
      u: x / sheet.width, v: 1 - (y + CELL_HEIGHT) / sheet.height,
      width: width / sheet.width, height: CELL_HEIGHT / sheet.height, aspect: width / CELL_HEIGHT,
    });
  });
  const texture = new THREE.CanvasTexture(sheet);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return { texture, cells };
}

export type PassengerNameTag = { index: number; name: string; x: number; y: number; z: number };

export function DistantPassengerNames({ labels }: { labels: PassengerNameTag[] }) {
  if (!labels.length) return null;
  return <NameBillboards labels={labels} />;
}

function NameBillboards({ labels }: { labels: PassengerNameTag[] }) {
  const size = useThree(state => state.size);
  const nameKey = JSON.stringify([...new Set(labels.map(label => label.name))].sort());
  const atlas = useMemo(() => makeAtlas(JSON.parse(nameKey) as string[]), [nameKey]);
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1);
    const result = new THREE.InstancedBufferGeometry();
    result.setIndex(plane.index);
    result.setAttribute("position", plane.getAttribute("position"));
    result.setAttribute("uv", plane.getAttribute("uv"));
    const anchors: number[] = [], bounds: number[] = [], aspects: number[] = [];
    for (const label of labels) {
      const cell = atlas.cells.get(label.name)!;
      anchors.push(label.x, label.y, label.z);
      bounds.push(cell.u, cell.v, cell.width, cell.height);
      aspects.push(cell.aspect);
    }
    result.setAttribute("anchor", new THREE.InstancedBufferAttribute(new Float32Array(anchors), 3));
    result.setAttribute("tile", new THREE.InstancedBufferAttribute(new Float32Array(bounds), 4));
    result.setAttribute("textAspect", new THREE.InstancedBufferAttribute(new Float32Array(aspects), 1));
    result.instanceCount = labels.length;
    return result;
  }, [atlas, labels]);
  useEffect(() => () => atlas.texture.dispose(), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({
    labels: { value: atlas.texture },
    viewport: { value: new THREE.Vector2(size.width, size.height) },
  }), [atlas, size.width, size.height]);

  return <mesh name="bus-distant-name-labels" userData={{ labels }} geometry={geometry} frustumCulled={false} renderOrder={20}>
    <shaderMaterial uniforms={uniforms} transparent depthWrite={false} toneMapped={false}
      vertexShader={`
        attribute vec3 anchor;
        attribute vec4 tile;
        attribute float textAspect;
        uniform vec2 viewport;
        varying vec2 labelUv;
        void main() {
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(anchor, 1.0);
          float pixels = .11 * projectionMatrix[1][1] * viewport.y / (2.0 * max(.1, clip.w));
          float height = clamp(pixels, ${MIN_PIXELS}.0, ${MAX_PIXELS}.0);
          clip.xy += 2.0 * position.xy * vec2(textAspect * height, height) / max(viewport, vec2(1.0)) * clip.w;
          labelUv = tile.xy + mix(vec2(.006), vec2(.994), uv) * tile.zw;
          gl_Position = clip;
        }`}
      fragmentShader={`
        uniform sampler2D labels;
        varying vec2 labelUv;
        void main() {
          vec4 ink = texture2D(labels, labelUv);
          if (ink.a < .25) discard;
          gl_FragColor = ink;
          #include <colorspace_fragment>
        }`} />
  </mesh>;
}

const MEASURE = new THREE.Vector3();
type TagProps = { name: string; position: [number, number, number] }
  & Pick<ThreeElements["sprite"], "onClick" | "onPointerOver" | "onPointerOut">;

export function usePassengerNameScale(sprite: RefObject<THREE.Sprite | null>, aspect: number) {
  useFrame(({ camera, size }) => {
    const label = sprite.current;
    if (!label) return;
    const depth = -label.getWorldPosition(MEASURE).applyMatrix4(camera.matrixWorldInverse).z;
    if (depth <= 0) return;
    const worldPerPixel = 2 * depth / (Math.abs(camera.projectionMatrix.elements[5]) * Math.max(1, size.height));
    const height = THREE.MathUtils.clamp(.11, MIN_PIXELS * worldPerPixel, MAX_PIXELS * worldPerPixel);
    label.scale.set(height * aspect, height, 1);
  });
}

export function PassengerNameTag({ name, position, ...handlers }: TagProps) {
  const sprite = useRef<THREE.Sprite>(null);
  const { texture, cell } = useMemo(() => {
    const atlas = makeAtlas([name]);
    const cell = atlas.cells.get(name)!;
    atlas.texture.offset.set(cell.u, cell.v);
    atlas.texture.repeat.set(cell.width, cell.height);
    atlas.texture.updateMatrix();
    return { texture: atlas.texture, cell };
  }, [name]);
  useEffect(() => () => texture.dispose(), [texture]);
  usePassengerNameScale(sprite, cell.aspect);
  return <sprite ref={sprite} name="nakama-name-label" userData={{ label: name }} position={position}
    scale={[cell.aspect * .11, .11, 1]} renderOrder={20} {...handlers}>
    <spriteMaterial map={texture} transparent alphaTest={.12} depthWrite={false} fog={false} toneMapped={false} />
  </sprite>;
}
