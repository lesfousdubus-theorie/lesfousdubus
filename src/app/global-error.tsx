"use client";

import { useEffect } from "react";

const GLOBAL_ERROR_FALLBACK_CSS = `@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    height: 100%;
    background-color: #04071c;
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
    background-color: #04071c;
    padding: 1rem;
    color: #ffffff;
  }
  .ge-card {
    margin-block: auto;
    width: 100%;
    max-width: 28rem;
    border-radius: 1rem;
    border: 1px solid rgba(148, 126, 239, 0.36);
    background-color: #0e1438;
    padding: 1.5rem;
    text-align: center;
  }
  .ge-badge {
    display: inline-flex;
    border-radius: 9999px;
    border: 1px solid rgba(148, 126, 239, 0.42);
    background-color: rgba(97, 65, 232, 0.2);
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #c4b5fd;
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
    color: #dfe5ff;
  }
  .ge-muted {
    margin: 0.625rem 0 0;
    font-size: 0.75rem;
    line-height: 1.5;
    color: #a3aed9;
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
    padding: 0.75rem 1.5rem;
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    box-shadow: none;
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
  }
  .ge-btn-primary {
    border-radius: 9999px;
    border: 1px solid #947eef;
    background-color: #6141e8;
    background-image: linear-gradient(90deg, #7a3aec 0%, #6141e8 50%, #464be6 100%);
    color: #ffffff;
  }
  .ge-btn-primary:hover {
    border-color: #c2b6fb;
    background-image: linear-gradient(90deg, #884cef 0%, #6e50ec 50%, #5459ea 100%);
  }
  .ge-btn-secondary {
    border-radius: 1.125rem;
    border: 1px solid rgba(148, 126, 239, 0.38);
    background-color: rgba(8, 12, 38, 0.94);
    color: #ffffff;
  }
  .ge-btn-secondary:hover {
    border-color: rgba(188, 176, 250, 0.78);
    background-color: rgba(24, 31, 82, 0.96);
  }
  .ge-btn-primary:focus-visible,
  .ge-btn-secondary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #0e1438, 0 0 0 4px #947eef;
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
      <body className="m-0 bg-[#04071c] text-white antialiased">
        <div className="ge-shell fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#04071c] p-4 text-white sm:p-6">
          <main className="ge-card bus-case-elevated my-auto w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
            <span className="ge-badge bus-icon-badge inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
              Erreur critique
            </span>
            <h1 className="ge-title mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Impossible de charger le bus
            </h1>
            <p className="ge-body mt-3 text-sm leading-relaxed text-[#dfe5ff] sm:text-base">
              Une erreur critique est survenue lors de l’embarquement sur le bus. Tu peux retenter l’expérience ou revenir à l’accueil.
            </p>
            <p className="ge-muted mt-2.5 text-xs leading-relaxed text-[#a3aed9]">
              {error.digest ? `Référence : ${error.digest}` : "Si le problème persiste, recharge simplement l’onglet."}
            </p>
            <div className="ge-actions mt-7 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => reset()}
                className="ge-btn-primary bus-btn-primary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438] sm:text-base"
              >
                Réessayer
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="ge-btn-secondary bus-btn-secondary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[1.125rem] px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438] sm:text-base"
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
