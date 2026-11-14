"use client";

import { useEffect } from "react";

/** Keep dialogs inside the visible screen when the mobile keyboard opens. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--bus-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
        root.style.setProperty("--bus-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--bus-viewport-height");
      root.style.removeProperty("--bus-viewport-top");
    };
  }, []);
}
