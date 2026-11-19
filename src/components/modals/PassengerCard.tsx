"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PassengerProfile } from "@/types/passenger";
import { CommentBubbleIcon, UserBadgeIcon } from "../ui/BusIcons";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

const REPORT_EMAIL = "contact@lesfousdubus.sbs";

export function getPassengerReportHref(passenger: PassengerProfile) {
  const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
  const message = [
    "Bonjour,", "", "Je souhaite signaler le passager suivant :",
    `Place n° : ${placeNumber} (siège ${passenger.seatIndex})`, `Nom : ${passenger.displayName}`,
    `Message : ${passenger.comment ?? "aucun"}`, "", "Motif du signalement :", "",
  ].join("\r\n");
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Signalement passager n°${placeNumber}`)}&body=${encodeURIComponent(message)}`;
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
      className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#030617]/80 backdrop-blur-sm"
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
        className="bus-modal-card bus-case-solid my-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl text-white shadow-[0_24px_64px_rgba(2,4,18,0.7)] focus:outline-none"
      >
        <header className="bus-case-header flex shrink-0 items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="bus-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <UserBadgeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">
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
              className="bus-btn-secondary mb-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b24]"
            >
              ← Retour aux passagers
            </button>
          )}
          <div className="bus-case-elevated rounded-2xl p-4">
            {loading ? (
              <div className="flex min-h-16 items-center gap-3" role="status" aria-live="polite">
                <span
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-[#dfe5ff]/25 border-t-[#947eef] motion-reduce:animate-none"
                />
                <p className="text-sm font-semibold text-[#dfe5ff]">Chargement de son message…</p>
              </div>
            ) : error ? (
              <div>
                <p role="alert" className="text-sm font-semibold text-red-200">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="bus-btn-secondary mt-3 min-h-11 cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438]"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#a3aed9]">
                  <CommentBubbleIcon className="h-3.5 w-3.5 text-[#c4b5fd]" />
                  <span>Message</span>
                </div>
                <p className={passenger.comment ? "whitespace-pre-wrap break-words text-base leading-relaxed text-[#dfe5ff]" : "text-sm text-[#a3aed9]"}>
                  {passenger.comment || "Ce passager n’a pas laissé de message."}
                </p>
              </div>
            )}
          </div>
          {!loading && !error && (passenger.comment || passenger.displayName) && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <a
                href={getPassengerReportHref(passenger)}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-1 text-xs font-semibold text-[#a3aed9] underline underline-offset-4 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b24]"
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
