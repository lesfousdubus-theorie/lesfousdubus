"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { formatOrdinalRank, formatPassengerDisplayName, pickLocale, useLocale, type Locale } from "@/lib/i18n";
import type { PassengerProfile } from "@/types/passenger";
import { CommentBubbleIcon, UserBadgeIcon } from "../ui/BusIcons";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

const REPORT_EMAIL = "contact@lesfousdubus.sbs";

export function getPassengerReportHref(passenger: PassengerProfile, locale: Locale = "fr") {
  const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
  if (locale === "en") {
    const message = [
      "Hello,", "", "I would like to report the following passenger:",
      `Seat #: ${placeNumber} (seat ${passenger.seatIndex})`, `Name: ${passenger.displayName}`,
      `Message: ${passenger.comment ?? "none"}`, "", "Reason for report:", "",
    ].join("\r\n");
    return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Report passenger #${placeNumber}`)}&body=${encodeURIComponent(message)}`;
  }
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
  const locale = useLocale();
  const dialogRef = useRef<HTMLElement>(null);
  const handleKeyDown = useModalAccessibility(Boolean(passenger), onClose, dialogRef, dialogRef, returnFocusRef);

  if (!passenger) return null;
  const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
  const arrivalRank = formatOrdinalRank(placeNumber, locale);

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
                {pickLocale(
                  locale,
                  `Place n° ${placeNumber.toLocaleString("fr-FR")} · ${arrivalRank} à bord`,
                  `Seat #${placeNumber.toLocaleString("en-US")} · ${arrivalRank} on board`,
                )}
              </p>
              <h2 id="passenger-name" className="mt-0.5 break-words text-xl font-black leading-tight text-white sm:text-2xl">
                {formatPassengerDisplayName(passenger.displayName, locale)}
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
              className="bus-btn-secondary mb-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold focus-visible:outline-none"
            >
              {pickLocale(locale, "← Retour aux passagers", "← Back to passengers")}
            </button>
          )}
          <div className="bus-case-elevated rounded-2xl p-4">
            {loading ? (
              <div className="flex min-h-16 items-center gap-3" role="status" aria-live="polite">
                <span
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-[#dfe5ff]/25 border-t-[#947eef] motion-reduce:animate-none"
                />
                <p className="text-sm font-semibold text-[#dfe5ff]">{pickLocale(locale, "Chargement de son message…", "Loading their message…")}</p>
              </div>
            ) : error ? (
              <div>
                <p role="alert" className="text-sm font-semibold text-red-200">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="bus-btn-secondary mt-3 min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-none"
                >
                  {pickLocale(locale, "Réessayer", "Try again")}
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#a3aed9]">
                  <CommentBubbleIcon className="h-3.5 w-3.5 text-[#c4b5fd]" />
                  <span>Message</span>
                </div>
                <p className={passenger.comment ? "whitespace-pre-wrap break-words text-base leading-relaxed text-[#dfe5ff]" : "text-sm text-[#a3aed9]"}>
                  {passenger.comment || pickLocale(locale, "Ce passager n’a pas laissé de message.", "This passenger did not leave a message.")}
                </p>
              </div>
            )}
          </div>
          {!loading && !error && (passenger.comment || passenger.displayName) && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <a
                href={getPassengerReportHref(passenger, locale)}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-1 text-xs font-semibold text-[#a3aed9] underline underline-offset-4 transition-colors hover:text-red-300 focus-visible:outline-none"
              >
                {pickLocale(locale, "Signaler ce contenu", "Report this content")}
              </a>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
