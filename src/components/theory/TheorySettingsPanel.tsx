"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
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
  const [pending, setPending] = useState<Partial<GraphicsSettings> | null>(null);
  const pendingRef = useRef<Partial<GraphicsSettings> | null>(null);
  const timerRef = useRef<number | null>(null);
  const effectiveSettings: GraphicsSettings = pending ? { ...graphicsSettings, ...pending } : graphicsSettings;

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const scheduleGraphicsPatch = useCallback((patch: Partial<GraphicsSettings>, isPreset = false) => {
    const nextPending = { ...(pendingRef.current ?? {}), ...patch };
    pendingRef.current = nextPending;
    setPending(nextPending);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const current = pendingRef.current;
      pendingRef.current = null;
      setPending(null);
      if (!current) return;
      if (isPreset && current.preset) {
        onSelectPreset(current.preset);
        const { preset: _preset, ...rest } = current;
        void _preset;
        if (Object.keys(rest).length > 0) onUpdateGraphics(rest);
      } else {
        onUpdateGraphics(current);
      }
    }, 160);
  }, [onSelectPreset, onUpdateGraphics]);

  const handleReset = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    setPending(null);
    onResetGraphics();
  }, [onResetGraphics]);

  const recommendedTier = telemetry?.recommendedTier ?? "medium";
  const activeTier = telemetry?.activeTier
    ?? (effectiveSettings.preset === "auto" ? recommendedTier : effectiveSettings.preset);
  const resolvedProfile = resolveGraphicsProfile(effectiveSettings, activeTier, 1);
  const isDefault = isDefaultGraphicsSettings(effectiveSettings);

  return (
    <div className="space-y-3.5">
      <SettingSlider
        label="Qualité globale"
        value={effectiveSettings.preset}
        autoHint={TIER_LABELS[activeTier]}
        options={PRESET_OPTIONS}
        onChange={(preset) => scheduleGraphicsPatch({
          preset,
          drawDistance: "auto",
          pixelQuality: "auto",
          shadows: "auto",
          worldDensity: "auto",
        }, true)}
      />
      <SettingSlider
        label="Distance d’affichage"
        value={effectiveSettings.drawDistance}
        autoHint={optionLabel(DRAW_DISTANCE_OPTIONS, resolvedProfile.drawDistance)}
        options={DRAW_DISTANCE_OPTIONS}
        onChange={(drawDistance) => scheduleGraphicsPatch({ drawDistance })}
      />
      <SettingSlider
        label="Finesse des pixels"
        value={effectiveSettings.pixelQuality}
        autoHint={optionLabel(PIXEL_QUALITY_OPTIONS, resolvedProfile.pixelQuality)}
        options={PIXEL_QUALITY_OPTIONS}
        onChange={(pixelQuality) => scheduleGraphicsPatch({ pixelQuality })}
      />
      <SettingSlider
        label="Ombres"
        value={effectiveSettings.shadows}
        autoHint={optionLabel(SHADOW_OPTIONS, resolvedProfile.shadows)}
        options={SHADOW_OPTIONS}
        onChange={(shadows) => scheduleGraphicsPatch({ shadows })}
      />
      <SettingSlider
        label="Densité des décors"
        value={effectiveSettings.worldDensity}
        autoHint={optionLabel(WORLD_DENSITY_OPTIONS, resolvedProfile.worldDensity)}
        options={WORLD_DENSITY_OPTIONS}
        onChange={(worldDensity) => scheduleGraphicsPatch({ worldDensity })}
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
