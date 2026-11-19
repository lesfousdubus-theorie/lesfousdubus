"use client";

import { CloseIcon } from "@/components/ui/BusIcons";

export function ModalCloseButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Fermer la fenêtre"
      className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-[#947eef]/35 bg-[#0e1438] text-white transition-colors duration-150 hover:border-[#c2b6fb] hover:bg-[#1d255e] hover:text-white focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b24] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
    >
      <CloseIcon className="block h-4 w-4" />
    </button>
  );
}
