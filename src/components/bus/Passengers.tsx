"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { PassengerProfile } from "@/types/passenger";
import { NAKAMA_ROSTER, type NakamaArchetype } from "./passenger-archetypes";
import { HairStyle, Accessory, NakamaProp } from "./PassengerAppearance";
import type { SeatInfo } from "@/lib/bus-layout";

/** Hauteur visuelle du sommet de chaque passager assis, accessoires compris. */
function getPassengerLabelY(archetype: NakamaArchetype): number {
  const hairTop = {
    spiky: 2.04,
    crop: 1.98,
    flowing: 1.98,
    swoop: 1.98,
    afro: 2.14,
    pompadour: 2.13,
    topknot: 2.08,
    wavy: 1.98,
    shaggy: 1.98,
  }[archetype.hairStyle];

  const accessoryTops: Partial<Record<NonNullable<NakamaArchetype["accessory"]>, number>> = {
    straw_hat: 2.09,
    reindeer_hat: 2.19,
    top_hat: 2.27,
    white_cap: 2.01,
    cowboy_hat: 2.11,
    horns: 2.07,
  };
  const accessoryTop = accessoryTops[archetype.accessory ?? "none"];

  // Le centre du sprite tient compte de sa demi-hauteur (0,055 pour une hauteur de 0,11)
  // et garde environ 0,05 d'air au-dessus des cheveux ou du chapeau.
  return Math.max(hairTop, accessoryTop ?? 0) + 0.105;
}

const ARCHETYPE_MATS_CACHE = new Map<string, Record<string, THREE.Material>>();

function getArchetypeMaterials(archetype: NakamaArchetype): Record<string, THREE.Material> {
  const existing = ARCHETYPE_MATS_CACHE.get(archetype.id);
  if (existing) return existing;

  const mats: Record<string, THREE.Material> = {
    skin: new THREE.MeshStandardMaterial({
      color: archetype.skinColor,
      roughness: 0.6,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: archetype.hairColor,
      roughness: 0.7,
    }),
    shirt: new THREE.MeshStandardMaterial({
      color: archetype.shirtColor,
      roughness: 0.55,
    }),
    pants: new THREE.MeshStandardMaterial({
      color: archetype.pantsColor,
      roughness: 0.65,
    }),
    shoes: new THREE.MeshStandardMaterial({
      color: "#18181c",
      roughness: 0.85,
    }),
    accessory: new THREE.MeshStandardMaterial({
      color: archetype.accessoryColor ?? "#ffd23f",
      roughness: 0.4,
    }),
    accessorySub: new THREE.MeshStandardMaterial({
      color: archetype.accessorySubColor ?? "#dc1824",
      roughness: 0.4,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: "#ffd23f",
      metalness: 0.85,
      roughness: 0.25,
    }),
    eyes: new THREE.MeshBasicMaterial({
      color: "#111113",
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    teeth: new THREE.MeshBasicMaterial({
      color: "#ffffff",
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    faceDark: new THREE.MeshBasicMaterial({
      color: "#1c1917",
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    dark: new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8, roughness: 0.2 }),
    red: new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.5 }),
  };

  ARCHETYPE_MATS_CACHE.set(archetype.id, mats);
  return mats;
}

interface PassengersProps {
  passengerCount: number;
  numRows: number;
  renderedRowIndices?: number[];
  vacantSeatRanges?: Array<[number, number, number]>;
  hornPulse: number;
  reservedRow?: number;
  passengerProfiles?: PassengerProfile[];
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  activePassengerIndex?: number | null;
}

function Passengers({
  passengerCount,
  numRows,
  renderedRowIndices,
  vacantSeatRanges = [],
  hornPulse,
  reservedRow = 3,
  passengerProfiles = [],
  onPassengerSelect,
  activePassengerIndex = null,
}: PassengersProps) {
  const capacity = numRows * 4;
  const vacantRanges = useMemo(() => {
    return vacantSeatRanges
      .map(([start, end, before]) => ({
        start: Math.max(0, start),
        end: Math.min(capacity - 1, end),
        before,
      }))
      .filter(({ start, end }) => start <= end)
      .sort((left, right) => left.start - right.start);
  }, [capacity, vacantSeatRanges]);
  const vacantCount = vacantRanges.reduce((total, range) => total + range.end - range.start + 1, 0);
  const occupiedCount = Math.min(Math.max(0, passengerCount), capacity - vacantCount);
  const vacantCountThrough = useCallback((seatIndex: number) => {
    let low = 0;
    let high = vacantRanges.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (vacantRanges[middle].start <= seatIndex) low = middle + 1;
      else high = middle;
    }
    if (low === 0) return 0;
    const range = vacantRanges[low - 1];
    return range.before + Math.min(range.end, seatIndex) - range.start + 1;
  }, [vacantRanges]);
  const seatIndexForOccupiedRank = useCallback((rank: number) => {
    let low = Math.max(0, rank);
    let high = Math.max(low, capacity - 1);
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const occupiedThrough = middle + 1 - vacantCountThrough(middle);
      if (occupiedThrough > rank) high = middle;
      else low = middle + 1;
    }
    return low;
  }, [capacity, vacantCountThrough]);
  const seatAt = (index: number): SeatInfo => {
    const row = Math.floor(index / 4);
    return {
      x: [-0.94, -0.5, 0.5, 0.94][index % 4],
      z: -2.6 + row * 1.2,
      row,
      seatInRow: index % 4,
    };
  };
  const renderedRows = useMemo(
    () => new Set(renderedRowIndices ?? Array.from({ length: numRows }, (_, row) => row)),
    [numRows, renderedRowIndices],
  );
  const detailed = useMemo(() => {
    if (occupiedCount <= 24) {
      return Array.from({ length: occupiedCount }, (_, rank) => seatIndexForOccupiedRank(rank))
        .filter((index) => renderedRows.has(Math.floor(index / 4)))
        .map((index) => ({ seat: seatAt(index), index }));
    }
    const focusRow = Math.max(0, Math.min(numRows - 1, reservedRow));
    const focusSeat = focusRow * 4;
    const rankNearFocus = Math.max(0, Math.min(occupiedCount - 1, focusSeat - vacantCountThrough(focusSeat)));
    const ranks = new Set<number>();
    if (activePassengerIndex !== null && activePassengerIndex >= 0 && activePassengerIndex < capacity) {
      ranks.add(activePassengerIndex - vacantCountThrough(activePassengerIndex));
    }
    for (let distance = 0; ranks.size < 24; distance++) {
      const candidates = distance === 0
        ? [rankNearFocus]
        : [rankNearFocus - distance, rankNearFocus + distance];
      for (const rank of candidates) {
        if (rank >= 0 && rank < occupiedCount) ranks.add(rank);
      }
    }
    return Array.from(ranks, (rank) => {
      const index = seatIndexForOccupiedRank(rank);
      return { seat: seatAt(index), index };
    }).filter(({ index }) =>
      index === activePassengerIndex || renderedRows.has(Math.floor(index / 4)));
  }, [activePassengerIndex, capacity, numRows, occupiedCount, renderedRows, reservedRow, seatIndexForOccupiedRank, vacantCountThrough]);
  const simplified = useMemo(() => {
    const detailedIndices = new Set(detailed.map(({ index }) => index));
    if (occupiedCount - detailed.length <= 160) {
      const remaining: Array<{ seat: SeatInfo; index: number }> = [];
      for (let rank = 0; rank < occupiedCount; rank++) {
        const index = seatIndexForOccupiedRank(rank);
        if (!detailedIndices.has(index) && renderedRows.has(Math.floor(index / 4))) {
          remaining.push({ seat: seatAt(index), index });
        }
      }
      return remaining;
    }
    const candidates: number[] = [];
    for (const row of renderedRows) {
      for (let seat = 0; seat < 4; seat++) {
        const index = row * 4 + seat;
        if (index >= capacity || detailedIndices.has(index)) continue;
        const vacantBefore = index === 0 ? 0 : vacantCountThrough(index - 1);
        if (vacantCountThrough(index) === vacantBefore) candidates.push(index);
      }
    }
    if (candidates.length <= 160) return candidates.map((index) => ({ seat: seatAt(index), index }));
    const sampled = new Set<number>();
    for (let sample = 0; sample < 160; sample++) {
      sampled.add(candidates[Math.floor((sample * (candidates.length - 1)) / 159)]);
    }
    return Array.from(sampled, (index) => ({ seat: seatAt(index), index }));
  }, [capacity, detailed, occupiedCount, renderedRows, seatIndexForOccupiedRank, vacantCountThrough]);
  const profilesBySeatIndex = useMemo(
    () => new Map(passengerProfiles.map((profile) => [profile.seatIndex, profile])),
    [passengerProfiles],
  );

  return (
    <group>
      <SimplifiedPassengers passengers={simplified} />
      {detailed.map(({ seat, index }) => {
        const archetype = NAKAMA_ROSTER[index % NAKAMA_ROSTER.length];
        const isCurrentPassenger = activePassengerIndex === index && reservedRow >= 0;
        const displayedSeat = isCurrentPassenger
          ? { x: 0.72, z: -2.6 + reservedRow * 1.2 + 0.15, row: reservedRow, seatInRow: 3 }
          : seat;
        return (
          <Passenger
            key={`p-${index}-${archetype.id}`}
            seat={displayedSeat}
            index={index}
            archetype={archetype}
            hornPulse={hornPulse}
            profile={profilesBySeatIndex.get(index)}
            onSelect={onPassengerSelect}
            firstPerson={isCurrentPassenger}
          />
        );
      })}
    </group>
  );
}

function SimplifiedPassengers({ passengers }: { passengers: Array<{ seat: SeatInfo; index: number }> }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    passengers.forEach(({ seat }, index) => {
      matrix.makeTranslation(seat.x, 1.35, seat.z + 0.12);
      bodies.current?.setMatrixAt(index, matrix);
      matrix.makeTranslation(seat.x, 1.82, seat.z + 0.14);
      heads.current?.setMatrixAt(index, matrix);
    });
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
  }, [passengers]);
  if (passengers.length === 0) return null;
  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, passengers.length]}>
        <capsuleGeometry args={[0.16, 0.35, 4, 8]} />
        <meshStandardMaterial color="#314ba5" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, passengers.length]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial color="#d9a27e" roughness={0.7} />
      </instancedMesh>
    </>
  );
}

function Passenger({
  seat,
  index,
  archetype,
  hornPulse,
  profile,
  onSelect,
  firstPerson = false,
}: {
  seat: SeatInfo;
  index: number;
  archetype: NakamaArchetype;
  hornPulse: number;
  profile?: PassengerProfile;
  onSelect?: (passenger: PassengerProfile) => void;
  firstPerson?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const torsoGroup = useRef<THREE.Group>(null);

  // Matériaux partagés et mis en cache par archetype
  const mats = useMemo(() => getArchetypeMaterials(archetype), [archetype]);
  const nameTexture = useMemo(
    () => profile ? makePassengerNameTexture(profile.displayName) : null,
    [profile],
  );
  const labelY = useMemo(() => getPassengerLabelY(archetype), [archetype]);

  useEffect(() => () => nameTexture?.texture.dispose(), [nameTexture]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const seed = index * 0.73;

    // Réaction au klaxon : bond de joie synchronisé
    const sinceHorn = (performance.now() - hornPulse) / 1000;
    const isHonking = sinceHorn < 0.85;
    const cheerBounce = isHonking ? Math.sin(sinceHorn * 24) * (0.85 - sinceHorn) * 0.14 : 0;
    const cheerLean = isHonking ? Math.sin(sinceHorn * 16) * 0.12 : 0;

    if (group.current) {
      group.current.position.y = cheerBounce;
    }

    // Balancement naturel de la tête (respiration & regard par la fenêtre ou voisin)
    if (headGroup.current) {
      const bob = Math.sin(t * 3.2 + seed) * 0.025;
      const sway = Math.sin(t * 1.1 + seed * 1.5) * 0.07;
      headGroup.current.rotation.x = bob + (isHonking ? -0.15 : 0);
      headGroup.current.rotation.y = sway + (seat.x < 0 ? -0.05 : 0.05) + cheerLean;
    }

    // Mouvement subtil de respiration du torse
    if (torsoGroup.current) {
      const breath = 1 + Math.sin(t * 2.2 + seed) * 0.015;
      torsoGroup.current.scale.set(breath, 1, breath);
    }
  });

  return (
    <group
      ref={group}
      position={[seat.x, 0, seat.z]}
      onClick={
        profile
          ? (event: { stopPropagation: () => void }) => {
              event.stopPropagation();
              onSelect?.(profile);
            }
          : undefined
      }
    >
      {!firstPerson && profile && nameTexture && (
        <sprite
          position={[0, labelY, 0.14]}
          scale={[nameTexture.aspect * 0.11, 0.11, 1]}
          renderOrder={20}
          onClick={(event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            onSelect?.(profile);
          }}
          onPointerOver={(event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <spriteMaterial
            map={nameTexture.texture}
            transparent
            alphaTest={0.08}
            depthTest
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </sprite>
      )}
      {/* ---------- JAMBES ASSISES & PIEDS ---------- */}
      {/* Bassin posé sur le coussin du siège */}
      <mesh material={mats.pants} position={[0, 1.15, 0.12]}>
        <boxGeometry args={[0.34, 0.14, 0.28]} />
      </mesh>

      {/* Cuisses horizontales allant vers l'avant */}
      {[-0.09, 0.09].map((lx) => (
        <mesh key={lx} material={mats.pants} position={[lx, 1.15, -0.06]}>
          <boxGeometry args={[0.13, 0.12, 0.32]} />
        </mesh>
      ))}

      {/* Mollets verticaux descendant vers le sol */}
      {[-0.09, 0.09].map((lx) => (
        <mesh key={lx} material={mats.pants} position={[lx, 0.88, -0.21]}>
          <boxGeometry args={[0.12, 0.42, 0.12]} />
        </mesh>
      ))}

      {/* Chaussures posées au sol */}
      {[-0.09, 0.09].map((lx) => (
        <mesh key={lx} material={mats.shoes} position={[lx, 0.65, -0.24]}>
          <boxGeometry args={[0.13, 0.08, 0.2]} />
        </mesh>
      ))}

      {/* ---------- TORSE & BRAS ---------- */}
      <group ref={torsoGroup} position={[0, 1.42, 0.14]}>
        {/* Buste adossé au dossier */}
        <mesh material={mats.shirt} rotation={[-0.05, 0, 0]}>
          <boxGeometry args={[0.34, 0.4, 0.22]} />
        </mesh>

        {/* Détail torse Luffy : croix cicatrice ou torse ouvert */}
        {archetype.id === "luffy" && (
          <mesh position={[0, 0.02, -0.122]} renderOrder={2}>
            <planeGeometry args={[0.12, 0.24]} />
            <meshStandardMaterial
              color={archetype.skinColor}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        )}

        {/* Épaules & bras */}
        {[-0.2, 0.2].map((ax, ai) => (
          <group key={ai} position={[ax, 0.14, 0]}>
            {/* Bras supérieur */}
            <mesh
              material={mats.shirt}
              position={[0, -0.1, 0]}
              rotation={[0.25, 0, ai === 0 ? -0.15 : 0.15]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.24, 8]} />
            </mesh>
            {/* Avant-bras reposant sur les genoux */}
            <mesh
              material={mats.skin}
              position={[0, -0.22, -0.12]}
              rotation={[-0.8, 0, 0]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.24, 8]} />
            </mesh>
          </group>
        ))}
      </group>

      {!firstPerson && <>
        {/* Cou */}
        <mesh material={mats.skin} position={[0, 1.66, 0.14]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        </mesh>

        {/* ---------- TÊTE & VISAGE ANIMÉ ---------- */}
        <group ref={headGroup} position={[0, 1.82, 0.14]}>
        {/* Tête */}
        <mesh material={mats.skin}>
          <boxGeometry args={[0.22, 0.24, 0.2]} />
        </mesh>

        {/* Yeux stylisés animés */}
        {[-0.055, 0.055].map((ex) => (
          <mesh key={ex} material={mats.eyes} position={[ex, 0.02, -0.112]}>
            <boxGeometry args={[0.035, 0.035, 0.01]} />
          </mesh>
        ))}

        {/* Expressions du visage */}
        {archetype.expression === "grin" ? (
          // Grand sourire éclatant avec dents (Luffy, Franky, Ace)
          <mesh material={mats.teeth} position={[0, -0.05, -0.112]}>
            <boxGeometry args={[0.11, 0.035, 0.01]} />
          </mesh>
        ) : archetype.expression === "smile" ? (
          // Sourire bienveillant (Nami, Robin, Chopper)
          <mesh material={mats.faceDark} position={[0, -0.05, -0.112]}>
            <boxGeometry args={[0.08, 0.015, 0.01]} />
          </mesh>
        ) : archetype.expression === "funny" ? (
          // Expression drôle (Usopp, Buggy)
          <mesh material={mats.faceDark} position={[0, -0.05, -0.112]}>
            <boxGeometry args={[0.09, 0.03, 0.01]} />
          </mesh>
        ) : null}

        {/* Nez long d'Usopp */}
        {archetype.id === "usopp" && (
          <mesh material={mats.skin} position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.16, 8]} />
          </mesh>
        )}

        {/* Nez rouge de Buggy */}
        {archetype.accessory === "clown_nose" && (
          <mesh material={mats.red} position={[0, 0, -0.12]}>
            <sphereGeometry args={[0.045, 12, 12]} />
          </mesh>
        )}

        {/* ---------- CHEVEUX SELON ARCHETYPE ---------- */}
        <HairStyle style={archetype.hairStyle} mats={mats} />

        {/* ---------- ACCESSOIRES DISTINCTIFS ---------- */}
        <Accessory archetype={archetype} mats={mats} />
        </group>
      </>}

      {/* ---------- PROPS & OBJETS TENUS ---------- */}
      <NakamaProp prop={archetype.prop} mats={mats} />
    </group>
  );
}

function makePassengerNameTexture(displayName: string) {
  const font = "900 64px ui-sans-serif, system-ui, sans-serif";
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d")!;
  measureContext.font = font;
  const measuredWidth = Math.ceil(measureContext.measureText(displayName).width + 48);
  const width = Math.min(1024, Math.max(256, THREE.MathUtils.ceilPowerOfTwo(measuredWidth)));
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;

  context.clearRect(0, 0, width, height);
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(2, 6, 23, 0.96)";
  context.lineWidth = 12;
  context.strokeText(displayName, width / 2, height / 2 + 2, width - 36);
  context.fillStyle = "#ffffff";
  context.fillText(displayName, width / 2, height / 2 + 2, width - 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  return { texture, aspect: width / height };
}

export default memo(Passengers);
