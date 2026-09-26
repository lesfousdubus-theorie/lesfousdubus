"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PassengerManifestEntry } from "@/types/passenger";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

export function PassengerListModal({
  isOpen,
  count,
  passengers,
  loading,
  error,
  hasMore,
  returnFocusRef,
  onLoadMore,
  onRetry,
  onPassengerClick,
  onClose,
}: {
  isOpen: boolean;
  count: number | null;
  passengers: PassengerManifestEntry[];
  loading: boolean;
  error: string;
  hasMore: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onLoadMore: () => void;
  onRetry: () => void;
  onPassengerClick: (passenger: PassengerManifestEntry) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef, returnFocusRef);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-[#020617]/30 p-4 backdrop-blur-[2px]" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="passenger-list-title" className="flex h-[72dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/50 bg-[#081127]/95 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd23f]">Le convoi</p>
            <h2 ref={titleRef} tabIndex={-1} id="passenger-list-title" className="mt-0.5 text-xl font-black focus:outline-none">
              {count === null ? "Passagers" : `${count.toLocaleString("fr-FR")} passagers`}
            </h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="relative flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {loading && passengers.length === 0 ? (
            <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 grid place-items-center p-6">
              <div className="flex flex-col items-center gap-3 text-center text-sm font-bold text-white/70">
                <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#ffd23f] motion-reduce:animate-none" />
                Chargement des passagers…
              </div>
            </div>
          ) : <>
          <div className="grid gap-2 sm:grid-cols-2">
            {passengers.map((passenger) => passenger.displayName || passenger.hasComment ? (
              <button key={passenger.seatIndex} type="button" onClick={() => onPassengerClick(passenger)} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/12 bg-white/[0.055] px-3 text-left transition hover:border-[#ffd23f]/55 hover:bg-[#ffd23f]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffd23f]/15 text-sm">👤</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{passenger.displayName ?? "Anonyme"}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Place {passenger.seatIndex + 1}{passenger.hasComment ? " · Message" : ""}</span>
                </span>
              </button>
            ) : (
              <div key={passenger.seatIndex} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-white/55">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-sm">👤</span>
                <span>
                  <span className="block text-sm font-bold">Anonyme</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Place {passenger.seatIndex + 1}</span>
                </span>
              </div>
            ))}
          </div>
          {loading && passengers.length > 0 && (
            <div role="status" aria-live="polite" aria-atomic="true" className="flex min-h-20 items-center justify-center gap-3 text-sm font-bold text-white/70">
              <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#ffd23f] motion-reduce:animate-none" />
              Chargement des passagers…
            </div>
          )}
          {error && (
            <div className="p-4 text-center">
              <p role="alert" className="text-sm font-bold text-red-200">{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-xl border border-red-200/50 px-4 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]">
                Réessayer
              </button>
            </div>
          )}
          {!loading && !error && hasMore && <button type="button" onClick={onLoadMore} className="mt-4 min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] text-sm font-black text-white transition hover:border-[#ffd23f]/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]">Afficher plus de passagers</button>}
          {!loading && !error && passengers.length === 0 && <p className="p-8 text-center text-sm text-white/60">Le bus attend son premier passager.</p>}
          </>}
        </div>
      </section>
    </div>,
    document.body,
  );
}
