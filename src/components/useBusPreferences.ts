"use client";

import { useCallback, useState } from "react";

function readPreference(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value === "true" ? true : value === "false" ? false : fallback;
  } catch {
    return fallback;
  }
}

function useSavedPreference(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => readPreference(key, fallback));
  const save = useCallback((next: boolean) => {
    setValue(next);
    try { localStorage.setItem(key, String(next)); } catch { /* La session reste utilisable sans stockage. */ }
  }, [key]);
  return [value, save] as const;
}

export function useBusPreferences() {
  const [letterShortcutsEnabled, setLetterShortcutsEnabled] = useSavedPreference("fdb-letter-shortcuts", true);
  const [sceneryPaused, setSceneryPaused] = useSavedPreference("fdb-scenery-paused", false);
  return { letterShortcutsEnabled, setLetterShortcutsEnabled, sceneryPaused, setSceneryPaused };
}
