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
        <div className="fixed inset-0 z-[400] overflow-y-auto bg-[#0c1322] p-6 text-white">
          <h1 className="text-2xl font-black text-[#ffd23f]">
            La Théorie des Fous du Bus — Le Siècle Oublié est le Présent
          </h1>
          <p className="mt-2 text-white/90">{CENTRAL_THESIS.overview}</p>
          <p className="mt-4 font-bold">
            Activez JavaScript pour vivre l&apos;expérience interactive du bus sur Grand Line !
          </p>
          <a href={THEORY_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center font-bold text-[#ffd23f] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Regarder la vidéo sur YouTube
          </a>
        </div>
      </noscript>
    </main>
  );
}
