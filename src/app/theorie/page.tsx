/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation keeps this recovery route independent of a failed client router or 3D chunk. */
import type { Metadata } from "next";
import { CENTRAL_THESIS, FULL_THEORY_SECTIONS, THEORY_FAQ } from "@/lib/theory-data";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import { articleJsonLd, SOCIAL_IMAGE, THEORY_DESCRIPTION, THEORY_READING_URL, SITE_NAME } from "@/lib/schema-ld";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Théorie One Piece : le Siècle Oublié est le présent",
  description: THEORY_DESCRIPTION,
  alternates: { canonical: "/theorie" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    siteName: SITE_NAME,
    url: THEORY_READING_URL,
    title: "Théorie One Piece : le Siècle Oublié est le présent",
    description: THEORY_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Théorie One Piece : le Siècle Oublié est le présent",
    description: THEORY_DESCRIPTION,
    images: [SOCIAL_IMAGE.url],
  },
};

/** Server-rendered reading route: no bus, WebGL, iframe or JavaScript interaction required. */
export default function TheoryReadingPage() {
  return (
    <main id="theory-reading" className="fixed inset-0 overflow-y-auto overscroll-contain bg-[#07142b] text-white selection:bg-[#ffd23f] selection:text-[#07142b] [scrollbar-color:#ffd23f_#07142b]">
      <StructuredData data={articleJsonLd} />
      <div className="mx-auto max-w-[75ch] px-6 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8 sm:pb-24 sm:pt-10">
        <nav aria-label="Navigation de la théorie" className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-5 text-sm font-bold sm:mb-16">
          <a href="/" className="inline-flex min-h-11 items-center underline decoration-white/40 underline-offset-4 hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">Retour au bus</a>
          <a href="#theory-chapters" className="inline-flex min-h-11 items-center underline decoration-white/40 underline-offset-4 hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">Les {FULL_THEORY_SECTIONS.length} points de la théorie</a>
        </nav>

        <article>
          <header>
            <h1 className="text-3xl font-black leading-tight text-[#ffd23f] [text-wrap:balance] sm:text-5xl">{CENTRAL_THESIS.title}</h1>
            <p className="mt-6 text-lg font-semibold leading-8 text-white/90">{CENTRAL_THESIS.subtitle}</p>
            <p className="mt-6 text-base leading-8 text-white/85">{CENTRAL_THESIS.overview}</p>
            <a href={THEORY_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-11 items-center font-bold text-[#ffd23f] underline decoration-[#ffd23f]/50 underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">Regarder la vidéo du Mont Corvo sur YouTube</a>
          </header>

          <section id="theory-chapters" aria-labelledby="theory-chapters-title" className="mt-14 scroll-mt-6 border-t border-white/20 pt-9 sm:mt-16">
            <h2 id="theory-chapters-title" className="text-2xl font-black leading-tight sm:text-3xl">La théorie en détail</h2>
            <div className="mt-8 space-y-10">
              {FULL_THEORY_SECTIONS.map(section => (
                <section key={section.title}>
                  <h3 className="text-xl font-bold leading-7 text-[#ffd23f]">{section.title}</h3>
                  <p className="mt-3 text-base leading-8 text-white/85">{section.summary}</p>
                  <a href={`${THEORY_VIDEO_URL}&t=${section.sourceSeconds}s`} aria-label={`Voir dans la vidéo : ${section.title}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-[#ffd23f] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">Voir ce passage dans la vidéo ↗</a>
                </section>
              ))}
            </div>
          </section>

          <section aria-labelledby="theory-faq-title" className="mt-14 border-t border-white/20 pt-9 sm:mt-16">
            <h2 id="theory-faq-title" className="text-2xl font-black leading-tight sm:text-3xl">Questions fréquentes</h2>
            <div className="mt-6 divide-y divide-white/20">
              {THEORY_FAQ.map(faq => (
                <details key={faq.question} className="group py-5">
                  <summary className="cursor-pointer text-base font-bold leading-7 marker:text-[#ffd23f] hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">{faq.question}</summary>
                  <p className="mt-4 text-base leading-8 text-white/85">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </article>

        <footer className="mt-12 border-t border-white/20 pt-6 text-sm leading-6 text-white/75">
          <a href="/" className="inline-flex min-h-11 items-center font-bold text-[#ffd23f] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">Rejoindre le bus</a>
          <p className="mt-3">Les Fous du Bus · Éléments One Piece : Eiichiro Oda et Shueisha.</p>
        </footer>
      </div>
    </main>
  );
}
