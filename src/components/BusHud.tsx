"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Phase } from "./bus/constants";
import { COMPACT_HUD_MEDIA_QUERY, useHudLayout } from "./useHudLayout";
import { countPeopleOnBoard } from "@/lib/bus-crew";
import MusicPlaybackControls from "./audio/MusicPlaybackControls";

export interface ToastMessage {
  id: number;
  text: string;
  sub?: string;
  badge?: string;
}

interface BusHudProps {
  hasSavedPlace: boolean;
  entryNumber?: number | null;
  openPlaceModal: () => void;
  phase: Phase;
  freeView: boolean;
  toggleFreeView: () => void;
  openAvatarModal: () => void;
  hidden: boolean;
  sceneAvailable: boolean;
  toast: ToastMessage | null;
  passengerManifestButtonRef: RefObject<HTMLButtonElement | null>;
  statsLoadError: boolean;
  count: number | null;
  numRows: number;
  theoryAgeInDays: number;
  isNight: boolean;
  manualDayNight: "day" | "night" | null;
  speedMultiplier: number;
  seatRow: number;
  exteriorControlsVisible: boolean;
  interiorControlsVisible: boolean;
  headlights: boolean;
  hasEntered: boolean;
  partyOn: boolean;
  toggleParty: () => void;
  tvOn: boolean;
  joining: boolean;
  busy: boolean;
  setShowTheoryModal: Dispatch<SetStateAction<boolean>>;
  setShowTheoryAge: Dispatch<SetStateAction<boolean>>;
  setStatsLoadError: Dispatch<SetStateAction<boolean>>;
  setStatsRetryToken: Dispatch<SetStateAction<number>>;
  setSeatRow: Dispatch<SetStateAction<number>>;
  toggleTv: () => void;
  openPassengerManifest: () => void;
  toggleDayNight: () => void;
  decelerateBus: () => void;
  accelerateBus: () => void;
  toggleHeadlights: () => void;
  honk: () => void;
  enterBus: () => Promise<void>;
  openProfileModal: (mode: "name" | "comment") => void;
  exitBus: () => void;
  resetView: () => void;
  bgmPlaying: boolean;
  toggleBgm: () => void;
  bgmVolume: number;
  setBgmVolume: (volume: number) => void;
}

const subscribeCompactHud = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(COMPACT_HUD_MEDIA_QUERY);
  media.addEventListener("change", callback);
  window.addEventListener("resize", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("resize", callback);
  };
};

const getCompactHudSnapshot = () =>
  typeof window !== "undefined" && window.matchMedia(COMPACT_HUD_MEDIA_QUERY).matches;

export function BusHud({
  hasSavedPlace, entryNumber, openPlaceModal,
  phase, freeView, toggleFreeView, openAvatarModal, hidden, sceneAvailable, toast, passengerManifestButtonRef, statsLoadError, count,
  numRows, theoryAgeInDays, isNight, manualDayNight, speedMultiplier, seatRow,
  exteriorControlsVisible, interiorControlsVisible, headlights, hasEntered,
  tvOn, joining, busy, setShowTheoryModal, setShowTheoryAge, setStatsLoadError,
  setStatsRetryToken, setSeatRow, toggleTv, openPassengerManifest,
  toggleDayNight, decelerateBus, accelerateBus, toggleHeadlights, honk,
  enterBus, openProfileModal, exitBus, resetView, bgmPlaying, toggleBgm,
  bgmVolume, setBgmVolume,
  partyOn, toggleParty,
}: BusHudProps) {
  const compactHud = useSyncExternalStore(subscribeCompactHud, getCompactHudSnapshot, () => false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [mobileMenuState, setMobileMenuState] = useState<{ open: boolean; phase: Phase }>({ open: false, phase });
  const [musicDetailsOpen, setMusicDetailsOpen] = useState(false);
  const immersiveButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const exteriorMenuButtonRef = useRef<HTMLButtonElement>(null);
  const interiorMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();
  const mobileMenuOpen = mobileMenuState.open && mobileMenuState.phase === phase && compactHud && sceneAvailable && !hidden && !immersive;
  const hudRef = useHudLayout(phase, hidden, showVolumePopup, sceneAvailable, compactHud, mobileMenuOpen);
  const activeMenuButtonRef = exteriorControlsVisible ? exteriorMenuButtonRef : interiorMenuButtonRef;
  const hasActiveGroupedControl = partyOn || headlights || speedMultiplier !== 1 || manualDayNight !== null || (hasEntered && phase === "outside" && tvOn);

  const toggleMobileMenu = () => {
    setMusicDetailsOpen(false);
    setMobileMenuState((prev) => ({ open: !(prev.open && prev.phase === phase), phase }));
  };
  const closeMobileMenu = () => {
    setMobileMenuState({ open: false, phase });
  };
  const handleMusicDetailsOpenChange = (nextOpen: boolean) => {
    setMusicDetailsOpen(nextOpen);
    if (nextOpen) closeMobileMenu();
  };

  const restoreControls = () => {
    setImmersive(false);
    requestAnimationFrame(() => immersiveButtonRef.current?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    if (!immersive || hidden) return;
    restoreButtonRef.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      setImmersive(false);
      requestAnimationFrame(() => immersiveButtonRef.current?.focus({ preventScroll: true }));
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [immersive, hidden]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const focusTrigger = () => {
      const button = exteriorControlsVisible ? exteriorMenuButtonRef.current : interiorMenuButtonRef.current;
      requestAnimationFrame(() => button?.focus({ preventScroll: true }));
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".bus-mobile-menu, [data-mobile-menu-toggle]")) return;
      setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
        setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
        focusTrigger();
      } else if (event.key === "F1") {
        setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
    };
    const onResize = () => {
      if (!getCompactHudSnapshot()) {
        setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileMenuOpen, exteriorControlsVisible]);

  return (
    <>
      {/* ---------- HUD & INTERFACE UTILISATEUR (GARANTI TOUJOURS AU PREMIER PLAN Z-INDEX) ---------- */}
        <div
          ref={hudRef}
          data-immersive={immersive}
          data-mobile-menu-open={mobileMenuOpen || undefined}
          inert={hidden || immersive}
          aria-hidden={hidden || immersive}
          className={`pointer-events-none fixed inset-0 isolate select-none ${hidden || immersive ? "invisible" : ""}`}
          style={{ zIndex: 2147483647 }}
        >
        {/* Toast notification dynamique (allongement du bus) */}
        {toast && (
          <div aria-hidden="true" className="bus-toast pointer-events-none absolute z-50">
            <div className="bus-toast-content bus-glass flex animate-[toast-in_300ms_cubic-bezier(0.25,1,0.5,1)_both] items-start gap-2 rounded-2xl border border-[#ffd23f] bg-black/90 px-2.5 py-2 shadow-[0_0_30px_rgba(255,210,63,0.35)] backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3">
              {toast.badge && (
                <span className="shrink-0 rounded-md bg-[#ffd23f] px-2 py-0.5 text-xs font-black text-[#0d2190]">
                  {toast.badge}
                </span>
              )}
              <div className="min-w-0 break-words">
                <div className="text-sm font-bold leading-5 text-white sm:text-base">{toast.text}</div>
                {toast.sub && <div className="text-xs text-[#ffd23f] font-semibold">{toast.sub}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Titre (côte à côte avec les compteurs en haut sur téléphone et ordinateur) */}
        <div className="bus-title-panel pointer-events-none absolute left-2 top-2 sm:left-4 sm:top-4 lg:max-w-[calc(100vw-26rem)]">
          <div
            className={`bus-title-copy pointer-events-auto select-text cursor-text rounded-xl bg-[#07142b]/95 px-2 py-1 shadow-lg sm:px-3 sm:py-2 ${phase === "inside" ? "hidden sm:inline-block" : "inline-block"}`}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            <h1 className="break-words text-[11px] font-black uppercase leading-[1.12] tracking-tight min-[375px]:text-xs sm:text-xl lg:text-3xl">
              <span className="text-[#ffd23f]">La Théorie</span> <br className="sm:hidden" />
              <span className="text-white">des Fous du Bus</span>
            </h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-[0.015em] text-[#ffd23f] min-[375px]:tracking-[0.02em] sm:mt-1 sm:tracking-[0.035em] lg:text-sm">
              LE SIÈCLE OUBLIÉ EST LE PRÉSENT !!!
            </p>
          </div>
        </div>

        {/* Actions supérieures (sous la rangée titre/compteurs en portrait, en haut à gauche en paysage compact) */}
        <div className="bus-title-actions pointer-events-none absolute left-2 top-[4.25rem] flex flex-wrap items-center gap-1 min-[360px]:gap-1.5 sm:left-4 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowTheoryModal(true)}
            className="bus-glass pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#ffd23f]/50 bg-black/75 px-2 text-[11px] font-black uppercase text-[#ffd23f] shadow-lg backdrop-blur-md transition hover:border-white hover:bg-[#ffd23f] hover:text-[#0d2190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 min-[360px]:px-2.5 sm:px-4 sm:text-xs cursor-pointer"
            title="Découvrir la théorie des Fous du Bus"
          >
            <span className="bus-landscape-hide hidden min-[360px]:inline">📜</span>
            <span><span className="bus-landscape-hide hidden min-[360px]:inline">La </span>Théorie</span>
          </button>
          <button type="button" onClick={openAvatarModal} disabled={busy} aria-haspopup="dialog" aria-label={phase === "inside" ? "Changer de personnage" : "Choisir mon personnage"}
            className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/35 bg-[#07142b]/95 px-2 text-[11px] font-bold text-white shadow-lg transition-colors hover:border-[#ffd23f] hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-60 min-[360px]:px-2.5 sm:gap-2 sm:px-4 sm:text-xs cursor-pointer">
            <svg aria-hidden="true" className="bus-landscape-hide hidden h-4 w-4 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>
            <span className="hud-label-short lg:hidden">Personnage</span><span className="hud-label-long hidden lg:inline">{phase === "inside" ? "Changer de personnage" : "Choisir mon personnage"}</span>
          </button>
          {hasSavedPlace && (
            <button
              type="button"
              data-place-button
              onClick={openPlaceModal}
              disabled={busy}
              aria-haspopup="dialog"
              aria-label={entryNumber ? `Ma place, numéro ${entryNumber}` : "Ma place"}
              title={entryNumber ? `Place n° ${entryNumber} (${entryNumber === 1 ? "1re" : `${entryNumber}e`} personne à être rentrée dans le bus)` : "Gérer ma place"}
              className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/35 bg-[#07142b]/95 px-2 text-[11px] font-bold text-white shadow-lg hover:border-[#ffd23f] hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd23f] disabled:opacity-60 min-[360px]:px-2.5 sm:gap-2 sm:px-4 sm:text-xs"
            >
              <span>Ma place</span>
              {entryNumber !== null && entryNumber !== undefined && (
                <span className="rounded-full bg-[#ffd23f] px-1.5 py-0.5 text-[10px] font-black leading-none tabular-nums text-[#0d2190] sm:text-[11px]">
                  N°&nbsp;{entryNumber.toLocaleString("fr-FR")}
                </span>
              )}
            </button>
          )}
          <button ref={immersiveButtonRef} type="button" onClick={() => { setShowVolumePopup(false); closeMobileMenu(); setImmersive(true); }} disabled={!sceneAvailable || busy} aria-label="Activer le mode immersif" title="Mode immersif"
            className="bus-immersive-toggle pointer-events-auto inline-flex min-h-11 w-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/35 bg-[#07142b]/95 px-0 text-xs font-bold text-white shadow-lg hover:border-[#ffd23f] hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd23f] disabled:opacity-60 sm:w-auto sm:px-4">
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg>
            <span className="bus-landscape-hide hidden sm:inline">Mode immersif</span>
          </button>
        </div>

        {/* Compteurs des passagers et des jours écoulés depuis la naissance de la théorie */}
        <div className="bus-top-stats bus-glass pointer-events-auto absolute right-2 top-2 flex min-h-11 items-stretch gap-0.5 rounded-2xl border border-[#ffd23f]/40 bg-[#07142b]/95 p-0.5 shadow-lg sm:left-auto sm:right-4 sm:top-4 sm:min-h-14 sm:gap-1 sm:p-1">
          <button ref={passengerManifestButtonRef} type="button" onClick={statsLoadError && count === null ? () => {
            setStatsLoadError(false);
            setStatsRetryToken((value) => value + 1);
          } : openPassengerManifest} className="group flex min-h-11 min-w-0 flex-none items-center gap-1 rounded-xl px-1.5 py-1 text-left leading-tight transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] sm:gap-2.5 sm:px-3 sm:py-2">
            <span aria-hidden="true" className="hidden text-base min-[400px]:inline sm:text-2xl">🚌</span>
            <span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#ffd23f] sm:text-xs">
                  Passagers
                </span>
                <span title={`${numRows} rangées`} className="bus-landscape-hide hidden rounded-full bg-white/10 px-1.5 text-xs font-bold text-white/85 md:inline">
                  {numRows} r.
                </span>
              </span>
              <span className="bus-stats-value block text-sm font-black tabular-nums text-white sm:text-xl">
                {count === null ? (statsLoadError ? "Réessayer" : "…") : countPeopleOnBoard(count).toLocaleString("fr-FR")}
              </span>
            </span>
          </button>
          <div className="my-1 w-px bg-white/20" aria-hidden="true" />
          <button type="button" aria-label={`La théorie existe depuis ${theoryAgeInDays.toLocaleString("fr-FR")} jours. Voir la date et la première vidéo`} onClick={() => setShowTheoryAge(true)} className="min-h-11 min-w-0 flex-none rounded-xl px-1.5 py-1 text-left leading-tight transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] sm:px-3 sm:py-2" title="Voir le compteur précis depuis le 26 mai 2024">
            <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#ffd23f] sm:text-xs">
              <span className="hud-label-short sm:hidden"><span className="hidden min-[375px]:inline">La </span>théorie</span><span className="hud-label-long hidden sm:inline">La théorie existe depuis</span>
            </span>
            <span className="bus-stats-value block text-sm font-black tabular-nums text-white sm:text-xl">
              {theoryAgeInDays.toLocaleString("fr-FR")}
              <span className="ml-0.5 text-[10px] font-bold text-white/85 sm:ml-1 sm:text-xs">
                <span className="min-[375px]:hidden">j</span>
                <span className="hidden min-[375px]:inline">jours</span>
              </span>
            </span>
          </button>
        </div>

        {/* Barre inférieure complète sur tablette et ordinateur */}
        {!compactHud && (
          <>
            {/* Bouton interactif Jour / Nuit, Recentrer & Musique */}
            <div className="bus-day-night pointer-events-auto absolute bottom-[4.5rem] left-3 flex h-11 items-center gap-1.5 sm:bottom-4 sm:left-4 sm:gap-2">
              <button
                type="button"
                onClick={toggleDayNight}
                title={manualDayNight === null ? `Forcer le mode ${isNight ? "Jour" : "Nuit"}` : "Revenir au cycle automatique"}
                aria-label={manualDayNight === null
                  ? `Cycle automatique, actuellement ${isNight ? "nuit" : "jour"}. Forcer le mode ${isNight ? "jour" : "nuit"}`
                  : `Mode ${isNight ? "nuit" : "jour"} forcé. Revenir au cycle automatique`}
                className="bus-glass flex h-11 items-center gap-1.5 rounded-full border border-white/35 bg-[#07142b]/95 px-3 text-xs font-bold text-white shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 sm:px-3.5 sm:text-sm cursor-pointer"
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
                <span>{manualDayNight === null ? "Auto" : isNight ? "Nuit" : "Jour"}</span>
                <span className="bus-day-night-detail text-xs text-white/85">· {manualDayNight === null ? (isNight ? "Nuit" : "Jour") : "Manuel"}</span>
              </button>
              <button type="button" onClick={resetView} disabled={busy} aria-label="Recentrer la vue" title="Recentrer la vue sur le bus" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/35 bg-[#07142b]/95 text-white shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-60 cursor-pointer active:scale-95">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="6" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
              </button>
              <button
                type="button"
                onClick={toggleBgm}
                disabled={partyOn}
                aria-pressed={bgmPlaying || partyOn}
                aria-label={partyOn ? "Musique de fête active — arrêter avec le bouton Fête" : bgmPlaying ? "Couper la musique de fond" : "Activer la musique de fond (Life in Pieces — Le Mont Corvo)"}
                title={partyOn ? "Party At Baratie — utilisez Fête pour arrêter la musique" : bgmPlaying ? "Couper la musique de fond (Life in Pieces)" : "Lancer la musique de fond (Howard Harper-Barnes - Life in Pieces)"}
                className={`bus-glass flex h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-bold shadow-lg transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 sm:px-3.5 sm:text-sm cursor-pointer ${
                  bgmPlaying || partyOn
                    ? "border-[#ffd23f] bg-[#07142b]/95 text-[#ffd23f] shadow-[0_0_15px_rgba(255,210,63,0.35)]"
                    : "border-white/35 bg-[#07142b]/95 text-white hover:border-[#ffd23f]/70 hover:text-[#ffd23f]"
                }`}
              >
                {bgmPlaying || partyOn ? (
                  <span className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
                    <span className="inline-block h-3.5 w-1 rounded-full bg-[#ffd23f] animate-pulse" />
                    <span className="inline-block h-2 w-1 rounded-full bg-[#ffd23f] animate-pulse [animation-delay:150ms]" />
                    <span className="inline-block h-3 w-1 rounded-full bg-[#ffd23f] animate-pulse [animation-delay:300ms]" />
                  </span>
                ) : (
                  <span aria-hidden="true" className="text-sm">🎵</span>
                )}
                <span>Musique</span>
                {bgmPlaying && (
                  <span className="bus-music-badge hidden rounded bg-[#ffd23f] px-1 py-0.5 text-[10px] font-black uppercase text-[#0d2190] md:inline">
                    ON
                  </span>
                )}
              </button>

              <MusicPlaybackControls
                open={musicDetailsOpen}
                onOpenChange={handleMusicDetailsOpenChange}
                showTrigger
                fallbackFocusRef={activeMenuButtonRef}
              />

              {/* Réglage du volume de la musique de fond (Desktop direct + Mobile popover) */}
              <div className="relative flex items-center">
                {/* Curseur direct sur grand écran (desktop / tablette) */}
                <div
                  className="bus-volume-inline hidden xl:flex h-11 items-center gap-1.5 rounded-full border border-white/35 bg-[#07142b]/95 pr-2.5 shadow-lg backdrop-blur-md transition-colors hover:border-[#ffd23f]/70"
                  title={`Volume de la musique : ${bgmVolume}%`}
                >
                  <button
                    type="button"
                    onClick={() => setBgmVolume(bgmVolume > 0 ? 0 : 85)}
                    aria-label={bgmVolume === 0 ? "Réactiver le son" : "Couper le son de la musique"}
                    className="grid h-11 w-11 place-items-center rounded-full text-sm transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ffd23f] cursor-pointer"
                  >
                    {bgmVolume === 0 ? "🔇" : bgmVolume < 35 ? "🔉" : "🔊"}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(Number(e.target.value))}
                    aria-label="Volume de la musique de fond"
                    className="h-1.5 w-16 cursor-pointer appearance-none rounded-lg bg-white/25 accent-[#ffd23f] md:w-20"
                  />
                  <span className="w-7 text-right font-bold tabular-nums text-white text-[11px]">
                    {bgmVolume}%
                  </span>
                </div>

                {/* Bouton pour ouvrir le réglage de volume sur tablette */}
                <button
                  type="button"
                  onClick={() => setShowVolumePopup((v) => !v)}
                  aria-label="Régler le volume de la musique"
                  aria-expanded={showVolumePopup}
                  title={`Volume musique : ${bgmVolume}%`}
                  className={`bus-volume-toggle bus-glass xl:hidden grid h-11 w-11 shrink-0 place-items-center rounded-full border text-xs font-bold shadow-lg transition-colors active:scale-95 cursor-pointer ${
                    showVolumePopup
                      ? "border-[#ffd23f] bg-[#07142b]/95 text-[#ffd23f]"
                      : "border-white/35 bg-[#07142b]/95 text-white hover:border-[#ffd23f]/70"
                  }`}
                >
                  {bgmVolume === 0 ? "🔇" : bgmVolume < 35 ? "🔉" : "🔊"}
                </button>

                {/* Popover réglage de volume tablette au-dessus */}
                {showVolumePopup && (
                  <div
                    className="bus-volume-popup bus-glass absolute right-0 flex w-52 flex-col gap-2 rounded-2xl border border-[#ffd23f]/50 bg-[#07142b]/95 p-3 shadow-2xl backdrop-blur-md z-50 animate-[hud-control-in-flow_180ms_cubic-bezier(0.25,1,0.5,1)_both] xl:hidden"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span className="flex items-center gap-1 text-[#ffd23f]">
                        <span>🎵</span>
                        <span>Volume musique</span>
                      </span>
                      <span className="tabular-nums font-black text-white">{bgmVolume}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBgmVolume(Math.max(0, bgmVolume - 10))}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm text-white hover:bg-white/10 cursor-pointer"
                        aria-label="Diminuer volume"
                      >
                        🔉
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={bgmVolume}
                        onChange={(e) => setBgmVolume(Number(e.target.value))}
                        aria-label="Volume de la musique"
                        className="h-2 w-0 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-white/25 accent-[#ffd23f]"
                      />
                      <button
                        type="button"
                        onClick={() => setBgmVolume(Math.min(100, bgmVolume + 10))}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm text-white hover:bg-white/10 cursor-pointer"
                        aria-label="Augmenter volume"
                      >
                        🔊
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contrôleur de vitesse du bus : Boutons interactifs Ralentir & Accélérer */}
            <div className="bus-speed bus-glass pointer-events-auto absolute bottom-3 left-3 right-3 flex h-11 items-center gap-1 rounded-full bg-black/80 px-1.5 text-xs shadow-lg ring-1 ring-white/25 backdrop-blur-md sm:left-auto sm:right-4 sm:bottom-4 sm:gap-1.5 sm:px-3.5 sm:text-sm">
              <button
                type="button"
                onClick={decelerateBus}
                disabled={speedMultiplier <= 0.3}
                aria-label="Ralentir le bus"
                className="group relative flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold text-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-not-allowed disabled:text-white/80 sm:w-[90px] sm:flex-none sm:px-2.5"
                title="Ralentir le bus (Touche - ou Flèche Bas)"
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 inset-y-1 rounded-full bg-white/10 transition-colors group-hover:bg-white/25 group-disabled:bg-white/5" />
                <span className="relative">🐢</span>
                <span className="bus-speed-label relative">Ralentir</span>
              </button>

              <div className="bus-speed-value flex w-[62px] shrink-0 items-center justify-center gap-1 px-1 font-black tabular-nums sm:w-[76px] sm:px-1.5">
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
                  <span className="rounded bg-[#ffd23f] px-1 py-0.5 text-[10px] font-black uppercase text-[#0d2190]">
                    Boost
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={accelerateBus}
                disabled={speedMultiplier >= 3.0}
                aria-label="Accélérer le bus"
                className="group relative flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 text-xs font-black text-[#ffd23f] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-not-allowed disabled:text-[#ffe58a] sm:w-[90px] sm:flex-none sm:px-2.5"
                title="Accélérer le bus (Touche + ou Flèche Haut / Boost)"
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 inset-y-1 rounded-full bg-[#ffd23f]/15 transition-colors group-hover:bg-[#ffd23f]/25 group-disabled:bg-[#ffd23f]/10" />
                <span className="relative">⚡</span>
                <span className="bus-speed-label relative">Accélérer</span>
              </button>
            </div>
          </>
        )}

        {/* Navigation entre les rangées quand on est à l'intérieur */}
        {phase === "inside" && (
          <div className="bus-row-nav pointer-events-auto absolute right-3 top-[4.75rem] flex flex-col items-end gap-1.5 sm:right-4 sm:top-[6.25rem] sm:gap-2">
            {/* Déplacement dans l'allée */}
            <div className="bus-glass flex h-11 items-center gap-1 rounded-2xl bg-black/80 px-1.5 shadow-lg ring-1 ring-white/25 backdrop-blur-md sm:px-3">
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
                disabled={freeView || seatRow <= 0}
                aria-label="Rangée précédente"
                className="group relative grid h-11 w-11 place-items-center rounded-lg p-0 text-white transition-transform hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:cursor-not-allowed disabled:text-white/80 active:scale-95 cursor-pointer"
                title="Rangée précédente"
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 inset-y-1 rounded-lg bg-white/10 transition-colors group-hover:bg-white/20 group-disabled:bg-white/5" />
                <svg aria-hidden="true" className="relative h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="flex h-11 items-center justify-center px-1.5 text-xs font-bold leading-none tabular-nums whitespace-nowrap text-white sm:px-2">
                <span>Rangée</span>
                <span className="ml-1 text-[#ffd23f]">{seatRow + 1}</span>
                <span className="mx-0.5 text-white/85">/</span>
                <span>{numRows}</span>
              </span>
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.min(numRows - 1, r + 1))}
                disabled={freeView || seatRow >= numRows - 1}
                aria-label="Rangée suivante"
                className="group relative grid h-11 w-11 place-items-center rounded-lg p-0 text-white transition-transform hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:cursor-not-allowed disabled:text-white/80 active:scale-95 cursor-pointer"
                title="Rangée suivante"
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 inset-y-1 rounded-lg bg-white/10 transition-colors group-hover:bg-white/20 group-disabled:bg-white/5" />
                <svg aria-hidden="true" className="relative h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="m9.5 5 7 7-7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Commandes secondaires dépliées librement au-dessus de la barre inférieure (sans bloc fermé) */}
        {mobileMenuOpen && (
          <div
            id={mobileMenuId}
            role="region"
            aria-label="Commandes du bus"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            className="bus-mobile-menu pointer-events-none fixed bottom-16 left-1/2 z-40 flex w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 text-white animate-[hud-control-in-flow_160ms_cubic-bezier(0.25,1,0.5,1)_both] motion-reduce:animate-none"
          >
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={busy}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={honk} ariaLabel="Klaxonner" icon="📯" disabled={busy}>
              Klaxon
            </HudButton>
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? "Arrêter la fête" : "Lancer la fête"} icon="🎉" disabled={!partyOn && busy}>
              {partyOn ? "Stop" : "Fête"}
            </HudButton>
            {hasEntered && phase === "outside" && (
              <HudButton compact showMobileIcon className="min-w-11 px-2.5 min-[360px]:px-3" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? "Éteindre la télévision" : "Allumer la télévision"} icon="📺" disabled={partyOn}>
                TV
              </HudButton>
            )}
            <button
              type="button"
              onClick={toggleDayNight}
              title={manualDayNight === null ? `Forcer le mode ${isNight ? "Jour" : "Nuit"}` : "Revenir au cycle automatique"}
              aria-label={manualDayNight === null
                ? `Cycle automatique, actuellement ${isNight ? "nuit" : "jour"}. Forcer le mode ${isNight ? "jour" : "nuit"}`
                : `Mode ${isNight ? "nuit" : "jour"} forcé. Revenir au cycle automatique`}
              className="bus-mobile-day-night bus-glass pointer-events-auto flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full border border-white/35 bg-black/75 px-2.5 text-xs font-bold text-white shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 cursor-pointer"
            >
              {isNight ? (
                <svg className="h-4 w-4 shrink-0 text-[#ffd23f]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 shrink-0 text-[#ffd23f]" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              <span>{manualDayNight === null ? "Auto" : isNight ? "Nuit" : "Jour"}</span>
            </button>
            <button
              type="button"
              onClick={resetView}
              disabled={busy}
              aria-label="Recentrer la vue"
              title="Recentrer la vue sur le bus"
              className="bus-icon-button bus-glass pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/35 bg-black/75 text-white shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-60 cursor-pointer active:scale-95"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="6" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
            </button>
            <div className="bus-mobile-speed bus-glass pointer-events-auto flex h-11 shrink-0 items-center gap-0.5 rounded-full border border-white/35 bg-black/75 px-1 text-xs shadow-lg">
              <button
                type="button"
                onClick={decelerateBus}
                disabled={speedMultiplier <= 0.3}
                aria-label="Ralentir le bus"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm text-white transition-transform hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                title="Ralentir le bus"
              >
                <span aria-hidden="true">🐢</span>
              </button>
              <div className="bus-speed-value flex min-w-[2.75rem] items-center justify-center gap-1 px-1 font-black tabular-nums">
                <span className={speedMultiplier >= 2.0 ? "text-[#ffd23f]" : speedMultiplier <= 0.5 ? "text-[#38bdf8]" : "text-white"}>
                  {speedMultiplier.toFixed(1)}x
                </span>
                {speedMultiplier >= 2.0 && (
                  <span className="rounded bg-[#ffd23f] px-1 py-0.5 text-[10px] font-black uppercase text-[#0d2190]">
                    Boost
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={accelerateBus}
                disabled={speedMultiplier >= 3.0}
                aria-label="Accélérer le bus"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm text-[#ffd23f] transition-transform hover:bg-[#ffd23f]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                title="Accélérer le bus"
              >
                <span aria-hidden="true">⚡</span>
              </button>
            </div>
          </div>
        )}

        {/* Barres persistantes : aucune commande ne se téléporte sous le pointeur. */}
        <div
          aria-hidden={!exteriorControlsVisible}
          className={`bus-exterior-controls pointer-events-none absolute bottom-2 left-1/2 z-30 flex w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 px-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:bottom-20 sm:max-w-[42rem] sm:gap-2 sm:px-2 xl:bottom-4 xl:left-[calc(50%-4.75rem)] ${
            exteriorControlsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          {compactHud ? (
            <>
              <CompactMusicToggleButton
                playing={bgmPlaying}
                partyOn={partyOn}
                disabled={!exteriorControlsVisible}
                onToggle={toggleBgm}
              />
              <MusicPlaybackControls
                open={musicDetailsOpen && exteriorControlsVisible}
                onOpenChange={handleMusicDetailsOpenChange}
                showTrigger
                compact
                fallbackFocusRef={activeMenuButtonRef}
              />
              <MobileMenuToggleButton
                variant="exterior"
                open={mobileMenuOpen}
                hasActiveControl={hasActiveGroupedControl}
                menuId={mobileMenuId}
                disabled={!exteriorControlsVisible}
                buttonRef={exteriorMenuButtonRef}
                onToggle={toggleMobileMenu}
              />
              <HudButton className="min-w-0 flex-1 px-2.5 min-[440px]:px-3.5" onClick={() => { closeMobileMenu(); void enterBus(); }} primary icon="🚪" disabled={joining || phase !== "outside"}>
                {joining || phase === "entering" ? "Installation…" : <>Entrer<span className="hidden min-[440px]:inline"> dans le bus</span></>}
              </HudButton>
            </>
          ) : (
            <>
              <HudButton className="min-w-[96px] flex-[1_0_auto] sm:w-[108px] sm:flex-none" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={!exteriorControlsVisible}>
                {headlights ? "Éteindre" : "Phares"}
              </HudButton>
              <HudButton className="min-w-[104px] flex-[1_0_auto] sm:w-[112px] sm:flex-none" onClick={honk} ariaLabel="Klaxonner" icon="📯" disabled={!exteriorControlsVisible}>
                <span className="hud-label-short sm:hidden">Klaxon</span><span className="hud-label-long hidden sm:inline">Klaxonner</span>
              </HudButton>
              <HudButton className="min-w-[96px] flex-[1_0_auto] sm:w-[100px] sm:flex-none" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? "Arrêter la fête" : "Lancer la fête"} icon="🎉" disabled={(!partyOn && busy) || !exteriorControlsVisible}>
                {partyOn ? "Stop" : "Fête"}
              </HudButton>
              {hasEntered && phase === "outside" && (
                <div className="bus-exterior-tv animate-[hud-control-in-flow_220ms_cubic-bezier(0.25,1,0.5,1)_both] motion-reduce:animate-none">
                  <HudButton
                    className="w-[124px] sm:w-[132px]"
                    onClick={toggleTv}
                    active={tvOn}
                    ariaLabel="Télévision"
                    icon="📺"
                    disabled={partyOn}
                  >
                    <span className="hud-label-short sm:hidden">TV</span><span className="hud-label-long hidden sm:inline">{tvOn ? "Éteindre la TV" : "Allumer la TV"}</span>
                  </HudButton>
                </div>
              )}
              <HudButton className="min-w-[190px] flex-[1_0_auto] sm:w-[190px] sm:flex-none" onClick={() => void enterBus()} primary icon="🚪" disabled={joining || phase !== "outside"}>
                {joining || phase === "entering" ? "Installation…" : "Entrer dans le bus"}
              </HudButton>
            </>
          )}
        </div>

        <div
          aria-hidden={!interiorControlsVisible}
          className={`bus-interior-controls pointer-events-none absolute bottom-2 left-1/2 flex w-[536px] max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col items-center justify-center gap-1 px-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:bottom-20 sm:gap-2 sm:px-2 xl:bottom-4 ${
            interiorControlsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          {compactHud ? (
            <>
              <div className="flex w-full items-center justify-center gap-1 min-[360px]:gap-1.5">
                <HudButton compact className="min-w-0 flex-1" onClick={() => { closeMobileMenu(); openProfileModal("name"); }} ariaLabel="Modifier mon pseudo" icon="🏷️" disabled={busy || !interiorControlsVisible}>
                  Pseudo
                </HudButton>
                <HudButton compact className="min-w-0 flex-[1.35]" onClick={() => { closeMobileMenu(); openProfileModal("comment"); }} ariaLabel="Mettre un commentaire" icon="💬" disabled={busy || !interiorControlsVisible}>
                  Commenter
                </HudButton>
                <HudButton compact className="min-w-0 flex-[1.2]" onClick={toggleFreeView} ariaLabel={freeView ? "Revenir à ma place" : "Explorer en vue libre"} active={freeView} icon={freeView ? "👁️" : "🧭"} disabled={busy || !interiorControlsVisible}>
                  {freeView ? "Ma place" : "Vue libre"}
                </HudButton>
                <HudButton compact className="min-w-11 flex-[0.75]" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? "Éteindre la télévision" : "Allumer la télévision"} icon="📺" disabled={partyOn || busy || !interiorControlsVisible}>
                  TV
                </HudButton>
              </div>
              <div className="flex w-full items-center justify-center gap-1.5">
                <CompactMusicToggleButton
                  playing={bgmPlaying}
                  partyOn={partyOn}
                  disabled={!interiorControlsVisible}
                  onToggle={toggleBgm}
                />
                <MusicPlaybackControls
                  open={musicDetailsOpen && interiorControlsVisible}
                  onOpenChange={handleMusicDetailsOpenChange}
                  showTrigger
                  compact
                  fallbackFocusRef={activeMenuButtonRef}
                />
                <MobileMenuToggleButton
                  variant="interior"
                  open={mobileMenuOpen}
                  hasActiveControl={hasActiveGroupedControl}
                  menuId={mobileMenuId}
                  disabled={!interiorControlsVisible}
                  buttonRef={interiorMenuButtonRef}
                  onToggle={toggleMobileMenu}
                />
                <HudButton compact className="min-w-0 flex-1" onClick={() => { closeMobileMenu(); exitBus(); }} ariaLabel="Sortir du bus" description="Sortir en gardant ta place et ton profil. Pour les supprimer, ouvre Ma place." primary icon="🏝️" disabled={busy || !interiorControlsVisible}>
                  {phase === "exiting" ? "Sortie" : "Sortir"}
                </HudButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2">
                <HudButton className="min-w-0 flex-auto" onClick={() => openProfileModal("name")} ariaLabel="Modifier mon pseudo" icon="🏷️" disabled={busy || !interiorControlsVisible}>
                  <span className="hud-label-short sm:hidden">Pseudo</span><span className="hud-label-long hidden sm:inline">Modifier mon pseudo</span>
                </HudButton>
                <HudButton className="min-w-0 flex-auto" onClick={() => openProfileModal("comment")} ariaLabel="Mettre un commentaire" icon="💬" disabled={busy || !interiorControlsVisible}>
                  Commenter
                </HudButton>
                <HudButton compact className="min-w-0 flex-auto" onClick={toggleFreeView} ariaLabel={freeView ? "Revenir à ma place" : "Explorer en vue libre"} active={freeView} icon={freeView ? "👁️" : "🧭"} disabled={busy || !interiorControlsVisible}>
                  <span className="hud-label-short sm:hidden">{freeView ? "Ma place" : "Vue libre"}</span><span className="hud-label-long hidden sm:inline">{freeView ? "Revenir à ma place" : "Vue libre"}</span>
                </HudButton>
              </div>
              <div className="grid w-full grid-cols-5 items-center gap-1.5 sm:gap-2">
                <HudButton compact className="min-w-0 w-full" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? "Éteindre la télévision" : "Allumer la télévision"} icon="📺" disabled={partyOn || busy || !interiorControlsVisible}>
                  TV
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={busy || !interiorControlsVisible}>
                  Phares
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={honk} ariaLabel="Klaxonner" icon="📯" disabled={busy || !interiorControlsVisible}>
                  Klaxon
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? "Arrêter la fête" : "Lancer la fête"} icon="🎉" disabled={(!partyOn && busy) || !interiorControlsVisible}>
                  {partyOn ? "Stop" : "Fête"}
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={exitBus} ariaLabel="Sortir du bus" description="Sortir en gardant ta place et ton profil. Pour les supprimer, ouvre Ma place." primary icon="🏝️" disabled={busy || !interiorControlsVisible}>
                  {phase === "exiting" ? "Sortie" : "Sortir"}
                </HudButton>
              </div>
            </>
          )}
        </div>
        </div>
        {immersive && !hidden && <button ref={restoreButtonRef} type="button" onClick={restoreControls} aria-label="Quitter le mode immersif et afficher les commandes"
          className="fixed z-[2147483647] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-[#07142b]/95 px-4 text-sm font-bold text-white shadow-lg hover:border-[#ffd23f] hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd23f]"
          style={{ right: "calc(1rem + env(safe-area-inset-right))", bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          Afficher les commandes<span className="hidden text-xs text-[#d8e3ff] sm:inline">· Échap</span>
        </button>}

    </>
  );
}

function CompactMusicToggleButton({
  playing,
  partyOn,
  disabled,
  onToggle,
}: {
  playing: boolean;
  partyOn: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={partyOn || disabled}
      aria-pressed={playing || partyOn}
      aria-label={partyOn ? "Musique de fête active — arrêter avec le bouton Fête" : playing ? "Couper la musique de fond" : "Activer la musique de fond (Life in Pieces — Le Mont Corvo)"}
      title={partyOn ? "Party At Baratie — utilisez Fête pour arrêter la musique" : playing ? "Couper la musique de fond (Life in Pieces)" : "Lancer la musique de fond (Howard Harper-Barnes - Life in Pieces)"}
      style={disabled || partyOn ? { pointerEvents: "none" } : undefined}
      className={`bus-icon-button bus-glass pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-lg touch-manipulation transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
        playing || partyOn
          ? "border-[#ffd23f] bg-[#1636c9]/75 text-[#ffd23f] shadow-[0_0_15px_rgba(255,210,63,0.35)]"
          : "border-white/35 bg-black/75 text-white hover:border-[#ffd23f]/70 hover:text-[#ffd23f]"
      }`}
    >
      {playing || partyOn ? (
        <span className="flex h-3.5 items-end gap-0.5 shrink-0" aria-hidden="true">
          <span className="inline-block h-3.5 w-1 rounded-full bg-[#ffd23f] animate-pulse" />
          <span className="inline-block h-2 w-1 rounded-full bg-[#ffd23f] animate-pulse [animation-delay:150ms]" />
          <span className="inline-block h-3 w-1 rounded-full bg-[#ffd23f] animate-pulse [animation-delay:300ms]" />
        </span>
      ) : (
        <span aria-hidden="true" className="text-sm leading-none">🎵</span>
      )}
    </button>
  );
}

function MobileMenuToggleButton({
  variant,
  open,
  hasActiveControl,
  menuId,
  disabled,
  buttonRef,
  onToggle,
}: {
  variant: "exterior" | "interior";
  open: boolean;
  hasActiveControl: boolean;
  menuId: string;
  disabled?: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      data-mobile-menu-toggle={variant}
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      aria-haspopup="true"
      aria-label={open ? "Fermer le menu des commandes" : "Ouvrir le menu des commandes"}
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={disabled ? { pointerEvents: "none" } : undefined}
      className={`pointer-events-auto relative z-10 flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full py-2 text-xs font-bold shadow-lg touch-manipulation transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
        variant === "exterior" ? "shrink-0 px-2.5 min-[360px]:px-3" : "flex-[1.1] px-2 min-[360px]:px-3"
      } ${
        open
          ? "bg-[#1636c9] text-white ring-2 ring-[#ffd23f] hover:bg-[#1d44e6]"
          : "border border-white/35 bg-black/75 text-white hover:border-[#ffd23f]/70 hover:bg-black/85"
      }`}
    >
      <svg aria-hidden="true" className="bus-landscape-hide hidden h-4 w-4 shrink-0 min-[360px]:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 7h10m4 0h2M4 12h4m4 0h8M4 17h12m4 0h0" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="12" r="2" />
        <circle cx="18" cy="17" r="2" />
      </svg>
      <span className="pointer-events-none">Commandes</span>
      {hasActiveControl && !open && (
        <span aria-hidden="true" className="bus-mobile-menu-dot pointer-events-none h-2 w-2 shrink-0 rounded-full bg-[#ffd23f]" />
      )}
    </button>
  );
}

function HudButton({
  children,
  onClick,
  icon,
  primary,
  active,
  ariaLabel,
  description,
  disabled,
  compact = false,
  showMobileIcon = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: string;
  primary?: boolean;
  active?: boolean;
  ariaLabel?: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
  showMobileIcon?: boolean;
  className?: string;
}) {
  const base =
    "pointer-events-auto flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-2 text-xs md:text-sm font-bold shadow-lg transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
  const look = primary
    ? "bg-[#ffd23f] text-[#0d2190] hover:bg-[#ffe066] shadow-[0_5px_0_#b8860b] active:shadow-none active:translate-y-1"
    : active
      ? "bg-[#1636c9] text-white ring-2 ring-[#ffd23f] hover:bg-[#1d44e6]"
      : "bg-black/70 text-white border border-white/35 hover:bg-black/85 hover:border-[#ffd23f]/70";
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={description}
      aria-pressed={active}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      /* Quand le bouton est désactivé, on force pointer-events: none en inline
         pour empêcher les boutons désactivés des barres de contrôles masquées
         (interiorControls) d'intercepter les clics destinés aux barres visibles
         (exteriorControls) qui se chevauchent sur mobile. */
      style={disabled ? { pointerEvents: "none" } : undefined}
      className={`${base} ${compact ? "px-1.5 sm:px-2" : "px-3.5"} relative z-10 touch-manipulation ${look} ${className}`}
    >
      {icon && <span aria-hidden="true" className={`pointer-events-none text-sm leading-none ${compact ? (showMobileIcon ? "bus-landscape-hide hidden min-[360px]:inline" : "bus-landscape-hide hidden sm:inline") : ""}`}>{icon}</span>}
      <span className="pointer-events-none contents">{children}</span>
    </button>
  );
}
