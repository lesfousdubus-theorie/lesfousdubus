"use client";

import { useEffect, useState, useId, useCallback } from "react";
import {
  CENTRAL_THESIS,
  CORE_PILLARS,
  SIMPLE_EXPLANATION,
  THEORY_CHAPTERS,
  THEORY_FAQ,
  type TheoryChapter,
} from "@/lib/theory-data";
import { YOUTUBE_ID } from "./bus/constants";

interface TheoryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function TheoryModal({ isOpen: externalIsOpen, onClose }: TheoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"thesis" | "chapters" | "video" | "faq">("thesis");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<TheoryChapter | null>(null);
  const searchInputId = useId();

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
      const customEvent = e as CustomEvent<{ tab?: "thesis" | "chapters" | "video" | "faq" }>;
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

  if (!isOpen) return null;

  const filteredChapters = THEORY_CHAPTERS.filter(
    (ch) =>
      ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.keyPoints.some((kp) => kp.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theory-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90dvh] bg-[#0c1322]/95 border border-[#ffd23f]/40 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête du modal */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3.5 sm:py-4 bg-black/40">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-xl sm:text-2xl">📜</span>
            <div>
              <h2 id="theory-modal-title" className="text-base sm:text-xl font-black uppercase tracking-wide text-[#ffd23f]">
                La Théorie des Fous du Bus
              </h2>
              <p className="text-[10px] sm:text-xs text-white/70 font-semibold uppercase tracking-wider">
                Le Siècle Oublié est le Présent · Dossier Officiel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer le modal"
            className="rounded-full bg-white/10 hover:bg-white/20 active:scale-95 p-1.5 sm:p-2 text-white/80 hover:text-white transition cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barre d'onglets */}
        <div className="flex border-b border-white/10 bg-black/20 px-3 sm:px-6 overflow-x-auto no-scrollbar gap-1 sm:gap-2 py-2">
          <TabButton
            active={activeTab === "thesis"}
            onClick={() => setActiveTab("thesis")}
            icon="⚡"
            label="La Thèse"
          />
          <TabButton
            active={activeTab === "chapters"}
            onClick={() => setActiveTab("chapters")}
            icon="📚"
            label={`22 Chapitres (${THEORY_CHAPTERS.length})`}
          />
          <TabButton
            active={activeTab === "video"}
            onClick={() => setActiveTab("video")}
            icon="📺"
            label="Vidéo Officielle"
          />
          <TabButton
            active={activeTab === "faq"}
            onClick={() => setActiveTab("faq")}
            icon="❓"
            label="FAQ & Preuves"
          />
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm sm:text-base leading-relaxed">
          {/* 1. ONGLET THÈSE */}
          {activeTab === "thesis" && (
            <div className="space-y-6">
              {/* Résumé express en 30 secondes */}
              <div className="rounded-2xl border-2 border-[#ffd23f] bg-gradient-to-br from-[#ffd23f]/15 to-[#0c1322] p-4 sm:p-6 shadow-[0_0_30px_rgba(255,210,63,0.2)]">
                <div className="flex items-center gap-2 mb-2">
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SIMPLE_EXPLANATION.points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#ffd23f]/30 bg-black/50 p-3.5 flex items-start gap-3"
                    >
                      <span className="text-2xl flex-shrink-0">{pt.icon}</span>
                      <div>
                        <div className="font-black text-sm text-[#ffd23f]">{pt.title}</div>
                        <p className="mt-0.5 text-xs sm:text-[13px] text-white/90 leading-snug">{pt.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ce que le monde croit vs La Vérité temporelle */}
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#ffd23f] mb-3 flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Ce que dit le Gouvernement vs La Réalité temporelle</span>
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {SIMPLE_EXPLANATION.comparison.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-white/15 bg-black/40 p-3.5 space-y-2">
                      <div className="flex items-start gap-2 text-xs sm:text-sm text-red-400">
                        <span className="font-black">❌ Illusion :</span>
                        <span className="text-white/75">{item.myth}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs sm:text-sm text-[#ffd23f] border-t border-white/10 pt-2">
                        <span className="font-black">✔️ Vérité :</span>
                        <span className="text-white font-medium">{item.reality}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thèse centrale détaillée */}
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5">
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
              </div>

              {/* Citations clés du manga */}
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                  Citations canoniques fondatrices
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {CENTRAL_THESIS.quotes.map((q, idx) => (
                    <blockquote
                      key={idx}
                      className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4 flex flex-col justify-between"
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
                <div className="grid gap-3 sm:grid-cols-2">
                  {CORE_PILLARS.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/5 p-3.5 sm:p-4 hover:border-[#ffd23f]/40 transition"
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

          {/* 2. ONGLET LES 22 CHAPITRES */}
          {activeTab === "chapters" && (
            <div className="space-y-4">
              {/* Barre de recherche */}
              <div className="relative">
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un chapitre, un personnage, un mot-clé (ex: Joy Boy, Roger, Uranus)..."
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:border-[#ffd23f] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60 hover:text-white"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* Liste filtrée */}
              <div className="space-y-2.5">
                {filteredChapters.length === 0 ? (
                  <div className="p-8 text-center text-white/60 text-sm">
                    Aucun chapitre trouvé pour « {searchQuery} ».
                  </div>
                ) : (
                  filteredChapters.map((ch) => {
                    const isExpanded = selectedChapter?.id === ch.id;
                    return (
                      <div
                        key={ch.id}
                        className={`rounded-xl border transition ${
                          isExpanded
                            ? "border-[#ffd23f] bg-black/60 shadow-lg"
                            : "border-white/10 bg-white/5 hover:border-white/25"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedChapter(isExpanded ? null : ch)}
                          className="w-full text-left p-3 sm:p-4 flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#ffd23f]/20 text-[#ffd23f] text-xs font-black">
                              {ch.number}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm sm:text-base text-white">
                                  {ch.title}
                                </h4>
                                <span className="rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-white/10 text-white/80">
                                  {ch.badge}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-white/75 line-clamp-2">
                                {ch.summary}
                              </p>
                            </div>
                          </div>
                          <span className="text-white/40 text-sm font-bold flex-shrink-0">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-white/10 text-xs sm:text-sm space-y-3 animate-in fade-in duration-150">
                            <div>
                              <div className="font-bold text-[#ffd23f] uppercase text-[10px] tracking-wider mb-1">
                                Arguments clés
                              </div>
                              <ul className="list-disc list-inside space-y-1 text-white/90">
                                {ch.keyPoints.map((kp, i) => (
                                  <li key={i}>{kp}</li>
                                ))}
                              </ul>
                            </div>
                            {ch.mangaReferences && (
                              <div className="pt-2 border-t border-white/5 text-[11px] text-white/60">
                                <span className="font-bold text-[#ffd23f]">Références Manga : </span>
                                {ch.mangaReferences}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. ONGLET VIDÉO OFFICIELLE */}
          {activeTab === "video" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/15 bg-black/50 p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-black text-[#ffd23f]">
                  Démonstration Vidéo : Le Siècle Oublié est le Présent
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-white/80">
                  Découvrez la présentation complète et visuelle de la théorie des Fous du Bus, détaillant les 22 chapitres et les révélations du manga jusqu&apos;aux derniers scans.
                </p>

                {/* Iframe vidéo YouTube */}
                <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-white/20 bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?rel=0&modestbranding=1`}
                    title="La Théorie des Fous du Bus — Vidéo Officielle"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <span className="text-xs text-white/60">
                    Vidéo officielle de la théorie · Disponible également sur la TV 3D dans le bus
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

          {/* 4. ONGLET FAQ & PREUVES */}
          {activeTab === "faq" && (
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-white/70 mb-2">
                Les réponses claires aux questions les plus fréquentes sur la chronologie, Joy Boy et le dénouement de One Piece.
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
        <div className="flex items-center justify-between border-t border-white/10 px-4 sm:px-6 py-3 bg-black/40 text-[11px] sm:text-xs text-white/60">
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
        active
          ? "bg-[#ffd23f] text-[#0d2190] shadow-md shadow-[#ffd23f]/20"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
