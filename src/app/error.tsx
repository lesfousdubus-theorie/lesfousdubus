"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
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
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#07142b] p-4 text-white sm:p-6">
      <main className="my-auto w-full max-w-md rounded-2xl border border-[#ffd23f]/45 bg-[#0c1b3a] p-6 text-center shadow-[0_24px_64px_rgba(2,6,23,0.65)] sm:p-8">
        <span className="inline-flex rounded-full border border-[#ffd23f]/45 bg-[#07142b] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#ffd23f]">
          Erreur
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Un problème est survenu dans le bus
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#dce7ff] sm:text-base">
          Une secousse imprévue s’est produite sur Grand Line. Tu peux retenter l’expérience ou revenir au point de départ.
        </p>
        <p className="mt-2.5 text-xs leading-relaxed text-[#b6c7eb]">
          {error.digest ? `Référence : ${error.digest}` : "Si l’incident persiste, recharge simplement la page."}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ffd23f] px-6 py-3 text-sm font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] active:translate-y-1 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transform-none motion-reduce:transition-none sm:text-base"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-[#0c1b3a] px-6 py-3 text-sm font-bold text-white transition hover:border-[#ffd23f]/70 hover:text-[#ffd23f] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transition-none sm:text-base"
          >
            Retourner à l’accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
