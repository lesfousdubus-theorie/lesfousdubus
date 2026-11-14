"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEORY_START_DATE, getElapsedCalendarTime } from "@/lib/theory-age";
import { THEORY_FIRST_VIDEO_URL } from "@/lib/theory-video";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

export function TheoryAgeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const elapsed = getElapsedCalendarTime(THEORY_START_DATE, now);
  const values = [
    ["Années", elapsed.years],
    ["Mois", elapsed.months],
    ["Jours", elapsed.days],
    ["Heures", elapsed.hours],
    ["Minutes", elapsed.minutes],
    ["Secondes", elapsed.seconds],
  ] as const;

  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/75 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="theory-age-title" className="bus-modal-card flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/55 bg-[#081127] text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#ffd23f]">Première mention de la théorie</p>
            <h2 ref={titleRef} tabIndex={-1} id="theory-age-title" className="mt-1 text-xl font-black focus:outline-none sm:text-2xl">
              26 mai 2024 <span className="text-[#b9c7e8]">· </span>
              <a
                href={THEORY_FIRST_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Le Mont Corvo : voir la première vidéo de la théorie sur YouTube (nouvel onglet)"
                className="rounded-sm text-[#b9c7e8] underline decoration-[#b9c7e8]/70 underline-offset-4 transition-colors hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]"
              >
                Le Mont Corvo
              </a>
            </h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="mb-3 text-sm font-bold text-[#d8e3ff]">La théorie tient toujours depuis :</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {values.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <div className="break-all text-lg font-black tabular-nums text-white sm:text-xl">{value.toLocaleString("fr-FR")}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#ffd23f]">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-[#ffd23f]/30 bg-[#ffd23f]/10 px-4 py-3 text-center text-sm font-black text-[#ffe88d]">
            Toujours pas débunk.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
