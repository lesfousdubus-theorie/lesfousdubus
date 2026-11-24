"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SITE_PAGE_TITLE,
  type Locale,
} from "./i18n-shared";

export * from "./i18n-shared";

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getServerLocale = (): Locale => DEFAULT_LOCALE;

export function getLocale(): Locale {
  return currentLocale;
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.title = SITE_PAGE_TITLE[locale];
}

export function setLocale(next: Locale) {
  if (currentLocale === next) return;
  currentLocale = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* Session stays usable without storage. */
    }
    applyDocumentLocale(next);
  }
  listeners.forEach((listener) => listener());
}

/** Reads saved language after React hydration so SSR and initial client markup never diverge. */
export function syncSavedLocale() {
  if (typeof window === "undefined") return;
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "en" || saved === "fr") {
      setLocale(saved);
    }
  } catch {
    /* Ignore storage errors. */
  }
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getServerLocale);
}
