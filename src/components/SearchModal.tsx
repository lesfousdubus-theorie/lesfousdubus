import { useState, useEffect, useRef, useCallback } from 'react';

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        setActiveIndex(-1);
        return;
      }
      try {
        const pagefindUrl = '/pagefind/pagefind.js';
        const pagefind = await import(/* @vite-ignore */ pagefindUrl);
        await pagefind.init();
        const search = await pagefind.search(query);
        const fiveResults = await Promise.all(search.results.slice(0, 5).map((r: any) => r.data()));
        setResults(fiveResults);
        setActiveIndex(-1);
      } catch (e) {
        console.error("Pagefind n'est pas disponible (il faut build le site une fois).", e);
      }
    };
    fetchResults();
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
      style={{ background: 'rgba(7, 2, 10, 0.7)', backdropFilter: 'blur(8px)' }}
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
          padding-top: clamp(64px, 12vh, 120px);
          animation: search-overlay-in 0.18s ease-out;
        }
        .search-modal-panel {
          animation: search-panel-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
          max-height: min(640px, calc(100vh - 96px));
        }
        .search-modal-panel mark {
          background: color-mix(in srgb, var(--accent-gold) 28%, transparent);
          color: var(--text-main);
          border-radius: 3px;
          padding: 0 1px;
        }
        @media (prefers-reduced-motion: reduce) {
          .search-modal-overlay,
          .search-modal-panel {
            animation: none !important;
          }
        }
      `}</style>
      <div
        className="w-full max-w-2xl mx-4 overflow-hidden flex flex-col search-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche dans le site"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 40px var(--glow-violet)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input area */}
        <div
          className="flex items-center px-5 py-4"
          style={{
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--surface)',
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
            style={{ color: 'var(--violet-light)', marginRight: '12px', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[17px]"
            style={{ color: 'var(--text-main)' }}
            placeholder="Rechercher dans la théorie..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label="Rechercher"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          />
          <button
            onClick={() => setIsOpen(false)}
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
            }}
          >
            ECHAP
          </button>
        </div>

        {/* Initial state */}
        {!query && (
          <div className="px-6 py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
            <p className="mb-2" style={{ fontSize: '14px' }}>
              Tapez pour rechercher dans la théorie…
            </p>
            <p style={{ fontSize: '12px' }}>Naviguez avec ↑ ↓ et validez avec Entrée</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto">
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
                    style={{
                      display: 'block',
                      padding: '14px 24px',
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
                        fontWeight: 500,
                        marginBottom: '4px',
                        fontSize: '15px',
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
        {query && results.length === 0 && (
          <div
            className="px-6 py-12 text-center"
            style={{ color: 'var(--text-secondary)', fontSize: '14px' }}
          >
            Aucun résultat pour "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
