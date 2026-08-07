import { useState, useEffect, useRef, useCallback } from 'react';

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: {
    title?: string;
  };
}

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openSearch', handleOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openSearch', handleOpen);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setActiveIndex(-1);
  }, [isOpen]);

  // Lock body scroll when modal open (prevents background scroll on mobile)
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // compensate scrollbar to avoid layout shift on desktop
    const sbWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sbWidth > 0) document.body.style.paddingRight = `${sbWidth}px`;
    // also prevent html scroll
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', trapFocus);
    return () => window.removeEventListener('keydown', trapFocus);
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;

    if (!query.trim()) {
      setResults([]);
      setActiveIndex(-1);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(false);

    const timeout = window.setTimeout(async () => {
      try {
        const pagefindUrl = '/pagefind/pagefind.js';
        const pagefind = await import(/* @vite-ignore */ pagefindUrl);
        await pagefind.init();
        const search = await pagefind.search(query);
        const fiveResults = await Promise.all(
          search.results.slice(0, 5).map((r: { data: () => Promise<PagefindResult> }) => r.data()),
        );
        if (!cancelled) {
          setResults(fiveResults);
          setActiveIndex(-1);
          setHasSearched(true);
        }
      } catch (e) {
        if (!cancelled) {
          setResults([]);
          setHasSearched(true);
          console.error("Pagefind n'est pas disponible (il faut build le site une fois).", e);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const navigateToResult = useCallback(
    (index: number) => {
      if (results[index]?.url) {
        window.location.href = results[index].url;
      }
    },
    [results],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        navigateToResult(activeIndex);
      }
    },
    [results, activeIndex, navigateToResult],
  );

  useEffect(() => {
    if (activeIndex >= 0 && resultsRef.current) {
      const activeEl = resultsRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center search-modal-overlay"
      role="presentation"
      style={{
        background: 'rgba(7, 2, 10, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}
      onClick={() => setIsOpen(false)}
    >
      <style>{`
        @keyframes search-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes search-panel-in {
          from { opacity: 0; transform: translateY(-10px) scale(0.985); }
          to { opacity: 1; transform: none; }
        }
        .search-modal-overlay {
          padding: 16px 12px 24px;
          padding-top: clamp(16px, 10vh, 96px);
          animation: search-overlay-in 0.18s ease-out;
        }
        .search-modal-panel {
          animation: search-panel-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
          width: min(640px, calc(100vw - 24px));
          max-height: min(640px, calc(100dvh - 32px));
          max-height: min(640px, calc(100vh - 32px));
        }
        @media (min-width: 640px) {
          .search-modal-overlay {
            padding: 24px 16px;
            padding-top: clamp(48px, 12vh, 120px);
          }
          .search-modal-panel {
            width: 100%;
            max-width: 672px;
            max-height: min(640px, calc(100vh - 96px));
          }
        }
        .search-modal-panel mark {
          background: color-mix(in srgb, var(--accent-gold) 28%, transparent);
          color: var(--text-main);
          border-radius: 3px;
          padding: 0 1px;
        }
        /* Ensure input does not trigger iOS zoom (16px minimum) */
        .search-input {
          font-size: 16px;
        }
        @media (min-width: 640px) {
          .search-input {
            font-size: 16px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .search-modal-overlay,
          .search-modal-panel {
            animation: none !important;
          }
        }
      `}</style>
      <div
        ref={panelRef}
        className="overflow-hidden flex flex-col search-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche dans le site"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 40px var(--glow-violet)',
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input area — responsive */}
        <div
          className="flex items-center gap-2 px-3 sm:px-5 py-3 sm:py-4"
          style={{
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--surface)',
            minHeight: '56px',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--violet-light)', flexShrink: 0 }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none search-input min-w-0"
            style={{ color: 'var(--text-main)' }}
            placeholder="Rechercher dans la théorie..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label="Rechercher"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {/* Desktop : ECHAP badge / Mobile : X icon */}
          <button
            onClick={() => setIsOpen(false)}
            className="hidden sm:inline-flex items-center justify-center"
            style={{
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              background: 'var(--bg-main)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Fermer la recherche (Échap)"
          >
            ECHAP
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="sm:hidden inline-flex items-center justify-center"
            style={{
              color: 'var(--text-secondary)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Fermer la recherche"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Initial state */}
        {!query && (
          <div className="px-4 sm:px-6 py-8 sm:py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
            <p className="mb-2" style={{ fontSize: '14px' }}>
              Tapez pour rechercher dans la théorie…
            </p>
            <p style={{ fontSize: '12px' }} className="hidden sm:block">Naviguez avec ↑ ↓ et validez avec Entrée</p>
            <p style={{ fontSize: '12px' }} className="sm:hidden">Appuyez sur un résultat pour ouvrir</p>
          </div>
        )}

        {/* Loading */}
        {query && isLoading && (
          <div className="px-6 py-8 text-center" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Recherche en cours…
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'min(50vh, 360px)' }}>
            <ul
              ref={resultsRef}
              id="search-results"
              className="py-2"
              role="listbox"
              style={{ listStyle: 'none', margin: 0, padding: '8px 0' }}
            >
              {results.map((result, idx) => (
                <li
                  key={idx}
                  id={`search-result-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                >
                  <a
                    href={result.url}
                    className="block"
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      borderBottom:
                        '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)',
                      textDecoration: 'none',
                      background:
                        idx === activeIndex
                          ? 'color-mix(in srgb, var(--violet) 15%, transparent)'
                          : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <h4
                      style={{
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        marginBottom: '4px',
                        fontSize: '15px',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {result.meta.title || 'Page'}
                    </h4>
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                      dangerouslySetInnerHTML={{ __html: result.excerpt }}
                    ></p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No results */}
        {query && !isLoading && hasSearched && results.length === 0 && (
          <div
            className="px-6 py-10 sm:py-12 text-center"
            style={{ color: 'var(--text-secondary)', fontSize: '14px' }}
          >
            Aucun résultat pour “{query}”
          </div>
        )}
      </div>
    </div>
  );
}
