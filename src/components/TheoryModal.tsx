"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  CENTRAL_THESIS,
  CORE_PILLARS,
  SIMPLE_EXPLANATION,
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
                Le Siècle Oublié est le Présent <span className="hidden sm:inline">· Dossier Officiel</span>
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
              {/* Résumé express en 30 secondes */}
              <section className="space-y-5 rounded-2xl border border-[#ffd23f]/20 border-l-4 border-l-[#ffd23f] bg-[#ffd23f]/[0.065] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.16)] sm:p-7 lg:p-8">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl" aria-hidden="true">⚡</span>
                  <span className="rounded-full bg-[#ffd23f] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#0d2190] sm:text-xs">
                    L&apos;Essentiel en 30 secondes
                  </span>
                </div>
                <h3 className="max-w-4xl text-xl font-black leading-tight text-white sm:text-2xl lg:text-[28px]">
                  {SIMPLE_EXPLANATION.headline}
                </h3>
                <p className="max-w-4xl text-sm font-semibold leading-relaxed text-[#ffd23f] sm:text-[15px]">
                  {SIMPLE_EXPLANATION.intro}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {SIMPLE_EXPLANATION.points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex min-h-[126px] items-start gap-3.5 rounded-xl border border-white/[0.08] bg-black/20 p-4 transition-colors hover:border-[#ffd23f]/20 hover:bg-black/30 sm:p-5"
                    >
                      <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-white/[0.06] text-xl">{pt.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-[#ffd23f] sm:text-[15px]">{pt.title}</div>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/75">{pt.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ce que le monde croit vs La Vérité temporelle */}
              <div>
                <h4 className="mb-4 flex items-center gap-2.5 text-sm font-black uppercase tracking-[0.08em] text-[#ffd23f] sm:text-[15px]">
                  <span>⚖️</span>
                  <span>Ce que dit le Gouvernement vs La Réalité temporelle</span>
                </h4>
                <div className="grid gap-3">
                  {SIMPLE_EXPLANATION.comparison.map((item, idx) => (
                    <div key={idx} className="grid overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] sm:grid-cols-2">
                      <div className="flex items-start gap-2.5 p-4 text-sm text-red-400 sm:p-5">
                        <span className="shrink-0 font-black">✕ Illusion</span>
                        <span className="text-white/70">{item.myth}</span>
                      </div>
                      <div className="flex items-start gap-2.5 border-t border-white/[0.08] bg-[#ffd23f]/[0.035] p-4 text-sm text-[#ffd23f] sm:border-l sm:border-t-0 sm:p-5">
                        <span className="shrink-0 font-black">✓ Vérité</span>
                        <span className="text-white font-medium">{item.reality}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thèse centrale détaillée */}
              <section className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5 sm:p-7">
                <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white/70">
                  Dossier Théorique
                </span>
                <h3 className="mt-4 text-xl font-black leading-tight text-white sm:text-2xl">
                  {CENTRAL_THESIS.title}
                </h3>
                <p className="mt-2 text-sm font-bold text-[#ffd23f] sm:text-[15px]">
                  {CENTRAL_THESIS.subtitle}
                </p>
                <p className="mt-4 max-w-4xl text-sm leading-7 text-white/75 sm:text-[15px]">
                  {CENTRAL_THESIS.overview}
                </p>
              </section>

              {/* Citations clés du manga */}
              <div>
                <h4 className="mb-4 text-sm font-black uppercase tracking-[0.08em] text-white/60">
                  Citations canoniques fondatrices
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {CENTRAL_THESIS.quotes.map((q, idx) => (
                    <blockquote
                      key={idx}
                      className="flex min-h-[164px] flex-col justify-between rounded-xl border border-white/[0.08] bg-black/20 p-5"
                    >
                      <p className="text-sm italic leading-relaxed text-white/75">« {q.text} »</p>
                      <footer className="mt-4 border-t border-white/10 pt-3 text-xs font-bold text-[#ffd23f]">
                        {q.author} <span className="text-white/50 font-normal">· {q.chapter}</span>
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </div>

              {/* Les 6 Piliers */}
              <div>
                <h4 className="mb-4 text-sm font-black uppercase tracking-[0.08em] text-white/60">
                  Les 6 Piliers Fondamentaux
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CORE_PILLARS.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-[#ffd23f]/20 hover:bg-white/[0.045] sm:p-5"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{p.icon}</span>
                        <h5 className="font-bold text-sm sm:text-base text-white">{p.title}</h5>
                      </div>
                      <div className="mb-2 text-xs font-semibold text-[#ffd23f]">{p.subtitle}</div>
                      <p className="text-sm leading-relaxed text-white/70">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
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
                  <span className="text-xs font-semibold text-white/70">
                    Vidéo fondatrice de la théorie
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#ffd23f]">
                  Démonstration Vidéo : Le Siècle Oublié est le Présent par Le Mont Corvo
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-white/80">
                  Découvrez la vidéo complète et passionnante du Mont Corvo qui a lancé la grande théorie des Fous du Bus. Une démonstration magistrale reliant les mystères de Joy Boy, Laugh Tale, les Ponéglyphes et le destin de Luffy.
                </p>

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
                  <span className="text-xs text-white/60">
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
              <p className="mb-5 text-sm leading-relaxed text-white/65 sm:text-[15px]">
                Origine du site, raison d&apos;être du convoi animé et réponses aux questions fondamentales sur la théorie des Fous du Bus.
              </p>
              {THEORY_FAQ.map((faq, idx) => (
                <details
                  key={idx}
                  className="group rounded-xl border border-white/10 bg-white/[0.035] p-4 transition open:border-[#ffd23f]/40 open:bg-black/30 sm:p-5"
                >
                  <summary className="flex min-h-6 items-center justify-between text-sm font-bold text-white cursor-pointer list-none select-none sm:text-base">
                    <span className="text-[#ffd23f] mr-2">Q :</span>
                    <span className="flex-1 text-white group-open:text-[#ffd23f] transition">
                      {faq.question}
                    </span>
                    <span className="text-white/50 text-xs transition group-open:rotate-180 ml-2">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-white/75">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Pied de page du modal */}
        <div className="flex min-h-14 items-center justify-between gap-3 border-t border-white/10 bg-[#070c16]/95 px-5 py-2.5 text-[11px] text-white/50 sm:px-7 sm:text-xs lg:px-9">
          <div>
            Site officiel : <span className="text-[#ffd23f] font-bold">lesfousdubus.sbs</span>
          </div>
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
          : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className="text-sm sm:text-base" aria-hidden="true">{icon}</span>
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
