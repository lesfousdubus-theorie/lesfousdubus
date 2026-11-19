"use client";

import { useEffect } from "react";

const GLOBAL_ERROR_FALLBACK_CSS = `*, *::before, *::after { box-sizing: border-box; }
  :root {
    --bus-gradient: linear-gradient(100deg, #2f5bff 0%, #5a4bf2 52%, #9a3ff0 100%);
    --bus-noise: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E");
  }
  html, body {
    margin: 0;
    height: 100%;
    background-color: #050a1b;
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
    padding: 1rem;
    color: #ffffff;
    background-color: #050a1b;
    background-image:
      var(--bus-noise),
      radial-gradient(ellipse at 18% 12%, rgba(47, 91, 255, 0.30), transparent 58%),
      radial-gradient(ellipse at 82% 88%, rgba(154, 63, 240, 0.24), transparent 58%);
    background-blend-mode: soft-light, normal, normal;
    background-size: 180px 180px, auto, auto;
  }
  .ge-card {
    margin-block: auto;
    width: 100%;
    max-width: 28rem;
    padding: 1.5rem;
    text-align: center;
    border: 1px solid transparent;
    border-radius: 1.5rem;
    background:
      linear-gradient(158deg, rgba(20, 31, 75, 0.97), rgba(8, 14, 38, 0.98)) padding-box,
      linear-gradient(125deg, rgba(83, 105, 255, 0.55), rgba(167, 139, 250, 0.45), rgba(255, 255, 255, 0.10)) border-box;
    box-shadow: 0 24px 70px rgba(2, 6, 23, 0.65), 0 0 50px rgba(91, 75, 243, 0.16);
  }
  .ge-badge {
    display: inline-flex;
    border-radius: 9999px;
    border: 1px solid rgba(167, 139, 250, 0.45);
    background-color: rgba(11, 20, 51, 0.9);
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #c9b8ff;
  }
  .ge-title {
    margin: 1rem 0 0;
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 900;
    letter-spacing: -0.025em;
    color: #ffffff;
  }
  .ge-body { margin: 0.75rem 0 0; font-size: 0.875rem; line-height: 1.625; color: #e2e8ff; }
  .ge-muted { margin: 0.625rem 0 0; font-size: 0.75rem; line-height: 1.5; color: #b6c1ee; }
  .ge-actions {
    margin-top: 1.75rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
  }
  .ge-btn-primary, .ge-btn-secondary {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-decoration: none;
    cursor: pointer;
    transition: transform 180ms cubic-bezier(.25, 1, .5, 1), filter 180ms ease, box-shadow 180ms ease;
  }
  .ge-btn-primary {
    border: 1px solid rgba(206, 213, 255, 0.42);
    border-radius: 9999px;
    background-color: transparent;
    background-image: var(--bus-gradient);
    font-weight: 900;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(24, 16, 82, 0.35);
    box-shadow: 0 10px 28px rgba(79, 70, 229, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.32);
  }
  .ge-btn-primary:hover { filter: brightness(1.12) saturate(1.06); transform: translateY(-2px); }
  .ge-btn-primary:active { transform: translateY(1px) scale(0.985); }
  .ge-btn-secondary {
    border: 1px solid transparent;
    border-radius: 1.15rem;
    background:
      linear-gradient(rgba(13, 21, 52, 0.94), rgba(8, 14, 38, 0.96)) padding-box,
      linear-gradient(115deg, rgba(83, 105, 255, 0.62), rgba(167, 139, 250, 0.50), rgba(255, 255, 255, 0.12)) border-box;
    font-weight: 700;
    color: #ffffff;
    box-shadow: 0 8px 22px rgba(3, 7, 23, 0.45);
  }
  .ge-btn-secondary:hover { filter: brightness(1.15); transform: translateY(-2px); }
  .ge-btn-secondary:active { transform: translateY(1px) scale(0.985); }
  .ge-btn-primary:focus-visible, .ge-btn-secondary:focus-visible {
    outline: 2px solid #c9b8ff;
    outline-offset: 2px;
  }
  @media (min-width: 640px) {
    .ge-shell { padding: 1.5rem; }
    .ge-card { padding: 2rem; }
    .ge-title { font-size: 1.875rem; line-height: 2.25rem; }
    .ge-body { font-size: 1rem; }
    .ge-btn-primary, .ge-btn-secondary { font-size: 1rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ge-btn-primary, .ge-btn-secondary { transition: none; transform: none !important; }
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
      <body className="m-0 bg-[#0b1433] text-white antialiased">
        <div className="bus-standalone ge-shell fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#0b1433] p-4 text-white sm:p-6">
          <main className="bus-panel ge-card my-auto w-full max-w-md rounded-2xl border border-[#a78bfa]/45 bg-[#141f4b] p-6 text-center shadow-[0_24px_64px_rgba(2,6,23,0.65)] sm:p-8">
            <span className="ge-badge inline-flex rounded-full border border-[#a78bfa]/45 bg-[#0b1433] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#a78bfa]">
              Erreur critique
            </span>
            <h1 className="ge-title mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Impossible de charger le bus
            </h1>
            <p className="ge-body mt-3 text-sm leading-relaxed text-[#e2e8ff] sm:text-base">
              Une erreur critique est survenue lors de l’embarquement sur le bus. Tu peux retenter l’expérience ou revenir à l’accueil.
            </p>
            <p className="ge-muted mt-2.5 text-xs leading-relaxed text-[#b6c1ee]">
              {error.digest ? `Référence : ${error.digest}` : "Si le problème persiste, recharge simplement l’onglet."}
            </p>
            <div className="ge-actions mt-7 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => reset()}
                className="ge-btn-primary inline-flex min-h-11 items-center justify-center rounded-xl bus-gradient px-6 py-3 text-sm font-black text-[#ffffff] transition active:translate-y-1 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1433] motion-reduce:transform-none motion-reduce:transition-none sm:text-base"
              >
                Réessayer
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="bus-secondary ge-btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-[#141f4b] px-6 py-3 text-sm font-bold text-white transition hover:border-[#a78bfa]/70 hover:text-[#a78bfa] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1433] motion-reduce:transition-none sm:text-base"
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
