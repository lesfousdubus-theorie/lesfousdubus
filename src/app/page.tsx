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
        <div className="fixed inset-0 z-[400] grid place-items-center overflow-y-auto overscroll-contain bg-[#07142b] p-4 text-white sm:p-6">
          <div className="my-auto w-full max-w-xl rounded-2xl border border-[#ffd23f]/45 bg-[#0c1b3a] p-5 shadow-[0_24px_64px_rgba(2,6,23,0.65)] sm:p-8">
            <span className="inline-flex rounded-full border border-[#ffd23f]/45 bg-[#07142b] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#ffd23f]">
              Sans JavaScript
            </span>
            <h1 className="mt-4 text-xl font-black leading-tight text-[#ffd23f] sm:text-2xl">
              La Théorie des Fous du Bus — Le Siècle Oublié est le Présent
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#dce7ff] sm:text-base">{CENTRAL_THESIS.overview}</p>
            <p className="mt-4 text-sm font-bold leading-relaxed text-white sm:text-base">
              Active JavaScript pour vivre l’expérience interactive du bus sur Grand Line !
            </p>
            <div className="mt-6">
              <a
                href={THEORY_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ffd23f] px-6 py-3 text-center text-sm font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] active:translate-y-1 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transform-none motion-reduce:transition-none sm:text-base"
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
