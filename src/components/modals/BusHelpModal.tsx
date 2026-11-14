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
  sceneryPaused: boolean;
  setSceneryPaused: (paused: boolean) => void;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-[#ffd23f]/35 bg-[#040b18] px-1.5 py-0.5 font-mono text-xs font-bold text-[#ffd23f]">
      {children}
    </kbd>
  );
}

export function BusHelpModal({ isOpen, onClose, letterShortcutsEnabled, setLetterShortcutsEnabled, sceneryPaused, setSceneryPaused }: BusHelpModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef);
  if (!isOpen) return null;

  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bus-help-title" className="bus-modal-card my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f]">
              <HelpCircleIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ffd23f]">Aide &amp; confort</p>
              <h2 ref={titleRef} tabIndex={-1} id="bus-help-title" className="mt-0.5 text-xl font-black focus:outline-none sm:text-2xl">Se repérer dans le bus</h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <dl className="space-y-3 text-sm leading-relaxed text-[#dce7ff]">
            <div className="rounded-2xl border border-white/15 bg-[#0c1b3a] p-3.5 sm:p-4">
              <dt className="font-bold text-[#ffd23f]">Autour du bus · Vue libre</dt>
              <dd className="mt-1">Glisse avec la souris ou un doigt pour tourner. Déplace la vue avec le clic droit ou deux doigts. Zoome avec la molette ou en pinçant l’écran.</dd>
            </div>
            <div className="rounded-2xl border border-white/15 bg-[#0c1b3a] p-3.5 sm:p-4">
              <dt className="font-bold text-[#ffd23f]">À ta place</dt>
              <dd className="mt-1">Glisse pour regarder autour de toi. Zoome avec la molette, deux doigts ou les touches <Kbd>+</Kbd> et <Kbd>−</Kbd>. Les flèches orientent le regard.</dd>
            </div>
            <div className="rounded-2xl border border-white/15 bg-[#0c1b3a] p-3.5 sm:p-4">
              <dt className="font-bold text-[#ffd23f]">Explorer puis revenir</dt>
              <dd className="mt-1">« Vue libre » te laisse explorer en gardant ta place. « Ma place » te ramène face à la télé. Dehors, le bouton de recentrage retrouve le bus.</dd>
            </div>
          </dl>
          <fieldset className="mt-5 border-t border-white/15 pt-5">
            <legend className="sr-only">Confort et raccourcis</legend>
            <p aria-hidden="true" className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#ffd23f]">Confort et raccourcis</p>
            <div className="space-y-3">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-[#0c1b3a] p-3.5 text-sm leading-relaxed transition hover:border-[#ffd23f]/45">
                <input type="checkbox" checked={sceneryPaused} onChange={(event) => setSceneryPaused(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a]" />
                <span className="min-w-0">
                  <span className="block font-bold text-white">Figer le défilement du décor</span>
                  <span className="mt-0.5 block text-[#dce7ff]">Pour regarder la télé plus tranquillement. La vidéo, les personnages et les entrées et sorties restent actifs.</span>
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-[#0c1b3a] p-3.5 text-sm leading-relaxed transition hover:border-[#ffd23f]/45">
                <input type="checkbox" checked={letterShortcutsEnabled} onChange={(event) => setLetterShortcutsEnabled(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a]" />
                <span className="min-w-0">
                  <span className="block font-bold text-white">Activer les raccourcis à une lettre</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[#dce7ff]">
                    <span><Kbd>H</Kbd> klaxon</span>
                    <span aria-hidden="true" className="text-[#b6c7eb]">·</span>
                    <span><Kbd>L</Kbd> phares</span>
                    <span aria-hidden="true" className="text-[#b6c7eb]">·</span>
                    <span><Kbd>B</Kbd> boost</span>
                    <span aria-hidden="true" className="text-[#b6c7eb]">·</span>
                    <span><Kbd>Q</Kbd>/<Kbd>A</Kbd> et <Kbd>D</Kbd> regarder à gauche et à droite, à ta place.</span>
                  </span>
                </span>
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#b6c7eb]">Tes préférences sont conservées sur ce navigateur. Les raccourcis du navigateur restent disponibles.</p>
          </fieldset>
        </div>
      </section>
    </div>, document.body,
  );
}
