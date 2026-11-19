import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#04071c] p-4 text-white sm:p-6">
      <main className="bus-case-elevated my-auto w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
        <span className="bus-icon-badge inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
          Erreur 404
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
          404 — Page introuvable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#dfe5ff] sm:text-base">
          Cette destination ne figure pas sur l’itinéraire du bus.
        </p>
        <p className="mt-2.5 text-xs leading-relaxed text-[#a3aed9]">
          Vérifie l’adresse saisie ou remonte directement à bord.
        </p>
        <Link
          href="/"
          className="bus-btn-primary mt-7 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438] sm:text-base"
        >
          Retourner au bus
        </Link>
      </main>
    </div>
  );
}
