"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
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

export function BusHelpModal({ isOpen, onClose, letterShortcutsEnabled, setLetterShortcutsEnabled, sceneryPaused, setSceneryPaused }: BusHelpModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef);
  if (!isOpen) return null;

  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/75 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bus-help-title" className="bus-modal-card flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[#081127] text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <h2 ref={titleRef} tabIndex={-1} id="bus-help-title" className="text-xl font-black focus:outline-none sm:text-2xl">Se repérer dans le bus</h2>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <dl className="space-y-4 text-sm leading-relaxed text-[#d8e3ff]">
            <div><dt className="font-bold text-[#ffd23f]">Autour du bus · Vue libre</dt><dd>Glisse avec la souris ou un doigt pour tourner. Déplace la vue avec le clic droit ou deux doigts. Zoome avec la molette ou en pinçant l’écran.</dd></div>
            <div><dt className="font-bold text-[#ffd23f]">À ta place</dt><dd>Glisse pour regarder autour de toi. Zoome avec la molette, deux doigts ou les touches + et −. Les flèches orientent le regard.</dd></div>
            <div><dt className="font-bold text-[#ffd23f]">Explorer puis revenir</dt><dd>« Vue libre » te laisse explorer en gardant ta place. « Ma place » te ramène face à la télé. Dehors, le bouton de recentrage retrouve le bus.</dd></div>
          </dl>
          <fieldset className="mt-6 border-t border-white/15 pt-5">
            <legend className="sr-only">Confort et raccourcis</legend>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-relaxed">
              <input type="checkbox" checked={sceneryPaused} onChange={(event) => setSceneryPaused(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd23f]" />
              <span><span className="block font-bold">Figer le défilement du décor</span><span className="text-[#d8e3ff]">Pour regarder la télé plus tranquillement. La vidéo, les personnages et les entrées et sorties restent actifs.</span></span>
            </label>
            <label className="mt-2 flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-relaxed">
              <input type="checkbox" checked={letterShortcutsEnabled} onChange={(event) => setLetterShortcutsEnabled(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd23f]" />
              <span><span className="block font-bold">Activer les raccourcis à une lettre</span><span className="text-[#d8e3ff]">H : klaxon · L : phares · B : boost · Q/A et D : regarder à gauche et à droite, à ta place.</span></span>
            </label>
            <p className="mt-3 text-xs leading-relaxed text-[#b9c7e8]">Tes préférences sont conservées sur ce navigateur. Les raccourcis du navigateur restent disponibles.</p>
          </fieldset>
        </div>
      </section>
    </div>, document.body,
  );
}
