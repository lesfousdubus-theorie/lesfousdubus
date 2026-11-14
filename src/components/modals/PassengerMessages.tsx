"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { fetchJson } from "@/lib/client/bus-api";
import { useModalAccessibility } from "./useModalAccessibility";

type Message = { seatIndex: number; displayName: string; comment: string };
type MessagePage = { messages: Message[]; nextFrom: number; hasMore: boolean };

export function PassengerMessages({ onClose, returnFocusRef }: { onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextFrom, setNextFrom] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const handleKeyDown = useModalAccessibility(true, onClose, dialogRef, buttonRef, returnFocusRef);

  const load = useCallback(async (from: number) => {
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
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(0), 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [load]);

  return createPortal(
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="messages-title" onKeyDown={handleKeyDown} className="messages-page fixed inset-0 z-[2147483647] overflow-y-auto overscroll-contain text-white">
      <div className="messages-page-shade fixed inset-0 -z-10" />
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-[#07142b]/90 px-4 py-4 backdrop-blur-md sm:px-8">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#ffd23f]">Le convoi</p><h1 id="messages-title" className="mt-1 text-xl font-black sm:text-2xl">Messages des passagers</h1></div>
        <button ref={buttonRef} type="button" onClick={onClose} className="min-h-11 shrink-0 cursor-pointer rounded-xl border border-[#ffd23f]/50 bg-[#10265c] px-4 text-sm font-bold text-[#ffd23f] hover:bg-[#19376f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]">← Retour au bus</button>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-12">
        <div className="messages-grid">
          {messages.map((message, index) => <blockquote key={message.seatIndex} className="message-bubble" style={{ "--drift-duration": `${7 + (index * 7 % 8)}s`, "--drift-delay": `${-(index * 3 % 12)}s`, "--drift-distance": `${10 + (index * 11 % 18)}px`, "--tilt": `${index % 2 ? 1 : -1}deg` } as CSSProperties}>
            <span aria-hidden="true" className="message-quote">“</span>
            <p className="relative whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed sm:text-base">{message.comment}</p>
            <footer className="mt-4 text-right text-sm font-bold text-[#ffd23f]">— {message.displayName}</footer>
          </blockquote>)}
        </div>
        {loading && <p role="status" className="py-8 text-center text-sm font-bold text-[#dce7ff]">Chargement des messages…</p>}
        {error && <div role="alert" className="py-8 text-center"><p>Impossible de charger les messages.</p><button onClick={() => void load(nextFrom)} className="mt-3 cursor-pointer rounded-xl bg-[#ffd23f] px-5 py-3 font-bold text-[#07142b]">Réessayer</button></div>}
        {!loading && !error && messages.length === 0 && <p className="py-12 text-center text-[#dce7ff]">Aucun message pour le moment.</p>}
        {!loading && !error && hasMore && <div className="py-10 text-center"><button onClick={() => void load(nextFrom)} className="cursor-pointer rounded-xl border border-[#ffd23f]/60 bg-[#10265c] px-6 py-3 font-bold text-[#ffd23f] hover:bg-[#19376f] focus-visible:ring-2 focus-visible:ring-[#ffd23f]">Plus de messages</button></div>}
      </div>
    </section>, document.body,
  );
}
