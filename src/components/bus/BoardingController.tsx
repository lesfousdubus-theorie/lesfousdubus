"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { JOURNEY_MAX_DT, beginJourney, ease, updateJourney, type JourneyState } from "@/lib/bus-journey";
import { getNearestBusDoor } from "@/lib/bus-layout";
import type { Phase, WorldState } from "./constants";

export default function BoardingController({phase,journey,worldRef,seatZ,seatX,numRows,boardingPending=false,reducedMotion}: {
  phase:Phase; journey:React.RefObject<JourneyState>; worldRef:React.RefObject<WorldState>;
  seatZ:number; seatX:number; numRows:number; boardingPending?:boolean; reducedMotion:boolean;
}) {
  const previous=useRef<Phase>(phase);
  const elapsed=useRef(0);
  const resume=useRef(2);
  const stateRef=useRef(journey);
  const departing=useRef({active:false,time:0,z:0,scroll:0});
  useFrame((_,dt)=>{
    const state=stateRef.current.current;
    const cinematic=phase==="entering"||phase==="exiting";
    // L'inscription attribue la vraie place de manière asynchrone. Attendre
    // cette réponse évite de faire apparaître l'avatar devant la mauvaise porte.
    if(phase==="entering" && boardingPending) {
      state.waitingForSeat=true;
      state.avatarVisible=false;
      state.doorOpen=false;
      state.completed=false;
      state.cameraBlend=0;
      state.drive=1;
      state.elapsed=0;
      elapsed.current=0;
      worldRef.current.motionFactor=1;
      return;
    }
    if(previous.current!==phase || state.phase!==phase || state.waitingForSeat) {
      if(previous.current==="exiting"&&phase==="outside")departing.current={active:true,time:0,z:state.position.z,scroll:worldRef.current.scroll};
      if(phase==="entering")departing.current.active=false;
      previous.current=phase; elapsed.current=0;
      if(cinematic)beginJourney(state,phase,seatZ,getNearestBusDoor(seatZ,numRows),seatX);
      else state.waitingForSeat=false;
      if(!cinematic)resume.current=state.drive*2;
    }
    if(cinematic) elapsed.current+=Math.min(dt,JOURNEY_MAX_DT);
    if(reducedMotion&&cinematic&&elapsed.current>=0.6)elapsed.current=phase==="entering"?state.timing.entryDuration:state.timing.exitDuration;
    updateJourney(state,phase,elapsed.current,seatZ,worldRef.current.speedMultiplier,undefined,seatX);
    if(reducedMotion&&cinematic){state.avatarVisible=false;state.drive=0;}
    if(!cinematic) {
      resume.current=Math.min(2,resume.current+Math.min(dt,JOURNEY_MAX_DT));
      state.drive=reducedMotion?1:ease(resume.current/2);
    }
    if(phase==="outside"&&departing.current.active&&!reducedMotion) {
      const leave=departing.current;
      leave.time+=Math.min(dt,JOURNEY_MAX_DT);
      state.avatarVisible=leave.time<2.5;
      state.sitting=0; state.heading=Math.PI/2;
      state.position.set(3.3,0,leave.z+worldRef.current.scroll-leave.scroll);
      if(leave.time>=2.5)leave.active=false;
    }
    worldRef.current.motionFactor=state.drive;
  },-10);
  return null;
}
