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
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#04071c] p-4 text-white sm:p-6">
      <main className="bus-case-elevated my-auto w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
        <span className="bus-icon-badge inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
          Erreur
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Un problème est survenu dans le bus
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#dfe5ff] sm:text-base">
          Une secousse imprévue s’est produite sur Grand Line. Tu peux retenter l’expérience ou revenir au point de départ.
        </p>
        <p className="mt-2.5 text-xs leading-relaxed text-[#a3aed9]">
          {error.digest ? `Référence : ${error.digest}` : "Si l’incident persiste, recharge simplement la page."}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => reset()}
            className="bus-btn-primary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438] sm:text-base"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="bus-btn-secondary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[1.125rem] px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438] sm:text-base"
          >
            Retourner à l’accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
