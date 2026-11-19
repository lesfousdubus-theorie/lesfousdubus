"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CommentBubbleIcon, SeatTicketIcon, UserBadgeIcon } from "../ui/BusIcons";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";

export function ManagePlaceModal({
  inside,
  entryNumber,
  onClose,
  onDelete,
  onEditName,
  onEditComment,
  hasComment = false,
}: {
  inside: boolean;
  entryNumber?: number | null;
  onClose: () => void;
  onExit?: () => void;
  onDelete: () => Promise<boolean>;
  onEditName?: () => void;
  onEditComment?: () => void;
  hasComment?: boolean;
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
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#050a1b]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={event => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="manage-place-title" aria-describedby={confirming ? "manage-place-description" : undefined} className="bus-panel bus-modal-card my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#a78bfa]/45 bg-[#0b1433] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none">
        <header className="bus-panel-header flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#1e2e70] to-[#0b1433] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              aria-hidden="true"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                confirming
                  ? "border-red-400/40 bg-red-500/15 text-red-200"
                  : "border-[#a78bfa]/35 bg-[#a78bfa]/12 text-[#a78bfa]"
              }`}
            >
              <SeatTicketIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-[0.12em] ${confirming ? "text-red-200" : "text-[#a78bfa]"}`}>
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
          {confirming ? (
            <div role="alertdialog" aria-labelledby="manage-place-title" aria-describedby="manage-place-description">
              <p id="manage-place-description" className="text-sm leading-7 text-[#e2e8ff]">
                Ta place et ton profil seront définitivement supprimés du bus.
              </p>
              {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">{error}</p>}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={close} disabled={deleting} className="bus-secondary min-h-12 cursor-pointer rounded-xl border border-white/30 bg-[#141f4b] px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#a78bfa]/70 hover:text-[#a78bfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f4b] disabled:cursor-not-allowed disabled:opacity-60">Annuler</button>
                <button type="button" onClick={() => void remove()} disabled={deleting} className="bus-shape-ticket bus-danger min-h-12 cursor-pointer rounded-xl border border-red-400/40 bg-red-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-600 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f4b] disabled:cursor-wait disabled:opacity-60">{deleting ? "Suppression…" : "Confirmer la suppression"}</button>
              </div>
            </div>
          ) : (
            <>
              {entryNumber !== null && entryNumber !== undefined && (
                <div className="mb-4 rounded-2xl border border-[#a78bfa]/35 bg-[#141f4b] px-4 py-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#a78bfa]">
                    Place n° {entryNumber.toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-[#e2e8ff]">
                    Tu es la {ordinal} personne à être rentrée dans le bus.
                  </p>
                </div>
              )}
              {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">{error}</p>}
              {!inside && (onEditName || onEditComment) && (
                <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                  {onEditName && (
                    <button
                      type="button"
                      onClick={onEditName}
                      className="bus-secondary flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/30 bg-[#141f4b] px-4 py-2.5 text-sm font-bold text-white transition hover:border-[#a78bfa]/70 hover:text-[#a78bfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f4b]"
                    >
                      <UserBadgeIcon className="h-4 w-4 shrink-0" />
                      <span>Modifier mon nom</span>
                    </button>
                  )}
                  {onEditComment && (
                    <button
                      type="button"
                      onClick={onEditComment}
                      className="bus-secondary flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/30 bg-[#141f4b] px-4 py-2.5 text-sm font-bold text-white transition hover:border-[#a78bfa]/70 hover:text-[#a78bfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f4b]"
                    >
                      <CommentBubbleIcon className="h-4 w-4 shrink-0" />
                      <span>{hasComment ? "Modifier mon commentaire" : "Mettre un commentaire"}</span>
                    </button>
                  )}
                </div>
              )}
              <div className="mt-4">
                <button ref={deleteButtonRef} type="button" onClick={() => { setConfirming(true); requestAnimationFrame(() => titleRef.current?.focus()); }} className="inline-flex min-h-11 cursor-pointer items-center rounded text-sm font-medium text-red-200 underline decoration-red-200/55 underline-offset-4 transition-colors hover:text-white hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1433]">Supprimer ma place</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>, document.body,
  );
}
