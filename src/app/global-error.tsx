"use client";

import { useEffect } from "react";

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
      <body className="m-0 flex min-h-dvh items-center justify-center bg-[#07142b] p-6 text-white antialiased">
        <main className="flex max-w-md flex-col items-center text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-[#ffd23f]">
            Erreur critique
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Erreur critique
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#eef3ff]/80">
            Une erreur critique est survenue lors de l&apos;embarquement sur le bus.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#ffd23f] px-6 py-3 font-bold text-[#07142b] transition-colors hover:bg-[#ffd23f]/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]"
            >
              Réessayer
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#eef3ff]/30 px-6 py-3 font-bold text-[#eef3ff] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Retourner à l’accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
