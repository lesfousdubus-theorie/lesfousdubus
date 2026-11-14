"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PassengerManifestEntry } from "@/types/passenger";
import { BUS_CREW, countPeopleOnBoard } from "@/lib/bus-crew";
import { BusFrontIcon, ExternalArrowIcon, PersonIcon } from "../ui/BusIcons";
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
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="passenger-list-title" className="bus-modal-card bus-passenger-list my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f]">
              <BusFrontIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ffd23f]">Le convoi</p>
              <h2 ref={titleRef} tabIndex={-1} id="passenger-list-title" className="mt-0.5 text-xl font-black focus:outline-none sm:text-2xl">
                {count === null ? "Passagers" : `${countPeopleOnBoard(count).toLocaleString("fr-FR")} passagers`}
              </h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="relative min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div aria-label="Équipage permanent" className="mb-3 grid gap-2 sm:grid-cols-2">
            {BUS_CREW.map((member) => (
              <div key={member.name} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#ffd23f]/40 bg-[#0c1b3a] px-3.5 py-2.5">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ffd23f]/35 bg-[#ffd23f]/15 text-[#ffd23f]">
                  <BusFrontIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{member.name}</span>
                  <span className="block text-xs font-semibold text-[#ffd23f]">{member.role}</span>
                  <span className="block text-xs text-[#b6c7eb]">À bord depuis le départ</span>
                  {"url" in member && (
                    <a
                      href={member.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs font-bold text-[#ffd23f] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a]"
                    >
                      <span>{member.handle}</span>
                      <ExternalArrowIcon className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
          {loading && passengers.length === 0 ? (
            <div role="status" aria-live="polite" aria-atomic="true" className="grid min-h-32 place-items-center p-6">
              <div className="flex flex-col items-center gap-3 text-center text-sm font-bold text-[#b6c7eb]">
                <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#ffd23f] motion-reduce:animate-none" />
                Chargement des passagers…
              </div>
            </div>
          ) : <>
          <div className="grid gap-2 sm:grid-cols-2">
            {passengers.map((passenger) => {
              const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
              return passenger.displayName || passenger.hasComment ? (
                <button key={passenger.seatIndex} type="button" onClick={() => onPassengerClick(passenger)} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-white/15 bg-[#0c1b3a] px-3.5 py-2.5 text-left transition hover:border-[#ffd23f]/65 hover:bg-[#10265c]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]">
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#ffd23f]/30 bg-[#ffd23f]/15 text-[#ffd23f]">
                    <PersonIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-white">{passenger.displayName ?? "Anonyme"}</span>
                    <span className="block text-xs font-semibold text-[#b6c7eb]">Place n° {placeNumber.toLocaleString("fr-FR")}{passenger.hasComment ? " · Message" : ""}</span>
                  </span>
                </button>
              ) : (
                <div key={passenger.seatIndex} className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/15 bg-[#0c1b3a]/75 px-3.5 py-2.5 text-[#dce7ff]">
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-[#b6c7eb]">
                    <PersonIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[#dce7ff]">Anonyme</span>
                    <span className="block text-xs font-semibold text-[#b6c7eb]">Place n° {placeNumber.toLocaleString("fr-FR")}</span>
                  </span>
                </div>
              );
            })}
          </div>
          {loading && passengers.length > 0 && (
            <div role="status" aria-live="polite" aria-atomic="true" className="flex min-h-20 items-center justify-center gap-3 text-sm font-bold text-[#b6c7eb]">
              <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#ffd23f] motion-reduce:animate-none" />
              Chargement des passagers…
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-center">
              <p role="alert" className="text-sm font-bold text-red-100">{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 min-h-11 cursor-pointer rounded-xl border border-white/30 bg-[#0c1b3a] px-4 py-2 text-sm font-bold text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]">
                Réessayer
              </button>
            </div>
          )}
          {!loading && !error && hasMore && (
            <button type="button" onClick={onLoadMore} className="mt-4 min-h-11 w-full cursor-pointer rounded-xl border border-white/30 bg-[#0c1b3a] px-4 py-2.5 text-sm font-black text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]">
              Afficher plus de passagers
            </button>
          )}
          {!loading && !error && passengers.length === 0 && <p className="p-8 text-center text-sm text-[#b6c7eb]">L’équipage attend les prochains passagers.</p>}
          </>}
        </div>
      </section>
    </div>,
    document.body,
  );
}
