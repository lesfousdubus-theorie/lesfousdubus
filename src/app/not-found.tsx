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
    <div className="bus-standalone fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#0b1433] p-4 text-white sm:p-6">
      <main className="bus-panel my-auto w-full max-w-md rounded-2xl border border-[#a78bfa]/45 bg-[#141f4b] p-6 text-center shadow-[0_24px_64px_rgba(2,6,23,0.65)] sm:p-8">
        <span className="inline-flex rounded-full border border-[#a78bfa]/45 bg-[#0b1433] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#a78bfa]">
          Erreur 404
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
          404 — Page introuvable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#e2e8ff] sm:text-base">
          Cette destination ne figure pas sur l’itinéraire du bus.
        </p>
        <p className="mt-2.5 text-xs leading-relaxed text-[#b6c1ee]">
          Vérifie l’adresse saisie ou remonte directement à bord.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bus-gradient px-6 py-3 text-sm font-black text-[#ffffff] transition active:translate-y-1 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1433] motion-reduce:transform-none motion-reduce:transition-none sm:text-base"
        >
          Retourner au bus
        </Link>
      </main>
    </div>
  );
}
