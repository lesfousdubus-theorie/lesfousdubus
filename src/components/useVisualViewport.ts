"use client";

import { useEffect } from "react";

/** Le clavier mobile réduit le viewport visuel, même lorsque 100dvh reste inchangé. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--bus-viewport-height", `${viewport.height}px`);
      root.style.setProperty("--bus-viewport-top", `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--bus-viewport-height");
      root.style.removeProperty("--bus-viewport-top");
    };
  }, []);
}
