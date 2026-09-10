"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./bus/Scene";
import { computeNumRows } from "./bus/Passengers";
import { type PassengerProfile, type Phase, type WorldState } from "./bus/constants";
import { playDing, playHorn, playStretch, playBoost } from "@/lib/horn";

const TheoryModal = dynamic(() => import("./TheoryModal"), { ssr: false });

interface ToastMessage {
  id: number;
  text: string;
  sub?: string;
  badge?: string;
}

interface PassengerManifestEntry {
  seatIndex: number;
  displayName: string | null;
}

const THEORY_START_DATE = Date.UTC(2024, 4, 26);
const SPEED_STEPS = [0.3, 0.5, 1, 1.5, 2, 2.5, 3] as const;

function getOrCreateVisitorId(): string {
  try {
    const visitorId = localStorage.getItem("fdb-visitor") ?? crypto.randomUUID();
    localStorage.setItem("fdb-visitor", visitorId);
    return visitorId;
  } catch {
    return crypto.randomUUID();
  }
}

function getTheoryAgeInDays(): number {
  const today = new Date();
  const todayAtMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.max(0, Math.floor((todayAtMidnight - THEORY_START_DATE) / 86_400_000));
}

export default function BusExperience() {
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("phase");
      if (p === "inside") return "inside";
    }
    return "outside";
  });
  const [headlights, setHeadlights] = useState(false);
  const [hornPulse, setHornPulse] = useState(0);
  const [tvOn, setTvOn] = useState(false);

  // Le lecteur est préchargé dès l'arrivée, mais reste en pause et invisible avant l'entrée.
  const [hasEntered, setHasEntered] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("phase");
      if (p === "inside") return true;
    }
    return false;
  });
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [showPassengerList, setShowPassengerList] = useState(false);
  const [showTheoryAge, setShowTheoryAge] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<"name" | "comment">("name");
  const [joinName, setJoinName] = useState("");
  const [joinComment, setJoinComment] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [passengerProfiles, setPassengerProfiles] = useState<PassengerProfile[]>([]);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerProfile | null>(null);
  const [passengerCardLoading, setPassengerCardLoading] = useState(false);
  const [passengerCardError, setPassengerCardError] = useState("");
  const [currentPassengerSeatIndex, setCurrentPassengerSeatIndex] = useState<number | null>(null);
  const [passengerManifest, setPassengerManifest] = useState<PassengerManifestEntry[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestError, setManifestError] = useState("");
  const [manifestNextFrom, setManifestNextFrom] = useState(0);
  const [manifestHasMore, setManifestHasMore] = useState(false);
  const [theoryAgeInDays] = useState(getTheoryAgeInDays);
  const [controlsReady, setControlsReady] = useState(true);

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

  // Compteur initial démarre à 0 si la base est vide (le bus est vide au début)
  const [count, setCount] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const c = new URLSearchParams(window.location.search).get("count");
      if (c !== null) {
        const parsed = parseInt(c, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
      }
    }
    return null;
  });

  const [seatRow, setSeatRow] = useState(() => {
    if (typeof window !== "undefined") {
      const r = new URLSearchParams(window.location.search).get("row");
      if (r !== null) {
        const parsed = parseInt(r, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
      }
    }
    return 3;
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isNight, setIsNight] = useState(false);
  const [manualDayNight, setManualDayNight] = useState<"day" | "night" | null>(null);

  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const controlsReadyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const worldRef = useRef<WorldState>({
    daylight: 1,
    timeOfDay: 0.2,
    zone: 0,
    scroll: 0,
    speedMultiplier: 1.0,
    weather: "clear",
    weatherIntensity: 0,
  });

  // Références pour les phares automatiques jour / nuit
  const prevIsNight = useRef(false);
  const manualHeadlightsRef = useRef<boolean | null>(null);

  const toggleDayNight = useCallback(() => {
    setManualDayNight(isNight ? "day" : "night");
    setIsNight((night) => !night);
  }, [isNight]);

  // Affiche une notification festive
  const showToast = useCallback((text: string, sub?: string, badge?: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    const id = Date.now();
    setToast({ id, text, sub, badge });
    toastTimeout.current = setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 2800);
  }, []);

  // Synchronise en continu la vitesse du bus avec le moteur 3D
  useEffect(() => {
    worldRef.current.speedMultiplier = speedMultiplier;
  }, [speedMultiplier]);

  // Détection du mode boost via l'URL (?boost=1), sans notification intrusive.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const b = new URLSearchParams(window.location.search).get("boost");
      if (b === "1" || b === "true") {
        playBoost();
      }
    }
  }, []);

  // Faire accélérer le bus (jusqu'à 3.0x max)
  const accelerateBus = useCallback(() => {
    setSpeedMultiplier((cur) => {
      const next = SPEED_STEPS.find((speed) => speed > cur + 0.001) ?? SPEED_STEPS.at(-1)!;
      if (next >= 2.5) {
        playBoost();
      } else {
        playDing();
      }
      return next;
    });
  }, []);

  // Faire ralentir le bus (jusqu'à 0.3x min)
  const decelerateBus = useCallback(() => {
    setSpeedMultiplier((cur) => {
      const next = SPEED_STEPS.findLast((speed) => speed < cur - 0.001) ?? SPEED_STEPS[0];
      playDing();
      return next;
    });
  }, []);

  // Récupération initiale du nombre réel de passagers depuis l'API
  useEffect(() => {
    fetch("/api/bus-entries")
      .then((r) => {
        if (!r.ok) throw new Error("Passenger counter unavailable");
        return r.json();
      })
      .then((d: { count: number }) => setCount(d.count))
      .catch(() => setCount(0));
  }, []);

  // Seuls les profils proches de la caméra sont chargés : le compteur peut ainsi
  // grandir sans télécharger des milliers de commentaires à chaque actualisation.
  useEffect(() => {
    if (count === null) return;
    const focusRow = phase === "inside" ? seatRow : 0;
    const from = Math.max(0, (focusRow - 4) * 4);
    const controller = new AbortController();

    fetch(`/api/bus-entries?profiles=1&from=${from}&limit=48`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { passengers?: PassengerProfile[] }) => {
        setPassengerProfiles(data.passengers ?? []);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [count, phase, seatRow]);

  // Synchronisation en direct, ralentie et suspendue quand l'onglet est masqué.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const poll = async () => {
      if (stopped || document.hidden) return;
      try {
        const r = await fetch("/api/bus-entries");
        if (!r.ok) return;
        const d = (await r.json()) as { count: number };
        setCount((prev) => {
          if (prev === null) return d.count;
          if (d.count > prev) {
            const prevRows = computeNumRows(prev);
            const nextRows = computeNumRows(d.count);
            if (nextRows > prevRows) {
              playStretch();
              showToast(
                "Le bus s'allonge !",
                `Nouveaux nakamas à bord ! +${nextRows - prevRows} rangée(s) créée(s)`,
                "🚌 EXTENSION",
              );
            } else {
              showToast(
                "+1 Nakama à bord !",
                `${d.count} passagers voyagent vers Laugh Tale`,
                "⚡ REJOINT",
              );
            }
          }
          return d.count;
        });
      } catch {
        // ignore
      }
    };

    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      if (!document.hidden) {
        timeout = setTimeout(async () => {
          await poll();
          schedule();
        }, 10_000);
      }
    };
    const refresh = () => {
      if (!document.hidden) void poll();
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [showToast]);

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
  }, []);

  const toggleHeadlights = useCallback(() => {
    setHeadlights((prev) => {
      const next = !prev;
      manualHeadlightsRef.current = next;
      return next;
    });
  }, []);

  // Empêche tout scroll de la page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = prev;
    };
  }, []);

  // Entrer immédiatement dans le bus : le profil reste entièrement facultatif.
  const enterBus = useCallback(async () => {
    if (phase !== "outside" || joining) return;
    setJoining(true);
    setHasEntered(true);

    const visitorId = getOrCreateVisitorId();

    try {
      const r = await fetch("/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ visitorId }),
      });
      if (!r.ok) throw new Error("Passenger registration failed");

      const d = (await r.json()) as {
        count: number;
        added: boolean;
        passenger: PassengerProfile | null;
        seatIndex: number | null;
      };
      const prevRows = computeNumRows(count ?? 0);
      const nextRows = computeNumRows(d.count);

      if (!d.added) {
        showToast("Bon retour à bord !", "Tu reprends ta place dans le bus !", "🚌 NAKAMA");
      } else if (nextRows > prevRows) {
        playStretch();
        showToast("Bienvenue à bord !", "Le bus s'allonge pour t'accueillir !", "🚌 EXTENSION");
      } else {
        showToast("Bienvenue à bord !", "Tu es maintenant assis dans le bus !", "🎉 NAKAMA");
      }
      setCount(d.count);
      setCurrentPassengerSeatIndex(d.seatIndex);
      if (d.seatIndex !== null) {
        setSeatRow(Math.min(computeNumRows(d.count) - 1, Math.floor(d.seatIndex / 4)));
      }
      if (d.passenger) {
        setPassengerProfiles((profiles) => [
          ...profiles.filter((profile) => profile.seatIndex !== d.passenger!.seatIndex),
          d.passenger!,
        ]);
      }
      setTvOn(true);
      setPhase("entering");
      playDing();
    } catch {
      setTvOn(true);
      setPhase("entering");
      playDing();
      showToast(
        "Bienvenue à bord !",
        "Le compteur se resynchronisera dès que Cloudflare répondra.",
        "⏳ SYNCHRO",
      );
    } finally {
      setJoining(false);
    }
  }, [phase, joining, count, showToast]);

  const openProfileModal = useCallback((mode: "name" | "comment") => {
    try {
      setJoinName(localStorage.getItem("fdb-display-name") ?? "");
      setJoinComment(localStorage.getItem("fdb-comment") ?? "");
    } catch {
      setJoinName("");
      setJoinComment("");
    }
    setProfileModalMode(mode);
    setJoinError("");
    setShowJoinModal(true);
  }, []);

  const submitProfile = useCallback(async () => {
    const name = joinName.replace(/\s+/g, " ").trim();
    const comment = joinComment.replace(/\s+/g, " ").trim();
    if (profileModalMode === "name" && !name) {
      setJoinError("Choisis un nom à afficher au-dessus de ton personnage.");
      return;
    }
    if (profileModalMode === "comment" && !comment) {
      setJoinError("Écris un petit message avant de l’enregistrer.");
      return;
    }

    setJoining(true);
    setJoinError("");
    try {
      const visitorId = getOrCreateVisitorId();
      const payload =
        profileModalMode === "name"
          ? { visitorId, displayName: name }
          : { visitorId, comment };
      const response = await fetch("/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Profile update failed");
      const data = (await response.json()) as {
        count: number;
        passenger: PassengerProfile | null;
        seatIndex: number | null;
      };

      try {
        if (profileModalMode === "name") localStorage.setItem("fdb-display-name", name);
        if (profileModalMode === "comment") localStorage.setItem("fdb-comment", comment);
      } catch {
        // L'enregistrement D1 reste valide même si le stockage local est bloqué.
      }
      if (data.passenger) {
        setPassengerProfiles((profiles) => [
          ...profiles.filter((profile) => profile.seatIndex !== data.passenger!.seatIndex),
          data.passenger!,
        ]);
        if (profileModalMode === "name") {
          setSeatRow(
            Math.min(computeNumRows(data.count) - 1, Math.floor(data.passenger.seatIndex / 4)),
          );
        }
      }
      setCount(data.count);
      setShowJoinModal(false);
      showToast(
        profileModalMode === "name" ? "Prénom ajouté !" : "Message enregistré !",
        profileModalMode === "name"
          ? "Il apparaît maintenant au-dessus de ton personnage."
          : "Il sera visible lorsqu’on cliquera sur ton personnage.",
        "✅ PROFIL",
      );
    } catch {
      setJoinError("Impossible d’enregistrer pour le moment. Réessaie dans quelques instants.");
    } finally {
      setJoining(false);
    }
  }, [joinComment, joinName, profileModalMode, showToast]);

  const removeProfileField = useCallback(async () => {
    setJoining(true);
    setJoinError("");
    try {
      const visitorId = getOrCreateVisitorId();
      const payload =
        profileModalMode === "name"
          ? { visitorId, displayName: "" }
          : { visitorId, comment: "" };
      const response = await fetch("/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Profile removal failed");
      const data = (await response.json()) as {
        count: number;
        passenger: PassengerProfile | null;
        seatIndex: number | null;
      };

      try {
        localStorage.removeItem(profileModalMode === "name" ? "fdb-display-name" : "fdb-comment");
      } catch {
        // La suppression D1 reste valide même si le stockage local est bloqué.
      }

      setPassengerProfiles((profiles) => {
        if (data.seatIndex === null) return profiles;
        const others = profiles.filter((profile) => profile.seatIndex !== data.seatIndex);
        return data.passenger ? [...others, data.passenger] : others;
      });
      if (profileModalMode === "name") setJoinName("");
      else setJoinComment("");
      setCount(data.count);
      setShowJoinModal(false);
      showToast(
        profileModalMode === "name" ? "Prénom retiré" : "Commentaire retiré",
        profileModalMode === "name"
          ? "Tu gardes ta place dans le bus, sans étiquette publique."
          : "Ton prénom reste affiché, mais ton message a été supprimé.",
        "✓ PROFIL",
      );
    } catch {
      setJoinError("Impossible de supprimer pour le moment. Réessaie dans quelques instants.");
    } finally {
      setJoining(false);
    }
  }, [profileModalMode, showToast]);

  const openPassengerCard = useCallback(async (summary: PassengerProfile) => {
    setSelectedPassenger(summary);
    setPassengerCardError("");
    setPassengerCardLoading(true);

    try {
      const response = await fetch(`/api/bus-entries?seat=${summary.seatIndex}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Passenger unavailable");
      const data = (await response.json()) as { passenger: PassengerProfile };
      setSelectedPassenger(data.passenger);
    } catch {
      setPassengerCardError("Impossible de charger ce message pour le moment.");
    } finally {
      setPassengerCardLoading(false);
    }
  }, []);

  const loadPassengerManifest = useCallback(async (from = 0) => {
    setManifestLoading(true);
    setManifestError("");
    try {
      const response = await fetch(`/api/bus-entries?manifest=1&from=${from}&limit=60`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Passenger manifest unavailable");
      const data = (await response.json()) as {
        count: number;
        passengers: PassengerManifestEntry[];
        nextFrom: number;
        hasMore: boolean;
      };
      setPassengerManifest((current) => from === 0 ? data.passengers : [...current, ...data.passengers]);
      setManifestNextFrom(data.nextFrom);
      setManifestHasMore(data.hasMore);
      setCount(data.count);
    } catch {
      setManifestError("Impossible de charger les passagers pour le moment.");
    } finally {
      setManifestLoading(false);
    }
  }, []);

  const openPassengerManifest = useCallback(() => {
    setShowPassengerList(true);
    void loadPassengerManifest(0);
  }, [loadPassengerManifest]);

  const leaveBusPermanently = useCallback(async () => {
    try {
      const visitorId = getOrCreateVisitorId();
      const response = await fetch("/api/bus-entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ visitorId }),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { count: number; removed: boolean };
      try {
        localStorage.removeItem("fdb-display-name");
        localStorage.removeItem("fdb-comment");
      } catch {
        // La suppression D1 est déjà effective.
      }
      setCount(data.count);
      setPassengerProfiles([]);
      setPassengerManifest([]);
      setSelectedPassenger(null);
      setJoinName("");
      setJoinComment("");
      setTvOn(false);
      setHasEntered(false);
      setCurrentPassengerSeatIndex(null);
      setShowTheoryModal(false);
      setPhase((current) => current === "inside" ? "exiting" : "outside");
      showToast(
        data.removed ? "Place supprimée" : "Aucune place à supprimer",
        data.removed ? "Tu as quitté définitivement le bus." : "Tu n’étais pas enregistré comme passager.",
        "👋 BUS",
      );
      return true;
    } catch {
      return false;
    }
  }, [showToast]);

  // Sortir du bus : le son reste audible de loin (25%), la TV reste allumée
  const exitBus = useCallback(() => {
    if (phase !== "inside") return;
    setPhase("exiting");
    playDing();
  }, [phase]);

  const onArrived = useCallback((p: "inside" | "outside") => {
    setPhase(p);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setControlsReady(true);
      return;
    }
    setControlsReady(false);
    if (controlsReadyTimeout.current) clearTimeout(controlsReadyTimeout.current);
    controlsReadyTimeout.current = setTimeout(() => setControlsReady(true), 320);
  }, []);

  useEffect(() => () => {
    if (controlsReadyTimeout.current) clearTimeout(controlsReadyTimeout.current);
  }, []);

  const honk = useCallback(() => {
    playHorn();
    setHornPulse(performance.now());
  }, []);

  // Raccourcis clavier (H = klaxon, L = phares, +/↑ = accélérer, -/↓ = ralentir, B = boost)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Évite les raccourcis si l'utilisateur est dans un input (recherche du modal)
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "h" || e.key === "H") honk();
      if (e.key === "l" || e.key === "L") toggleHeadlights();
      if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
        e.preventDefault();
        accelerateBus();
      }
      if (e.key === "-" || e.key === "_" || e.key === "ArrowDown") {
        e.preventDefault();
        decelerateBus();
      }
      if (e.key === "b" || e.key === "B") {
        setSpeedMultiplier((cur) => {
          if (cur < 2.0) {
            playBoost();
            return 2.5;
          } else {
            playDing();
            return 1.0;
          }
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [honk, toggleHeadlights, accelerateBus, decelerateBus]);

  const effectiveCount = count ?? 0;
  const numRows = computeNumRows(effectiveCount);
  const busy = phase === "entering" || phase === "exiting";
  const exteriorControlsVisible = phase === "outside" || phase === "entering";
  const interiorControlsVisible = phase === "inside" || phase === "exiting";

  return (
    <div className="fixed inset-0 h-dvh w-screen overflow-hidden select-none bg-[#79c2ff] text-white">
      <Scene
        phase={phase}
        headlights={headlights}
        hornPulse={hornPulse}
        tvOn={tvOn}
        worldRef={worldRef}
        onArrived={onArrived}
        onToggleTv={() => setTvOn((v) => !v)}
        passengerCount={effectiveCount}
        currentSeatRow={seatRow}
        isMutedForFullscreen={false}
        hasEntered={hasEntered}
        passengerProfiles={passengerProfiles}
        currentPassengerSeatIndex={currentPassengerSeatIndex}
        onPassengerSelect={openPassengerCard}
        modeOverride={manualDayNight}
      />

      {/* ---------- HUD & INTERFACE UTILISATEUR (GARANTI TOUJOURS AU PREMIER PLAN Z-INDEX) ---------- */}
      {!showTheoryModal && !showJoinModal && !showPassengerList && !showTheoryAge && !selectedPassenger && (
        <div
          className="pointer-events-none fixed inset-0 isolate select-none"
          style={{ zIndex: 2147483647 }}
        >
        {/* Toast notification dynamique (allongement du bus) */}
        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-20 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 rounded-2xl border border-[#ffd23f] bg-black/80 px-5 py-3 shadow-[0_0_30px_rgba(255,210,63,0.35)] backdrop-blur-md">
              {toast.badge && (
                <span className="rounded-md bg-[#ffd23f] px-2 py-0.5 text-xs font-black text-[#0d2190]">
                  {toast.badge}
                </span>
              )}
              <div>
                <div className="text-base font-black text-white">{toast.text}</div>
                {toast.sub && <div className="text-xs text-[#ffd23f] font-semibold">{toast.sub}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Titre + zone (Responsive mobile) */}
        <div className="pointer-events-none absolute left-3 sm:left-4 top-3 sm:top-4 max-w-[50vw] sm:max-w-[60vw]">
          <h1 className="font-black uppercase leading-[1.08] tracking-tight drop-shadow-[0_3px_0_rgba(0,0,0,0.55)] text-sm sm:text-2xl md:text-3xl">
            <span className="text-[#ffd23f]">La Théorie</span> <br className="sm:hidden" />
            <span className="text-white">des Fous du Bus</span>
          </h1>
          <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#ffd23f] drop-shadow md:text-sm">
            LE SIÈCLE OUBLIÉ EST LE PRÉSENT !!!
          </p>
          <div className="mt-2 sm:mt-3">
            <button
              type="button"
              onClick={() => setShowTheoryModal(true)}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#ffd23f]/50 bg-black/60 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-black uppercase text-[#ffd23f] shadow-lg backdrop-blur-md transition hover:bg-[#ffd23f] hover:text-[#0d2190] hover:border-white active:scale-95 cursor-pointer"
              title="Découvrir la théorie des Fous du Bus"
            >
              <span>📜</span>
              <span>La Théorie</span>
            </button>
          </div>
        </div>

        {/* Compteurs des passagers et des jours écoulés depuis la naissance de la théorie */}
        <div className="pointer-events-auto absolute right-3 top-3 flex items-stretch gap-1 rounded-2xl border border-[#ffd23f]/40 bg-black/60 p-1 shadow-lg backdrop-blur-md sm:right-4 sm:top-4">
          <button type="button" onClick={openPassengerManifest} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-left leading-tight transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-px hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_rgba(255,210,63,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] motion-reduce:transform-none motion-reduce:transition-none sm:gap-2.5 sm:px-3 sm:py-2">
            <span className="text-lg transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 motion-reduce:transform-none sm:text-2xl">🚌</span>
            <span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[#ffd23f] sm:text-[10px]">
                  Passagers
                </span>
                <span className="rounded-full bg-white/15 px-1 text-[8px] font-bold text-white/90 sm:px-1.5 sm:text-[9px]">
                  {numRows} r.
                </span>
              </span>
              <span className="block text-base font-black tabular-nums text-white sm:text-xl">
                {effectiveCount.toLocaleString("fr-FR")}
              </span>
            </span>
          </button>
          <div className="my-1 w-px bg-white/20" aria-hidden="true" />
          <button type="button" onClick={() => setShowTheoryAge(true)} className="rounded-xl px-2 py-1.5 text-left leading-tight transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-px hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_rgba(255,210,63,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] motion-reduce:transform-none motion-reduce:transition-none sm:px-3 sm:py-2" title="Voir le compteur précis depuis le 26 mai 2024">
            <span className="block text-[8px] font-semibold uppercase tracking-[0.12em] text-[#ffd23f] sm:text-[10px]">
              La théorie existe depuis
            </span>
            <span className="block text-base font-black tabular-nums text-white sm:text-xl">
              {theoryAgeInDays.toLocaleString("fr-FR")}
              <span className="ml-1 text-[9px] font-bold uppercase text-white/70 sm:text-xs">jours</span>
            </span>
          </button>
        </div>

        {/* Bouton interactif Jour / Nuit */}
        <button
          type="button"
          onClick={toggleDayNight}
          title={isNight ? "Passer en mode Jour" : "Passer en mode Nuit"}
          className="pointer-events-auto absolute bottom-3 sm:bottom-4 left-3 sm:left-4 flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/25 bg-black/65 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-black/85 hover:border-[#ffd23f]/60 active:scale-95 cursor-pointer"
        >
          {isNight ? (
            <svg className="h-4 w-4 text-[#ffd23f]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-[#ffd23f]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span>{isNight ? "Nuit" : "Jour"}</span>
          <span className="text-white/50 text-[10px] sm:text-xs">· Changer</span>
        </button>

        {/* Contrôleur de vitesse du bus : Boutons interactifs Ralentir & Accélérer */}
        <div className="pointer-events-auto absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center gap-1 sm:gap-1.5 rounded-full border border-white/25 bg-black/65 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={decelerateBus}
            disabled={speedMultiplier <= 0.3}
            aria-label="Ralentir le bus"
            className="flex w-[76px] items-center justify-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-white transition hover:bg-white/25 active:scale-95 disabled:cursor-default disabled:opacity-30 sm:w-[90px] sm:px-2.5"
            title="Ralentir le bus (Touche - ou Flèche Bas)"
          >
            <span>🐢</span>
            <span>Ralentir</span>
          </button>

          <div className="flex w-[68px] shrink-0 items-center justify-center gap-1 px-1 font-black tabular-nums sm:w-[76px] sm:px-1.5">
            <span
              className={
                speedMultiplier >= 2.0
                  ? "text-[#ffd23f]"
                  : speedMultiplier <= 0.5
                    ? "text-[#38bdf8]"
                    : "text-white"
              }
            >
              {speedMultiplier.toFixed(1)}x
            </span>
            {speedMultiplier >= 2.0 && (
              <span className="rounded bg-[#ffd23f] px-1 py-0.5 text-[8px] sm:text-[9px] font-black uppercase text-[#0d2190]">
                Boost
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={accelerateBus}
            disabled={speedMultiplier >= 3.0}
            aria-label="Accélérer le bus"
            className="flex w-[76px] items-center justify-center gap-1 rounded-full bg-[#ffd23f]/25 px-2 py-1 text-xs font-black text-[#ffd23f] transition hover:bg-[#ffd23f]/40 active:scale-95 disabled:cursor-default disabled:opacity-30 sm:w-[90px] sm:px-2.5"
            title="Accélérer le bus (Touche + ou Flèche Haut / Boost)"
          >
            <span>⚡</span>
            <span>Accélérer</span>
          </button>
        </div>

        {/* Navigation entre les rangées quand on est à l'intérieur */}
        {phase === "inside" && (
          <div className="pointer-events-auto absolute right-3 top-[5.5rem] flex flex-col items-end gap-1.5 sm:right-4 sm:top-[6.25rem] sm:gap-2">
            {/* Déplacement dans l'allée */}
            <div className="flex h-10 items-center gap-1 rounded-2xl border border-white/20 bg-black/65 px-2.5 shadow-lg backdrop-blur-md sm:px-3">
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
                disabled={seatRow <= 0}
                className="grid h-7 w-8 place-items-center rounded-lg bg-white/10 p-0 text-xs font-bold leading-none text-white transition hover:bg-white/25 disabled:opacity-30 active:scale-95 cursor-pointer sm:w-9"
                title="Rangée précédente"
              >
                ◀
              </button>
              <span className="flex h-7 items-center px-1.5 text-xs font-bold leading-none whitespace-nowrap sm:px-2">
                <span>Rangée</span>
                <span className="ml-1 text-[#ffd23f]">{seatRow + 1}</span>
                <span className="mx-0.5 text-white/55">/</span>
                <span>{numRows}</span>
              </span>
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.min(numRows - 1, r + 1))}
                disabled={seatRow >= numRows - 1}
                className="grid h-7 w-8 place-items-center rounded-lg bg-white/10 p-0 text-xs font-bold leading-none text-white transition hover:bg-white/25 disabled:opacity-30 active:scale-95 cursor-pointer sm:w-9"
                title="Rangée suivante"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* Barres persistantes : aucune commande ne se téléporte sous le pointeur. */}
        <div
          aria-hidden={!exteriorControlsVisible}
          className={`absolute bottom-3 left-1/2 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 px-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:bottom-4 sm:max-w-3xl sm:gap-2 md:left-[calc(50%-4.75rem)] ${
            exteriorControlsVisible
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          <HudButton className="w-[96px] sm:w-[108px]" onClick={toggleHeadlights} active={headlights} icon="💡" disabled={busy || !controlsReady || !exteriorControlsVisible}>
            {headlights ? "Éteindre" : "Phares"}
          </HudButton>
          <HudButton className="w-[104px] sm:w-[112px]" onClick={honk} icon="📯" disabled={busy || !controlsReady || !exteriorControlsVisible}>
            Klaxonner
          </HudButton>
          {tvOn && exteriorControlsVisible && (
            <div className="absolute bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 animate-[hud-control-in_220ms_cubic-bezier(0.25,1,0.5,1)_both] motion-reduce:animate-none">
              <HudButton className="w-[124px] sm:w-[132px]" onClick={() => setTvOn(false)} icon="📺" disabled={busy || !controlsReady}>
                Éteindre la TV
              </HudButton>
            </div>
          )}
          <HudButton className="w-[184px] sm:w-[190px]" onClick={() => void enterBus()} primary icon="🚪" disabled={busy || joining || !controlsReady || !exteriorControlsVisible}>
            {joining || phase === "entering" ? "Installation…" : "Entrer dans le bus"}
          </HudButton>
        </div>

        <div
          aria-hidden={!interiorControlsVisible}
          className={`absolute bottom-16 left-1/2 flex w-[512px] max-w-[95vw] -translate-x-1/2 flex-col items-center justify-center gap-1.5 px-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:gap-2 ${
            interiorControlsVisible
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2">
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("name")} icon="🏷️" disabled={busy || !controlsReady || !interiorControlsVisible}>
              Ajouter un prénom
            </HudButton>
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("comment")} icon="💬" disabled={busy || !controlsReady || !interiorControlsVisible}>
              Mettre un commentaire
            </HudButton>
          </div>
          <div className="grid w-full grid-cols-4 items-center gap-1.5 sm:gap-2">
            <HudButton className="min-w-0 w-full px-2" onClick={() => setTvOn((v) => !v)} active={tvOn} icon="📺" disabled={busy || !controlsReady || !interiorControlsVisible}>
              {tvOn ? "Éteindre la TV" : "Allumer la TV"}
            </HudButton>
            <HudButton className="min-w-0 w-full px-2" onClick={toggleHeadlights} active={headlights} icon="💡" disabled={busy || !controlsReady || !interiorControlsVisible}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton className="min-w-0 w-full px-2" onClick={honk} icon="📯" disabled={busy || !controlsReady || !interiorControlsVisible}>
              Klaxon
            </HudButton>
            <HudButton className="min-w-0 w-full px-2" onClick={exitBus} primary icon="🏝️" disabled={busy || !controlsReady || !interiorControlsVisible}>
              {phase === "exiting" ? "Descente…" : "Sortir du bus"}
            </HudButton>
          </div>
        </div>
        </div>
      )}

      {/* Modal interactif complet de la théorie des Fous du Bus */}
      <TheoryModal
        isOpen={showTheoryModal}
        onClose={() => setShowTheoryModal(false)}
        onLeaveBusPermanently={leaveBusPermanently}
      />
      <JoinBusModal
        isOpen={showJoinModal}
        mode={profileModalMode}
        name={joinName}
        comment={joinComment}
        error={joinError}
        joining={joining}
        onNameChange={setJoinName}
        onCommentChange={setJoinComment}
        onClose={() => setShowJoinModal(false)}
        onSubmit={() => void submitProfile()}
        onRemove={() => void removeProfileField()}
      />
      <PassengerCard
        passenger={selectedPassenger}
        loading={passengerCardLoading}
        error={passengerCardError}
        onClose={() => setSelectedPassenger(null)}
      />
      <PassengerListModal
        isOpen={showPassengerList}
        count={effectiveCount}
        passengers={passengerManifest}
        loading={manifestLoading}
        error={manifestError}
        hasMore={manifestHasMore}
        onLoadMore={() => void loadPassengerManifest(manifestNextFrom)}
        onPassengerClick={(passenger) => {
          setShowPassengerList(false);
          void openPassengerCard({ ...passenger, displayName: passenger.displayName!, comment: null });
        }}
        onClose={() => setShowPassengerList(false)}
      />
      <TheoryAgeModal isOpen={showTheoryAge} onClose={() => setShowTheoryAge(false)} />
    </div>
  );
}

function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fermer"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.03] hover:border-[#ffd23f] hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <svg aria-hidden="true" className="block h-4 w-4" viewBox="0 0 16 16" fill="none">
        <path d="M3.25 3.25 12.75 12.75M12.75 3.25 3.25 12.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function JoinBusModal({
  isOpen,
  mode,
  name,
  comment,
  error,
  joining,
  onNameChange,
  onCommentChange,
  onClose,
  onSubmit,
  onRemove,
}: {
  isOpen: boolean;
  mode: "name" | "comment";
  name: string;
  comment: string;
  error: string;
  joining: boolean;
  onNameChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRemove: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 p-3 backdrop-blur-md sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-bus-title"
        className="my-auto w-full max-w-[34rem] overflow-hidden rounded-[1.5rem] border border-[#ffd23f]/60 bg-[#081127] text-white shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-start justify-between gap-5 border-b border-white/10 bg-gradient-to-r from-[#102a75] to-[#081127] px-5 py-5 sm:px-6 sm:py-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex rounded-full bg-[#ffd23f] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0a216f]">
              Ton profil de passager
            </div>
            <h2 id="join-bus-title" className="text-2xl font-black leading-tight sm:text-3xl">
              {mode === "name"
                ? name.trim() ? "Modifie ton prénom" : "Ajoute ton prénom"
                : comment.trim() ? "Modifie ton commentaire" : "Laisse un commentaire"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#d8e3ff]">
              {mode === "name"
                ? "Il sera affiché au-dessus de ton personnage dans le bus."
                : "Partage un petit mot sur la théorie avec les autres passagers."}
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <form
          className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {mode === "name" ? (
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-white">
                Nom ou pseudo <span className="text-xs font-semibold text-[#ffd23f]">24 caractères max.</span>
              </span>
              <input
                autoFocus
                required
                maxLength={24}
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Ex. NakamaBasque"
                className="w-full select-text rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-base text-white outline-none placeholder:text-[#9aabd2] focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/25"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-white">
                Ton message <span className="text-xs font-semibold text-[#ffd23f]">180 caractères max.</span>
              </span>
              <textarea
                autoFocus
                required
                maxLength={180}
                rows={4}
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder="Ex. Trop bien, vive la théorie !"
                className="w-full resize-none select-text rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-base leading-relaxed text-white outline-none placeholder:text-[#9aabd2] focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/25"
              />
              <span className="mt-1.5 block text-right text-xs font-semibold tabular-nums text-[#aebde0]">
                {comment.length}/180
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">
              {error}
            </p>
          )}

          {mode === "name" && (
            <p className="text-xs leading-relaxed text-[#aebde0]">
              Ton nom sera visible publiquement dans le bus.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={joining}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-base font-black text-[#09216d] shadow-[0_5px_0_#a87500] transition hover:bg-[#ffe271] active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-65"
            >
              <span aria-hidden="true">{mode === "name" ? "🏷️" : "💬"}</span>
              {joining ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              disabled={joining}
              onClick={onRemove}
              className="min-h-12 rounded-xl border border-red-300/45 bg-red-950/35 px-4 py-3 text-sm font-black text-red-100 transition hover:border-red-200 hover:bg-red-900/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-wait disabled:opacity-65"
            >
              {mode === "name" ? "Retirer mon prénom" : "Retirer mon commentaire"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PassengerCard({
  passenger,
  loading,
  error,
  onClose,
}: {
  passenger: PassengerProfile | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!passenger) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, passenger]);

  if (!passenger) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] grid place-items-center bg-[#020617]/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="passenger-name"
        className="w-full max-w-md rounded-[1.5rem] border border-[#ffd23f]/65 bg-[#081127] p-5 text-white shadow-[0_25px_80px_rgba(0,0,0,0.65)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd23f]">Passager du bus</p>
            <h2 id="passenger-name" className="mt-1 break-words text-2xl font-black leading-tight">
              {passenger.displayName}
            </h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.07] p-4">
          {loading ? (
            <div className="flex min-h-16 items-center gap-3" role="status" aria-live="polite">
              <span
                aria-hidden="true"
                className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-[#d8e3ff]/25 border-t-[#ffd23f] motion-reduce:animate-none"
              />
              <p className="text-sm font-semibold text-[#d8e3ff]">Chargement de son message…</p>
            </div>
          ) : error ? (
            <p role="alert" className="text-sm font-semibold text-red-200">{error}</p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-[#eef3ff]">
              {passenger.comment || "Ce passager n’a pas laissé de message."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function PassengerListModal({
  isOpen,
  count,
  passengers,
  loading,
  error,
  hasMore,
  onLoadMore,
  onPassengerClick,
  onClose,
}: {
  isOpen: boolean;
  count: number;
  passengers: PassengerManifestEntry[];
  loading: boolean;
  error: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onPassengerClick: (passenger: PassengerManifestEntry) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-[#020617]/30 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="passenger-list-title" className="flex max-h-[72dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/50 bg-[#081127]/95 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd23f]">Le convoi</p>
            <h2 id="passenger-list-title" className="mt-0.5 text-xl font-black">{count.toLocaleString("fr-FR")} passagers</h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="overflow-y-auto overscroll-contain p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {passengers.map((passenger) => passenger.displayName ? (
              <button key={passenger.seatIndex} type="button" onClick={() => onPassengerClick(passenger)} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/12 bg-white/[0.055] px-3 text-left transition hover:border-[#ffd23f]/55 hover:bg-[#ffd23f]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffd23f]/15 text-sm">👤</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{passenger.displayName}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Place {passenger.seatIndex + 1}</span>
                </span>
              </button>
            ) : (
              <div key={passenger.seatIndex} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-white/55">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-sm">👤</span>
                <span>
                  <span className="block text-sm font-bold">Anonyme</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Place {passenger.seatIndex + 1}</span>
                </span>
              </div>
            ))}
          </div>
          {loading && <div className="flex min-h-20 items-center justify-center gap-3 text-sm font-bold text-white/70"><span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#ffd23f]" /> Chargement…</div>}
          {error && <p role="alert" className="p-4 text-center text-sm font-bold text-red-200">{error}</p>}
          {!loading && hasMore && <button type="button" onClick={onLoadMore} className="mt-4 min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] text-sm font-black text-white transition hover:border-[#ffd23f]/50 hover:bg-white/10">Afficher plus de passagers</button>}
          {!loading && !error && passengers.length === 0 && <p className="p-8 text-center text-sm text-white/60">Le bus attend son premier passager.</p>}
        </div>
      </section>
    </div>
  );
}

function TheoryAgeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const elapsed = getElapsedCalendarTime(THEORY_START_DATE, now);
  const values = [
    ["Années", elapsed.years],
    ["Mois", elapsed.months],
    ["Jours", elapsed.days],
    ["Heures", elapsed.hours],
    ["Minutes", elapsed.minutes],
    ["Secondes", elapsed.seconds],
  ] as const;

  return (
    <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-[#020617]/30 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="theory-age-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#ffd23f]/55 bg-[#081127]/96 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd23f]">Première mention de la théorie</p>
            <h2 id="theory-age-title" className="mt-1 text-xl font-black sm:text-2xl">26 mai 2024 <span className="text-[#b9c7e8]">· Le Mont Corvo</span></h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="p-5 sm:p-6">
          <p className="mb-3 text-sm font-bold text-[#d8e3ff]">La théorie tient toujours depuis :</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {values.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <div className="break-all text-lg font-black tabular-nums text-white sm:text-xl">{value.toLocaleString("fr-FR")}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#ffd23f]">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-[#ffd23f]/30 bg-[#ffd23f]/10 px-4 py-3 text-center text-sm font-black text-[#ffe88d]">
            Toujours pas débunk.
          </p>
        </div>
      </section>
    </div>
  );
}

function getElapsedCalendarTime(startTimestamp: number, endTimestamp: number) {
  const start = new Date(startTimestamp);
  const end = new Date(Math.max(startTimestamp, endTimestamp));
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let cursor = new Date(startTimestamp);
  cursor.setUTCFullYear(start.getUTCFullYear() + years);
  if (cursor.getTime() > end.getTime()) {
    years -= 1;
    cursor = new Date(startTimestamp);
    cursor.setUTCFullYear(start.getUTCFullYear() + years);
  }

  let months = (end.getUTCFullYear() - cursor.getUTCFullYear()) * 12
    + end.getUTCMonth() - cursor.getUTCMonth();
  const monthCursor = new Date(cursor);
  monthCursor.setUTCMonth(cursor.getUTCMonth() + months);
  if (monthCursor.getTime() > end.getTime()) {
    months -= 1;
    monthCursor.setTime(cursor.getTime());
    monthCursor.setUTCMonth(cursor.getUTCMonth() + months);
  }

  let remainingSeconds = Math.floor((end.getTime() - monthCursor.getTime()) / 1000);
  const days = Math.floor(remainingSeconds / 86_400);
  remainingSeconds %= 86_400;
  const hours = Math.floor(remainingSeconds / 3_600);
  remainingSeconds %= 3_600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return { years, months, days, hours, minutes, seconds };
}

function HudButton({
  children,
  onClick,
  icon,
  primary,
  active,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: string;
  primary?: boolean;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs md:text-sm font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
  const look = primary
    ? "bg-[#ffd23f] text-[#0d2190] hover:bg-[#ffe066] shadow-[0_5px_0_#b8860b] active:shadow-none active:translate-y-1"
    : active
      ? "bg-[#1636c9] text-white ring-2 ring-[#ffd23f] hover:bg-[#1d44e6]"
      : "bg-black/55 text-white border border-white/25 hover:bg-black/75 hover:border-[#ffd23f]/50";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${look} ${className}`}>
      {icon && <span className="text-sm leading-none">{icon}</span>}
      {children}
    </button>
  );
}
