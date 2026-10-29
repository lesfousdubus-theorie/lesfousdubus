"use client";

/** Inline SVG stays available before the 3D chunk and needs no asset request. */
export default function BusLoadingScreen({ failed = false }: { failed?: boolean }) {
  return (
    <section
      aria-labelledby="bus-loading-title"
      className="fixed inset-0 grid place-items-center overflow-y-auto overscroll-contain bg-[#07142b] px-6 py-10 text-white"
    >
      <div className="my-auto flex max-w-lg flex-col items-center text-center">
        <svg id="bus-loading-wheel" viewBox="0 0 256 256" aria-hidden="true" focusable="false"
          className="h-48 w-48 shrink-0 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:h-56 sm:w-56">
          <g className={failed ? undefined : "bus-loading-wheel-spin"}>
            {Array.from({ length: 8 }, (_, index) => (
              <g key={index} transform={"rotate(" + index * 45 + " 128 128)"}>
                <path d="M128 128V35" stroke="#633d22" strokeWidth="14" strokeLinecap="round" />
                <path d="M128 128V35" stroke="#d69948" strokeWidth="8" strokeLinecap="round" />
                <rect x="120" y="9" width="16" height="36" rx="8" fill="#d69948" stroke="#633d22" strokeWidth="3" />
                <path d="M123 18v15" stroke="#f4c86b" strokeWidth="3" strokeLinecap="round" />
                <path d="M119 39h18" stroke="#ffd66f" strokeWidth="4" strokeLinecap="round" />
              </g>
            ))}
            <circle cx="128" cy="128" r="78" fill="none" stroke="#633d22" strokeWidth="20" />
            <circle cx="128" cy="128" r="78" fill="none" stroke="#cb8c3d" strokeWidth="14" />
            <circle cx="128" cy="128" r="84" fill="none" stroke="#f4c86b" strokeWidth="3" />
            <circle cx="128" cy="128" r="71" fill="none" stroke="#f4c86b" strokeWidth="2" />
          </g>

          {/* The straw-hat skull stays upright while the wheel turns around it. */}
          <circle cx="128" cy="128" r="49" fill="#07142b" stroke="#633d22" strokeWidth="8" />
          <circle cx="128" cy="128" r="47" fill="none" stroke="#f4c86b" strokeWidth="3" />
          <g fill="#fff6df" stroke="#07142b" strokeWidth="2.5" strokeLinejoin="round">
            <path d="m99 115 59 45m-59 0 59-45" fill="none" stroke="#fff6df" strokeWidth="7" strokeLinecap="round" />
            <circle cx="96" cy="112" r="5" /><circle cx="101" cy="116" r="5" />
            <circle cx="155" cy="158" r="5" /><circle cx="160" cy="163" r="5" />
            <circle cx="96" cy="163" r="5" /><circle cx="101" cy="158" r="5" />
            <circle cx="155" cy="116" r="5" /><circle cx="160" cy="112" r="5" />
            <path d="M107 138h42l-5 25q-16 12-32 0Z" />
            <path d="M102 124c0-18 11-24 26-24s26 6 26 24c0 15-8 23-26 23s-26-8-26-23Z" />
          </g>
          <g fill="#07142b">
            <ellipse cx="117" cy="129" rx="7" ry="9" />
            <ellipse cx="139" cy="129" rx="7" ry="9" />
            <path d="m128 139-4 6h8Z" />
          </g>
          <g fill="none" stroke="#07142b" strokeWidth="2">
            <path d="M110 153q18 7 36 0m-26 2v10m8-9v12m8-12v9" />
          </g>
          <path d="M103 106q0-23 25-23t25 23" fill="#e9b94f" stroke="#07142b" strokeWidth="2.5" />
          <path d="M104 98q24 6 48 0l1 9h-50Z" fill="#d9443f" />
          <ellipse cx="128" cy="109" rx="38" ry="7" fill="#e9b94f" stroke="#07142b" strokeWidth="2.5" />
          <path d="M98 108q30 6 60 0" fill="none" stroke="#ffe091" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <div role={failed ? "alert" : "status"}>
          <h1 id="bus-loading-title" className={failed ? "mt-6 text-2xl font-black leading-tight text-[#ffd23f]" : "sr-only"}>
            {failed ? "Le bus n’a pas pu démarrer" : "Chargement du bus…"}
          </h1>
          {failed && (
            <>
              <p className="mt-3 text-sm leading-6 text-white/85">Le chargement a échoué. Tu peux réessayer.</p>
              <button type="button" onClick={() => window.location.reload()}
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border border-white/35 px-5 py-3 font-bold transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">
                Réessayer le chargement
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
