"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import { findModerationIssue } from "@/lib/server/moderation";
import { cleanText } from "@/lib/server/text";
import { getNakamaArchetype, NAKAMA_ROSTER } from "../bus/passenger-archetypes";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";
import { BusFrontIcon, ChevronLeftIcon, ChevronRightIcon, EnterBusIcon, UserBadgeIcon } from "../ui/BusIcons";

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

function normalizeRotationDegrees(rotation: number): number {
  const raw = Math.round((rotation * 180) / Math.PI);
  if (raw >= -180 && raw <= 180) return raw;
  const wrapped = ((((raw + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && raw > 0 ? 180 : wrapped;
}

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
  onDraftChange,
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
  onDraftChange?: (draft: OnboardingSubmission) => void;
  onClose?: () => void;
  onSubmit: (submission: OnboardingSubmission) => void;
}) {
  const [name, setName] = useState(initialName);
  const [comment, setComment] = useState(initialComment);
  const [selectedAvatarId, setSelectedAvatarId] = useState<PassengerAvatarId | null>(initialAvatarId);
  const [showPicker, setShowPicker] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [submitNonce, setSubmitNonce] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const activeRosterButtonRef = useRef<HTMLButtonElement>(null);
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
  const rotationDegrees = normalizeRotationDegrees(rotation);

  const hasNameClientIssue = Boolean(error) && (!cleanText(name, 24) || Boolean(findModerationIssue(name)));
  const hasCommentClientIssue = Boolean(error) && !hasNameClientIssue && Boolean(findModerationIssue(comment));
  const nameInvalid = Boolean(error) && !hasCommentClientIssue;
  const commentInvalid = Boolean(error) && (hasCommentClientIssue || !hasNameClientIssue);

  useEffect(() => {
    if (!error || saving) return;
    const frame = window.requestAnimationFrame(() => {
      const target = hasCommentClientIssue ? commentRef.current : initialFocusRef.current;
      target?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, hasCommentClientIssue, saving, submitNonce]);

  useEffect(() => {
    if (!showPicker) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    activeRosterButtonRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [resolvedIndex, showPicker]);

  const selectCharacter = useCallback((avatarId: PassengerAvatarId) => {
    if (saving) return;
    setSelectedAvatarId(avatarId);
    setRotation(0);
    onDraftChange?.({ displayName: name, comment, avatarId });
    onClearError();
  }, [comment, name, onClearError, onDraftChange, saving]);

  const changeCharacter = useCallback((direction: number) => {
    if (saving) return;
    const nextIndex = (resolvedIndex + direction + NAKAMA_ROSTER.length) % NAKAMA_ROSTER.length;
    selectCharacter(NAKAMA_ROSTER[nextIndex].id);
  }, [resolvedIndex, saving, selectCharacter]);

  const togglePicker = () => {
    if (saving) return;
    if (!showPicker) {
      if (!selectedAvatarId) {
        const nextId = NAKAMA_ROSTER[resolvedIndex].id;
        setSelectedAvatarId(nextId);
        onDraftChange?.({ displayName: name, comment, avatarId: nextId });
      }
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
        aria-busy={saving}
        className="bus-modal-card my-auto flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f]"
            >
              <BusFrontIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ffd23f]">
                {reason === "missing-name" ? "Place enregistrée" : "Embarquement"}
              </p>
              <h2 id="onboarding-title" className="mt-0.5 text-xl font-black leading-tight sm:text-2xl">
                {reason === "missing-name" ? "Choisis ton nom" : "Monte dans le bus !"}
              </h2>
            </div>
          </div>
          {canClose && <ModalCloseButton onClick={close} disabled={saving} />}
        </header>

        <form
          noValidate
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (saving) return;
            setSubmitNonce((n) => n + 1);
            onSubmit({
              displayName: name,
              comment,
              avatarId: selectedAvatarId,
            });
          }}
        >
          <div>
            <label htmlFor="onboarding-name" className="mb-1.5 flex items-center justify-between gap-2 text-sm font-black text-white">
              <span>Nom</span>
              <span className="text-xs font-semibold text-[#ffd23f]">Obligatoire · 24 caractères max.</span>
            </label>
            <input
              ref={initialFocusRef}
              id="onboarding-name"
              name="displayName"
              required
              readOnly={saving}
              aria-invalid={nameInvalid}
              aria-describedby={error ? "onboarding-error" : undefined}
              value={name}
              onChange={(event) => {
                const chars = Array.from(event.target.value);
                const nextName = chars.length > 24 ? chars.slice(0, 24).join("") : event.target.value;
                setName(nextName);
                onDraftChange?.({ displayName: nextName, comment, avatarId: selectedAvatarId });
                onClearError();
              }}
              placeholder="Ex. NakamaBasque"
              className="w-full select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-3.5 py-2.5 text-base text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 aria-[invalid=true]:border-red-400/80 read-only:cursor-not-allowed read-only:opacity-60"
            />
            <p aria-hidden="true" className="mt-1 text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
              {Array.from(name).length}/24
            </p>
          </div>

          <div>
            <label htmlFor="onboarding-comment" className="mb-1.5 flex items-center justify-between gap-2 text-sm font-black text-white">
              <span>Message</span>
              <span className="text-xs font-semibold text-[#b6c7eb]">Facultatif · 180 caractères max.</span>
            </label>
            <textarea
              ref={commentRef}
              id="onboarding-comment"
              name="comment"
              readOnly={saving}
              aria-invalid={commentInvalid}
              aria-describedby={error ? "onboarding-error" : undefined}
              rows={2}
              value={comment}
              onChange={(event) => {
                const chars = Array.from(event.target.value);
                const nextComment = chars.length > 180 ? chars.slice(0, 180).join("") : event.target.value;
                setComment(nextComment);
                onDraftChange?.({ displayName: name, comment: nextComment, avatarId: selectedAvatarId });
                onClearError();
              }}
              placeholder="Ex. Trop bien, vive la théorie !"
              className="w-full resize-none select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-3.5 py-2.5 text-base leading-relaxed text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 aria-[invalid=true]:border-red-400/80 read-only:cursor-not-allowed read-only:opacity-60 sm:text-sm"
            />
            <p aria-hidden="true" className="mt-1 text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
              {Array.from(comment).length}/180
            </p>
          </div>

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
                aria-disabled={saving}
                onClick={togglePicker}
                aria-expanded={showPicker}
                aria-controls="onboarding-character-picker"
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-[#0c1b3a] px-3.5 text-xs font-bold text-white transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:text-sm"
              >
                {showPicker ? "Masquer l’aperçu" : selectedAvatarId ? "Changer" : "Choisir mon personnage"}
              </button>
            </div>

            {showPicker && (
              <div id="onboarding-character-picker" className="mt-3 min-w-0 border-t border-white/10 pt-3">
                <div className="relative rounded-xl border border-white/15 bg-[#07142b]/85">
                  <div
                    data-avatar-id={activeCharacter.id}
                    data-avatar-rotation={rotation.toFixed(3)}
                    aria-hidden="true"
                    className="h-[min(28dvh,12.5rem)] min-h-36 w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
                    onPointerDown={(event) => {
                      if (saving || event.button !== 0) return;
                      dragRef.current = { x: event.clientX, rotation };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = dragRef.current;
                      if (drag) setRotation(drag.rotation + (event.clientX - drag.x) * 0.015);
                    }}
                    onPointerUp={(event) => {
                      dragRef.current = null;
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                    onPointerCancel={(event) => {
                      dragRef.current = null;
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                  >
                    <AvatarPreview avatarId={activeCharacter.id} rotation={rotation} />
                  </div>
                  {[-1, 1].map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      onClick={() => changeCharacter(direction)}
                      aria-disabled={saving}
                      aria-label={direction < 0 ? "Personnage précédent" : "Personnage suivant"}
                      className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/30 bg-[#07142b]/90 text-[#ffd23f] shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:bg-[#0c1b3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${direction < 0 ? "left-2" : "right-2"}`}
                    >
                      {direction < 0 ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2" aria-live="polite" aria-atomic="true">
                  <span className="text-sm font-black text-[#ffd23f]">{activeCharacter.name}</span>
                  <span className="text-xs font-semibold tabular-nums text-[#b6c7eb]">
                    {resolvedIndex + 1} / {NAKAMA_ROSTER.length}
                  </span>
                </div>
                <div
                  role="group"
                  aria-label="Sélection rapide du personnage"
                  className="mt-2 flex w-full min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 py-1"
                >
                  {NAKAMA_ROSTER.map((item) => {
                    const selected = item.id === activeCharacter.id;
                    return (
                      <button
                        key={item.id}
                        ref={selected ? activeRosterButtonRef : undefined}
                        type="button"
                        aria-pressed={selected}
                        aria-disabled={saving}
                        onClick={() => selectCharacter(item.id)}
                        className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${
                          selected
                            ? "border-[#ffd23f] bg-[#ffd23f] text-[#091c5c]"
                            : "border-white/20 bg-[#07142b] text-[#dce7ff] hover:border-[#ffd23f]/65 hover:text-white"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/25"
                          style={{ backgroundColor: item.shirtColor }}
                        />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-2 flex items-center gap-3 text-xs font-semibold text-[#dce7ff]">
                  <span>Faire tourner</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={5}
                    disabled={saving}
                    value={rotationDegrees}
                    onChange={(event) => setRotation((Number(event.target.value) * Math.PI) / 180)}
                    aria-label="Rotation du personnage"
                    aria-valuetext={`${rotationDegrees} degrés`}
                    className="h-6 min-w-0 flex-1 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                {!hasLockedDbAvatar && selectedAvatarId !== null && (
                  <button
                    type="button"
                    aria-disabled={saving}
                    onClick={() => {
                      if (saving) return;
                      setSelectedAvatarId(null);
                      setShowPicker(false);
                      onDraftChange?.({ displayName: name, comment, avatarId: null });
                    }}
                    className="mt-2.5 min-h-11 w-full cursor-pointer rounded-xl border border-white/30 bg-[#0c1b3a] px-3 text-xs font-bold text-white transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
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

          <button
            type="submit"
            aria-disabled={saving}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-base font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] active:translate-y-1 active:shadow-none aria-disabled:cursor-wait aria-disabled:opacity-80"
          >
            {reason === "missing-name" ? <UserBadgeIcon className="h-5 w-5 shrink-0" /> : <EnterBusIcon className="h-5 w-5 shrink-0" />}
            {saving
              ? "Enregistrement…"
              : reason === "missing-name"
                ? "Enregistrer mon nom"
                : "Monter dans le bus"}
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
