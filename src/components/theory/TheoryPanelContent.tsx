"use client";

import { THEORY_FAQ } from "@/lib/theory-data";
import TheorySummary from "./TheorySummary";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import SyncedTheoryVideo from "./SyncedTheoryVideo";
import { BusFrontIcon, ExternalArrowIcon, TvIcon } from "../ui/BusIcons";

export type TheoryTab = "thesis" | "video" | "faq" | "participate";

export default function TheoryPanelContent({ activeTab, onVideoPlaybackChange }: {
  activeTab: TheoryTab;
  onVideoPlaybackChange?: (active: boolean) => void;
}) {
  return (
    <>
      {/* 1. ONGLET THÈSE */}
      {activeTab === "thesis" && (
        <div className="mx-auto max-w-[1040px] space-y-10">
          <aside className="flex flex-col gap-4 rounded-2xl border border-[#ffd23f]/40 bg-gradient-to-br from-[#10265c]/90 to-[#0c1b3a] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.28)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.12em] text-[#ffd23f]">
                Le concept du site
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#dce7ff] sm:text-[15px]">
                La théorie du Mont Corvo est une véritable lecture de One Piece, présentée ici
                dans une expérience créée pour le fun. On monte réellement dans le bus pour la
                suivre, la défendre ou la découvrir. Chaque passager rejoint le compteur et
                agrandit le convoi.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[#ffd23f]/45 bg-[#040b18]/85 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#ffd23f] sm:self-center">
              <BusFrontIcon className="h-4 w-4 shrink-0 text-[#ffd23f]" />
              <span>Tous à bord</span>
            </span>
          </aside>

          <TheorySummary />
        </div>
      )}

      {/* 2. ONGLET VIDÉO DU MONT CORVO */}
      {activeTab === "video" && (
        <div className="mx-auto max-w-[1040px]">
          <div className="rounded-2xl border border-[#ffd23f]/40 bg-gradient-to-br from-[#10265c]/90 to-[#0c1b3a] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] min-[360px]:p-5 sm:p-7 lg:p-8">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#ffd23f] px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-[#091c5c]">
                Le Mont Corvo
              </span>
              <span className="text-xs font-semibold text-[#dce7ff]">
                La théorie expliquée en détail
              </span>
            </div>
            <SyncedTheoryVideo onPlaybackChange={onVideoPlaybackChange} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <span className="text-xs leading-relaxed text-[#b6c7eb]">
                Vidéo officielle du Mont Corvo · Disponible également sur la TV dans le bus
              </span>
              <a
                href={THEORY_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-4 py-2.5 text-xs font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:translate-y-1 active:shadow-none motion-reduce:transform-none motion-reduce:transition-none sm:text-sm"
              >
                <TvIcon className="h-4 w-4 shrink-0" />
                <span>Regarder sur YouTube</span>
                <ExternalArrowIcon className="h-3.5 w-3.5 shrink-0" />
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
              className="group rounded-xl border border-white/15 bg-[#0c1b3a] p-4 transition-colors hover:border-[#ffd23f]/45 [&[open]]:border-[#ffd23f]/55 [&[open]]:bg-[#10265c]/80 motion-reduce:transition-none sm:p-5"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-sm font-bold text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] sm:text-base [&::-webkit-details-marker]:hidden">
                <span className="shrink-0 font-black text-[#ffd23f]">Q :</span>
                <span className="flex-1 text-white transition-colors group-open:text-[#ffd23f] motion-reduce:transition-none">
                  {faq.question}
                </span>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="ml-2 h-4 w-4 shrink-0 text-[#ffd23f] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-4 border-t border-white/15 pt-4 text-sm leading-7 text-[#dce7ff]">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* 4. ONGLET PARTICIPER */}
      {activeTab === "participate" && (
        <div className="mx-auto max-w-[760px]">
          <section className="rounded-2xl border border-[#ffd23f]/40 bg-gradient-to-br from-[#10265c]/90 to-[#0c1b3a] p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-9">
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#ffd23f]/40 bg-[#ffd23f]/12 text-[#ffd23f]"
              aria-hidden="true"
            >
              <svg
                aria-hidden="true"
                focusable="false"
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
              </svg>
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#ffd23f]">
              Le bus se construit avec sa communauté
            </p>
            <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Participer au site
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#dce7ff] sm:text-[15px]">
              Une idée, une amélioration ou un bug à signaler ? Le code du site est disponible
              sur GitHub. Tu peux consulter le projet, proposer une modification ou ouvrir une
              discussion pour aider le bus à avancer.
            </p>
            <a
              href="https://github.com/lesfousdubus-theorie/lesfousdubus"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[#ffd23f] px-5 py-3 text-sm font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:translate-y-1 active:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
            >
              <svg aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.28-1.29-5.28-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.09c.98 0 1.95.13 2.87.39 2.19-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.07.79 2.16v3.25c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" />
              </svg>
              <span>Ouvrir le projet sur GitHub</span>
              <ExternalArrowIcon className="h-4 w-4 shrink-0" />
            </a>
          </section>
        </div>
      )}
    </>
  );
}
