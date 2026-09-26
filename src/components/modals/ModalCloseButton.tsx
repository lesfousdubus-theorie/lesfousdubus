"use client";

export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fermer"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.03] hover:border-[#ffd23f] hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <svg aria-hidden="true" className="block h-4 w-4" viewBox="0 0 16 16" fill="none">
        <path d="M3.25 3.25 12.75 12.75M12.75 3.25 3.25 12.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
