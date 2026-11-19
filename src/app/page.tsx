import BusClient from "@/components/BusClient";
import type { Metadata } from "next";
import { CENTRAL_THESIS } from "@/lib/theory-data";
import { SITE_URL, websiteJsonLd, videoJsonLd } from "@/lib/schema-ld";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default function HomePage() {
  return (
    <main id="site-content" className="relative h-dvh w-screen overflow-hidden">
      <StructuredData data={websiteJsonLd} />
      <StructuredData data={videoJsonLd} />
      {/* Expérience 3D interactive (WebGL / Three.js / Canvas) */}
      <BusClient />

      {/* Version de secours pour navigateurs sans JavaScript */}
      <noscript>
        <div className="fixed inset-0 z-[400] grid place-items-center overflow-y-auto overscroll-contain bg-[#04071c] p-4 text-white sm:p-6">
          <div className="bus-case-elevated my-auto w-full max-w-xl rounded-2xl p-5 sm:p-8">
            <span className="bus-icon-badge inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
              Sans JavaScript
            </span>
            <h1 className="mt-4 text-xl font-black leading-tight text-white sm:text-2xl">
              La Théorie des Fous du Bus — Le Siècle Oublié est le Présent
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#dfe5ff] sm:text-base">{CENTRAL_THESIS.overview}</p>
            <p className="mt-4 text-sm font-bold leading-relaxed text-white sm:text-base">
              Active JavaScript pour vivre l’expérience interactive du bus sur Grand Line !
            </p>
            <div className="mt-6">
              <a
                href={THEORY_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bus-btn-primary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-center text-sm font-semibold focus-visible:outline-none sm:text-base"
              >
                Regarder la vidéo sur YouTube
              </a>
            </div>
          </div>
        </div>
      </noscript>
    </main>
  );
}
