"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { fetchJson } from "@/lib/client/bus-api";
import { messageWallCapacity, startMessageMotion } from "./passenger-message-motion";
import { useModalAccessibility } from "./useModalAccessibility";

type Message = { seatIndex: number; displayName: string; comment: string };
type MessagePage = { messages: Message[]; nextFrom: number; hasMore: boolean };

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotionPreference(callback: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const prefersReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const serverMotionPreference = () => true;

export function PassengerMessages({ onClose, returnFocusRef }: { onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const closeMessageRef = useRef<HTMLButtonElement>(null);
  const activeBubble = useRef<HTMLButtonElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextFrom, setNextFrom] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pageStart, setPageStart] = useState(0);
  const [capacity, setCapacity] = useState(3);
  const [pauseOverride, setPauseOverride] = useState<boolean>();
  const [reading, setReading] = useState<Message | null>(null);
  const request = useRef<AbortController | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, serverMotionPreference);
  const paused = pauseOverride ?? reducedMotion;
  const handleKeyDown = useModalAccessibility(true, onClose, dialogRef, buttonRef, returnFocusRef);

  const load = useCallback(async (from: number, reveal?: number) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const page = await fetchJson<MessagePage>(`/api/bus-entries?messages=1&from=${from}&limit=60`, { cache: "no-store", signal: controller.signal });
      if (controller.signal.aborted) return;
      setMessages(current => from === 0 ? page.messages : [...current, ...page.messages]);
      setNextFrom(page.nextFrom);
      setHasMore(page.hasMore);
      if (reveal !== undefined && page.messages.length) setPageStart(reveal);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [setPageStart]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(0), 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [load]);

  useLayoutEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const resize = new ResizeObserver(([entry]) => {
      setCapacity(messageWallCapacity(entry.contentRect.width, entry.contentRect.height));
    });
    resize.observe(wall);
    return () => resize.disconnect();
  }, []);

  const pageEnd = Math.min(pageStart + capacity, messages.length);
  const moving = !paused && !reading && pageEnd > pageStart;
  useLayoutEffect(() => {
    const wall = wallRef.current;
    if (!wall || !moving) return;
    return startMessageMotion(wall);
  }, [moving, pageStart, pageEnd]);

  function nextPage() {
    if (pageEnd < messages.length) setPageStart(pageEnd);
    else if (hasMore && !loading) void load(nextFrom, pageEnd);
  }

  function readMessage(message: Message, button: HTMLButtonElement) {
    activeBubble.current = button;
    setReading(message);
    window.requestAnimationFrame(() => closeMessageRef.current?.focus());
  }

  function closeMessage() {
    setReading(null);
    window.requestAnimationFrame(() => activeBubble.current?.focus());
  }

  const visibleMessages = messages.slice(pageStart, pageEnd);

  return createPortal(
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="messages-title"
      onKeyDown={event => {
        if (event.key === "Escape" && reading) {
          event.preventDefault();
          event.stopPropagation();
          closeMessage();
        } else handleKeyDown(event);
      }}
      className="messages-page fixed inset-0 z-[2147483647] grid overflow-hidden text-white focus:outline-none">
      <header className="messages-wall-header flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-7 sm:py-4">
        <h1 id="messages-title" className="min-w-0 text-lg font-black leading-tight sm:text-2xl">Messages des passagers</h1>
        <button ref={buttonRef} type="button" onClick={onClose} aria-label="Retour au bus" className="messages-wall-control shrink-0">
          <span aria-hidden="true">←</span> <span className="hidden min-[390px]:inline">Retour au </span>bus
        </button>
      </header>

      <div className="messages-wall-stage relative min-h-0 overflow-hidden">
        <div ref={wallRef} className="messages-wall-track" data-moving={moving} aria-hidden={reading ? true : undefined} inert={reading ? true : undefined}>
          {visibleMessages.map((message, index) => (
            <button type="button" key={message.seatIndex} onClick={event => readMessage(message, event.currentTarget)}
              className="message-bubble" style={{ zIndex: index + 1 }}>
              <span className="message-bubble-preview">{message.comment}</span>
              <span className="message-bubble-author">— {message.displayName}</span>
            </button>
          ))}
        </div>

        {reading && (
          <div className="messages-wall-reading absolute inset-0 z-30 grid min-h-0 place-items-center p-3 sm:p-6">
            <div className="messages-reader min-h-0 w-full max-w-[35rem] text-left">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="break-words text-sm font-bold text-[#ffd23f]">{reading.displayName}</p>
                <button ref={closeMessageRef} type="button" onClick={closeMessage} className="messages-wall-control shrink-0">Fermer</button>
              </div>
              <blockquote tabIndex={0} className="messages-reader-copy mt-2 min-h-0 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed sm:text-lg">{reading.comment}</blockquote>
            </div>
          </div>
        )}
        {(loading || error || messages.length === 0) && !reading && (
          <div className="messages-wall-state z-20 text-center">
            {loading && <p role="status">Chargement des messages…</p>}
            {error && <div role="alert"><p>Impossible de charger les messages.</p>
              <button type="button" onClick={() => void load(nextFrom, messages.length || undefined)} className="messages-wall-control mt-2">Réessayer</button>
            </div>}
            {!loading && !error && <p>Aucun message pour le moment.</p>}
          </div>
        )}
      </div>

      <footer className="messages-wall-footer flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 sm:px-7">
        <button type="button" aria-pressed={paused} disabled={messages.length === 0 || Boolean(reading)}
          onClick={() => setPauseOverride(!paused)} className="messages-wall-control">
          {paused ? "Reprendre" : "Mettre en pause"}
        </button>
        <div role="group" aria-label="Parcourir les messages" className="flex items-center gap-1.5">
          <button type="button" aria-label="Messages précédents" disabled={pageStart === 0 || Boolean(reading)}
            onClick={() => setPageStart(current => Math.max(0, current - capacity))} className="messages-wall-control messages-wall-arrow">←</button>
          <span className="text-xs tabular-nums text-[#dce7ff] sm:text-sm" role="status">{pageEnd > pageStart ? `${pageStart + 1}–${pageEnd}` : "—"}</span>
          <button type="button" aria-label="Messages suivants" disabled={Boolean(reading) || !(pageEnd < messages.length || (hasMore && !loading && !error))}
            onClick={nextPage} className="messages-wall-control messages-wall-arrow">→</button>
        </div>
      </footer>
    </section>, document.body,
  );
}
