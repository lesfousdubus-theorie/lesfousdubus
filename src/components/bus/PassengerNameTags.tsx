"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { fetchJson } from "@/lib/client/bus-api";
import type { BusOccupant } from "@/lib/bus-occupancy";
import type { PassengerProfile } from "@/types/passenger";

type NameEntry = Pick<PassengerProfile, "seatIndex" | "avatarId"> & { displayName: string | null };
const EMPTY_NAMES = new Map<number, NameEntry | null>();
const NAME_PAGE_SIZE = 80;
const NAME_HEIGHT = 64;
const MAX_NAME_WIDTH = 512;
const MAX_NAME_CACHE_SIZE = 1024;
const FONT = "800 34px ui-sans-serif, system-ui, sans-serif";

function nextPow2Width(value: number) {
  if (value <= 128) return 128;
  if (value <= 256) return 256;
  return MAX_NAME_WIDTH;
}
type CachedNameTexture = { texture: THREE.CanvasTexture; material: THREE.SpriteMaterial; aspect: number; refs: number };
const PASSENGER_NAME_TEXTURE_CACHE = new Map<string, CachedNameTexture>();
let passengerNameMeasureContext: CanvasRenderingContext2D | null = null;

function evictUnusedPassengerNameTextures(maxSize = MAX_NAME_CACHE_SIZE, protectedKey?: string) {
  if (PASSENGER_NAME_TEXTURE_CACHE.size <= maxSize) return;
  for (const [key, entry] of PASSENGER_NAME_TEXTURE_CACHE) {
    if (PASSENGER_NAME_TEXTURE_CACHE.size <= maxSize) break;
    if (key === protectedKey || entry.refs > 0) continue;
    entry.material.dispose();
    entry.texture.dispose();
    PASSENGER_NAME_TEXTURE_CACHE.delete(key);
  }
}

export function retainPassengerNameTexture(displayName: string) {
  const entry = PASSENGER_NAME_TEXTURE_CACHE.get(displayName);
  if (!entry) return;
  entry.refs += 1;
  PASSENGER_NAME_TEXTURE_CACHE.delete(displayName);
  PASSENGER_NAME_TEXTURE_CACHE.set(displayName, entry);
}

export function releasePassengerNameTexture(displayName: string) {
  const entry = PASSENGER_NAME_TEXTURE_CACHE.get(displayName);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs === 0) evictUnusedPassengerNameTextures(MAX_NAME_CACHE_SIZE);
}

export function getVisiblePassengerName(value: string | null | undefined) {
  const name = value?.trim();
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return lower !== "anonyme" && lower !== "passager" ? name : undefined;
}

/** Charger le pseudo et le personnage des places rendues, hors des profils détaillés. */
export function useVisiblePassengerSummaries(passengers: BusOccupant[], revision: number) {
  const key = passengers.filter(person => person.passengerKind === "visitor")
    .map(person => person.index).sort((a, b) => a - b).join(",");
  const cache = useRef({ revision, names: new Map<number, NameEntry | null>() });
  const inFlightRef = useRef<{ revision: number; seats: Set<number> }>({ revision, seats: new Set() });
  const controllerRef = useRef<{ revision: number; controller: AbortController } | null>(null);
  const [result, setResult] = useState<{ revision: number; names: ReadonlyMap<number, NameEntry | null> }>();

  useEffect(() => {
    const ctrl = new AbortController();
    controllerRef.current = { revision, controller: ctrl };
    inFlightRef.current = { revision, seats: new Set() };
    return () => {
      ctrl.abort();
      if (controllerRef.current?.controller === ctrl) controllerRef.current = null;
    };
  }, [revision]);

  useEffect(() => {
    if (!key) return;
    if (cache.current.revision !== revision) cache.current = { revision, names: new Map() };
    const memory = cache.current;
    const inFlight = inFlightRef.current.seats;
    const ids = key.split(",").map(Number).filter(seat => !memory.names.has(seat) && !inFlight.has(seat));
    if (!ids.length) return;
    let retry: number | undefined;
    const load = async (remaining: number[], canRetry: boolean) => {
      const ctrl = controllerRef.current?.revision === revision ? controllerRef.current.controller : null;
      if (!ctrl || ctrl.signal.aborted) return;
      const toFetch = remaining.filter(seat => !memory.names.has(seat) && !inFlight.has(seat));
      if (!toFetch.length) return;
      for (const seat of toFetch) inFlight.add(seat);
      const slices = Array.from({ length: Math.ceil(toFetch.length / NAME_PAGE_SIZE) }, (_, index) =>
        toFetch.slice(index * NAME_PAGE_SIZE, (index + 1) * NAME_PAGE_SIZE));
      const results = await Promise.allSettled(slices.map(seats => fetchJson<{ names: NameEntry[] }>(
        `/api/bus-entries?names=1&seats=${seats.join(",")}&rev=${revision}`, { signal: ctrl.signal },
      )));
      for (const seat of toFetch) inFlight.delete(seat);
      if (ctrl.signal.aborted) return;
      const failed: number[] = [];
      results.forEach((response, index) => {
        if (response.status === "rejected") {
          failed.push(...slices[index]);
          return;
        }
        for (const seat of slices[index]) memory.names.set(seat, null);
        for (const summary of response.value.names) memory.names.set(summary.seatIndex, summary);
      });
      setResult({ revision, names: new Map(memory.names) });
      if (canRetry && failed.length) retry = window.setTimeout(() => void load(failed, false), 1400);
    };
    const debounce = window.setTimeout(() => void load(ids, true), 220);
    return () => {
      window.clearTimeout(debounce);
      if (retry !== undefined) window.clearTimeout(retry);
    };
  }, [key, revision]);
  return result?.revision === revision ? result.names : EMPTY_NAMES;
}

function makePassengerNameTexture(displayName: string) {
  const cached = PASSENGER_NAME_TEXTURE_CACHE.get(displayName);
  if (cached) {
    PASSENGER_NAME_TEXTURE_CACHE.delete(displayName);
    PASSENGER_NAME_TEXTURE_CACHE.set(displayName, cached);
    return cached;
  }

  if (!passengerNameMeasureContext) {
    passengerNameMeasureContext = document.createElement("canvas").getContext("2d");
  }
  const measureContext = passengerNameMeasureContext!;
  measureContext.font = FONT;
  const measuredWidth = Math.ceil(measureContext.measureText(displayName).width + 28);
  const contentWidth = Math.min(MAX_NAME_WIDTH, Math.max(96, measuredWidth));
  const width = nextPow2Width(contentWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = NAME_HEIGHT;
  const context = canvas.getContext("2d")!;

  context.clearRect(0, 0, width, NAME_HEIGHT);
  context.font = FONT;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(2, 6, 23, 0.94)";
  context.lineWidth = 7;
  context.strokeText(displayName, width / 2, NAME_HEIGHT / 2 + 1, contentWidth - 16);
  context.fillStyle = "#ffffff";
  context.fillText(displayName, width / 2, NAME_HEIGHT / 2 + 1, contentWidth - 16);

  // Dimensions puissances de deux (128/256/512 × 64) + recadrage UV exact + mipmaps trilinéaires :
  // supprime complètement le scintillement / tremblement et la pixellisation des noms à moyenne distance.
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.repeat.set(contentWidth / width, 1);
  texture.offset.set((width - contentWidth) / (2 * width), 0);

  // Mettre en cache le SpriteMaterial avec sa texture pour éviter toute allocation/destruction
  // de matériau WebGL lors des déplacements rapides de la caméra.
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    depthTest: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });

  const entry = { texture, material, aspect: contentWidth / NAME_HEIGHT, refs: 0 };
  PASSENGER_NAME_TEXTURE_CACHE.set(displayName, entry);
  evictUnusedPassengerNameTextures(MAX_NAME_CACHE_SIZE, displayName);
  return entry;
}

function nameTagSize(aspect: number): [number, number] {
  return [Math.min(0.52, aspect * 0.11), Math.min(0.11, 0.52 / aspect)];
}

export type PassengerNameTag = { index: number; name: string; x: number; y: number; z: number };

const ATLAS_W = 2048;
const ATLAS_H = 2048;
const ATLAS_COLS = 4;
const ATLAS_ROWS = 40;
const ATLAS_CAPACITY = ATLAS_COLS * ATLAS_ROWS;
const ATLAS_SLOT_W = 512;
const ATLAS_SLOT_H = 50;
const ATLAS_PAD_Y = 4;
const ATLAS_CONTENT_H = ATLAS_SLOT_H - ATLAS_PAD_Y * 2;
const ATLAS_FONT = "800 30px ui-sans-serif, system-ui, sans-serif";

const BILLBOARD_VERTEX_SHADER = `
attribute vec4 aUvRect;
attribute vec2 aSize;
varying vec2 vUv;
void main() {
  vec4 mvCenter = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mvCenter.xy += position.xy * aSize;
  gl_Position = projectionMatrix * mvCenter;
  vUv = aUvRect.xy + uv * aUvRect.zw;
}
`;

const BILLBOARD_FRAGMENT_SHADER = `
uniform sampler2D uAtlas;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  if (tex.a < 0.01) discard;
  gl_FragColor = tex;
}
`;

interface AtlasSlot {
  slot: number;
  u0: number;
  v0: number;
  uSpan: number;
  vSpan: number;
  aspect: number;
  lastEpoch: number;
}

interface ActiveAtlasItem {
  label: PassengerNameTag;
  w: number;
  h: number;
}

function drawNameIntoAtlasSlot(
  canvas: HTMLCanvasElement,
  slotIndex: number,
  name: string,
  epoch: number,
): AtlasSlot {
  const col = slotIndex % ATLAS_COLS;
  const row = Math.floor(slotIndex / ATLAS_COLS);
  const sx = col * ATLAS_SLOT_W;
  const sy = row * ATLAS_SLOT_H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(sx, sy, ATLAS_SLOT_W, ATLAS_SLOT_H);
  ctx.font = ATLAS_FONT;
  const measured = Math.ceil(ctx.measureText(name).width + 24);
  const contentWidth = Math.min(ATLAS_SLOT_W - 12, Math.max(88, measured));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(2, 6, 23, 0.94)";
  ctx.lineWidth = 6.5;
  ctx.strokeText(name, sx + ATLAS_SLOT_W / 2, sy + ATLAS_SLOT_H / 2 + 1, contentWidth - 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, sx + ATLAS_SLOT_W / 2, sy + ATLAS_SLOT_H / 2 + 1, contentWidth - 12);

  const u0 = (sx + (ATLAS_SLOT_W - contentWidth) * 0.5) / ATLAS_W;
  const uSpan = contentWidth / ATLAS_W;
  const vTop = 1 - (sy + ATLAS_PAD_Y) / ATLAS_H;
  const vBot = 1 - (sy + ATLAS_SLOT_H - ATLAS_PAD_Y) / ATLAS_H;
  return {
    slot: slotIndex,
    u0,
    v0: vBot,
    uSpan,
    vSpan: vTop - vBot,
    aspect: contentWidth / ATLAS_CONTENT_H,
    lastEpoch: epoch,
  };
}

function markTextureDirty(texture: THREE.CanvasTexture) {
  texture.needsUpdate = true;
}

function writeAtlasInstance(
  uvAttr: THREE.InstancedBufferAttribute,
  sizeAttr: THREE.InstancedBufferAttribute,
  index: number,
  entry: AtlasSlot,
  w: number,
  h: number,
) {
  uvAttr.setXYZW(index, entry.u0, entry.v0, entry.uSpan, entry.vSpan);
  sizeAttr.setXY(index, w, h);
}

function uploadAtlasAttributes(
  mesh: THREE.InstancedMesh,
  uvAttr: THREE.InstancedBufferAttribute,
  sizeAttr: THREE.InstancedBufferAttribute,
  out: number,
) {
  mesh.count = out;
  mesh.visible = out > 0;
  if (out > 0) {
    mesh.instanceMatrix.clearUpdateRanges();
    mesh.instanceMatrix.addUpdateRange(0, out * 16);
    mesh.instanceMatrix.needsUpdate = true;
    uvAttr.clearUpdateRanges();
    uvAttr.addUpdateRange(0, out * 4);
    uvAttr.needsUpdate = true;
    sizeAttr.clearUpdateRanges();
    sizeAttr.addUpdateRange(0, out * 2);
    sizeAttr.needsUpdate = true;
  }
}

export const DistantPassengerNames = memo(function DistantPassengerNames({
  labels,
  profilesBySeatIndex,
  onSelect,
}: {
  labels: PassengerNameTag[];
  profilesBySeatIndex?: ReadonlyMap<number, PassengerProfile>;
  onSelect?: (passenger: PassengerProfile) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoveredIndex = useRef<number | null>(null);
  const labelsRef = useRef(labels);
  const labelsVersionRef = useRef(0);
  const appliedVersionRef = useRef(-1);
  const hasPendingRef = useRef(true);
  const nextWarmAtRef = useRef(0);
  const activeItemsRef = useRef<ActiveAtlasItem[]>([]);
  const atlasRuntimeRef = useRef<{
    freeSlots: number[];
    nameToSlot: Map<string, AtlasSlot>;
    matrix: THREE.Matrix4;
    epoch: number;
  } | null>(null);

  const atlas = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_W;
    canvas.height = ATLAS_H;

    const texture = new THREE.CanvasTexture(canvas);
    // Valeurs sRGB directes sans double gamma (toneMapped=false dans le fragment shader).
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;

    const geometry = new THREE.PlaneGeometry(1, 1);
    const uvRectArray = new Float32Array(ATLAS_CAPACITY * 4);
    const sizeArray = new Float32Array(ATLAS_CAPACITY * 2);
    const uvAttr = new THREE.InstancedBufferAttribute(uvRectArray, 4);
    const sizeAttr = new THREE.InstancedBufferAttribute(sizeArray, 2);
    geometry.setAttribute("aUvRect", uvAttr);
    geometry.setAttribute("aSize", sizeAttr);

    const material = new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: texture } },
      vertexShader: BILLBOARD_VERTEX_SHADER,
      fragmentShader: BILLBOARD_FRAGMENT_SHADER,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });

    return { canvas, texture, geometry, material, uvRectArray, sizeArray, uvAttr, sizeAttr };
  }, []);

  useEffect(() => () => {
    atlas.geometry.dispose();
    atlas.material.dispose();
    atlas.texture.dispose();
  }, [atlas]);

  useEffect(() => {
    labelsRef.current = labels;
    labelsVersionRef.current += 1;
    hasPendingRef.current = true;
    if (hoveredIndex.current !== null && !labels.some(label => label.index === hoveredIndex.current)) {
      hoveredIndex.current = null;
      document.body.style.cursor = "auto";
    }
  }, [labels]);

  useEffect(() => () => {
    if (hoveredIndex.current !== null) {
      hoveredIndex.current = null;
      document.body.style.cursor = "auto";
    }
  }, []);

  useEffect(() => {
    if (!onSelect && hoveredIndex.current !== null) {
      hoveredIndex.current = null;
      document.body.style.cursor = "auto";
    }
  }, [onSelect]);

  // Tous les noms visibles sont rendus en 1 seul draw call instancié + 1 seul atlas mipmappé 2048×2048.
  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (appliedVersionRef.current === labelsVersionRef.current && !hasPendingRef.current) return;

    const runtime = (atlasRuntimeRef.current ??= {
      freeSlots: Array.from({ length: ATLAS_CAPACITY }, (_, i) => ATLAS_CAPACITY - 1 - i),
      nameToSlot: new Map<string, AtlasSlot>(),
      matrix: new THREE.Matrix4(),
      epoch: 0,
    });

    const currentLabels = labelsRef.current;
    const limit = Math.min(currentLabels.length, ATLAS_CAPACITY);
    const versionChanged = appliedVersionRef.current !== labelsVersionRef.current;
    if (versionChanged) {
      runtime.epoch += 1;
      for (let i = 0; i < limit; i++) {
        const existing = runtime.nameToSlot.get(currentLabels[i].name);
        if (existing) existing.lastEpoch = runtime.epoch;
      }
    }

    const now = performance.now();
    let drewAny = false;
    let remainingMissing = 0;
    const canDrawMore = dt < 0.06 && now >= nextWarmAtRef.current;
    let drawnThisFrame = 0;
    const maxDrawsPerFrame = 32;

    for (let i = 0; i < limit; i++) {
      const name = currentLabels[i].name;
      if (runtime.nameToSlot.has(name)) continue;
      if (!canDrawMore || drawnThisFrame >= maxDrawsPerFrame) {
        remainingMissing += 1;
        continue;
      }
      let slotIndex = runtime.freeSlots.pop();
      if (slotIndex === undefined) {
        // Évincer le slot le plus ancien qui n'est pas utilisé dans la plage courante.
        let oldestKey: string | null = null;
        let oldestEpoch = Infinity;
        for (const [key, entry] of runtime.nameToSlot) {
          if (entry.lastEpoch < runtime.epoch && entry.lastEpoch < oldestEpoch) {
            oldestEpoch = entry.lastEpoch;
            oldestKey = key;
          }
        }
        if (oldestKey === null) {
          remainingMissing += 1;
          continue;
        }
        slotIndex = runtime.nameToSlot.get(oldestKey)!.slot;
        runtime.nameToSlot.delete(oldestKey);
      }

      runtime.nameToSlot.set(name, drawNameIntoAtlasSlot(atlas.canvas, slotIndex, name, runtime.epoch));
      drawnThisFrame += 1;
      drewAny = true;
    }

    if (drewAny) {
      markTextureDirty(atlas.texture);
      nextWarmAtRef.current = now + 24;
    }

    if (versionChanged || drewAny) {
      const items: ActiveAtlasItem[] = [];
      let out = 0;
      for (let i = 0; i < limit; i++) {
        const label = currentLabels[i];
        const entry = runtime.nameToSlot.get(label.name);
        if (!entry) continue;
        const [w, h] = nameTagSize(entry.aspect);
        runtime.matrix.makeTranslation(label.x, label.y, label.z);
        mesh.setMatrixAt(out, runtime.matrix);
        writeAtlasInstance(atlas.uvAttr, atlas.sizeAttr, out, entry, w, h);
        items.push({ label, w, h });
        out += 1;
      }
      activeItemsRef.current = items;
      uploadAtlasAttributes(mesh, atlas.uvAttr, atlas.sizeAttr, out);
    }

    appliedVersionRef.current = labelsVersionRef.current;
    hasPendingRef.current = remainingMissing > 0;
  });

  // Raycast billboard O(N) léger (actif uniquement hors glisser-déplacer caméra) pour garder clic et survol.
  const raycastScratch = useMemo(() => ({
    center: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    diff: new THREE.Vector3(),
    hit: new THREE.Vector3(),
  }), []);

  const customRaycast = useCallback((raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => {
    const mesh = meshRef.current;
    const items = activeItemsRef.current;
    const cam = raycaster.camera;
    if (!onSelect || !mesh || !mesh.visible || !items.length || !cam) return;
    const { center, right, up, normal, diff, hit } = raycastScratch;
    cam.matrixWorld.extractBasis(right, up, normal);
    const ray = raycaster.ray;
    const denom = normal.dot(ray.direction);
    if (Math.abs(denom) < 1e-6) return;
    for (let i = 0; i < items.length; i++) {
      const { label, w, h } = items[i];
      center.set(label.x, label.y, label.z).applyMatrix4(mesh.matrixWorld);
      const t = diff.subVectors(center, ray.origin).dot(normal) / denom;
      if (t < raycaster.near || t > raycaster.far) continue;
      hit.copy(ray.origin).addScaledVector(ray.direction, t);
      diff.subVectors(hit, center);
      if (Math.abs(diff.dot(right)) <= w * 0.5 && Math.abs(diff.dot(up)) <= h * 0.5) {
        intersects.push({
          distance: t,
          point: hit.clone(),
          object: mesh,
          instanceId: i,
        });
      }
    }
  }, [onSelect, raycastScratch]);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!onSelect || event.instanceId === undefined) return;
    const item = activeItemsRef.current[event.instanceId];
    if (!item) return;
    event.stopPropagation();
    onSelect(profilesBySeatIndex?.get(item.label.index) ?? {
      seatIndex: item.label.index,
      displayName: item.label.name,
      comment: null,
    });
  }, [onSelect, profilesBySeatIndex]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!onSelect || event.buttons !== 0 || event.instanceId === undefined) return;
    const item = activeItemsRef.current[event.instanceId];
    if (!item) return;
    event.stopPropagation();
    if (hoveredIndex.current !== item.label.index) {
      hoveredIndex.current = item.label.index;
      document.body.style.cursor = "pointer";
    }
  }, [onSelect]);

  const handlePointerOut = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!onSelect || event.buttons !== 0) return;
    if (hoveredIndex.current !== null) {
      hoveredIndex.current = null;
      document.body.style.cursor = "auto";
    }
  }, [onSelect]);

  return (
    <group name="bus-distant-name-labels" userData={{ labels }}>
      <instancedMesh
        ref={meshRef}
        name="nakama-name-labels-atlas"
        args={[atlas.geometry, atlas.material, ATLAS_CAPACITY]}
        count={0}
        visible={false}
        frustumCulled={false}
        renderOrder={20}
        dispose={null}
        raycast={customRaycast}
        onClick={onSelect ? handleClick : undefined}
        onPointerMove={onSelect ? handlePointerMove : undefined}
        onPointerOut={onSelect ? handlePointerOut : undefined}
      />
    </group>
  );
});

type TagProps = { name: string; position: [number, number, number] }
  & Pick<ThreeElements["sprite"], "onClick" | "onPointerOver" | "onPointerOut">;

export function PassengerNameTag({ name, position, ...handlers }: TagProps) {
  const { material, aspect } = useMemo(() => makePassengerNameTexture(name), [name]);
  useEffect(() => {
    retainPassengerNameTexture(name);
    return () => releasePassengerNameTexture(name);
  }, [name]);
  return (
    <sprite
      name="nakama-name-label"
      userData={{ label: name, textureAspect: aspect }}
      position={position}
      scale={[...nameTagSize(aspect), 1]}
      material={material}
      dispose={null}
      renderOrder={20}
      {...handlers}
    />
  );
}
