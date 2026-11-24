"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { pickLocale, useLocale, type Locale } from "@/lib/i18n";
import {
  DEFAULT_GRAPHICS_SETTINGS,
  isDefaultGraphicsSettings,
  resolveGraphicsProfile,
  type DrawDistancePreference,
  type GraphicsPresetPreference,
  type GraphicsQualityTier,
  type GraphicsSettings,
  type PixelQualityPreference,
  type SceneGraphicsTelemetry,
  type ShadowQualityPreference,
} from "@/lib/scene-performance";

interface TheorySettingsPanelProps {
  graphicsSettings: GraphicsSettings;
  telemetry?: SceneGraphicsTelemetry | null;
  onSelectPreset: (preset: GraphicsPresetPreference) => void;
  onUpdateGraphics: (patch: Partial<GraphicsSettings>) => void;
  onResetGraphics: () => void;
}

interface SliderOption<T extends string> {
  value: T;
  label: string;
  labelEn: string;
}

const TIER_LABELS: Record<Locale, Record<GraphicsQualityTier, string>> = {
  fr: {
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
    ultra: "Ultra",
  },
  en: {
    low: "Low",
    medium: "Medium",
    high: "High",
    ultra: "Ultra",
  },
};

const PRESET_OPTIONS: SliderOption<GraphicsPresetPreference>[] = [
  { value: "auto", label: "Auto", labelEn: "Auto" },
  { value: "low", label: "Faible", labelEn: "Low" },
  { value: "medium", label: "Moyenne", labelEn: "Medium" },
  { value: "high", label: "Élevée", labelEn: "High" },
  { value: "ultra", label: "Ultra", labelEn: "Ultra" },
];

const DRAW_DISTANCE_OPTIONS: SliderOption<DrawDistancePreference>[] = [
  { value: "auto", label: "Auto", labelEn: "Auto" },
  { value: "near", label: "Courte", labelEn: "Short" },
  { value: "medium", label: "Moyenne", labelEn: "Medium" },
  { value: "far", label: "Étendue", labelEn: "Far" },
  { value: "max", label: "Max", labelEn: "Max" },
];

const PIXEL_QUALITY_OPTIONS: SliderOption<PixelQualityPreference>[] = [
  { value: "auto", label: "Auto", labelEn: "Auto" },
  { value: "eco", label: "Basse", labelEn: "Low" },
  { value: "standard", label: "Normale", labelEn: "Normal" },
  { value: "sharp", label: "Haute", labelEn: "High" },
  { value: "native", label: "Max", labelEn: "Max" },
];

const SHADOW_OPTIONS: SliderOption<ShadowQualityPreference>[] = [
  { value: "auto", label: "Auto", labelEn: "Auto" },
  { value: "off", label: "Aucune", labelEn: "Off" },
  { value: "basic", label: "Simples", labelEn: "Simple" },
  { value: "standard", label: "Normales", labelEn: "Normal" },
  { value: "high", label: "Hautes", labelEn: "High" },
];

function optionLabel<T extends string>(options: SliderOption<T>[], value: T, locale: Locale) {
  const item = options.find((entry) => entry.value === value);
  if (!item) return value;
  return locale === "en" ? item.labelEn : item.label;
}

export default function TheorySettingsPanel({
  graphicsSettings,
  telemetry = null,
  onSelectPreset,
  onUpdateGraphics,
  onResetGraphics,
}: TheorySettingsPanelProps) {
  const locale = useLocale();
  const [draft, setDraft] = useState<GraphicsSettings>(graphicsSettings);
  const draftRef = useRef<GraphicsSettings>(graphicsSettings);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const commitDraft = useCallback((nextDraft: GraphicsSettings) => {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const latest = draftRef.current;
      if (latest.preset !== graphicsSettings.preset && latest.drawDistance === "auto" && latest.pixelQuality === "auto" && latest.shadows === "auto" && latest.worldDensity === "auto") {
        onSelectPreset(latest.preset);
      } else {
        onUpdateGraphics(latest);
      }
    }, 160);
  }, [graphicsSettings.preset, onSelectPreset, onUpdateGraphics]);

  const handleReset = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const reset = { ...DEFAULT_GRAPHICS_SETTINGS };
    draftRef.current = reset;
    setDraft(reset);
    onResetGraphics();
  }, [onResetGraphics]);

  const recommendedTier = telemetry?.recommendedTier ?? "medium";
  const activeTier = telemetry?.activeTier
    ?? (draft.preset === "auto" ? recommendedTier : draft.preset);
  const resolvedProfile = resolveGraphicsProfile(draft, activeTier, 1);
  const isDefault = isDefaultGraphicsSettings(draft);

  return (
    <div className="space-y-2">
      <SettingSlider
        label={pickLocale(locale, "Qualité globale", "Overall quality")}
        locale={locale}
        value={draft.preset}
        autoHint={TIER_LABELS[locale][activeTier]}
        options={PRESET_OPTIONS}
        onChange={(preset) => commitDraft({
          ...draftRef.current,
          preset,
          drawDistance: "auto",
          pixelQuality: "auto",
          shadows: "auto",
          worldDensity: "auto",
        })}
      />
      <SettingSlider
        label={pickLocale(locale, "Distance d’affichage", "Draw distance")}
        locale={locale}
        value={draft.drawDistance}
        autoHint={optionLabel(DRAW_DISTANCE_OPTIONS, resolvedProfile.drawDistance, locale)}
        options={DRAW_DISTANCE_OPTIONS}
        onChange={(drawDistance) => commitDraft({ ...draftRef.current, drawDistance })}
      />
      <SettingSlider
        label={pickLocale(locale, "Résolution", "Resolution")}
        locale={locale}
        value={draft.pixelQuality}
        autoHint={optionLabel(PIXEL_QUALITY_OPTIONS, resolvedProfile.pixelQuality, locale)}
        options={PIXEL_QUALITY_OPTIONS}
        onChange={(pixelQuality) => commitDraft({ ...draftRef.current, pixelQuality })}
      />
      <SettingSlider
        label={pickLocale(locale, "Ombres", "Shadows")}
        locale={locale}
        value={draft.shadows}
        autoHint={optionLabel(SHADOW_OPTIONS, resolvedProfile.shadows, locale)}
        options={SHADOW_OPTIONS}
        onChange={(shadows) => commitDraft({ ...draftRef.current, shadows })}
      />

      <button
        type="button"
        disabled={isDefault}
        onClick={handleReset}
        className={`flex min-h-11 w-full items-center justify-center rounded-full px-4 py-2 text-xs font-semibold focus-visible:outline-none ${
          isDefault
            ? "cursor-not-allowed border border-white/15 bg-[#04071c]/75 text-[#9aa6d6]"
            : "bus-btn-tonal cursor-pointer"
        }`}
      >
        {pickLocale(locale, "Réinitialiser (Auto)", "Reset (Auto)")}
      </button>
    </div>
  );
}

function SettingSlider<T extends string>({
  label,
  locale,
  value,
  autoHint,
  options,
  onChange,
}: {
  label: string;
  locale: Locale;
  value: T;
  autoHint: string;
  options: SliderOption<T>[];
  onChange: (value: T) => void;
}) {
  const inputId = useId();
  const currentIndex = Math.max(0, options.findIndex((item) => item.value === value));
  const currentLabel = value === "auto" ? `Auto · ${autoHint}` : optionLabel(options, value, locale);

  return (
    <div className="bus-case-inset rounded-xl px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={inputId} className="font-bold text-white">
          {label}
        </label>
        <span className="font-semibold tabular-nums text-[#c4b5fd]">
          {currentLabel}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={0}
        max={options.length - 1}
        step={1}
        value={currentIndex}
        aria-valuetext={currentLabel}
        onChange={(event) => {
          const next = options[Number(event.target.value)];
          if (next) onChange(next.value);
        }}
        className="bus-range mt-1.5 h-4 w-full cursor-pointer focus-visible:outline-none"
      />
      <div aria-hidden="true" className="relative mt-0.5 h-1.5">
        {options.map((item, index) => {
          const ratio = options.length > 1 ? index / (options.length - 1) : 0;
          return (
            <span
              key={item.value}
              style={{ left: `calc(9px + (100% - 18px) * ${ratio})` }}
              className={`absolute top-0 h-1.5 w-0.5 -translate-x-1/2 rounded-full transition-colors ${
                index === currentIndex ? "bg-[#c4b5fd]" : "bg-white/25"
              }`}
            />
          );
        })}
      </div>
      <div className="relative mt-0.5 h-4 text-[10px]">
        {options.map((item, index) => {
          const ratio = options.length > 1 ? index / (options.length - 1) : 0;
          const isFirst = index === 0;
          const isLast = index === options.length - 1;
          const posStyle = isFirst
            ? { left: 0 }
            : isLast
              ? { right: 0 }
              : { left: `calc(9px + (100% - 18px) * ${ratio})` };
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              style={posStyle}
              className={`absolute top-0 cursor-pointer whitespace-nowrap transition-colors focus-visible:outline-none ${
                isFirst ? "text-left" : isLast ? "text-right" : "-translate-x-1/2 text-center"
              } ${
                index === currentIndex
                  ? "font-bold text-[#c4b5fd]"
                  : "font-medium text-[#9aa6d6] hover:text-white"
              }`}
            >
              {locale === "en" ? item.labelEn : item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
