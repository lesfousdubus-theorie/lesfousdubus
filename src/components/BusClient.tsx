"use client";

import dynamic from "next/dynamic";

const BusExperience = dynamic(() => import("./BusExperience"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-gradient-to-b from-[#79c2ff] to-[#1f6fb5] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-[#ffd23f]" />
        <p className="text-lg font-black uppercase tracking-widest">Le bus arrive…</p>
        <p className="mt-1 text-sm text-white/80">Chargement de Grand Line</p>
      </div>
    </div>
  ),
});

export default function BusClient() {
  return <BusExperience />;
}
