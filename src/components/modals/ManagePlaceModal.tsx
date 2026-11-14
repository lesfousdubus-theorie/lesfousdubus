"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExitBusIcon, SeatTicketIcon } from "../ui/BusIcons";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";

export function ManagePlaceModal({ inside, entryNumber, onClose, onExit, onDelete }: {
  inside: boolean;
  entryNumber?: number | null;
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
  const ordinal = entryNumber ? (entryNumber === 1 ? "1re" : `${entryNumber.toLocaleString("fr-FR")}e`) : null;
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
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={event => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} tabIndex={-1} role={confirming ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="manage-place-title" aria-describedby="manage-place-description" className="bus-modal-card my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              aria-hidden="true"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                confirming
                  ? "border-red-400/40 bg-red-500/15 text-red-200"
                  : "border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f]"
              }`}
            >
              <SeatTicketIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-[0.12em] ${confirming ? "text-red-200" : "text-[#ffd23f]"}`}>
                {confirming ? "Suppression définitive" : "Gestion de place"}
              </p>
              <h2 ref={titleRef} tabIndex={-1} id="manage-place-title" className="mt-0.5 text-xl font-black [text-wrap:balance] focus:outline-none sm:text-2xl">
                {confirming ? "Supprimer ta place ?" : "Ta place dans le bus"}
              </h2>
            </div>
          </div>
          <ModalCloseButton onClick={close} disabled={deleting} />
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {!confirming && entryNumber !== null && entryNumber !== undefined && (
            <div className="mb-4 rounded-2xl border border-[#ffd23f]/35 bg-[#0c1b3a] px-4 py-3.5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#ffd23f]">
                Place n° {entryNumber.toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[#dce7ff]">
                Tu es la {ordinal} personne à être rentrée dans le bus. Ce numéro reste fixe même si d’autres passagers se retirent avant toi.
              </p>
            </div>
          )}
          <p id="manage-place-description" className="text-sm leading-7 text-[#dce7ff]">
            {confirming
              ? "Ta place, ton pseudo, ton commentaire et ton choix de personnage seront supprimés du site. Le compteur diminuera et les passagers suivants se décaleront d’un siège pour garder toutes les places remplies. Cette suppression est définitive ; si tu reviens plus tard, tu recevras un nouveau numéro."
              : "Sortir te ramène à l’extérieur du bus. Ta place et ton profil restent enregistrés : tu pourras les retrouver lors de ta prochaine visite depuis ce navigateur. Le compteur ne change pas."}
          </p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">{error}</p>}
          {confirming ? <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} disabled={deleting} className="min-h-12 cursor-pointer rounded-xl border border-white/30 bg-[#0c1b3a] px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] disabled:cursor-not-allowed disabled:opacity-60">Annuler</button>
            <button type="button" onClick={() => void remove()} disabled={deleting} className="min-h-12 cursor-pointer rounded-xl border border-red-400/40 bg-red-700 px-5 py-2.5 text-sm font-black text-white shadow-[0_4px_0_#7f1d1d] transition hover:bg-red-600 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] disabled:cursor-wait disabled:opacity-60">{deleting ? "Suppression…" : "Confirmer la suppression"}</button>
          </div> : <>
            {inside && (
              <button type="button" onClick={onExit} className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-sm font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] active:translate-y-1 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]">
                <ExitBusIcon className="h-4 w-4 shrink-0" />
                <span>Sortir en gardant ma place</span>
              </button>
            )}
            <div className="mt-6 border-t border-white/15 pt-5">
              <p className="text-sm leading-6 text-[#b6c7eb]">Tu souhaites retirer ton inscription et ton profil du site ?</p>
              <button ref={deleteButtonRef} type="button" onClick={() => { setConfirming(true); requestAnimationFrame(() => titleRef.current?.focus()); }} className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-red-400/45 bg-red-950/50 px-4 py-2 text-sm font-bold text-red-200 transition hover:border-red-300 hover:bg-red-900/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]">Supprimer ma place</button>
            </div>
          </>}
        </div>
      </section>
    </div>, document.body,
  );
}
