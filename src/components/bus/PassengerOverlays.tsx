"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { PassengerProfile } from "./constants";

export interface PassengerManifestEntry {
  seatIndex: number;
  displayName: string | null;
  hasComment: boolean;
}

export const THEORY_START_DATE = Date.UTC(2024, 4, 26);

const MODAL_FOCUSABLE_SELECTOR = [
  "a[href]", "button:not([disabled])", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

function useModalAccessibility(
  isOpen: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null> = dialogRef,
  returnFocusRef?: RefObject<HTMLElement | null>,
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallbackReturnTarget = returnFocusRef?.current ?? null;
    const page = document.getElementById("site-content");
    const wasInert = page?.inert ?? false;
    if (page) {
      page.inert = true;
    }
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (page) {
        page.inert = wasInert;
      }
      const previous = previouslyFocusedRef.current;
      const returnTarget = previous?.isConnected ? previous : fallbackReturnTarget;
      returnTarget?.focus({ preventScroll: true });
      previouslyFocusedRef.current = null;
    };
  }, [initialFocusRef, isOpen, returnFocusRef]);

  return useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const scope = dialogRef.current;
    if (!scope) return;
    const focusable = Array.from(scope.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      scope.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !scope.contains(active) || !focusable.includes(active as HTMLElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !scope.contains(active) || !focusable.includes(active as HTMLElement))) {
      event.preventDefault();
      first.focus();
    }
  }, [dialogRef]);
}

function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fermer"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.03] hover:border-[#ffd23f] hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <svg aria-hidden="true" className="block h-4 w-4" viewBox="0 0 16 16" fill="none">
        <path d="M3.25 3.25 12.75 12.75M12.75 3.25 3.25 12.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

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

export function PassengerCard({
  passenger,
  loading,
  error,
  returnFocusRef,
  onClose,
}: {
  passenger: PassengerProfile | null;
  loading: boolean;
  error: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
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
            <p role="alert" className="text-sm font-semibold text-red-200">{error}</p>
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

export function PassengerListModal({
  isOpen,
  count,
  passengers,
  loading,
  error,
  hasMore,
  returnFocusRef,
  onLoadMore,
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
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Place {passenger.seatIndex + 1}{passenger.hasComment ? " · Message" : ""}</span>
                </span>
              </button>
            ) : (
              <div key={passenger.seatIndex} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-white/55">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-sm">👤</span>
                <span>
                  <span className="block text-sm font-bold">Anonyme</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Place {passenger.seatIndex + 1}</span>
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
          {error && <p role="alert" className="p-4 text-center text-sm font-bold text-red-200">{error}</p>}
          {!loading && hasMore && <button type="button" onClick={onLoadMore} className="mt-4 min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] text-sm font-black text-white transition hover:border-[#ffd23f]/50 hover:bg-white/10">Afficher plus de passagers</button>}
          {!loading && !error && passengers.length === 0 && <p className="p-8 text-center text-sm text-white/60">Le bus attend son premier passager.</p>}
          </>}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function TheoryAgeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const elapsed = getElapsedCalendarTime(THEORY_START_DATE, now);
  const values = [
    ["Années", elapsed.years],
    ["Mois", elapsed.months],
    ["Jours", elapsed.days],
    ["Heures", elapsed.hours],
    ["Minutes", elapsed.minutes],
    ["Secondes", elapsed.seconds],
  ] as const;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto overscroll-contain bg-[#020617]/30 p-2 backdrop-blur-[2px] sm:p-4" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="theory-age-title" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/55 bg-[#081127]/96 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-2rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd23f]">Première mention de la théorie</p>
            <h2 ref={titleRef} tabIndex={-1} id="theory-age-title" className="mt-1 text-xl font-black focus:outline-none sm:text-2xl">26 mai 2024 <span className="text-[#b9c7e8]">· Le Mont Corvo</span></h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="mb-3 text-sm font-bold text-[#d8e3ff]">La théorie tient toujours depuis :</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {values.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <div className="break-all text-lg font-black tabular-nums text-white sm:text-xl">{value.toLocaleString("fr-FR")}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#ffd23f]">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-[#ffd23f]/30 bg-[#ffd23f]/10 px-4 py-3 text-center text-sm font-black text-[#ffe88d]">
            Toujours pas débunk.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function getElapsedCalendarTime(startTimestamp: number, endTimestamp: number) {
  const start = new Date(startTimestamp);
  const end = new Date(Math.max(startTimestamp, endTimestamp));
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let cursor = new Date(startTimestamp);
  cursor.setUTCFullYear(start.getUTCFullYear() + years);
  if (cursor.getTime() > end.getTime()) {
    years -= 1;
    cursor = new Date(startTimestamp);
    cursor.setUTCFullYear(start.getUTCFullYear() + years);
  }

  let months = (end.getUTCFullYear() - cursor.getUTCFullYear()) * 12
    + end.getUTCMonth() - cursor.getUTCMonth();
  const monthCursor = new Date(cursor);
  monthCursor.setUTCMonth(cursor.getUTCMonth() + months);
  if (monthCursor.getTime() > end.getTime()) {
    months -= 1;
    monthCursor.setTime(cursor.getTime());
    monthCursor.setUTCMonth(cursor.getUTCMonth() + months);
  }

  let remainingSeconds = Math.floor((end.getTime() - monthCursor.getTime()) / 1000);
  const days = Math.floor(remainingSeconds / 86_400);
  remainingSeconds %= 86_400;
  const hours = Math.floor(remainingSeconds / 3_600);
  remainingSeconds %= 3_600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return { years, months, days, hours, minutes, seconds };
}
