"use client";

import { CENTRAL_THESIS, FULL_THEORY_SECTIONS, THEORY_FAQ } from "@/lib/theory-data";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import SyncedTheoryVideo from "./SyncedTheoryVideo";

export type TheoryTab = "thesis" | "video" | "faq" | "participate";

export default function TheoryPanelContent({ activeTab }: { activeTab: TheoryTab }) {
  return (
    <>
      {/* 1. ONGLET THÈSE */}
      {activeTab === "thesis" && (
        <div className="mx-auto max-w-[1040px] space-y-10">
          <aside className="flex flex-col gap-4 rounded-2xl border border-[#38bdf8]/45 bg-[#0d2638] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.12em] text-[#7dd3fc]">
                Le concept du site
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#e8f5ff] sm:text-[15px]">
                La théorie du Mont Corvo est une véritable lecture de One Piece, présentée ici
                dans une expérience créée pour le fun. On monte réellement dans le bus pour la
                suivre, la défendre ou la découvrir. Chaque passager rejoint le compteur et
                agrandit le convoi.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#7dd3fc]/60 bg-[#07131f] px-4 py-2 text-xs font-black uppercase text-[#a5e4ff]">
              🚌 Tous à bord
            </span>
          </aside>

          {/* Une seule introduction avant le détail des 21 points. */}
          <section className="space-y-4 rounded-2xl border border-[#ffd23f]/45 border-l-4 border-l-[#ffd23f] bg-[#171a19] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)] sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffd23f] text-[#071b5b] shadow-[inset_0_0_0_1px_rgba(7,27,91,0.22)]" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" focusable="false">
                  <path d="M13.2 2 5.5 13.1h5.1L9.8 22l8.7-12.5h-5.2L13.2 2Z" />
                </svg>
              </span>
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
                    <span className="mt-1.5 block font-semibold leading-relaxed text-[#cbd8ee]">{q.relevance}</span>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>

          {/* Mobile : ordre naturel. Desktop : deux piles indépendantes,
              pour qu'ouvrir une carte à gauche ne décale jamais la colonne de droite. */}
          <section className="space-y-3 sm:hidden">
            {FULL_THEORY_SECTIONS.map((section) => (
              <TheoryDetailCard key={section.title} section={section} />
            ))}
          </section>
          <section className="hidden items-start gap-3 sm:grid sm:grid-cols-2">
            <div className="space-y-3">
              {FULL_THEORY_SECTIONS.slice(0, Math.ceil(FULL_THEORY_SECTIONS.length / 2)).map((section) => (
                <TheoryDetailCard key={section.title} section={section} />
              ))}
            </div>
            <div className="space-y-3">
              {FULL_THEORY_SECTIONS.slice(Math.ceil(FULL_THEORY_SECTIONS.length / 2)).map((section) => (
                <TheoryDetailCard key={section.title} section={section} />
              ))}
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
            <SyncedTheoryVideo />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span className="text-xs text-white/80">
                Vidéo officielle du Mont Corvo · Disponible également sur la TV dans le bus
              </span>
              <a
                href={THEORY_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#cc0000] px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
              <summary className="flex min-h-11 items-center justify-between text-sm font-bold text-white cursor-pointer list-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] sm:text-base">
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

      {/* 4. ONGLET PARTICIPER */}
      {activeTab === "participate" && (
        <div className="mx-auto max-w-[760px]">
          <section className="rounded-2xl border border-[#ffd23f]/35 bg-[#101827] p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-9">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#ffd23f]/35 bg-[#ffd23f]/10 text-2xl" aria-hidden="true">
              🛠️
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#ffd23f]">
              Le bus se construit avec sa communauté
            </p>
            <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Participer au site
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#dce5f5] sm:text-[15px]">
              Une idée, une amélioration ou un bug à signaler ? Le code du site est disponible
              sur GitHub. Tu peux consulter le projet, proposer une modification ou ouvrir une
              discussion pour aider le bus à avancer.
            </p>
            <a
              href="https://github.com/lesfousdubus-theorie/lesfousdubus"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-sm font-black text-[#0d2190] shadow-[0_5px_0_#a87500] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-1 active:shadow-none"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.28-1.29-5.28-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.09c.98 0 1.95.13 2.87.39 2.19-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.07.79 2.16v3.25c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" />
              </svg>
              Ouvrir le projet sur GitHub
              <span aria-hidden="true">↗</span>
            </a>
          </section>
        </div>
      )}
    </>
  );
}

function TheoryDetailCard({
  section,
}: {
  section: (typeof FULL_THEORY_SECTIONS)[number];
}) {
  return (
    <details className="group rounded-xl border border-white/20 bg-[#101827] p-4 transition hover:border-white/35 hover:bg-[#142033] open:border-[#ffd23f]/60 open:bg-[#1c1d19] sm:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1220]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-[#050912] text-lg shadow-inner shadow-white/5">
          {section.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-snug text-white group-open:text-[#ffd23f]">
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
}
