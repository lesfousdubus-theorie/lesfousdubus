import { useState, useEffect, useRef, useCallback } from 'react';

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: {
    title?: string;
  };
}

// Alias / typo tolerance
const SEARCH_ALIASES: Array<{ match: RegExp; replace: string }> = [
  { match: /poneglyph|ponégliph|ponégliphe|poneglyphes/gi, replace: 'Ponéglyphe' },
  { match: /poneglyphe/gi, replace: 'Ponéglyphe' },
  { match: /raftel|rafutel|rafuteru/gi, replace: 'Laugh Tale' },
  { match: /laugh ?tale/gi, replace: 'Laugh Tale' },
  { match: /fruit du demon|fruits du demon|fruti/gi, replace: 'Fruit du Démon' },
  { match: /marie ?jois|marie ?geoise|marijoa/gi, replace: 'Mary Geoise' },
  { match: /barbenoire|barbe noire/gi, replace: 'Barbe Noire' },
];

function normalizeQuery(raw: string): string {
  let q = raw.trim();
  for (const { match, replace } of SEARCH_ALIASES) {
    q = q.replace(match, replace);
  }
  return q;
}

// Pagefind singleton + cache
let pagefindInstance: any = null;
let pagefindInitPromise: Promise<any> | null = null;
async function getPagefind() {
  if (pagefindInstance) return pagefindInstance;
  if (pagefindInitPromise) return pagefindInitPromise;
  pagefindInitPromise = (async () => {
    const pagefindUrl = '/pagefind/pagefind.js';
    const pf = await import(/* @vite-ignore */ pagefindUrl);
    await pf.init();
    pagefindInstance = pf;
    return pf;
  })();
  return pagefindInitPromise;
}

const RECENT_KEY = 'fousdu-recent-searches';
const POPULAR = [
  'Joy Boy',
  'Imu',
  'Ponéglyphe',
  'Nika',
  'Poséidon',
  'Laugh Tale',
  'All Blue',
  'Mother Flame',
];

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, 6) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  if (!q.trim() || q.trim().length < 2) return;
  try {
    const recents = loadRecents().filter((x) => x.toLowerCase() !== q.trim().toLowerCase());
    recents.unshift(q.trim());
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, 6)));
  } catch {}
}

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
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
    if (isOpen) {
      setRecents(loadRecents());
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
    }
    setActiveIndex(-1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const main = document.getElementById('main-content');
    html.classList.add('search-modal-open');
    body.classList.add('search-modal-open');
    main?.setAttribute('inert', '');
    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && panelRef.current.contains(target)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      html.classList.remove('search-modal-open');
      body.classList.remove('search-modal-open');
      main?.removeAttribute('inert');
      document.removeEventListener('touchmove', onTouchMove);
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
      ).filter((el) => el.offsetParent !== null);
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
    const normalized = normalizeQuery(query);
    setIsLoading(true);
    setHasSearched(false);
    const timeout = window.setTimeout(async () => {
      try {
        const pf = await getPagefind();
        const search = await pf.search(normalized);
        const data = await Promise.all(
          search.results.slice(0, 8).map((r: { data: () => Promise<PagefindResult> }) => r.data()),
        );
        if (!cancelled) {
          setResults(data);
          setActiveIndex(data.length > 0 ? 0 : -1);
          setHasSearched(true);
        }
      } catch (e) {
        if (!cancelled) {
          setResults([]);
          setHasSearched(true);
          console.error('Pagefind indisponible', e);
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
      const url = results[index]?.url;
      if (url) {
        saveRecent(query || results[index]?.meta?.title || '');
        window.location.href = url;
      }
    },
    [results, query],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (results.length === 0) return;
        setActiveIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.length === 0) return;
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0) navigateToResult(activeIndex);
        else if (results.length > 0) navigateToResult(0);
        else if (query.trim()) {
          saveRecent(query);
        }
      } else if (e.key === 'Home' && results.length > 0) {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End' && results.length > 0) {
        e.preventDefault();
        setActiveIndex(results.length - 1);
      }
    },
    [results, activeIndex, navigateToResult, query],
  );

  useEffect(() => {
    if (activeIndex >= 0 && resultsRef.current) {
      const activeEl = resultsRef.current.children[activeIndex] as HTMLElement;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const normalizedQuery = query ? normalizeQuery(query) : '';
  const showEmpty = !query;
  const showLoading = !!query && isLoading;
  const showResults = !isLoading && results.length > 0;
  const showNoResults = !!query && !isLoading && hasSearched && results.length === 0;
  const showNormalizedHint =
    !!query && normalizedQuery.toLowerCase() !== query.trim().toLowerCase();

  return (
    <div className="search-modal-overlay" role="presentation" onClick={() => setIsOpen(false)}>
      <style>{`
        @keyframes search-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes search-panel-in { from { opacity: 0; transform: translateY(-12px) scale(0.98); } to { opacity: 1; transform: none; } }
        html.search-modal-open, body.search-modal-open { overflow: hidden !important; overscroll-behavior: none; }
        .search-modal-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: max(12px, env(safe-area-inset-top,0px)) 12px max(16px, env(safe-area-inset-bottom,0px)); padding-top: clamp(12px,8vh,80px); background: rgba(7,2,10,0.72); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; animation: search-overlay-in 0.16s ease-out; box-sizing: border-box; }
        .search-modal-panel { animation: search-panel-in 0.22s cubic-bezier(0.22,1,0.36,1); width: min(640px,100%); max-height: min(720px,calc(100dvh - 24px)); display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 40px var(--glow-violet); flex-shrink: 0; }
        @media (min-width:640px){ .search-modal-overlay{ padding:24px 16px; padding-top: clamp(48px,12vh,110px);} .search-modal-panel{ max-height: min(640px,calc(100vh - 96px)); } }
        .search-modal-header { display:flex; align-items:center; gap:10px; padding:12px 14px; border-bottom:1px solid var(--border-color); background: var(--surface); min-height:56px; flex-shrink:0; }
        @media (min-width:640px){ .search-modal-header{ padding:14px 18px; gap:12px; } }
        .search-input { flex:1 1 auto; min-width:0; background:transparent; border:none; outline:none; color:var(--text-main); font-size:16px; line-height:1.4; font-family:inherit; padding:0; margin:0; -webkit-appearance:none; appearance:none; border-radius:4px; }
        .search-input:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }
        .search-input::placeholder{ color:var(--text-secondary); opacity:0.85; }
        .search-close-badge{ display:none; align-items:center; justify-content:center; color:var(--text-secondary); padding:4px 8px; font-size:11px; font-weight:600; letter-spacing:0.04em; border:1px solid var(--border-color); border-radius: var(--border-radius-sm); background: var(--bg-main); cursor:pointer; flex-shrink:0; font-family:inherit; line-height:1.2; }
        .search-close-badge:hover{ color:var(--text-main); border-color:var(--violet); }
        .search-close-icon,.search-clear-btn{ display:inline-flex; align-items:center; justify-content:center; color:var(--text-secondary); width:36px; height:36px; border-radius: var(--border-radius); border:1px solid var(--border-color); background:var(--bg-main); cursor:pointer; flex-shrink:0; padding:0; }
        .search-close-icon:hover,.search-clear-btn:hover{ color:var(--text-main); border-color:var(--violet); }
        .search-clear-btn{ width:30px; height:30px; border-radius: var(--border-radius-full); border-color:transparent; background: color-mix(in srgb, var(--surface) 80%, transparent); }
        @media (min-width:640px){ .search-close-badge{ display:inline-flex; } .search-close-icon{ display:none; } }
        .search-body{ flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
        .search-empty,.search-status{ padding:28px 20px; text-align:center; color:var(--text-secondary); font-size:14px; line-height:1.5; }
        .search-empty-recents{ text-align:left; padding:16px 20px; }
        .search-empty-title{ font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-main); margin:0 0 10px; }
        .search-chip-list{ display:flex; flex-wrap:wrap; gap:8px; }
        .search-chip{ display:inline-flex; padding:6px 12px; border-radius: var(--border-radius-full); border:1px solid var(--border-color); background: var(--bg-main); color:var(--text-secondary); font-size:12.5px; cursor:pointer; transition: all 0.15s ease; }
        .search-chip:hover{ color:var(--cyan); border-color:var(--cyan); background: color-mix(in srgb, var(--cyan) 10%, transparent); }
        .search-no-results{ display:flex; flex-direction:column; align-items:center; gap:8px; padding:48px 24px; }
        .search-no-results__icon{ color:var(--text-secondary); opacity:0.5; margin-bottom:8px; }
        .search-no-results__title{ font-size:16px; font-weight:600; color:var(--text-main); margin:0; }
        .search-no-results__query{ font-size:14px; color:var(--text-secondary); margin:0; word-break:break-word; max-width:100%; }
        .search-no-results__hint{ font-size:13px; color:var(--text-secondary); opacity:0.8; margin:8px 0 0; }
        .search-normalized-hint{ padding:10px 16px; text-align:center; color:var(--text-main); font-size:12.5px; border-bottom:1px solid var(--border-color); background: color-mix(in srgb, var(--accent-gold) 12%, transparent); }
        .search-normalized-hint strong{ color:var(--accent-gold); }
        .search-empty p{ margin:0 0 6px; } .search-empty .hint{ font-size:12.5px; opacity:0.85; }
        .search-results{ list-style:none; margin:0; padding:6px 0; }
        .search-result-link{ display:block; padding:12px 16px; text-decoration:none; border-bottom:1px solid color-mix(in srgb, var(--border-color) 50%, transparent); background:transparent; transition: background 0.12s ease; cursor:pointer; }
        .search-result-link:hover,.search-result-link.is-active{ background: color-mix(in srgb, var(--violet) 14%, transparent); }
        .search-result-link.is-active{ box-shadow: inset 3px 0 0 var(--cyan); }
        .search-result-title{ color:var(--text-main); font-weight:600; margin:0 0 4px; font-size:14.5px; line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .search-result-excerpt{ font-size:13px; color:var(--text-secondary); line-height:1.5; margin:0; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
        .search-modal-panel mark{ background: color-mix(in srgb, var(--accent-gold) 30%, transparent); color:var(--text-main); border-radius:3px; padding:0 2px; font-weight:600; }
        .search-footer{ display:none; align-items:center; justify-content:space-between; gap:12px; padding:8px 14px; border-top:1px solid var(--border-color); background: color-mix(in srgb, var(--surface) 70%, transparent); color:var(--text-secondary); font-size:11.5px; flex-shrink:0; }
        @media (min-width:640px){ .search-footer{ display:flex; } }
        .search-footer kbd{ display:inline-block; padding:1px 5px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-main); font-size:10.5px; font-family:inherit; font-weight:600; margin:0 1px; }
        .search-footer-hints{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .search-footer-count{ opacity:0.85; white-space:nowrap; }
        .search-cta{ display:inline-flex; margin-top:12px; padding:8px 14px; border:1px solid var(--border-color); border-radius: var(--border-radius); color:var(--cyan); text-decoration:none; font-size:13px; font-weight:600; transition: all 0.18s ease; }
        .search-cta:hover{ border-color:var(--cyan); background: color-mix(in srgb, var(--cyan) 10%, transparent); }
        @media (max-width:480px){ .search-modal-overlay{ padding:0; align-items:stretch; } .search-modal-panel{ width:100%; max-width:100%; max-height:100dvh; height:100dvh; border-radius:0; border:none; box-shadow:none; } .search-modal-header{ padding:12px 14px; padding-top:max(12px, env(safe-area-inset-top,0px)); min-height:56px; } .search-result-link{ padding:14px 16px; min-height:56px; } .search-result-title{ font-size:15px; } }
        @media (prefers-reduced-motion:reduce){ .search-modal-overlay,.search-modal-panel{ animation:none !important; } }
      `}</style>
      <div
        ref={panelRef}
        className="search-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche dans le site"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-modal-header">
          <svg
            width="18"
            height="18"
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
            enterKeyHint="search"
            inputMode="search"
            className="search-input"
            placeholder="Rechercher dans la théorie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            role="combobox"
            aria-label="Rechercher"
            aria-expanded={showResults || showNoResults}
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="search-clear-btn"
              aria-label="Effacer la recherche"
              title="Effacer"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="search-close-badge"
            aria-label="Fermer la recherche (Échap)"
          >
            Échap
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="search-close-icon"
            aria-label="Fermer la recherche"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="search-body">
          {showEmpty && (
            <div>
              <div className="search-empty">
                <p>Tapez pour rechercher dans la théorie…</p>
                <p className="hint">
                  <span className="hidden sm:inline">
                    Naviguez avec ↑ ↓ · Entrée pour ouvrir · Échap pour fermer
                  </span>
                  <span className="sm:hidden">Appuyez sur un résultat pour l’ouvrir</span>
                </p>
              </div>
              {recents.length > 0 && (
                <div className="search-empty-recents">
                  <p className="search-empty-title">Récentes</p>
                  <div className="search-chip-list">
                    {recents.map((r) => (
                      <button key={r} className="search-chip" onClick={() => setQuery(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="search-empty-recents">
                <p className="search-empty-title">Sujets populaires</p>
                <div className="search-chip-list">
                  {POPULAR.map((p) => (
                    <button key={p} className="search-chip" onClick={() => setQuery(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {showLoading && <div className="search-status">Recherche en cours…</div>}
          {showNormalizedHint && !showLoading && (
            <div className="search-normalized-hint">
              💡 Nous cherchons aussi : <strong>{normalizedQuery}</strong>
            </div>
          )}
          {showResults && (
            <ul
              ref={resultsRef}
              id="search-results"
              className="search-results"
              role="listbox"
              aria-label="Résultats de recherche"
            >
              {results.map((result, idx) => (
                <li key={`${result.url}-${idx}`} role="none">
                  <a
                    href={result.url}
                    id={`search-result-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`search-result-link${idx === activeIndex ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => saveRecent(query)}
                  >
                    <div className="search-result-title">{result.meta.title || 'Page'}</div>
                    <p
                      className="search-result-excerpt"
                      dangerouslySetInnerHTML={{ __html: result.excerpt }}
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
          {showNoResults && (
            <div className="search-status search-no-results">
              <div className="search-no-results__icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="8" x2="14" y2="14"></line>
                  <line x1="14" y1="8" x2="8" y2="14"></line>
                </svg>
              </div>
              <p className="search-no-results__title">Aucun résultat</p>
              <p className="search-no-results__query">pour «&nbsp;{query}&nbsp;»</p>
              <p className="search-no-results__hint">
                Essayez un autre mot-clé (personnage, lieu, chapitre…)
              </p>
              <a href="/dossiers" className="search-cta">
                Parcourir les dossiers →
              </a>
            </div>
          )}
        </div>
        {(showResults || showEmpty) && (
          <div className="search-footer" aria-hidden="true">
            <div className="search-footer-hints">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> naviguer
              </span>
              <span>
                <kbd>↵</kbd> ouvrir
              </span>
              <span>
                <kbd>esc</kbd> fermer
              </span>
            </div>
            {showResults && (
              <span className="search-footer-count">
                {results.length} résultat{results.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
