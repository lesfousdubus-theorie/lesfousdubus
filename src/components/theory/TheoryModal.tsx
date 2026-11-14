"use client";

import {
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import TheoryPanelContent, { type TheoryTab } from "./TheoryPanelContent";
import { ModalCloseButton } from "../modals/ModalCloseButton";
import { useModalAccessibility } from "../modals/useModalAccessibility";
import {
  FastBoltIcon,
  HandshakeIcon,
  HelpCircleIcon,
  ScrollIcon,
  TvIcon,
} from "../ui/BusIcons";

interface TheoryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onVideoPlaybackChange?: (active: boolean) => void;
  onManagePlace?: () => void;
}

const THEORY_TABS: TheoryTab[] = ["thesis", "video", "faq", "participate"];

export default function TheoryModal({ isOpen: externalIsOpen, onClose, onVideoPlaybackChange, onManagePlace }: TheoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TheoryTab>("thesis");
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollPositions = useRef<Partial<Record<TheoryTab, number>>>({});

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  }, [onClose]);

  const selectTab = useCallback((tab: TheoryTab) => {
    scrollPositions.current[activeTab] = contentRef.current?.scrollTop ?? 0;
    setActiveTab(tab);
  }, [activeTab]);

  const handleDialogKeyDown = useModalAccessibility(isOpen, handleClose, dialogRef, dialogTitleRef);

  const selectTabFromKeyboard = useCallback((index: number) => {
    const tab = THEORY_TABS[index];
    if (!tab) return;
    selectTab(tab);
    tabRefs.current[index]?.focus();
  }, [selectTab]);

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

  // Retrouver sa lecture en revenant d'un autre onglet.
  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ top: scrollPositions.current[activeTab] ?? 0 });
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theory-modal-title"
      tabIndex={-1}
      className="theory-modal-backdrop pointer-events-auto fixed inset-0 z-[999999] flex items-center justify-center bg-[#020617]/85 backdrop-blur-md"
      onClick={handleClose}
      onKeyDown={handleDialogKeyDown}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="theory-modal-window relative flex h-[calc(100dvh-0.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.75)] select-text min-[360px]:h-[calc(100dvh-1rem)] min-[360px]:rounded-2xl sm:h-[min(92dvh,900px)]"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-[64px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-3 py-2.5 min-[360px]:gap-4 min-[360px]:px-4 min-[360px]:py-3 sm:min-h-[76px] sm:px-7 sm:py-4 lg:px-9">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f] sm:h-11 sm:w-11" aria-hidden="true">
                <ScrollIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div className="min-w-0">
                <h2 ref={dialogTitleRef} tabIndex={-1} id="theory-modal-title" className="text-sm font-black leading-tight uppercase tracking-[0.025em] text-[#ffd23f] focus:outline-none sm:text-xl sm:tracking-[0.04em] lg:text-2xl">
                  La Théorie des Fous du Bus
                </h2>
                <p className="mt-1 text-xs font-semibold leading-snug text-[#dce7ff] sm:uppercase sm:tracking-[0.1em]">
                  Le Siècle Oublié est le Présent
                </p>
              </div>
            </div>
            <ModalCloseButton onClick={handleClose} />
          </div>

          <div role="tablist" aria-label="Sections de la théorie" className="grid shrink-0 grid-cols-4 items-center gap-1 border-b border-white/10 bg-[#040b18]/75 px-2 py-2 no-scrollbar min-[360px]:px-3 min-[360px]:py-2.5 sm:flex sm:gap-2 sm:px-7 lg:px-9">
            <TabButton
              buttonRef={(element) => { tabRefs.current[0] = element; }}
              active={activeTab === "thesis"}
              onClick={() => selectTab("thesis")}
              onKeyDown={(event) => handleTabKeyDown(event, 0)}
              tabId="theory-tab-thesis"
              panelId="theory-panel-thesis"
              icon={<FastBoltIcon className="hidden h-4 w-4 shrink-0 text-current sm:block" />}
              label="La Théorie"
              shortLabel="Théorie"
            />
            <TabButton
              buttonRef={(element) => { tabRefs.current[1] = element; }}
              active={activeTab === "video"}
              onClick={() => selectTab("video")}
              onKeyDown={(event) => handleTabKeyDown(event, 1)}
              tabId="theory-tab-video"
              panelId="theory-panel-video"
              icon={<TvIcon className="hidden h-4 w-4 shrink-0 text-current sm:block" />}
              label="Vidéo du Mont Corvo"
              shortLabel="Vidéo"
            />
            <TabButton
              buttonRef={(element) => { tabRefs.current[2] = element; }}
              active={activeTab === "faq"}
              onClick={() => selectTab("faq")}
              onKeyDown={(event) => handleTabKeyDown(event, 2)}
              tabId="theory-tab-faq"
              panelId="theory-panel-faq"
              icon={<HelpCircleIcon className="hidden h-4 w-4 shrink-0 text-current sm:block" />}
              label="FAQ & Origine"
              shortLabel="FAQ"
            />
            <TabButton
              buttonRef={(element) => { tabRefs.current[3] = element; }}
              active={activeTab === "participate"}
              onClick={() => selectTab("participate")}
              onKeyDown={(event) => handleTabKeyDown(event, 3)}
              tabId="theory-tab-participate"
              panelId="theory-panel-participate"
              icon={<HandshakeIcon className="hidden h-4 w-4 shrink-0 text-current sm:block" />}
              label="Participer au site"
              shortLabel="Participer"
            />
          </div>

          <div
            ref={contentRef}
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top_left,rgba(255,210,63,0.05),transparent_32rem)] px-3 py-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd23f] min-[360px]:px-4 min-[360px]:py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10"
          >
            {THEORY_TABS.map((tab) => (
              <div key={tab} role="tabpanel" id={`theory-panel-${tab}`} aria-labelledby={`theory-tab-${tab}`} hidden={tab !== activeTab}>
                {(tab !== "video" || activeTab === "video") && <TheoryPanelContent activeTab={tab} onVideoPlaybackChange={onVideoPlaybackChange} />}
              </div>
            ))}
          </div>

          {/* Pied de page du modal */}
          <div className="flex min-h-14 shrink-0 flex-col items-stretch justify-between gap-2 border-t border-white/10 bg-[#040b18]/90 px-3 py-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-4 min-[360px]:px-4 min-[360px]:py-2.5 sm:px-7 lg:px-9">
            {onManagePlace ? (
              <button
                type="button"
                onClick={onManagePlace}
                className="min-h-11 cursor-pointer rounded-lg px-2 text-left text-xs font-semibold text-[#dce7ff] underline decoration-[#ffd23f]/50 underline-offset-4 transition-colors hover:text-[#ffd23f] hover:decoration-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transition-none"
              >
                Gérer ma place
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 cursor-pointer rounded-lg border border-white/20 bg-[#0c1b3a] px-4 py-2 text-sm font-bold text-[#dce7ff] transition hover:border-[#ffd23f]/50 hover:bg-[#10265c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
            >
              Fermer
            </button>
          </div>
        </div>
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
  icon: ReactNode;
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
      className={`flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1 py-2 text-xs font-black transition-[background-color,border-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${
        active
          ? "border-[#ffd23f] bg-[#ffd23f] text-[#091c5c] shadow-md shadow-[#ffd23f]/20"
          : "border-white/15 bg-[#0c1b3a]/70 text-[#dce7ff] hover:border-[#ffd23f]/45 hover:bg-[#0c1b3a] hover:text-white"
      }`}
    >
      {icon}
      <span className="lg:hidden">{shortLabel}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
