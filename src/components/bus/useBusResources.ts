"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { pickLocale, useLocale } from "@/lib/i18n";
import {
  makeDashboardTexture, makeLabelTexture,
  makeLicensePlateTexture, makeTvOffTexture, makeBusContactShadowTexture,
} from "@/lib/textures";
import { createStrawHatGeometry } from "./StrawHatGeometry";

const BLUE = "#154ddb";
const DARK_BLUE = "#0a2a85";
const YELLOW = "#ffbf18";
const DARK = "#12141a";

function createPlaceholderTexture(r: number, g: number, b: number, a = 255): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([r, g, b, a]), 1, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function createPlaceholderCanvasTexture(fillStyle: string | null): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  if (fillStyle) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = fillStyle;
      ctx.fillRect(0, 0, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Owns generated and asynchronously loaded bus resources without blocking Suspense. */
export default function useBusResources() {
  const strawPlaceholder = useMemo(() => createPlaceholderTexture(214, 178, 96), []);
  const montCorvoPlaceholder = useMemo(() => createPlaceholderTexture(14, 24, 48), []);
  const sideLabelPlaceholder = useMemo(() => createPlaceholderCanvasTexture(BLUE), []);
  const tvOffPlaceholder = useMemo(() => createPlaceholderCanvasTexture("#0c101c"), []);
  const dashPlaceholder = useMemo(() => createPlaceholderCanvasTexture("#141822"), []);
  const platePlaceholder = useMemo(() => createPlaceholderCanvasTexture("#ecf0f6"), []);
  const shadowPlaceholder = useMemo(() => createPlaceholderCanvasTexture(null), []);

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
        map: strawPlaceholder,
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
  }, [strawPlaceholder]);

  useEffect(() => () => {
    Object.values(mats).forEach((material) => material.dispose());
  }, [mats]);

  const { hatGeo, ribbonGeo } = useMemo(() => createStrawHatGeometry(), []);

  const locale = useLocale();
  const [montCorvoTex, setMontCorvoTex] = useState<THREE.Texture>(() => montCorvoPlaceholder);
  const [sideLabelReady, setSideLabelReady] = useState(false);
  const [localizedSideLabel, setLocalizedSideLabel] = useState<{ locale: string; tex: THREE.CanvasTexture } | null>(null);
  const sideLabel = localizedSideLabel?.locale === locale ? localizedSideLabel.tex : sideLabelPlaceholder;
  const [tvOffTex, setTvOffTex] = useState<THREE.CanvasTexture>(() => tvOffPlaceholder);
  const [dashTex, setDashTex] = useState<THREE.CanvasTexture>(() => dashPlaceholder);
  const [licensePlateTex, setLicensePlateTex] = useState<THREE.CanvasTexture>(() => platePlaceholder);
  const [contactShadowTex, setContactShadowTex] = useState<THREE.CanvasTexture>(() => shadowPlaceholder);
  const [proceduralStage, setProceduralStage] = useState(0);
  const [strawReady, setStrawReady] = useState(false);
  const [corvoReady, setCorvoReady] = useState(false);

  const stageRef = useRef(0);
  const ownedTexturesRef = useRef<THREE.Texture[]>([]);

  useFrame(() => {
    if (stageRef.current >= 5) return;
    stageRef.current += 1;
    setProceduralStage(stageRef.current);

    switch (stageRef.current) {
      case 1: {
        const tex = makeBusContactShadowTexture();
        ownedTexturesRef.current.push(tex);
        setContactShadowTex(tex);
        break;
      }
      case 2: {
        setSideLabelReady(true);
        break;
      }
      case 3: {
        const tex = makeLicensePlateTexture();
        tex.anisotropy = 4;
        ownedTexturesRef.current.push(tex);
        setLicensePlateTex(tex);
        break;
      }
      case 4: {
        const tex = makeDashboardTexture();
        tex.anisotropy = 4;
        ownedTexturesRef.current.push(tex);
        setDashTex(tex);
        break;
      }
      case 5: {
        const tex = makeTvOffTexture();
        tex.anisotropy = 4;
        ownedTexturesRef.current.push(tex);
        setTvOffTex(tex);
        break;
      }
    }
  });

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];

    loader.load(
      "/textures/straw.webp",
      (tex) => {
        if (!active) {
          tex.dispose();
          return;
        }
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 4;
        loaded.push(tex);
        mats.straw.map = tex;
        mats.straw.needsUpdate = true;
        setStrawReady(true);
      },
      undefined,
      () => {
        if (active) setStrawReady(true);
      },
    );

    loader.load(
      "/textures/montcorvo.png",
      (tex) => {
        if (!active) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 4;
        loaded.push(tex);
        setMontCorvoTex(tex);
        setCorvoReady(true);
      },
      undefined,
      () => {
        if (active) setCorvoReady(true);
      },
    );

    return () => {
      active = false;
      loaded.forEach((tex) => tex.dispose());
    };
  }, [mats]);

  useEffect(() => {
    if (!sideLabelReady) return;
    const tex = makeLabelTexture({
      text: pickLocale(locale, "LES FOUS DU BUS", "THE BUS FOOLS"),
      sub: "GRAND LINE EXPRESS",
      bg: BLUE,
      fg: YELLOW,
    });
    tex.anisotropy = 4;
    const frame = window.requestAnimationFrame(() => setLocalizedSideLabel({ locale, tex }));
    return () => {
      window.cancelAnimationFrame(frame);
      tex.dispose();
    };
  }, [locale, sideLabelReady]);

  useEffect(() => {
    const owned = ownedTexturesRef.current;
    return () => {
      hatGeo.dispose();
      ribbonGeo.dispose();
      strawPlaceholder.dispose();
      montCorvoPlaceholder.dispose();
      sideLabelPlaceholder.dispose();
      tvOffPlaceholder.dispose();
      dashPlaceholder.dispose();
      platePlaceholder.dispose();
      shadowPlaceholder.dispose();
      owned.forEach((tex) => tex.dispose());
    };
  }, [
    hatGeo,
    ribbonGeo,
    strawPlaceholder,
    montCorvoPlaceholder,
    sideLabelPlaceholder,
    tvOffPlaceholder,
    dashPlaceholder,
    platePlaceholder,
    shadowPlaceholder,
  ]);

  const sideLabelDone = localizedSideLabel?.locale === locale;
  const resourcesReady = proceduralStage >= 5 && strawReady && corvoReady && sideLabelDone;
  const resourcesProgress = (proceduralStage / 5) * 0.5 + (strawReady ? 0.2 : 0) + (corvoReady ? 0.2 : 0) + (sideLabelDone ? 0.1 : 0);

  return { mats, montCorvoTex, hatGeo, ribbonGeo, sideLabel, tvOffTex, dashTex, licensePlateTex, contactShadowTex, resourcesReady, resourcesProgress };
}

export type BusMaterials = ReturnType<typeof useBusResources>["mats"];
