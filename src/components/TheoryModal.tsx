"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  CENTRAL_THESIS,
  FULL_THEORY_SECTIONS,
  THEORY_FAQ,
} from "@/lib/theory-data";
import { YOUTUBE_ID } from "./bus/constants";

interface TheoryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function TheoryModal({ isOpen: externalIsOpen, onClose }: TheoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"thesis" | "video" | "faq">("thesis");
  const contentRef = useRef<HTMLDivElement>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  }, [onClose]);

  // Écoute de l'événement global pour ouvrir le modal depuis n'importe quel composant
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: "thesis" | "video" | "faq" }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
      setInternalOpen(true);
    };

    window.addEventListener("open-theory-modal", handleOpenEvent);
    return () => window.removeEventListener("open-theory-modal", handleOpenEvent);
  }, []);

  // Fermeture sur la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Chaque onglet commence au début du dossier, même après une longue lecture.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theory-modal-title"
      className="pointer-events-auto fixed inset-0 z-[999999] flex items-center justify-center bg-[#030712]/88 p-2 backdrop-blur-lg animate-in fade-in duration-200 sm:p-5 lg:p-8"
      onClick={handleClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="relative flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/30 bg-[#0b1220]/98 text-white shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,210,63,0.05)] select-text sm:h-[min(92dvh,900px)]"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-[76px] items-center justify-between gap-4 border-b border-white/10 bg-[#070c16]/95 px-5 py-4 sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/25 bg-[#ffd23f]/10 text-xl sm:h-11 sm:w-11 sm:text-2xl" aria-hidden="true">📜</span>
            <div className="min-w-0">
              <h2 id="theory-modal-title" className="truncate text-sm font-black uppercase tracking-[0.025em] text-[#ffd23f] sm:text-xl sm:tracking-[0.04em] lg:text-2xl">
                La Théorie des Fous du Bus
              </h2>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55 sm:text-xs">
                Le Siècle Oublié est le Présent
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer le modal"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white/75 transition hover:border-[#ffd23f]/35 hover:bg-[#ffd23f]/10 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div role="tablist" aria-label="Sections de la théorie" className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#080e19] px-3 py-2.5 no-scrollbar sm:px-7 lg:px-9">
          <TabButton
            active={activeTab === "thesis"}
            onClick={() => setActiveTab("thesis")}
            icon="⚡"
            label="La Théorie"
            shortLabel="Théorie"
          />
          <TabButton
            active={activeTab === "video"}
            onClick={() => setActiveTab("video")}
            icon="📺"
            label="Vidéo du Mont Corvo"
            shortLabel="Vidéo"
          />
          <TabButton
            active={activeTab === "faq"}
            onClick={() => setActiveTab("faq")}
            icon="❓"
            label="FAQ & Origine"
            shortLabel="FAQ"
          />
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top_left,rgba(255,210,63,0.045),transparent_32rem)] px-4 py-6 text-sm leading-relaxed sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          {/* 1. ONGLET THÈSE */}
          {activeTab === "thesis" && (
            <div className="mx-auto max-w-[1040px] space-y-10">
              <aside className="flex flex-col gap-4 rounded-2xl border border-[#38bdf8]/45 bg-[#0d2638] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-[#7dd3fc]">
                    Le concept du site
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#e8f5ff] sm:text-[15px]">
                    Ce site est un projet créé pour le fun autour de la théorie du Mont Corvo.
                    Ici, on ne se contente pas de dire qu&apos;on y croit : on monte réellement dans
                    le bus. Chaque nouveau passager rejoint le compteur et agrandit le convoi.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#7dd3fc]/60 bg-[#07131f] px-4 py-2 text-xs font-black uppercase text-[#a5e4ff]">
                  🚌 Tous à bord
                </span>
              </aside>

              {/* Une seule introduction avant le détail des 22 points. */}
              <section className="space-y-4 rounded-2xl border border-[#ffd23f]/45 border-l-4 border-l-[#ffd23f] bg-[#171a19] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)] sm:p-7 lg:p-8">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffd23f] text-xl text-[#101621]" aria-hidden="true">⚡</span>
                  <span className="rounded-full bg-[#ffd23f] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#0d2190] sm:text-xs">
                    L&apos;idée centrale
                  </span>
                </div>
                <h3 className="max-w-4xl text-xl font-black leading-tight text-white sm:text-2xl lg:text-[28px]">
                  {CENTRAL_THESIS.title}
                </h3>
                <p className="max-w-4xl text-sm font-semibold leading-relaxed text-[#ffd23f] sm:text-[15px]">
                  {CENTRAL_THESIS.subtitle}
                </p>
                <p className="max-w-4xl text-sm leading-7 text-[#f1f4f8] sm:text-[15px]">
                  {CENTRAL_THESIS.overview}
                </p>
              </section>

              {/* Citations clés du manga */}
              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {CENTRAL_THESIS.quotes.map((q, idx) => (
                    <blockquote
                      key={idx}
                      className="flex min-h-[164px] flex-col justify-between rounded-xl border border-white/20 bg-[#070c16] p-5"
                    >
                      <p className="text-sm italic leading-relaxed text-[#eef1f5]">« {q.text} »</p>
                      <footer className="mt-4 border-t border-white/20 pt-3 text-xs font-bold text-[#ffd23f]">
                        {q.author} <span className="font-normal text-white/75">· {q.chapter}</span>
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </div>

              <section>
                <div className="hidden items-start gap-3 sm:grid sm:grid-cols-2">
                  {[0, 1].map((column) => (
                    <div key={column} className="flex flex-col gap-3">
                      {FULL_THEORY_SECTIONS.map((section, idx) => {
                        if (idx % 2 !== column) return null;
                        return (
                          <details
                            key={section.title}
                            className="group rounded-xl border border-white/20 bg-[#101827] p-4 transition hover:border-white/35 hover:bg-[#142033] open:border-[#ffd23f]/60 open:bg-[#1c1d19] sm:p-5"
                          >
                            <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1220]">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-[#050912] text-lg shadow-inner shadow-white/5">
                                {section.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[11px] font-black uppercase tracking-wider text-[#9ba9bc]">
                                  Étape {idx + 1}
                                </span>
                                <span className="mt-0.5 block text-sm font-bold leading-snug text-white group-open:text-[#ffd23f]">
                                  {section.title}
                                </span>
                              </span>
                              <span className="mt-2 text-sm text-[#ffd23f] transition-transform group-open:rotate-180" aria-hidden="true">
                                ▼
                              </span>
                            </summary>
                            <p className="mt-4 border-t border-white/20 pt-4 text-sm leading-7 text-[#e4e9f0]">
                              {section.summary}
                            </p>
                          </details>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:hidden">
                    {FULL_THEORY_SECTIONS.map((section, idx) => {
                      return (
                        <details
                          key={section.title}
                          className="group rounded-xl border border-white/20 bg-[#101827] p-4 transition hover:border-white/35 hover:bg-[#142033] open:border-[#ffd23f]/60 open:bg-[#1c1d19]"
                        >
                          <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-[#050912] text-lg">{section.icon}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[11px] font-black uppercase tracking-wider text-[#9ba9bc]">Étape {idx + 1}</span>
                              <span className="mt-0.5 block text-sm font-bold leading-snug text-white group-open:text-[#ffd23f]">{section.title}</span>
                            </span>
                            <span className="mt-2 text-sm text-[#ffd23f] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
                          </summary>
                          <p className="mt-4 border-t border-white/20 pt-4 text-sm leading-7 text-[#e4e9f0]">{section.summary}</p>
                        </details>
                      );
                    })}
                </div>
              </section>
            </div>
          )}

          {/* 2. ONGLET VIDÉO DU MONT CORVO */}
          {activeTab === "video" && (
            <div className="mx-auto max-w-[1040px]">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-5 sm:p-7 lg:p-8">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded-md bg-[#ffd23f] px-2.5 py-0.5 text-xs font-black uppercase text-[#0d2190]">
                    Le Mont Corvo
                  </span>
                  <span className="text-xs font-semibold text-white/85">
                    Vidéo fondatrice de la théorie
                  </span>
                </div>
                {/* Iframe vidéo YouTube */}
                <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-white/20 bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?rel=0&modestbranding=1`}
                    title="La Théorie des Fous du Bus — Vidéo Officielle Le Mont Corvo"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <span className="text-xs text-white/80">
                    Vidéo officielle du Mont Corvo · Disponible également sur la TV dans le bus
                  </span>
                  <a
                    href={`https://www.youtube.com/watch?v=${YOUTUBE_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#cc0000] px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
                  >
                    <span>Regarder sur YouTube</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 3. ONGLET FAQ & ORIGINE */}
          {activeTab === "faq" && (
            <div className="mx-auto max-w-[920px] space-y-3">
              {THEORY_FAQ.map((faq, idx) => (
                <details
                  key={idx}
                  className="group rounded-xl border border-white/20 bg-[#101827] p-4 transition hover:border-white/35 open:border-[#ffd23f]/60 open:bg-[#171a19] sm:p-5"
                >
                  <summary className="flex min-h-6 items-center justify-between text-sm font-bold text-white cursor-pointer list-none select-none sm:text-base">
                    <span className="text-[#ffd23f] mr-2">Q :</span>
                    <span className="flex-1 text-white group-open:text-[#ffd23f] transition">
                      {faq.question}
                    </span>
                    <span className="ml-2 text-xs text-[#ffd23f] transition group-open:rotate-180" aria-hidden="true">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-4 border-t border-white/20 pt-4 text-sm leading-7 text-[#e4e9f0]">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Pied de page du modal */}
        <div className="flex min-h-14 items-center justify-end border-t border-white/15 bg-[#070c16]/95 px-5 py-2.5 sm:px-7 lg:px-9">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-9 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-1.5 font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  shortLabel,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  shortLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-label={label}
      className={`flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-[0.98] sm:min-h-11 sm:flex-none sm:px-4 sm:text-sm ${
        active
          ? "border-[#ffd23f] bg-[#ffd23f] text-[#0c1322] shadow-md shadow-[#ffd23f]/15"
          : "border-white/15 bg-white/[0.035] text-white/80 hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
      }`}
    >
      {icon === "⚡" ? (
        <svg className="h-4 w-4 shrink-0 text-current" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.2 2 4.8 13.1h6.1L9.8 22l9.4-12.3h-6.4L13.2 2Z" />
        </svg>
      ) : (
        <span className="text-sm sm:text-base" aria-hidden="true">{icon}</span>
      )}
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
