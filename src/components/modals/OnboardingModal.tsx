"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pickLocale, useLocale } from "@/lib/i18n";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import { findModerationIssue } from "@/lib/server/moderation";
import { cleanText } from "@/lib/server/text";
import { getCharacterName, getNakamaArchetype, NAKAMA_ROSTER } from "../bus/passenger-archetypes";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";
import { BusFrontIcon, ChevronLeftIcon, ChevronRightIcon, EnterBusIcon, UserBadgeIcon } from "../ui/BusIcons";

function AvatarPreviewLoading() {
  const locale = useLocale();
  return (
    <p role="status" className="grid h-full place-items-center text-sm text-[#dfe5ff]">
      {pickLocale(locale, "Chargement du personnage…", "Loading character…")}
    </p>
  );
}

const AvatarPreview = dynamic(() => import("../bus/AvatarPreview"), {
  ssr: false,
  loading: () => <AvatarPreviewLoading />,
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
  const locale = useLocale();
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
  const dragRef = useRef<{ pointerId: number; x: number; rotation: number } | null>(null);

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
      className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#030617]/80 backdrop-blur-sm"
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
        className="bus-modal-card bus-case-solid my-auto flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl text-white shadow-[0_24px_64px_rgba(2,4,18,0.7)] focus:outline-none"
      >
        <header className="bus-case-header flex shrink-0 items-start justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <span
              aria-hidden="true"
              className="bus-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            >
              <BusFrontIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">
                {reason === "missing-name"
                  ? pickLocale(locale, "Place enregistrée", "Seat registered")
                  : pickLocale(locale, "Embarquement", "Boarding")}
              </p>
              <h2 id="onboarding-title" className="mt-0.5 text-xl font-black leading-tight sm:text-2xl">
                {reason === "missing-name"
                  ? pickLocale(locale, "Choisis ton nom", "Choose your name")
                  : pickLocale(locale, "Monte dans le bus !", "Get on the bus!")}
              </h2>
            </div>
          </div>
          {canClose && <ModalCloseButton onClick={close} disabled={saving} />}
        </header>

        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
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
          <div className="bus-scrollbar min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <label htmlFor="onboarding-name" className="mb-1.5 flex items-center justify-between gap-2 text-sm font-black text-white">
                <span>{pickLocale(locale, "Nom", "Name")}</span>
                <span className="text-xs font-semibold tabular-nums text-[#c4b5fd]">
                  {pickLocale(locale, "Obligatoire", "Required")} · {Array.from(name).length}/24
                </span>
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
                placeholder={pickLocale(locale, "Ex. NakamaBasque", "e.g. NakamaPirate")}
                className="bus-case-inset w-full select-text rounded-xl px-3.5 py-2.5 text-base text-white outline-none transition-colors placeholder:text-[#a3aed9]/70 focus:border-[#947eef] focus:ring-2 focus:ring-[#947eef]/30 aria-[invalid=true]:border-red-400/80 read-only:cursor-not-allowed read-only:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="onboarding-comment" className="mb-1.5 flex items-center justify-between gap-2 text-sm font-black text-white">
                <span>{pickLocale(locale, "Message", "Message")}</span>
                <span className="text-xs font-semibold tabular-nums text-[#a3aed9]">
                  {pickLocale(locale, "Facultatif", "Optional")} · {Array.from(comment).length}/180
                </span>
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
                placeholder={pickLocale(locale, "Ex. Trop bien, vive la théorie !", "e.g. Awesome, long live the theory!")}
                className="bus-case-inset w-full resize-none select-text rounded-xl px-3.5 py-2.5 text-base leading-relaxed text-white outline-none transition-colors placeholder:text-[#a3aed9]/70 focus:border-[#947eef] focus:ring-2 focus:ring-[#947eef]/30 aria-[invalid=true]:border-red-400/80 read-only:cursor-not-allowed read-only:opacity-60 sm:text-sm"
              />
            </div>

            <div className="bus-case-elevated rounded-xl p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#a3aed9]">
                    {pickLocale(locale, "Personnage", "Character")} <span className="font-semibold text-[#a3aed9]">{pickLocale(locale, "(facultatif)", "(optional)")}</span>
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-[#c4b5fd]" aria-live="polite" aria-atomic="true">
                    {selectedAvatarId ? getCharacterName(activeCharacter, locale) : pickLocale(locale, "Automatique (selon ta place)", "Automatic (based on your seat)")}
                    {showPicker && (
                      <span className="ml-2 text-xs font-semibold tabular-nums text-[#a3aed9]">
                        · {resolvedIndex + 1} / {NAKAMA_ROSTER.length}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  aria-disabled={saving}
                  onClick={togglePicker}
                  aria-expanded={showPicker}
                  aria-controls="onboarding-character-picker"
                  className="bus-btn-secondary inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-full px-3.5 text-xs font-semibold focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:text-sm"
                >
                  {showPicker
                    ? pickLocale(locale, "Masquer l’aperçu", "Hide preview")
                    : selectedAvatarId
                      ? pickLocale(locale, "Changer", "Change")
                      : pickLocale(locale, "Choisir mon personnage", "Choose my character")}
                </button>
              </div>

              {showPicker && (
                <div id="onboarding-character-picker" className="mt-3 min-w-0 border-t border-[#947eef]/20 pt-3">
                  <div className="bus-case-inset relative rounded-xl">
                    <div
                      data-avatar-id={activeCharacter.id}
                      data-avatar-rotation={rotation.toFixed(3)}
                      aria-hidden="true"
                      className="h-[min(24dvh,11rem)] min-h-36 w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
                      onPointerDown={(event) => {
                        if (saving || dragRef.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
                        dragRef.current = { pointerId: event.pointerId, x: event.clientX, rotation };
                        try {
                          event.currentTarget.setPointerCapture(event.pointerId);
                        } catch {}
                      }}
                      onPointerMove={(event) => {
                        const drag = dragRef.current;
                        if (!drag || drag.pointerId !== event.pointerId) return;
                        setRotation(drag.rotation + (event.clientX - drag.x) * 0.015);
                      }}
                      onPointerUp={(event) => {
                        if (dragRef.current?.pointerId !== event.pointerId) return;
                        dragRef.current = null;
                        try {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                        } catch {}
                      }}
                      onPointerCancel={(event) => {
                        if (dragRef.current?.pointerId !== event.pointerId) return;
                        dragRef.current = null;
                        try {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                        } catch {}
                      }}
                      onLostPointerCapture={(event) => {
                        if (dragRef.current?.pointerId !== event.pointerId) return;
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
                        aria-disabled={saving}
                        aria-label={direction < 0 ? pickLocale(locale, "Personnage précédent", "Previous character") : pickLocale(locale, "Personnage suivant", "Next character")}
                        className={`bus-btn-secondary absolute top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-white focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${direction < 0 ? "left-2.5" : "right-2.5"}`}
                      >
                        {direction < 0 ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                      </button>
                    ))}
                  </div>
                  <div
                    role="group"
                    aria-label={pickLocale(locale, "Sélection rapide du personnage", "Quick character selection")}
                    onWheel={(event) => {
                      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
                      const el = event.currentTarget;
                      if (el.scrollWidth <= el.clientWidth) return;
                      el.scrollLeft += event.deltaY;
                    }}
                    className="bus-scroll-fade-x mt-3 flex w-full min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain scroll-px-4 px-3 py-1"
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
                          className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${
                            selected ? "bus-btn-active" : "bus-btn-secondary"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/25"
                            style={{ backgroundColor: item.shirtColor }}
                          />
                          <span>{getCharacterName(item, locale)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-2.5 text-xs font-semibold text-[#dfe5ff]">
                    <label htmlFor="onboarding-rotation-range" className="shrink-0">
                      {pickLocale(locale, "Faire tourner", "Rotate")}
                    </label>
                    <input
                      id="onboarding-rotation-range"
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      disabled={saving}
                      value={rotationDegrees}
                      onChange={(event) => setRotation((Number(event.target.value) * Math.PI) / 180)}
                      aria-label={pickLocale(locale, "Rotation du personnage", "Character rotation")}
                      aria-valuetext={pickLocale(locale, `${rotationDegrees} degrés`, `${rotationDegrees} degrees`)}
                      className="bus-range h-6 min-w-0 flex-1 cursor-pointer focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="w-9 shrink-0 text-right tabular-nums text-[#b4bfe8]">{rotationDegrees}°</span>
                    <button
                      type="button"
                      disabled={saving || rotationDegrees === 0}
                      onClick={() => setRotation(0)}
                      className="bus-btn-secondary shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold focus-visible:outline-none disabled:cursor-default disabled:opacity-35"
                    >
                      {pickLocale(locale, "Face", "Front")}
                    </button>
                  </div>
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
                      className="bus-btn-secondary mt-3 min-h-11 w-full cursor-pointer rounded-full px-3 text-xs font-semibold focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                    >
                      {pickLocale(locale, "Laisser le choix automatique", "Use automatic choice")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-2.5 border-t border-[#947eef]/20 bg-[#0b0f2f]/90 px-4 py-3.5 sm:px-6 sm:py-4">
            {error && (
              <p id="onboarding-error" role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              aria-disabled={saving}
              className="bus-btn-primary flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold focus-visible:outline-none aria-disabled:cursor-wait aria-disabled:opacity-80"
            >
              {reason === "missing-name" ? <UserBadgeIcon className="h-5 w-5 shrink-0" /> : <EnterBusIcon className="h-5 w-5 shrink-0" />}
              {saving
                ? pickLocale(locale, "Enregistrement…", "Saving…")
                : reason === "missing-name"
                  ? pickLocale(locale, "Enregistrer mon nom", "Save my name")
                  : pickLocale(locale, "Monter dans le bus", "Board the bus")}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
