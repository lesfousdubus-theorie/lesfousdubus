"use client";
import { useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { emitBusAudioEvent, onBusAudioEvent } from "@/lib/bus-audio";
import { clearPartyDanceClock, partyMusicClock, syncPartyClock, updatePartyDanceFrame } from "@/lib/party-rhythm";

/** Un seul échantillon par image pour tous les danseurs, sans état React à chaque beat. */
export default function PartyMusicClock() {
  useLayoutEffect(() => {
    const stop = onBusAudioEvent("musicPlayback", playback => syncPartyClock(partyMusicClock, playback, performance.now()));
    emitBusAudioEvent("musicSnapshot");
    return () => { stop(); clearPartyDanceClock(); };
  }, []);
  useFrame(() => updatePartyDanceFrame(performance.now()), -10);
  return null;
}
