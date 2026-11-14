"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import { getNakamaArchetype, NAKAMA_ROSTER } from "../bus/passenger-archetypes";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";
import { BusFrontIcon, EnterBusIcon, UserBadgeIcon } from "../ui/BusIcons";

const AvatarPreview = dynamic(() => import("../bus/AvatarPreview"), {
  ssr: false,
  loading: () => (
    <p role="status" className="grid h-full place-items-center text-sm text-[#dce7ff]">
      Chargement du personnage…
    </p>
  ),
});

export type OnboardingReason = "boarding" | "missing-name";

export interface OnboardingSubmission {
  displayName: string;
  comment: string;
  avatarId: PassengerAvatarId | null;
}

const NOOP_CLOSE = () => {};

/**
 * Fenêtre d'identification :
 * - À la montée pour un visiteur non inscrit (`boarding`), fermable pour rester à l'extérieur ;
 * - Dès l'arrivée sur le site pour un visiteur déjà inscrit sans pseudo (`missing-name`), obligatoire et non fermable.
 * Montée uniquement à l'ouverture pour initialiser les champs sur l'état actuel.
 */
export function OnboardingModal({
  reason,
  seatIndex,
  initialName,
  initialComment,
  initialAvatarId,
  hasLockedDbAvatar = false,
  saving,
  error,
  onClearError,
  onClose,
  onSubmit,
}: {
  reason: OnboardingReason;
  seatIndex: number | null;
  initialName: string;
  initialComment: string;
  initialAvatarId: PassengerAvatarId | null;
  hasLockedDbAvatar?: boolean;
  saving: boolean;
  error: string;
  onClearError: () => void;
  onClose?: () => void;
  onSubmit: (submission: OnboardingSubmission) => void;
}) {
  const [name, setName] = useState(initialName);
  const [comment, setComment] = useState(initialComment);
  const [selectedAvatarId, setSelectedAvatarId] = useState<PassengerAvatarId | null>(initialAvatarId);
  const [showPicker, setShowPicker] = useState(false);
  const [rotation, setRotation] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; rotation: number } | null>(null);

  const canClose = reason === "boarding" && Boolean(onClose);
  const close = useCallback(() => {
    if (canClose && !saving) onClose?.();
  }, [canClose, onClose, saving]);

  const handleKeyDown = useModalAccessibility(true, canClose ? close : NOOP_CLOSE, dialogRef, initialFocusRef);

  const activeIndex = selectedAvatarId
    ? NAKAMA_ROSTER.findIndex((item) => item.id === selectedAvatarId)
    : NAKAMA_ROSTER.indexOf(getNakamaArchetype(seatIndex, null));
  const resolvedIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeCharacter = NAKAMA_ROSTER[resolvedIndex];

  const changeCharacter = useCallback((direction: number) => {
    if (saving) return;
    const nextIndex = (resolvedIndex + direction + NAKAMA_ROSTER.length) % NAKAMA_ROSTER.length;
    setSelectedAvatarId(NAKAMA_ROSTER[nextIndex].id);
    setRotation(0);
    onClearError();
  }, [onClearError, resolvedIndex, saving]);

  const togglePicker = () => {
    if (saving) return;
    if (!showPicker) {
      if (!selectedAvatarId) {
        setSelectedAvatarId(NAKAMA_ROSTER[resolvedIndex].id);
      }
      setRotation(0);
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }
  };

  return createPortal(
    <div
      role="presentation"
      className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (canClose && event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        handleKeyDown(event);
        if (!showPicker) return;
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          changeCharacter(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        aria-busy={saving}
        className="bus-modal-card my-auto flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#ffd23f] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#091c5c]">
              <BusFrontIcon className="h-3.5 w-3.5 shrink-0" />
              {reason === "missing-name" ? "Place enregistrée" : "Embarquement"}
            </div>
            <h2 id="onboarding-title" className="text-xl font-black leading-tight sm:text-2xl">
              {reason === "missing-name" ? "Choisis ton pseudo" : "Monte dans le bus !"}
            </h2>
            <p id="onboarding-description" className="mt-1.5 text-xs leading-relaxed text-[#dce7ff] sm:text-sm">
              {reason === "missing-name"
                ? "Tu as déjà une place dans le bus, mais pas encore de pseudo. Renseigne ton nom ou pseudo (et si tu veux, un message ou un personnage) pour continuer."
                : "Renseigne ton nom ou pseudo pour monter à bord. Tu peux aussi ajouter un message et choisir ton personnage."}
            </p>
          </div>
          {canClose && <ModalCloseButton onClick={close} disabled={saving} />}
        </header>

        <form
          noValidate
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              displayName: name,
              comment,
              avatarId: selectedAvatarId,
            });
          }}
        >
          <label htmlFor="onboarding-name" className="block">
            <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-black text-white">
              <span>Nom ou pseudo</span>
              <span className="text-xs font-semibold text-[#ffd23f]">Obligatoire · 24 caractères max.</span>
            </span>
            <input
              ref={initialFocusRef}
              id="onboarding-name"
              name="displayName"
              required
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "onboarding-error onboarding-visibility" : "onboarding-visibility"}
              value={name}
              onChange={(event) => {
                const chars = Array.from(event.target.value);
                setName(chars.length > 24 ? chars.slice(0, 24).join("") : event.target.value);
                onClearError();
              }}
              placeholder="Ex. NakamaBasque"
              className="w-full select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-3.5 py-2.5 text-base text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="mt-1 block text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
              {Array.from(name).length}/24
            </span>
          </label>

          <label htmlFor="onboarding-comment" className="block">
            <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-black text-white">
              <span>Message</span>
              <span className="text-xs font-semibold text-[#b6c7eb]">Facultatif · 180 caractères max.</span>
            </span>
            <textarea
              id="onboarding-comment"
              name="comment"
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "onboarding-error onboarding-visibility" : "onboarding-visibility"}
              rows={2}
              value={comment}
              onChange={(event) => {
                const chars = Array.from(event.target.value);
                setComment(chars.length > 180 ? chars.slice(0, 180).join("") : event.target.value);
                onClearError();
              }}
              placeholder="Ex. Trop bien, vive la théorie !"
              className="w-full resize-none select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            />
            <span className="mt-1 block text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
              {Array.from(comment).length}/180
            </span>
          </label>

          <div className="rounded-xl border border-white/15 bg-[#0c1b3a] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-[#b6c7eb]">
                  Personnage <span className="font-semibold text-[#b6c7eb]">(facultatif)</span>
                </p>
                <p className="mt-0.5 truncate text-sm font-black text-[#ffd23f]">
                  {selectedAvatarId ? activeCharacter.name : "Automatique (selon ta place)"}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={togglePicker}
                aria-expanded={showPicker}
                aria-controls="onboarding-character-picker"
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-[#0c1b3a] px-3.5 text-xs font-bold text-white transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {showPicker ? "Masquer l’aperçu" : selectedAvatarId ? "Changer" : "Choisir mon personnage"}
              </button>
            </div>

            {showPicker && (
              <div id="onboarding-character-picker" className="mt-3 border-t border-white/10 pt-3">
                <div className="relative rounded-xl border border-white/15 bg-[#07142b]/85">
                  <div
                    data-avatar-id={activeCharacter.id}
                    data-avatar-rotation={rotation.toFixed(3)}
                    aria-hidden="true"
                    className="h-[min(28dvh,12.5rem)] min-h-36 w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      dragRef.current = { x: event.clientX, rotation };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = dragRef.current;
                      if (drag) setRotation(drag.rotation + (event.clientX - drag.x) * 0.015);
                    }}
                    onPointerUp={(event) => {
                      dragRef.current = null;
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                    onPointerCancel={() => {
                      dragRef.current = null;
                    }}
                  >
                    <AvatarPreview avatarId={activeCharacter.id} rotation={rotation} />
                  </div>
                  {[-1, 1].map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      onClick={() => changeCharacter(direction)}
                      disabled={saving}
                      aria-label={direction < 0 ? "Personnage précédent" : "Personnage suivant"}
                      className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/30 bg-[#07142b]/90 text-[#ffd23f] shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:bg-[#0c1b3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] disabled:cursor-not-allowed disabled:opacity-60 ${direction < 0 ? "left-2" : "right-2"}`}
                    >
                      <svg aria-hidden="true" focusable="false" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={direction < 0 ? "m14 5-7 7 7 7" : "m10 5 7 7-7 7"} />
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2" aria-live="polite" aria-atomic="true">
                  <span className="text-sm font-black text-[#ffd23f]">{activeCharacter.name}</span>
                  <span className="text-xs font-semibold tabular-nums text-[#b6c7eb]">
                    {resolvedIndex + 1} / {NAKAMA_ROSTER.length}
                  </span>
                </div>
                <label className="mt-2.5 flex items-center gap-3 text-xs font-semibold text-[#dce7ff]">
                  <span>Faire tourner</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={5}
                    value={Math.round((((rotation * 180) / Math.PI + 180) % 360 + 360) % 360 - 180)}
                    onChange={(event) => setRotation((Number(event.target.value) * Math.PI) / 180)}
                    aria-label="Rotation du personnage"
                    aria-valuetext={`${Math.round((rotation * 180) / Math.PI)} degrés`}
                    className="h-2 min-w-0 flex-1 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a]"
                  />
                </label>
                <p className="mt-2 text-center text-xs leading-relaxed text-[#b6c7eb]">
                  Glisse sur le personnage pour le voir sous tous les angles.
                </p>
                {!hasLockedDbAvatar && selectedAvatarId !== null && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSelectedAvatarId(null);
                      setShowPicker(false);
                    }}
                    className="mt-2.5 min-h-11 w-full cursor-pointer rounded-xl border border-white/30 bg-[#0c1b3a] px-3 text-xs font-bold text-white transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Laisser le choix automatique
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <p id="onboarding-error" role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">
              {error}
            </p>
          )}

          <p id="onboarding-visibility" className="text-xs leading-relaxed text-[#b6c7eb]">
            Ton nom ou pseudo sera visible publiquement dans le bus. Ton message et le choix de personnage restent facultatifs.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-base font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-80"
          >
            {reason === "missing-name" ? <UserBadgeIcon className="h-5 w-5 shrink-0" /> : <EnterBusIcon className="h-5 w-5 shrink-0" />}
            {saving
              ? "Enregistrement…"
              : reason === "missing-name"
                ? "Enregistrer mon pseudo"
                : "Monter dans le bus"}
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
