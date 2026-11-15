"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { fetchJson } from "@/lib/client/bus-api";
import { startMessageMotion } from "./passenger-message-motion";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pauseOverride, setPauseOverride] = useState<boolean>();
  const [reading, setReading] = useState<Message | null>(null);
  const request = useRef<AbortController | null>(null);
  const nextFrom = useRef(0);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, serverMotionPreference);
  const paused = pauseOverride ?? reducedMotion;
  const handleKeyDown = useModalAccessibility(true, onClose, dialogRef, buttonRef, returnFocusRef);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      while (!controller.signal.aborted) {
        const from = nextFrom.current;
        const page = await fetchJson<MessagePage>(`/api/bus-entries?messages=1&from=${from}&limit=60`, { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (page.hasMore && page.nextFrom <= from) throw new Error("Invalid message cursor");
        nextFrom.current = page.nextFrom;
        setMessages(current => [...current, ...page.messages]);
        if (!page.hasMore) break;
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [load]);

  const messageCount = messages.length;
  const moving = !paused && !reading && messageCount > 0;
  useLayoutEffect(() => {
    const wall = wallRef.current;
    if (!wall || messageCount === 0) return;
    return startMessageMotion(wall, moving);
  }, [moving, messageCount]);

  function readMessage(message: Message, button: HTMLButtonElement) {
    activeBubble.current = button;
    setReading(message);
    window.requestAnimationFrame(() => closeMessageRef.current?.focus());
  }

  function closeMessage() {
    setReading(null);
    window.requestAnimationFrame(() => activeBubble.current?.focus());
  }

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
        <div ref={wallRef} className="messages-wall-track" data-moving={moving} data-count={messageCount}
          data-dense={messageCount > 40} aria-hidden={reading ? true : undefined} inert={reading ? true : undefined}>
          {messages.map((message, index) => (
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
        {messageCount === 0 && !reading && (
          <div className="messages-wall-state z-20 text-center">
            {loading && <p role="status">Chargement des messages…</p>}
            {error && <div role="alert"><p>Impossible de charger les messages.</p>
              <button type="button" onClick={() => void load()} className="messages-wall-control mt-2">Réessayer</button>
            </div>}
            {!loading && !error && <p>Aucun message pour le moment.</p>}
          </div>
        )}
      </div>

      <footer className="messages-wall-footer flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 sm:px-7">
        <button type="button" aria-pressed={paused} disabled={messageCount === 0 || Boolean(reading)}
          onClick={() => setPauseOverride(!paused)} className="messages-wall-control">
          {paused ? "Reprendre" : "Mettre en pause"}
        </button>
        {messageCount > 0 && loading && <p role="status" className="text-xs">Chargement des autres messages…</p>}
        {messageCount > 0 && error && !reading && <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-xs">Certains messages n’ont pas été chargés.</p>
          <button type="button" onClick={() => void load()} className="messages-wall-control">Réessayer</button>
        </div>}
      </footer>
    </section>, document.body,
  );
}
