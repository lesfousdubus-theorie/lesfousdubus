"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PassengerManifestEntry } from "@/types/passenger";
import { countPeopleOnBoard, getBusCrew } from "@/lib/bus-crew";
import { formatPassengerDisplayName, pickLocale, useLocale } from "@/lib/i18n";
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
  onOpenMessages,
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
  onOpenMessages: () => void;
  onClose: () => void;
}) {
  const locale = useLocale();
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
    const numericQuery = normalizedQuery.replace(/^(?:(?:place|seat)\s*)?(?:n[°o]\s*|#)?/, "").trim();
    const isNumericQuery = /^\d+$/.test(numericQuery);

    return passengers.filter((passenger) => {
      if (activeOnlyWithComment && !passenger.hasComment) return false;
      if (!normalizedQuery) return true;
      const placeNumber = passenger.entryNumber ?? passenger.seatIndex + 1;
      const normalizedName = normalizeSearchText(formatPassengerDisplayName(passenger.displayName, locale));
      if (normalizedName.includes(normalizedQuery)) return true;
      return isNumericQuery && String(placeNumber).includes(numericQuery);
    });
  }, [activeOnlyWithComment, activeSearchQuery, locale, passengers]);

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
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#030617]/80 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="passenger-list-title" className="bus-modal-card bus-passenger-list bus-case-solid my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl text-white shadow-[0_24px_64px_rgba(2,4,18,0.7)] focus:outline-none">
        <header className="bus-case-header flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="bus-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <BusFrontIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">{pickLocale(locale, "Le convoi", "The convoy")}</p>
              <h2 ref={titleRef} tabIndex={-1} id="passenger-list-title" className="mt-0.5 text-xl font-black focus:outline-none sm:text-2xl">
                {count === null
                  ? pickLocale(locale, "Passagers", "Passengers")
                  : pickLocale(
                      locale,
                      `${countPeopleOnBoard(count).toLocaleString("fr-FR")} passagers`,
                      `${countPeopleOnBoard(count).toLocaleString("en-US")} passengers`,
                    )}
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
          <button type="button" onClick={onOpenMessages} className="bus-btn-primary mb-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold focus-visible:outline-none">
            {pickLocale(locale, "Voir les messages", "View messages")} <span aria-hidden="true">→</span>
          </button>
          <div aria-label={pickLocale(locale, "Équipage permanent", "Permanent crew")} className="mb-3 grid gap-2 sm:grid-cols-2">
            {getBusCrew(locale).map((member) => (
              <div key={member.name} className="bus-case-highlight flex min-h-16 items-center gap-3 rounded-2xl px-3.5 py-2.5">
                <span aria-hidden="true" className="bus-icon-badge grid h-9 w-9 shrink-0 place-items-center rounded-full">
                  <BusFrontIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{member.name}</span>
                  <span className="block text-xs font-semibold text-[#c4b5fd]">{member.role}</span>
                  {"url" in member && (
                    <a
                      href={member.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs font-bold leading-tight text-[#c4b5fd] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none"
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
              <div className="flex flex-col items-center gap-3 text-center text-sm font-bold text-[#a3aed9]">
                <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#947eef] motion-reduce:animate-none" />
                {pickLocale(locale, "Chargement des passagers…", "Loading passengers…")}
              </div>
            </div>
          ) : <>
          {passengers.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
                  <label htmlFor="passenger-list-search" className="sr-only">
                    {pickLocale(locale, "Rechercher un passager par nom ou numéro de place", "Search for a passenger by name or seat number")}
                  </label>
                  <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3aed9]" />
                  <input
                    id="passenger-list-search"
                    type="search"
                    value={activeSearchQuery}
                    onChange={(event) => setActiveSearchQuery(event.target.value)}
                    placeholder={pickLocale(locale, "Nom ou n° de place…", "Name or seat #…")}
                    className="bus-case-inset min-h-11 w-full rounded-xl py-2 pl-10 pr-11 text-base text-white placeholder:text-[#8995c4] transition-colors focus:border-[#947eef] focus:outline-none sm:text-sm"
                  />
                  {activeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setActiveSearchQuery("")}
                      aria-label={pickLocale(locale, "Effacer la recherche", "Clear search")}
                      className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-xl text-[#a3aed9] transition-colors hover:text-white focus-visible:outline-none"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  aria-pressed={activeOnlyWithComment}
                  onClick={() => setActiveOnlyWithComment(!activeOnlyWithComment)}
                  className={`min-h-11 cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold focus-visible:outline-none ${
                    activeOnlyWithComment ? "bus-btn-active" : "bus-btn-secondary"
                  }`}
                >
                  {pickLocale(locale, "Avec message", "With message")}
                </button>
                {myPassenger && (
                  <button
                    type="button"
                    onClick={jumpToMySeat}
                    className="bus-btn-tonal min-h-11 cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold focus-visible:outline-none"
                  >
                    {pickLocale(locale, "Ma place", "My seat")}
                  </button>
                )}
                {onRefresh && (
                  <button
                    type="button"
                    aria-disabled={loading}
                    onClick={() => {
                      if (!loading) onRefresh();
                    }}
                    className="bus-btn-secondary min-h-11 cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold focus-visible:outline-none aria-disabled:cursor-wait aria-disabled:opacity-60"
                  >
                    {pickLocale(locale, "Actualiser", "Refresh")}
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
                ? "border-[#947eef] bg-[#1b2260]"
                : "border-[#947eef]/22 bg-[#0e1438]";
              return passenger.displayName || passenger.hasComment ? (
                <button
                  key={passenger.seatIndex}
                  type="button"
                  data-passenger-seat={passenger.seatIndex}
                  onClick={() => onPassengerClick(passenger)}
                  className={`group flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors hover:border-[#cfc4fc] focus-visible:outline-none ${rowClass}`}
                >
                  <span aria-hidden="true" className="bus-icon-badge grid h-8 w-8 shrink-0 place-items-center rounded-full">
                    <PersonIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-black text-white">{formatPassengerDisplayName(passenger.displayName, locale)}</span>
                      {isCurrentSeat && (
                        <span className="bus-pill-badge shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                          {pickLocale(locale, "Moi", "Me")}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs font-semibold text-[#c7d2fe]">
                      {pickLocale(locale, `Place n° ${placeNumber.toLocaleString("fr-FR")}`, `Seat #${placeNumber.toLocaleString("en-US")}`)}
                      {passenger.hasComment ? pickLocale(locale, " · Message", " · Message") : ""}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#c7d2fe] transition-colors group-hover:text-white" />
                </button>
              ) : (
                <div
                  key={passenger.seatIndex}
                  tabIndex={isCurrentSeat ? -1 : undefined}
                  data-passenger-seat={passenger.seatIndex}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-[#dfe5ff] focus:outline-none ${isCurrentSeat ? "border-[#947eef] bg-[#1b2260]" : "border-[#947eef]/18 bg-[#0e1438]/75"}`}
                >
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-[#a3aed9]">
                    <PersonIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-bold text-[#dfe5ff]">{pickLocale(locale, "Anonyme", "Anonymous")}</span>
                      {isCurrentSeat && (
                        <span className="bus-pill-badge shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                          {pickLocale(locale, "Moi", "Me")}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs font-semibold text-[#a3aed9]">
                      {pickLocale(locale, `Place n° ${placeNumber.toLocaleString("fr-FR")}`, `Seat #${placeNumber.toLocaleString("en-US")}`)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {loading && passengers.length > 0 && (
            <div role="status" aria-live="polite" aria-atomic="true" className="flex min-h-20 items-center justify-center gap-3 text-sm font-bold text-[#a3aed9]">
              <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#947eef] motion-reduce:animate-none" />
              {pickLocale(locale, "Chargement des passagers…", "Loading passengers…")}
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-center">
              <p role="alert" className="text-sm font-bold text-red-100">{error}</p>
              <button type="button" onClick={onRetry} className="bus-btn-secondary mt-3 min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-none">
                {pickLocale(locale, "Réessayer", "Try again")}
              </button>
            </div>
          )}
          {!loading && !error && hasMore && (
            <button type="button" onClick={onLoadMore} className="bus-btn-secondary mt-4 min-h-11 w-full cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold focus-visible:outline-none">
              {pickLocale(locale, "Afficher plus de passagers", "Show more passengers")}
            </button>
          )}
          {!loading && !error && passengers.length === 0 && <p className="p-8 text-center text-sm text-[#a3aed9]">{pickLocale(locale, "L’équipage attend les prochains passagers.", "The crew is waiting for the next passengers.")}</p>}
          {!error && passengers.length > 0 && filteredPassengers.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-[#a3aed9]">
                {pickLocale(locale, "Aucun passager chargé ne correspond à ce filtre.", "No loaded passenger matches this filter.")}
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSearchQuery("");
                    setActiveOnlyWithComment(false);
                  }}
                  className="bus-btn-secondary mt-3 min-h-11 cursor-pointer rounded-full px-4 py-2 text-xs font-semibold focus-visible:outline-none"
                >
                  {pickLocale(locale, "Réinitialiser les filtres", "Reset filters")}
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
