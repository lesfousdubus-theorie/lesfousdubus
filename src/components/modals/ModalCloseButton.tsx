"use client";

export function ModalCloseButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Fermer la fenêtre"
      className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 bg-white/10 text-white transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.03] hover:border-[#ffd23f] hover:bg-[#ffd23f]/15 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <svg aria-hidden="true" focusable="false" className="block h-4 w-4" viewBox="0 0 16 16" fill="none">
        <path d="M3.25 3.25 12.75 12.75M12.75 3.25 3.25 12.75" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </button>
  );
}

