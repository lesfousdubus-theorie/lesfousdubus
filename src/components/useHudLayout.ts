"use client";

import { useLayoutEffect, useRef } from "react";
import type { Phase } from "./bus/constants";

export function useHudLayout(phase: Phase, hidden: boolean, showVolumePopup: boolean, sceneAvailable: boolean) {
  const hudRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<(() => void) | null>(null);

  // Arrange the HUD from its rendered sizes, including changing labels and controls.
  // Observe layout changes rather than measuring on every 3D frame.
  useLayoutEffect(() => {
    const hud = hudRef.current;
    if (!hud) return;
    const headers = [...hud.querySelectorAll<HTMLElement>(".bus-title-panel, .bus-top-stats, .bus-row-nav")];
    const controls = [...hud.querySelectorAll<HTMLElement>(".bus-exterior-controls, .bus-interior-controls, .bus-day-night, .bus-speed")];
    const popup = hud.querySelector<HTMLElement>(".bus-volume-popup");
    const visible = (element: HTMLElement) => {
      if (element.closest('[aria-hidden="true"]')) return false;
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.01;
    };
    const measure = () => {
      const stats = hud.querySelector<HTMLElement>(".bus-top-stats");
      const row = hud.querySelector<HTMLElement>(".bus-row-nav");
      const title = hud.querySelector<HTMLElement>(".bus-title-panel");
      const viewport = hud.getBoundingClientRect();
      const compactLandscape = window.matchMedia("(orientation: landscape) and (max-height: 520px)").matches;
      if (stats && row) {
        hud.style.setProperty("--bus-row-top", `${stats.getBoundingClientRect().bottom + 12}px`);
      }
      if (stats && title) {
        const statsRect = stats.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        let titleTop = titleRect.right + 12 <= statsRect.left ? statsRect.top : statsRect.bottom + 12;
        if (row) {
          const rowRect = row.getBoundingClientRect();
          if (titleRect.right + 12 > rowRect.left && titleTop + titleRect.height + 12 > rowRect.top) {
            titleTop = rowRect.bottom + 12;
          }
        }
        hud.style.setProperty("--bus-title-top", `${titleTop}px`);
      }
      const actions = controls.filter(element => element.matches(".bus-exterior-controls, .bus-interior-controls")
        && element.getAttribute("aria-hidden") !== "true");
      const utilities = hud.querySelector<HTMLElement>(".bus-day-night");
      const speed = hud.querySelector<HTMLElement>(".bus-speed");
      if (sceneAvailable && utilities && speed && actions.length) {
        // Read the speed control's intrinsic width before stretching it on narrow screens.
        hud.dataset.bottomLayout = "inline";
        const u = utilities.getBoundingClientRect();
        const s = speed.getBoundingClientRect();
        const a = actions[0].getBoundingClientRect();
        const available = s.right - u.left;
        const gap = 12;
        const bottomInset = viewport.bottom - s.bottom;
        const fitAll = u.width + a.width + s.width + gap * 2 <= available;
        const fitUtilities = u.width + s.width + gap <= available;
        const utilitiesBottom = bottomInset + (fitUtilities ? 0 : s.height + gap);
        const actionsBottom = fitAll ? bottomInset : utilitiesBottom + Math.max(u.height, s.height) + gap;
        hud.dataset.bottomLayout = fitAll ? "inline" : fitUtilities ? "split" : "stacked";
        hud.style.setProperty("--bus-utilities-bottom", `${utilitiesBottom}px`);
        hud.style.setProperty("--bus-actions-bottom", `${actionsBottom}px`);
        hud.style.setProperty("--bus-utilities-width", `${u.width}px`);
        hud.style.setProperty("--bus-speed-width", `${s.width}px`);
      }
      const volumeButton = hud.querySelector<HTMLElement>(".bus-volume-toggle");
      if (actions.length && volumeButton && visible(volumeButton)) {
        const actionsTop = Math.min(...actions.map(element => element.getBoundingClientRect().top));
        const offset = volumeButton.getBoundingClientRect().bottom - actionsTop + 12;
        hud.style.setProperty("--bus-volume-bottom", `${Math.max(56, offset)}px`);
      }
      const leftInset = Math.max(12, title?.getBoundingClientRect().left ?? 0);
      const rightInset = Math.max(12, viewport.right - (stats?.getBoundingClientRect().right ?? viewport.right));
      const availableWidth = viewport.width - leftInset - rightInset;
      let width = Math.min(448, availableWidth);
      let left = leftInset + (availableWidth - width) / 2;
      if (compactLandscape && row) {
        width = Math.min(width, row.getBoundingClientRect().left - leftInset - 12);
        left = leftInset;
      }
      // On short screens the volume and notification can share the free space side by side.
      if (compactLandscape && popup && visible(popup)) {
        const p = popup.getBoundingClientRect();
        const freeRight = viewport.width - p.right - rightInset - 12;
        const freeLeft = p.left - leftInset - 12;
        if (Math.max(freeRight, freeLeft) >= 200) {
          width = Math.min(448, Math.max(freeRight, freeLeft));
          left = freeRight >= freeLeft ? p.right + 12 : leftInset;
        }
      }
      const headerBottoms = headers.filter(visible).map(element => element.getBoundingClientRect())
        .filter(rect => rect.right > left && rect.left < left + width).map(rect => rect.bottom);
      const top = Math.max(0, ...headerBottoms) + 12;
      const bottom = Math.min(viewport.bottom, ...controls.filter(visible).map(element => element.getBoundingClientRect().top)) - 12;
      hud.style.setProperty("--bus-toast-left", `${left}px`);
      hud.style.setProperty("--bus-toast-width", `${width}px`);
      hud.style.setProperty("--bus-toast-top", `${top}px`);
      hud.style.setProperty("--bus-toast-max-height", `${Math.max(0, bottom - top)}px`);
    };
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    const observer = new ResizeObserver(schedule);
    [hud, ...headers, ...controls, ...(popup ? [popup] : [])].forEach(element => observer.observe(element));
    window.addEventListener("resize", measure);
    measureRef.current = measure;
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
      measureRef.current = null;
    };
  }, [phase, hidden, showVolumePopup, sceneAvailable]);

  // Labels such as Auto/Manuel and the music badge can change the available space.
  // Arrange them in the same React commit, before the updated controls are painted.
  useLayoutEffect(() => {
    measureRef.current?.();
  });

  return hudRef;
}
