"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PASSENGER_INSTANCED_MATERIALS } from "@/lib/baked-passenger";
import { SCENERY_MATERIALS } from "@/lib/one-piece-scenery";

function createDummyTexture() {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export default function ShaderPrewarmer({ onReady }: { onReady?: () => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const onReadyRef = useRef(onReady);
  useLayoutEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const queueRef = useRef<{
    objects: THREE.Object3D[];
    index: number;
    nextAt: number;
    done: boolean;
    cleanup: () => void;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const dummyTex = createDummyTexture();
    const plainGeo = new THREE.PlaneGeometry(0.01, 0.01);
    const colorGeo = plainGeo.clone();
    const vertexCount = colorGeo.getAttribute("position").count;
    colorGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 3).fill(1), 3),
    );

    const tempMaterials: THREE.Material[] = [];
    const trackTemp = <T extends THREE.Material>(material: T): T => {
      tempMaterials.push(material);
      return material;
    };

    const objects: THREE.Object3D[] = [];
    const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, receiveShadow = false) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = receiveShadow;
      objects.push(mesh);
    };
    const addInstanced = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const instanced = new THREE.InstancedMesh(geo, mat, 1);
      instanced.receiveShadow = false;
      objects.push(instanced);
    };

    // Passagers distants instanciés (vertexColors + costumes texturés + graffitis)
    for (const mat of PASSENGER_INSTANCED_MATERIALS) {
      addInstanced(colorGeo, mat);
    }
    addInstanced(
      plainGeo,
      trackTemp(new THREE.MeshStandardMaterial({
        map: dummyTex,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: false,
        roughness: 0.72,
      })),
    );
    const standardMapped = trackTemp(new THREE.MeshStandardMaterial({ map: dummyTex, roughness: 0.8 }));
    addInstanced(plainGeo, standardMapped);

    // Costumes texturés détaillés, écrans émissifs et surfaces texturées de cabine
    addMesh(
      plainGeo,
      trackTemp(new THREE.MeshStandardMaterial({
        map: dummyTex,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: false,
        roughness: 0.72,
      })),
      false,
    );
    addMesh(
      plainGeo,
      trackTemp(new THREE.MeshStandardMaterial({
        map: dummyTex,
        emissiveMap: dummyTex,
        emissive: "#ffffff",
        roughness: 0.5,
      })),
      false,
    );
    addMesh(plainGeo, standardMapped, false);
    addMesh(plainGeo, standardMapped, true);

    // Matériaux basiques transparents et étiquettes sprites
    addMesh(plainGeo, trackTemp(new THREE.MeshBasicMaterial({ map: dummyTex, transparent: true })), false);
    addMesh(colorGeo, trackTemp(new THREE.MeshBasicMaterial({ vertexColors: true })), false);
    objects.push(new THREE.Sprite(trackTemp(new THREE.SpriteMaterial({
      map: dummyTex,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }))));

    // Variantes de shaders custom d'Elbaf et d'Egghead sans répliquer les matériaux standards identiques
    addMesh(colorGeo, SCENERY_MATERIALS.elbafRainbow, true);
    addMesh(plainGeo, SCENERY_MATERIALS.elbafFalls, true);
    addMesh(plainGeo, SCENERY_MATERIALS.eggTube, true);

    let cleaned = false;
    let signaledReady = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      plainGeo.dispose();
      colorGeo.dispose();
      dummyTex.dispose();
      for (const mat of tempMaterials) mat.dispose();
    };
    const markReady = () => {
      if (!active || signaledReady) return;
      signaledReady = true;
      onReadyRef.current?.();
    };

    const failSafe = window.setTimeout(() => {
      markReady();
    }, 550);

    const hasParallelCompile = Boolean(gl.extensions.get("KHR_parallel_shader_compile"));
    if (hasParallelCompile && typeof gl.compileAsync === "function") {
      const root = new THREE.Group();
      for (const obj of objects) root.add(obj);
      void gl.compileAsync(root, camera, scene).then(() => {
        markReady();
        cleanup();
      });
    } else {
      queueRef.current = {
        objects,
        index: 0,
        nextAt: 0,
        done: false,
        cleanup,
      };
    }

    return () => {
      active = false;
      window.clearTimeout(failSafe);
      queueRef.current = null;
      cleanup();
    };
  }, [camera, gl, scene]);

  useFrame((_, dt) => {
    const queue = queueRef.current;
    if (!queue || queue.done) return;
    const now = performance.now();
    if (now < queue.nextAt) return;
    queue.nextAt = now + (dt > 0.05 ? 32 : 16);

    const batch = new THREE.Group();
    const end = Math.min(queue.objects.length, queue.index + 4);
    for (let i = queue.index; i < end; i++) {
      batch.add(queue.objects[i]);
    }
    gl.compile(batch, camera, scene);
    queue.index = end;

    if (queue.index >= queue.objects.length) {
      queue.done = true;
      onReadyRef.current?.();
      queue.cleanup();
    }
  });

  return null;
}
