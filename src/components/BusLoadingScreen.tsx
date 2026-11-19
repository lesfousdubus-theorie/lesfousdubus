"use client";

/** The wheel is inline; the retrieved crew emblem is preloaded by the root layout. */
export default function BusLoadingScreen({ failed = false }: { failed?: boolean }) {
  return (
    <section
      aria-labelledby="bus-loading-title"
      className="fixed inset-0 grid place-items-center overflow-y-auto overscroll-contain bg-[#07142b] px-6 py-10 text-white"
    >
      <div className="my-auto flex w-full max-w-lg flex-col items-center text-center">
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
          <defs>
            <clipPath id="bus-loading-logo-clip"><circle cx="128" cy="128" r="45" /></clipPath>
          </defs>
          <image href="/images/luffy-jolly-roger.png" x="74" y="74" width="108" height="108"
            preserveAspectRatio="xMidYMid meet" clipPath="url(#bus-loading-logo-clip)" />
        </svg>

        <div
          role={failed ? "alert" : "status"}
          className={failed ? "mt-6 w-full max-w-md rounded-2xl border border-[#ffd23f]/45 bg-[#0c1b3a] px-5 py-6 shadow-[0_24px_64px_rgba(2,6,23,0.65)] sm:px-7" : undefined}
        >
          <h1
            id="bus-loading-title"
            className={failed ? "text-2xl font-black leading-tight text-[#ffd23f]" : "mt-5 text-sm font-bold tracking-wide text-[#dce7ff]"}
          >
            {failed ? "Le bus n’a pas pu démarrer" : "Chargement du bus…"}
          </h1>
          {failed && (
            <>
              <p className="mt-3 text-sm leading-relaxed text-[#dce7ff]">
                Le chargement a échoué. Tu peux réessayer.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ffd23f] px-6 py-3 text-sm font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] active:translate-y-1 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transform-none motion-reduce:transition-none sm:text-base"
              >
                Réessayer le chargement
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
