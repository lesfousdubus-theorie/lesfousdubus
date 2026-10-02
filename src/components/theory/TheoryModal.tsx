"use client";

import { useCallback, useRef, type KeyboardEvent, type Ref } from "react";
import { createPortal } from "react-dom";
import TheoryPanelContent, { type TheoryTab } from "./TheoryPanelContent";
import { useModalAccessibility } from "../modals/useModalAccessibility";
import { ModalCloseButton } from "../modals/ModalCloseButton";

const THEORY_TABS: TheoryTab[] = ["thesis", "video", "faq", "participate"];

export default function TheoryModal({ isOpen, onClose, activeTab, visitedTabs, onTabChange }: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TheoryTab;
  visitedTabs: TheoryTab[];
  onTabChange: (tab: TheoryTab) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const handleDialogKeyDown = useModalAccessibility(isOpen, onClose, dialogRef, titleRef);
  const handleTabKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % THEORY_TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + THEORY_TABS.length) % THEORY_TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = THEORY_TABS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    onTabChange(THEORY_TABS[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }, [onTabChange]);

  // Garder les panneaux visités préserve le défilement, les cartes et la vidéo.
  return createPortal(
    <div ref={dialogRef} role={isOpen ? "dialog" : undefined} aria-modal={isOpen ? true : undefined} aria-hidden={!isOpen} aria-labelledby="theory-modal-title" hidden={!isOpen} tabIndex={-1}
      className={`theory-modal-backdrop pointer-events-auto fixed inset-0 z-[2147483647] ${isOpen ? "flex" : "hidden"} items-center justify-center bg-[#030712]/90 backdrop-blur-sm`}
      onClick={(event) => event.target === event.currentTarget && onClose()} onKeyDown={handleDialogKeyDown} onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
      <div className="theory-modal-window relative flex h-[min(92dvh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#ffd23f]/30 bg-[#0b1220] text-white shadow-2xl select-text min-[360px]:rounded-2xl" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-white/15 bg-[#070c16] px-3 py-3 sm:px-7 lg:px-9">
          <div className="min-w-0">
            <h2 ref={titleRef} tabIndex={-1} id="theory-modal-title" className="text-base font-black leading-tight text-[#ffd23f] focus:outline-none sm:text-xl lg:text-2xl">La Théorie des Fous du Bus</h2>
            <p className="mt-1 text-xs font-semibold text-white/80 sm:text-sm">Le Siècle Oublié est le Présent</p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>
        <div role="tablist" aria-label="Sections de la théorie" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/15 bg-[#080e19] px-2 py-2 no-scrollbar sm:gap-2 sm:px-7 lg:px-9">
          {([
            ["thesis", "⚡", "La Théorie", "Théorie"],
            ["video", "📺", "Vidéo du Mont Corvo", "Vidéo"],
            ["faq", "❓", "FAQ & Origine", "FAQ"],
            ["participate", "🤝", "Participer au site", "Participer"],
          ] as const).map(([tab, icon, label, shortLabel], index) => <TabButton key={tab} buttonRef={(element) => { tabRefs.current[index] = element; }} active={activeTab === tab} onClick={() => onTabChange(tab)} onKeyDown={(event) => handleTabKeyDown(event, index)} tabId={`theory-tab-${tab}`} panelId={`theory-panel-${tab}`} icon={icon} label={label} shortLabel={shortLabel} />)}
        </div>
        {THEORY_TABS.map((tab) => <div key={tab} role="tabpanel" id={`theory-panel-${tab}`} aria-labelledby={`theory-tab-${tab}`} hidden={tab !== activeTab} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd23f] min-[360px]:px-4 min-[360px]:py-5 sm:px-8 sm:py-7 lg:px-10">
          {visitedTabs.includes(tab) && <TheoryPanelContent activeTab={tab} isActive={isOpen && activeTab === tab} />}
        </div>)}
        <footer className="flex shrink-0 items-center justify-end border-t border-white/15 bg-[#070c16] px-3 py-2 sm:px-7 lg:px-9">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] hover:bg-white/10">Fermer</button>
        </footer>
      </div>
    </div>, document.body,
  );
}

function TabButton({ buttonRef, active, onClick, onKeyDown, tabId, panelId, icon, label, shortLabel }: {
  buttonRef: Ref<HTMLButtonElement>;
  active: boolean;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  tabId: string;
  panelId: string;
  icon: string;
  label: string;
  shortLabel: string;
}) {
  return <button ref={buttonRef} type="button" onClick={onClick} onKeyDown={onKeyDown} id={tabId} role="tab" aria-selected={active} aria-controls={panelId} aria-label={label} tabIndex={active ? 0 : -1} className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${active ? "border-[#ffd23f] bg-[#ffd23f] text-[#0c1322]" : "border-white/25 bg-white/5 text-white/90 hover:bg-white/10"}`}>
    <span aria-hidden="true" className="hidden text-sm min-[360px]:inline sm:text-base">{icon}</span>
    <span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{label}</span>
  </button>;
}
