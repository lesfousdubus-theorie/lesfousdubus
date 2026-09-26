"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEORY_START_DATE, getElapsedCalendarTime } from "@/lib/theory-age";
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
    <div className="fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto overscroll-contain bg-[#020617]/30 p-2 backdrop-blur-[2px] sm:p-4" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="theory-age-title" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/55 bg-[#081127]/96 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-2rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd23f]">Première mention de la théorie</p>
            <h2 ref={titleRef} tabIndex={-1} id="theory-age-title" className="mt-1 text-xl font-black focus:outline-none sm:text-2xl">26 mai 2024 <span className="text-[#b9c7e8]">· Le Mont Corvo</span></h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="mb-3 text-sm font-bold text-[#d8e3ff]">La théorie tient toujours depuis :</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {values.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <div className="break-all text-lg font-black tabular-nums text-white sm:text-xl">{value.toLocaleString("fr-FR")}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#ffd23f]">{label}</div>
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
