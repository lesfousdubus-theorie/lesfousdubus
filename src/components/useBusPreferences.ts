"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_GRAPHICS_SETTINGS,
  sanitizeGraphicsSettings,
  type GraphicsPresetPreference,
  type GraphicsSettings,
} from "@/lib/scene-performance";

const GRAPHICS_SETTINGS_STORAGE_KEY = "fdb-graphics-settings";

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

function readGraphicsSettings(): GraphicsSettings {
  try {
    const raw = localStorage.getItem(GRAPHICS_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GRAPHICS_SETTINGS };
    return sanitizeGraphicsSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_GRAPHICS_SETTINGS };
  }
}

function writeGraphicsSettings(settings: GraphicsSettings) {
  try {
    localStorage.setItem(GRAPHICS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* La session reste utilisable sans stockage. */
  }
}

export function useBusPreferences() {
  const [letterShortcutsEnabled, setLetterShortcutsEnabled] = useSavedPreference("fdb-letter-shortcuts", true);
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(readGraphicsSettings);

  const updateGraphicsSettings = useCallback((patch: Partial<GraphicsSettings>) => {
    setGraphicsSettings((current) => {
      const next = sanitizeGraphicsSettings({ ...current, ...patch });
      writeGraphicsSettings(next);
      return next;
    });
  }, []);

  const selectGraphicsPreset = useCallback((preset: GraphicsPresetPreference) => {
    setGraphicsSettings((current) => {
      const next = sanitizeGraphicsSettings({
        ...current,
        preset,
        drawDistance: "auto",
        pixelQuality: "auto",
        shadows: "auto",
        worldDensity: "auto",
      });
      writeGraphicsSettings(next);
      return next;
    });
  }, []);

  const resetGraphicsSettings = useCallback(() => {
    const next = { ...DEFAULT_GRAPHICS_SETTINGS };
    setGraphicsSettings(next);
    writeGraphicsSettings(next);
  }, []);

  return {
    letterShortcutsEnabled,
    setLetterShortcutsEnabled,
    graphicsSettings,
    updateGraphicsSettings,
    selectGraphicsPreset,
    resetGraphicsSettings,
  };
}
