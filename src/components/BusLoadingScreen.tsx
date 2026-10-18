"use client";

import { useEffect, useState } from "react";

/** Kept outside the 3D chunk so reading and recovery work while it is unavailable. */
export default function BusLoadingScreen({ failed = false }: { failed?: boolean }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (failed) return;
    const timer = window.setTimeout(() => setSlow(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [failed]);

  return (
    <section
      aria-labelledby="bus-loading-title"
      className="fixed inset-0 grid place-items-center overflow-y-auto overscroll-contain bg-[#07142b] px-6 py-10 text-white selection:bg-[#ffd23f] selection:text-[#07142b]"
    >
      <div className="my-auto w-full max-w-lg py-6 text-center">
        <h1 id="bus-loading-title" className="text-3xl font-black leading-tight text-[#ffd23f] sm:text-4xl">
          {failed ? "Le bus n’a pas pu démarrer" : "Le bus arrive…"}
        </h1>
        <p role={failed ? "alert" : "status"} className="mt-5 text-base leading-7 text-white/85">
          {failed
            ? "Le chargement a échoué. Tu peux réessayer ou continuer avec la théorie."
            : slow
              ? "Le chargement prend un peu de temps. La théorie est déjà disponible."
              : "Préparation de Grand Line. Tu peux déjà découvrir la théorie pendant le chargement."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {/* A regular link also works before hydration or after a failed chunk request. */}
          <a href="/theorie" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ffd23f] px-5 py-3 font-bold text-[#07142b] transition-colors hover:bg-[#ffe47c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Lire la théorie
          </a>
          {(failed || slow) && (
            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/35 px-5 py-3 font-bold transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">
              Réessayer le chargement
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
