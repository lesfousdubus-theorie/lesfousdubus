"use client";

import { THEORY_FAQ } from "@/lib/theory-data";
import TheorySummary from "./TheorySummary";
import TheorySettingsPanel from "./TheorySettingsPanel";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import SyncedTheoryVideo from "./SyncedTheoryVideo";
import {
  DEFAULT_GRAPHICS_SETTINGS,
  type GraphicsPresetPreference,
  type GraphicsSettings,
  type SceneGraphicsTelemetry,
} from "@/lib/scene-performance";
import {
  ChevronDownIcon,
  ExternalArrowIcon,
  GitHubIcon,
  TvIcon,
  WrenchIcon,
} from "../ui/BusIcons";

export type TheoryTab = "thesis" | "video" | "faq" | "participate" | "settings";

export default function TheoryPanelContent({
  activeTab,
  onVideoPlaybackChange,
  videoActive,
  videoMounted,
  graphicsSettings = DEFAULT_GRAPHICS_SETTINGS,
  graphicsTelemetry = null,
  onSelectGraphicsPreset,
  onUpdateGraphicsSettings,
  onResetGraphicsSettings,
  letterShortcutsEnabled,
  setLetterShortcutsEnabled,
}: {
  activeTab: TheoryTab;
  onVideoPlaybackChange?: (active: boolean) => void;
  videoActive?: boolean;
  videoMounted?: boolean;
  graphicsSettings?: GraphicsSettings;
  graphicsTelemetry?: SceneGraphicsTelemetry | null;
  onSelectGraphicsPreset?: (preset: GraphicsPresetPreference) => void;
  onUpdateGraphicsSettings?: (patch: Partial<GraphicsSettings>) => void;
  onResetGraphicsSettings?: () => void;
  letterShortcutsEnabled?: boolean;
  setLetterShortcutsEnabled?: (enabled: boolean) => void;
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
          <div className="bus-case-highlight rounded-2xl p-4 min-[360px]:p-5 sm:p-7 lg:p-8">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="bus-pill-badge rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
                Le Mont Corvo
              </span>
              <span className="text-xs font-semibold text-[#dfe5ff]">
                La théorie expliquée en détail
              </span>
            </div>
            <SyncedTheoryVideo
              active={videoActive ?? activeTab === "video"}
              onPlaybackChange={onVideoPlaybackChange}
            />

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-[#947eef]/20 pt-4">
              <a
                href={THEORY_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bus-btn-primary inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold focus-visible:outline-none sm:text-sm"
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
              className="bus-case-elevated group rounded-xl p-4 transition-colors [&[open]]:border-[#947eef]/65 [&[open]]:bg-[#161d52]/85 motion-reduce:transition-none sm:p-5"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-2 rounded-lg py-2.5 text-sm font-bold leading-snug text-white select-none focus-visible:outline-none sm:text-base [&::-webkit-details-marker]:hidden">
                <span className="shrink-0 font-black text-[#c4b5fd]">Q :</span>
                <span className="flex-1 text-white transition-colors group-open:text-[#c4b5fd] motion-reduce:transition-none">
                  {faq.question}
                </span>
                <ChevronDownIcon className="ml-2 mt-0.5 h-4 w-4 shrink-0 text-[#c4b5fd] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none sm:mt-1" />
              </summary>
              <div className="mt-4 border-t border-[#947eef]/20 pt-4 text-sm leading-7 text-[#dfe5ff]">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* 4. ONGLET PARTICIPER */}
      {activeTab === "participate" && (
        <div className="mx-auto max-w-[760px]">
          <section className="bus-case-highlight rounded-2xl p-6 text-center sm:p-9">
            <span
              className="bus-icon-badge mx-auto grid h-14 w-14 place-items-center rounded-2xl"
              aria-hidden="true"
            >
              <WrenchIcon className="h-7 w-7" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#c4b5fd]">
              Le bus se construit avec sa communauté
            </p>
            <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Participer au site
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#dfe5ff] sm:text-[15px]">
              Une idée, une amélioration ou un bug à signaler ? Le code du site est disponible
              sur GitHub. Tu peux consulter le projet, proposer une modification ou ouvrir une
              discussion pour aider le bus à avancer.
            </p>
            <a
              href="https://github.com/lesfousdubus-theorie/lesfousdubus"
              target="_blank"
              rel="noopener noreferrer"
              className="bus-btn-primary mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none"
            >
              <GitHubIcon className="h-5 w-5 shrink-0" />
              <span>Ouvrir le projet sur GitHub</span>
              <ExternalArrowIcon className="h-4 w-4 shrink-0" />
            </a>
          </section>
        </div>
      )}
      {/* 5. ONGLET PARAMÈTRES */}
      {activeTab === "settings" && (
        <TheorySettingsPanel
          graphicsSettings={graphicsSettings}
          telemetry={graphicsTelemetry}
          onSelectPreset={(preset) => onSelectGraphicsPreset?.(preset)}
          onUpdateGraphics={(patch) => onUpdateGraphicsSettings?.(patch)}
          onResetGraphics={() => onResetGraphicsSettings?.()}
          letterShortcutsEnabled={letterShortcutsEnabled}
          setLetterShortcutsEnabled={setLetterShortcutsEnabled}
        />
      )}
    </>
  );
}
