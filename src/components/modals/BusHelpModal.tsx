"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

export function BusHelpModal({ isOpen, onClose, returnFocusRef }: { isOpen: boolean; onClose: () => void; returnFocusRef?: RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, dialogRef, returnFocusRef);
  if (!isOpen) return null;
  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 p-3 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bus-help-title" className="bus-modal-card my-auto w-full max-w-lg overflow-y-auto rounded-2xl border border-[#ffd23f]/40 bg-[#081127] p-5 text-white shadow-2xl sm:p-6">
        <header className="flex items-start justify-between gap-4"><h2 id="bus-help-title" className="text-xl font-black">Bienvenue à bord !</h2><ModalCloseButton onClick={onClose} /></header>
        <p className="mt-3 text-sm leading-6 text-white/85">Découvre le bus, puis monte à bord pour suivre la théorie du Mont Corvo.</p>
        <dl className="mt-5 space-y-4 text-sm leading-6">
          <div><dt className="font-black text-[#ffd23f]">Regarder autour de toi</dt><dd className="text-white/85">Glisse avec le doigt ou maintiens le clic et déplace la souris.</dd></div>
          <div><dt className="font-black text-[#ffd23f]">Zoomer</dt><dd className="text-white/85">Écarte ou rapproche deux doigts, ou utilise la molette de la souris.</dd></div>
          <div><dt className="font-black text-[#ffd23f]">Explorer l’intérieur</dt><dd className="text-white/85">Utilise les flèches de rangée. « Commandes » permet de revenir à ta place ou de recentrer la vue.</dd></div>
          <div><dt className="font-black text-[#ffd23f]">Au clavier</dt><dd className="text-white/85">Tab pour les boutons. Dans le bus : flèches pour regarder, + et − pour zoomer. À l’extérieur : + et − pour la vitesse. Échap pour fermer une fenêtre.</dd></div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-white/75">Tu peux retrouver cette aide avec le bouton « Aide ». Ton pseudo et ton commentaire sont facultatifs et publics.</p>
        <button type="button" onClick={onClose} className="mt-5 min-h-12 w-full rounded-xl bg-[#ffd23f] px-4 py-3 text-sm font-black text-[#0d2190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">C’est parti !</button>
      </section>
    </div>, document.body,
  );
}
