"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { emitBusAudioEvent, INITIAL_MUSIC_PLAYBACK, onBusAudioEvent, type BusMusicPlayback } from "@/lib/bus-audio";
import { pickLocale, useLocale, type Locale } from "@/lib/i18n";
import { EqualizerDetailsIcon, VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from "@/components/ui/BusIcons";

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function playbackLabel(playback: BusMusicPlayback, locale: Locale) {
  if (playback.state === "error") {
    return pickLocale(
      locale,
      `Indisponible · réessaie avec ${playback.track === "party" ? "Fête" : "Musique"}`,
      `Unavailable · try again with ${playback.track === "party" ? "Party" : "Music"}`,
    );
  }
  if (playback.state === "suspended") return pickLocale(locale, "En pause pendant la vidéo", "Paused during video");
  if (playback.state === "playing") return pickLocale(locale, "En lecture", "Playing");
  if (playback.state === "loading") return playback.requested ? pickLocale(locale, "Démarrage…", "Starting…") : pickLocale(locale, "Préparation…", "Preparing…");
  return playback.elapsed > 0 ? pickLocale(locale, "En pause", "Paused") : pickLocale(locale, "En attente", "Idle");
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
  volume = 65,
  onVolumeChange,
}: MusicPlaybackControlsProps = {}) {
  const locale = useLocale();
  const [playback, setPlayback] = useState(INITIAL_MUSIC_PLAYBACK);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const draftTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
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

  const clearDraftTimer = useCallback(() => {
    if (draftTimerRef.current !== null) {
      window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);
  const settleDraft = useCallback(() => {
    clearDraftTimer();
    // YouTube acknowledges seeks asynchronously; keep the selected thumb still
    // until its next progress samples have caught up.
    draftTimerRef.current = window.setTimeout(() => { setDraft(null); draftTimerRef.current = null; }, 650);
  }, [clearDraftTimer]);
  const finishSeekDrag = useCallback(() => {
    draggingRef.current = false;
    settleDraft();
  }, [settleDraft]);

  useEffect(() => {
    const stop = onBusAudioEvent("musicPlayback", next => {
      if (next.track !== trackRef.current) {
        trackRef.current = next.track;
        draggingRef.current = false;
        clearDraftTimer();
        setDraft(null);
      }
      setPlayback(next);
    });
    emitBusAudioEvent("musicSnapshot");
    return () => {
      stop();
      clearDraftTimer();
    };
  }, [clearDraftTimer]);

  const hasVolumeControl = Boolean(onVolumeChange);

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
    if (panelRef.current) observer.observe(panelRef.current);
    const layoutObserver = new MutationObserver(schedule);
    if (hud) layoutObserver.observe(hud, { attributes: true, attributeFilter: ["style", "data-bottom-layout"] });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect(); layoutObserver.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, [open, showTrigger, portalTarget, hasVolumeControl]);

  useEffect(() => {
    if (!open) {
      draggingRef.current = false;
      return;
    }
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
    const endExternalDrag = () => {
      if (draggingRef.current) finishSeekDrag();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    window.addEventListener("pointerup", endExternalDrag);
    window.addEventListener("pointercancel", endExternalDrag);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      window.removeEventListener("pointerup", endExternalDrag);
      window.removeEventListener("pointercancel", endExternalDrag);
    };
  }, [open, isControlled, onOpenChange, fallbackFocusRef, finishSeekDrag]);

  const elapsed = draft ?? playback.elapsed;
  const seekEnabled = playback.ready && playback.duration > 0 && playback.state !== "error";
  const status = playbackLabel(playback, locale);
  const resolvedVolume = Number.isFinite(volume) ? Math.max(0, Math.min(100, Math.round(volume))) : 65;

  if (!showTrigger && !open) return null;

  const panel = open ? (
    <div ref={panelRef} id={id} role="region" aria-label={pickLocale(locale, "Progression de la musique", "Music progress")}
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      className="bus-case bus-glass pointer-events-auto fixed z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl px-4 py-2.5 text-white backdrop-blur-md">
      <p className="truncate text-sm font-bold text-[#c4b5fd]" title={playback.title}>{playback.title}</p>
      <p role="status" className="mt-0.5 text-xs leading-5 text-[#a3aed9]">{status}</p>
      <input type="range" min={0} max={playback.duration || 1} step={0.1}
        disabled={!seekEnabled} value={Math.min(elapsed, playback.duration || 0)}
        aria-label={pickLocale(locale, `Position dans ${playback.title}`, `Position in ${playback.title}`)}
        aria-valuetext={pickLocale(
          locale,
          `${formatTime(elapsed)} sur ${playback.duration ? formatTime(playback.duration) : "durée en cours de chargement"}`,
          `${formatTime(elapsed)} of ${playback.duration ? formatTime(playback.duration) : "duration loading"}`,
        )}
        onPointerDown={() => {
          draggingRef.current = true;
          clearDraftTimer();
        }}
        onChange={event => {
          const seconds = Number(event.target.value);
          setDraft(seconds);
          emitBusAudioEvent("musicSeek", { track: playback.track, seconds });
          if (!draggingRef.current) settleDraft();
        }}
        onPointerUp={finishSeekDrag}
        onPointerCancel={finishSeekDrag}
        onKeyUp={settleDraft}
        onBlur={finishSeekDrag}
        className="pointer-events-auto mt-1 h-11 w-full cursor-pointer touch-pan-x rounded-lg accent-[#7a3aec] focus-visible:outline-none disabled:cursor-wait disabled:opacity-50" />
      <div className="-mt-1 flex justify-between text-xs font-semibold tabular-nums text-[#a3aed9]" aria-hidden="true">
        <span>{formatTime(elapsed)}</span><span>{playback.duration ? formatTime(playback.duration) : "—:—"}</span>
      </div>
      {onVolumeChange && (
        <div className="mt-1.5 flex items-center gap-2 border-t border-[#947eef]/20 pt-1.5">
          <span className="flex shrink-0 items-center text-[#a3aed9]" aria-hidden="true">
            {resolvedVolume === 0 ? <VolumeOffIcon /> : resolvedVolume < 35 ? <VolumeLowIcon /> : <VolumeHighIcon />}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={resolvedVolume}
            onChange={event => onVolumeChange(Number(event.target.value))}
            aria-label={pickLocale(locale, "Volume de la musique", "Music volume")}
            aria-valuetext={`${resolvedVolume}%`}
            className="pointer-events-auto h-10 min-w-0 flex-1 cursor-pointer touch-pan-x rounded-lg accent-[#7a3aec] focus-visible:outline-none"
          />
          <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-[#a3aed9]" aria-hidden="true">
            {resolvedVolume}%
          </span>
        </div>
      )}
    </div>
  ) : null;

  return <div ref={attachRoot} className={showTrigger ? "bus-music-playback pointer-events-auto relative flex shrink-0 items-center" : "contents"}>
    {showTrigger && <button ref={triggerRef} type="button"
      aria-label={pickLocale(locale, `Détails de la musique : ${playback.title}. ${status}`, `Music details: ${playback.title}. ${status}`)}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      title={pickLocale(locale, `${playback.title} · ${status} · afficher la progression`, `${playback.title} · ${status} · show progress`)}
      className={`bus-glass pointer-events-auto relative z-10 flex h-11 w-11 items-center justify-center gap-2 touch-manipulation focus-visible:outline-none cursor-pointer ${compact ? "bus-icon-button rounded-full" : "rounded-full lg:w-auto lg:max-w-[165px] lg:justify-start lg:rounded-full lg:px-3.5"} ${
        open ? "bus-btn-active" : "bus-btn-secondary"
      }`}>
      <EqualizerDetailsIcon />
      {!compact && <span className="hidden min-w-0 text-left lg:block">
        <span className="block truncate text-xs font-semibold">{playback.title}</span>
        <span className={`block text-[10px] tabular-nums ${open ? "text-white" : "text-[#d6deff]"}`}>{formatTime(playback.elapsed)} / {playback.duration ? formatTime(playback.duration) : "—:—"}</span>
      </span>}
    </button>}
    {panel ? (portalTarget ? createPortal(panel, portalTarget) : panel) : null}
  </div>;
}
