"use client";

import { pickLocale, useLocale } from "@/lib/i18n";

/** The wheel is inline; the retrieved crew emblem is preloaded by the root layout. */
export default function BusLoadingScreen({ failed = false, exiting = false }: { failed?: boolean; exiting?: boolean }) {
  const locale = useLocale();
  return (
    <section
      aria-labelledby="bus-loading-title"
      className={`fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto overscroll-contain bg-[#04071c] px-6 py-10 text-white transition-opacity duration-300 ${exiting ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="my-auto flex w-full max-w-lg flex-col items-center text-center">
        <svg
          id="bus-loading-wheel"
          viewBox="0 0 256 256"
          aria-hidden="true"
          focusable="false"
          className="h-52 w-52 shrink-0 drop-shadow-[0_14px_34px_rgba(0,0,0,0.65)] sm:h-64 sm:w-64"
        >
          <defs>
            {/* Subtle warm aura behind the helm */}
            <radialGradient id="helm-aura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d89c45" stopOpacity="0.22" />
              <stop offset="58%" stopColor="#8a5620" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#04071c" stopOpacity="0" />
            </radialGradient>

            {/* Aged oak wood gradient for the main rim */}
            <radialGradient id="helm-wood-rim" cx="50%" cy="50%" r="50%">
              <stop offset="66%" stopColor="#4c2810" />
              <stop offset="72%" stopColor="#8c5323" />
              <stop offset="77%" stopColor="#c58539" />
              <stop offset="81%" stopColor="#e3b15b" />
              <stop offset="85%" stopColor="#9c5e27" />
              <stop offset="91%" stopColor="#593014" />
              <stop offset="100%" stopColor="#3b1e0b" />
            </radialGradient>

            {/* Turned wood horizontal shading for spokes & handles */}
            <linearGradient id="helm-wood-spoke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#42210d" />
              <stop offset="22%" stopColor="#965924" />
              <stop offset="46%" stopColor="#dea752" />
              <stop offset="68%" stopColor="#b97831" />
              <stop offset="100%" stopColor="#3d1e0b" />
            </linearGradient>

            {/* Turned brass / gold metallic gradient */}
            <linearGradient id="helm-brass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff2b8" />
              <stop offset="24%" stopColor="#e5b34f" />
              <stop offset="55%" stopColor="#a86d1f" />
              <stop offset="80%" stopColor="#f3ca6b" />
              <stop offset="100%" stopColor="#5e370c" />
            </linearGradient>

            {/* Horizontal metallic cylinder sheen for ferrules & caps */}
            <linearGradient id="helm-brass-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5c360b" />
              <stop offset="25%" stopColor="#d9a03b" />
              <stop offset="48%" stopColor="#fff4be" />
              <stop offset="74%" stopColor="#c28326" />
              <stop offset="100%" stopColor="#4f2d08" />
            </linearGradient>

            {/* Deep navy medallion backdrop */}
            <radialGradient id="helm-hub-bg" cx="42%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#141c45" />
              <stop offset="60%" stopColor="#090e2b" />
              <stop offset="100%" stopColor="#04071a" />
            </radialGradient>

            <clipPath id="bus-loading-logo-clip">
              <circle cx="128" cy="128" r="43.5" />
            </clipPath>
          </defs>

          {/* Soft ambient glow */}
          <circle cx="128" cy="128" r="124" fill="url(#helm-aura)" />

          <g className={failed ? undefined : "bus-loading-wheel-spin"}>
            {/* 8 sculpted lathe-turned spokes & handles */}
            {Array.from({ length: 8 }, (_, index) => {
              const isKingSpoke = index === 0;
              return (
                <g key={index} transform={`rotate(${index * 45} 128 128)`}>
                  {/* Inner wooden spoke shaft (from hub to rim) */}
                  <path
                    d="M123.5 82 C123 74 121.5 66 122.5 56 L133.5 56 C134.5 66 133 74 132.5 82 Z"
                    fill="url(#helm-wood-spoke)"
                    stroke="#361a09"
                    strokeWidth="1.6"
                  />
                  {/* Turned wood decorative swell & grooves on inner spoke */}
                  <ellipse cx="128" cy="69" rx="6.2" ry="3.4" fill="url(#helm-wood-spoke)" stroke="#361a09" strokeWidth="1.2" />
                  <path d="M122.6 64.5h10.8M122.6 73.5h10.8" stroke="#47230d" strokeWidth="1.1" strokeLinecap="round" />
                  {/* Inner spoke wood highlight */}
                  <path d="M126.4 58v22" stroke="#f8d483" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />

                  {/* Brass socket collar where spoke meets the center hub */}
                  <rect x="122" y="77.5" width="12" height="5.5" rx="2" fill="url(#helm-brass-cyl)" stroke="#422408" strokeWidth="1.1" />

                  {/* Outer ergonomic lathe-turned handle */}
                  <path
                    d="M124 41 C121 34 119.5 23 121.5 14.5 C122.5 10.5 124.8 8.5 128 8.5 C131.2 8.5 133.5 10.5 134.5 14.5 C136.5 23 135 34 132 41 Z"
                    fill="url(#helm-wood-spoke)"
                    stroke="#361a09"
                    strokeWidth="1.8"
                  />
                  {/* Turned grip rings near handle base */}
                  <path d="M122.4 33.5h11.2M123.1 37h9.8" stroke="#4a240d" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M123.5 35.2h9" stroke="#f4cb74" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                  {/* Handle specular wood sheen */}
                  <path d="M124.6 15.5 C123.8 22 124.2 28 125.4 33" stroke="#fce09b" strokeWidth="2.1" strokeLinecap="round" opacity="0.65" />

                  {/* Brass finial tip cap */}
                  <path
                    d="M123.4 12.2 C123.8 7.5 125.7 5.5 128 5.5 C130.3 5.5 132.2 7.5 132.6 12.2 Z"
                    fill="url(#helm-brass-cyl)"
                    stroke="#422408"
                    strokeWidth="1.2"
                  />
                  <circle cx="128" cy="5.5" r="2.2" fill="url(#helm-brass)" stroke="#422408" strokeWidth="1" />

                  {/* King spoke crown ring (top spoke traditional nautical mark) */}
                  {isKingSpoke && (
                    <rect x="120.5" y="19.5" width="15" height="4.2" rx="2" fill="url(#helm-brass-cyl)" stroke="#422408" strokeWidth="1.1" />
                  )}

                  {/* Brass ferrule / base collar on top of rim */}
                  <rect x="120.5" y="38.5" width="15" height="6.2" rx="2.4" fill="url(#helm-brass-cyl)" stroke="#422408" strokeWidth="1.3" />
                  <path d="M122 41.6h12" stroke="#fff4c4" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
                </g>
              );
            })}

            {/* Main layered oak wooden rim (felloes) */}
            <circle cx="128" cy="128" r="78" fill="none" stroke="#361a09" strokeWidth="24" />
            <circle cx="128" cy="128" r="78" fill="none" stroke="url(#helm-wood-rim)" strokeWidth="20" />

            {/* Subtle wood grain arcs along the rim */}
            <circle cx="128" cy="128" r="81.5" fill="none" stroke="#f2c46d" strokeWidth="1.2" strokeDasharray="18 11 26 9" opacity="0.38" />
            <circle cx="128" cy="128" r="74.5" fill="none" stroke="#47230c" strokeWidth="1.4" strokeDasharray="24 14 12 10" opacity="0.45" />

            {/* Outer & inner recessed brass trim rings */}
            <circle cx="128" cy="128" r="87.5" fill="none" stroke="url(#helm-brass)" strokeWidth="2.8" />
            <circle cx="128" cy="128" r="85.2" fill="none" stroke="#47240a" strokeWidth="1.1" />
            <circle cx="128" cy="128" r="70.5" fill="none" stroke="#47240a" strokeWidth="1.2" />
            <circle cx="128" cy="128" r="68.4" fill="none" stroke="url(#helm-brass)" strokeWidth="2.4" />

            {/* 8 felloe wooden joints (midway between spokes) + brass reinforcement straps at spokes */}
            {Array.from({ length: 8 }, (_, index) => (
              <g key={`rim-detail-${index}`}>
                {/* Carved oak felloe joint seam + brass inlay pin between spokes */}
                <g transform={`rotate(${index * 45 + 22.5} 128 128)`}>
                  <path d="M128 40.5V59.5" stroke="#381b09" strokeWidth="1.8" opacity="0.85" />
                  <path d="M129.4 41.2V58.8" stroke="#e9ba63" strokeWidth="0.9" opacity="0.4" />
                  <circle cx="128" cy="50" r="2.3" fill="url(#helm-brass)" stroke="#3d2007" strokeWidth="0.9" />
                  <circle cx="127.3" cy="49.3" r="0.7" fill="#fff6cc" />
                </g>

                {/* Riveted brass strap plate where each spoke enters the rim */}
                <g transform={`rotate(${index * 45} 128 128)`}>
                  <rect
                    x="122.2"
                    y="43.2"
                    width="11.6"
                    height="13.6"
                    rx="2.6"
                    fill="url(#helm-brass-cyl)"
                    stroke="#3f2108"
                    strokeWidth="1.3"
                  />
                  <rect
                    x="124.5"
                    y="45.8"
                    width="7"
                    height="8.4"
                    rx="1.4"
                    fill="#7c4714"
                    opacity="0.35"
                  />
                  {/* 4 corner rivets on each brass strap */}
                  <circle cx="124.4" cy="45.6" r="1.15" fill="#fff2b8" stroke="#422208" strokeWidth="0.6" />
                  <circle cx="131.6" cy="45.6" r="1.15" fill="#fff2b8" stroke="#422208" strokeWidth="0.6" />
                  <circle cx="124.4" cy="54.4" r="1.15" fill="#fff2b8" stroke="#422208" strokeWidth="0.6" />
                  <circle cx="131.6" cy="54.4" r="1.15" fill="#fff2b8" stroke="#422208" strokeWidth="0.6" />
                </g>
              </g>
            ))}
          </g>

          {/* Stationary ornate center hub (boss) — keeps the Jolly Roger upright */}
          <circle cx="128" cy="128" r="53.5" fill="#2c1507" />
          <circle cx="128" cy="128" r="52" fill="none" stroke="url(#helm-brass)" strokeWidth="4.2" />
          <circle cx="128" cy="128" r="48.8" fill="url(#helm-hub-bg)" stroke="#3d2008" strokeWidth="2.4" />
          <circle cx="128" cy="128" r="46.2" fill="none" stroke="url(#helm-brass)" strokeWidth="2" />

          {/* 8 fine brass rivets around the center bezel */}
          {Array.from({ length: 8 }, (_, index) => (
            <g key={`hub-rivet-${index}`} transform={`rotate(${index * 45 + 22.5} 128 128)`}>
              <circle cx="128" cy="76" r="1.7" fill="url(#helm-brass)" stroke="#3a1d06" strokeWidth="0.7" />
              <circle cx="127.5" cy="75.5" r="0.55" fill="#fff6cc" />
            </g>
          ))}

          {/* Subtle nautical compass degree ticks inside the medallion border */}
          <circle
            cx="128"
            cy="128"
            r="44.2"
            fill="none"
            stroke="#f0c76e"
            strokeWidth="1.2"
            strokeDasharray="1.5 5.4"
            opacity="0.45"
          />

          <image
            href="/images/luffy-jolly-roger.png"
            x="76"
            y="76"
            width="104"
            height="104"
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#bus-loading-logo-clip)"
          />
        </svg>

        <div
          role={failed ? "alert" : "status"}
          className={failed ? "bus-case-elevated mt-6 w-full max-w-md rounded-2xl px-5 py-6 sm:px-7" : undefined}
        >
          <h1
            id="bus-loading-title"
            className={failed ? "text-2xl font-black leading-tight text-white" : "mt-5 text-sm font-semibold tracking-wide text-[#dfe5ff]"}
          >
            {failed
              ? pickLocale(locale, "Le bus n’a pas pu démarrer", "The bus failed to start")
              : pickLocale(locale, "Chargement du bus…", "Loading the bus…")}
          </h1>
          {failed && (
            <>
              <p className="mt-3 text-sm leading-relaxed text-[#dfe5ff]">
                {pickLocale(locale, "Le chargement a échoué. Tu peux réessayer.", "Loading failed. You can try again.")}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bus-btn-primary mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none sm:text-base"
              >
                {pickLocale(locale, "Réessayer le chargement", "Retry loading")}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
