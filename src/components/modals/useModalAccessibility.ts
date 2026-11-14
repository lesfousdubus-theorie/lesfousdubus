"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

const MODAL_FOCUSABLE_SELECTOR = [
  "a[href]", "button:not([disabled])", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

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
    const wasInert = page?.inert ?? false;
    if (page) {
      page.inert = true;
    }
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (page) {
        page.inert = wasInert;
      }
      const previous = previouslyFocusedRef.current;
      const returnTarget = previous?.isConnected ? previous : fallbackReturnTarget;
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
    const focusable = Array.from(scope.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR));
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
