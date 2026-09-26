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
}

export function BusHud({
  phase, hidden, toast, passengerManifestButtonRef, statsLoadError, count,
  numRows, theoryAgeInDays, isNight, manualDayNight, speedMultiplier, seatRow,
  exteriorControlsVisible, interiorControlsVisible, headlights, hasEntered,
  tvOn, joining, busy, setShowTheoryModal, setShowTheoryAge, setStatsLoadError,
  setStatsRetryToken, setSeatRow, setTvOn, openPassengerManifest,
  toggleDayNight, decelerateBus, accelerateBus, toggleHeadlights, honk,
  enterBus, openProfileModal, exitBus,
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
        <div className={`bus-title-panel pointer-events-none absolute left-3 max-w-[calc(100vw-1.5rem)] sm:left-4 sm:right-[25rem] sm:top-4 sm:max-w-none lg:right-auto lg:max-w-[60vw] ${phase === "inside" ? "top-[8.25rem]" : "top-[4.75rem]"}`}>
          <h1 className={`break-words font-black uppercase leading-[1.08] tracking-tight drop-shadow-[0_3px_0_rgba(0,0,0,0.55)] text-sm sm:text-xl md:text-2xl lg:text-3xl ${phase === "inside" ? "hidden sm:block" : ""}`}>
            <span className="text-[#ffd23f]">La Théorie</span> <br className="sm:hidden" />
            <span className="text-white">des Fous du Bus</span>
          </h1>
          <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffd23f] drop-shadow sm:mt-1 sm:text-xs md:text-sm ${phase === "inside" ? "hidden sm:block" : ""}`}>
            LE SIÈCLE OUBLIÉ EST LE PRÉSENT !!!
          </p>
          <div className="mt-2 sm:mt-3">
            <button
              type="button"
              onClick={() => setShowTheoryModal(true)}
              className="bus-glass pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#ffd23f]/50 bg-black/60 px-4 text-xs font-black uppercase text-[#ffd23f] shadow-lg backdrop-blur-md transition hover:border-white hover:bg-[#ffd23f] hover:text-[#0d2190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 cursor-pointer"
              title="Découvrir la théorie des Fous du Bus"
            >
              <span>📜</span>
              <span>La Théorie</span>
            </button>
          </div>
        </div>

        {/* Compteurs des passagers et des jours écoulés depuis la naissance de la théorie */}
        <div className="bus-top-stats bus-glass pointer-events-auto absolute left-3 right-3 top-3 flex h-[3.5rem] items-stretch justify-end gap-1 rounded-2xl border border-[#ffd23f]/40 bg-black/60 p-1 shadow-lg backdrop-blur-md sm:left-auto sm:right-4 sm:top-4 sm:h-auto">
          <button ref={passengerManifestButtonRef} type="button" onClick={statsLoadError && count === null ? () => {
            setStatsLoadError(false);
            setStatsRetryToken((value) => value + 1);
          } : openPassengerManifest} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-left leading-tight transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-px hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_rgba(255,210,63,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] motion-reduce:transform-none motion-reduce:transition-none sm:gap-2.5 sm:px-3 sm:py-2">
            <span className="text-lg transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 motion-reduce:transform-none sm:text-2xl">🚌</span>
            <span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ffd23f]">
                  Passagers
                </span>
                <span className="rounded-full bg-white/15 px-1.5 text-[10px] font-bold text-white/90">
                  {numRows} r.
                </span>
              </span>
              <span className="block text-base font-black tabular-nums text-white sm:text-xl">
                {count === null ? (statsLoadError ? "Réessayer" : "…") : count.toLocaleString("fr-FR")}
              </span>
            </span>
          </button>
          <div className="my-1 w-px bg-white/20" aria-hidden="true" />
          <button type="button" onClick={() => setShowTheoryAge(true)} className="rounded-xl px-2 py-1.5 text-left leading-tight transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-px hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_rgba(255,210,63,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] motion-reduce:transform-none motion-reduce:transition-none sm:px-3 sm:py-2" title="Voir le compteur précis depuis le 26 mai 2024">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ffd23f] sm:text-[10px] sm:tracking-[0.12em]">
              La théorie existe depuis
            </span>
            <span className="block text-base font-black tabular-nums text-white sm:text-xl">
              {theoryAgeInDays.toLocaleString("fr-FR")}
              <span className="ml-1 text-[10px] font-bold uppercase text-white/70 sm:text-xs">jours</span>
            </span>
          </button>
        </div>

        {/* Bouton interactif Jour / Nuit */}
        <button
          type="button"
          onClick={toggleDayNight}
          title={manualDayNight === null ? `Forcer le mode ${isNight ? "Jour" : "Nuit"}` : "Revenir au cycle automatique"}
          aria-label={manualDayNight === null
            ? `Cycle automatique, actuellement ${isNight ? "nuit" : "jour"}. Forcer le mode ${isNight ? "jour" : "nuit"}`
            : `Mode ${isNight ? "nuit" : "jour"} forcé. Revenir au cycle automatique`}
          className="bus-day-night bus-glass pointer-events-auto absolute bottom-[4.5rem] left-3 flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-black/65 px-3 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:border-[#ffd23f]/60 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 cursor-pointer sm:bottom-4 sm:left-4 sm:gap-2 sm:px-3.5 sm:text-sm"
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
          <span className="bus-day-night-detail text-white/60 text-[10px] sm:text-xs">· {manualDayNight === null ? (isNight ? "Nuit" : "Jour") : "Auto"}</span>
        </button>

        {/* Contrôleur de vitesse du bus : Boutons interactifs Ralentir & Accélérer */}
        <div className="bus-speed bus-glass pointer-events-auto absolute bottom-3 left-3 right-3 flex min-h-11 items-center gap-1 rounded-full border border-white/25 bg-black/65 px-1.5 text-xs shadow-lg backdrop-blur-md sm:left-auto sm:right-4 sm:bottom-4 sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-sm">
          <button
            type="button"
            onClick={decelerateBus}
            disabled={speedMultiplier <= 0.3}
            aria-label="Ralentir le bus"
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-white/10 px-2 text-xs font-bold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-default disabled:opacity-30 sm:w-[90px] sm:flex-none sm:px-2.5"
            title="Ralentir le bus (Touche - ou Flèche Bas)"
          >
            <span>🐢</span>
            <span className="bus-speed-label">Ralentir</span>
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
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-[#ffd23f]/25 px-2 text-xs font-black text-[#ffd23f] transition hover:bg-[#ffd23f]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-default disabled:opacity-30 sm:w-[90px] sm:flex-none sm:px-2.5"
            title="Accélérer le bus (Touche + ou Flèche Haut / Boost)"
          >
            <span>⚡</span>
            <span className="bus-speed-label">Accélérer</span>
          </button>
        </div>

        {/* Navigation entre les rangées quand on est à l'intérieur */}
        {phase === "inside" && (
          <div className="bus-row-nav pointer-events-auto absolute right-3 top-[4.75rem] flex flex-col items-end gap-1.5 sm:right-4 sm:top-[6.25rem] sm:gap-2">
            {/* Déplacement dans l'allée */}
            <div className="bus-glass flex min-h-11 items-center gap-1 rounded-2xl border border-white/20 bg-black/65 px-1.5 shadow-lg backdrop-blur-md sm:px-3">
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
                disabled={seatRow <= 0}
                aria-label="Rangée précédente"
                className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 p-0 text-xs font-bold leading-none text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-30 active:scale-95 cursor-pointer"
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
                aria-label="Rangée suivante"
                className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 p-0 text-xs font-bold leading-none text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-30 active:scale-95 cursor-pointer"
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
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("name")} icon="🏷️" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">Prénom</span><span className="hud-label-long hidden sm:inline">Ajouter un prénom</span>
            </HudButton>
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("comment")} icon="💬" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">Commenter</span><span className="hud-label-long hidden sm:inline">Mettre un commentaire</span>
            </HudButton>
          </div>
          <div className="grid w-full grid-cols-4 items-center gap-1.5 sm:grid-cols-[1.25fr_1fr_0.82fr_1.08fr] sm:gap-2">
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={() => setTvOn((v) => !v)} active={tvOn} ariaLabel="Télévision" icon="📺" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">TV</span><span className="hud-label-long hidden sm:inline">{tvOn ? "Éteindre la TV" : "Allumer la TV"}</span>
            </HudButton>
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={busy || !interiorControlsVisible}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={honk} icon="📯" disabled={busy || !interiorControlsVisible}>
              Klaxon
            </HudButton>
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={exitBus} primary icon="🏝️" disabled={busy || !interiorControlsVisible}>
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
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: string;
  primary?: boolean;
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "pointer-events-auto inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs md:text-sm font-bold shadow-lg backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
  const look = primary
    ? "bg-[#ffd23f] text-[#0d2190] hover:bg-[#ffe066] shadow-[0_5px_0_#b8860b] active:shadow-none active:translate-y-1"
    : active
      ? "bg-[#1636c9] text-white ring-2 ring-[#ffd23f] hover:bg-[#1d44e6]"
      : "bg-black/55 text-white border border-white/25 hover:bg-black/75 hover:border-[#ffd23f]/50";
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
      className={`${base} relative z-10 touch-manipulation ${look} ${className}`}
    >
      {icon && <span className="pointer-events-none text-sm leading-none">{icon}</span>}
      <span className="pointer-events-none contents">{children}</span>
    </button>
  );
}
