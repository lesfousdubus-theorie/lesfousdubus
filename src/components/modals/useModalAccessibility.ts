"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

const MODAL_FOCUSABLE_SELECTOR = [
  "a[href]", "button:not([disabled])", "summary", "iframe", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

const backgroundLocks = new WeakMap<HTMLElement, { count: number; wasInert: boolean }>();
const handledEscapeEvents = new WeakSet<Event>();

const INTERACTIVE_TRIGGER_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "summary",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let lastTriggerRef: WeakRef<HTMLElement> | null = null;
let triggerListenersAttached = false;

function getLastTriggerElement(): HTMLElement | null {
  const element = lastTriggerRef?.deref() ?? null;
  return element && element.isConnected ? element : null;
}

function attachTriggerListeners() {
  if (triggerListenersAttached || typeof document === "undefined") return;
  triggerListenersAttached = true;

  const recordTrigger = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[role="dialog"], [role="alertdialog"]')) return;
    if (event.type === "pointerdown" && document.querySelector('[aria-modal="true"]')) return;

    const interactive = target.closest(INTERACTIVE_TRIGGER_SELECTOR);
    if (interactive instanceof HTMLElement) {
      lastTriggerRef = new WeakRef(interactive);
    } else if (event.type === "pointerdown") {
      lastTriggerRef = null;
    }
  };

  document.addEventListener("focusin", recordTrigger, true);
  document.addEventListener("pointerdown", recordTrigger, true);
  document.addEventListener("click", recordTrigger, true);
}

attachTriggerListeners();

function isVisible(element: HTMLElement) {
  return element.isConnected && element.getClientRects().length > 0
    && !element.closest("[hidden], [inert], [aria-hidden='true']")
    && getComputedStyle(element).visibility !== "hidden";
}

export function useModalAccessibility(
  isOpen: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null> = dialogRef,
  returnFocusRef?: RefObject<HTMLElement | null>,
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    attachTriggerListeners();
    if (!isOpen) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const activeTrigger =
      active && active !== document.body && active !== document.documentElement && active.isConnected
        ? active
        : null;
    const trackedTrigger = getLastTriggerElement();
    // Si le HUD est déjà passé en inert/invisible avant l'effet, document.activeElement
    // retombe sur body : on s'appuie alors sur le dernier déclencheur mémorisé.
    previouslyFocusedRef.current = activeTrigger ?? trackedTrigger;
    const fallbackReturnTarget = returnFocusRef?.current ?? trackedTrigger;
    const initialReturnElement = returnFocusRef?.current ?? null;
    const page = document.getElementById("site-content");
    if (page) {
      const lock = backgroundLocks.get(page) ?? { count: 0, wasInert: page.inert };
      lock.count += 1;
      backgroundLocks.set(page, lock);
      page.inert = true;
    }
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || handledEscapeEvents.has(event)) return;
      const modals = document.querySelectorAll('[aria-modal="true"]');
      if (!dialogRef.current || modals[modals.length - 1] !== dialogRef.current) return;
      handledEscapeEvents.add(event);
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener("keydown", handleDocumentKeyDown);
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      if (page) {
        const lock = backgroundLocks.get(page);
        if (lock && --lock.count === 0) {
          page.inert = lock.wasInert;
          backgroundLocks.delete(page);
        }
      }
      const previous = previouslyFocusedRef.current;
      // Attendre que le HUD réapparaisse après la fermeture ou qu'une autre
      // fenêtre ait pris le focus lors d'un passage liste → fiche.
      window.requestAnimationFrame(() => {
        const explicitReturn = initialReturnElement ?? fallbackReturnTarget;
        const returnTarget =
          previous && isVisible(previous)
            ? previous
            : explicitReturn && isVisible(explicitReturn)
              ? explicitReturn
              : trackedTrigger && isVisible(trackedTrigger)
                ? trackedTrigger
                : null;
        if (returnTarget && !document.querySelector('[aria-modal="true"]')) {
          returnTarget.focus({ preventScroll: true });
        }
      });
      previouslyFocusedRef.current = null;
    };
  }, [dialogRef, initialFocusRef, isOpen, returnFocusRef]);

  return useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      handledEscapeEvents.add(event.nativeEvent);
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const scope = dialogRef.current;
    if (!scope) return;
    const focusable = Array.from(scope.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR)).filter(isVisible);
    if (focusable.length === 0) {
      event.preventDefault();
      scope.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !scope.contains(active) || !focusable.includes(active as HTMLElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !scope.contains(active) || !focusable.includes(active as HTMLElement))) {
      event.preventDefault();
      first.focus();
    }
  }, [dialogRef]);
}
