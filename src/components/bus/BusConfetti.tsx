"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUS_FRONT_Z } from "@/lib/bus-layout";
import { CONFETTI_COLORS, createConfettiSeeds, getConfettiZ } from "@/lib/bus-confetti";

/** Un seul draw call, quantité plafonnée indépendamment de la taille du bus. */
export default function BusConfetti({ focusZ, rearZ, lowPower, reducedMotion }: {
  focusZ: number; rearZ: number; lowPower: boolean; reducedMotion: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count=lowPower?120:420;
  const from=BUS_FRONT_Z+.35,to=rearZ-.35;
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const cameraLocal=useMemo(()=>new THREE.Vector3(),[]);
  const seeds=useMemo(()=>createConfettiSeeds(count,to-from),[count,from,to]);
  const started=useRef<number | null>(null);
  const color=useMemo(()=>new THREE.Color(),[]);
  useLayoutEffect(()=>{
    if(!mesh.current)return;
    seeds.forEach((seed,i)=>{
      mesh.current!.setColorAt(i,color.set(CONFETTI_COLORS[i%CONFETTI_COLORS.length]));
      dummy.position.set((seed.x-.5)*2.1, .85+seed.phase*2.2, getConfettiZ(seed,from,to,focusZ));
      dummy.rotation.set(seed.spin,seed.spin*.7,seed.spin*.3);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate=true;
    if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
    // La couche dense suit la caméra dans les bus très longs. Les bornes englobent
    // toute la cabine, y compris les endroits où cette couche peut se déplacer.
    mesh.current.boundingSphere=new THREE.Sphere(
      new THREE.Vector3(0,1.9,(from+to)/2),
      Math.hypot(1.2,1.2,(to-from)/2+.15),
    );
  },[seeds,color,dummy,from,to,focusZ]);
  useFrame(({clock,camera})=>{
    if(reducedMotion||!mesh.current)return;
    if(started.current===null)started.current=clock.elapsedTime;
    const t=clock.elapsedTime-started.current;
    camera.getWorldPosition(cameraLocal);mesh.current.worldToLocal(cameraLocal);
    const inCabin=Math.abs(cameraLocal.x)<1.7&&cameraLocal.y>.45&&cameraLocal.y<3.5&&cameraLocal.z>from-.5&&cameraLocal.z<to+.5;
    const denseFocus=inCabin?cameraLocal.z:focusZ;
    seeds.forEach((seed,i)=>{
      const fall=(seed.phase+t*seed.speed/2.7)%1;
      dummy.position.set((seed.x-.5)*2.0+Math.sin(t*1.8+seed.spin)*.10,3.04-fall*2.32,getConfettiZ(seed,from,to,denseFocus)+Math.sin(t+seed.spin)*.12);
      dummy.rotation.set(seed.spin+t*1.9,seed.spin*.7+t*1.3,seed.spin*.3+t*2.5);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate=true;
  });
  return <instancedMesh name="bus-party-confetti" ref={mesh} args={[undefined,undefined,count]} count={count}>
    <planeGeometry args={[.055,.085]}/>
    <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false}/>
  </instancedMesh>;
}
