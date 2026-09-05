import BusClient from "@/components/BusClient";
import {
  CENTRAL_THESIS,
  CORE_PILLARS,
  THEORY_CHAPTERS,
  THEORY_FAQ,
} from "@/lib/theory-data";
import { YOUTUBE_ID } from "@/components/bus/constants";

export default function HomePage() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      {/* Expérience 3D interactive (WebGL / Three.js / Canvas) */}
      <BusClient />

      {/* 
        Contenu sémantique complet rendu en SSR (Server-Side Rendering).
        Indispensable pour l'indexation exhaustive par Googlebot, Bingbot, Perplexity et les moteurs de recherche.
        Accessible aux lecteurs d'écran (WCAG a11y) et aux technologies d'assistance.
      */}
      <article
        id="theorie-fous-du-bus-manifeste"
        aria-label="La Théorie des Fous du Bus — Le Siècle Oublié est le Présent"
        className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:inset-4 focus-within:z-[300] focus-within:overflow-y-auto focus-within:bg-[#0c1322] focus-within:p-6 focus-within:text-white focus-within:rounded-2xl"
      >
        <header>
          <h1 className="text-2xl font-black text-[#ffd23f]">
            La Théorie des Fous du Bus — Le Siècle Oublié est le Présent
          </h1>
          <p className="font-bold text-lg text-white/90">{CENTRAL_THESIS.subtitle}</p>
          <p className="mt-2 text-white/80">{CENTRAL_THESIS.overview}</p>
        </header>

        {/* Citations canoniques */}
        <section className="mt-6">
          <h2 className="text-xl font-bold text-[#ffd23f]">Citations Fondatrices du Manga One Piece</h2>
          {CENTRAL_THESIS.quotes.map((q, i) => (
            <blockquote key={i} className="mt-2 border-l-4 border-[#ffd23f] pl-3 italic">
              <p>« {q.text} »</p>
              <cite className="not-italic text-sm font-semibold text-white/70">
                — {q.author}, {q.chapter}
              </cite>
            </blockquote>
          ))}
        </section>

        {/* Les 6 piliers */}
        <section className="mt-6">
          <h2 className="text-xl font-bold text-[#ffd23f]">Les 6 Piliers Fondamentaux de la Théorie</h2>
          <div className="space-y-4 mt-3">
            {CORE_PILLARS.map((p, i) => (
              <div key={i}>
                <h3 className="font-bold text-lg text-white">
                  {p.icon} {p.title}
                </h3>
                <h4 className="text-sm font-semibold text-[#ffd23f]">{p.subtitle}</h4>
                <p className="text-sm text-white/80">{p.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Les 22 chapitres détaillés */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-[#ffd23f]">
            Démonstration Complète en 22 Chapitres
          </h2>
          <div className="space-y-6 mt-4">
            {THEORY_CHAPTERS.map((ch) => (
              <section key={ch.id} id={ch.id} className="border-b border-white/10 pb-4">
                <h3 className="font-bold text-base text-white">
                  Chapitre {ch.number} : {ch.title}
                </h3>
                <span className="text-xs uppercase font-bold text-[#ffd23f]">[{ch.badge}]</span>
                <p className="mt-1 text-sm text-white/80">{ch.summary}</p>
                <div className="mt-2">
                  <strong className="text-xs text-white/90">Points clés :</strong>
                  <ul className="list-disc list-inside text-xs text-white/75 space-y-0.5 mt-1">
                    {ch.keyPoints.map((kp, idx) => (
                      <li key={idx}>{kp}</li>
                    ))}
                  </ul>
                </div>
                {ch.mangaReferences && (
                  <p className="mt-1 text-xs text-white/60">
                    <strong>Références canoniques :</strong> {ch.mangaReferences}
                  </p>
                )}
              </section>
            ))}
          </div>
        </section>

        {/* Vidéo de démonstration */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-[#ffd23f]">Vidéo Officielle de la Théorie</h2>
          <p className="text-sm text-white/80">
            Regardez la démonstration complète sur YouTube :{" "}
            <a
              href={`https://www.youtube.com/watch?v=${YOUTUBE_ID}`}
              className="text-[#ffd23f] underline"
            >
              LA THÉORIE ULTIME DE ONE PIECE : LE SIÈCLE OUBLIÉ EST LE PRÉSENT
            </a>
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-[#ffd23f]">
            Foire Aux Questions (FAQ) — Théorie One Piece
          </h2>
          <dl className="space-y-4 mt-3">
            {THEORY_FAQ.map((faq, i) => (
              <div key={i}>
                <dt className="font-bold text-white text-base">Q : {faq.question}</dt>
                <dd className="mt-1 text-sm text-white/80">R : {faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="mt-8 pt-4 border-t border-white/20 text-xs text-white/60">
          <p>
            Site officiel :{" "}
            <a href="https://lesfousdubus.sbs" className="text-[#ffd23f] underline">
              https://lesfousdubus.sbs
            </a>{" "}
            · Tous droits réservés à Eiichiro Oda & Shueisha pour les éléments One Piece.
          </p>
        </footer>
      </article>

      {/* Version de secours pour navigateurs sans JavaScript */}
      <noscript>
        <div className="fixed inset-0 z-[400] overflow-y-auto bg-[#0c1322] p-6 text-white">
          <h1 className="text-2xl font-black text-[#ffd23f]">
            La Théorie des Fous du Bus — Le Siècle Oublié est le Présent
          </h1>
          <p className="mt-2 text-white/90">{CENTRAL_THESIS.overview}</p>
          <p className="mt-4 font-bold">
            Activez JavaScript pour vivre l&apos;expérience 3D interactive du bus sur Grand Line !
          </p>
        </div>
      </noscript>
    </main>
  );
}
