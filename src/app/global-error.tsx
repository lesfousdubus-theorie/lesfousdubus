"use client";

import { useEffect } from "react";

const GLOBAL_ERROR_FALLBACK_CSS = `@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    height: 100%;
    background-color: #07142b;
    color: #ffffff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .ge-shell {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    overflow-y: auto;
    overscroll-behavior: contain;
    background-color: #07142b;
    padding: 1rem;
    color: #ffffff;
  }
  .ge-card {
    margin-block: auto;
    width: 100%;
    max-width: 28rem;
    border-radius: 1rem;
    border: 1px solid rgba(255, 210, 63, 0.45);
    background-color: #0c1b3a;
    padding: 1.5rem;
    text-align: center;
    box-shadow: 0 24px 64px rgba(2, 6, 23, 0.65);
  }
  .ge-badge {
    display: inline-flex;
    border-radius: 9999px;
    border: 1px solid rgba(255, 210, 63, 0.45);
    background-color: #07142b;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #ffd23f;
  }
  .ge-title {
    margin: 1rem 0 0;
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 900;
    letter-spacing: -0.025em;
    color: #ffffff;
  }
  .ge-body {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
    line-height: 1.625;
    color: #dce7ff;
  }
  .ge-muted {
    margin: 0.625rem 0 0;
    font-size: 0.75rem;
    line-height: 1.5;
    color: #b6c7eb;
  }
  .ge-actions {
    margin-top: 1.75rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
  }
  .ge-btn-primary,
  .ge-btn-secondary {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.75rem;
    padding: 0.75rem 1.5rem;
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
  }
  .ge-btn-primary {
    border: 0;
    background-color: #ffd23f;
    font-weight: 900;
    color: #091c5c;
    box-shadow: 0 5px 0 #b8860b;
  }
  .ge-btn-primary:hover { background-color: #ffe271; }
  .ge-btn-primary:active {
    box-shadow: none;
    transform: translateY(0.25rem);
  }
  .ge-btn-secondary {
    border: 1px solid rgba(255, 255, 255, 0.3);
    background-color: #0c1b3a;
    font-weight: 700;
    color: #ffffff;
  }
  .ge-btn-secondary:hover {
    border-color: rgba(255, 210, 63, 0.7);
    color: #ffd23f;
  }
  .ge-btn-secondary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #07142b, 0 0 0 4px #ffd23f;
  }
  .ge-btn-primary:focus-visible {
    outline: none;
    box-shadow: 0 5px 0 #b8860b, 0 0 0 2px #07142b, 0 0 0 4px #ffd23f;
  }
  @media (min-width: 640px) {
    .ge-shell { padding: 1.5rem; }
    .ge-card { padding: 2rem; }
    .ge-title { font-size: 1.875rem; line-height: 2.25rem; }
    .ge-body { font-size: 1rem; }
    .ge-btn-primary, .ge-btn-secondary { font-size: 1rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ge-btn-primary, .ge-btn-secondary {
      transition: none;
      transform: none;
    }
  }
}`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erreur critique | Les Fous du Bus</title>
        <style>{GLOBAL_ERROR_FALLBACK_CSS}</style>
      </head>
      <body className="m-0 bg-[#07142b] text-white antialiased">
        <div className="ge-shell fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#07142b] p-4 text-white sm:p-6">
          <main className="ge-card my-auto w-full max-w-md rounded-2xl border border-[#ffd23f]/45 bg-[#0c1b3a] p-6 text-center shadow-[0_24px_64px_rgba(2,6,23,0.65)] sm:p-8">
            <span className="ge-badge inline-flex rounded-full border border-[#ffd23f]/45 bg-[#07142b] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#ffd23f]">
              Erreur critique
            </span>
            <h1 className="ge-title mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Impossible de charger le bus
            </h1>
            <p className="ge-body mt-3 text-sm leading-relaxed text-[#dce7ff] sm:text-base">
              Une erreur critique est survenue lors de l’embarquement sur le bus. Tu peux retenter l’expérience ou revenir à l’accueil.
            </p>
            <p className="ge-muted mt-2.5 text-xs leading-relaxed text-[#b6c7eb]">
              {error.digest ? `Référence : ${error.digest}` : "Si le problème persiste, recharge simplement l’onglet."}
            </p>
            <div className="ge-actions mt-7 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => reset()}
                className="ge-btn-primary inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ffd23f] px-6 py-3 text-sm font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] active:translate-y-1 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transform-none motion-reduce:transition-none sm:text-base"
              >
                Réessayer
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="ge-btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-[#0c1b3a] px-6 py-3 text-sm font-bold text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transition-none sm:text-base"
              >
                Retourner à l’accueil
              </a>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
