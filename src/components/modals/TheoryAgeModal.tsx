"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pickLocale, useLocale } from "@/lib/i18n";
import { THEORY_START_DATE, getElapsedCalendarTime } from "@/lib/theory-age";
import { THEORY_FIRST_VIDEO_URL } from "@/lib/theory-video";
import { ExternalArrowIcon, ScrollIcon } from "../ui/BusIcons";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

function TheoryAgeModalDialog({ onClose }: { onClose: () => void }) {
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const handleKeyDown = useModalAccessibility(true, onClose, dialogRef, titleRef);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const elapsed = getElapsedCalendarTime(THEORY_START_DATE, now);
  const values = [
    [pickLocale(locale, "Années", "Years"), elapsed.years],
    [pickLocale(locale, "Mois", "Months"), elapsed.months],
    [pickLocale(locale, "Jours", "Days"), elapsed.days],
    [pickLocale(locale, "Heures", "Hours"), elapsed.hours],
    [pickLocale(locale, "Minutes", "Minutes"), elapsed.minutes],
    [pickLocale(locale, "Secondes", "Seconds"), elapsed.seconds],
  ] as const;

  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#030617]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="theory-age-title" className="bus-modal-card bus-case-solid my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl text-white shadow-[0_24px_64px_rgba(2,4,18,0.7)] focus:outline-none">
        <header className="bus-case-header flex shrink-0 items-start justify-between gap-4 px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="bus-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <ScrollIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">{pickLocale(locale, "Première mention de la théorie", "First mention of the theory")}</p>
              <h2 ref={titleRef} tabIndex={-1} id="theory-age-title" className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xl font-black focus:outline-none sm:text-2xl">
                <span>{pickLocale(locale, "26 mai 2024", "May 26, 2024")}</span>
                <span aria-hidden="true" className="text-[#a3aed9]">·</span>
                <span className="font-bold text-[#c4b5fd]">Le Mont Corvo</span>
              </h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="mb-3 text-sm font-bold text-[#dfe5ff]">{pickLocale(locale, "La théorie tient toujours depuis :", "The theory has stood undefeated for:")}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {values.map(([label, value]) => (
              <div key={label} className="bus-case-elevated rounded-2xl p-3 sm:p-4">
                <div className="break-words text-lg font-black tabular-nums text-white sm:text-2xl">{value.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#a3aed9]">{label}</div>
              </div>
            ))}
          </div>
          <div className="bus-case-highlight mt-5 flex flex-col items-stretch justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
            <p className="text-center text-sm font-black text-[#e9e3ff] sm:text-left">
              {pickLocale(locale, "Toujours pas débunk.", "Still not debunked.")}
            </p>
            <a
              href={THEORY_FIRST_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bus-btn-primary inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-none"
            >
              <span>{pickLocale(locale, "Voir la première vidéo", "Watch the first video")}</span>
              <ExternalArrowIcon className="h-4 w-4 shrink-0" />
            </a>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function TheoryAgeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return <TheoryAgeModalDialog onClose={onClose} />;
}
