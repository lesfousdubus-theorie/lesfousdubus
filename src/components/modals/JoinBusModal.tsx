"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";
import { CommentBubbleIcon, UserBadgeIcon } from "../ui/BusIcons";

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
  const [submitNonce, setSubmitNonce] = useState(0);
  const close = () => { if (!joining) onClose(); };
  const handleKeyDown = useModalAccessibility(isOpen, close, dialogRef, initialFocusRef);

  useEffect(() => {
    if (!isOpen || !error || joining) return;
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [error, isOpen, joining, submitNonce]);

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
        className="bus-modal-card my-auto flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f]"
            >
              {mode === "name" ? <UserBadgeIcon className="h-5 w-5" /> : <CommentBubbleIcon className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="join-bus-title" className="text-xl font-black leading-tight sm:text-2xl">
                {mode === "name"
                  ? hasSavedValue ? "Modifie ton nom ou pseudo" : "Ajoute ton nom ou pseudo"
                  : hasSavedValue ? "Modifie ton commentaire" : "Laisse un commentaire"}
              </h2>
            </div>
          </div>
          <ModalCloseButton onClick={close} disabled={joining} />
        </header>

        <form
          noValidate
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (joining) return;
            setSubmitNonce((n) => n + 1);
            onSubmit();
          }}
        >
          {mode === "name" ? (
            <div>
              <label htmlFor="join-bus-name" className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-white">
                <span>Nom ou pseudo</span>
                <span className="text-xs font-semibold text-[#ffd23f]">24 caractères max.</span>
              </label>
              <input
                ref={mode === "name" ? initialFocusRef as RefObject<HTMLInputElement> : undefined}
                id="join-bus-name"
                required
                readOnly={joining}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "join-bus-error" : undefined}
                value={name}
                onChange={(event) => {
                  const chars = Array.from(event.target.value);
                  onNameChange(chars.length > 24 ? chars.slice(0, 24).join("") : event.target.value);
                }}
                placeholder="Ex. NakamaBasque"
                className="w-full select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 aria-[invalid=true]:border-red-400/80 read-only:cursor-not-allowed read-only:opacity-60"
              />
              <p aria-hidden="true" className="mt-1.5 text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
                {Array.from(name).length}/24
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="join-bus-comment" className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-white">
                <span>Ton message</span>
                <span className="text-xs font-semibold text-[#ffd23f]">180 caractères max.</span>
              </label>
              <textarea
                ref={mode === "comment" ? initialFocusRef as RefObject<HTMLTextAreaElement> : undefined}
                id="join-bus-comment"
                required
                readOnly={joining}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "join-bus-error" : undefined}
                rows={4}
                value={comment}
                onChange={(event) => {
                  const chars = Array.from(event.target.value);
                  onCommentChange(chars.length > 180 ? chars.slice(0, 180).join("") : event.target.value);
                }}
                placeholder="Ex. Trop bien, vive la théorie !"
                className="w-full resize-none select-text rounded-xl border border-white/25 bg-[#040b18]/85 px-4 py-3 text-base leading-relaxed text-white outline-none transition-colors placeholder:text-[#b6c7eb]/70 focus:border-[#ffd23f] focus:ring-2 focus:ring-[#ffd23f]/30 aria-[invalid=true]:border-red-400/80 read-only:cursor-not-allowed read-only:opacity-60"
              />
              <p aria-hidden="true" className="mt-1.5 text-right text-xs font-semibold tabular-nums text-[#b6c7eb]">
                {Array.from(comment).length}/180
              </p>
            </div>
          )}

          {error && (
            <p id="join-bus-error" role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">
              {error}
            </p>
          )}

          <div className={`grid gap-3 ${mode === "comment" && hasSavedValue ? "sm:grid-cols-2" : ""}`}>
            <button
              type="submit"
              aria-disabled={joining}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-base font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] active:translate-y-1 active:shadow-none aria-disabled:cursor-wait aria-disabled:opacity-80"
            >
              {mode === "name" ? <UserBadgeIcon className="h-5 w-5 shrink-0" /> : <CommentBubbleIcon className="h-5 w-5 shrink-0" />}
              {joining ? "Enregistrement…" : "Enregistrer"}
            </button>
            {mode === "comment" && hasSavedValue && (
              <button
                type="button"
                aria-disabled={joining}
                onClick={() => { if (!joining) onRemove(); }}
                className="min-h-12 cursor-pointer rounded-xl border border-red-300/45 bg-red-950/35 px-4 py-3 text-sm font-black text-red-100 transition hover:border-red-200 hover:bg-red-900/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-wait aria-disabled:opacity-80"
              >
                Retirer mon commentaire
              </button>
            )}
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
