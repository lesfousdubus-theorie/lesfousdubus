"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { PassengerProfile } from "@/types/passenger";
import { getCharacterName, NAKAMA_ROSTER, getNakamaArchetype, type NakamaArchetype } from "./passenger-archetypes";
import { useLocale, type Locale } from "@/lib/i18n";
import { NakamaProp } from "./PassengerAppearance";
import PassengerHead from "./PassengerHead";
import { SimplifiedPassengers } from "./SimplifiedPassengers";
export { SimplifiedPassengers } from "./SimplifiedPassengers";
import { PassengerNeck, PassengerTorso } from "./PassengerAnatomy";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import type { SeatInfo } from "@/lib/bus-layout";
import { FIRST_SEAT_Z, getSeatRowZ } from "@/lib/bus-layout";
import { createVisibleBusRowRangeScratch, getBusOccupancy, getVisibleBusRowRange, type BusRowRange } from "@/lib/bus-occupancy";
import PassengerLowerBody from "./PassengerLowerBody";
import { PassengerUpperArm, PassengerForearm } from "./PassengerIdentity";
import PassengerSignatureProp from "./PassengerSignatureProp";
import PassengerCardGame, { getPassengerCardActor, type PassengerCardActors } from "./PassengerCardGame";
import { getPassengerCardPairs } from "@/lib/passenger-card-game";
import { BODY_BEHIND_HIP, CABIN_FLOOR_Y } from "@/lib/passenger-gait";
import { blendPassengerPose, createPassengerPose, getPassengerSignatureGain, getRegisteredPassengerPose, pruneRegisteredPassengerPoses, samplePassengerPose, type PassengerPoseRegistry } from "@/lib/passenger-motion";
import { keepPassengerHandsApart } from "@/lib/passenger-space";
import { DistantPassengerNames, getVisiblePassengerName, PassengerNameTag, useVisiblePassengerSummaries } from "./PassengerNameTags";
import { getPassengerNameHeightFromHip, usePassengerHeadHeight, usePassengerHeadHeights } from "./usePassengerHeadHeight";

function getSeatedPassengerNameHeight(id: string, crown: number) {
  return CABIN_FLOOR_Y + getPassengerSkeleton(id).seatedHipHeight + getPassengerNameHeightFromHip(id, crown);
}

function getNakamaShortName(archetype: NakamaArchetype, locale: Locale) {
  const name = getCharacterName(archetype, locale);
  return ["shanks", "buggy"].includes(archetype.id)
    ? name.split(" ")[0]
    : name.split(" ").at(-1) ?? name;
}

function getFallbackPassengerHeadTop(archetype: NakamaArchetype) {
  const halfHead = getPassengerProportions(archetype.id).headHeight / 2;
  if (archetype.id === "brook") return 0.45;
  if (archetype.accessory === "reindeer_hat" || archetype.accessory === "top_hat") return 0.37;
  if (archetype.accessory === "straw_hat" || archetype.accessory === "cowboy_hat"
    || archetype.accessory === "white_cap" || archetype.accessory === "horns") return halfHead + 0.16;
  return halfHead + 0.06;
}

const ARCHETYPE_MATS_CACHE = new Map<string, Record<string, THREE.Material>>();
const SUMMARY_PROFILE_CACHE = new WeakMap<object, PassengerProfile>();

export function getArchetypeMaterials(archetype: NakamaArchetype): Record<string, THREE.Material> {
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
      depthWrite: true,
    }),
    teeth: new THREE.MeshBasicMaterial({
      color: "#ffffff",
      depthWrite: true,
    }),
    faceDark: new THREE.MeshBasicMaterial({
      color: "#1c1917",
      depthWrite: true,
    }),
    dark: new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8, roughness: 0.2 }),
    red: new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.5 }),
    turquoise: new THREE.MeshStandardMaterial({ color: "#32c9c1", roughness: .65 }),
  };

  ARCHETYPE_MATS_CACHE.set(archetype.id, mats);
  return mats;
}

interface PassengersProps {
  phase?: "outside" | "entering" | "inside" | "exiting";
  passengerCount: number;
  seatCapacity: number;
  numRows: number;
  renderedRowIndices?: number[];
  vacantSeatRanges?: Array<[number, number, number]>;
  hornPulse: number;
  partyOn?: boolean;
  reservedRow?: number;
  reservedColumn?: number | null;
  passengerProfiles?: PassengerProfile[];
  profileRevision?: number;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  lowPower?: boolean;
  detailLimit?: number;
  simplifiedLimit?: number;
  reducedMotion?: boolean;
  excludedPassengerIndex?: number | null;
  avatarAboard?: boolean;
}

function isCameraOutsideCabin(
  phase: "outside" | "entering" | "inside" | "exiting",
  pos: THREE.Vector3,
  rearZ: number,
): boolean {
  // En mode extérieur, la caméra reste toujours hors de la cabine : on garde 100 % des passagers
  // en instancing GPU (zéro démontage/remontage React et zéro siège vide au zoom rapide près des vitres).
  if (phase === "outside") return true;
  return Math.abs(pos.x) > 6.5 || pos.y > 5.0 || pos.z < FIRST_SEAT_Z - 8.0 || pos.z > rearZ + 6.0;
}

function isCameraNearLabels(
  phase: "outside" | "entering" | "inside" | "exiting",
  pos: THREE.Vector3,
): boolean {
  if (phase !== "outside") return true;
  return Math.abs(pos.x) <= 36 && pos.y <= 28;
}

function Passengers({ phase = "outside", passengerCount, seatCapacity, numRows, renderedRowIndices, vacantSeatRanges = [], hornPulse,
  partyOn = false, reservedRow = 3, reservedColumn = null, passengerProfiles = [], onPassengerSelect,
  profileRevision = 0, lowPower = false, detailLimit, simplifiedLimit, reducedMotion = false, excludedPassengerIndex = null, avatarAboard = false }: PassengersProps) {
  const camera = useThree(state => state.camera);
  const root = useRef<THREE.Group>(null), cameraPoint = useMemo(() => new THREE.Vector3(), []);
  const frustumScratch = useMemo(() => createVisibleBusRowRangeScratch(), []);
  const [visibleRowState, setVisibleRowState] = useState<{ numRows: number; range: BusRowRange }>(() => ({
    numRows,
    range: getVisibleBusRowRange(camera, null, numRows, 3.6, frustumScratch),
  }));
  const visibleRangeRef = useRef<{ minRow: number; maxRow: number; numRows: number; shrinkAt: number } | null>(null);
  const [detailFocus, setDetailFocus] = useState(() => {
    const rearZ = getSeatRowZ(Math.max(0, numRows - 1)) + 4;
    const farOutside = Math.abs(camera.position.x) > 28 || camera.position.z < -26 || camera.position.z > rearZ + 18;
    return farOutside
      ? { x: 0, z: getSeatRowZ(reservedRow) }
      : {
        x: THREE.MathUtils.clamp(Math.round(camera.position.x / 1.2) * 1.2, -3, 3),
        z: THREE.MathUtils.clamp(Math.round(camera.position.z / 1.5) * 1.5, FIRST_SEAT_Z, Math.max(FIRST_SEAT_Z, rearZ - 2)),
      };
  });
  const [outsideCabin, setOutsideCabin] = useState(() =>
    isCameraOutsideCabin(phase, camera.position, getSeatRowZ(Math.max(0, numRows - 1)) + 4),
  );
  const outsideCabinRef = useRef(outsideCabin);
  const [showNearLabels, setShowNearLabels] = useState(() => isCameraNearLabels(phase, camera.position));
  const showNearLabelsRef = useRef(showNearLabels);
  const [labelRowRange, setLabelRowRange] = useState<BusRowRange>(() => ({ minRow: 0, maxRow: Math.min(numRows - 1, 36) }));
  const labelRowRangeRef = useRef<{ minRow: number; maxRow: number; shrinkAt: number }>({
    minRow: 0,
    maxRow: Math.min(numRows - 1, 36),
    shrinkAt: 0,
  });
  const prevCamPosRef = useRef(new THREE.Vector3());
  const prevCamDirRef = useRef(new THREE.Vector3(0, 0, -1));
  const curCamPosScratch = useMemo(() => new THREE.Vector3(), []);
  const curCamDirScratch = useMemo(() => new THREE.Vector3(), []);
  const camMotionInitRef = useRef(false);
  const fastMotionUntilRef = useRef(0);
  const lastFocus = useRef({ ...detailFocus, time: -Infinity });
  const [detailedBudget, setDetailedBudget] = useState(1);
  const detailedCountRef = useRef(0);
  const detailedBudgetRef = useRef(1);
  const detailedNextAtRef = useRef(0);
  useFrame(({ camera: frameCamera }, dt) => {
    const now = performance.now();
    if (
      detailedBudgetRef.current < detailedCountRef.current
      && now >= detailedNextAtRef.current
    ) {
      detailedNextAtRef.current = now + (dt > 0.05 ? 60 : 30);
      detailedBudgetRef.current += 1;
      setDetailedBudget(detailedBudgetRef.current);
    }
    if (!root.current) return;

    // Détecter les rotations/déplacements rapides de caméra (y compris glissement de siège en cabine)
    // pour éviter tout recalcul de rangées/noms/détails en plein milieu de l'animation.
    frameCamera.getWorldPosition(curCamPosScratch);
    frameCamera.getWorldDirection(curCamDirScratch);
    if (camMotionInitRef.current) {
      const safeDt = Math.max(dt, 1 / 120);
      const dot = THREE.MathUtils.clamp(prevCamDirRef.current.dot(curCamDirScratch), -1, 1);
      const angularSpeed = Math.acos(dot) / safeDt;
      const moveSpeed = prevCamPosRef.current.distanceTo(curCamPosScratch) / safeDt;
      const moveThreshold = outsideCabinRef.current ? 28 : 1.2;
      if (angularSpeed > 1.4 || moveSpeed > moveThreshold) {
        fastMotionUntilRef.current = now + 220;
      }
    } else {
      camMotionInitRef.current = true;
    }
    prevCamPosRef.current.copy(curCamPosScratch);
    prevCamDirRef.current.copy(curCamDirScratch);

    // Cache les rangées hors champ sans jamais retirer un passager visible de son siège ;
    // vu de l'extérieur, la fenêtre renderedRowIndices est déjà bornée et statique : on masque
    // instantanément le groupe entier sans re-render React ni ré-upload GPU pendant l'orbite.
    const rawVisible = getVisibleBusRowRange(frameCamera, root.current, numRows, 1.8, frustumScratch);
    const renderedMin = renderedRowIndices?.length ? renderedRowIndices[0] : 0;
    const renderedMax = renderedRowIndices?.length ? renderedRowIndices[renderedRowIndices.length - 1] : numRows - 1;
    const clampedMin = Math.max(rawVisible.minRow, renderedMin);
    const clampedMax = Math.min(rawVisible.maxRow, renderedMax);
    const rawEmpty = clampedMin > clampedMax;
    root.current.visible = !outsideCabinRef.current || !rawEmpty;
    if (now < fastMotionUntilRef.current) return;

    if (!outsideCabinRef.current) {
      const prevVisible = visibleRangeRef.current;
      const prevEmpty = prevVisible ? prevVisible.minRow > prevVisible.maxRow : false;
      const needsExpand = !prevVisible
        || prevVisible.numRows !== numRows
        || (!rawEmpty && (prevEmpty || clampedMin < prevVisible.minRow || clampedMax > prevVisible.maxRow));
      const wantsShrink = Boolean(
        prevVisible
        && prevVisible.numRows === numRows
        && !prevEmpty
        && (rawEmpty || clampedMin > prevVisible.minRow + 32 || clampedMax < prevVisible.maxRow - 32),
      );
      if (needsExpand || (wantsShrink && prevVisible && now >= prevVisible.shrinkAt)) {
        const nextRange: BusRowRange = rawEmpty
          ? { minRow: 1, maxRow: 0 }
          : { minRow: Math.max(0, clampedMin - 32), maxRow: Math.min(numRows - 1, clampedMax + 32) };
        visibleRangeRef.current = { ...nextRange, numRows, shrinkAt: now + 1200 };
        setVisibleRowState({ numRows, range: nextRange });
      } else if (!wantsShrink && prevVisible) {
        prevVisible.shrinkAt = now + 1200;
      }
    }

    const focusInterval = showNearLabelsRef.current ? 260 : 600;
    if (now - lastFocus.current.time < focusInterval) return;
    lastFocus.current.time = now;
    cameraPoint.copy(curCamPosScratch);
    root.current.worldToLocal(cameraPoint);
    const rearZ = getSeatRowZ(Math.max(0, numRows - 1)) + 4;
    const nextOutside = isCameraOutsideCabin(phase, cameraPoint, rearZ);
    if (nextOutside !== outsideCabinRef.current) {
      outsideCabinRef.current = nextOutside;
      setOutsideCabin(nextOutside);
    }
    const nextShowLabels = isCameraNearLabels(phase, cameraPoint);
    if (nextShowLabels !== showNearLabelsRef.current) {
      showNearLabelsRef.current = nextShowLabels;
      setShowNearLabels(nextShowLabels);
    }
    // Sélectionner uniquement les rangées réellement DANS le champ de la caméra (avec marge ±6 rangées
    // et hystérésis de rétrécissement de 1200 ms pour éviter de démonter/remonter 150 sprites lors d'une orbite 360°).
    if (nextShowLabels) {
      const prevLabel = labelRowRangeRef.current;
      const prevEmpty = prevLabel.minRow > prevLabel.maxRow;
      if (rawEmpty) {
        if (!prevEmpty && now >= prevLabel.shrinkAt) {
          const emptyRange = { minRow: 1, maxRow: 0 };
          labelRowRangeRef.current = { ...emptyRange, shrinkAt: now + 1200 };
          setLabelRowRange(emptyRange);
        }
      } else {
        const maxSpanRows = 38;
        const span = clampedMax - clampedMin;
        let desiredMin = clampedMin;
        let desiredMax = clampedMax;
        if (span > maxSpanRows) {
          const camRow = Math.round((cameraPoint.z - FIRST_SEAT_Z) / 1.25);
          const anchor = THREE.MathUtils.clamp(camRow, clampedMin, clampedMax);
          desiredMin = Math.max(clampedMin, Math.min(clampedMax - maxSpanRows, anchor - Math.floor(maxSpanRows / 2)));
          desiredMax = Math.min(clampedMax, desiredMin + maxSpanRows);
        }
        const needsExpand = prevEmpty || desiredMin < prevLabel.minRow || desiredMax > prevLabel.maxRow;
        const wantsShrink = !prevEmpty && (desiredMin > prevLabel.minRow + 8 || desiredMax < prevLabel.maxRow - 8);
        if (needsExpand || (wantsShrink && now >= prevLabel.shrinkAt)) {
          const paddedMin = Math.max(renderedMin, desiredMin - 12);
          const paddedMax = Math.min(renderedMax, Math.max(desiredMax, Math.min(desiredMax + 12, paddedMin + 52)));
          const nextRange: BusRowRange = { minRow: paddedMin, maxRow: paddedMax };
          labelRowRangeRef.current = { ...nextRange, shrinkAt: now + 1500 };
          setLabelRowRange(nextRange);
        } else if (!wantsShrink) {
          prevLabel.shrinkAt = now + 1500;
        }
      }
    }
    const farOutside = Math.abs(cameraPoint.x) > 28 || cameraPoint.z < -26 || cameraPoint.z > rearZ + 18;
    const nextX = farOutside ? 0 : THREE.MathUtils.clamp(Math.round(cameraPoint.x / 1.5) * 1.5, -3, 3);
    const nearestVisibleRow = rawVisible.minRow <= rawVisible.maxRow
      ? THREE.MathUtils.clamp(Math.round((cameraPoint.z - FIRST_SEAT_Z) / 1.25), rawVisible.minRow, rawVisible.maxRow)
      : reservedRow;
    const rawNextZ = farOutside
      ? getSeatRowZ(nearestVisibleRow)
      : THREE.MathUtils.clamp(cameraPoint.z, FIRST_SEAT_Z, Math.max(FIRST_SEAT_Z, rearZ - 2));
    const stepZ = nextShowLabels ? 5.0 : 24.0;
    const nextZ = Math.round(rawNextZ / stepZ) * stepZ;
    if (Math.hypot(nextX - lastFocus.current.x, nextZ - lastFocus.current.z) < (nextShowLabels ? 4.0 : 20.0)) return;
    lastFocus.current = { x: nextX, z: nextZ, time: now };
    setDetailFocus({ x: nextX, z: nextZ });
  }, -3);
  const effectiveVisibleRowRange = outsideCabin
    ? null
    : (visibleRowState.numRows === numRows ? visibleRowState.range : null);
  // Vu de l'extérieur du bus, SimplifiedPassengers affiche déjà exactement les mêmes visages, coiffures,
  // chapeaux, costumes et animations de fête One Piece en instancing GPU : on évite ainsi de monter/démonter
  // 8 à 14 arbres React complets (~840 meshes) à chaque mouvement d'orbite autour du bus.
  // En cabine, on garde les 6 voisins les plus proches en version articulée complète (les autres sont déjà
  // rendus à l'identique par SimplifiedPassengers en instancing GPU sans coût React au changement de siège).
  const effectiveDetailLimit = outsideCabin ? 0 : Math.min(detailLimit ?? 8, 6);
  const { detailed: rawDetailed, simplified: rawSimplified } = useMemo(() => getBusOccupancy({ passengerCount, seatCapacity,
    vacantSeatRanges, renderedRowIndices, reservedRow, reservedColumn, currentPassengerIndex: excludedPassengerIndex,
    avatarAboard, lowPower, detailLimit: effectiveDetailLimit, simplifiedLimit, detailFocus,
    visibleRowRange: effectiveVisibleRowRange, preserveVisibleSeats: true }), [passengerCount, seatCapacity,
      vacantSeatRanges, renderedRowIndices, reservedRow, reservedColumn, excludedPassengerIndex, avatarAboard,
      lowPower, effectiveDetailLimit, simplifiedLimit, detailFocus, effectiveVisibleRowRange]);
  // Conserver les mêmes références `detailed` et `simplified` quand aucun passager n'a réellement bougé
  // (ex. changement de colonne vers un siège libre ou petit pas de rangée).
  const [detailed, setDetailed] = useState(rawDetailed);
  if (
    detailed.length !== rawDetailed.length
    || detailed.some((item, i) => item.index !== rawDetailed[i].index || item.physicalSeatIndex !== rawDetailed[i].physicalSeatIndex)
  ) {
    setDetailed(rawDetailed);
  }
  const [simplified, setSimplified] = useState(rawSimplified);
  if (
    simplified.length !== rawSimplified.length
    || simplified.some((item, i) => item.index !== rawSimplified[i].index || item.physicalSeatIndex !== rawSimplified[i].physicalSeatIndex)
  ) {
    setSimplified(rawSimplified);
  }
  const prevDetailedIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    detailedCountRef.current = detailed.length;
    const prev = prevDetailedIdsRef.current;
    let newlyEntered = 0;
    for (let i = 0; i < detailed.length; i++) {
      if (!prev.has(detailed[i].index)) newlyEntered += 1;
    }
    prevDetailedIdsRef.current = new Set(detailed.map((occupant) => occupant.index));
    // Quand la caméra arrive sur une nouvelle section du bus, on monte les personnages
    // détaillés progressivement (les versions simplifiées restent déjà affichées) pour éviter tout freeze.
    if (newlyEntered >= 4) {
      detailedBudgetRef.current = Math.min(detailedBudgetRef.current, 2);
      setDetailedBudget(detailedBudgetRef.current);
    }
  }, [detailed]);
  const mountedDetailed = useMemo(
    () => detailed.slice(0, detailedBudget),
    [detailed, detailedBudget],
  );
  const pendingDetailed = useMemo(
    () => detailed.slice(detailedBudget),
    [detailed, detailedBudget],
  );
  const renderedSimplified = useMemo(
    () => (pendingDetailed.length > 0 ? [...pendingDetailed, ...simplified] : simplified),
    [pendingDetailed, simplified],
  );
  // Charger et afficher les noms de TOUS les passagers réellement dans le champ caméra (zéro badge derrière la caméra).
  const nearLabelVisitors = useMemo(() => {
    if (!showNearLabels || labelRowRange.minRow > labelRowRange.maxRow) return [];
    const near = [...mountedDetailed, ...renderedSimplified].filter(
      (o) => o.seat.row >= labelRowRange.minRow && o.seat.row <= labelRowRange.maxRow,
    );
    near.sort((a, b) => Math.abs(a.seat.z - detailFocus.z) - Math.abs(b.seat.z - detailFocus.z));
    return near.slice(0, 152);
  }, [detailFocus.z, labelRowRange.maxRow, labelRowRange.minRow, mountedDetailed, renderedSimplified, showNearLabels]);
  const summaries = useVisiblePassengerSummaries(nearLabelVisitors, profileRevision);
  const profilesBySeatIndex = useMemo(() => {
    const profiles = new Map(passengerProfiles.map(profile => [profile.seatIndex, profile]));
    for (const [index, summary] of summaries) {
      if (!summary || profiles.has(index)) continue;
      let cached = SUMMARY_PROFILE_CACHE.get(summary);
      if (!cached) {
        cached = { seatIndex: index, displayName: summary.displayName ?? "", avatarId: summary.avatarId, comment: null };
        SUMMARY_PROFILE_CACHE.set(summary, cached);
      }
      profiles.set(index, cached);
    }
    return profiles;
  }, [passengerProfiles, summaries]);
  const locale = useLocale();
  const headHeights = usePassengerHeadHeights();
  const distantLabels = useMemo(() => {
    if (!showNearLabels || labelRowRange.minRow > labelRowRange.maxRow) return [];
    const candidates = renderedSimplified.filter(
      ({ seat }) => seat.row >= labelRowRange.minRow && seat.row <= labelRowRange.maxRow,
    );
    candidates.sort((a, b) => Math.abs(a.seat.z - detailFocus.z) - Math.abs(b.seat.z - detailFocus.z));
    return candidates.slice(0, 152).flatMap(({ seat, index, passengerKind }) => {
      const profile = passengerKind === "visitor" ? profilesBySeatIndex.get(index) : undefined;
      const archetype = getNakamaArchetype(index, profile?.avatarId);
      const name = passengerKind === "visitor" ? getVisiblePassengerName(profile?.displayName) : getNakamaShortName(archetype, locale);
      const crown = headHeights.get(archetype.id) ?? getFallbackPassengerHeadTop(archetype);
      if (!name) return [];
      const skeleton = getPassengerSkeleton(archetype.id);
      return [{ index, name, x: seat.x, y: getSeatedPassengerNameHeight(archetype.id, crown), z: seat.z + skeleton.seatedHipZ + BODY_BEHIND_HIP + 0.02 }];
    });
  }, [detailFocus.z, headHeights, labelRowRange.maxRow, labelRowRange.minRow, locale, profilesBySeatIndex, renderedSimplified, showNearLabels]);
  const detailedSeats = new Set(mountedDetailed.map(occupant => occupant.physicalSeatIndex));
  const poses=useMemo<PassengerPoseRegistry>(()=>new Map(),[]);
  useEffect(()=>{
    const visible=new Set([...mountedDetailed,...renderedSimplified].map(actor=>actor.index));
    pruneRegisteredPassengerPoses(poses,visible);
  },[mountedDetailed,renderedSimplified,poses]);
  const cardActors = useMemo<PassengerCardActors>(() => new Map(), []);
  const cardPairs = useMemo(() => getPassengerCardPairs(mountedDetailed.map(occupant => ({ ...occupant,
    archetypeId: getNakamaArchetype(occupant.index, occupant.passengerKind === "visitor"
      ? profilesBySeatIndex.get(occupant.index)?.avatarId : null).id,
  })), NAKAMA_ROSTER.map(archetype => archetype.id)), [mountedDetailed, profilesBySeatIndex]);
  const cardPairBySeat = useMemo(() => new Map(cardPairs.flatMap(pair => [[pair.firstSeat, pair.pairIndex], [pair.secondSeat, pair.pairIndex]])), [cardPairs]);
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);
  return <group ref={root} name="bus-seated-passengers" userData={{ detailedCount: mountedDetailed.length, simplifiedCount: renderedSimplified.length }}>
    <SimplifiedPassengers passengers={renderedSimplified} profilesBySeatIndex={profilesBySeatIndex} partyOn={partyOn} hornPulse={hornPulse} reducedMotion={reducedMotion} poses={poses}/>
    <DistantPassengerNames labels={distantLabels} profilesBySeatIndex={profilesBySeatIndex} onSelect={onPassengerSelect} />
    {mountedDetailed.map(({ seat, index, physicalSeatIndex, passengerKind }) => {
      const archetype = getNakamaArchetype(index, passengerKind === "visitor" ? profilesBySeatIndex.get(index)?.avatarId : null);
      return <Passenger key={`${passengerKind}-${index}`} seat={seat} index={index} archetype={archetype}
        poses={poses}
        name={passengerKind === "nakama" ? `crew-nakama-${archetype.id}-${index}` : undefined}
        passengerKind={passengerKind} physicalSeatIndex={physicalSeatIndex}
        cardActors={cardActors} cardPairIndex={cardPairBySeat.get(physicalSeatIndex) ?? null}
        label={passengerKind === "nakama" ? getNakamaShortName(archetype, locale) : getVisiblePassengerName(profilesBySeatIndex.get(index)?.displayName) ?? null}
        hornPulse={hornPulse} partyOn={partyOn}
        peerSide={detailedSeats.has(physicalSeatIndex ^ 1) ? (seat.seatInRow % 2 === 0 ? 1 : -1) : 0}
        interactionPairIndex={Math.floor(physicalSeatIndex / 2)}
        reducedMotion={reducedMotion} profile={passengerKind === "visitor" ? profilesBySeatIndex.get(index) : undefined}
        onSelect={onPassengerSelect}/>;
    })}
    {cardPairs.map(pair => <PassengerCardGame key={pair.pairIndex} pair={pair} actors={cardActors}
      hornPulse={hornPulse} partyOn={partyOn} reducedMotion={reducedMotion}/>)}
  </group>;
}

export const Passenger = memo(function Passenger({
  seat,
  index,
  archetype,
  hornPulse,
  partyOn = false,
  poses,
  peerSide = 0,
  interactionPairIndex,
  cardActors,
  cardPairIndex = null,
  reducedMotion,
  profile,
  onSelect,
  firstPerson = false,
  passengerKind,
  physicalSeatIndex,
  name,
  label,
  onActivate,
  head,
  children,
}: {
  seat: SeatInfo;
  index: number;
  archetype: NakamaArchetype;
  hornPulse: number;
  partyOn?: boolean;
  poses?: PassengerPoseRegistry;
  peerSide?: number;
  interactionPairIndex?: number;
  cardActors?: PassengerCardActors;
  cardPairIndex?: number | null;
  reducedMotion: boolean;
  profile?: PassengerProfile;
  onSelect?: (passenger: PassengerProfile) => void;
  firstPerson?: boolean;
  passengerKind?: "visitor" | "nakama";
  physicalSeatIndex?: number;
  name?: string;
  label?: string | null;
  onActivate?: () => void;
  head?: ReactNode;
  children?: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const headModel = useRef<THREE.Group>(null);
  const torsoGroup = useRef<THREE.Group>(null);
  const upperBody = useRef<THREE.Group>(null);
  const arms = useRef<Array<THREE.Group | null>>([]);
  const elbows = useRef<Array<THREE.Group | null>>([]);
  const heldProps = useRef<THREE.Group>(null);
  const signatureProps = useRef<Array<THREE.Group|null>>([]);
  const targetPose = useRef(createPassengerPose());
  const currentPose = useRef(getRegisteredPassengerPose(poses,index));
  const hoveredObjects = useRef(new Set<THREE.Object3D>());

  // Matériaux partagés et mis en cache par archetype
  const mats = useMemo(() => getArchetypeMaterials(archetype), [archetype]);
  const proportions = getPassengerProportions(archetype.id);
  const skeleton = getPassengerSkeleton(archetype.id);
  const displayName = label === undefined ? getVisiblePassengerName(profile?.displayName) : label;
  const selectedProfile = useMemo<PassengerProfile | undefined>(
    () => (passengerKind === "visitor" && onSelect && displayName
      ? (profile ?? { seatIndex: index, displayName, comment: null })
      : undefined),
    [profile, passengerKind, onSelect, index, displayName],
  );
  const interactive = Boolean(selectedProfile || onActivate);
  const crown = usePassengerHeadHeight(archetype.id, headModel, !firstPerson);

  useEffect(() => () => {
    if (hoveredObjects.current.size > 0) {
      hoveredObjects.current.clear();
      document.body.style.cursor = "auto";
    }
  }, []);

  useEffect(() => {
    if ((!interactive || firstPerson) && hoveredObjects.current.size > 0) {
      hoveredObjects.current.clear();
      document.body.style.cursor = "auto";
    }
  }, [firstPerson, interactive]);

  useLayoutEffect(() => {
    if (!cardActors || physicalSeatIndex === undefined || !group.current) return;
    const actor = getPassengerCardActor(group.current);
    if (!actor) return;
    cardActors.set(physicalSeatIndex, actor);
    return () => { if (cardActors.get(physicalSeatIndex) === actor) cardActors.delete(physicalSeatIndex); };
  }, [cardActors, physicalSeatIndex, archetype.id]);

  const benchSide = seat.row < 0 || seat.seatInRow < 0 ? 0 : seat.seatInRow % 2 === 0 ? 1 : -1;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const seed = index * 0.73;

    samplePassengerPose(targetPose.current,t,index,peerSide,proportions.torsoWidth,hornPulse>0?(performance.now()-hornPulse)/1000:Infinity,partyOn,reducedMotion,archetype.id,cardPairIndex,interactionPairIndex);
    keepPassengerHandsApart(targetPose.current,archetype.id,benchSide,seat.x);
    blendPassengerPose(currentPose.current,targetPose.current,dt,reducedMotion);
    const pose=currentPose.current;
    keepPassengerHandsApart(pose,archetype.id,benchSide,seat.x);
    if (group.current) {
      // Le bassin et les pieds restent sur leur siège/sol pendant la fête.
      group.current.position.y = 0;
      group.current.rotation.y = 0;
      group.current.userData.activity = pose.activity;
      group.current.userData.gesture = pose.gesture;
    }
    if(upperBody.current){
      upperBody.current.rotation.set(pose.torsoPitch,pose.torsoYaw+pose.rootYaw,pose.torsoRoll);
      upperBody.current.position.y=skeleton.torsoAboveHip+pose.bob*.5;
    }
    if (headGroup.current) {
      headGroup.current.rotation.set(pose.headPitch,pose.headYaw,0);
    }
    arms.current[0]?.rotation.set(pose.leftX,0,pose.leftZ);
    arms.current[1]?.rotation.set(pose.rightX,0,pose.rightZ);
    elbows.current[0]?.rotation.set(pose.leftElbowX,0,pose.leftElbowZ);
    elbows.current[1]?.rotation.set(pose.rightElbowX,0,pose.rightElbowZ);
    if(heldProps.current)heldProps.current.visible=!pose.celebrating&&!pose.games&&pose.activity!=="check"&&pose.activity!=="chat";
    const signatureGain = archetype.id==="foudubustv" ? 1 : pose.celebrating ? getPassengerSignatureGain(t,archetype.id,partyOn,reducedMotion) : 0;
    for(const prop of signatureProps.current)if(prop){prop.visible=signatureGain>.001;prop.scale.setScalar(signatureGain);}
    if (torsoGroup.current) {
      const breath = reducedMotion || pose.games || pose.activity==="check" ? 1 : 1 + Math.sin(t * 2.2 + seed) * 0.015;
      torsoGroup.current.scale.set(breath, 1, breath);
    }
  }, -2);

  const handleActivate = interactive
    ? (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        if (selectedProfile) onSelect?.(selectedProfile);
        else onActivate?.();
      }
    : undefined;
  const handlePointerOver = interactive
    ? (event: { stopPropagation: () => void; object?: THREE.Object3D }) => {
        event.stopPropagation();
        if (event.object) hoveredObjects.current.add(event.object);
        document.body.style.cursor = "pointer";
      }
    : undefined;
  const handlePointerOut = interactive
    ? (event: { object?: THREE.Object3D }) => {
        if (event.object) hoveredObjects.current.delete(event.object);
        if (hoveredObjects.current.size === 0) {
          document.body.style.cursor = "auto";
        }
      }
    : undefined;

  return (
    <group
      ref={group}
      name={name ?? `nakama-${archetype.id}-${index}`}
      userData={{ physicalSeatIndex, passengerKind, cardPairIndex, seatIndex: passengerKind === "visitor" ? index : undefined, archetypeId: archetype.id, row: seat.row, seatInRow: seat.seatInRow }}
      position={[seat.x, 0, seat.z]}
      onClick={onActivate ? handleActivate : undefined}
      onPointerOver={onActivate ? handlePointerOver : undefined}
      onPointerOut={onActivate ? handlePointerOut : undefined}
    >
      {!firstPerson && displayName && crown !== undefined && (
        <PassengerNameTag name={displayName} position={[0, getSeatedPassengerNameHeight(archetype.id, crown), skeleton.seatedHipZ + BODY_BEHIND_HIP + 0.02]}
          onClick={handleActivate}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />
      )}
      <group name="nakama-hips" position={[0, CABIN_FLOOR_Y + skeleton.seatedHipHeight, skeleton.seatedHipZ]}>
        <PassengerLowerBody mats={mats} archetype={archetype} kickPose={archetype.id==="sanji"?currentPose:undefined} />

        <group ref={upperBody} name="nakama-upper-body" position={[0, skeleton.torsoAboveHip, BODY_BEHIND_HIP]}>
        <group ref={torsoGroup}>
          <PassengerTorso archetype={archetype} mats={mats} />
        </group>
          {[-1, 1].map((side,index) => <group key={side} ref={node=>{arms.current[index]=node;}} name={`nakama-arm-${index===0?"left":"right"}`} position={[side * (proportions.torsoWidth / 2 - 0.018), skeleton.shoulderY, 0]} rotation={[0.12, 0, -side * 0.12]}>
            <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerUpperArm archetype={archetype} mats={mats} side={side} width={proportions.armWidth}/></group>
            <group ref={node=>{elbows.current[index]=node;}} name={`nakama-elbow-${index===0?"left":"right"}`} position={[0, -skeleton.upperArmLength, 0]} rotation={[1.05, 0, 0]}>
              <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerForearm archetype={archetype} mats={mats} side={side} width={proportions.armWidth} handName={`nakama-hand-${index===0?"left":"right"}`}/></group>
              <group ref={node=>{signatureProps.current[index]=node;}} name={`nakama-signature-${index===0?"left":"right"}`} position={[0,-skeleton.forearmLength,0]} visible={archetype.id==="foudubustv"}>
                <PassengerSignatureProp id={archetype.id} side={side} mats={mats}/>
              </group>
            </group>
          </group>)}
        {!firstPerson && <group ref={headGroup} position={[0, skeleton.neckAboveHip-skeleton.torsoAboveHip, 0]}>
          <PassengerNeck archetype={archetype} mats={mats} />
          {/* Parole et écoute suivent le banc physique, comme les gestes des voisins. */}
          <group ref={headModel} position={[0, skeleton.headAboveNeck, 0]}>{head ?? <PassengerHead archetype={archetype} mats={mats}
            motion={currentPose} index={physicalSeatIndex ?? index} reducedMotion={reducedMotion}/>}</group>
        </group>}
        </group>
      </group>

      {/* ---------- PROPS & OBJETS TENUS ---------- */}
      <group ref={heldProps} name="nakama-resting-props"><NakamaProp id={archetype.id} prop={archetype.prop} mats={mats} />{children}</group>

    </group>
  );
});

export default memo(Passengers);
