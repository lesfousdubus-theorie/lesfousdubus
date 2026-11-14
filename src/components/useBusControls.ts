"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { playBoost, playDing, playHorn } from "@/lib/horn";
import type { Phase, WorldState } from "./bus/constants";

const SPEED_STEPS = [0.3, 0.5, 1, 1.5, 2, 2.5, 3] as const;

/** Commandes du véhicule, avec le moteur 3D comme source de lumière et de météo. */
export function useBusControls(phase: Phase, worldRef: RefObject<WorldState>) {
  const [headlights, setHeadlights] = useState(false);
  const [hornPulse, setHornPulse] = useState(0);
  // Contrôle de la vitesse du bus (vitesse de défilement du monde et rotation des roues)
  const [speedMultiplier, setSpeedMultiplier] = useState(() => {
    if (typeof window !== "undefined") {
      const b = new URLSearchParams(window.location.search).get("boost");
      if (b === "1" || b === "true") return 2.5;
      const s = new URLSearchParams(window.location.search).get("speed");
      if (s) {
        const parsed = parseFloat(s);
        if (!Number.isNaN(parsed) && parsed > 0) return Math.min(3.0, Math.max(0.3, parsed));
      }
    }
    return 1.0;
  });
  const speedRef = useRef(speedMultiplier);

  const [isNight, setIsNight] = useState(false);
  const [manualDayNight, setManualDayNight] = useState<"day" | "night" | null>(null);

  // Références pour les phares automatiques jour / nuit
  const prevIsNight = useRef(false);
  const manualHeadlightsRef = useRef<boolean | null>(null);

  const toggleDayNight = useCallback(() => {
    if (manualDayNight !== null) {
      setManualDayNight(null);
      return;
    }
    const nextMode = isNight ? "day" : "night";
    setManualDayNight(nextMode);
    setIsNight(nextMode === "night");
  }, [isNight, manualDayNight]);

  // Synchronise en continu la vitesse du bus avec le moteur 3D
  useEffect(() => {
    worldRef.current.speedMultiplier = speedMultiplier;
  }, [speedMultiplier, worldRef]);

  // Détection du mode boost via l'URL (?boost=1), sans notification intrusive.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const b = new URLSearchParams(window.location.search).get("boost");
      if (b === "1" || b === "true") {
        const playOnInteraction = () => {
          window.removeEventListener("pointerdown", playOnInteraction);
          window.removeEventListener("keydown", playOnInteraction);
          playBoost();
        };
        window.addEventListener("pointerdown", playOnInteraction, { once: true });
        window.addEventListener("keydown", playOnInteraction, { once: true });
        return () => {
          window.removeEventListener("pointerdown", playOnInteraction);
          window.removeEventListener("keydown", playOnInteraction);
        };
      }
    }
  }, []);

  // Faire accélérer le bus (jusqu'à 3.0x max)
  const accelerateBus = useCallback(() => {
    const next = SPEED_STEPS.find((speed) => speed > speedRef.current + 0.001) ?? SPEED_STEPS.at(-1)!;
    if (next === speedRef.current) return;
    speedRef.current = next;
    setSpeedMultiplier(next);
    if (next >= 2.5) playBoost();
    else playDing();
  }, []);

  // Faire ralentir le bus (jusqu'à 0.3x min)
  const decelerateBus = useCallback(() => {
    const next = SPEED_STEPS.findLast((speed) => speed < speedRef.current - 0.001) ?? SPEED_STEPS[0];
    if (next === speedRef.current) return;
    speedRef.current = next;
    setSpeedMultiplier(next);
    playDing();
  }, []);

  // Ne remonte vers React que le changement jour/nuit, pas les valeurs 3D à chaque tick.
  useEffect(() => {
    const id = setInterval(() => {
      const curDaylight = worldRef.current.daylight;
      const curIsNight = curDaylight < 0.4;
      if (curIsNight !== prevIsNight.current) {
        setIsNight(curIsNight);
        if (curIsNight) {
          // Passage automatique en mode nuit : allumage des phares
          setHeadlights(true);
          manualHeadlightsRef.current = null;
        } else {
          // Retour du jour : extinction automatique des phares sauf si allumés manuellement le jour
          if (manualHeadlightsRef.current !== true) {
            setHeadlights(false);
          }
          manualHeadlightsRef.current = null;
        }
        prevIsNight.current = curIsNight;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [worldRef]);

  const toggleHeadlights = useCallback(() => {
    setHeadlights((prev) => {
      const next = !prev;
      manualHeadlightsRef.current = next;
      return next;
    });
  }, []);

  const honk = useCallback(() => {
    playHorn();
    setHornPulse(performance.now());
  }, []);

  // Les commandes globales restent inactives pendant la saisie, dans les fenêtres
  // et à l'intérieur, où les flèches et +/- contrôlent exclusivement la caméra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.querySelector("[role='dialog']") ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "h" || e.key === "H") honk();
      if (e.key === "l" || e.key === "L") toggleHeadlights();
      if (phase !== "inside" && (e.key === "+" || e.key === "=" || e.key === "ArrowUp")) {
        e.preventDefault();
        accelerateBus();
      }
      if (phase !== "inside" && (e.key === "-" || e.key === "_" || e.key === "ArrowDown")) {
        e.preventDefault();
        decelerateBus();
      }
      if (e.key === "b" || e.key === "B") {
        const boosting = speedRef.current < 2.0;
        const next = boosting ? 2.5 : 1.0;
        speedRef.current = next;
        setSpeedMultiplier(next);
        if (boosting) playBoost();
        else playDing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, honk, toggleHeadlights, accelerateBus, decelerateBus]);

  return {
    headlights, hornPulse, speedMultiplier, isNight, manualDayNight,
    toggleDayNight, accelerateBus, decelerateBus, toggleHeadlights, honk,
  };
}
