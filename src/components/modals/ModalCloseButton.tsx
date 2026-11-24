"use client";

import { CloseIcon } from "@/components/ui/BusIcons";
import { pickLocale, useLocale } from "@/lib/i18n";

export function ModalCloseButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  const locale = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={pickLocale(locale, "Fermer la fenêtre", "Close dialog")}
      className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-[#947eef]/35 bg-[#0e1438] text-white transition-colors duration-150 hover:border-[#cfc4fc] hover:text-white focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
    >
      <CloseIcon className="block h-4 w-4" />
    </button>
  );
}
