"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  type WorldDensityPreference,
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
}

const TIER_LABELS: Record<GraphicsQualityTier, string> = {
  low: "Éco",
  medium: "Moyen",
  high: "Élevé",
  ultra: "Ultra",
};

const PRESET_OPTIONS: SliderOption<GraphicsPresetPreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Éco" },
  { value: "medium", label: "Moyen" },
  { value: "high", label: "Élevé" },
  { value: "ultra", label: "Ultra" },
];

const DRAW_DISTANCE_OPTIONS: SliderOption<DrawDistancePreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "near", label: "Courte" },
  { value: "medium", label: "Moyenne" },
  { value: "far", label: "Étendue" },
  { value: "max", label: "Max" },
];

const PIXEL_QUALITY_OPTIONS: SliderOption<PixelQualityPreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "eco", label: "Fluide" },
  { value: "standard", label: "Standard" },
  { value: "sharp", label: "Fine" },
  { value: "native", label: "Max" },
];

const SHADOW_OPTIONS: SliderOption<ShadowQualityPreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "off", label: "Off" },
  { value: "standard", label: "Standards" },
  { value: "high", label: "Fines" },
];

const WORLD_DENSITY_OPTIONS: SliderOption<WorldDensityPreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Allégée" },
  { value: "balanced", label: "Normale" },
  { value: "rich", label: "Riche" },
  { value: "max", label: "Max" },
];

function optionLabel<T extends string>(options: SliderOption<T>[], value: T) {
  return options.find((item) => item.value === value)?.label ?? value;
}

export default function TheorySettingsPanel({
  graphicsSettings,
  telemetry = null,
  onSelectPreset,
  onUpdateGraphics,
  onResetGraphics,
}: TheorySettingsPanelProps) {
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
    <div className="space-y-3.5">
      <SettingSlider
        label="Qualité globale"
        value={draft.preset}
        autoHint={TIER_LABELS[activeTier]}
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
        label="Distance d’affichage"
        value={draft.drawDistance}
        autoHint={optionLabel(DRAW_DISTANCE_OPTIONS, resolvedProfile.drawDistance)}
        options={DRAW_DISTANCE_OPTIONS}
        onChange={(drawDistance) => commitDraft({ ...draftRef.current, drawDistance })}
      />
      <SettingSlider
        label="Finesse des pixels"
        value={draft.pixelQuality}
        autoHint={optionLabel(PIXEL_QUALITY_OPTIONS, resolvedProfile.pixelQuality)}
        options={PIXEL_QUALITY_OPTIONS}
        onChange={(pixelQuality) => commitDraft({ ...draftRef.current, pixelQuality })}
      />
      <SettingSlider
        label="Ombres"
        value={draft.shadows}
        autoHint={optionLabel(SHADOW_OPTIONS, resolvedProfile.shadows)}
        options={SHADOW_OPTIONS}
        onChange={(shadows) => commitDraft({ ...draftRef.current, shadows })}
      />
      <SettingSlider
        label="Densité des décors"
        value={draft.worldDensity}
        autoHint={optionLabel(WORLD_DENSITY_OPTIONS, resolvedProfile.worldDensity)}
        options={WORLD_DENSITY_OPTIONS}
        onChange={(worldDensity) => commitDraft({ ...draftRef.current, worldDensity })}
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
        Réinitialiser (Auto)
      </button>
    </div>
  );
}

function SettingSlider<T extends string>({
  label,
  value,
  autoHint,
  options,
  onChange,
}: {
  label: string;
  value: T;
  autoHint: string;
  options: SliderOption<T>[];
  onChange: (value: T) => void;
}) {
  const inputId = useId();
  const currentIndex = Math.max(0, options.findIndex((item) => item.value === value));
  const currentLabel = value === "auto" ? `Auto · ${autoHint}` : optionLabel(options, value);

  return (
    <div className="bus-case-inset rounded-xl px-3.5 py-2.5">
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
        className="bus-range mt-2 h-5 w-full cursor-pointer focus-visible:outline-none"
      />
      <div aria-hidden="true" className="mt-0.5 flex items-center justify-between px-[9px]">
        {options.map((item, index) => (
          <span
            key={item.value}
            className={`h-1.5 w-0.5 rounded-full transition-colors ${
              index === currentIndex ? "bg-[#c4b5fd]" : "bg-white/25"
            }`}
          />
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
        {options.map((item, index) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`cursor-pointer truncate transition-colors focus-visible:outline-none ${
              index === currentIndex
                ? "font-bold text-[#c4b5fd]"
                : "font-medium text-[#9aa6d6] hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
