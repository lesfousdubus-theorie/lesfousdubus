"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";
import { CommentBubbleIcon, PersonIcon, UserBadgeIcon } from "../ui/BusIcons";

export function JoinBusModal({
  isOpen,
  mode,
  name,
  comment,
  error,
  joining,
  hasSavedValue,
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
  hasSavedValue: boolean;
  onNameChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRemove: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const close = () => { if (!joining) onClose(); };
  const handleKeyDown = useModalAccessibility(isOpen, close, dialogRef, initialFocusRef);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 backdrop-blur-sm"
      role="presentation"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-bus-title"
        aria-busy={joining}
        className="bus-modal-card my-auto flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#ffd23f] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#091c5c]">
              <PersonIcon className="h-3.5 w-3.5 shrink-0" />
              Ton profil de passager
            </div>
            <h2 id="join-bus-title" className="text-xl font-black leading-tight sm:text-2xl">
              {mode === "name"
                ? hasSavedValue ? "Modifie ton nom ou pseudo" : "Ajoute ton nom ou pseudo"
                : hasSavedValue ? "Modifie ton commentaire" : "Laisse un commentaire"}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#dce7ff] sm:text-sm">
              {mode === "name"
                ? "Il sera affiché au-dessus de ton personnage dans le bus."
                : "Partage un petit mot sur la théorie avec les autres passagers."}
            </p>
          </div>
          <ModalCloseButton onClick={close} disabled={joining} />
        </header>

        <form
          noValidate
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
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
                disabled={joining}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "join-bus-error join-bus-visibility" : "join-bus-visibility"}
                value={name}
                onChange={(event) => {
                  const chars = Array.from(event.target.value);
                  onNameChange(chars.length > 24 ? chars.slice(0, 24).join("") : event.target.value);
                }}
                placeholder="Ex. NakamaBasque"
                className="w-full select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="mt-1.5 block text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
                {Array.from(name).length}/24
              </span>
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-white">
                Ton message <span className="text-xs font-semibold text-[#ffd23f]">180 caractères max.</span>
              </span>
              <textarea
                ref={mode === "comment" ? initialFocusRef as RefObject<HTMLTextAreaElement> : undefined}
                required
                disabled={joining}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "join-bus-error join-bus-visibility" : "join-bus-visibility"}
                rows={4}
                value={comment}
                onChange={(event) => {
                  const chars = Array.from(event.target.value);
                  onCommentChange(chars.length > 180 ? chars.slice(0, 180).join("") : event.target.value);
                }}
                placeholder="Ex. Trop bien, vive la théorie !"
                className="w-full resize-none select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-4 py-3 text-base leading-relaxed text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="mt-1.5 block text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
                {Array.from(comment).length}/180
              </span>
            </label>
          )}

          {error && (
            <p id="join-bus-error" role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">
              {error}
            </p>
          )}

          <p id="join-bus-visibility" className="text-xs leading-relaxed text-[#b6c7eb]">
            {mode === "name" ? "Ton nom ou pseudo sera visible publiquement dans le bus." : "Ton commentaire sera visible publiquement par les autres passagers."}
          </p>

          <div className={`grid gap-3 ${mode === "comment" && hasSavedValue ? "sm:grid-cols-2" : ""}`}>
            <button
              type="submit"
              disabled={joining}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-base font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-80"
            >
              {mode === "name" ? <UserBadgeIcon className="h-5 w-5 shrink-0" /> : <CommentBubbleIcon className="h-5 w-5 shrink-0" />}
              {joining ? "Enregistrement…" : "Enregistrer"}
            </button>
            {mode === "comment" && hasSavedValue && <button
              type="button"
              disabled={joining}
              onClick={onRemove}
              className="min-h-12 cursor-pointer rounded-xl border border-red-300/45 bg-red-950/35 px-4 py-3 text-sm font-black text-red-100 transition hover:border-red-200 hover:bg-red-900/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] disabled:cursor-wait disabled:opacity-80"
            >
              Retirer mon commentaire
            </button>}
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
