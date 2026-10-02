"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

const MODAL_FOCUSABLE_SELECTOR = [
  "a[href]", "button:not([disabled])", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
  "summary", "iframe",
].join(",");

const activeModalPages = new WeakMap<HTMLElement, { count: number; wasInert: boolean }>();

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
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallbackReturnTarget = returnFocusRef?.current ?? null;
    const page = document.getElementById("site-content");
    if (page) {
      const modalPage = activeModalPages.get(page) ?? { count: 0, wasInert: page.inert ?? false };
      modalPage.count += 1;
      activeModalPages.set(page, modalPage);
      page.inert = true;
    }
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (page) {
        const modalPage = activeModalPages.get(page);
        if (modalPage && --modalPage.count === 0) {
          page.inert = modalPage.wasInert;
          activeModalPages.delete(page);
        }
      }
      const previous = previouslyFocusedRef.current;
      const canReturnToPrevious = previous?.isConnected && previous !== document.body
        && previous.getClientRects().length > 0
        && !previous.closest("[hidden], [inert]")
        && getComputedStyle(previous).visibility !== "hidden";
      const returnTarget = canReturnToPrevious ? previous : fallbackReturnTarget;
      returnTarget?.focus({ preventScroll: true });
      previouslyFocusedRef.current = null;
    };
  }, [initialFocusRef, isOpen, returnFocusRef]);

  return useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const scope = dialogRef.current;
    if (!scope) return;
    const focusable = Array.from(scope.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR))
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden" && !element.closest("[hidden], [inert]"));
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
