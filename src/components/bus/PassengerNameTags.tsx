"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { fetchJson } from "@/lib/client/bus-api";
import type { BusOccupant } from "@/lib/bus-occupancy";
import type { PassengerProfile } from "@/types/passenger";

type NameEntry = Pick<PassengerProfile, "seatIndex" | "avatarId"> & { displayName: string | null };
const EMPTY_NAMES = new Map<number, NameEntry | null>();
const NAME_PAGE_SIZE = 80;
const NAME_HEIGHT = 128;
const MAX_NAME_WIDTH = 1024;
const MAX_NAME_CACHE_SIZE = 256;
const FONT = "900 64px ui-sans-serif, system-ui, sans-serif";
type CachedNameTexture = { texture: THREE.CanvasTexture; aspect: number; refs: number };
const PASSENGER_NAME_TEXTURE_CACHE = new Map<string, CachedNameTexture>();
let passengerNameMeasureContext: CanvasRenderingContext2D | null = null;

function evictUnusedPassengerNameTextures(maxSize = MAX_NAME_CACHE_SIZE, protectedKey?: string) {
  if (PASSENGER_NAME_TEXTURE_CACHE.size <= maxSize) return;
  for (const [key, entry] of PASSENGER_NAME_TEXTURE_CACHE) {
    if (PASSENGER_NAME_TEXTURE_CACHE.size <= maxSize) break;
    if (key === protectedKey || entry.refs > 0) continue;
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
  const [result, setResult] = useState<{ revision: number; names: ReadonlyMap<number, NameEntry | null> }>();
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
        for (const summary of response.value.names) memory.names.set(summary.seatIndex, summary);
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
  const measuredWidth = Math.ceil(measureContext.measureText(displayName).width + 48);
  const width = Math.min(MAX_NAME_WIDTH, Math.max(192, Math.ceil(measuredWidth / 16) * 16));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = NAME_HEIGHT;
  const context = canvas.getContext("2d")!;

  context.clearRect(0, 0, width, NAME_HEIGHT);
  context.font = FONT;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(2, 6, 23, 0.96)";
  context.lineWidth = 12;
  context.strokeText(displayName, width / 2, NAME_HEIGHT / 2 + 2, width - 36);
  context.fillStyle = "#ffffff";
  context.fillText(displayName, width / 2, NAME_HEIGHT / 2 + 2, width - 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  const entry = { texture, aspect: width / NAME_HEIGHT, refs: 0 };
  PASSENGER_NAME_TEXTURE_CACHE.set(displayName, entry);
  evictUnusedPassengerNameTextures(MAX_NAME_CACHE_SIZE, displayName);
  return entry;
}

function nameTagSize(aspect: number): [number, number] {
  return [Math.min(0.4, aspect * 0.11), Math.min(0.11, 0.4 / aspect)];
}

export type PassengerNameTag = { index: number; name: string; x: number; y: number; z: number };

export function DistantPassengerNames({
  labels,
  profilesBySeatIndex,
  onSelect,
}: {
  labels: PassengerNameTag[];
  profilesBySeatIndex?: ReadonlyMap<number, PassengerProfile>;
  onSelect?: (passenger: PassengerProfile) => void;
}) {
  const hoveredIndex = useRef<number | null>(null);

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

  useEffect(() => {
    if (hoveredIndex.current !== null && !labels.some(label => label.index === hoveredIndex.current)) {
      hoveredIndex.current = null;
      document.body.style.cursor = "auto";
    }
  }, [labels]);

  if (!labels.length) return null;

  return (
    <group name="bus-distant-name-labels" userData={{ labels }}>
      {labels.map((label) => (
        <PassengerNameTag
          key={label.index}
          name={label.name}
          position={[label.x, label.y, label.z]}
          onClick={onSelect ? (event) => {
            event.stopPropagation();
            onSelect(profilesBySeatIndex?.get(label.index) ?? {
              seatIndex: label.index,
              displayName: label.name,
              comment: null,
            });
          } : undefined}
          onPointerOver={onSelect ? (event) => {
            event.stopPropagation();
            hoveredIndex.current = label.index;
            document.body.style.cursor = "pointer";
          } : undefined}
          onPointerOut={onSelect ? () => {
            if (hoveredIndex.current === label.index) {
              hoveredIndex.current = null;
              document.body.style.cursor = "auto";
            }
          } : undefined}
        />
      ))}
    </group>
  );
}

type TagProps = { name: string; position: [number, number, number] }
  & Pick<ThreeElements["sprite"], "onClick" | "onPointerOver" | "onPointerOut">;

export function PassengerNameTag({ name, position, ...handlers }: TagProps) {
  const { texture, aspect } = useMemo(() => makePassengerNameTexture(name), [name]);
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
      renderOrder={20}
      {...handlers}
    >
      <spriteMaterial
        map={texture}
        transparent
        alphaTest={0.08}
        depthTest
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </sprite>
  );
}
