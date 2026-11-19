"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEORY_START_DATE, getElapsedCalendarTime } from "@/lib/theory-age";
import { THEORY_FIRST_VIDEO_URL } from "@/lib/theory-video";
import { ExternalArrowIcon, ScrollIcon } from "../ui/BusIcons";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

function TheoryAgeModalDialog({ onClose }: { onClose: () => void }) {
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
    ["Années", elapsed.years],
    ["Mois", elapsed.months],
    ["Jours", elapsed.days],
    ["Heures", elapsed.hours],
    ["Minutes", elapsed.minutes],
    ["Secondes", elapsed.seconds],
  ] as const;

  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#050a1b]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="theory-age-title" className="bus-panel bus-modal-card my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#a78bfa]/45 bg-[#0b1433] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none">
        <header className="bus-panel-header flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#1e2e70] to-[#0b1433] px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#a78bfa]/35 bg-[#a78bfa]/12 text-[#a78bfa]">
              <ScrollIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a78bfa]">Première mention de la théorie</p>
              <h2 ref={titleRef} tabIndex={-1} id="theory-age-title" className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xl font-black focus:outline-none sm:text-2xl">
                <span>26 mai 2024</span>
                <span aria-hidden="true" className="text-[#b6c1ee]">·</span>
                <span className="font-bold text-[#a78bfa]">Le Mont Corvo</span>
              </h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="mb-3 text-sm font-bold text-[#e2e8ff]">La théorie tient toujours depuis :</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {values.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-[#141f4b] p-3 sm:p-4">
                <div className="break-words text-lg font-black tabular-nums text-white sm:text-2xl">{value.toLocaleString("fr-FR")}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#b6c1ee]">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-[#a78bfa]/35 bg-[#a78bfa]/10 p-4 sm:flex-row sm:items-center">
            <p className="text-center text-sm font-black text-[#d5c8ff] sm:text-left">
              Toujours pas débunk.
            </p>
            <a
              href={THEORY_FIRST_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bus-gradient px-4 py-2.5 text-sm font-black text-[#ffffff] transition active:translate-y-1 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1433]"
            >
              <span>Voir la première vidéo</span>
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
