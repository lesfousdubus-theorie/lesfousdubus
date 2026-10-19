"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";

export function ManagePlaceModal({ inside, onClose, onExit, onDelete }: {
  inside: boolean;
  onClose: () => void;
  onExit: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    if (locked.current) return;
    if (confirming) {
      setConfirming(false);
      setError("");
      requestAnimationFrame(() => deleteButtonRef.current?.focus());
    } else onClose();
  };
  const handleKeyDown = useModalAccessibility(true, close, dialogRef, titleRef);
  const remove = async () => {
    if (locked.current) return;
    locked.current = true;
    setDeleting(true);
    setError("");
    try {
      if (await onDelete()) onClose();
      else setError("Ta place n’a pas pu être supprimée. Réessaie dans un instant.");
    } catch {
      setError("Ta place n’a pas pu être supprimée. Réessaie dans un instant.");
    } finally {
      locked.current = false;
      setDeleting(false);
    }
  };
  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center bg-[#020617]/75 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={event => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} tabIndex={-1} role={confirming ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="manage-place-title" aria-describedby="manage-place-description" className="bus-modal-card flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#081127] text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 ref={titleRef} tabIndex={-1} id="manage-place-title" className="text-xl font-black [text-wrap:balance] focus:outline-none sm:text-2xl">{confirming ? "Supprimer ta place ?" : "Ta place dans le bus"}</h2>
          <ModalCloseButton onClick={close} disabled={deleting} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <p id="manage-place-description" className="text-sm leading-7 text-[#d8e3ff]">
            {confirming ? "Ta place, ton pseudo, ton commentaire et ton choix de personnage seront supprimés du site. Le compteur diminuera. Cette suppression est définitive ; tu pourras ensuite t’inscrire à nouveau."
              : "Sortir te ramène à l’extérieur du bus. Ta place et ton profil restent enregistrés : tu pourras les retrouver lors de ta prochaine visite depuis ce navigateur. Le compteur ne change pas."}
          </p>
          {error && <p role="alert" className="mt-4 text-sm font-bold text-red-200">{error}</p>}
          {confirming ? <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} disabled={deleting} className="min-h-12 rounded-xl border border-white/30 px-5 text-sm font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60">Annuler</button>
            <button type="button" onClick={() => void remove()} disabled={deleting} className="min-h-12 rounded-xl bg-red-700 px-5 text-sm font-black text-white hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60">{deleting ? "Suppression…" : "Confirmer la suppression"}</button>
          </div> : <>
            {inside && <button type="button" onClick={onExit} className="mt-6 min-h-12 w-full rounded-xl bg-[#ffd23f] px-4 text-sm font-black text-[#09216d] hover:bg-[#ffe271] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Sortir en gardant ma place</button>}
            <div className="mt-6 border-t border-white/15 pt-5">
              <p className="text-sm leading-6 text-[#d8e3ff]">Tu souhaites retirer ton inscription et ton profil du site ?</p>
              <button ref={deleteButtonRef} type="button" onClick={() => { setConfirming(true); requestAnimationFrame(() => titleRef.current?.focus()); }} className="mt-3 min-h-11 rounded-lg px-2 text-sm font-bold text-red-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200">Supprimer ma place</button>
            </div>
          </>}
        </div>
      </section>
    </div>, document.body,
  );
}
