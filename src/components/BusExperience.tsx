"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./bus/Scene";
import { ZONES } from "./bus/World";
import { computeNumRows } from "./bus/Passengers";
import { YOUTUBE_ID, type Phase, type WorldState } from "./bus/constants";
import { playDing, playHorn, playStretch } from "@/lib/horn";

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

  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const worldRef = useRef<WorldState>({ daylight: 1, timeOfDay: 0.2, zone: 0, scroll: 0 });

  // Références pour les phares automatiques jour / nuit
  const prevIsNight = useRef(false);
  const manualHeadlightsRef = useRef<boolean | null>(null);

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

  // Référence pour le temps de lecture de la vidéo pour synchroniser petite TV et plein écran
  const currentTimeRef = useRef(0);
  const [fullscreenStartSeconds, setFullscreenStartSeconds] = useState(0);

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
    if (isFullscreen || Boolean(document.fullscreenElement)) {
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
      setIsFullscreen(false);
      // Synchroniser le temps sur le lecteur TV 3D
      try {
        const primaryIframe = document.getElementById("tv-primary-iframe") as HTMLIFrameElement;
        if (primaryIframe?.contentWindow) {
          primaryIframe.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "seekTo",
              args: [currentTimeRef.current, true],
            }),
            "*",
          );
          if (isPlaying) {
            primaryIframe.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*",
            );
          }
        }
      } catch {
        // ignore
      }
    } else {
      setFullscreenStartSeconds(Math.max(0, Math.floor(currentTimeRef.current)));
      setIsFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // ignore
      }
    }
  }, [isFullscreen, isPlaying]);

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
  const hours = Math.floor(((timeOfDay + 0.25) % 1) * 24);
  const minutes = Math.floor(((((timeOfDay + 0.25) % 1) * 24) % 1) * 60);
  const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const currentZone = ZONES[zone] ?? ZONES[0];
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
        isMutedForFullscreen={isFullscreen}
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
      {/* Titre + zone */}
      <div className="pointer-events-none absolute left-4 top-4 z-50 max-w-[60vw]">
        <h1 className="font-black uppercase leading-none tracking-tight drop-shadow-[0_3px_0_rgba(0,0,0,0.55)] text-[clamp(1.4rem,3.2vw,2.6rem)]">
          <span className="text-[#ffd23f]">La Théorie</span> <span className="text-white">des Fous du Bus</span>
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 drop-shadow md:text-sm">
          Un voyage One Piece jusqu&apos;à Laugh Tale
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 backdrop-blur-md">
          <span className="text-lg">🧭</span>
          <div className="leading-tight">
            <div className="text-sm font-bold">{currentZone.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/70">{currentZone.subtitle}</div>
          </div>
        </div>
      </div>

      {/* Compteur de passagers & Infos rangées du bus (100% réel, calculé selon la DB) */}
      <div className="absolute right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border border-[#ffd23f]/40 bg-black/60 px-4 py-2.5 shadow-lg backdrop-blur-md">
        <span className="text-2xl">🚌</span>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffd23f]">
              Passagers montés
            </span>
            <span className="rounded-full bg-white/15 px-1.5 py-0.2 text-[9px] font-bold text-white/90">
              {numRows} rangées
            </span>
          </div>
          <div className="text-xl font-black tabular-nums text-white">
            {effectiveCount.toLocaleString("fr-FR")}
          </div>
        </div>
      </div>

      {/* Jour / nuit */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-sm backdrop-blur-md">
        <span className="text-lg">{isNight ? "🌙" : daylight < 0.75 ? "🌇" : "☀️"}</span>
        <span className="font-mono font-semibold tabular-nums">{clock}</span>
        <span className="text-white/60">{isNight ? "Nuit sur Grand Line" : "Jour sur Grand Line"}</span>
        {isNight && !headlights && phase === "outside" && (
          <span className="ml-1 animate-pulse text-[#ffd23f]">— allume les phares !</span>
        )}
      </div>

      {/* Aide */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-50 hidden max-w-xs rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-[11px] leading-relaxed text-white/75 backdrop-blur-md md:block">
        {phase === "inside" ? (
          <>
            <b className="text-white">Glisse</b> pour tourner la tête à 360° et voir les passagers.
            <br />
            Utilise les boutons <b className="text-white">« Rangée »</b> pour te déplacer dans l&apos;allée.
          </>
        ) : (
          <>
            <b className="text-white">Glisse</b> pour tourner autour du bus extensible.
            <br />
            Raccourcis : <b className="text-white">H</b> klaxon · <b className="text-white">L</b> phares
          </>
        )}
      </div>

      {/* Klaxon visuel */}
      {hornVisible && (
        <div className="pointer-events-none absolute left-1/2 top-[38%] z-50 -translate-x-1/2 animate-bounce">
          <span className="rotate-[-6deg] inline-block rounded-2xl bg-[#ffd23f] px-6 py-3 text-4xl font-black text-[#0d2190] shadow-[0_8px_0_#b8860b] md:text-6xl">
            TUUUT !!
          </span>
        </div>
      )}

      {/* Navigation entre les rangées quand on est à l'intérieur */}
      {phase === "inside" && (
        <div className="absolute top-20 right-4 z-50 flex items-center gap-1 rounded-2xl border border-white/20 bg-black/60 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
            disabled={seatRow <= 0}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-30"
          >
            ◀
          </button>
          <span className="px-2 text-xs font-bold">
            Rangée <span className="text-[#ffd23f]">{seatRow + 1}</span>/{numRows}
          </span>
          <button
            type="button"
            onClick={() => setSeatRow((r) => Math.min(numRows - 1, r + 1))}
            disabled={seatRow >= numRows - 1}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-30"
          >
            ▶
          </button>
        </div>
      )}

      {/* Barre de boutons principale */}
      <div className="absolute bottom-16 left-1/2 z-[110] flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-3 md:bottom-6 max-w-full">
        {phase === "outside" || phase === "entering" ? (
          <>
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

      {/* Lecteur plein écran synchronisé (avec contrôles YouTube complets : qualité, timeline scrub, etc.) */}
      {isFullscreen && (
        <div id="tv-fullscreen-modal" className="fixed inset-0 z-[100] bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=0&controls=1&enablejsapi=1&rel=0&start=${fullscreenStartSeconds}`}
            title="La théorie des Fous du Bus"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            style={{ border: 0, width: "100%", height: "100%" }}
          />
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute right-4 top-4 z-50 rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm font-bold text-white shadow-xl backdrop-blur-md transition hover:bg-black/90 active:scale-95"
          >
            ✕ Sortir du plein écran
          </button>
        </div>
      )}
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
