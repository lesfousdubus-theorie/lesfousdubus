"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import TheoryPanelContent, { type TheoryTab } from "./TheoryPanelContent";

interface TheoryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLeaveBusPermanently?: () => Promise<boolean>;
}

const THEORY_TABS: TheoryTab[] = ["thesis", "video", "faq", "participate"];

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "summary",
  "iframe",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function TheoryModal({ isOpen: externalIsOpen, onClose, onLeaveBusPermanently }: TheoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TheoryTab>("thesis");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const confirmDialogRef = useRef<HTMLElement>(null);
  const confirmTitleRef = useRef<HTMLHeadingElement>(null);
  const leaveButtonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

  const handleClose = useCallback(() => {
    setConfirmLeave(false);
    setLeaveError("");
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  }, [onClose]);

  const closeLeaveConfirmation = useCallback(() => {
    setConfirmLeave(false);
    window.requestAnimationFrame(() => leaveButtonRef.current?.focus());
  }, []);

  const leavePermanently = useCallback(async () => {
    if (!onLeaveBusPermanently) return;
    setLeaving(true);
    setLeaveError("");
    const left = await onLeaveBusPermanently();
    setLeaving(false);
    if (!left) setLeaveError("La place n’a pas pu être supprimée. Réessaie dans un instant.");
  }, [onLeaveBusPermanently]);

  // Écoute de l'événement global pour ouvrir le modal depuis n'importe quel composant
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: TheoryTab }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
      setInternalOpen(true);
    };

    window.addEventListener("open-theory-modal", handleOpenEvent);
    return () => window.removeEventListener("open-theory-modal", handleOpenEvent);
  }, []);

  // Place le focus dans la fenêtre, neutralise le fond et restaure le déclencheur à la fermeture.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const page = document.getElementById("site-content");
    const wasInert = page?.inert ?? false;
    if (page) {
      page.inert = true;
    }

    const frame = window.requestAnimationFrame(() => dialogTitleRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      if (page) {
        page.inert = wasInert;
      }
      previouslyFocusedRef.current?.focus({ preventScroll: true });
      previouslyFocusedRef.current = null;
    };
  }, [isOpen]);

  // Le dialogue de confirmation prend temporairement le focus à la fenêtre principale.
  useEffect(() => {
    if (!confirmLeave) return;
    const frame = window.requestAnimationFrame(() => confirmTitleRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [confirmLeave]);

  const handleDialogKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Empêche les commandes du bus de réagir aux touches utilisées dans la fenêtre.
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      if (confirmLeave && !leaving) {
        closeLeaveConfirmation();
      } else if (!confirmLeave) {
        handleClose();
      }
      return;
    }

    if (event.key !== "Tab") return;
    const scope = confirmLeave ? confirmDialogRef.current : dialogRef.current;
    if (!scope) return;
    const focusable = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    if (focusable.length === 0) {
      event.preventDefault();
      scope.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (
      event.shiftKey &&
      (active === first || !scope.contains(active) || !focusable.includes(active as HTMLElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, [closeLeaveConfirmation, confirmLeave, handleClose, leaving]);

  const selectTabFromKeyboard = useCallback((index: number) => {
    const tab = THEORY_TABS[index];
    if (!tab) return;
    setActiveTab(tab);
    tabRefs.current[index]?.focus();
  }, []);

  const handleTabKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % THEORY_TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + THEORY_TABS.length) % THEORY_TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = THEORY_TABS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectTabFromKeyboard(nextIndex);
  }, [selectTabFromKeyboard]);

  // Chaque onglet commence au début du dossier, même après une longue lecture.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theory-modal-title"
      tabIndex={-1}
      className="theory-modal-backdrop pointer-events-auto fixed inset-0 z-[999999] flex items-center justify-center bg-[#030712]/88 backdrop-blur-lg"
      onClick={handleClose}
      onKeyDown={handleDialogKeyDown}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="relative flex h-[calc(100dvh-0.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#ffd23f]/30 bg-[#0b1220]/98 text-white shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,210,63,0.05)] select-text min-[360px]:h-[calc(100dvh-1rem)] min-[360px]:rounded-2xl sm:h-[min(92dvh,900px)]"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div inert={confirmLeave ? true : undefined} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-[64px] items-center justify-between gap-2 border-b border-white/10 bg-[#070c16]/95 px-3 py-2.5 min-[360px]:gap-4 min-[360px]:px-4 min-[360px]:py-3 sm:min-h-[76px] sm:px-7 sm:py-4 lg:px-9">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/25 bg-[#ffd23f]/10 text-xl sm:h-11 sm:w-11 sm:text-2xl" aria-hidden="true">📜</span>
            <div className="min-w-0">
              <h2 ref={dialogTitleRef} tabIndex={-1} id="theory-modal-title" className="truncate text-sm font-black uppercase tracking-[0.025em] text-[#ffd23f] focus:outline-none sm:text-xl sm:tracking-[0.04em] lg:text-2xl">
                La Théorie des Fous du Bus
              </h2>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55 sm:text-xs">
                Le Siècle Oublié est le Présent
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la fenêtre"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white/75 transition hover:border-[#ffd23f]/35 hover:bg-[#ffd23f]/10 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div role="tablist" aria-label="Sections de la théorie" className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 bg-[#080e19] px-2 py-2 no-scrollbar min-[360px]:gap-2 min-[360px]:px-3 min-[360px]:py-2.5 sm:px-7 lg:px-9">
          <TabButton
            buttonRef={(element) => { tabRefs.current[0] = element; }}
            active={activeTab === "thesis"}
            onClick={() => setActiveTab("thesis")}
            onKeyDown={(event) => handleTabKeyDown(event, 0)}
            tabId="theory-tab-thesis"
            panelId="theory-panel-thesis"
            icon="⚡"
            label="La Théorie"
            shortLabel="Théorie"
          />
          <TabButton
            buttonRef={(element) => { tabRefs.current[1] = element; }}
            active={activeTab === "video"}
            onClick={() => setActiveTab("video")}
            onKeyDown={(event) => handleTabKeyDown(event, 1)}
            tabId="theory-tab-video"
            panelId="theory-panel-video"
            icon="📺"
            label="Vidéo du Mont Corvo"
            shortLabel="Vidéo"
          />
          <TabButton
            buttonRef={(element) => { tabRefs.current[2] = element; }}
            active={activeTab === "faq"}
            onClick={() => setActiveTab("faq")}
            onKeyDown={(event) => handleTabKeyDown(event, 2)}
            tabId="theory-tab-faq"
            panelId="theory-panel-faq"
            icon="❓"
            label="FAQ & Origine"
            shortLabel="FAQ"
          />
          <TabButton
            buttonRef={(element) => { tabRefs.current[3] = element; }}
            active={activeTab === "participate"}
            onClick={() => setActiveTab("participate")}
            onKeyDown={(event) => handleTabKeyDown(event, 3)}
            tabId="theory-tab-participate"
            panelId="theory-panel-participate"
            icon="🤝"
            label="Participer au site"
            shortLabel="Participer"
          />
        </div>

        <div
          ref={contentRef}
          role="tabpanel"
          id={`theory-panel-${activeTab}`}
          aria-labelledby={`theory-tab-${activeTab}`}
          tabIndex={0}
          className="flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top_left,rgba(255,210,63,0.045),transparent_32rem)] px-3 py-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd23f] min-[360px]:px-4 min-[360px]:py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10"
        >
          <TheoryPanelContent activeTab={activeTab} />
        </div>
        {THEORY_TABS.filter((tab) => tab !== activeTab).map((tab) => (
          <div
            key={tab}
            role="tabpanel"
            id={`theory-panel-${tab}`}
            aria-labelledby={`theory-tab-${tab}`}
            hidden
          />
        ))}

        {/* Pied de page du modal */}
        <div className="flex min-h-14 flex-col items-stretch justify-between gap-2 border-t border-white/15 bg-[#070c16]/95 px-3 py-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-4 min-[360px]:px-4 min-[360px]:py-2.5 sm:px-7 lg:px-9">
          {onLeaveBusPermanently ? (
            <button
              type="button"
              ref={leaveButtonRef}
              onClick={() => setConfirmLeave(true)}
              className="min-h-11 rounded-lg px-2 text-left text-xs font-semibold text-white/60 underline-offset-4 transition hover:text-red-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              Se retirer définitivement du bus
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 cursor-pointer"
          >
            Fermer
          </button>
        </div>
        </div>

        {confirmLeave && (
          <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-[#020617]/55 p-2 backdrop-blur-[2px] min-[360px]:p-4" onClick={() => !leaving && closeLeaveConfirmation()}>
            <section
              ref={confirmDialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="leave-bus-title"
              aria-describedby="leave-bus-description"
              tabIndex={-1}
              className="w-full max-w-md rounded-xl border border-red-300/45 bg-[#101827] p-4 shadow-2xl min-[360px]:rounded-2xl min-[360px]:p-5 sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-red-200">Sortie définitive</p>
              <h3 ref={confirmTitleRef} tabIndex={-1} id="leave-bus-title" className="mt-2 text-xl font-black text-white focus:outline-none">Supprimer ta place du bus ?</h3>
              <p id="leave-bus-description" className="mt-3 text-sm leading-6 text-white/75">
                Ton prénom, ton commentaire et ta place seront supprimés de Cloudflare. Le compteur diminuera aussi. Le bouton normal « Sortir du bus » ne fait pas cela.
              </p>
              {leaveError && <p role="alert" className="mt-3 text-sm font-bold text-red-200">{leaveError}</p>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={leaving} onClick={closeLeaveConfirmation} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-bold text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">Annuler</button>
                <button type="button" disabled={leaving} onClick={() => void leavePermanently()} className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-black text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60">
                  {leaving ? "Suppression…" : "Supprimer ma place"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function TabButton({
  buttonRef,
  active,
  onClick,
  onKeyDown,
  tabId,
  panelId,
  icon,
  label,
  shortLabel,
}: {
  buttonRef: Ref<HTMLButtonElement>;
  active: boolean;
  onClick: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  tabId: string;
  panelId: string;
  icon: string;
  label: string;
  shortLabel: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      id={tabId}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      aria-label={label}
      tabIndex={active ? 0 : -1}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-2 text-xs font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-[0.98] min-[360px]:gap-2 min-[360px]:px-3 sm:flex-none sm:px-4 sm:text-sm ${
        active
          ? "border-[#ffd23f] bg-[#ffd23f] text-[#0c1322] shadow-md shadow-[#ffd23f]/15"
          : "border-white/15 bg-white/[0.035] text-white/80 hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
      }`}
    >
      {icon === "⚡" ? (
        <svg className="h-4 w-4 shrink-0 text-current" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.2 2 4.8 13.1h6.1L9.8 22l9.4-12.3h-6.4L13.2 2Z" />
        </svg>
      ) : (
        <span className="text-sm sm:text-base" aria-hidden="true">{icon}</span>
      )}
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
