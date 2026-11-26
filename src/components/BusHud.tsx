"use client";

import { memo, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import type { Phase } from "./bus/constants";
import { COMPACT_HUD_MEDIA_QUERY, useHudLayout } from "./useHudLayout";
import { emitBusAudioEvent, INITIAL_MUSIC_PLAYBACK, onBusAudioEvent, type BusMusicPlayback } from "@/lib/bus-audio";
import { countPeopleOnBoard } from "@/lib/bus-crew";
import { formatOrdinalRank, pickLocale, useLocale } from "@/lib/i18n";
import { getSeatCountInRow } from "@/lib/bus-layout";
import MusicPlaybackControls from "./audio/MusicPlaybackControls";
import TheorySettingsPanel from "./theory/TheorySettingsPanel";
import {
  DEFAULT_GRAPHICS_SETTINGS,
  type GraphicsPresetPreference,
  type GraphicsSettings,
  type SceneGraphicsTelemetry,
} from "@/lib/scene-performance";
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
  exteriorControlsVisible: boolean;
  interiorControlsVisible: boolean;
  headlights: boolean;
  partyOn: boolean;
  toggleParty: () => void;
  tvOn: boolean;
  joining: boolean;
  busy: boolean;
  setShowTheoryModal: Dispatch<SetStateAction<boolean>>;
  setShowTheoryAge: Dispatch<SetStateAction<boolean>>;
  graphicsSettings?: GraphicsSettings;
  graphicsTelemetry?: SceneGraphicsTelemetry | null;
  onSelectGraphicsPreset?: (preset: GraphicsPresetPreference) => void;
  onUpdateGraphicsSettings?: (patch: Partial<GraphicsSettings>) => void;
  onResetGraphicsSettings?: () => void;
  setStatsLoadError: Dispatch<SetStateAction<boolean>>;
  setStatsRetryToken: Dispatch<SetStateAction<number>>;
  onImmersiveChange?: (immersive: boolean) => void;
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

export const BusSeatNav = memo(function BusSeatNav({
  visible,
  seatRow,
  seatColumn,
  numRows,
  setSeatRow,
  setSeatColumn,
}: {
  visible: boolean;
  seatRow: number;
  seatColumn: number;
  numRows: number;
  setSeatRow: Dispatch<SetStateAction<number>>;
  setSeatColumn: Dispatch<SetStateAction<number | null>>;
}) {
  const locale = useLocale();
  if (!visible) return null;
  const seatCountInRow = getSeatCountInRow(seatRow);
  return (
    <div
      className="pointer-events-none fixed inset-0 isolate select-none"
      style={{ zIndex: 2147483647 }}
    >
      <div className="bus-row-nav pointer-events-auto absolute right-3 top-[4.75rem] sm:right-4 sm:top-[6.25rem]">
        <div className="bus-case bus-glass flex flex-col gap-1 rounded-[1.25rem] p-1.5 backdrop-blur-md">
          {/* Déplacement dans l'allée */}
          <div className="grid grid-cols-[2.75rem_minmax(6.75rem,1fr)_2.75rem] items-center gap-1">
            <button
              type="button"
              onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
              disabled={seatRow <= 0}
              aria-label={pickLocale(locale, "Rangée précédente", "Previous row")}
              className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:border-[#cfc4fc] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              title={seatRow <= 0 ? pickLocale(locale, "Première rangée atteinte", "First row reached") : pickLocale(locale, "Rangée précédente", "Previous row")}
            >
              <ChevronLeftIcon className="h-4 w-4 shrink-0" />
            </button>
            <span className="flex h-10 items-center justify-center px-1.5 text-xs font-bold leading-none tabular-nums whitespace-nowrap text-white">
              <span>{pickLocale(locale, "Rangée", "Row")}</span>
              <span className="ml-1 text-[#c4b5fd]">{seatRow + 1}</span>
              <span className="mx-0.5 text-[#a3aed9]">/</span>
              <span>{numRows}</span>
            </span>
            <button
              type="button"
              onClick={() => setSeatRow((r) => Math.min(numRows - 1, r + 1))}
              disabled={seatRow >= numRows - 1}
              aria-label={pickLocale(locale, "Rangée suivante", "Next row")}
              className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:border-[#cfc4fc] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              title={seatRow >= numRows - 1 ? pickLocale(locale, "Dernière rangée atteinte", "Last row reached") : pickLocale(locale, "Rangée suivante", "Next row")}
            >
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
            </button>
          </div>

          {/* Déplacement latéral sur les sièges de la rangée */}
          <div className="grid grid-cols-[2.75rem_minmax(6.75rem,1fr)_2.75rem] items-center gap-1 border-t border-[#947eef]/20 pt-1">
            <button
              type="button"
              onClick={() => setSeatColumn(Math.max(0, seatColumn - 1))}
              disabled={seatColumn <= 0}
              aria-label={pickLocale(locale, "Colonne à gauche", "Column left")}
              className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:border-[#cfc4fc] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              title={seatColumn <= 0 ? pickLocale(locale, "Déjà dans la colonne la plus à gauche", "Already in the leftmost column") : pickLocale(locale, "Colonne à gauche", "Column left")}
            >
              <ChevronLeftIcon className="h-4 w-4 shrink-0" />
            </button>
            <span className="flex h-10 items-center justify-center px-1.5 text-xs font-bold leading-none tabular-nums whitespace-nowrap text-white">
              <span>{pickLocale(locale, "Colonne", "Column")}</span>
              <span className="ml-1 text-[#c4b5fd]">{seatColumn + 1}</span>
              <span className="mx-0.5 text-[#a3aed9]">/</span>
              <span>{seatCountInRow}</span>
            </span>
            <button
              type="button"
              onClick={() => setSeatColumn(Math.min(seatCountInRow - 1, seatColumn + 1))}
              disabled={seatColumn >= seatCountInRow - 1}
              aria-label={pickLocale(locale, "Colonne à droite", "Column right")}
              className="grid h-10 w-11 place-items-center rounded-[0.875rem] border border-[#947eef]/28 bg-[#0e1438] p-0 text-white transition-colors hover:border-[#cfc4fc] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              title={seatColumn >= seatCountInRow - 1 ? pickLocale(locale, "Déjà dans la colonne la plus à droite", "Already in the rightmost column") : pickLocale(locale, "Colonne à droite", "Column right")}
            >
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const BusHud = memo(function BusHud({
  hasSavedPlace, entryNumber, openPlaceModal,
  phase, phaseEpoch = 0, freeView, toggleFreeView, openAvatarModal, hidden, sceneAvailable, toast,
  onDismissToast, onPauseToast, onResumeToast,
  passengerManifestButtonRef, statsLoadError, count,
  numRows, theoryAgeInDays, isNight, manualDayNight, speedMultiplier,
  exteriorControlsVisible, interiorControlsVisible, headlights,
  tvOn, joining, busy, setShowTheoryModal, setShowTheoryAge,
  graphicsSettings = DEFAULT_GRAPHICS_SETTINGS, graphicsTelemetry = null,
  onSelectGraphicsPreset, onUpdateGraphicsSettings, onResetGraphicsSettings,
  setStatsLoadError,
  setStatsRetryToken, onImmersiveChange, toggleTv, openPassengerManifest,
  toggleDayNight, decelerateBus, accelerateBus, toggleHeadlights, honk,
  enterBus, openProfileModal, exitBus, resetView, bgmPlaying, toggleBgm,
  bgmVolume, setBgmVolume,
  partyOn, toggleParty,
}: BusHudProps) {
  const locale = useLocale();
  const compactHud = useSyncExternalStore(subscribeCompactHud, getCompactHudSnapshot, () => false);
  const [immersive, setImmersive] = useState(false);
  useEffect(() => {
    onImmersiveChange?.(immersive);
  }, [immersive, onImmersiveChange]);
  const [immersiveRestoreVisible, setImmersiveRestoreVisible] = useState(true);
  const [mobileMenuState, setMobileMenuState] = useState<{ open: boolean; phase: Phase }>({ open: false, phase });
  const [musicDetailsState, setMusicDetailsState] = useState<{ open: boolean; phase: Phase; epoch: number }>({
    open: false,
    phase,
    epoch: phaseEpoch,
  });
  const [speedMenuState, setSpeedMenuState] = useState<{ open: boolean; phase: Phase; epoch: number }>({
    open: false,
    phase,
    epoch: phaseEpoch,
  });
  const [settingsMenuState, setSettingsMenuState] = useState<{ open: boolean; phase: Phase; epoch: number }>({
    open: false,
    phase,
    epoch: phaseEpoch,
  });
  const [musicPlayback, setMusicPlayback] = useState<BusMusicPlayback>(INITIAL_MUSIC_PLAYBACK);
  const immersiveButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const exteriorMenuButtonRef = useRef<HTMLButtonElement>(null);
  const interiorMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const speedTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const speedPanelRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = useId();
  const musicDetailsOpen = musicDetailsState.open && musicDetailsState.phase === phase && musicDetailsState.epoch === phaseEpoch && !hidden && !immersive;
  const speedMenuOpen = speedMenuState.open && speedMenuState.phase === phase && speedMenuState.epoch === phaseEpoch && !hidden && !immersive;
  const settingsMenuOpen = settingsMenuState.open && settingsMenuState.phase === phase && settingsMenuState.epoch === phaseEpoch && !hidden && !immersive;
  const mobileMenuOpen = mobileMenuState.open && mobileMenuState.phase === phase && compactHud && sceneAvailable && !hidden && !immersive;
  const hudRef = useHudLayout(phase, hidden, sceneAvailable, compactHud, mobileMenuOpen, immersive);
  const activeMenuButtonRef = exteriorControlsVisible ? exteriorMenuButtonRef : interiorMenuButtonRef;
  const hasActiveGroupedControl = partyOn || headlights || speedMultiplier !== 1 || manualDayNight !== null;
  const musicSuspendedByTv = bgmPlaying && !partyOn && musicPlayback.track === "background" && musicPlayback.state === "suspended";
  const resetViewTitle = phase === "inside" && !freeView
    ? pickLocale(locale, "Recentrer la vue sur l’écran", "Recenter view on the screen")
    : pickLocale(locale, "Recentrer la vue sur le bus", "Recenter view on the bus");
  const tvButtonDescription = partyOn
    ? pickLocale(locale, "La fête est en cours — arrête la fête pour utiliser la télévision", "Party is active — stop the party to use the TV")
    : tvOn
      ? pickLocale(locale, "Éteindre la télévision", "Turn off the TV")
      : pickLocale(locale, "Allumer la télévision", "Turn on the TV");
  const safeToastHref = toast?.href && /^https?:\/\//i.test(toast.href) ? toast.href : undefined;

  const toggleMobileMenu = () => {
    setMusicDetailsState({ open: false, phase, epoch: phaseEpoch });
    setSpeedMenuState({ open: false, phase, epoch: phaseEpoch });
    setSettingsMenuState({ open: false, phase, epoch: phaseEpoch });
    setMobileMenuState((prev) => ({ open: !(prev.open && prev.phase === phase), phase }));
  };
  const closeMobileMenu = () => {
    setMobileMenuState({ open: false, phase });
    setSpeedMenuState({ open: false, phase, epoch: phaseEpoch });
    setSettingsMenuState({ open: false, phase, epoch: phaseEpoch });
  };
  const handleMusicDetailsOpenChange = (nextOpen: boolean) => {
    setMusicDetailsState({ open: nextOpen, phase, epoch: phaseEpoch });
    if (nextOpen) {
      closeMobileMenu();
    }
  };

  useEffect(() => {
    const unsubscribe = onBusAudioEvent("musicPlayback", (next) => {
      setMusicPlayback((prev) => (prev.track === next.track && prev.state === next.state ? prev : next));
    });
    emitBusAudioEvent("musicSnapshot");
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!speedMenuOpen && !settingsMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (speedMenuOpen && !speedTriggerRef.current?.contains(target) && !speedPanelRef.current?.contains(target)) {
        setSpeedMenuState({ open: false, phase, epoch: phaseEpoch });
      }
      if (settingsMenuOpen && !settingsTriggerRef.current?.contains(target) && !settingsPanelRef.current?.contains(target)) {
        setSettingsMenuState({ open: false, phase, epoch: phaseEpoch });
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSpeedMenuState({ open: false, phase, epoch: phaseEpoch });
        setSettingsMenuState({ open: false, phase, epoch: phaseEpoch });
      }
    };
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [phase, phaseEpoch, settingsMenuOpen, speedMenuOpen]);

  useLayoutEffect(() => {
    if (!speedMenuOpen && !settingsMenuOpen) return;
    const isSettings = settingsMenuOpen;
    const panel = isSettings ? settingsPanelRef.current : speedPanelRef.current;
    const trigger = isSettings ? settingsTriggerRef.current : speedTriggerRef.current;
    if (!panel || !trigger) return;

    const position = () => {
      const triggerRect = trigger.getBoundingClientRect();
      if (triggerRect.width === 0 && triggerRect.height === 0) return;
      const vv = window.visualViewport;
      const vpLeft = vv?.offsetLeft ?? 0;
      const vpTop = vv?.offsetTop ?? 0;
      const vw = vv?.width ?? window.innerWidth;
      const margin = 12;

      let bottomAnchorTop = triggerRect.top;
      if (compactHud && mobileMenuRef.current) {
        const menuRect = mobileMenuRef.current.getBoundingClientRect();
        if (menuRect.height > 0) {
          bottomAnchorTop = Math.min(bottomAnchorTop, menuRect.top);
        }
      }

      const maxH = Math.max(140, Math.floor(bottomAnchorTop - 8 - (vpTop + margin)));
      panel.style.maxHeight = `${maxH}px`;

      const panelRect = panel.getBoundingClientRect();
      const rawLeft = isSettings
        ? (compactHud
            ? vpLeft + (vw - panelRect.width) / 2
            : triggerRect.right - panelRect.width)
        : triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;

      const minLeft = vpLeft + margin;
      const maxLeft = Math.max(minLeft, vpLeft + vw - panelRect.width - margin);
      const clampedLeft = Math.round(Math.max(minLeft, Math.min(rawLeft, maxLeft)));
      const clampedTop = Math.round(Math.max(vpTop + margin, bottomAnchorTop - 8 - panelRect.height));

      panel.style.left = `${clampedLeft}px`;
      panel.style.top = `${clampedTop}px`;
      panel.style.visibility = "visible";
    };

    position();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(panel);
    observer.observe(trigger);
    if (mobileMenuRef.current) observer.observe(mobileMenuRef.current);
    if (hudRef.current) observer.observe(hudRef.current);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [compactHud, hudRef, mobileMenuOpen, phase, settingsMenuOpen, speedMenuOpen]);

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
      if (event.target.closest(".bus-mobile-menu, [data-mobile-menu-toggle], [data-bus-hud-popover]")) return;
      setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
      setSpeedMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
      setSettingsMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
        setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
        setSpeedMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
        setSettingsMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
        focusTrigger();
      } else if (event.key === "F1") {
        setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
    };
    const onResize = () => {
      if (!getCompactHudSnapshot()) {
        setMobileMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
        setSpeedMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
        setSettingsMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
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
              {locale === "en" ? (
                <>
                  <span className="text-[#c4b5fd]">The Bus Fools</span> <br className="sm:hidden" />
                  <span className="text-white">Theory</span>
                </>
              ) : (
                <>
                  <span className="text-[#c4b5fd]">La Théorie</span> <br className="sm:hidden" />
                  <span className="text-white">des Fous du Bus</span>
                </>
              )}
            </h1>
            <p className="mt-1 hidden text-xs font-bold uppercase leading-tight tracking-[0.035em] text-[#a995f7] sm:block lg:text-sm">
              {pickLocale(locale, "Le Siècle Oublié est le Présent", "The Void Century is the Present")}
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
              title={pickLocale(locale, "Découvrir la théorie des Fous du Bus", "Discover the Bus Fools Theory")}
            >
              <ScrollIcon className="bus-landscape-hide hidden h-4 w-4 shrink-0 min-[360px]:block" />
              <span>
                {locale === "en"
                  ? <><span className="bus-landscape-hide hidden min-[360px]:inline">The </span>Theory</>
                  : <><span className="bus-landscape-hide hidden min-[360px]:inline">La </span>Théorie</>}
              </span>
            </button>
            <button
              type="button"
              onClick={openAvatarModal}
              disabled={busy}
              aria-haspopup="dialog"
              aria-label={phase === "inside" ? pickLocale(locale, "Changer de personnage", "Change character") : pickLocale(locale, "Choisir mon personnage", "Choose my character")}
              title={phase === "inside" ? pickLocale(locale, "Changer de personnage", "Change character") : pickLocale(locale, "Choisir mon personnage", "Choose my character")}
              className="bus-btn-secondary pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none disabled:opacity-60 cursor-pointer"
            >
              <PersonIcon className="h-5 w-5 shrink-0" />
            </button>
            {hasSavedPlace && (
              <button
                type="button"
                data-place-button
                onClick={openPlaceModal}
                disabled={busy}
                aria-haspopup="dialog"
                aria-label={entryNumber ? pickLocale(locale, `Ma place, numéro ${entryNumber}`, `My seat, number ${entryNumber}`) : pickLocale(locale, "Ma place", "My seat")}
                title={entryNumber
                  ? pickLocale(
                      locale,
                      `Place n° ${entryNumber} (${formatOrdinalRank(entryNumber, "fr")} personne à être rentrée dans le bus)`,
                      `Seat #${entryNumber} (${formatOrdinalRank(entryNumber, "en")} person to board the bus)`,
                    )
                  : pickLocale(locale, "Gérer ma place", "Manage my seat")}
                className="bus-btn-secondary pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold focus-visible:outline-none disabled:opacity-60 min-[360px]:px-2.5 min-[390px]:px-3 sm:gap-2 sm:px-4 sm:text-xs cursor-pointer"
              >
                <SeatTicketIcon className="bus-landscape-hide hidden h-4 w-4 shrink-0 sm:block" />
                <span>{pickLocale(locale, "Ma place", "My seat")}</span>
                {entryNumber !== null && entryNumber !== undefined && (
                  <span className="bus-pill-badge rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums sm:text-[11px]">
                    {pickLocale(locale, "N°\u00a0", "#")}{entryNumber.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}
                  </span>
                )}
              </button>
            )}
          </div>
          <button ref={immersiveButtonRef} type="button" onClick={() => { setMusicDetailsState({ open: false, phase, epoch: phaseEpoch }); closeMobileMenu(); setImmersiveRestoreVisible(true); setImmersive(true); }} disabled={!sceneAvailable || busy} aria-label={pickLocale(locale, "Activer le mode immersif", "Enable immersive mode")} title={pickLocale(locale, "Mode immersif", "Immersive mode")}
            className="bus-immersive-toggle bus-btn-secondary pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold focus-visible:outline-none disabled:opacity-60 sm:gap-2 sm:px-3.5 sm:text-xs cursor-pointer">
            <FullscreenExpandIcon className="h-4 w-4 shrink-0" />
            <span className="bus-landscape-hide">{pickLocale(locale, "Mode immersif", "Immersive mode")}</span>
          </button>
        </div>

        {/* Compteurs des passagers et des jours écoulés depuis la naissance de la théorie */}
        <div className="bus-top-stats bus-case bus-glass pointer-events-auto absolute right-2 top-2 flex min-h-11 items-stretch gap-0.5 rounded-[1.25rem] p-0.5 backdrop-blur-md min-[375px]:p-1 sm:left-auto sm:right-4 sm:top-4 sm:min-h-14 sm:gap-1 sm:p-1">
          <button ref={passengerManifestButtonRef} type="button" onClick={openPassengerManifest} title={pickLocale(locale, "Voir la liste des passagers", "View passenger list")} className="group flex min-h-11 min-w-0 flex-none items-center gap-1 rounded-[1rem] border border-transparent px-2 py-1 text-left leading-tight transition-[border-color] duration-150 hover:border-[#cfc4fc]/80 focus-visible:outline-none min-[375px]:gap-1.5 min-[375px]:px-2.5 sm:gap-2.5 sm:px-3 sm:py-2 cursor-pointer">
            <span aria-hidden="true" className="hidden text-[#c4b5fd] min-[400px]:inline-flex min-[400px]:items-center">
              <BusFrontIcon className="h-4 w-4 shrink-0 sm:h-6 sm:w-6" />
            </span>
            <span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#c4b5fd] sm:text-xs">
                  {pickLocale(locale, "Passagers", "Passengers")}
                </span>
                <span title={pickLocale(locale, `${numRows} rangées`, `${numRows} rows`)} className="bus-landscape-hide hidden rounded-full border border-[#947eef]/30 bg-[#6141e8]/20 px-1.5 text-xs font-semibold text-[#dfe5ff] md:inline">
                  {numRows} r.
                </span>
              </span>
              <span className="bus-stats-value block text-sm font-black tabular-nums text-white sm:text-xl">
                {count === null ? (statsLoadError ? pickLocale(locale, "Liste", "List") : "…") : countPeopleOnBoard(count).toLocaleString(locale === "en" ? "en-US" : "fr-FR")}
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
              title={pickLocale(locale, "Réessayer de charger le compteur des passagers", "Retry loading passenger counter")}
              className="bus-btn-tonal flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold focus-visible:outline-none cursor-pointer"
            >
              <span>{pickLocale(locale, "Réessayer", "Try again")}</span>
            </button>
          )}
          <div className="my-1 w-px bg-[#947eef]/25" aria-hidden="true" />
          <button
            type="button"
            aria-label={pickLocale(
              locale,
              `La théorie existe depuis ${theoryAgeInDays.toLocaleString("fr-FR")} jours. Voir la date et la première vidéo`,
              `The theory has stood for ${theoryAgeInDays.toLocaleString("en-US")} days. View the date and the first video`,
            )}
            onClick={() => setShowTheoryAge(true)}
            className="min-h-11 min-w-0 flex-none rounded-[1rem] border border-transparent px-2 py-1 text-left leading-tight transition-[border-color] duration-150 hover:border-[#cfc4fc]/80 focus-visible:outline-none min-[375px]:px-2.5 sm:px-3 sm:py-2 cursor-pointer"
            title={pickLocale(locale, "Voir le compteur précis depuis le 26 mai 2024", "View exact counter since May 26, 2024")}
          >
            <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#c4b5fd] sm:text-xs">
              <span className="hud-label-short sm:hidden">
                {locale === "en" ? "Theory" : <><span className="hidden min-[375px]:inline">La </span>théorie</>}
              </span>
              <span className="hud-label-long hidden sm:inline">
                {pickLocale(locale, "La théorie existe depuis", "Theory has stood for")}
              </span>
            </span>
            <span className="bus-stats-value block text-sm font-black tabular-nums text-white sm:text-xl">
              {theoryAgeInDays.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}
              <span className="ml-0.5 text-[10px] font-bold text-[#dfe5ff] sm:ml-1 sm:text-xs">
                <span className="min-[375px]:hidden">{pickLocale(locale, "j", "d")}</span>
                <span className="hidden min-[375px]:inline">{pickLocale(locale, "jours", "days")}</span>
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
                title={manualDayNight === null
                  ? pickLocale(locale, `Forcer le mode ${isNight ? "Jour" : "Nuit"}`, `Force ${isNight ? "Day" : "Night"} mode`)
                  : pickLocale(locale, "Revenir au cycle automatique", "Return to automatic cycle")}
                aria-label={manualDayNight === null
                  ? pickLocale(
                      locale,
                      `Cycle automatique, actuellement ${isNight ? "nuit" : "jour"}. Forcer le mode ${isNight ? "jour" : "nuit"}`,
                      `Automatic cycle, currently ${isNight ? "night" : "day"}. Force ${isNight ? "day" : "night"} mode`,
                    )
                  : pickLocale(
                      locale,
                      `Mode ${isNight ? "nuit" : "jour"} forcé. Revenir au cycle automatique`,
                      `Forced ${isNight ? "night" : "day"} mode. Return to automatic cycle`,
                    )}
                className={`bus-glass flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-none sm:px-3.5 sm:text-sm cursor-pointer ${
                  manualDayNight !== null ? "bus-btn-active" : "bus-btn-secondary"
                }`}
              >
                {isNight ? (
                  <MoonIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
                ) : (
                  <SunIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
                )}
                <span>{manualDayNight === null ? "Auto" : isNight ? pickLocale(locale, "Nuit", "Night") : pickLocale(locale, "Jour", "Day")}</span>
              </button>
              <button type="button" onClick={resetView} disabled={busy} aria-label={pickLocale(locale, "Recentrer la vue", "Recenter view")} title={resetViewTitle} className="bus-btn-secondary grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                <CrosshairResetIcon className="h-5 w-5 shrink-0" />
              </button>
              <button
                type="button"
                onClick={toggleBgm}
                disabled={partyOn}
                aria-pressed={bgmPlaying || partyOn}
                aria-label={partyOn
                  ? pickLocale(locale, "Musique de fête active — arrêter avec le bouton Fête", "Party music active — stop with the Party button")
                  : bgmPlaying
                    ? pickLocale(locale, "Couper la musique de fond", "Stop background music")
                    : pickLocale(locale, "Activer la musique de fond (Life in Pieces — Le Mont Corvo)", "Play background music (Life in Pieces — Le Mont Corvo)")}
                title={partyOn
                  ? pickLocale(locale, "Party At Baratie — utilise Fête pour arrêter la musique", "Party At Baratie — use Party to stop music")
                  : musicSuspendedByTv
                    ? pickLocale(locale, "Musique en pause pendant la vidéo/TV — cliquer pour couper", "Music paused during video/TV — click to mute")
                    : bgmPlaying
                      ? pickLocale(locale, "Couper la musique de fond (Life in Pieces)", "Stop background music (Life in Pieces)")
                      : pickLocale(locale, "Lancer la musique de fond (Howard Harper-Barnes - Life in Pieces)", "Play background music (Howard Harper-Barnes - Life in Pieces)")}
                className={`bus-glass flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 sm:text-sm cursor-pointer ${
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
                <span>{pickLocale(locale, "Musique", "Music")}</span>
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

            {/* Contrôleur de vitesse du bus + Paramètres en bas à droite */}
            <div className="bus-speed pointer-events-none absolute bottom-3 right-3 z-40 flex items-center gap-1.5 sm:right-4 sm:bottom-4 sm:gap-2">
              <div className="pointer-events-auto relative">
                <button
                  ref={speedTriggerRef}
                  type="button"
                  onClick={() => {
                    setMusicDetailsState({ open: false, phase, epoch: phaseEpoch });
                    setSettingsMenuState({ open: false, phase, epoch: phaseEpoch });
                    setSpeedMenuState((prev) => ({
                      open: !(prev.open && prev.phase === phase && prev.epoch === phaseEpoch),
                      phase,
                      epoch: phaseEpoch,
                    }));
                  }}
                  aria-expanded={speedMenuOpen}
                  aria-label={pickLocale(locale, "Vitesse du bus", "Bus speed")}
                  title={pickLocale(locale, "Vitesse du bus", "Bus speed")}
                  className={`${speedMenuOpen || speedMultiplier !== 1 ? "bus-btn-active" : "bus-btn-secondary"} bus-glass flex h-11 items-center gap-2 rounded-full px-3.5 text-xs font-semibold backdrop-blur-md focus-visible:outline-none sm:text-sm cursor-pointer`}
                >
                  {speedMultiplier >= 2.0 ? (
                    <FastBoltIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <SlowSpeedIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span>{pickLocale(locale, "Vitesse", "Speed")}</span>
                </button>
              </div>
              <div className="pointer-events-auto relative">
                <button
                  ref={settingsTriggerRef}
                  type="button"
                  onClick={() => {
                    setMusicDetailsState({ open: false, phase, epoch: phaseEpoch });
                    setSpeedMenuState({ open: false, phase, epoch: phaseEpoch });
                    setSettingsMenuState((prev) => ({
                      open: !(prev.open && prev.phase === phase && prev.epoch === phaseEpoch),
                      phase,
                      epoch: phaseEpoch,
                    }));
                  }}
                  aria-expanded={settingsMenuOpen}
                  aria-label={pickLocale(locale, "Paramètres", "Settings")}
                  title={pickLocale(locale, "Paramètres", "Settings")}
                  className={`${settingsMenuOpen ? "bus-btn-active" : "bus-btn-secondary"} bus-glass grid h-11 w-11 shrink-0 place-items-center rounded-full backdrop-blur-md focus-visible:outline-none cursor-pointer`}
                >
                  <SlidersIcon className="h-4 w-4 shrink-0 text-[#dcd3ff]" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* La navigation rangée/colonne est rendue par BusSeatNav pour éviter de re-rendre tout le HUD. */}

        {/* Commandes secondaires dépliées librement au-dessus de la barre inférieure */}
        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            id={mobileMenuId}
            role="region"
            aria-label={pickLocale(locale, "Commandes du bus", "Bus controls")}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            className="bus-mobile-menu pointer-events-none fixed bottom-16 left-1/2 z-40 flex w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 text-white"
          >
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={toggleHeadlights} active={headlights} ariaLabel={pickLocale(locale, "Phares", "Headlights")} icon={<HeadlightsIcon />} disabled={busy}>
              {headlights ? pickLocale(locale, "Éteindre", "Turn off") : pickLocale(locale, "Phares", "Lights")}
            </HudButton>
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={honk} ariaLabel={pickLocale(locale, "Klaxonner", "Honk")} icon={<HornIcon />} disabled={busy}>
              {pickLocale(locale, "Klaxon", "Horn")}
            </HudButton>
            <HudButton compact showMobileIcon className="px-2.5 min-[360px]:px-3" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? pickLocale(locale, "Arrêter la fête", "Stop party") : pickLocale(locale, "Lancer la fête", "Start party")} icon={<PartyIcon />} disabled={!partyOn && busy}>
              {partyOn ? "Stop" : pickLocale(locale, "Fête", "Party")}
            </HudButton>
            <button
              type="button"
              onClick={toggleDayNight}
              title={manualDayNight === null
                ? pickLocale(locale, `Forcer le mode ${isNight ? "Jour" : "Nuit"}`, `Force ${isNight ? "Day" : "Night"} mode`)
                : pickLocale(locale, "Revenir au cycle automatique", "Return to automatic cycle")}
              aria-label={manualDayNight === null
                ? pickLocale(
                    locale,
                    `Cycle automatique, actuellement ${isNight ? "nuit" : "jour"}. Forcer le mode ${isNight ? "jour" : "nuit"}`,
                    `Automatic cycle, currently ${isNight ? "night" : "day"}. Force ${isNight ? "day" : "night"} mode`,
                  )
                : pickLocale(
                    locale,
                    `Mode ${isNight ? "nuit" : "jour"} forcé. Revenir au cycle automatique`,
                    `Forced ${isNight ? "night" : "day"} mode. Return to automatic cycle`,
                  )}
              className={`bus-mobile-day-night bus-glass pointer-events-auto flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-xs font-semibold focus-visible:outline-none cursor-pointer ${
                manualDayNight !== null ? "bus-btn-active" : "bus-btn-secondary"
              }`}
            >
              {isNight ? (
                <MoonIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
              ) : (
                <SunIcon className={`h-4 w-4 shrink-0 ${manualDayNight !== null ? "text-white" : "text-[#dcd3ff]"}`} />
              )}
              <span>{manualDayNight === null ? "Auto" : isNight ? pickLocale(locale, "Nuit", "Night") : pickLocale(locale, "Jour", "Day")}</span>
            </button>
            <button
              type="button"
              onClick={resetView}
              disabled={busy}
              aria-label={pickLocale(locale, "Recentrer la vue", "Recenter view")}
              title={resetViewTitle}
              className="bus-icon-button bus-btn-secondary bus-glass pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <CrosshairResetIcon className="h-5 w-5 shrink-0" />
            </button>
            <div className="pointer-events-auto relative z-40">
              <button
                ref={speedTriggerRef}
                type="button"
                onClick={() => {
                  setMusicDetailsState({ open: false, phase, epoch: phaseEpoch });
                  setSettingsMenuState({ open: false, phase, epoch: phaseEpoch });
                  setSpeedMenuState((prev) => ({
                    open: !(prev.open && prev.phase === phase && prev.epoch === phaseEpoch),
                    phase,
                    epoch: phaseEpoch,
                  }));
                }}
                aria-expanded={speedMenuOpen}
                aria-label={pickLocale(locale, "Vitesse du bus", "Bus speed")}
                title={pickLocale(locale, "Vitesse du bus", "Bus speed")}
                className={`${speedMenuOpen || speedMultiplier !== 1 ? "bus-btn-active" : "bus-btn-secondary"} bus-glass flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-none cursor-pointer`}
              >
                {speedMultiplier >= 2.0 ? (
                  <FastBoltIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <SlowSpeedIcon className="h-4 w-4 shrink-0" />
                )}
                <span>{pickLocale(locale, "Vitesse", "Speed")}</span>
              </button>
            </div>
            <div className="pointer-events-auto relative">
              <button
                ref={settingsTriggerRef}
                type="button"
                onClick={() => {
                  setMusicDetailsState({ open: false, phase, epoch: phaseEpoch });
                  setSpeedMenuState({ open: false, phase, epoch: phaseEpoch });
                  setSettingsMenuState((prev) => ({
                    open: !(prev.open && prev.phase === phase && prev.epoch === phaseEpoch),
                    phase,
                    epoch: phaseEpoch,
                  }));
                }}
                aria-expanded={settingsMenuOpen}
                aria-label={pickLocale(locale, "Paramètres", "Settings")}
                title={pickLocale(locale, "Paramètres", "Settings")}
                className={`bus-icon-button ${settingsMenuOpen ? "bus-btn-active" : "bus-btn-secondary"} bus-glass grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none cursor-pointer`}
              >
                <SlidersIcon className="h-4 w-4 shrink-0 text-[#dcd3ff]" />
              </button>
            </div>
          </div>
        )}

        {/* Popovers positionnés en fixed et bornés dans le viewport (évite tout débordement sur téléphone) */}
        {speedMenuOpen && (
          <div
            ref={speedPanelRef}
            data-bus-hud-popover
            role="group"
            aria-label={pickLocale(locale, "Régler la vitesse du bus", "Adjust bus speed")}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            style={{ visibility: "hidden" }}
            className="bus-case-elevated pointer-events-auto fixed z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-full p-1 text-xs shadow-2xl"
          >
            <button
              type="button"
              onClick={decelerateBus}
              disabled={speedMultiplier <= 0}
              aria-label={pickLocale(locale, "Ralentir le bus", "Slow down the bus")}
              className={compactHud
                ? "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-transparent bg-white/[0.07] text-white transition-colors hover:border-[#cfc4fc]/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                : "flex h-9 items-center justify-center gap-1.5 rounded-full border border-transparent bg-white/[0.07] px-3 text-xs font-semibold text-white transition-colors hover:border-[#cfc4fc]/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"}
              title={compactHud
                ? pickLocale(locale, "Ralentir le bus", "Slow down the bus")
                : pickLocale(locale, "Ralentir le bus (Touche - ou Flèche Bas)", "Slow down the bus (- key or Down Arrow)")}
            >
              <SlowSpeedIcon className="h-4 w-4 shrink-0" />
              {!compactHud && <span>{pickLocale(locale, "Ralentir", "Slow down")}</span>}
            </button>
            <div className="flex min-w-[2.75rem] items-center justify-center gap-1 px-1.5 font-black tabular-nums">
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
              aria-label={pickLocale(locale, "Accélérer le bus", "Speed up the bus")}
              className={compactHud
                ? "bus-btn-tonal grid h-9 w-9 shrink-0 place-items-center rounded-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                : "bus-btn-tonal flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"}
              title={compactHud
                ? pickLocale(locale, "Accélérer le bus", "Speed up the bus")
                : pickLocale(locale, "Accélérer le bus (Touche + ou Flèche Haut / Boost)", "Speed up the bus (+ key or Up Arrow / Boost)")}
            >
              <FastBoltIcon className="h-4 w-4 shrink-0" />
              {!compactHud && <span>{pickLocale(locale, "Accélérer", "Speed up")}</span>}
            </button>
          </div>
        )}

        {settingsMenuOpen && (
          <div
            ref={settingsPanelRef}
            data-bus-hud-popover
            role="dialog"
            aria-label={pickLocale(locale, "Paramètres graphiques", "Graphics settings")}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            style={{ visibility: "hidden" }}
            className="bus-case-elevated bus-scrollbar pointer-events-auto fixed z-50 w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl p-3 shadow-2xl"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wide text-white">
              <SlidersIcon className="h-3.5 w-3.5 text-[#c4b5fd]" />
              <span>{pickLocale(locale, "Paramètres", "Settings")}</span>
            </div>
            <TheorySettingsPanel
              graphicsSettings={graphicsSettings}
              telemetry={graphicsTelemetry}
              onSelectPreset={(preset) => onSelectGraphicsPreset?.(preset)}
              onUpdateGraphics={(patch) => onUpdateGraphicsSettings?.(patch)}
              onResetGraphics={() => onResetGraphicsSettings?.()}
            />
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
                  ? pickLocale(locale, "Installation…", "Boarding…")
                  : hasSavedPlace
                    ? locale === "en"
                      ? <>Back<span className="hidden min-[430px]:inline"> to seat</span></>
                      : <>Revenir<span className="hidden min-[430px]:inline"> à sa place</span></>
                    : locale === "en"
                      ? <>Board<span className="hidden min-[460px]:inline"> the bus</span></>
                      : <>Entrer<span className="hidden min-[460px]:inline"> dans le bus</span></>}
              </HudButton>
            </>
          ) : (
            <>
              <HudButton className="min-w-[96px] flex-[1_0_auto] sm:w-[108px] sm:flex-none" onClick={toggleHeadlights} active={headlights} ariaLabel={pickLocale(locale, "Phares", "Headlights")} icon={<HeadlightsIcon />} disabled={!exteriorControlsVisible}>
                {headlights ? pickLocale(locale, "Éteindre", "Turn off") : pickLocale(locale, "Phares", "Lights")}
              </HudButton>
              <HudButton className="min-w-[104px] flex-[1_0_auto] sm:w-[112px] sm:flex-none" onClick={honk} ariaLabel={pickLocale(locale, "Klaxonner", "Honk")} icon={<HornIcon />} disabled={!exteriorControlsVisible}>
                <span className="hud-label-short sm:hidden">{pickLocale(locale, "Klaxon", "Horn")}</span><span className="hud-label-long hidden sm:inline">{pickLocale(locale, "Klaxonner", "Honk")}</span>
              </HudButton>
              <HudButton className="min-w-[96px] flex-[1_0_auto] sm:w-[100px] sm:flex-none" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? pickLocale(locale, "Arrêter la fête", "Stop party") : pickLocale(locale, "Lancer la fête", "Start party")} icon={<PartyIcon />} disabled={(!partyOn && busy) || !exteriorControlsVisible}>
                {partyOn ? "Stop" : pickLocale(locale, "Fête", "Party")}
              </HudButton>
              <HudButton className="min-w-[190px] flex-[1_0_auto] sm:w-[190px] sm:flex-none" onClick={() => void enterBus()} primary icon={<EnterBusIcon />} disabled={joining || phase !== "outside"}>
                {joining || phase === "entering"
                  ? pickLocale(locale, "Installation…", "Boarding…")
                  : hasSavedPlace
                    ? pickLocale(locale, "Revenir à sa place", "Back to my seat")
                    : pickLocale(locale, "Entrer dans le bus", "Board the bus")}
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
              <div className="flex w-full flex-wrap items-center justify-center gap-1 min-[360px]:gap-1.5">
                <HudButton compact className="shrink-0 px-2.5 min-[360px]:px-3.5" onClick={() => { closeMobileMenu(); openProfileModal("name"); }} ariaLabel={pickLocale(locale, "Modifier mon nom", "Edit my name")} icon={<UserBadgeIcon />} disabled={busy || !interiorControlsVisible}>
                  {pickLocale(locale, "Nom", "Name")}
                </HudButton>
                <HudButton compact className="shrink-0 px-2.5 min-[360px]:px-3.5" onClick={() => { closeMobileMenu(); openProfileModal("comment"); }} ariaLabel={pickLocale(locale, "Mettre un commentaire", "Leave a comment")} icon={<CommentBubbleIcon />} disabled={busy || !interiorControlsVisible}>
                  {pickLocale(locale, "Commenter", "Comment")}
                </HudButton>
                <HudButton compact className="shrink-0 px-2.5 min-[360px]:px-3.5" onClick={toggleFreeView} ariaLabel={freeView ? pickLocale(locale, "Revenir à ma place", "Return to my seat") : pickLocale(locale, "Explorer en vue libre", "Explore in free view")} active={freeView} icon={freeView ? <EyeViewIcon /> : <CompassExploreIcon />} disabled={busy || !interiorControlsVisible}>
                  {freeView ? pickLocale(locale, "Ma place", "My seat") : pickLocale(locale, "Vue libre", "Free view")}
                </HudButton>
                <HudButton compact className="min-w-11 shrink-0 px-2.5 min-[360px]:px-3.5" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? pickLocale(locale, "Éteindre la télévision", "Turn off the TV") : pickLocale(locale, "Allumer la télévision", "Turn on the TV")} description={tvButtonDescription} icon={<TvIcon />} disabled={partyOn || busy || !interiorControlsVisible}>
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
                <HudButton compact showMobileIcon className="shrink-0 px-3.5 min-[360px]:px-4" onClick={() => { closeMobileMenu(); exitBus(); }} ariaLabel={pickLocale(locale, "Sortir du bus", "Exit the bus")} description={pickLocale(locale, "Sortir en gardant ta place et ton profil. Pour les supprimer, ouvre Ma place.", "Exit while keeping your seat and profile. To delete them, open My seat.")} exit icon={<ExitBusIcon />} disabled={busy || !interiorControlsVisible}>
                  {phase === "exiting" ? pickLocale(locale, "Sortie…", "Exiting…") : pickLocale(locale, "Sortir", "Exit")}
                </HudButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2">
                <HudButton className="min-w-0 flex-auto" onClick={() => openProfileModal("name")} ariaLabel={pickLocale(locale, "Modifier mon nom", "Edit my name")} icon={<UserBadgeIcon />} disabled={busy || !interiorControlsVisible}>
                  {pickLocale(locale, "Nom", "Name")}
                </HudButton>
                <HudButton className="min-w-0 flex-auto" onClick={() => openProfileModal("comment")} ariaLabel={pickLocale(locale, "Mettre un commentaire", "Leave a comment")} icon={<CommentBubbleIcon />} disabled={busy || !interiorControlsVisible}>
                  {pickLocale(locale, "Commenter", "Comment")}
                </HudButton>
                <HudButton compact className="min-w-0 flex-auto" onClick={toggleFreeView} ariaLabel={freeView ? pickLocale(locale, "Revenir à ma place", "Return to my seat") : pickLocale(locale, "Explorer en vue libre", "Explore in free view")} active={freeView} icon={freeView ? <EyeViewIcon /> : <CompassExploreIcon />} disabled={busy || !interiorControlsVisible}>
                  {freeView ? pickLocale(locale, "Ma place", "My seat") : pickLocale(locale, "Vue libre", "Free view")}
                </HudButton>
              </div>
              <div className="grid w-full grid-cols-5 items-center gap-1.5 sm:gap-2">
                <HudButton compact className="min-w-0 w-full" onClick={toggleTv} active={tvOn} ariaLabel={tvOn ? pickLocale(locale, "Éteindre la télévision", "Turn off the TV") : pickLocale(locale, "Allumer la télévision", "Turn on the TV")} description={tvButtonDescription} icon={<TvIcon />} disabled={partyOn || busy || !interiorControlsVisible}>
                  TV
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={toggleHeadlights} active={headlights} ariaLabel={pickLocale(locale, "Phares", "Headlights")} icon={<HeadlightsIcon />} disabled={busy || !interiorControlsVisible}>
                  {pickLocale(locale, "Phares", "Lights")}
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={honk} ariaLabel={pickLocale(locale, "Klaxonner", "Honk")} icon={<HornIcon />} disabled={busy || !interiorControlsVisible}>
                  {pickLocale(locale, "Klaxon", "Horn")}
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={toggleParty} active={partyOn} ariaLabel={partyOn ? pickLocale(locale, "Arrêter la fête", "Stop party") : pickLocale(locale, "Lancer la fête", "Start party")} icon={<PartyIcon />} disabled={(!partyOn && busy) || !interiorControlsVisible}>
                  {partyOn ? "Stop" : pickLocale(locale, "Fête", "Party")}
                </HudButton>
                <HudButton compact className="min-w-0 w-full" onClick={exitBus} ariaLabel={pickLocale(locale, "Sortir du bus", "Exit the bus")} description={pickLocale(locale, "Sortir en gardant ta place et ton profil. Pour les supprimer, ouvre Ma place.", "Exit while keeping your seat and profile. To delete them, open My seat.")} exit icon={<ExitBusIcon />} disabled={busy || !interiorControlsVisible}>
                  {phase === "exiting" ? pickLocale(locale, "Sortie…", "Exiting…") : pickLocale(locale, "Sortir", "Exit")}
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
                  aria-label={pickLocale(locale, "Fermer la notification", "Close notification")}
                  title={pickLocale(locale, "Fermer la notification", "Close notification")}
                  className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-full border border-transparent text-white transition-colors hover:border-[#cfc4fc]/70 hover:text-white focus-visible:outline-none cursor-pointer"
                >
                  <CloseIcon className="h-4 w-4 shrink-0" />
                </button>
              )}
            </div>
          </div>
        )}
        {immersive && !hidden && <button ref={restoreButtonRef} type="button" onClick={restoreControls} aria-label={pickLocale(locale, "Quitter le mode immersif et afficher les commandes", "Exit immersive mode and show controls")}
          data-visible={immersiveRestoreVisible}
          className={`bus-immersive-restore bus-btn-secondary fixed z-[2147483647] inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-none cursor-pointer ${
            immersiveRestoreVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          style={{ right: "calc(1rem + env(safe-area-inset-right))", top: "calc(1rem + env(safe-area-inset-top))" }}>
          {pickLocale(locale, "Afficher les commandes", "Show controls")}
        </button>}

    </>
  );
});

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
  const locale = useLocale();
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={partyOn || disabled}
      aria-pressed={playing || partyOn}
      aria-label={partyOn
        ? pickLocale(locale, "Musique de fête active — arrêter avec le bouton Fête", "Party music active — stop with the Party button")
        : playing
          ? pickLocale(locale, "Couper la musique de fond", "Stop background music")
          : pickLocale(locale, "Activer la musique de fond (Life in Pieces — Le Mont Corvo)", "Play background music (Life in Pieces — Le Mont Corvo)")}
      title={partyOn
        ? pickLocale(locale, "Party At Baratie — utilise Fête pour arrêter la musique", "Party At Baratie — use Party to stop music")
        : suspended
          ? pickLocale(locale, "Musique en pause pendant la vidéo/TV — cliquer pour couper", "Music paused during video/TV — click to mute")
          : playing
            ? pickLocale(locale, "Couper la musique de fond (Life in Pieces)", "Stop background music (Life in Pieces)")
            : pickLocale(locale, "Lancer la musique de fond (Howard Harper-Barnes - Life in Pieces)", "Play background music (Howard Harper-Barnes - Life in Pieces)")}
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
  const locale = useLocale();
  return (
    <button
      ref={buttonRef}
      type="button"
      data-mobile-menu-toggle={variant}
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      aria-haspopup="true"
      aria-label={open ? pickLocale(locale, "Fermer le menu des commandes", "Close controls menu") : pickLocale(locale, "Ouvrir le menu des commandes", "Open controls menu")}
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) return;
        onToggle();
      }}
      className={`pointer-events-auto relative z-10 flex min-h-11 min-w-0 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full py-2 text-xs font-semibold touch-manipulation focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
        variant === "exterior" ? "px-3 min-[360px]:px-3.5" : "px-2.5 min-[360px]:px-3.5"
      } ${open ? "bus-btn-active" : "bus-btn-secondary"}`}
    >
      <SlidersIcon className="bus-landscape-hide hidden h-4 w-4 shrink-0 min-[360px]:block" />
      <span className="pointer-events-none">{pickLocale(locale, "Commandes", "Controls")}</span>
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
  const shape = primary || exit ? "rounded-full" : "rounded-full";
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
