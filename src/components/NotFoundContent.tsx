"use client";

import { useEffect } from "react";
import Link from "next/link";
import { pickLocale, syncSavedLocale, useLocale } from "@/lib/i18n";

export default function NotFoundContent() {
  const locale = useLocale();

  useEffect(() => {
    syncSavedLocale();
  }, []);

  useEffect(() => {
    document.title = pickLocale(locale, "Page introuvable", "Page not found");
  }, [locale]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#04071c] p-4 text-white sm:p-6">
      <main className="bus-case-elevated my-auto w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
        <span className="bus-icon-badge inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
          {pickLocale(locale, "Erreur 404", "Error 404")}
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
          {pickLocale(locale, "404 — Page introuvable", "404 — Page not found")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#dfe5ff] sm:text-base">
          {pickLocale(locale, "Cette destination ne figure pas sur l’itinéraire du bus.", "This destination is not on the bus route.")}
        </p>
        <p className="mt-2.5 text-xs leading-relaxed text-[#a3aed9]">
          {pickLocale(locale, "Vérifie l’adresse saisie ou remonte directement à bord.", "Check the address you entered or hop straight back on board.")}
        </p>
        <Link
          href="/"
          className="bus-btn-primary mt-7 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none sm:text-base"
        >
          {pickLocale(locale, "Retourner au bus", "Return to the bus")}
        </Link>
      </main>
    </div>
  );
}
