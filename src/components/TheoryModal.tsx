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
      className="pointer-events-auto fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-0 backdrop-blur-md animate-in fade-in duration-200 sm:p-4 lg:p-8"
      onClick={handleClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="relative flex h-dvh w-full max-w-5xl flex-col overflow-hidden bg-[#0c1322]/97 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] select-text sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-[#ffd23f]/35"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="text-xl sm:text-2xl" aria-hidden="true">📜</span>
            <div className="min-w-0">
              <h2 id="theory-modal-title" className="truncate text-base font-black uppercase tracking-wide text-[#ffd23f] sm:text-xl">
                La Théorie des Fous du Bus
              </h2>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60 sm:text-xs">
                Le Siècle Oublié est le Présent · Dossier Officiel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer le modal"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div role="tablist" aria-label="Sections de la théorie" className="flex items-stretch gap-1 overflow-x-auto border-b border-white/10 bg-black/30 px-2 py-2 no-scrollbar sm:px-6 lg:px-8">
          <TabButton
            active={activeTab === "thesis"}
            onClick={() => setActiveTab("thesis")}
            icon="⚡"
            label="La Théorie"
          />
          <TabButton
            active={activeTab === "video"}
            onClick={() => setActiveTab("video")}
            icon="📺"
            label="Vidéo du Mont Corvo"
          />
          <TabButton
            active={activeTab === "faq"}
            onClick={() => setActiveTab("faq")}
            icon="❓"
            label="FAQ & Origine"
          />
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 text-sm leading-relaxed sm:px-7 sm:py-7 sm:text-base lg:px-10 lg:py-8">
          {/* 1. ONGLET THÈSE */}
          {activeTab === "thesis" && (
            <div className="mx-auto max-w-3xl space-y-7">
              {/* Résumé express en 30 secondes */}
              <section className="space-y-4 border-l-2 border-[#ffd23f] bg-[#ffd23f]/[0.07] px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-xl">⚡</span>
                  <span className="rounded-md bg-[#ffd23f] px-2.5 py-0.5 text-xs font-black uppercase text-[#0d2190]">
                    L&apos;Essentiel en 30 secondes
                  </span>
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-white">
                  {SIMPLE_EXPLANATION.headline}
                </h3>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-[#ffd23f]">
                  {SIMPLE_EXPLANATION.intro}
                </p>

                <div className="mt-4 divide-y divide-white/10 border-y border-white/10 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  {SIMPLE_EXPLANATION.points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 px-2 py-3.5 sm:px-4"
                    >
                      <span className="text-2xl flex-shrink-0">{pt.icon}</span>
                      <div>
                        <div className="font-black text-sm text-[#ffd23f]">{pt.title}</div>
                        <p className="mt-0.5 text-xs sm:text-[13px] text-white/90 leading-snug">{pt.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ce que le monde croit vs La Vérité temporelle */}
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#ffd23f] mb-3 flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Ce que dit le Gouvernement vs La Réalité temporelle</span>
                </h4>
                <div className="divide-y divide-white/10 border-y border-white/10">
                  {SIMPLE_EXPLANATION.comparison.map((item, idx) => (
                    <div key={idx} className="grid gap-2 py-3.5 sm:grid-cols-2 sm:gap-5">
                      <div className="flex items-start gap-2 text-xs sm:text-sm text-red-400">
                        <span className="font-black">❌ Illusion :</span>
                        <span className="text-white/75">{item.myth}</span>
                      </div>
                      <div className="flex items-start gap-2 border-t border-white/10 pt-2 text-xs text-[#ffd23f] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-sm">
                        <span className="font-black">✔️ Vérité :</span>
                        <span className="text-white font-medium">{item.reality}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thèse centrale détaillée */}
              <section className="border-y border-white/10 py-5">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black uppercase text-white/80">
                  Dossier Théorique
                </span>
                <h3 className="mt-2 text-base sm:text-xl font-black text-white">
                  {CENTRAL_THESIS.title}
                </h3>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-[#ffd23f]">
                  {CENTRAL_THESIS.subtitle}
                </p>
                <p className="mt-2.5 text-xs sm:text-sm text-white/85">
                  {CENTRAL_THESIS.overview}
                </p>
              </section>

              {/* Citations clés du manga */}
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                  Citations canoniques fondatrices
                </h4>
                <div className="divide-y divide-white/10 border-y border-white/10 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {CENTRAL_THESIS.quotes.map((q, idx) => (
                    <blockquote
                      key={idx}
                      className="flex flex-col justify-between px-3 py-4 sm:px-4"
                    >
                      <p className="italic text-xs sm:text-sm text-white/80">« {q.text} »</p>
                      <footer className="mt-3 pt-2 border-t border-white/10 text-[11px] font-bold text-[#ffd23f]">
                        {q.author} <span className="text-white/50 font-normal">· {q.chapter}</span>
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </div>

              {/* Les 6 Piliers */}
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                  Les 6 Piliers Fondamentaux
                </h4>
                <div className="divide-y divide-white/10 border-y border-white/10">
                  {CORE_PILLARS.map((p, idx) => (
                    <div
                      key={idx}
                      className="py-4 transition hover:bg-white/[0.03] sm:px-2"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{p.icon}</span>
                        <h5 className="font-bold text-sm sm:text-base text-white">{p.title}</h5>
                      </div>
                      <div className="text-[11px] font-semibold text-[#ffd23f] mb-1.5">{p.subtitle}</div>
                      <p className="text-xs sm:text-sm text-white/75 leading-normal">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. ONGLET VIDÉO DU MONT CORVO */}
          {activeTab === "video" && (
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="border-y border-white/15 bg-black/25 py-4 sm:px-5 sm:py-5">
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
            <div className="mx-auto max-w-3xl space-y-3">
              <p className="text-xs sm:text-sm text-white/70 mb-2">
                Origine du site, raison d&apos;être du convoi animé et réponses aux questions fondamentales sur la théorie des Fous du Bus.
              </p>
              {THEORY_FAQ.map((faq, idx) => (
                <details
                  key={idx}
                  className="group rounded-xl border border-white/10 bg-white/5 p-3.5 sm:p-4 open:border-[#ffd23f]/50 open:bg-black/40 transition"
                >
                  <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-white cursor-pointer list-none select-none">
                    <span className="text-[#ffd23f] mr-2">Q :</span>
                    <span className="flex-1 text-white group-open:text-[#ffd23f] transition">
                      {faq.question}
                    </span>
                    <span className="text-white/50 text-xs transition group-open:rotate-180 ml-2">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-3 pt-2.5 border-t border-white/10 text-xs sm:text-sm text-white/85 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Pied de page du modal */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/40 px-4 py-2.5 text-[10px] text-white/60 sm:px-6 sm:text-xs lg:px-8">
          <div>
            Site officiel : <span className="text-[#ffd23f] font-bold">lesfousdubus.sbs</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 text-white font-semibold cursor-pointer transition active:scale-95"
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
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-label={label}
      className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-[11px] font-black transition cursor-pointer active:scale-[0.98] sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${
        active
          ? "bg-[#ffd23f] text-[#0c1322] shadow-md shadow-[#ffd23f]/20"
          : "text-white/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="text-sm sm:text-base" aria-hidden="true">{icon}</span>
      <span className="hidden min-[390px]:inline">{label}</span>
    </button>
  );
}
