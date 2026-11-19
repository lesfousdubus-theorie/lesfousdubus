"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import type { Phase } from "./bus/constants";
import { COMPACT_HUD_MEDIA_QUERY, useHudLayout } from "./useHudLayout";
import { emitBusAudioEvent, INITIAL_MUSIC_PLAYBACK, onBusAudioEvent, type BusMusicPlayback } from "@/lib/bus-audio";
import { countPeopleOnBoard } from "@/lib/bus-crew";
import { getSeatCountInRow } from "@/lib/bus-layout";
import MusicPlaybackControls from "./audio/MusicPlaybackControls";
import {
  BusFrontIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CommentBubbleIcon,
  CompassExploreIcon,
  CrosshairResetIcon,
  EnterBusIcon,
  ExitBusIcon,
  ExternalArrowIcon,
  EyeViewIcon,
  FastBoltIcon,
  FullscreenExpandIcon,
  HeadlightsIcon,
  HornIcon,
  MoonIcon,
  MusicNoteIcon,
  PartyIcon,
  PersonIcon,
  ScrollIcon,
  SeatTicketIcon,
  SlidersIcon,
  SlowSpeedIcon,
  SunIcon,
  TvIcon,
  UserBadgeIcon,
} from "./ui/BusIcons";

export interface ToastMessage {
  id: number;
  text: string;
  sub?: string;
  badge?: string;
  href?: string;
}

interface BusHudProps {
  hasSavedPlace: boolean;
  entryNumber?: number | null;
  openPlaceModal: () => void;
  phase: Phase;
  phaseEpoch?: number;
  freeView: boolean;
  toggleFreeView: () => void;
  openAvatarModal: () => void;
  hidden: boolean;
  sceneAvailable: boolean;
  toast: ToastMessage | null;
  onDismissToast?: () => void;
  onPauseToast?: () => void;
  onResumeToast?: () => void;
  passengerManifestButtonRef: RefObject<HTMLButtonElement | null>;
  statsLoadError: boolean;
  count: number | null;
  numRows: number;
  theoryAgeInDays: number;
  isNight: boolean;
  manualDayNight: "day" | "night" | null;
  speedMultiplier: number;
  seatRow: number;
  seatColumn: number;
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
  setSeatColumn: Dispatch<SetStateAction<number | null>>;
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
  phase, phaseEpoch = 0, freeView, toggleFreeView, openAvatarModal, hidden, sceneAvailable, toast,
  onDismissToast, onPauseToast, onResumeToast,
  passengerManifestButtonRef, statsLoadError, count,
  numRows, theoryAgeInDays, isNight, manualDayNight, speedMultiplier, seatRow, seatColumn,
  exteriorControlsVisible, interiorControlsVisible, headlights, hasEntered,
  tvOn, joining, busy, setShowTheoryModal, setShowTheoryAge, setStatsLoadError,
  setStatsRetryToken, setSeatRow, setSeatColumn, toggleTv, openPassengerManifest,
  toggleDayNight, decelerateBus, accelerateBus, toggleHeadlights, honk,
  enterBus, openProfileModal, exitBus, resetView, bgmPlaying, toggleBgm,
  bgmVolume, setBgmVolume,
  partyOn, toggleParty,
}: BusHudProps) {
  const compactHud = useSyncExternalStore(subscribeCompactHud, getCompactHudSnapshot, () => false);
  const seatCountInRow = getSeatCountInRow(seatRow);
  const [immersive, setImmersive] = useState(false);
  const [immersiveRestoreVisible, setImmersiveRestoreVisible] = useState(true);
  const [mobileMenuState, setMobileMenuState] = useState<{ open: boolean; phase: Phase }>({ open: false, phase });
  const [musicDetailsState, setMusicDetailsState] = useState<{ open: boolean; phase: Phase; epoch: number }>({
    open: false,
    phase,
    epoch: phaseEpoch,
  });
  const [musicPlayback, setMusicPlayback] = useState<BusMusicPlayback>(INITIAL_MUSIC_PLAYBACK);
  const immersiveButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const exteriorMenuButtonRef = useRef<HTMLButtonElement>(null);
  const interiorMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();
  const musicDetailsOpen = musicDetailsState.open && musicDetailsState.phase === phase && musicDetailsState.epoch === phaseEpoch && !hidden && !immersive;
  const mobileMenuOpen = mobileMenuState.open && mobileMenuState.phase === phase && compactHud && sceneAvailable && !hidden && !immersive;
  const hudRef = useHudLayout(phase, hidden, sceneAvailable, compactHud, mobileMenuOpen, immersive);
  const activeMenuButtonRef = exteriorControlsVisible ? exteriorMenuButtonRef : interiorMenuButtonRef;
  const hasActiveGroupedControl = partyOn || headlights || speedMultiplier !== 1 || manualDayNight !== null || (hasEntered && phase === "outside" && tvOn);
  const musicSuspendedByTv = bgmPlaying && !partyOn && musicPlayback.track === "background" && musicPlayback.state === "suspended";
  const resetViewTitle = phase === "inside" && !freeView
    ? "Recentrer la vue sur l’écran"
    : "Recentrer la vue sur le bus";
  const tvButtonDescription = partyOn
    ? "La fête est en cours — arrête la fête pour utiliser la télévision"
    : tvOn
      ? "Éteindre la télévision"
      : "Allumer la télévision";
  const safeToastHref = toast?.href && /^https?:\/\//i.test(toast.href) ? toast.href : undefined;

  const toggleMobileMenu = () => {
    setMusicDetailsState({ open: false, phase, epoch: phaseEpoch });
    setMobileMenuState((prev) => ({ open: !(prev.open && prev.phase === phase), phase }));
  };
  const closeMobileMenu = () => {
    setMobileMenuState({ open: false, phase });
  };
  const handleMusicDetailsOpenChange = (nextOpen: boolean) => {
    setMusicDetailsState({ open: nextOpen, phase, epoch: phaseEpoch });
    if (nextOpen) {
      closeMobileMenu();
    }
  };

  useEffect(() => {
    const unsubscribe = onBusAudioEvent("musicPlayback", setMusicPlayback);
    emitBusAudioEvent("musicSnapshot");
    return unsubscribe;
  }, []);

  const restoreControls = () => {
    setImmersive(false);
    setImmersiveRestoreVisible(true);
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
      setImmersiveRestoreVisible(true);
      requestAnimationFrame(() => immersiveButtonRef.current?.focus({ preventScroll: true }));
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [immersive, hidden]);

  useEffect(() => {
    if (!immersive || hidden) return;
    let timerId = window.setTimeout(() => {
      setImmersiveRestoreVisible(false);
    }, 2000);
    const revealOnActivity = () => {
      window.clearTimeout(timerId);
      setImmersiveRestoreVisible(true);
      timerId = window.setTimeout(() => {
        setImmersiveRestoreVisible(false);
      }, 2000);
    };
    window.addEventListener("mousemove", revealOnActivity, { passive: true });
    window.addEventListener("pointermove", revealOnActivity, { passive: true });
    window.addEventListener("pointerdown", revealOnActivity, { passive: true });
    window.addEventListener("touchstart", revealOnActivity, { passive: true });
    window.addEventListener("keydown", revealOnActivity);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("mousemove", revealOnActivity);
      window.removeEventListener("pointermove", revealOnActivity);
      window.removeEventListener("pointerdown", revealOnActivity);
      window.removeEventListener("touchstart", revealOnActivity);
      window.removeEventListener("keydown", revealOnActivity);
    };
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
        {/* Titre (côte à côte avec les compteurs en haut sur téléphone et ordinateur) */}
        <div className="bus-title-panel pointer-events-none absolute left-2 top-2 sm:left-4 sm:top-4 lg:max-w-[calc(100vw-26rem)]">
          <div
            className="bus-title-copy bus-case bus-glass pointer-events-auto inline-block select-text cursor-text rounded-2xl px-2.5 py-1.5 backdrop-blur-md min-[375px]:px-3.5 min-[375px]:py-2 sm:px-4 sm:py-2.5"
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            <h1 className="break-words text-xs font-black uppercase leading-[1.18] tracking-tight min-[390px]:text-[13px] min-[430px]:text-sm sm:text-xl lg:text-3xl">
              <span className="text-[#c4b5fd]">La Théorie</span> <br className="sm:hidden" />
              <span className="text-white">des Fous du Bus</span>
            </h1>
            <p className="mt-1 hidden text-xs font-bold uppercase leading-tight tracking-[0.035em] text-[#a995f7] sm:block lg:text-sm">
              Le Siècle Oublié est le Présent
            </p>
          </div>
        </div>

        {/* Actions supérieures (sous la rangée titre/compteurs en portrait, en haut à gauche en paysage compact) */}
        <div className="bus-title-actions pointer-events-none absolute left-2 top-[4.25rem] flex flex-col items-start gap-1 min-[360px]:gap-1.5 sm:left-4 sm:gap-2">
          <div className="bus-title-primary-actions flex max-w-full flex-wrap items-center gap-1 min-[360px]:gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowTheoryModal(true)}
              className="bus-btn-primary pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold focus-visible:outline-none min-[360px]:px-3 min-[390px]:px-3.5 sm:px-4 sm:text-xs cursor-pointer"
              title="Découvrir la théorie des Fous du Bus"
            >
              <ScrollIcon className="bus-landscape-hide hidden h-4 w-4 shrink-0 min-[360px]:block" />
              <span><span className="bus-landscape-hide hidden min-[360px]:inline">La </span>Théorie</span>
            </button>
            <button type="button" onClick={openAvatarModal} disabled={busy} aria-haspopup="dialog" aria-label={phase === "inside" ? "Changer de personnage" : "Choisir mon personnage"}
              className="bus-btn-secondary pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold focus-visible:outline-none disabled:opacity-60 min-[360px]:px-2.5 min-[390px]:px-3 sm:gap-2 sm:px-4 sm:text-xs cursor-pointer">
              <PersonIcon className="bus-landscape-hide hidden h-4 w-4 shrink-0 sm:block" />
              <span>Personnage</span>
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
                className="bus-btn-secondary pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold focus-visible:outline-none disabled:opacity-60 min-[360px]:px-2.5 min-[390px]:px-3 sm:gap-2 sm:px-4 sm:text-xs cursor-pointer"
              >
                <SeatTicketIcon className="bus-landscape-hide hidden h-4 w-4 shrink-0 sm:block" />
                <span>Ma place</span>
                {entryNumber !== null && entryNumber !== undefined && (
                  <span className="bus-pill-badge rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums sm:text-[11px]">
                    N°&nbsp;{entryNumber.toLocaleString("fr-FR")}
                  </span>
                )}
              </button>
            )}
          </div>
          <button ref={immersiveButtonRef} type="button" onClick={() => { setMusicDetailsState({ open: false, phase, epoch: phaseEpoch }); closeMobileMenu(); setImmersiveRestoreVisible(true); setImmersive(true); }} disabled={!sceneAvailable || busy} aria-label="Activer le mode immersif" title="Mode immersif"
            className="bus-immersive-toggle bus-btn-secondary pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[1.125rem] px-2.5 text-[11px] font-semibold focus-visible:outline-none disabled:opacity-60 sm:gap-2 sm:px-3.5 sm:text-xs cursor-pointer">
            <FullscreenExpandIcon className="h-4 w-4 shrink-0" />
            <span className="bus-landscape-hide">Mode immersif</span>
          </button>
        </div>

        {/* Compteurs des passagers et des jours écoulés depuis la naissance de la théorie */}
        <div className="bus-top-stats bus-case bus-glass pointer-events-auto absolute right-2 top-2 flex min-h-11 items-stretch gap-0.5 rounded-[1.25rem] p-0.5 backdrop-blur-md min-[375px]:p-1 sm:left-auto sm:right-4 sm:top-4 sm:min-h-14 sm:gap-1 sm:p-1">
          <button ref={passengerManifestButtonRef} type="button" onClick={openPassengerManifest} title="Voir la liste des passagers" className="group flex min-h-11 min-w-0 flex-none items-center gap-1 rounded-2xl px-2 py-1 text-left leading-tight transition-colors hover:bg-[#6141e8]/20 focus-visible:outline-none min-[375px]:gap-1.5 min-[375px]:px-2.5 sm:gap-2.5 sm:px-3 sm:py-2 cursor-pointer">
            <span aria-hidden="true" className="hidden text-[#c4b5fd] min-[400px]:inline-flex min-[400px]:items-center">
              <BusFrontIcon className="h-4 w-4 shrink-0 sm:h-6 sm:w-6" />
            </span>
            <span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#c4b5fd] sm:text-xs">
                  Passagers
                </span>
                <span title={`${numRows} rangées`} className="bus-landscape-hide hidden rounded-full border border-[#947eef]/30 bg-[#6141e8]/20 px-1.5 text-xs font-semibold text-[#dfe5ff] md:inline">
                  {numRows} r.
                </span>
              </span>
              <span className="bus-stats-value block text-sm font-black tabular-nums text-white sm:text-xl">
                {count === null ? (statsLoadError ? "Liste" : "…") : countPeopleOnBoard(count).toLocaleString("fr-FR")}
              </span>
            </span>
          </button>
          {statsLoadError && count === null && (
            <button
              type="button"
              onClick={() => {
                setStatsLoadError(false);
                setStatsRetryToken((value) => value + 1);
              }}
              title="Réessayer de charger le compteur des passagers"
              className="bus-btn-tonal flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl px-2 py-1 text-xs font-semibold focus-visible:outline-none cursor-pointer"
            >
              <span>Réessayer</span>
            </button>
          )}
          <div className="my-1 w-px bg-[#947eef]/25" aria-hidden="true" />
          <button type="button" aria-label={`La théorie existe depuis ${theoryAgeInDays.toLocaleString("fr-FR")} jours. Voir la date et la première vidéo`} onClick={() => setShowTheoryAge(true)} className="min-h-11 min-w-0 flex-none rounded-2xl px-2 py-1 text-left leading-tight transition-colors hover:bg-[#6141e8]/20 focus-visible:outline-none min-[375px]:px-2.5 sm:px-3 sm:py-2 cursor-pointer" title="Voir le compteur précis depuis le 26 mai 2024">
            <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#c4b5fd] sm:text-xs">
              <span className="hud-label-short sm:hidden"><span className="hidden min-[375px]:inline">La </span>théorie</span><span className="hud-label-long hidden sm:inline">La théorie existe depuis</span>
            </span>
            <span className="bus-stats-value block text-sm font-black tabular-nums text-white sm:text-xl">
              {theoryAgeInDays.toLocaleString("fr-FR")}
              <span className="ml-0.5 text-[10px] font-bold text-[#dfe5ff] sm:ml-1 sm:text-xs">
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
                className={`bus-glass flex h-11 items-center gap-1.5 rounded-[1.125rem] px-3 text-xs font-semibold focus-visible:outline-none sm:px-3.5 sm:text-sm cursor-pointer ${
                  manualDayNight !== null ? "bus-btn-active" : "bus-btn-secondary"
                }`}
              >
                {isNight ? (
                  <MoonIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
                ) : (
                  <SunIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
                )}
                <span>{manualDayNight === null ? "Auto" : isNight ? "Nuit" : "Jour"}</span>
              </button>
              <button type="button" onClick={resetView} disabled={busy} aria-label="Recentrer la vue" title={resetViewTitle} className="bus-btn-secondary grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                <CrosshairResetIcon className="h-5 w-5 shrink-0" />
              </button>
              <button
                type="button"
                onClick={toggleBgm}
                disabled={partyOn}
                aria-pressed={bgmPlaying || partyOn}
                aria-label={partyOn ? "Musique de fête active — arrêter avec le bouton Fête" : bgmPlaying ? "Couper la musique de fond" : "Activer la musique de fond (Life in Pieces — Le Mont Corvo)"}
                title={partyOn ? "Party At Baratie — utilise Fête pour arrêter la musique" : musicSuspendedByTv ? "Musique en pause pendant la vidéo/TV — cliquer pour couper" : bgmPlaying ? "Couper la musique de fond (Life in Pieces)" : "Lancer la musique de fond (Howard Harper-Barnes - Life in Pieces)"}
                className={`bus-glass flex h-11 items-center gap-1.5 rounded-[1.125rem] px-3 text-xs font-semibold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 sm:text-sm cursor-pointer ${
                  bgmPlaying || partyOn ? "bus-btn-active" : "bus-btn-secondary"
                }`}
              >
                {bgmPlaying || partyOn ? (
                  <span className={`flex items-end gap-0.5 h-3.5 ${musicSuspendedByTv ? "opacity-65" : ""}`} aria-hidden="true">
                    <span className={`inline-block w-1 rounded-full bg-white ${musicSuspendedByTv ? "h-1.5" : "h-3.5"}`} />
                    <span className={`inline-block w-1 rounded-full bg-white ${musicSuspendedByTv ? "h-1.5" : "h-2"}`} />
                    <span className={`inline-block w-1 rounded-full bg-white ${musicSuspendedByTv ? "h-1.5" : "h-3"}`} />
                  </span>
                ) : (
                  <MusicNoteIcon className="h-4 w-4 shrink-0" />
                )}
                <span>Musique</span>
                {bgmPlaying && !musicSuspendedByTv && (
                  <span className="bus-music-badge hidden rounded-md border border-white/30 bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white md:inline">
                    ON
                  </span>
                )}
              </button>

              <MusicPlaybackControls
                open={musicDetailsOpen}
                onOpenChange={handleMusicDetailsOpenChange}
                showTrigger
                volume={bgmVolume}
                onVolumeChange={setBgmVolume}
                fallbackFocusRef={activeMenuButtonRef}
              />
            </div>

            {/* Contrôleur de vitesse du bus : Boutons interactifs Ralentir & Accélérer */}
            <div className="bus-speed bus-case bus-glass pointer-events-auto absolute bottom-3 left-3 right-3 flex h-11 items-center gap-1 rounded-full px-1.5 text-xs backdrop-blur-md sm:left-auto sm:right-4 sm:bottom-4 sm:gap-1.5 sm:px-2 sm:text-sm">
              <button
                type="button"
                onClick={decelerateBus}
                disabled={speedMultiplier <= 0.3}
                aria-label="Ralentir le bus"
                className="group relative flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-transparent bg-white/[0.07] px-2 text-xs font-semibold text-white transition-colors hover:bg-[#6141e8]/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 sm:w-[90px] sm:flex-none sm:px-2.5 cursor-pointer"
                title="Ralentir le bus (Touche - ou Flèche Bas)"
              >
                <SlowSpeedIcon className="relative h-4 w-4 shrink-0" />
                <span className="bus-speed-label relative">Ralentir</span>
              </button>

              <div className="bus-speed-value flex w-[62px] shrink-0 items-center justify-center gap-1 px-1 font-black tabular-nums sm:w-[76px] sm:px-1.5">
                <span
                  className={
                    speedMultiplier >= 2.0
                      ? "text-[#c4b5fd]"
                      : speedMultiplier <= 0.5
                        ? "text-[#93c5fd]"
                        : "text-white"
                  }
                >
                  {speedMultiplier.toFixed(1)}x
                </span>
                {speedMultiplier >= 2.0 && (
                  <span className="bus-pill-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase">
                    Boost
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={accelerateBus}
                disabled={speedMultiplier >= 3.0}
                aria-label="Accélérer le bus"
                className="bus-btn-tonal relative flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 sm:w-[90px] sm:flex-none sm:px-2.5 cursor-pointer"
                title="Accélérer le bus (Touche + ou Flèche Haut / Boost)"
              >
                <FastBoltIcon className="relative h-4 w-4 shrink-0" />
                <span className="bus-speed-label relative">Accélérer</span>
              </button>
            </div>
          </>
        )}

        {/* Navigation unifiée entre les rangées et les colonnes quand on est à l'intérieur */}
        {phase === "inside" && (
          <div className="bus-row-nav pointer-events-auto absolute right-3 top-[4.75rem] sm:right-4 sm:top-[6.25rem]">
            <div className="bus-case bus-glass flex flex-col gap-1 rounded-[1.25rem] p-1.5 backdrop-blur-md">
              {/* Déplacement dans l'allée */}
              <div className="grid grid-cols-[2.75rem_6.75rem_2.75rem] items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
                  disabled={seatRow <= 0}
                  aria-label="Rangée précédente"
                  className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:bg-[#1a2258] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  title={seatRow <= 0 ? "Première rangée atteinte" : "Rangée précédente"}
                >
                  <ChevronLeftIcon className="h-4 w-4 shrink-0" />
                </button>
                <span className="flex h-10 items-center justify-center text-xs font-bold leading-none tabular-nums whitespace-nowrap text-white">
                  <span>Rangée</span>
                  <span className="ml-1 text-[#c4b5fd]">{seatRow + 1}</span>
                  <span className="mx-0.5 text-[#a3aed9]">/</span>
                  <span>{numRows}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSeatRow((r) => Math.min(numRows - 1, r + 1))}
                  disabled={seatRow >= numRows - 1}
                  aria-label="Rangée suivante"
                  className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:bg-[#1a2258] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  title={seatRow >= numRows - 1 ? "Dernière rangée atteinte" : "Rangée suivante"}
                >
                  <ChevronRightIcon className="h-4 w-4 shrink-0" />
                </button>
              </div>

              {/* Déplacement latéral sur les sièges de la rangée */}
              <div className="grid grid-cols-[2.75rem_6.75rem_2.75rem] items-center gap-1 border-t border-[#947eef]/20 pt-1">
                <button
                  type="button"
                  onClick={() => setSeatColumn(Math.max(0, seatColumn - 1))}
                  disabled={seatColumn <= 0}
                  aria-label="Colonne à gauche"
                  className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:bg-[#1a2258] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  title={seatColumn <= 0 ? "Déjà dans la colonne la plus à gauche" : "Colonne à gauche"}
                >
                  <ChevronLeftIcon className="h-4 w-4 shrink-0" />
                </button>
                <span className="flex h-10 items-center justify-center text-xs font-bold leading-none tabular-nums whitespace-nowrap text-white">
                  <span>Colonne</span>
                  <span className="ml-1 text-[#c4b5fd]">{seatColumn + 1}</span>
                  <span className="mx-0.5 text-[#a3aed9]">/</span>
                  <span>{seatCountInRow}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSeatColumn(Math.min(seatCountInRow - 1, seatColumn + 1))}
                  disabled={seatColumn >= seatCountInRow - 1}
                  aria-label="Colonne à droite"
                  className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:bg-[#1a2258] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  title={seatColumn >= seatCountInRow - 1 ? "Déjà dans la colonne la plus à droite" : "Colonne à droite"}
                >
                  <ChevronRightIcon className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Commandes secondaires dépliées librement au-dessus de la barre inférieure */}
        {mobileMenuOpen && (
          <div
            id={mobileMenuId}
            role="region"
            aria-label="Commandes du bus"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            className="bus-mobile-menu pointer-events-none fixed bottom-16 left-1/2 z-40 flex w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 text-white"
          >
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon={<HeadlightsIcon />} disabled={busy}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={honk} ariaLabel="Klaxonner" icon={<HornIcon />} disabled={busy}>
              Klaxon
            </HudButton>
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? "Arrêter la fête" : "Lancer la fête"} icon={<PartyIcon />} disabled={!partyOn && busy}>
              {partyOn ? "Stop" : "Fête"}
            </HudButton>
            {hasEntered && phase === "outside" && (
              <HudButton compact showMobileIcon className="min-w-11 px-2.5 min-[360px]:px-3" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? "Éteindre la télévision" : "Allumer la télévision"} description={tvButtonDescription} icon={<TvIcon />} disabled={partyOn}>
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
              className={`bus-mobile-day-night bus-glass pointer-events-auto flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-[1.125rem] px-2.5 text-xs font-semibold focus-visible:outline-none cursor-pointer ${
                manualDayNight !== null ? "bus-btn-active" : "bus-btn-secondary"
              }`}
            >
              {isNight ? (
                <MoonIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
              ) : (
                <SunIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
              )}
              <span>{manualDayNight === null ? "Auto" : isNight ? "Nuit" : "Jour"}</span>
            </button>
            <button
              type="button"
              onClick={resetView}
              disabled={busy}
              aria-label="Recentrer la vue"
              title={resetViewTitle}
              className="bus-icon-button bus-btn-secondary bus-glass pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <CrosshairResetIcon className="h-5 w-5 shrink-0" />
            </button>
            <div className="bus-mobile-speed bus-case bus-glass pointer-events-auto flex h-11 shrink-0 items-center gap-0.5 rounded-full px-1 text-xs">
              <button
                type="button"
                onClick={decelerateBus}
                disabled={speedMultiplier <= 0.3}
                aria-label="Ralentir le bus"
                className="grid h-9 w-10 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-[#6141e8]/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                title="Ralentir le bus"
              >
                <SlowSpeedIcon className="h-4 w-4 shrink-0" />
              </button>
              <div className="bus-speed-value flex min-w-[2.75rem] items-center justify-center gap-1 px-1 font-black tabular-nums">
                <span className={speedMultiplier >= 2.0 ? "text-[#c4b5fd]" : speedMultiplier <= 0.5 ? "text-[#93c5fd]" : "text-white"}>
                  {speedMultiplier.toFixed(1)}x
                </span>
                {speedMultiplier >= 2.0 && (
                  <span className="bus-pill-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase">
                    Boost
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={accelerateBus}
                disabled={speedMultiplier >= 3.0}
                aria-label="Accélérer le bus"
                className="grid h-9 w-10 shrink-0 place-items-center rounded-full text-[#dcd3ff] transition-colors hover:bg-[#6141e8]/25 hover:text-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                title="Accélérer le bus"
              >
                <FastBoltIcon className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Barres persistantes : aucune commande ne se téléporte sous le pointeur. */}
        <div
          inert={!exteriorControlsVisible || undefined}
          aria-hidden={!exteriorControlsVisible}
          className={`bus-exterior-controls pointer-events-none absolute bottom-2 left-1/2 z-30 flex w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 px-1 transition-opacity duration-200 motion-reduce:transition-none sm:bottom-20 sm:max-w-[42rem] sm:gap-2 sm:px-2 xl:bottom-4 ${
            exteriorControlsVisible
              ? "opacity-100"
              : "opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          {compactHud ? (
            <>
              <CompactMusicToggleButton
                playing={bgmPlaying}
                suspended={musicSuspendedByTv}
                partyOn={partyOn}
                disabled={!exteriorControlsVisible}
                onToggle={toggleBgm}
              />
              <MusicPlaybackControls
                open={musicDetailsOpen && exteriorControlsVisible}
                onOpenChange={handleMusicDetailsOpenChange}
                showTrigger
                compact
                volume={bgmVolume}
                onVolumeChange={setBgmVolume}
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
              <HudButton className="shrink-0 px-3.5 min-[360px]:px-4" onClick={() => { closeMobileMenu(); void enterBus(); }} primary icon={<EnterBusIcon />} disabled={joining || phase !== "outside"}>
                {joining || phase === "entering"
                  ? "Installation…"
                  : hasSavedPlace
                    ? <>Revenir<span className="hidden min-[430px]:inline"> à sa place</span></>
                    : <>Entrer<span className="hidden min-[460px]:inline"> dans le bus</span></>}
              </HudButton>
            </>
          ) : (
            <>
              <HudButton className="min-w-[96px] flex-[1_0_auto] sm:w-[108px] sm:flex-none" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon={<HeadlightsIcon />} disabled={!exteriorControlsVisible}>
                {headlights ? "Éteindre" : "Phares"}
              </HudButton>
              <HudButton className="min-w-[104px] flex-[1_0_auto] sm:w-[112px] sm:flex-none" onClick={honk} ariaLabel="Klaxonner" icon={<HornIcon />} disabled={!exteriorControlsVisible}>
                <span className="hud-label-short sm:hidden">Klaxon</span><span className="hud-label-long hidden sm:inline">Klaxonner</span>
              </HudButton>
              <HudButton className="min-w-[96px] flex-[1_0_auto] sm:w-[100px] sm:flex-none" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? "Arrêter la fête" : "Lancer la fête"} icon={<PartyIcon />} disabled={(!partyOn && busy) || !exteriorControlsVisible}>
                {partyOn ? "Stop" : "Fête"}
              </HudButton>
              {hasEntered && phase === "outside" && (
                <div className="bus-exterior-tv">
                  <HudButton
                    className="w-[124px] sm:w-[132px]"
                    onClick={toggleTv}
                    active={tvOn}
                    ariaLabel="Télévision"
                    description={tvButtonDescription}
                    icon={<TvIcon />}
                    disabled={partyOn}
                  >
                    <span className="hud-label-short sm:hidden">TV</span><span className="hud-label-long hidden sm:inline">{tvOn ? "Éteindre la TV" : "Allumer la TV"}</span>
                  </HudButton>
                </div>
              )}
              <HudButton className="min-w-[190px] flex-[1_0_auto] sm:w-[190px] sm:flex-none" onClick={() => void enterBus()} primary icon={<EnterBusIcon />} disabled={joining || phase !== "outside"}>
                {joining || phase === "entering" ? "Installation…" : hasSavedPlace ? "Revenir à sa place" : "Entrer dans le bus"}
              </HudButton>
            </>
          )}
        </div>

        <div
          inert={!interiorControlsVisible || undefined}
          aria-hidden={!interiorControlsVisible}
          className={`bus-interior-controls pointer-events-none absolute bottom-2 left-1/2 flex w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col items-center justify-center gap-1.5 px-1 transition-opacity duration-200 motion-reduce:transition-none sm:bottom-20 sm:w-[536px] sm:gap-2 sm:px-2 xl:bottom-4 ${
            interiorControlsVisible
              ? "opacity-100"
              : "opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          {compactHud ? (
            <>
              <div className="flex w-full items-center justify-center gap-1 min-[360px]:gap-1.5">
                <HudButton compact className="shrink-0 px-2.5 min-[360px]:px-3.5" onClick={() => { closeMobileMenu(); openProfileModal("name"); }} ariaLabel="Modifier mon nom" icon={<UserBadgeIcon />} disabled={busy || !interiorControlsVisible}>
                  Nom
                </HudButton>
                <HudButton compact className="shrink-0 px-2.5 min-[360px]:px-3.5" onClick={() => { closeMobileMenu(); openProfileModal("comment"); }} ariaLabel="Mettre un commentaire" icon={<CommentBubbleIcon />} disabled={busy || !interiorControlsVisible}>
                  Commenter
                </HudButton>
                <HudButton compact className="shrink-0 px-2.5 min-[360px]:px-3.5" onClick={toggleFreeView} ariaLabel={freeView ? "Revenir à ma place" : "Explorer en vue libre"} active={freeView} icon={freeView ? <EyeViewIcon /> : <CompassExploreIcon />} disabled={busy || !interiorControlsVisible}>
                  {freeView ? "Ma place" : "Vue libre"}
                </HudButton>
                <HudButton compact className="min-w-11 shrink-0 px-2.5 min-[360px]:px-3.5" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? "Éteindre la télévision" : "Allumer la télévision"} description={tvButtonDescription} icon={<TvIcon />} disabled={partyOn || busy || !interiorControlsVisible}>
                  TV
                </HudButton>
              </div>
              <div className="flex w-full items-center justify-center gap-1.5">
                <CompactMusicToggleButton
                  playing={bgmPlaying}
                  suspended={musicSuspendedByTv}
                  partyOn={partyOn}
                  disabled={!interiorControlsVisible}
                  onToggle={toggleBgm}
                />
                <MusicPlaybackControls
                  open={musicDetailsOpen && interiorControlsVisible}
                  onOpenChange={handleMusicDetailsOpenChange}
                  showTrigger
                  compact
                  volume={bgmVolume}
                  onVolumeChange={setBgmVolume}
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
                <HudButton compact showMobileIcon className="shrink-0 px-3.5 min-[360px]:px-4" onClick={() => { closeMobileMenu(); exitBus(); }} ariaLabel="Sortir du bus" description="Sortir en gardant ta place et ton profil. Pour les supprimer, ouvre Ma place." exit icon={<ExitBusIcon />} disabled={busy || !interiorControlsVisible}>
                  {phase === "exiting" ? "Sortie…" : "Sortir"}
                </HudButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2">
                <HudButton className="min-w-0 flex-auto" onClick={() => openProfileModal("name")} ariaLabel="Modifier mon nom" icon={<UserBadgeIcon />} disabled={busy || !interiorControlsVisible}>
                  Nom
                </HudButton>
                <HudButton className="min-w-0 flex-auto" onClick={() => openProfileModal("comment")} ariaLabel="Mettre un commentaire" icon={<CommentBubbleIcon />} disabled={busy || !interiorControlsVisible}>
                  Commenter
                </HudButton>
                <HudButton compact className="min-w-0 flex-auto" onClick={toggleFreeView} ariaLabel={freeView ? "Revenir à ma place" : "Explorer en vue libre"} active={freeView} icon={freeView ? <EyeViewIcon /> : <CompassExploreIcon />} disabled={busy || !interiorControlsVisible}>
                  {freeView ? "Ma place" : "Vue libre"}
                </HudButton>
              </div>
              <div className="grid w-full grid-cols-5 items-center gap-1.5 sm:gap-2">
                <HudButton compact className="min-w-0 w-full" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? "Éteindre la télévision" : "Allumer la télévision"} description={tvButtonDescription} icon={<TvIcon />} disabled={partyOn || busy || !interiorControlsVisible}>
                  TV
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon={<HeadlightsIcon />} disabled={busy || !interiorControlsVisible}>
                  Phares
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={honk} ariaLabel="Klaxonner" icon={<HornIcon />} disabled={busy || !interiorControlsVisible}>
                  Klaxon
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? "Arrêter la fête" : "Lancer la fête"} icon={<PartyIcon />} disabled={(!partyOn && busy) || !interiorControlsVisible}>
                  {partyOn ? "Stop" : "Fête"}
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={exitBus} ariaLabel="Sortir du bus" description="Sortir en gardant ta place et ton profil. Pour les supprimer, ouvre Ma place." exit icon={<ExitBusIcon />} disabled={busy || !interiorControlsVisible}>
                  {phase === "exiting" ? "Sortie…" : "Sortir"}
                </HudButton>
              </div>
            </>
          )}
        </div>
        </div>
        {toast && !hidden && (
          <div
            role="status"
            aria-live="polite"
            className="bus-toast pointer-events-none fixed select-none"
            style={{ zIndex: 2147483647 }}
          >
            <div
              onMouseEnter={() => onPauseToast?.()}
              onMouseLeave={() => onResumeToast?.()}
              onFocusCapture={() => onPauseToast?.()}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) onResumeToast?.();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
              className="bus-toast-content bus-case bus-glass flex animate-[toast-in_180ms_ease-out_both] items-start gap-2 rounded-2xl border-[#947eef]/60 px-2.5 py-2 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3"
            >
              {toast.badge && (
                <span className="bus-pill-badge mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-bold">
                  {toast.badge}
                </span>
              )}
              <div className="min-w-0 flex-1 break-words">
                <div className="bus-toast-title text-sm font-bold leading-5 text-white sm:text-base">{toast.text}</div>
                {toast.sub && (
                  safeToastHref ? (
                    <a
                      href={safeToastHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 rounded text-xs font-semibold text-[#c4b5fd] underline decoration-[#947eef]/60 underline-offset-2 transition-colors hover:text-white focus-visible:outline-none"
                    >
                      <span>{toast.sub}</span>
                      <ExternalArrowIcon className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <div className="text-xs font-semibold text-[#c4b5fd]">{toast.sub}</div>
                  )
                )}
              </div>
              {onDismissToast && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDismissToast();
                  }}
                  aria-label="Fermer la notification"
                  title="Fermer la notification"
                  className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-full text-white transition-colors hover:bg-[#6141e8]/25 hover:text-white focus-visible:outline-none cursor-pointer"
                >
                  <CloseIcon className="h-4 w-4 shrink-0" />
                </button>
              )}
            </div>
          </div>
        )}
        {immersive && !hidden && <button ref={restoreButtonRef} type="button" onClick={restoreControls} aria-label="Quitter le mode immersif et afficher les commandes"
          data-visible={immersiveRestoreVisible}
          className={`bus-immersive-restore bus-btn-secondary fixed z-[2147483647] inline-flex min-h-11 items-center gap-2 rounded-[1.125rem] px-4 text-sm font-semibold focus-visible:outline-none cursor-pointer ${
            immersiveRestoreVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          style={{ right: "calc(1rem + env(safe-area-inset-right))", top: "calc(1rem + env(safe-area-inset-top))" }}>
          Afficher les commandes
        </button>}

    </>
  );
}

function CompactMusicToggleButton({
  playing,
  suspended = false,
  partyOn,
  disabled,
  onToggle,
}: {
  playing: boolean;
  suspended?: boolean;
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
      title={partyOn ? "Party At Baratie — utilise Fête pour arrêter la musique" : suspended ? "Musique en pause pendant la vidéo/TV — cliquer pour couper" : playing ? "Couper la musique de fond (Life in Pieces)" : "Lancer la musique de fond (Howard Harper-Barnes - Life in Pieces)"}
      className={`bus-icon-button bus-glass pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full touch-manipulation focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
        playing || partyOn ? "bus-btn-active" : "bus-btn-secondary"
      }`}
    >
      {playing || partyOn ? (
        <span className={`flex h-3.5 items-end gap-0.5 shrink-0 ${suspended ? "opacity-65" : ""}`} aria-hidden="true">
          <span className={`inline-block w-1 rounded-full bg-white ${suspended ? "h-1.5" : "h-3.5"}`} />
          <span className={`inline-block w-1 rounded-full bg-white ${suspended ? "h-1.5" : "h-2"}`} />
          <span className={`inline-block w-1 rounded-full bg-white ${suspended ? "h-1.5" : "h-3"}`} />
        </span>
      ) : (
        <MusicNoteIcon className="h-4 w-4 shrink-0" />
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
        if (disabled) return;
        onToggle();
      }}
      className={`pointer-events-auto relative z-10 flex min-h-11 min-w-0 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[1.125rem] py-2 text-xs font-semibold touch-manipulation focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
        variant === "exterior" ? "px-3 min-[360px]:px-3.5" : "px-2.5 min-[360px]:px-3.5"
      } ${open ? "bus-btn-active" : "bus-btn-secondary"}`}
    >
      <SlidersIcon className="bus-landscape-hide hidden h-4 w-4 shrink-0 min-[360px]:block" />
      <span className="pointer-events-none">Commandes</span>
      {hasActiveControl && !open && (
        <span aria-hidden="true" className="bus-mobile-menu-dot pointer-events-none h-2 w-2 shrink-0 rounded-full bg-[#c4b5fd]" />
      )}
    </button>
  );
}

function HudButton({
  children,
  onClick,
  icon,
  primary,
  exit,
  active,
  ariaLabel,
  description,
  disabled,
  compact = false,
  showMobileIcon = false,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
  primary?: boolean;
  exit?: boolean;
  active?: boolean;
  ariaLabel?: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
  showMobileIcon?: boolean;
  className?: string;
}) {
  const shape = primary || exit ? "rounded-full" : "rounded-[1.125rem]";
  const base =
    `pointer-events-auto flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap ${shape} py-2 text-xs md:text-sm font-semibold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer`;
  const look = primary
    ? "bus-btn-primary"
    : exit
      ? "bus-btn-tonal"
      : active
        ? "bus-btn-active"
        : "bus-btn-secondary";
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
        if (disabled) return;
        onClick();
      }}
      disabled={disabled}
      className={`${base} ${compact ? "px-1.5 sm:px-2" : primary ? "px-4" : "px-3.5"} relative z-10 touch-manipulation ${look} ${className}`}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={`pointer-events-none shrink-0 items-center justify-center ${
            compact
              ? showMobileIcon
                ? "bus-landscape-hide hidden min-[360px]:inline-flex"
                : "bus-landscape-hide hidden sm:inline-flex"
              : "inline-flex"
          }`}
        >
          {icon}
        </span>
      )}
      <span className="pointer-events-none contents">{children}</span>
    </button>
  );
}
