"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PassengerProfile } from "@/types/passenger";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

export function PassengerCard({
  passenger,
  loading,
  error,
  returnFocusRef,
  onRetry,
  onClose,
}: {
  passenger: PassengerProfile | null;
  loading: boolean;
  error: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onRetry: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const handleKeyDown = useModalAccessibility(Boolean(passenger), onClose, dialogRef, dialogRef, returnFocusRef);

  if (!passenger) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto overscroll-contain bg-[#020617]/70 p-2 backdrop-blur-sm sm:p-4"
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
        aria-labelledby="passenger-name"
        className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[1.5rem] border border-[#ffd23f]/65 bg-[#081127] p-4 text-white shadow-[0_25px_80px_rgba(0,0,0,0.65)] sm:max-h-[calc(100dvh-2rem)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd23f]">Passager du bus</p>
            <h2 id="passenger-name" className="mt-1 break-words text-2xl font-black leading-tight">
              {passenger.displayName}
            </h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.07] p-4">
          {loading ? (
            <div className="flex min-h-16 items-center gap-3" role="status" aria-live="polite">
              <span
                aria-hidden="true"
                className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-[#d8e3ff]/25 border-t-[#ffd23f] motion-reduce:animate-none"
              />
              <p className="text-sm font-semibold text-[#d8e3ff]">Chargement de son message…</p>
            </div>
          ) : error ? (
            <div>
              <p role="alert" className="text-sm font-semibold text-red-200">{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-red-200/60 px-4 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]">
                Réessayer
              </button>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-[#eef3ff]">
              {passenger.comment || "Ce passager n’a pas laissé de message."}
            </p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
