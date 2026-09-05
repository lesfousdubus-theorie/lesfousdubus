"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./bus/Scene";
import { computeNumRows } from "./bus/Passengers";
import { YOUTUBE_ID, type Phase, type WorldState } from "./bus/constants";
import { playDing, playHorn, playStretch } from "@/lib/horn";
import TheoryModal from "./TheoryModal";

interface ToastMessage {
  id: number;
  text: string;
  sub?: string;
  badge?: string;
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
  const [hornVisible, setHornVisible] = useState(false);
  const [tvOn, setTvOn] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("phase") === "inside";
    }
    return false;
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTheoryModal, setShowTheoryModal] = useState(false);

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
  const [zone, setZone] = useState(0);
  const [daylight, setDaylight] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState(0.2);
  const [manualDayNight, setManualDayNight] = useState<"day" | "night" | null>(null);

  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const worldRef = useRef<WorldState>({ daylight: 1, timeOfDay: 0.2, zone: 0, scroll: 0 });

  // Références pour les phares automatiques jour / nuit
  const prevIsNight = useRef(false);
  const manualHeadlightsRef = useRef<boolean | null>(null);

  const toggleDayNight = useCallback(() => {
    setManualDayNight(() => {
      const currentlyNight = daylight < 0.4;
      return currentlyNight ? "day" : "night";
    });
  }, [daylight]);

  // Affiche une notification festive
  const showToast = useCallback((text: string, sub?: string, badge?: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    const id = Date.now();
    setToast({ id, text, sub, badge });
    toastTimeout.current = setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 2800);
  }, []);

  // Récupération initiale du nombre réel de passagers depuis l'API
  useEffect(() => {
    fetch("/api/bus-entries")
      .then((r) => r.json())
      .then((d: { count: number }) => setCount(d.count))
      .catch(() => setCount(0));
  }, []);

  // Synchronisation en direct : polling pour voir monter les nouveaux passagers et le bus s'allonger
  useEffect(() => {
    const poll = async () => {
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

    const interval = setInterval(poll, 3500);
    return () => clearInterval(interval);
  }, [showToast]);

  // Synchronise l'état du monde (zone, jour/nuit) et automatise l'allumage des phares la nuit
  useEffect(() => {
    const id = setInterval(() => {
      const { zone: curZone, daylight: curDaylight, timeOfDay: curTime } = worldRef.current;
      setZone(curZone);
      setDaylight(curDaylight);
      setTimeOfDay(curTime);

      const curIsNight = curDaylight < 0.4;
      if (curIsNight !== prevIsNight.current) {
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
    }, 400);
    return () => clearInterval(id);
  }, []);

  const isNight = daylight < 0.4;

  const toggleHeadlights = useCallback(() => {
    setHeadlights((prev) => {
      const next = !prev;
      manualHeadlightsRef.current = next;
      return next;
    });
  }, []);

  // Écoute des changements de plein écran pour garder une synchronisation bidirectionnelle parfaite
  useEffect(() => {
    const handleFsChange = () => {
      const fs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement,
      );
      setIsFullscreen(fs);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
    };
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

  // Entrer dans le bus : incrémente la DB (+1) et active la TV
  const enterBus = useCallback(async () => {
    if (phase !== "outside") return;
    setPhase("entering");
    setTvOn(true);
    setIsPlaying(true);
    playDing();

    // Vérifie si le visiteur a déjà validé sa montée dans cette session de navigation
    const sessionKey = "fdb-has-entered-bus";
    const alreadyEntered = typeof window !== "undefined" && Boolean(sessionStorage.getItem(sessionKey));

    if (!alreadyEntered) {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(sessionKey, "1");
        } catch {
          // ignore
        }
      }

      let visitorId = "";
      try {
        visitorId = localStorage.getItem("fdb-visitor") ?? crypto.randomUUID();
        localStorage.setItem("fdb-visitor", visitorId);
      } catch {
        visitorId = "anon";
      }

      try {
        const r = await fetch("/api/bus-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, amount: 1 }),
        });
        const d = (await r.json()) as { count: number };
        const prevRows = computeNumRows(count ?? 0);
        const nextRows = computeNumRows(d.count);
        if (nextRows > prevRows) {
          playStretch();
          showToast("Bienvenue à bord !", "Le bus s'allonge pour t'accueillir !", "🚌 EXTENSION");
        } else {
          showToast("Bienvenue à bord !", "Tu es maintenant assis dans le bus !", "🎉 NAKAMA");
        }
        setCount(d.count);
      } catch {
        setCount((c) => (c ?? 0) + 1);
      }
    } else {
      showToast("Bon retour à bord !", "Tu reprends ta place dans le bus !", "🚌 NAKAMA");
    }
  }, [phase, count, showToast]);

  // Sortir du bus : le son reste audible de loin (25%), la TV reste allumée
  const exitBus = useCallback(() => {
    if (phase !== "inside") return;
    setIsFullscreen(false);
    setPhase("exiting");
    playDing();
  }, [phase]);

  const onArrived = useCallback((p: "inside" | "outside") => setPhase(p), []);

  const honk = useCallback(() => {
    playHorn();
    setHornPulse(performance.now());
    setHornVisible(true);
    setTimeout(() => setHornVisible(false), 900);
  }, []);

  // Référence pour le temps de lecture de la vidéo pour synchroniser la lecture
  const currentTimeRef = useRef(0);

  // Écoute les événements du lecteur YouTube pour garder le temps courant synchronisé
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.event === "infoDelivery" && data.info) {
          if (typeof data.info.currentTime === "number") {
            currentTimeRef.current = data.info.currentTime;
          }
          if (typeof data.info.playerState === "number") {
            if (data.info.playerState === 1) setIsPlaying(true);
            else if (data.info.playerState === 2 || data.info.playerState === 0) setIsPlaying(false);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const primaryIframe = document.getElementById("tv-primary-iframe") as HTMLIFrameElement | null;
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
    } else if (primaryIframe) {
      try {
        if (primaryIframe.requestFullscreen) {
          await primaryIframe.requestFullscreen();
        } else if ((primaryIframe as any).webkitRequestFullscreen) {
          await (primaryIframe as any).webkitRequestFullscreen();
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    currentTimeRef.current = 0;
    try {
      const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe");
      iframes.forEach((ifr) => {
        ifr.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*",
        );
        ifr.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
          "*",
        );
      });
    } catch {
      // ignore
    }
  }, []);

  // Raccourcis clavier (H = klaxon, L = phares, Escape = quitter plein écran)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") honk();
      if (e.key === "l" || e.key === "L") toggleHeadlights();
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [honk, toggleHeadlights, isFullscreen]);

  const effectiveCount = count ?? 0;
  const numRows = computeNumRows(effectiveCount);
  const busy = phase === "entering" || phase === "exiting";

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
        isPlaying={isPlaying}
        onTogglePlay={togglePlayPause}
        onStop={handleStop}
        onToggleFullscreen={toggleFullscreen}
        isMutedForFullscreen={false}
        modeOverride={manualDayNight}
      />

      {/* ---------- TOAST NOTIFICATION DYNAMIQUE (ALLONGEMENT DU BUS) ---------- */}
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

      {/* ---------- HUD ---------- */}
      {/* Titre + zone (Responsive mobile) */}
      <div className="pointer-events-none absolute left-3 sm:left-4 top-3 sm:top-4 z-50 max-w-[50vw] sm:max-w-[60vw]">
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

      {/* Compteur de passagers & Infos rangées du bus (100% réel, calculé selon la DB) */}
      <div className="absolute right-3 sm:right-4 top-3 sm:top-4 z-50 flex items-center gap-1.5 sm:gap-3 rounded-2xl border border-[#ffd23f]/40 bg-black/60 px-2.5 sm:px-4 py-1 sm:py-2.5 shadow-lg backdrop-blur-md">
        <span className="text-lg sm:text-2xl">🚌</span>
        <div className="leading-tight">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ffd23f]">
              Passagers
            </span>
            <span className="rounded-full bg-white/15 px-1 sm:px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold text-white/90">
              {numRows} r.
            </span>
          </div>
          <div className="text-base sm:text-xl font-black tabular-nums text-white">
            {effectiveCount.toLocaleString("fr-FR")}
          </div>
        </div>
      </div>

      {/* Bouton interactif Jour / Nuit (synchronisé avec la vraie vie par défaut, toggle manuel à tout moment) */}
      <button
        type="button"
        onClick={toggleDayNight}
        title={isNight ? "Passer en mode Jour" : "Passer en mode Nuit"}
        className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-50 flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/25 bg-black/65 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-black/85 hover:border-[#ffd23f]/60 active:scale-95 cursor-pointer"
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

      {/* Klaxon visuel */}
      {hornVisible && (
        <div className="pointer-events-none absolute left-1/2 top-[38%] z-50 -translate-x-1/2 animate-bounce">
          <span className="rotate-[-6deg] inline-block rounded-2xl bg-[#ffd23f] px-6 py-3 text-4xl font-black text-[#0d2190] shadow-[0_8px_0_#b8860b] md:text-6xl">
            TUUUT !!
          </span>
        </div>
      )}

      {/* Navigation entre les rangées & Zoom quand on est à l'intérieur */}
      {phase === "inside" && (
        <div className="absolute top-[4.5rem] sm:top-20 right-3 sm:right-4 z-50 flex flex-col items-end gap-1.5 sm:gap-2">
          {/* Déplacement dans l'allée */}
          <div className="flex items-center gap-1 rounded-2xl border border-white/20 bg-black/65 px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
              disabled={seatRow <= 0}
              className="rounded-lg bg-white/10 px-2 sm:px-2.5 py-1 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-30 active:scale-95"
              title="Rangée précédente"
            >
              ◀
            </button>
            <span className="px-1.5 sm:px-2 text-xs font-bold whitespace-nowrap">
              Rangée <span className="text-[#ffd23f]">{seatRow + 1}</span>/{numRows}
            </span>
            <button
              type="button"
              onClick={() => setSeatRow((r) => Math.min(numRows - 1, r + 1))}
              disabled={seatRow >= numRows - 1}
              className="rounded-lg bg-white/10 px-2 sm:px-2.5 py-1 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-30 active:scale-95"
              title="Rangée suivante"
            >
              ▶
            </button>
          </div>

          {/* Contrôles de zoom */}
          <div className="flex items-center gap-1 rounded-2xl border border-white/20 bg-black/65 px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-lg backdrop-blur-md">
            <span className="text-[11px] sm:text-xs font-bold text-white/80 mr-1">🔍 Zoom</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("bus-zoom", { detail: -7 }))}
              className="rounded-lg bg-white/10 px-2 sm:px-2.5 py-0.5 text-xs font-black text-white transition hover:bg-white/25 active:scale-95"
              title="Zoomer (+)"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("bus-zoom", { detail: +7 }))}
              className="rounded-lg bg-white/10 px-2 sm:px-2.5 py-0.5 text-xs font-black text-white transition hover:bg-white/25 active:scale-95"
              title="Dézoomer (−)"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("bus-zoom-reset"))}
              className="rounded-lg bg-white/10 px-1.5 sm:px-2 py-0.5 text-[10px] font-bold text-white/60 transition hover:bg-white/25 active:scale-95"
              title="Réinitialiser zoom"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Barre de boutons principale */}
      <div className="absolute bottom-16 sm:bottom-6 left-1/2 z-[110] flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 max-w-[95vw] sm:max-w-xl">
        {phase === "outside" || phase === "entering" ? (
          <>
            <HudButton onClick={() => setShowTheoryModal(true)} icon="📜" disabled={busy}>
              Théorie
            </HudButton>
            <HudButton onClick={toggleHeadlights} active={headlights} icon="💡" disabled={busy}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton onClick={honk} icon="📯" disabled={busy}>
              Klaxonner
            </HudButton>
            {tvOn && (
              <HudButton onClick={() => setTvOn(false)} icon="📺" disabled={busy}>
                Éteindre la TV
              </HudButton>
            )}
            <HudButton onClick={enterBus} primary icon="🚪" disabled={busy}>
              {phase === "entering" ? "Installation…" : "Entrer dans le bus"}
            </HudButton>
          </>
        ) : (
          <>
            <HudButton onClick={() => setShowTheoryModal(true)} icon="📜" disabled={busy}>
              Théorie
            </HudButton>
            <HudButton onClick={() => setTvOn((v) => !v)} active={tvOn} icon="📺" disabled={busy}>
              {tvOn ? "Éteindre la TV" : "Allumer la TV"}
            </HudButton>
            {tvOn && (
              <HudButton onClick={toggleFullscreen} active={isFullscreen} icon="⛶" disabled={busy}>
                {isFullscreen ? "Sortir du plein écran" : "Plein écran"}
              </HudButton>
            )}
            <HudButton onClick={toggleHeadlights} active={headlights} icon="💡" disabled={busy}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton onClick={honk} icon="📯" disabled={busy}>
              Klaxon
            </HudButton>
            <HudButton onClick={exitBus} primary icon="🏝️" disabled={busy}>
              {phase === "exiting" ? "Descente…" : "Sortir du bus"}
            </HudButton>
          </>
        )}
      </div>

      {/* Modal interactif complet de la théorie des Fous du Bus */}
      <TheoryModal isOpen={showTheoryModal} onClose={() => setShowTheoryModal(false)} />
    </div>
  );
}

function HudButton({
  children,
  onClick,
  icon,
  primary,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: string;
  primary?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs md:text-sm font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";
  const look = primary
    ? "bg-[#ffd23f] text-[#0d2190] hover:bg-[#ffe066] shadow-[0_5px_0_#b8860b] active:shadow-none active:translate-y-1"
    : active
      ? "bg-[#1636c9] text-white ring-2 ring-[#ffd23f] hover:bg-[#1d44e6]"
      : "bg-black/55 text-white border border-white/25 hover:bg-black/75 hover:border-[#ffd23f]/50";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${look}`}>
      {icon && <span className="text-sm leading-none">{icon}</span>}
      {children}
    </button>
  );
}
