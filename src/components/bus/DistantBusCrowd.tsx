"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getSeatCountInRow, getSeatRowZ, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z } from "@/lib/bus-layout";
import { getRegisteredSeatIndex, PASSENGER_SEAT_X } from "@/lib/bus-occupancy";
import { getPartyDanceTime, PARTY_BEAT_SECONDS } from "@/lib/party-rhythm";
import { getNakamaArchetype } from "./passenger-archetypes";

interface DistantBusCrowdProps {
  numRows: number;
  passengerCount: number;
  seatCapacity: number;
  renderedRowIndices: number[];
  seatMaterial: THREE.Material;
  pillarMaterial: THREE.Material;
  partyOn?: boolean;
  reducedMotion?: boolean;
}

const ZERO_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
const CHUNK_ROWS = 512;

interface ChunkRange {
  chunkIdx: number;
  startRow: number;
  endRow: number;
  maxBenches: number;
  maxPeople: number;
  centerZ: number;
  radius: number;
}

interface CrowdChunkProps {
  range: ChunkRange;
  passengerCount: number;
  seatCapacity: number;
  renderedRowSet: Set<number>;
  seatMaterial: THREE.Material;
  pillarMaterial: THREE.Material;
  pillarGeo: THREE.BufferGeometry;
  benchGeo: THREE.BufferGeometry;
  torsoGeo: THREE.BufferGeometry;
  headGeo: THREE.BufferGeometry;
  torsoMat: THREE.Material;
  headMat: THREE.Material;
  onPeopleGroup: (chunkIdx: number, node: THREE.Group | null) => void;
}

const INTERIOR_SHADE = new THREE.Color("#2a3048");
const FACE_WARM_BEIGE = new THREE.Color("#e8c8a8");

const CrowdChunk = memo(function CrowdChunk({
  range,
  passengerCount,
  seatCapacity,
  renderedRowSet,
  seatMaterial,
  pillarMaterial,
  pillarGeo,
  benchGeo,
  torsoGeo,
  headGeo,
  torsoMat,
  headMat,
  onPeopleGroup,
}: CrowdChunkProps) {
  const pillarRef = useRef<THREE.InstancedMesh>(null);
  const benchRef = useRef<THREE.InstancedMesh>(null);
  const torsoRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const mapRef = useRef<{
    benchIdx: Int32Array;
    personStart: Int32Array;
    personLen: Uint8Array;
    hiddenRows: Set<number>;
  } | null>(null);

  const rowCount = range.endRow - range.startRow;

  // Construction unique pour ce tronçon (~640 m) avec sphère englobante exacte pour le frustum culling GPU.
  useLayoutEffect(() => {
    const pillarMesh = pillarRef.current;
    const benchMesh = benchRef.current;
    const torsoMesh = torsoRef.current;
    const headMesh = headRef.current;
    if (!pillarMesh || !benchMesh || !torsoMesh || !headMesh) return;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const occupiedLimit = Math.max(0, Math.min(passengerCount, seatCapacity));
    const benchIdx = new Int32Array(rowCount);
    const personStart = new Int32Array(rowCount);
    const personLen = new Uint8Array(rowCount);
    let benchCount = 0;
    let personCount = 0;

    for (let local = 0; local < rowCount; local++) {
      const row = range.startRow + local;
      const z = getSeatRowZ(row);
      const seatCount = getSeatCountInRow(row);

      // Piliers de vitres sombres légèrement à l'extérieur de la vitre (±1,305) pour délimiter nettement chaque fenêtre.
      matrix.makeTranslation(-1.305, 2.255, z - 0.05);
      pillarMesh.setMatrixAt(local * 2, matrix);
      matrix.makeTranslation(1.305, 2.255, z - 0.05);
      pillarMesh.setMatrixAt(local * 2 + 1, matrix);

      // Une seule banquette transversale par rangée (divise par 2 le nombre d'instances de sièges au loin)
      // Sur les rangées de porte (2 places à gauche), réduire la largeur X à 0,42 (~0,88 m) pour ne jamais
      // dépasser la paroi latérale gauche (-1,30 m) ni empiéter sur l'ouverture de porte droite.
      benchIdx[local] = benchCount;
      matrix.makeScale(seatCount > 2 ? 1 : 0.42, 1, 1);
      matrix.setPosition(seatCount > 2 ? 0 : -0.72, 1.18, z + SEAT_CUSHION_Z);
      benchMesh.setMatrixAt(benchCount++, matrix);

      personStart[local] = personCount;
      const cols = seatCount === 4 ? [0, 3] : [0];
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        const regIndex = getRegisteredSeatIndex(row, col);
        if (regIndex >= occupiedLimit) continue;
        const archetype = getNakamaArchetype(regIndex);
        const x = PASSENGER_SEAT_X[col];

        matrix.makeTranslation(x, 1.54, z + 0.14);
        torsoMesh.setMatrixAt(personCount, matrix);
        color.set(archetype.shirtColor).lerp(INTERIOR_SHADE, 0.35);
        torsoMesh.setColorAt(personCount, color);

        // Visage beige naturel dans la continuité exacte des passagers détaillés vus par les vitres.
        matrix.makeTranslation(x, 1.9, z + 0.14);
        headMesh.setMatrixAt(personCount, matrix);
        color.set(archetype.skinColor || "#e8c8a8").lerp(FACE_WARM_BEIGE, 0.25);
        headMesh.setColorAt(personCount, color);

        personCount += 1;
      }
      personLen[local] = personCount - personStart[local];
    }

    const sphere = new THREE.Sphere(new THREE.Vector3(0, 1.6, range.centerZ), range.radius);
    pillarMesh.count = rowCount * 2;
    pillarMesh.visible = rowCount > 0;
    pillarMesh.boundingSphere = sphere.clone();
    pillarMesh.instanceMatrix.clearUpdateRanges();
    pillarMesh.instanceMatrix.needsUpdate = true;

    benchMesh.count = benchCount;
    benchMesh.visible = benchCount > 0;
    benchMesh.boundingSphere = sphere.clone();
    benchMesh.instanceMatrix.clearUpdateRanges();
    benchMesh.instanceMatrix.needsUpdate = true;

    torsoMesh.count = personCount;
    torsoMesh.visible = personCount > 0;
    torsoMesh.boundingSphere = sphere.clone();
    torsoMesh.instanceMatrix.clearUpdateRanges();
    torsoMesh.instanceMatrix.needsUpdate = true;
    if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true;

    headMesh.count = personCount;
    headMesh.visible = personCount > 0;
    headMesh.boundingSphere = sphere.clone();
    headMesh.instanceMatrix.clearUpdateRanges();
    headMesh.instanceMatrix.needsUpdate = true;
    if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;

    mapRef.current = { benchIdx, personStart, personLen, hiddenRows: new Set() };
  }, [passengerCount, range, rowCount, seatCapacity]);

  // Mise à jour différentielle O(1) uniquement sur les rangées entrées/sorties de la fenêtre détaillée.
  useLayoutEffect(() => {
    const pillarMesh = pillarRef.current;
    const benchMesh = benchRef.current;
    const torsoMesh = torsoRef.current;
    const headMesh = headRef.current;
    const map = mapRef.current;
    if (!pillarMesh || !benchMesh || !torsoMesh || !headMesh || !map) return;

    const nextHidden = new Set<number>();
    for (const row of renderedRowSet) {
      if (row >= range.startRow && row < range.endRow) nextHidden.add(row);
    }
    const prevHidden = map.hiddenRows;
    const matrix = new THREE.Matrix4();
    let minPillar = Number.POSITIVE_INFINITY;
    let maxPillar = -1;
    let minBench = Number.POSITIVE_INFINITY;
    let maxBench = -1;
    let minPerson = Number.POSITIVE_INFINITY;
    let maxPerson = -1;

    for (const row of prevHidden) {
      if (nextHidden.has(row)) continue;
      const local = row - range.startRow;
      const z = getSeatRowZ(row);
      const seatCount = getSeatCountInRow(row);
      matrix.makeTranslation(-1.305, 2.255, z - 0.05);
      pillarMesh.setMatrixAt(local * 2, matrix);
      matrix.makeTranslation(1.305, 2.255, z - 0.05);
      pillarMesh.setMatrixAt(local * 2 + 1, matrix);
      if (local * 2 < minPillar) minPillar = local * 2;
      if (local * 2 + 1 > maxPillar) maxPillar = local * 2 + 1;

      const bIdx = map.benchIdx[local];
      matrix.makeScale(seatCount > 2 ? 1 : 0.42, 1, 1);
      matrix.setPosition(seatCount > 2 ? 0 : -0.72, 1.18, z + SEAT_CUSHION_Z);
      benchMesh.setMatrixAt(bIdx, matrix);
      if (bIdx < minBench) minBench = bIdx;
      if (bIdx > maxBench) maxBench = bIdx;

      const p0 = map.personStart[local];
      const pLen = map.personLen[local];
      const cols = seatCount === 4 ? [0, 3] : [0];
      for (let k = 0; k < pLen; k++) {
        const x = PASSENGER_SEAT_X[cols[k] ?? 0];
        matrix.makeTranslation(x, 1.54, z + 0.14);
        torsoMesh.setMatrixAt(p0 + k, matrix);
        matrix.makeTranslation(x, 1.9, z + 0.14);
        headMesh.setMatrixAt(p0 + k, matrix);
      }
      if (pLen > 0) {
        if (p0 < minPerson) minPerson = p0;
        if (p0 + pLen - 1 > maxPerson) maxPerson = p0 + pLen - 1;
      }
    }

    for (const row of nextHidden) {
      if (prevHidden.has(row)) continue;
      const local = row - range.startRow;
      pillarMesh.setMatrixAt(local * 2, ZERO_MATRIX);
      pillarMesh.setMatrixAt(local * 2 + 1, ZERO_MATRIX);
      if (local * 2 < minPillar) minPillar = local * 2;
      if (local * 2 + 1 > maxPillar) maxPillar = local * 2 + 1;

      const bIdx = map.benchIdx[local];
      benchMesh.setMatrixAt(bIdx, ZERO_MATRIX);
      if (bIdx < minBench) minBench = bIdx;
      if (bIdx > maxBench) maxBench = bIdx;
      const p0 = map.personStart[local];
      const pLen = map.personLen[local];
      for (let k = 0; k < pLen; k++) {
        torsoMesh.setMatrixAt(p0 + k, ZERO_MATRIX);
        headMesh.setMatrixAt(p0 + k, ZERO_MATRIX);
      }
      if (pLen > 0) {
        if (p0 < minPerson) minPerson = p0;
        if (p0 + pLen - 1 > maxPerson) maxPerson = p0 + pLen - 1;
      }
    }

    map.hiddenRows = nextHidden;
    if (maxPillar >= minPillar) {
      pillarMesh.instanceMatrix.clearUpdateRanges();
      pillarMesh.instanceMatrix.addUpdateRange(minPillar * 16, (maxPillar - minPillar + 1) * 16);
      pillarMesh.instanceMatrix.needsUpdate = true;
    }
    if (maxBench >= minBench) {
      benchMesh.instanceMatrix.clearUpdateRanges();
      benchMesh.instanceMatrix.addUpdateRange(minBench * 16, (maxBench - minBench + 1) * 16);
      benchMesh.instanceMatrix.needsUpdate = true;
    }
    if (maxPerson >= minPerson) {
      const offset = minPerson * 16;
      const count = (maxPerson - minPerson + 1) * 16;
      torsoMesh.instanceMatrix.clearUpdateRanges();
      torsoMesh.instanceMatrix.addUpdateRange(offset, count);
      torsoMesh.instanceMatrix.needsUpdate = true;
      headMesh.instanceMatrix.clearUpdateRanges();
      headMesh.instanceMatrix.addUpdateRange(offset, count);
      headMesh.instanceMatrix.needsUpdate = true;
    }
  }, [range.endRow, range.startRow, renderedRowSet]);

  return (
    <group>
      <instancedMesh
        key={`dpillar-${range.chunkIdx}-${range.maxBenches}`}
        ref={pillarRef}
        args={[pillarGeo, pillarMaterial, range.maxBenches * 2]}
        count={0}
        frustumCulled
        dispose={null}
        raycast={() => null}
      />
      <instancedMesh
        key={`dbench-${range.chunkIdx}-${range.maxBenches}`}
        ref={benchRef}
        args={[benchGeo, seatMaterial, range.maxBenches]}
        count={0}
        frustumCulled
        dispose={null}
        raycast={() => null}
      />
      <group ref={(node) => onPeopleGroup(range.chunkIdx, node)}>
        <instancedMesh
          key={`dtorso-${range.chunkIdx}-${range.maxPeople}`}
          ref={torsoRef}
          args={[torsoGeo, torsoMat, range.maxPeople]}
          count={0}
          frustumCulled
          dispose={null}
          raycast={() => null}
        />
        <instancedMesh
          key={`dhead-${range.chunkIdx}-${range.maxPeople}`}
          ref={headRef}
          args={[headGeo, headMat, range.maxPeople]}
          count={0}
          frustumCulled
          dispose={null}
          raycast={() => null}
        />
      </group>
    </group>
  );
});

/**
 * Foule et banquettes basse complexité découpées en tronçons frustum-cullés (~640 m chacun) :
 * les milliers de rangées hors champ derrière la caméra ne sont plus envoyés au GPU,
 * et les tronçons visibles restent pré-construits avec mise à jour différentielle O(1).
 */
const DistantBusCrowd = memo(function DistantBusCrowd({
  numRows,
  passengerCount,
  seatCapacity,
  renderedRowIndices,
  seatMaterial: _seatMaterial,
  pillarMaterial,
  partyOn = false,
  reducedMotion = false,
}: DistantBusCrowdProps) {
  void _seatMaterial;
  const peopleGroupsRef = useRef<Array<THREE.Group | null>>([]);
  const lastBounceYRef = useRef(0);
  const handlePeopleGroup = useMemo(
    () => (chunkIdx: number, node: THREE.Group | null) => {
      peopleGroupsRef.current[chunkIdx] = node;
    },
    [],
  );

  const shared = useMemo(() => ({
    // L'intérieur du bus est toujours à l'ombre du toit : pré-ombrer les matériaux lointains
    // (car les rangées au-delà du frustum d'ombres ne reçoivent plus l'ombre du toit) afin que
    // la luminosité et les piliers bleus foncés se fondent exactement avec la zone détaillée.
    pillarGeo: new THREE.BoxGeometry(0.09, 1.02, 0.12),
    benchGeo: new THREE.BoxGeometry(1.96, 0.36, SEAT_CUSHION_DEPTH),
    benchMat: new THREE.MeshStandardMaterial({ color: "#1b1d2e", roughness: 0.95 }),
    torsoGeo: new THREE.BoxGeometry(0.34, 0.44, 0.24),
    headGeo: new THREE.BoxGeometry(0.25, 0.27, 0.24),
    torsoMat: new THREE.MeshStandardMaterial({ color: "#4a5068", roughness: 0.88 }),
    headMat: new THREE.MeshStandardMaterial({ color: "#686472", roughness: 0.85 }),
  }), []);

  useEffect(() => () => {
    shared.pillarGeo.dispose();
    shared.benchGeo.dispose();
    shared.benchMat.dispose();
    shared.torsoGeo.dispose();
    shared.headGeo.dispose();
    shared.torsoMat.dispose();
    shared.headMat.dispose();
  }, [shared]);

  const chunks = useMemo<ChunkRange[]>(() => {
    if (numRows <= 180) return [];
    const list: ChunkRange[] = [];
    for (let startRow = 0, chunkIdx = 0; startRow < numRows; startRow += CHUNK_ROWS, chunkIdx++) {
      const endRow = Math.min(numRows, startRow + CHUNK_ROWS);
      const count = endRow - startRow;
      const z0 = getSeatRowZ(startRow);
      const z1 = getSeatRowZ(endRow - 1);
      list.push({
        chunkIdx,
        startRow,
        endRow,
        maxBenches: Math.max(16, count),
        maxPeople: Math.max(32, count * 2),
        centerZ: (z0 + z1) * 0.5,
        radius: Math.abs(z1 - z0) * 0.5 + 4,
      });
    }
    return list;
  }, [numRows]);

  const renderedRowSet = useMemo(() => new Set(renderedRowIndices), [renderedRowIndices]);
  const focusRow = renderedRowIndices.length > 0
    ? renderedRowIndices[Math.floor(renderedRowIndices.length / 2)]
    : 0;
  // Au-delà de ~45 000 passagers (1M+), ne garder montés que le tronçon d'avant et les 23 tronçons
  // les plus proches de la caméra (~15 km) pour borner la mémoire GPU en O(1).
  const activeChunks = useMemo(() => {
    const MAX_ACTIVE_CHUNKS = 24;
    if (chunks.length <= MAX_ACTIVE_CHUNKS) return chunks;
    const focusChunk = Math.floor(focusRow / CHUNK_ROWS);
    const radius = Math.floor((MAX_ACTIVE_CHUNKS - 1) / 2);
    let start = Math.max(1, focusChunk - radius);
    let end = start + (MAX_ACTIVE_CHUNKS - 1);
    if (end > chunks.length) {
      end = chunks.length;
      start = Math.max(1, end - (MAX_ACTIVE_CHUNKS - 1));
    }
    return [chunks[0], ...chunks.slice(start, end)];
  }, [chunks, focusRow]);
  const [mountedChunks, setMountedChunks] = useState(2);
  const mountedChunksRef = useRef(2);
  const totalChunksRef = useRef(activeChunks.length);
  useEffect(() => {
    totalChunksRef.current = activeChunks.length;
  }, [activeChunks.length]);

  useFrame(({ clock }) => {
    if (mountedChunksRef.current < totalChunksRef.current) {
      mountedChunksRef.current = Math.min(totalChunksRef.current, mountedChunksRef.current + 2);
      setMountedChunks(mountedChunksRef.current);
    }
    const groups = peopleGroupsRef.current;
    const bounceY = partyOn && !reducedMotion
      ? Math.abs(Math.sin((getPartyDanceTime(clock.elapsedTime) / PARTY_BEAT_SECONDS) * Math.PI * 2)) * 0.14
      : 0;
    if (bounceY === 0 && lastBounceYRef.current === 0) return;
    lastBounceYRef.current = bounceY;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (g) g.position.y = bounceY;
    }
  });

  if (numRows <= 180) return null;

  return (
    <group name="bus-distant-crowd">
      {activeChunks.slice(0, mountedChunks).map((range) => (
        <CrowdChunk
          key={range.chunkIdx}
          range={range}
          passengerCount={passengerCount}
          seatCapacity={seatCapacity}
          renderedRowSet={renderedRowSet}
          seatMaterial={shared.benchMat}
          pillarMaterial={pillarMaterial}
          pillarGeo={shared.pillarGeo}
          benchGeo={shared.benchGeo}
          torsoGeo={shared.torsoGeo}
          headGeo={shared.headGeo}
          torsoMat={shared.torsoMat}
          headMat={shared.headMat}
          onPeopleGroup={handlePeopleGroup}
        />
      ))}
    </group>
  );
});

export default DistantBusCrowd;
