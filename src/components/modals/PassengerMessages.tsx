"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { fetchJson } from "@/lib/client/bus-api";
import { pickLocale, useLocale } from "@/lib/i18n";
import { ArrowLeftIcon, ListOrderedIcon, PauseIcon, PlayIcon, ShuffleIcon } from "@/components/ui/BusIcons";
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

const PAGE_LIMIT = 100;
const MAX_FLOATING_BUBBLES = 100;
const GRID_BATCH_SIZE = 80;

function pickRandomMessages(pool: Message[], count: number, excludeSeats?: Set<number>): Message[] {
  if (pool.length <= count) return [...pool];
  const candidates = excludeSeats ? pool.filter((m) => !excludeSeats.has(m.seatIndex)) : pool;
  const source = candidates.length >= count ? candidates : pool;
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

type FloatingSlot = { current: Message; previous: Message | null; version: number };

const FloatingMessageBubble = memo(function FloatingMessageBubble({
  slot,
  index,
  onRead,
}: {
  slot: FloatingSlot;
  index: number;
  onRead: (message: Message, button: HTMLButtonElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onRead(slot.current, event.currentTarget)}
      className="message-bubble"
      style={{ zIndex: index + 1 }}
    >
      <span className="message-bubble-stage">
        {slot.previous && (
          <span key={`out-${slot.version}`} aria-hidden="true" className="message-bubble-inner message-bubble-outgoing">
            <span className="message-bubble-preview">{slot.previous.comment}</span>
            <span className="message-bubble-author">— {slot.previous.displayName}</span>
          </span>
        )}
        <span key={`in-${slot.version}`} className={`message-bubble-inner${slot.version > 0 ? " message-bubble-incoming" : ""}`}>
          <span className="message-bubble-preview">{slot.current.comment}</span>
          <span className="message-bubble-author">— {slot.current.displayName}</span>
        </span>
      </span>
    </button>
  );
});

export function PassengerMessages({ onClose, returnFocusRef }: { onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  const locale = useLocale();
  const dialogRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const closeMessageRef = useRef<HTMLButtonElement>(null);
  const activeBubble = useRef<HTMLButtonElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [floatingSlots, setFloatingSlots] = useState<FloatingSlot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pauseOverride, setPauseOverride] = useState<boolean>();
  const [ordered, setOrdered] = useState(false);
  const [gridLimit, setGridLimit] = useState(GRID_BATCH_SIZE);
  const [reading, setReading] = useState<Message | null>(null);
  const request = useRef<AbortController | null>(null);
  const randomPoolRef = useRef<Message[]>([]);
  const randomCursorRef = useRef(0);
  const randomSlotRef = useRef(-1);
  const swapCountRef = useRef(0);
  const scheduleRef = useRef<Array<{ nextAt: number; swapAt: number }>>([]);
  const nextFrom = useRef(0);
  const loadingPageRef = useRef(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, serverMotionPreference);
  const paused = pauseOverride ?? reducedMotion;
  const handleKeyDown = useModalAccessibility(true, onClose, dialogRef, buttonRef, returnFocusRef);

  const fetchRandomBatch = useCallback(async (signal?: AbortSignal) => {
    try {
      if (randomSlotRef.current < 0) randomSlotRef.current = Math.floor(Math.random() * 8);
      const slot = randomSlotRef.current;
      randomSlotRef.current = (slot + 1) % 8;
      const page = await fetchJson<MessagePage>(`/api/bus-entries?messages=1&random=1&limit=${MAX_FLOATING_BUBBLES}&slot=${slot}`, { signal });
      if (signal?.aborted) return;
      if (page.messages.length > 0) {
        const merged = new Map<number, Message>();
        for (const msg of page.messages) merged.set(msg.seatIndex, msg);
        for (const msg of randomPoolRef.current) {
          if (merged.size >= 400) break;
          if (!merged.has(msg.seatIndex)) merged.set(msg.seatIndex, msg);
        }
        randomPoolRef.current = [...merged.values()];
        randomCursorRef.current = 0;
      }
    } catch {
      /* Ignorer les erreurs réseau ponctuelles en arrière-plan pour la rotation aléatoire. */
    }
  }, []);

  const loadNextPage = useCallback(async () => {
    if (loadingPageRef.current) return;
    loadingPageRef.current = true;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const from = nextFrom.current;
      const page = await fetchJson<MessagePage>(`/api/bus-entries?messages=1&from=${from}&limit=${PAGE_LIMIT}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (page.hasMore && page.nextFrom <= from) throw new Error("Invalid message cursor");
      nextFrom.current = page.nextFrom;
      setHasMore(page.hasMore);
      setMessages((current) => [...current, ...page.messages]);
      setFloatingSlots((current) => {
        if (current.length > 0) return current;
        const now = performance.now();
        const initial = page.messages.slice(0, MAX_FLOATING_BUBBLES);
        scheduleRef.current = initial.map(() => ({
          nextAt: now + 2500 + Math.random() * 8000,
          swapAt: 0,
        }));
        return initial.map((message) => ({ current: message, previous: null, version: 0 }));
      });
      if (page.hasMore) {
        void fetchRandomBatch(controller.signal);
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      loadingPageRef.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [fetchRandomBatch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadNextPage(), 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [loadNextPage]);

  const floatingCount = floatingSlots.length;
  const gridMessages = messages.slice(0, gridLimit);
  const messageCount = messages.length;
  const moving = !ordered && !paused && !reading && floatingCount > 0;
  useLayoutEffect(() => {
    const wall = wallRef.current;
    if (!wall || ordered || floatingCount === 0) return;
    return startMessageMotion(wall, moving);
  }, [moving, ordered, floatingCount]);

  // Rotation aléatoire indépendante par bulle (entre 3 et 10 secondes chacune) :
  // fondu enchaîné simultané (l'ancien message disparaît pendant que le nouveau apparaît par-dessus).
  useEffect(() => {
    if (!moving || (!hasMore && messages.length <= MAX_FLOATING_BUBBLES)) return;
    const pickReplacement = (usedSeats: Set<number>, fallback: Message): Message => {
      const pool = randomPoolRef.current.length > 0 ? randomPoolRef.current : messages;
      for (let attempt = 0; attempt < pool.length; attempt++) {
        const idx = randomCursorRef.current % pool.length;
        randomCursorRef.current = (randomCursorRef.current + 1) % pool.length;
        const candidate = pool[idx];
        if (!usedSeats.has(candidate.seatIndex)) {
          usedSeats.add(candidate.seatIndex);
          return candidate;
        }
      }
      return pool[Math.floor(Math.random() * pool.length)] ?? fallback;
    };

    const interval = window.setInterval(() => {
      const now = performance.now();
      const schedules = scheduleRef.current;
      let anyChange = false;
      for (let i = 0; i < schedules.length; i++) {
        const s = schedules[i];
        if (now >= s.nextAt || (s.swapAt > 0 && now >= s.swapAt)) {
          anyChange = true;
          break;
        }
      }
      if (!anyChange) return;

      let swappedNow = false;
      setFloatingSlots((current) => {
        const usedSeats = new Set(current.map((slot) => slot.current?.seatIndex).filter((v): v is number => v !== undefined));
        let changed = false;
        const next = current.map((slot, i) => {
          const s = schedules[i] ?? (schedules[i] = { nextAt: now + 3000 + Math.random() * 7000, swapAt: 0 });
          if (now >= s.nextAt) {
            s.nextAt = now + 3000 + Math.random() * 7000;
            s.swapAt = now + 450;
            changed = true;
            swappedNow = true;
            return {
              current: pickReplacement(usedSeats, slot.current),
              previous: slot.current,
              version: slot.version + 1,
            };
          }
          if (s.swapAt > 0 && now >= s.swapAt && slot.previous !== null) {
            s.swapAt = 0;
            changed = true;
            return { ...slot, previous: null };
          }
          return slot;
        });
        return changed ? next : current;
      });

      if (swappedNow) {
        swapCountRef.current += 1;
        if (hasMore && swapCountRef.current % 120 === 0) {
          void fetchRandomBatch();
        }
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchRandomBatch, hasMore, messages, moving]);

  const swapTimerRef = useRef(0);
  useEffect(() => () => window.clearTimeout(swapTimerRef.current), []);
  const handleCycleScattered = useCallback(() => {
    window.clearTimeout(swapTimerRef.current);
    const now = performance.now();
    setFloatingSlots((current) => {
      const currentSeats = new Set(current.map((s) => s.current.seatIndex));
      const pool = randomPoolRef.current.length >= MAX_FLOATING_BUBBLES ? randomPoolRef.current : messages;
      const picked = pickRandomMessages(pool, Math.min(MAX_FLOATING_BUBBLES, pool.length), currentSeats);
      scheduleRef.current = picked.map(() => ({ nextAt: now + 3000 + Math.random() * 7000, swapAt: 0 }));
      return picked.map((message, idx) => ({
        current: message,
        previous: current[idx]?.current ?? null,
        version: (current[idx]?.version ?? 0) + 1,
      }));
    });
    if (hasMore) void fetchRandomBatch();
    swapTimerRef.current = window.setTimeout(() => {
      setFloatingSlots((current) => current.map((slot) => (slot.previous ? { ...slot, previous: null } : slot)));
    }, 450);
  }, [fetchRandomBatch, hasMore, messages]);

  const handleGridScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 420) return;
    if (gridLimit < messages.length) {
      setGridLimit((current) => Math.min(messages.length, current + GRID_BATCH_SIZE));
    } else if (hasMore && !loadingPageRef.current) {
      setGridLimit((current) => current + GRID_BATCH_SIZE);
      void loadNextPage();
    }
  }, [gridLimit, hasMore, loadNextPage, messages.length]);

  const readMessage = useCallback((message: Message, button: HTMLButtonElement) => {
    activeBubble.current = button;
    setReading(message);
    window.requestAnimationFrame(() => closeMessageRef.current?.focus());
  }, []);

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
      <header className="messages-wall-header flex min-w-0 items-center justify-between gap-2 px-3 py-1.5 sm:gap-3 sm:px-5 sm:py-2">
        <h1 id="messages-title" className="min-w-0 truncate text-base font-black leading-tight sm:text-lg">{pickLocale(locale, "Messages des passagers", "Passenger messages")}</h1>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {messageCount > 0 && loading && <p role="status" className="hidden text-xs text-white/75 sm:block">{pickLocale(locale, "Chargement…", "Loading…")}</p>}
          {messageCount > 0 && error && !reading && (
            <button type="button" onClick={() => void loadNextPage()} className="messages-wall-control px-2.5 text-xs">
              {pickLocale(locale, "Réessayer", "Try again")}
            </button>
          )}
          {!ordered && (messageCount > MAX_FLOATING_BUBBLES || hasMore) && (
            <button
              type="button"
              onClick={handleCycleScattered}
              disabled={loading && floatingCount === 0}
              aria-label={pickLocale(locale, "Afficher d'autres messages", "Show other messages")}
              title={pickLocale(locale, "Afficher d'autres messages", "Show other messages")}
              className="messages-wall-control shrink-0"
            >
              <ShuffleIcon className="h-3.5 w-3.5 text-[#dcd3ff]" />
              <span>{pickLocale(locale, "Autres", "More")}</span>
            </button>
          )}
          <button
            type="button"
            aria-pressed={ordered}
            aria-label={ordered ? pickLocale(locale, "Remettre les messages en mouvement", "Resume floating messages") : pickLocale(locale, "Ordonner les messages", "Sort messages")}
            title={ordered ? pickLocale(locale, "En vrac", "Scattered") : pickLocale(locale, "Ordonner les messages", "Sort messages")}
            disabled={messageCount === 0}
            onClick={() => setOrdered((previous) => !previous)}
            className="messages-wall-control shrink-0"
          >
            {ordered ? <ShuffleIcon className="h-3.5 w-3.5 text-[#dcd3ff]" /> : <ListOrderedIcon className="h-3.5 w-3.5 text-[#dcd3ff]" />}
            <span>{ordered ? pickLocale(locale, "En vrac", "Scattered") : pickLocale(locale, "Ordonner", "Grid view")}</span>
          </button>
          {!ordered && (
            <button
              type="button"
              aria-pressed={paused}
              aria-label={paused ? pickLocale(locale, "Reprendre le défilement", "Resume scrolling") : pickLocale(locale, "Mettre en pause le défilement", "Pause scrolling")}
              title={paused ? pickLocale(locale, "Reprendre", "Resume") : pickLocale(locale, "Mettre en pause", "Pause")}
              disabled={messageCount === 0 || Boolean(reading)}
              onClick={() => setPauseOverride(!paused)}
              className="messages-wall-control shrink-0"
            >
              {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            </button>
          )}
          <button
            ref={buttonRef}
            type="button"
            onClick={onClose}
            aria-label={pickLocale(locale, "Retour au bus", "Back to bus")}
            title={pickLocale(locale, "Retour au bus", "Back to bus")}
            className="messages-wall-control shrink-0"
          >
            <ArrowLeftIcon className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </header>

      <div className="messages-wall-stage relative min-h-0 overflow-hidden">
        {ordered ? (
          <div
            onScroll={handleGridScroll}
            className="bus-scrollbar h-full overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
            aria-hidden={reading ? true : undefined}
            inert={reading ? true : undefined}
          >
            <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gridMessages.map((message) => (
                <button
                  type="button"
                  key={message.seatIndex}
                  onClick={(event) => readMessage(message, event.currentTarget)}
                  className="flex cursor-pointer flex-col justify-between gap-2 rounded-2xl border border-[#947eef]/38 bg-[#0e1438]/95 p-3.5 text-left text-white transition-colors hover:border-[#cfc4fc] focus-visible:outline-none"
                >
                  <span className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-white">
                    {message.comment}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs font-bold text-[#dcd3ff]">
                    <span className="text-[#c7d2fe]">{pickLocale(locale, `Place n°${message.seatIndex + 1}`, `Seat #${message.seatIndex + 1}`)}</span>
                    <span className="truncate">— {message.displayName}</span>
                  </span>
                </button>
              ))}
            </div>
            {(hasMore || gridLimit < messages.length) && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (gridLimit < messages.length) {
                      setGridLimit((current) => Math.min(messages.length, current + GRID_BATCH_SIZE));
                    } else {
                      setGridLimit((current) => current + GRID_BATCH_SIZE);
                      void loadNextPage();
                    }
                  }}
                  className="messages-wall-control"
                >
                  {loading ? pickLocale(locale, "Chargement…", "Loading…") : pickLocale(locale, "Charger plus de messages", "Load more messages")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div ref={wallRef} className="messages-wall-track" data-moving={moving} data-count={floatingCount}
            data-dense={floatingCount > 40} aria-hidden={reading ? true : undefined} inert={reading ? true : undefined}>
            {floatingSlots.map((slot, index) => (
              <FloatingMessageBubble key={index} slot={slot} index={index} onRead={readMessage} />
            ))}
          </div>
        )}

        {reading && (
          <div className="messages-wall-reading absolute inset-0 z-30 grid min-h-0 place-items-center p-3 sm:p-6">
            <div className="messages-reader min-h-0 w-full max-w-[35rem] text-left">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="break-words text-sm font-bold text-[#c4b5fd]">{reading.displayName}</p>
                <button ref={closeMessageRef} type="button" onClick={closeMessage} className="messages-wall-control shrink-0">{pickLocale(locale, "Fermer", "Close")}</button>
              </div>
              <blockquote tabIndex={0} className="messages-reader-copy bus-scrollbar mt-2 min-h-0 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed sm:text-lg">{reading.comment}</blockquote>
            </div>
          </div>
        )}
        {messageCount === 0 && !reading && (
          <div className="messages-wall-state z-20 text-center">
            {loading && <p role="status">{pickLocale(locale, "Chargement des messages…", "Loading messages…")}</p>}
            {error && <div role="alert"><p>{pickLocale(locale, "Impossible de charger les messages.", "Unable to load messages.")}</p>
              <button type="button" onClick={() => void loadNextPage()} className="messages-wall-control mt-2">{pickLocale(locale, "Réessayer", "Try again")}</button>
            </div>}
            {!loading && !error && <p>{pickLocale(locale, "Aucun message pour le moment.", "No messages yet.")}</p>}
          </div>
        )}
      </div>
    </section>, document.body,
  );
}
