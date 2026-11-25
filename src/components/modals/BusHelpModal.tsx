"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { pickLocale, useLocale } from "@/lib/i18n";
import { HelpCircleIcon } from "../ui/BusIcons";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";

interface BusHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  letterShortcutsEnabled: boolean;
  setLetterShortcutsEnabled: (enabled: boolean) => void;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-[#947eef]/40 bg-[#04071c] px-1.5 py-0.5 font-mono text-xs font-bold text-[#c4b5fd]">
      {children}
    </kbd>
  );
}

export function BusHelpModal({ isOpen, onClose, letterShortcutsEnabled, setLetterShortcutsEnabled }: BusHelpModalProps) {
  const locale = useLocale();
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef);
  if (!isOpen) return null;

  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#030617]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bus-help-title" className="bus-modal-card bus-case-solid my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl text-white shadow-[0_24px_64px_rgba(2,4,18,0.7)] focus:outline-none">
        <header className="bus-case-header flex shrink-0 items-start justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="bus-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <HelpCircleIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">{pickLocale(locale, "Aide & confort", "Help & comfort")}</p>
              <h2 ref={titleRef} tabIndex={-1} id="bus-help-title" className="mt-0.5 text-xl font-black focus:outline-none sm:text-2xl">{pickLocale(locale, "Se repérer dans le bus", "Getting around the bus")}</h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="bus-scrollbar min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <dl className="space-y-3 text-sm leading-relaxed text-[#dfe5ff]">
            <div className="bus-case-elevated rounded-2xl p-3.5 sm:p-4">
              <dt className="font-bold text-[#c4b5fd]">{pickLocale(locale, "Autour du bus · Vue libre", "Around the bus · Free view")}</dt>
              <dd className="mt-1">{pickLocale(locale, "Glisse avec la souris ou un doigt pour tourner. Déplace la vue avec le clic droit ou deux doigts. Zoome avec la molette ou en pinçant l’écran.", "Drag with the mouse or one finger to orbit. Pan with right-click or two fingers. Zoom with the scroll wheel or by pinching the screen.")}</dd>
            </div>
            <div className="bus-case-elevated rounded-2xl p-3.5 sm:p-4">
              <dt className="font-bold text-[#c4b5fd]">{pickLocale(locale, "À ta place", "In your seat")}</dt>
              <dd className="mt-1">{locale === "en" ? <>Drag to look around. Zoom with the wheel, two fingers, or the <Kbd>+</Kbd> and <Kbd>−</Kbd> keys. Arrow keys turn your gaze.</> : <>Glisse pour regarder autour de toi. Zoome avec la molette, deux doigts ou les touches <Kbd>+</Kbd> et <Kbd>−</Kbd>. Les flèches orientent le regard.</>}</dd>
            </div>
            <div className="bus-case-elevated rounded-2xl p-3.5 sm:p-4">
              <dt className="font-bold text-[#c4b5fd]">{pickLocale(locale, "Explorer puis revenir", "Explore and return")}</dt>
              <dd className="mt-1">{pickLocale(locale, "« Vue libre » te laisse explorer en gardant ta place. « Ma place » te ramène face à la télé. Dehors, le bouton de recentrage retrouve le bus.", "“Free view” lets you explore while keeping your seat. “My seat” brings you back facing the TV. Outside, the recenter button finds the bus again.")}</dd>
            </div>
          </dl>
          <fieldset className="mt-5 border-t border-[#947eef]/20 pt-5">
            <legend className="sr-only">{pickLocale(locale, "Confort et raccourcis", "Comfort and shortcuts")}</legend>
            <p aria-hidden="true" className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">{pickLocale(locale, "Confort et raccourcis", "Comfort and shortcuts")}</p>
            <div className="space-y-3">
              <label className="bus-case-elevated flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl p-3.5 text-sm leading-relaxed transition-colors">
                <input type="checkbox" checked={letterShortcutsEnabled} onChange={(event) => setLetterShortcutsEnabled(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#7a3aec] focus-visible:outline-none" />
                <span className="min-w-0">
                  <span className="block font-bold text-white">{pickLocale(locale, "Activer les raccourcis à une lettre", "Enable single-letter shortcuts")}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[#dfe5ff]">
                    <span><Kbd>H</Kbd> {pickLocale(locale, "klaxon", "horn")}</span>
                    <span aria-hidden="true" className="text-[#a3aed9]">·</span>
                    <span><Kbd>L</Kbd> {pickLocale(locale, "phares", "headlights")}</span>
                    <span aria-hidden="true" className="text-[#a3aed9]">·</span>
                    <span><Kbd>B</Kbd> boost</span>
                    <span aria-hidden="true" className="text-[#a3aed9]">·</span>
                    <span><Kbd>Q</Kbd>/<Kbd>A</Kbd> {pickLocale(locale, "et", "and")} <Kbd>D</Kbd> {pickLocale(locale, "regarder à gauche et à droite, à ta place.", "look left and right from your seat.")}</span>
                  </span>
                </span>
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#a3aed9]">{pickLocale(locale, "Tes préférences sont conservées sur ce navigateur. Les raccourcis du navigateur restent disponibles.", "Your preferences are saved in this browser. Browser shortcuts remain available.")}</p>
          </fieldset>
        </div>
      </section>
    </div>, document.body,
  );
}
