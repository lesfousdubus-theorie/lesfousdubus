"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Phase } from "./bus/constants";

export interface ToastMessage {
  id: number;
  text: string;
  sub?: string;
  badge?: string;
}

interface BusHudProps {
  phase: Phase;
  hidden: boolean;
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
  tvOn: boolean;
  joining: boolean;
  busy: boolean;
  setShowTheoryModal: Dispatch<SetStateAction<boolean>>;
  setShowTheoryAge: Dispatch<SetStateAction<boolean>>;
  setStatsLoadError: Dispatch<SetStateAction<boolean>>;
  setStatsRetryToken: Dispatch<SetStateAction<number>>;
  setSeatRow: Dispatch<SetStateAction<number>>;
  setTvOn: Dispatch<SetStateAction<boolean>>;
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
}

export function BusHud({
  phase, hidden, toast, passengerManifestButtonRef, statsLoadError, count,
  numRows, theoryAgeInDays, isNight, manualDayNight, speedMultiplier, seatRow,
  exteriorControlsVisible, interiorControlsVisible, headlights, hasEntered,
  tvOn, joining, busy, setShowTheoryModal, setShowTheoryAge, setStatsLoadError,
  setStatsRetryToken, setSeatRow, setTvOn, openPassengerManifest,
  toggleDayNight, decelerateBus, accelerateBus, toggleHeadlights, honk,
  enterBus, openProfileModal, exitBus, resetView,
}: BusHudProps) {
  return (
    <>
      {/* ---------- HUD & INTERFACE UTILISATEUR (GARANTI TOUJOURS AU PREMIER PLAN Z-INDEX) ---------- */}
        <div
          className={`pointer-events-none fixed inset-0 isolate select-none ${hidden ? "invisible" : ""}`}
          style={{ zIndex: 2147483647 }}
        >
        {/* Toast notification dynamique (allongement du bus) */}
        {toast && (
          <div aria-hidden="true" className="pointer-events-none absolute left-3 right-3 top-[12rem] z-50 min-[480px]:left-auto min-[480px]:top-[4.75rem] min-[480px]:max-w-[calc(100vw-14rem)] sm:right-4 sm:top-20 sm:max-w-sm lg:left-1/2 lg:right-auto lg:top-24 lg:w-96 lg:max-w-[calc(100vw-2rem)] lg:-translate-x-1/2 xl:top-4">
            <div className="bus-glass flex animate-[toast-in_300ms_cubic-bezier(0.25,1,0.5,1)_both] items-center gap-3 rounded-2xl border border-[#ffd23f] bg-black/80 px-4 py-3 shadow-[0_0_30px_rgba(255,210,63,0.35)] backdrop-blur-md sm:px-5">
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
        <div className={`bus-title-panel pointer-events-none absolute left-3 max-w-[calc(100vw-1.5rem)] sm:left-4 sm:top-4 sm:max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-26rem)] ${phase === "inside" ? "top-[8.25rem]" : "top-[4.75rem]"}`}>
          <div className={`bus-title-copy rounded-xl bg-[#07142b]/95 px-3 py-2 shadow-lg ${phase === "inside" ? "hidden sm:inline-block" : "inline-block"}`}>
          <h1 className="break-words text-base font-black uppercase leading-[1.15] tracking-tight sm:text-xl lg:text-3xl">
            <span className="text-[#ffd23f]">La Théorie</span> <br className="sm:hidden" />
            <span className="text-white">des Fous du Bus</span>
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.035em] text-[#ffd23f] lg:text-sm">
            LE SIÈCLE OUBLIÉ EST LE PRÉSENT !!!
          </p>
          </div>
          <div className="mt-2 sm:mt-3">
            <button
              type="button"
              onClick={() => setShowTheoryModal(true)}
              className="bus-glass pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#ffd23f]/50 bg-black/75 px-4 text-xs font-black uppercase text-[#ffd23f] shadow-lg backdrop-blur-md transition hover:border-white hover:bg-[#ffd23f] hover:text-[#0d2190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 cursor-pointer"
              title="Découvrir la théorie des Fous du Bus"
            >
              <span>📜</span>
              <span>La Théorie</span>
            </button>
          </div>
        </div>

        {/* Compteurs des passagers et des jours écoulés depuis la naissance de la théorie */}
        <div className="bus-top-stats bus-glass pointer-events-auto absolute left-3 right-3 top-3 flex min-h-14 items-stretch gap-1 rounded-2xl border border-[#ffd23f]/40 bg-[#07142b]/95 p-1 shadow-lg sm:left-auto sm:right-4 sm:top-4">
          <button ref={passengerManifestButtonRef} type="button" onClick={statsLoadError && count === null ? () => {
            setStatsLoadError(false);
            setStatsRetryToken((value) => value + 1);
          } : openPassengerManifest} className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left leading-tight transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] sm:flex-none sm:gap-2.5 sm:px-3 sm:py-2">
            <span aria-hidden="true" className="text-lg sm:text-2xl">🚌</span>
            <span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.04em] text-[#ffd23f]">
                  Passagers
                </span>
                <span title={`${numRows} rangées`} className="hidden rounded-full bg-white/10 px-1.5 text-xs font-bold text-white/85 md:inline">
                  {numRows} r.
                </span>
              </span>
              <span className="block text-base font-black tabular-nums text-white sm:text-xl">
                {count === null ? (statsLoadError ? "Réessayer" : "…") : count.toLocaleString("fr-FR")}
              </span>
            </span>
          </button>
          <div className="my-1 w-px bg-white/20" aria-hidden="true" />
          <button type="button" aria-label={`La théorie existe depuis ${theoryAgeInDays.toLocaleString("fr-FR")} jours. Voir la date et la première vidéo`} onClick={() => setShowTheoryAge(true)} className="min-w-0 flex-1 rounded-xl px-2 py-1.5 text-left leading-tight transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] sm:flex-none sm:px-3 sm:py-2" title="Voir le compteur précis depuis le 26 mai 2024">
            <span className="block text-xs font-bold uppercase tracking-[0.04em] text-[#ffd23f]">
              <span className="sm:hidden">La théorie</span><span className="hidden sm:inline">La théorie existe depuis</span>
            </span>
            <span className="block text-base font-black tabular-nums text-white sm:text-xl">
              {theoryAgeInDays.toLocaleString("fr-FR")}
              <span className="ml-1 text-xs font-bold text-white/85">jours</span>
            </span>
          </button>
        </div>

        {/* Bouton interactif Jour / Nuit */}
        <div className="bus-day-night pointer-events-auto absolute bottom-[4.5rem] left-3 flex h-11 items-center gap-2 sm:bottom-4 sm:left-4">
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
        <button type="button" onClick={resetView} disabled={busy} aria-label="Recentrer la vue" title="Recentrer la vue sur le bus" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/35 bg-[#07142b]/95 text-white shadow-lg hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-60">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="6" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
        </button>
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

        {/* Navigation entre les rangées quand on est à l'intérieur */}
        {phase === "inside" && (
          <div className="bus-row-nav pointer-events-auto absolute right-3 top-[4.75rem] flex flex-col items-end gap-1.5 sm:right-4 sm:top-[6.25rem] sm:gap-2">
            {/* Déplacement dans l'allée */}
            <div className="bus-glass flex h-11 items-center gap-1 rounded-2xl bg-black/80 px-1.5 shadow-lg ring-1 ring-white/25 backdrop-blur-md sm:px-3">
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
                disabled={seatRow <= 0}
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
                disabled={seatRow >= numRows - 1}
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

        {/* Barres persistantes : aucune commande ne se téléporte sous le pointeur. */}
        <div
          aria-hidden={!exteriorControlsVisible}
          className={`bus-exterior-controls pointer-events-none absolute bottom-[7.75rem] left-1/2 z-30 flex w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 px-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:bottom-20 sm:max-w-[42rem] sm:gap-2 xl:bottom-4 xl:left-[calc(50%-4.75rem)] ${
            exteriorControlsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          <HudButton className="min-w-[96px] flex-1 sm:w-[108px] sm:flex-none" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={!exteriorControlsVisible}>
            {headlights ? "Éteindre" : "Phares"}
          </HudButton>
          <HudButton className="min-w-[104px] flex-1 sm:w-[112px] sm:flex-none" onClick={honk} icon="📯" disabled={!exteriorControlsVisible}>
            Klaxonner
          </HudButton>
          {hasEntered && phase === "outside" && (
            <div className="animate-[hud-control-in-flow_220ms_cubic-bezier(0.25,1,0.5,1)_both] motion-reduce:animate-none">
              <HudButton
                className="w-[124px] sm:w-[132px]"
                onClick={() => setTvOn((value) => !value)}
                active={tvOn}
                ariaLabel="Télévision"
                icon="📺"
              >
                {tvOn ? "Éteindre la TV" : "Allumer la TV"}
              </HudButton>
            </div>
          )}
          <HudButton className="w-full sm:w-[190px]" onClick={() => void enterBus()} primary icon="🚪" disabled={joining || phase !== "outside"}>
            {joining || phase === "entering" ? "Installation…" : "Entrer dans le bus"}
          </HudButton>
        </div>

        <div
          aria-hidden={!interiorControlsVisible}
          className={`bus-interior-controls pointer-events-none absolute bottom-[7.75rem] left-1/2 flex w-[512px] max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col items-center justify-center gap-1.5 px-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:bottom-20 sm:gap-2 xl:bottom-4 ${
            interiorControlsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2">
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("name")} ariaLabel="Ajouter un prénom" icon="🏷️" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">Prénom</span><span className="hud-label-long hidden sm:inline">Ajouter un prénom</span>
            </HudButton>
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("comment")} ariaLabel="Mettre un commentaire" icon="💬" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">Commenter</span><span className="hud-label-long hidden sm:inline">Mettre un commentaire</span>
            </HudButton>
          </div>
          <div className="grid w-full grid-cols-4 items-center gap-1.5 sm:grid-cols-[1.25fr_1fr_0.82fr_1.08fr] sm:gap-2">
            <HudButton compact className="min-w-0 w-full" onClick={() => setTvOn((v) => !v)} active={tvOn} ariaLabel={tvOn ? "Éteindre la télévision" : "Allumer la télévision"} icon="📺" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">TV</span><span className="hud-label-long hidden sm:inline">{tvOn ? "Éteindre la TV" : "Allumer la TV"}</span>
            </HudButton>
            <HudButton compact className="min-w-0 w-full" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={busy || !interiorControlsVisible}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton compact className="min-w-0 w-full" onClick={honk} ariaLabel="Klaxonner" icon="📯" disabled={busy || !interiorControlsVisible}>
              Klaxon
            </HudButton>
            <HudButton compact className="min-w-0 w-full" onClick={exitBus} ariaLabel="Sortir du bus" primary icon="🏝️" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">{phase === "exiting" ? "Descente…" : "Sortir"}</span><span className="hud-label-long hidden sm:inline">{phase === "exiting" ? "Descente…" : "Sortir du bus"}</span>
            </HudButton>
          </div>
        </div>
        </div>

    </>
  );
}

function HudButton({
  children,
  onClick,
  icon,
  primary,
  active,
  ariaLabel,
  disabled,
  compact = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: string;
  primary?: boolean;
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  compact?: boolean;
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
      {icon && <span aria-hidden="true" className={`pointer-events-none text-sm leading-none ${compact ? "hidden sm:inline" : ""}`}>{icon}</span>}
      <span className="pointer-events-none contents">{children}</span>
    </button>
  );
}
