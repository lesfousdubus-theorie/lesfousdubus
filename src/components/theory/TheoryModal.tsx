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
import { pickLocale, setLocale, useLocale } from "@/lib/i18n";
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
}

const THEORY_TABS: TheoryTab[] = ["thesis", "video", "faq", "participate"];

export default function TheoryModal({
  isOpen: externalIsOpen,
  onClose,
  onVideoPlaybackChange,
}: TheoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TheoryTab>("thesis");
  const [videoMounted, setVideoMounted] = useState(activeTab === "video");
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollPositions = useRef<Partial<Record<TheoryTab, number>>>({});
  const locale = useLocale();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

  const handleClose = useCallback(() => {
    if (activeTab !== "video") {
      setVideoMounted(false);
    }
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  }, [activeTab, onClose]);

  const selectTab = useCallback((tab: TheoryTab) => {
    scrollPositions.current[activeTab] = contentRef.current?.scrollTop ?? 0;
    if (tab === "video") setVideoMounted(true);
    setActiveTab(tab);
    const index = THEORY_TABS.indexOf(tab);
    tabRefs.current[index]?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
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
      className="theory-modal-backdrop pointer-events-auto fixed inset-0 z-[999999] flex items-center justify-center bg-[#030617]/85 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={handleDialogKeyDown}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="theory-modal-window bus-case-solid relative flex h-[calc(100dvh-0.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl text-white shadow-[0_24px_64px_rgba(2,4,18,0.75)] select-text min-[360px]:h-[calc(100dvh-1rem)] min-[360px]:rounded-2xl sm:h-[min(92dvh,900px)]"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="bus-case-header flex min-h-[64px] shrink-0 items-center justify-between gap-2 px-3 py-2.5 min-[360px]:gap-4 min-[360px]:px-4 min-[360px]:py-3 sm:min-h-[76px] sm:px-7 sm:py-4 lg:px-9">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="bus-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11" aria-hidden="true">
                <ScrollIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div className="min-w-0">
                <h2 ref={dialogTitleRef} tabIndex={-1} id="theory-modal-title" className="text-sm font-black leading-tight uppercase tracking-[0.025em] text-[#c4b5fd] focus:outline-none sm:text-xl sm:tracking-[0.04em] lg:text-2xl">
                  {pickLocale(locale, "La Théorie des Fous du Bus", "The Bus Fools Theory")}
                </h2>
                <p className="mt-1 text-xs font-semibold leading-snug text-[#dfe5ff] sm:uppercase sm:tracking-[0.1em]">
                  {pickLocale(locale, "Le Siècle Oublié est le Présent", "The Void Century is the Present")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div
                role="group"
                aria-label={pickLocale(locale, "Langue du site", "Site language")}
                className="inline-flex h-11 items-center rounded-full border border-[#947eef]/35 bg-[#04071c]/90 p-1"
              >
                {(["fr", "en"] as const).map((code) => {
                  const active = locale === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLocale(code)}
                      aria-pressed={active}
                      aria-label={code === "fr" ? "Français" : "English"}
                      className={`h-9 min-w-[2.5rem] cursor-pointer rounded-full px-2.5 text-xs font-extrabold uppercase tracking-wide transition-colors focus-visible:outline-none ${
                        active
                          ? "bus-btn-active text-white"
                          : "text-[#b4bfe8] hover:text-white"
                      }`}
                    >
                      {code.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <ModalCloseButton onClick={handleClose} />
            </div>
          </div>

          <div role="tablist" aria-label={pickLocale(locale, "Sections de la théorie", "Theory sections")} className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#947eef]/20 bg-[#04071c]/85 px-2 py-2 no-scrollbar min-[360px]:px-3 min-[360px]:py-2.5 sm:gap-2 sm:px-7 lg:px-9">
            <TabButton
              buttonRef={(element) => { tabRefs.current[0] = element; }}
              active={activeTab === "thesis"}
              onClick={() => selectTab("thesis")}
              onKeyDown={(event) => handleTabKeyDown(event, 0)}
              tabId="theory-tab-thesis"
              panelId="theory-panel-thesis"
              icon={<FastBoltIcon className="hidden h-4 w-4 shrink-0 text-current sm:block" />}
              label={pickLocale(locale, "La Théorie", "The Theory")}
              shortLabel={pickLocale(locale, "Théorie", "Theory")}
            />
            <TabButton
              buttonRef={(element) => { tabRefs.current[1] = element; }}
              active={activeTab === "video"}
              onClick={() => selectTab("video")}
              onKeyDown={(event) => handleTabKeyDown(event, 1)}
              tabId="theory-tab-video"
              panelId="theory-panel-video"
              icon={<TvIcon className="hidden h-4 w-4 shrink-0 text-current sm:block" />}
              label={pickLocale(locale, "Vidéo du Mont Corvo", "Le Mont Corvo Video")}
              shortLabel={pickLocale(locale, "Vidéo", "Video")}
            />
            <TabButton
              buttonRef={(element) => { tabRefs.current[2] = element; }}
              active={activeTab === "faq"}
              onClick={() => selectTab("faq")}
              onKeyDown={(event) => handleTabKeyDown(event, 2)}
              tabId="theory-tab-faq"
              panelId="theory-panel-faq"
              icon={<HelpCircleIcon className="hidden h-4 w-4 shrink-0 text-current sm:block" />}
              label={pickLocale(locale, "FAQ & Origine", "FAQ & Origin")}
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
              label={pickLocale(locale, "Participer au site", "Contribute")}
              shortLabel={pickLocale(locale, "Participer", "Contribute")}
            />
          </div>

          <div
            ref={contentRef}
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top_left,rgba(122,58,236,0.08),transparent_32rem)] px-3 py-4 text-sm leading-relaxed focus-visible:outline-none min-[360px]:px-4 min-[360px]:py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10"
          >
            {THEORY_TABS.map((tab) => (
              <div key={tab} role="tabpanel" id={`theory-panel-${tab}`} aria-labelledby={`theory-tab-${tab}`} hidden={tab !== activeTab}>
                {(tab !== "video" || videoMounted || activeTab === "video") && (
                  <TheoryPanelContent
                    activeTab={tab}
                    videoActive={tab === "video" ? isOpen && activeTab === "video" : undefined}
                    videoMounted={tab === "video" ? videoMounted || activeTab === "video" : undefined}
                    onVideoPlaybackChange={onVideoPlaybackChange}
                  />
                )}
              </div>
            ))}
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
      className={`flex min-h-11 shrink-0 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[11px] font-semibold focus-visible:outline-none motion-reduce:transition-none min-[360px]:px-3 min-[360px]:text-xs sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${
        active ? "bus-btn-active" : "bus-btn-secondary"
      }`}
    >
      {icon}
      <span className="lg:hidden">{shortLabel}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
