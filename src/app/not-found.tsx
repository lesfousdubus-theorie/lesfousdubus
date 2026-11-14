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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07142b] p-6 text-[#eef3ff]">
      <main className="flex max-w-md flex-col items-center text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-[#ffd23f]">
          Erreur 404
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          404 — Page introuvable
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#eef3ff]/80">
          Cette destination ne figure pas sur l&apos;itinéraire du bus.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#ffd23f] px-6 py-3 font-bold text-[#07142b] transition-colors hover:bg-[#ffd23f]/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]"
        >
          Retourner au bus
        </Link>
      </main>
    </div>
  );
}
