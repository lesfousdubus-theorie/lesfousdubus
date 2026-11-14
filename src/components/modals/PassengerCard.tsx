"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PassengerProfile } from "@/types/passenger";
import { CommentBubbleIcon, UserBadgeIcon } from "../ui/BusIcons";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

export function getPassengerReportHref(passenger: PassengerProfile) {
  const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
  const message = [
    "Bonjour,", "", "Je souhaite signaler le passager suivant :",
    `Place n° : ${placeNumber} (siège ${passenger.seatIndex})`, `Nom : ${passenger.displayName}`,
    `Message : ${passenger.comment ?? "aucun"}`, "", "Motif du signalement :", "",
  ].join("\r\n");
  return `mailto:contact@lesfousdubus.sbs?subject=${encodeURIComponent(`Signalement passager n°${placeNumber}`)}&body=${encodeURIComponent(message)}`;
}

export function PassengerCard({
  passenger,
  loading,
  error,
  returnFocusRef,
  onRetry,
  onClose,
  onBack,
}: {
  passenger: PassengerProfile | null;
  loading: boolean;
  error: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onRetry: () => void;
  onClose: () => void;
  onBack?: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const handleKeyDown = useModalAccessibility(Boolean(passenger), onClose, dialogRef, dialogRef, returnFocusRef);

  if (!passenger) return null;
  const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
  const arrivalRank = placeNumber === 1 ? "1re" : `${placeNumber.toLocaleString("fr-FR")}e`;

  return createPortal(
    <div
      className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 backdrop-blur-sm"
      role="presentation"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="passenger-name"
        className="bus-modal-card my-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f]">
              <UserBadgeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ffd23f]">
                Place n° {placeNumber.toLocaleString("fr-FR")} · {arrivalRank} à bord
              </p>
              <h2 id="passenger-name" className="mt-0.5 break-words text-xl font-black leading-tight text-white sm:text-2xl">
                {passenger.displayName}
              </h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-[#0c1b3a] px-3.5 py-2 text-sm font-bold text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]"
            >
              ← Retour aux passagers
            </button>
          )}
          <div className="rounded-2xl border border-white/15 bg-[#0c1b3a] p-4">
            {loading ? (
              <div className="flex min-h-16 items-center gap-3" role="status" aria-live="polite">
                <span
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-[#dce7ff]/25 border-t-[#ffd23f] motion-reduce:animate-none"
                />
                <p className="text-sm font-semibold text-[#dce7ff]">Chargement de son message…</p>
              </div>
            ) : error ? (
              <div>
                <p role="alert" className="text-sm font-semibold text-red-200">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 min-h-11 cursor-pointer rounded-xl border border-white/30 bg-[#07142b] px-4 py-2 text-sm font-bold text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a]"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#b6c7eb]">
                  <CommentBubbleIcon className="h-3.5 w-3.5 text-[#ffd23f]" />
                  <span>Message</span>
                </div>
                <p className={passenger.comment ? "whitespace-pre-wrap break-words text-base leading-relaxed text-[#dce7ff]" : "text-sm text-[#b6c7eb]"}>
                  {passenger.comment || "Ce passager n’a pas laissé de message."}
                </p>
              </div>
            )}
          </div>
          {!loading && !error && (passenger.comment || passenger.displayName) && (
            <div className="mt-3 flex justify-end">
              <a
                href={getPassengerReportHref(passenger)}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-1 text-xs font-semibold text-[#b6c7eb] underline underline-offset-4 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]"
              >
                Signaler ce contenu
              </a>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
