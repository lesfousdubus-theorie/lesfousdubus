"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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

/** A small HUD control; its details remain reachable on narrow screens. */
export default function MusicPlaybackControls() {
  const [playback, setPlayback] = useState(INITIAL_MUSIC_PLAYBACK);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const draftTimerRef = useRef<number | null>(null);
  const trackRef = useRef(playback.track);
  const id = useId();

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
      const trigger = triggerRef.current, panel = panelRef.current;
      if (!trigger || !panel) return;
      const button = trigger.getBoundingClientRect();
      const width = panel.getBoundingClientRect().width;
      const left = Math.max(12, Math.min(button.left, window.innerWidth - width - 12));
      const actions = [...(hud?.querySelectorAll<HTMLElement>(
        '.bus-exterior-controls:not([aria-hidden="true"]), .bus-interior-controls:not([aria-hidden="true"])') ?? [])];
      const actionsTop = Math.min(button.top, ...actions.map(element => element.getBoundingClientRect())
        .filter(rect => rect.right > left && rect.left < left + width).map(rect => rect.top));
      const top = Math.max(12, Math.min(actionsTop - panel.getBoundingClientRect().height - 12,
        window.innerHeight - panel.getBoundingClientRect().height - 12));
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation(); setOpen(false); triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  const settleDraft = () => {
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    // YouTube acknowledges seeks asynchronously; keep the selected thumb still
    // until its next progress samples have caught up.
    draftTimerRef.current = window.setTimeout(() => { setDraft(null); draftTimerRef.current = null; }, 650);
  };
  const elapsed = draft ?? playback.elapsed;
  const seekEnabled = playback.ready && playback.duration > 0 && playback.state !== "error";
  const status = playbackLabel(playback);

  return <div ref={rootRef} className="bus-music-playback relative flex shrink-0 items-center">
    <button ref={triggerRef} type="button" aria-label={`Détails de la musique : ${playback.title}. ${status}`}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}
      title={`${playback.title} · ${status} · afficher la progression`}
      className={`flex h-11 w-11 items-center justify-center gap-2 rounded-full border bg-[#07142b]/95 text-white shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] lg:w-[170px] lg:justify-start lg:px-3 ${open ? "border-[#ffd23f] text-[#ffd23f]" : "border-white/35"}`}>
      <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h16" /><path d="M9 3v6m6 0v6m-7 0v6" strokeWidth="4" />
      </svg>
      <span className="hidden min-w-0 text-left lg:block">
        <span className="block truncate text-xs font-bold">{playback.title}</span>
        <span className="block text-[10px] tabular-nums text-white/80">{formatTime(playback.elapsed)} / {playback.duration ? formatTime(playback.duration) : "—:—"}</span>
      </span>
    </button>
    {open && <div ref={panelRef} id={id} role="region" aria-label="Progression de la musique"
      className="fixed z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#07142b] px-4 py-3 text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
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
    </div>}
  </div>;
}
