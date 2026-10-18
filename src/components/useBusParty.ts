"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Phase } from "./bus/constants";
import { emitBusAudioEvent, getBusAudioOwner, onBusAudioEvent } from "@/lib/bus-audio";

export function useBusParty({ busVideoPlaying, theoryVideoPlaying, tvOn, hasEntered, phase }: {
  busVideoPlaying: boolean; theoryVideoPlaying: boolean; tvOn: boolean; hasEntered: boolean; phase: Phase;
}) {
  const [partyOn, setPartyOn] = useState(false);
  const [partyDancing,setPartyDancing]=useState(false);
  const activeRef = useRef(false);
  const resumeTvRef = useRef(false);
  const desiredRef = useRef({ busVideoPlaying, theoryVideoPlaying, tvOn, hasEntered, phase });
  useLayoutEffect(() => onBusAudioEvent("partyDance", dancing => {
    setPartyDancing(activeRef.current && dancing);
  }), []);
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
    const owner = getBusAudioOwner({
      theoryVideoPlaying: desired.theoryVideoPlaying, partyOn: false, bgmPlaying: false,
      busVideoPlaying: resumeTvRef.current && desired.tvOn && desired.hasEntered && desired.phase !== "entering",
    });
    const suspendedForVideo = owner === "theory" || owner === "tv";
    // Arrêter la piste de fête avant de rendre le canal sonore à la télévision.
    emitBusAudioEvent("partyToggle", { enabled: false, suspendedForVideo });
    emitBusAudioEvent("partyFocus", false);
    setPartyOn(false);
  }, []);
  const toggleParty = useCallback(() => {
    if (activeRef.current) { stopParty(); return; }
    activeRef.current = true;
    setPartyDancing(false);
    resumeTvRef.current = desiredRef.current.busVideoPlaying;
    // Les commandes restent dans le geste utilisateur, même entre racines React.
    emitBusAudioEvent("partyFocus", true);
    const owner = getBusAudioOwner({ ...desiredRef.current, partyOn: true, bgmPlaying: false });
    emitBusAudioEvent("partyToggle", { enabled: true, suspendedForVideo: owner === "theory" });
    setPartyOn(true);
  }, [stopParty]);
  return { partyOn, partyDancing, toggleParty, stopParty };
}
