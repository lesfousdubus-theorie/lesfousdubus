"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">Aide &amp; confort</p>
              <h2 ref={titleRef} tabIndex={-1} id="bus-help-title" className="mt-0.5 text-xl font-black focus:outline-none sm:text-2xl">Se repérer dans le bus</h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <dl className="space-y-3 text-sm leading-relaxed text-[#dfe5ff]">
            <div className="bus-case-elevated rounded-2xl p-3.5 sm:p-4">
              <dt className="font-bold text-[#c4b5fd]">Autour du bus · Vue libre</dt>
              <dd className="mt-1">Glisse avec la souris ou un doigt pour tourner. Déplace la vue avec le clic droit ou deux doigts. Zoome avec la molette ou en pinçant l’écran.</dd>
            </div>
            <div className="bus-case-elevated rounded-2xl p-3.5 sm:p-4">
              <dt className="font-bold text-[#c4b5fd]">À ta place</dt>
              <dd className="mt-1">Glisse pour regarder autour de toi. Zoome avec la molette, deux doigts ou les touches <Kbd>+</Kbd> et <Kbd>−</Kbd>. Les flèches orientent le regard.</dd>
            </div>
            <div className="bus-case-elevated rounded-2xl p-3.5 sm:p-4">
              <dt className="font-bold text-[#c4b5fd]">Explorer puis revenir</dt>
              <dd className="mt-1">« Vue libre » te laisse explorer en gardant ta place. « Ma place » te ramène face à la télé. Dehors, le bouton de recentrage retrouve le bus.</dd>
            </div>
          </dl>
          <fieldset className="mt-5 border-t border-[#947eef]/20 pt-5">
            <legend className="sr-only">Confort et raccourcis</legend>
            <p aria-hidden="true" className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">Confort et raccourcis</p>
            <div className="space-y-3">
              <label className="bus-case-elevated flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl p-3.5 text-sm leading-relaxed transition-colors hover:border-[#947eef]/55">
                <input type="checkbox" checked={letterShortcutsEnabled} onChange={(event) => setLetterShortcutsEnabled(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#7a3aec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438]" />
                <span className="min-w-0">
                  <span className="block font-bold text-white">Activer les raccourcis à une lettre</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[#dfe5ff]">
                    <span><Kbd>H</Kbd> klaxon</span>
                    <span aria-hidden="true" className="text-[#a3aed9]">·</span>
                    <span><Kbd>L</Kbd> phares</span>
                    <span aria-hidden="true" className="text-[#a3aed9]">·</span>
                    <span><Kbd>B</Kbd> boost</span>
                    <span aria-hidden="true" className="text-[#a3aed9]">·</span>
                    <span><Kbd>Q</Kbd>/<Kbd>A</Kbd> et <Kbd>D</Kbd> regarder à gauche et à droite, à ta place.</span>
                  </span>
                </span>
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#a3aed9]">Tes préférences sont conservées sur ce navigateur. Les raccourcis du navigateur restent disponibles.</p>
          </fieldset>
        </div>
      </section>
    </div>, document.body,
  );
}
