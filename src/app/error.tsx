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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07142b] p-6 text-[#eef3ff]">
      <main className="flex max-w-md flex-col items-center text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-[#ffd23f]">
          Erreur
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Un problème est survenu dans le bus
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#eef3ff]/80">
          Une secousse imprévue s&apos;est produite sur Grand Line. Vous pouvez retenter l&apos;expérience ou revenir au point de départ.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#ffd23f] px-6 py-3 font-bold text-[#07142b] transition-colors hover:bg-[#ffd23f]/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#eef3ff]/30 px-6 py-3 font-bold text-[#eef3ff] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Retourner à l’accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
