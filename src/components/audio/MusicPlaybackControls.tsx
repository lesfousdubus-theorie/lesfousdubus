"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { emitBusAudioEvent, INITIAL_MUSIC_PLAYBACK, onBusAudioEvent, type BusMusicPlayback } from "@/lib/bus-audio";

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function playbackLabel(playback: BusMusicPlayback) {
  if (playback.state === "error") return "Indisponible · réessayez avec Musique";
  if (playback.state === "suspended") return "En pause pendant la vidéo";
  if (playback.state === "playing") return "En lecture";
  if (playback.state === "loading") return playback.requested ? "Démarrage…" : "Préparation…";
  return playback.elapsed > 0 ? "En pause" : "Prête à jouer";
}

interface MusicPlaybackControlsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  compact?: boolean;
  fallbackFocusRef?: RefObject<HTMLButtonElement | null>;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}

/** A small HUD control; its details remain reachable on narrow screens. */
export default function MusicPlaybackControls({
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
  compact = false,
  fallbackFocusRef,
  volume,
  onVolumeChange,
}: MusicPlaybackControlsProps = {}) {
  const [playback, setPlayback] = useState(INITIAL_MUSIC_PLAYBACK);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const draftTimerRef = useRef<number | null>(null);
  const trackRef = useRef(playback.track);
  const id = useId();
  const attachRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (!node) return;
    const hudElement = node.closest<HTMLElement>("[data-immersive]");
    setPortalTarget(prev => (prev === hudElement ? prev : hudElement));
  }, []);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean | ((value: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(open) : next;
    if (!isControlled) setUncontrolledOpen(resolved);
    onOpenChange?.(resolved);
  };

  useEffect(() => {
    const stop = onBusAudioEvent("musicPlayback", next => {
      if (next.track !== trackRef.current) {
        trackRef.current = next.track;
        if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
        setDraft(null);
      }
      setPlayback(next);
    });
    emitBusAudioEvent("musicSnapshot");
    return () => {
      stop();
      if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const hud = rootRef.current?.closest('[data-bottom-layout]');
    const position = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const trigger = triggerRef.current;
      const button = trigger ? trigger.getBoundingClientRect() : null;
      const hasTrigger = Boolean(button && button.width > 0 && button.height > 0);
      const panelRect = panel.getBoundingClientRect();
      const width = panelRect.width;
      const left = hasTrigger && button
        ? Math.max(12, Math.min(button.left, window.innerWidth - width - 12))
        : Math.max(12, Math.round((window.innerWidth - width) / 2));
      const actions = [...(hud?.querySelectorAll<HTMLElement>(
        '.bus-exterior-controls:not([aria-hidden="true"]), .bus-interior-controls:not([aria-hidden="true"]), .bus-mobile-menu') ?? [])];
      const blockingTops = actions
        .map(element => element.getBoundingClientRect())
        .filter(rect => rect.height > 0 && rect.right > left && rect.left < left + width)
        .map(rect => rect.top);
      const actionsTop = Math.min(
        hasTrigger && button ? button.top : window.innerHeight,
        ...(blockingTops.length ? blockingTops : [window.innerHeight]),
      );
      const top = Math.max(12, Math.min(actionsTop - panelRect.height - 12,
        window.innerHeight - panelRect.height - 12));
      Object.assign(panel.style, { left: `${left}px`, top: `${top}px` });
    };
    position();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };
    const observer = new ResizeObserver(schedule);
    if (rootRef.current) observer.observe(rootRef.current);
    const layoutObserver = new MutationObserver(schedule);
    if (hud) layoutObserver.observe(hud, { attributes: true, attributeFilter: ["style", "data-bottom-layout"] });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect(); layoutObserver.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, [open, showTrigger, volume, portalTarget]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        if (!isControlled) setUncontrolledOpen(false);
        onOpenChange?.(false);
      }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!isControlled) setUncontrolledOpen(false);
      onOpenChange?.(false);
      requestAnimationFrame(() => (triggerRef.current ?? fallbackFocusRef?.current)?.focus({ preventScroll: true }));
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open, isControlled, onOpenChange, fallbackFocusRef]);

  const settleDraft = () => {
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    // YouTube acknowledges seeks asynchronously; keep the selected thumb still
    // until its next progress samples have caught up.
    draftTimerRef.current = window.setTimeout(() => { setDraft(null); draftTimerRef.current = null; }, 650);
  };
  const elapsed = draft ?? playback.elapsed;
  const seekEnabled = playback.ready && playback.duration > 0 && playback.state !== "error";
  const status = playbackLabel(playback);
  const showIntegratedVolume = volume !== undefined && onVolumeChange !== undefined;

  if (!showTrigger && !open) return null;

  const panel = open ? (
    <div ref={panelRef} id={id} role="region" aria-label="Progression de la musique"
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      className="pointer-events-auto fixed z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[#ffd23f]/40 bg-[#07142b]/95 px-4 py-2.5 text-white shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-md">
      <p className="truncate text-sm font-bold text-[#ffd23f]" title={playback.title}>{playback.title}</p>
      <p role="status" className="mt-0.5 text-xs leading-5 text-white/85">{status}</p>
      <input type="range" min={0} max={playback.duration || 1} step={0.1}
        disabled={!seekEnabled} value={Math.min(elapsed, playback.duration || 0)}
        aria-label={`Position dans ${playback.title}`}
        aria-valuetext={`${formatTime(elapsed)} sur ${playback.duration ? formatTime(playback.duration) : "durée en cours de chargement"}`}
        onChange={event => {
          const seconds = Number(event.target.value);
          setDraft(seconds);
          emitBusAudioEvent("musicSeek", { track: playback.track, seconds });
          settleDraft();
        }} onPointerUp={settleDraft} onKeyUp={settleDraft} onBlur={settleDraft}
        className="mt-1 h-11 w-full cursor-pointer rounded-lg accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:cursor-wait disabled:opacity-50" />
      <div className="-mt-1 flex justify-between text-xs font-semibold tabular-nums text-white/85" aria-hidden="true">
        <span>{formatTime(elapsed)}</span><span>{playback.duration ? formatTime(playback.duration) : "—:—"}</span>
      </div>
      {showIntegratedVolume && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-white/15 pt-2">
          <button
            type="button"
            onClick={() => onVolumeChange(volume > 0 ? 0 : 85)}
            aria-label={volume === 0 ? "Réactiver le son" : "Couper le son de la musique"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm transition-transform hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] cursor-pointer"
          >
            {volume === 0 ? "🔇" : volume < 35 ? "🔉" : "🔊"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={event => onVolumeChange(Number(event.target.value))}
            aria-label="Volume de la musique"
            className="h-11 min-w-0 flex-1 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]"
          />
          <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-white">
            {volume}%
          </span>
        </div>
      )}
    </div>
  ) : null;

  return <div ref={attachRoot} className={showTrigger ? "bus-music-playback relative flex shrink-0 items-center" : "contents"}>
    {showTrigger && <button ref={triggerRef} type="button"
      aria-label={showIntegratedVolume
        ? `Audio et progression de la musique : ${playback.title}. ${status}, volume ${volume}%`
        : `Détails de la musique : ${playback.title}. ${status}`}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      title={showIntegratedVolume ? `${playback.title} · progression et volume (${volume}%)` : `${playback.title} · ${status} · afficher la progression`}
      className={`flex h-11 w-11 items-center justify-center gap-2 rounded-full border shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] cursor-pointer ${showIntegratedVolume ? "bus-icon-button bg-black/75" : "bg-[#07142b]/95"} ${compact ? "" : "lg:w-[170px] lg:justify-start lg:px-3"} ${open ? "border-[#ffd23f] text-[#ffd23f]" : "border-white/35 text-white"}`}>
      {showIntegratedVolume ? (
        <span aria-hidden="true" className="text-sm leading-none">
          {volume === 0 ? "🔇" : volume < 35 ? "🔉" : "🔊"}
        </span>
      ) : (
        <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" /><path d="M9 3v6m6 0v6m-7 0v6" strokeWidth="4" />
        </svg>
      )}
      {!compact && <span className="hidden min-w-0 text-left lg:block">
        <span className="block truncate text-xs font-bold">{playback.title}</span>
        <span className="block text-[10px] tabular-nums text-white/80">{formatTime(playback.elapsed)} / {playback.duration ? formatTime(playback.duration) : "—:—"}</span>
      </span>}
    </button>}
    {panel ? (portalTarget ? createPortal(panel, portalTarget) : panel) : null}
  </div>;
}
