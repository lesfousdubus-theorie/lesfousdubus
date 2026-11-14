"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PassengerManifestEntry } from "@/types/passenger";
import { BUS_CREW, countPeopleOnBoard } from "@/lib/bus-crew";
import { BusFrontIcon, ChevronRightIcon, CloseIcon, ExternalArrowIcon, PersonIcon, SearchIcon } from "../ui/BusIcons";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function PassengerListModal({
  isOpen,
  count,
  passengers,
  loading,
  error,
  hasMore,
  currentSeatIndex = null,
  restoreFocusSeatIndex = null,
  initialScrollTop = 0,
  onScrollTopChange,
  searchQuery,
  onSearchQueryChange,
  onlyWithComment,
  onOnlyWithCommentChange,
  onRefresh,
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
  currentSeatIndex?: number | null;
  restoreFocusSeatIndex?: number | null;
  initialScrollTop?: number;
  onScrollTopChange?: (scrollTop: number) => void;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  onlyWithComment?: boolean;
  onOnlyWithCommentChange?: (value: boolean) => void;
  onRefresh?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onLoadMore: () => void;
  onRetry: () => void;
  onPassengerClick: (passenger: PassengerManifestEntry) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalOnlyWithComment, setInternalOnlyWithComment] = useState(false);

  const activeSearchQuery = searchQuery ?? internalSearchQuery;
  const setActiveSearchQuery = onSearchQueryChange ?? setInternalSearchQuery;
  const activeOnlyWithComment = onlyWithComment ?? internalOnlyWithComment;
  const setActiveOnlyWithComment = onOnlyWithCommentChange ?? setInternalOnlyWithComment;

  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef, returnFocusRef);

  useEffect(() => {
    if (!isOpen) return;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = initialScrollTop;
    }
    const frameId = window.requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = initialScrollTop;
      }
      if (restoreFocusSeatIndex !== null && restoreFocusSeatIndex !== undefined) {
        const target = dialogRef.current?.querySelector<HTMLElement>(`[data-passenger-seat="${restoreFocusSeatIndex}"]`);
        target?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [initialScrollTop, isOpen, restoreFocusSeatIndex]);

  const myPassenger = useMemo(() => {
    if (currentSeatIndex === null || currentSeatIndex === undefined) return null;
    return passengers.find((passenger) => passenger.seatIndex === currentSeatIndex) ?? null;
  }, [currentSeatIndex, passengers]);

  const filteredPassengers = useMemo(() => {
    const normalizedQuery = normalizeSearchText(activeSearchQuery);
    const numericQuery = normalizedQuery.replace(/^(?:place\s*)?(?:n[°o]\s*|#)?/, "").trim();
    const isNumericQuery = /^\d+$/.test(numericQuery);

    return passengers.filter((passenger) => {
      if (activeOnlyWithComment && !passenger.hasComment) return false;
      if (!normalizedQuery) return true;
      const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
      const normalizedName = normalizeSearchText(passenger.displayName ?? "Anonyme");
      if (normalizedName.includes(normalizedQuery)) return true;
      return isNumericQuery && String(placeNumber).includes(numericQuery);
    });
  }, [activeOnlyWithComment, activeSearchQuery, passengers]);

  const hasActiveFilter = activeSearchQuery.trim().length > 0 || activeOnlyWithComment;

  const jumpToMySeat = () => {
    if (currentSeatIndex === null || currentSeatIndex === undefined) return;
    if (hasActiveFilter) {
      setActiveSearchQuery("");
      setActiveOnlyWithComment(false);
    }
    window.requestAnimationFrame(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(`[data-passenger-seat="${currentSeatIndex}"]`);
      if (!target) return;
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      target.focus({ preventScroll: true });
    });
  };

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
        <div
          ref={scrollContainerRef}
          onScroll={(event) => {
            onScrollTopChange?.(event.currentTarget.scrollTop);
          }}
          className="relative min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5"
        >
          <div aria-label="Équipage permanent" className="mb-3 grid gap-2 sm:grid-cols-2">
            {BUS_CREW.map((member) => (
              <div key={member.name} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#ffd23f]/40 bg-[#0c1b3a] px-3.5 py-2.5">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ffd23f]/35 bg-[#ffd23f]/15 text-[#ffd23f]">
                  <BusFrontIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{member.name}</span>
                  <span className="block text-xs font-semibold text-[#ffd23f]">{member.role}</span>
                  {"url" in member && (
                    <a
                      href={member.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm py-2 text-xs font-bold text-[#ffd23f] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a]"
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
          {passengers.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
                  <label htmlFor="passenger-list-search" className="sr-only">
                    Rechercher un passager par pseudo ou numéro de place
                  </label>
                  <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b6c7eb]" />
                  <input
                    id="passenger-list-search"
                    type="search"
                    value={activeSearchQuery}
                    onChange={(event) => setActiveSearchQuery(event.target.value)}
                    placeholder="Rechercher un pseudo ou n° de place…"
                    className="min-h-11 w-full rounded-xl border border-white/20 bg-[#0c1b3a] py-2 pl-10 pr-11 text-base text-white placeholder:text-[#8ea5d4] transition-colors focus:border-[#ffd23f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] sm:text-sm"
                  />
                  {activeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setActiveSearchQuery("")}
                      aria-label="Effacer la recherche"
                      className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-xl text-[#b6c7eb] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a]"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  aria-pressed={activeOnlyWithComment}
                  onClick={() => setActiveOnlyWithComment(!activeOnlyWithComment)}
                  className={`min-h-11 cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] ${
                    activeOnlyWithComment
                      ? "border-[#ffd23f] bg-[#ffd23f]/15 text-[#ffd23f]"
                      : "border-white/20 bg-[#0c1b3a] text-[#dce7ff] hover:border-[#ffd23f]/65"
                  }`}
                >
                  Avec message
                </button>
                {myPassenger && (
                  <button
                    type="button"
                    onClick={jumpToMySeat}
                    className="min-h-11 cursor-pointer rounded-xl border border-[#ffd23f]/50 bg-[#ffd23f]/12 px-3.5 py-2 text-xs font-bold text-[#ffd23f] transition hover:bg-[#ffd23f]/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]"
                  >
                    Ma place
                  </button>
                )}
                {onRefresh && (
                  <button
                    type="button"
                    aria-disabled={loading}
                    onClick={() => {
                      if (!loading) onRefresh();
                    }}
                    className="min-h-11 cursor-pointer rounded-xl border border-white/20 bg-[#0c1b3a] px-3.5 py-2 text-xs font-bold text-[#dce7ff] transition hover:border-[#ffd23f]/65 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] aria-disabled:cursor-wait aria-disabled:opacity-60"
                  >
                    Actualiser
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredPassengers.map((passenger) => {
              const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
              const isCurrentSeat = currentSeatIndex !== null && currentSeatIndex !== undefined && passenger.seatIndex === currentSeatIndex;
              const rowClass = isCurrentSeat
                ? "border-[#ffd23f] bg-[#132959]"
                : "border-white/15 bg-[#0c1b3a]";
              return passenger.displayName || passenger.hasComment ? (
                <button
                  key={passenger.seatIndex}
                  type="button"
                  data-passenger-seat={passenger.seatIndex}
                  onClick={() => onPassengerClick(passenger)}
                  className={`group flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition hover:border-[#ffd23f]/65 hover:bg-[#10265c]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] ${rowClass}`}
                >
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#ffd23f]/30 bg-[#ffd23f]/15 text-[#ffd23f]">
                    <PersonIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-black text-white">{passenger.displayName ?? "Anonyme"}</span>
                      {isCurrentSeat && (
                        <span className="shrink-0 rounded-full border border-[#ffd23f]/45 bg-[#ffd23f]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ffd23f]">
                          Moi
                        </span>
                      )}
                    </span>
                    <span className="block text-xs font-semibold text-[#b6c7eb]">Place n° {placeNumber.toLocaleString("fr-FR")}{passenger.hasComment ? " · Message" : ""}</span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#b6c7eb] transition-transform group-hover:translate-x-0.5 group-hover:text-[#ffd23f]" />
                </button>
              ) : (
                <div
                  key={passenger.seatIndex}
                  tabIndex={isCurrentSeat ? -1 : undefined}
                  data-passenger-seat={passenger.seatIndex}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-[#dce7ff] focus:outline-none ${isCurrentSeat ? "border-[#ffd23f] bg-[#132959]" : "border-white/15 bg-[#0c1b3a]/75"}`}
                >
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-[#b6c7eb]">
                    <PersonIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-bold text-[#dce7ff]">Anonyme</span>
                      {isCurrentSeat && (
                        <span className="shrink-0 rounded-full border border-[#ffd23f]/45 bg-[#ffd23f]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ffd23f]">
                          Moi
                        </span>
                      )}
                    </span>
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
          {!error && passengers.length > 0 && filteredPassengers.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-[#b6c7eb]">
                Aucun passager chargé ne correspond à ce filtre.
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSearchQuery("");
                    setActiveOnlyWithComment(false);
                  }}
                  className="mt-3 min-h-11 cursor-pointer rounded-xl border border-white/25 bg-[#0c1b3a] px-4 py-2 text-xs font-bold text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
          </>}
        </div>
      </section>
    </div>,
    document.body,
  );
}
