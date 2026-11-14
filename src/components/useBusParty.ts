"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Phase } from "./bus/constants";

export function useBusParty({ busVideoPlaying, theoryVideoPlaying, tvOn, hasEntered, phase }: {
  busVideoPlaying: boolean; theoryVideoPlaying: boolean; tvOn: boolean; hasEntered: boolean; phase: Phase;
}) {
  const [partyOn, setPartyOn] = useState(false);
  const [partyDancing,setPartyDancing]=useState(false);
  const activeRef = useRef(false);
  const resumeTvRef = useRef(false);
  const desiredRef = useRef({ busVideoPlaying, theoryVideoPlaying, tvOn, hasEntered, phase });
  useLayoutEffect(()=>{
    const onDance=(event:Event)=>setPartyDancing(activeRef.current && (event as CustomEvent<boolean>).detail===true);
    window.addEventListener("bus-party-dance",onDance);
    return()=>window.removeEventListener("bus-party-dance",onDance);
  },[]);
  useLayoutEffect(() => {
    const previous=desiredRef.current;
    if(activeRef.current&&hasEntered&&tvOn&&(previous.tvOn!==tvOn||previous.hasEntered!==hasEntered||previous.phase!==phase))resumeTvRef.current=true;
    desiredRef.current = { busVideoPlaying, theoryVideoPlaying, tvOn, hasEntered, phase };
  }, [busVideoPlaying, theoryVideoPlaying, tvOn, hasEntered, phase]);

  const stopParty = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setPartyDancing(false);
    const desired = desiredRef.current;
    const suspendedForVideo = desired.theoryVideoPlaying || (resumeTvRef.current && desired.tvOn
      && desired.hasEntered && desired.phase !== "entering");
    // Arrêter la piste de fête avant de rendre le canal sonore à la télévision.
    window.dispatchEvent(new CustomEvent("bus-music-party-toggle", { detail: { enabled: false, suspendedForVideo } }));
    window.dispatchEvent(new CustomEvent("bus-party-audio-focus", { detail: false }));
    setPartyOn(false);
  }, []);
  const toggleParty = useCallback(() => {
    if (activeRef.current) { stopParty(); return; }
    activeRef.current = true;
    setPartyDancing(false);
    resumeTvRef.current = desiredRef.current.busVideoPlaying;
    // Les commandes restent dans le geste utilisateur, même entre racines React.
    window.dispatchEvent(new CustomEvent("bus-party-audio-focus", { detail: true }));
    window.dispatchEvent(new CustomEvent("bus-music-party-toggle", { detail: {
      enabled: true, suspendedForVideo: desiredRef.current.theoryVideoPlaying,
    } }));
    setPartyOn(true);
  }, [stopParty]);
  return { partyOn, partyDancing, toggleParty, stopParty };
}
