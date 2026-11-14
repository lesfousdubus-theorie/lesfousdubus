"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

export function JoinBusModal({
  isOpen,
  mode,
  name,
  comment,
  error,
  joining,
  onNameChange,
  onCommentChange,
  onClose,
  onSubmit,
  onRemove,
}: {
  isOpen: boolean;
  mode: "name" | "comment";
  name: string;
  comment: string;
  error: string;
  joining: boolean;
  onNameChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRemove: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, initialFocusRef);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 p-3 backdrop-blur-md sm:p-6"
      role="presentation"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-bus-title"
        className="my-auto w-full max-w-[34rem] overflow-hidden rounded-[1.5rem] border border-[#ffd23f]/60 bg-[#081127] text-white shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-start justify-between gap-5 border-b border-white/10 bg-gradient-to-r from-[#102a75] to-[#081127] px-5 py-5 sm:px-6 sm:py-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex rounded-full bg-[#ffd23f] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0a216f]">
              Ton profil de passager
            </div>
            <h2 id="join-bus-title" className="text-2xl font-black leading-tight sm:text-3xl">
              {mode === "name"
                ? name.trim() ? "Modifie ton prénom" : "Ajoute ton prénom"
                : comment.trim() ? "Modifie ton commentaire" : "Laisse un commentaire"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#d8e3ff]">
              {mode === "name"
                ? "Il sera affiché au-dessus de ton personnage dans le bus."
                : "Partage un petit mot sur la théorie avec les autres passagers."}
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <form
          className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {mode === "name" ? (
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-white">
                Nom ou pseudo <span className="text-xs font-semibold text-[#ffd23f]">24 caractères max.</span>
              </span>
              <input
                ref={mode === "name" ? initialFocusRef as RefObject<HTMLInputElement> : undefined}
                required
                maxLength={24}
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Ex. NakamaBasque"
                className="w-full select-text rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-base text-white outline-none placeholder:text-[#9aabd2] focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/25"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-white">
                Ton message <span className="text-xs font-semibold text-[#ffd23f]">180 caractères max.</span>
              </span>
              <textarea
                ref={mode === "comment" ? initialFocusRef as RefObject<HTMLTextAreaElement> : undefined}
                required
                maxLength={180}
                rows={4}
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder="Ex. Trop bien, vive la théorie !"
                className="w-full resize-none select-text rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-base leading-relaxed text-white outline-none placeholder:text-[#9aabd2] focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/25"
              />
              <span className="mt-1.5 block text-right text-xs font-semibold tabular-nums text-[#aebde0]">
                {comment.length}/180
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">
              {error}
            </p>
          )}

          {mode === "name" && (
            <p className="text-xs leading-relaxed text-[#aebde0]">
              Ton nom sera visible publiquement dans le bus.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={joining}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-base font-black text-[#09216d] shadow-[0_5px_0_#a87500] transition hover:bg-[#ffe271] active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-65"
            >
              <span aria-hidden="true">{mode === "name" ? "🏷️" : "💬"}</span>
              {joining ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              disabled={joining}
              onClick={onRemove}
              className="min-h-12 rounded-xl border border-red-300/45 bg-red-950/35 px-4 py-3 text-sm font-black text-red-100 transition hover:border-red-200 hover:bg-red-900/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-wait disabled:opacity-65"
            >
              {mode === "name" ? "Retirer mon prénom" : "Retirer mon commentaire"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
