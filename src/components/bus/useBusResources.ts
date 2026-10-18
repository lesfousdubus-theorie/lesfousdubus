"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import {
  makeDashboardTexture, makeGraffitiTexture, makeLabelTexture,
  makeLicensePlateTexture, makeTvOffTexture, makeBusContactShadowTexture,
} from "@/lib/textures";
import { createStrawHatGeometry } from "./StrawHatGeometry";

const BLUE = "#154ddb";
const DARK_BLUE = "#0a2a85";
const YELLOW = "#ffbf18";
const DARK = "#12141a";

/** Owns generated bus resources. Drei retains ownership of its two cached image textures. */
export default function useBusResources() {
  // Texture paille WebP optimisée pour le petit chapeau à l'écran
  const strawMap = useTexture("/textures/straw.webp", (tex) => {
    if (!Array.isArray(tex)) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  });

  // Logo officiel Le Mont Corvo
  const montCorvoTex = useTexture("/textures/montcorvo.png", (tex) => {
    if (!Array.isArray(tex)) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  });

  const mats = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: BLUE,
        metalness: 0.25,
        roughness: 0.18,
      }),
      bodyDark: new THREE.MeshStandardMaterial({
        color: DARK_BLUE,
        metalness: 0.35,
        roughness: 0.35,
      }),
      yellow: new THREE.MeshStandardMaterial({
        color: YELLOW,
        metalness: 0.15,
        roughness: 0.35,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: "#f2f6ff",
        metalness: 0.45,
        roughness: 0.15,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: DARK,
        roughness: 0.85,
      }),
      tire: new THREE.MeshStandardMaterial({
        color: "#18181c",
        roughness: 0.95,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: "#9ec9ff",
        transparent: true,
        opacity: 0.32,
        roughness: 0.04,
        metalness: 0.05,
        depthWrite: false,
      }),
      windowGlass: new THREE.MeshStandardMaterial({
        color: "#9ec9ff", transparent: true, opacity: 0.22,
        roughness: 0.04, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide,
        forceSinglePass: true,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: "#2f323a",
        roughness: 0.9,
      }),
      seat: new THREE.MeshStandardMaterial({
        color: "#b01f28",
        roughness: 0.55,
      }),
      seatFrame: new THREE.MeshStandardMaterial({
        color: "#22252c",
        metalness: 0.7,
        roughness: 0.35,
      }),
      interiorWall: new THREE.MeshStandardMaterial({
        color: "#d4dbe8",
        roughness: 0.75,
      }),
      straw: new THREE.MeshStandardMaterial({
        map: strawMap,
        color: "#fff5d2",
        roughness: 0.78,
        metalness: 0.02,
        side: THREE.FrontSide,
      }),
      band: new THREE.MeshStandardMaterial({
        color: "#e61924",
        roughness: 0.35,
        metalness: 0.05,
        side: THREE.FrontSide,
      }),
      orange: new THREE.MeshStandardMaterial({
        color: "#ff8c00",
        emissive: "#ff7700",
        emissiveIntensity: 2.0,
      }),
      red: new THREE.MeshStandardMaterial({
        color: "#cc1818",
        emissive: "#ff1414",
        emissiveIntensity: 0.8,
      }),
      ceilingLight: new THREE.MeshStandardMaterial({
        color: "#fff8e7",
        emissive: "#fff3cc",
        emissiveIntensity: 1.8,
      }),
    };
  }, [strawMap]);

  useEffect(() => () => {
    Object.values(mats).forEach((material) => material.dispose());
  }, [mats]);

  const { hatGeo, ribbonGeo } = useMemo(() => createStrawHatGeometry(), []);

  const sideLabel = useMemo(
    () =>
      makeLabelTexture({
        text: "LES FOUS DU BUS",
        sub: "GRAND LINE EXPRESS",
        bg: BLUE,
        fg: YELLOW,
      }),
    [],
  );

  const tvOffTex = useMemo(() => makeTvOffTexture(), []);
  const dashTex = useMemo(() => makeDashboardTexture(), []);
  const licensePlateTex = useMemo(() => makeLicensePlateTexture(), []);
  const contactShadowTex = useMemo(() => makeBusContactShadowTexture(), []);

  // Les 5 phrases exactes de la théorie taguées sur le bus
  // 1. Le siècle oublié c'est le présent
  const tagSiecleTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "LE SIÈCLE OUBLIÉ\nC'EST LE PRÉSENT",
        height: 384,
        color: "#fff1a8",
        stroke: "#071952",
        accent: "#ef3340",
        angle: -0.03,
      }),
    [],
  );

  // 2. Barbe Noire est Davy D. Jones
  const tagBarbeNoireTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "BARBE NOIRE EST\nDAVY D. JONES",
        height: 384,
        color: "#f7d6e0",
        stroke: "#3b0a2a",
        accent: "#ff9f1c",
        angle: 0.045,
      }),
    [],
  );

  // 3. Luffy est Nika et Joy Boy
  const tagLuffyNikaTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "LUFFY EST NIKA\nET JOY BOY",
        height: 384,
        color: "#ffdc4a",
        stroke: "#34145f",
        accent: "#22d3ee",
        angle: -0.055,
        decorationWidthScale: 0.65,
      }),
    [],
  );

  // 4. Les ponéglyphes viennent du futur
  const tagPoneglyphesTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "LES PONÉGLYPHES\nVIENNENT DU FUTUR",
        height: 384,
        color: "#baf7d0",
        stroke: "#053d33",
        accent: "#ff6b35",
        angle: 0.06,
      }),
    [],
  );

  // 5. Tout est une question de timing
  const tagTimingTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "TOUT EST UNE QUESTION\nDE TIMING",
        height: 384,
        color: "#bde7ff",
        stroke: "#071f5c",
        accent: "#ff4da6",
        angle: -0.045,
      }),
    [],
  );

  useEffect(() => () => {
    hatGeo.dispose();
    ribbonGeo.dispose();
    sideLabel.dispose();
    tvOffTex.dispose();
    dashTex.dispose();
    licensePlateTex.dispose();
    contactShadowTex.dispose();
    tagSiecleTex.dispose();
    tagBarbeNoireTex.dispose();
    tagLuffyNikaTex.dispose();
    tagPoneglyphesTex.dispose();
    tagTimingTex.dispose();
  }, [
    hatGeo,
    ribbonGeo,
    sideLabel,
    tvOffTex,
    dashTex,
    licensePlateTex,
    contactShadowTex,
    tagSiecleTex,
    tagBarbeNoireTex,
    tagLuffyNikaTex,
    tagPoneglyphesTex,
    tagTimingTex,
  ]);


  return { mats, montCorvoTex, hatGeo, ribbonGeo, sideLabel, tvOffTex, dashTex, licensePlateTex, contactShadowTex, tagSiecleTex, tagBarbeNoireTex, tagLuffyNikaTex, tagPoneglyphesTex, tagTimingTex };
}

export type BusMaterials = ReturnType<typeof useBusResources>["mats"];
