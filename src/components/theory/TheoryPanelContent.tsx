"use client";

import { THEORY_FAQ } from "@/lib/theory-data";
import TheorySummary from "./TheorySummary";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import SyncedTheoryVideo from "./SyncedTheoryVideo";
import {
  ChevronDownIcon,
  ExternalArrowIcon,
  GitHubIcon,
  TvIcon,
  WrenchIcon,
} from "../ui/BusIcons";

export type TheoryTab = "thesis" | "video" | "faq" | "participate";

export default function TheoryPanelContent({
  activeTab,
  onVideoPlaybackChange,
  videoActive,
  videoMounted,
}: {
  activeTab: TheoryTab;
  onVideoPlaybackChange?: (active: boolean) => void;
  videoActive?: boolean;
  videoMounted?: boolean;
}) {
  return (
    <>
      {/* 1. ONGLET THÈSE */}
      {activeTab === "thesis" && (
        <div className="mx-auto max-w-[1040px]">
          <TheorySummary />
        </div>
      )}

      {/* 2. ONGLET VIDÉO DU MONT CORVO */}
      {(activeTab === "video" || videoMounted) && (
        <div className="mx-auto max-w-[1040px]" hidden={activeTab !== "video"}>
          <div className="rounded-2xl border border-[#ffd23f]/40 bg-gradient-to-br from-[#10265c]/90 to-[#0c1b3a] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] min-[360px]:p-5 sm:p-7 lg:p-8">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#ffd23f] px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-[#091c5c]">
                Le Mont Corvo
              </span>
              <span className="text-xs font-semibold text-[#dce7ff]">
                La théorie expliquée en détail
              </span>
            </div>
            <SyncedTheoryVideo
              active={videoActive ?? activeTab === "video"}
              onPlaybackChange={onVideoPlaybackChange}
            />

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
              <a
                href={THEORY_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-4 py-2.5 text-xs font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] active:translate-y-1 active:shadow-none motion-reduce:transform-none motion-reduce:transition-none sm:text-sm"
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
              <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-2 rounded-lg py-2.5 text-sm font-bold leading-snug text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] sm:text-base [&::-webkit-details-marker]:hidden">
                <span className="shrink-0 font-black text-[#ffd23f]">Q :</span>
                <span className="flex-1 text-white transition-colors group-open:text-[#ffd23f] motion-reduce:transition-none">
                  {faq.question}
                </span>
                <ChevronDownIcon className="ml-2 mt-0.5 h-4 w-4 shrink-0 text-[#ffd23f] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none sm:mt-1" />
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
              <WrenchIcon className="h-7 w-7" />
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
              className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[#ffd23f] px-5 py-3 text-sm font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] active:translate-y-1 active:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
            >
              <GitHubIcon className="h-5 w-5 shrink-0" />
              <span>Ouvrir le projet sur GitHub</span>
              <ExternalArrowIcon className="h-4 w-4 shrink-0" />
            </a>
          </section>
        </div>
      )}
    </>
  );
}
