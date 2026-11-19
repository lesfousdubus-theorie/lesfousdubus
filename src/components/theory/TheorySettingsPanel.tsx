"use client";

import { useId } from "react";
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
import { SlidersIcon } from "../ui/BusIcons";

interface TheorySettingsPanelProps {
  graphicsSettings: GraphicsSettings;
  telemetry?: SceneGraphicsTelemetry | null;
  onSelectPreset: (preset: GraphicsPresetPreference) => void;
  onUpdateGraphics: (patch: Partial<GraphicsSettings>) => void;
  onResetGraphics: () => void;
  letterShortcutsEnabled?: boolean;
  setLetterShortcutsEnabled?: (enabled: boolean) => void;
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

const TIER_LABELS: Record<GraphicsQualityTier, string> = {
  low: "Éco",
  medium: "Moyen",
  high: "Élevé",
  ultra: "Ultra",
};

const PRESET_OPTIONS: SegmentedOption<GraphicsPresetPreference>[] = [
  { value: "auto", label: "Automatique" },
  { value: "low", label: "Éco" },
  { value: "medium", label: "Moyen" },
  { value: "high", label: "Élevé" },
  { value: "ultra", label: "Ultra" },
];

const PRESET_DESCRIPTIONS: Record<GraphicsPresetPreference, string> = {
  auto: "Détecte ta carte graphique au lancement puis adapte la 3D et les pixels en direct selon la fluidité.",
  low: "Privilégie la fluidité maximale : brouillard rapproché, décors allégés et résolution contenue.",
  medium: "Bon équilibre entre visibilité des îles au loin, détails à bord et fluidité stable.",
  high: "Longue portée 3D, passagers détaillés, ombres fines et pixels nets pour les GPU modernes.",
  ultra: "Affichage le plus lointain, netteté maximale des pixels et densité complète des mondes.",
};

const DRAW_DISTANCE_OPTIONS: SegmentedOption<DrawDistancePreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "near", label: "Courte" },
  { value: "medium", label: "Moyenne" },
  { value: "far", label: "Étendue" },
  { value: "max", label: "Maximale" },
];

const PIXEL_QUALITY_OPTIONS: SegmentedOption<PixelQualityPreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "eco", label: "Fluide" },
  { value: "standard", label: "Standard" },
  { value: "sharp", label: "Fine" },
  { value: "native", label: "Maximale" },
];

const SHADOW_OPTIONS: SegmentedOption<ShadowQualityPreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "off", label: "Désactivées" },
  { value: "standard", label: "Standards" },
  { value: "high", label: "Fines" },
];

const WORLD_DENSITY_OPTIONS: SegmentedOption<WorldDensityPreference>[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Allégée" },
  { value: "balanced", label: "Normale" },
  { value: "rich", label: "Riche" },
  { value: "max", label: "Maximale" },
];

function optionLabel<T extends string>(options: SegmentedOption<T>[], value: T) {
  return options.find((item) => item.value === value)?.label ?? value;
}

export default function TheorySettingsPanel({
  graphicsSettings,
  telemetry = null,
  onSelectPreset,
  onUpdateGraphics,
  onResetGraphics,
  letterShortcutsEnabled = true,
  setLetterShortcutsEnabled,
}: TheorySettingsPanelProps) {
  const recommendedTier = telemetry?.recommendedTier ?? "medium";
  const activeTier = telemetry?.activeTier
    ?? (graphicsSettings.preset === "auto" ? recommendedTier : graphicsSettings.preset);
  const resolvedProfile = resolveGraphicsProfile(graphicsSettings, activeTier, 1);
  const gpuLabel = telemetry?.gpuLabel ?? "Détection WebGL2 en cours…";
  const fogFar = telemetry?.fogFar ?? resolvedProfile.fogFar;
  const currentDpr = telemetry?.currentDpr ?? resolvedProfile.maxDpr;
  const isDefault = isDefaultGraphicsSettings(graphicsSettings);
  const hasCustomOverrides = graphicsSettings.drawDistance !== "auto"
    || graphicsSettings.pixelQuality !== "auto"
    || graphicsSettings.shadows !== "auto"
    || graphicsSettings.worldDensity !== "auto";

  return (
    <div className="mx-auto max-w-[960px] space-y-5">
      {/* En-tête & diagnostic matériel */}
      <section className="bus-case-highlight rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-start gap-3.5 sm:gap-4">
          <span
            aria-hidden="true"
            className="bus-icon-badge grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          >
            <SlidersIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c4b5fd]">
              Rendu 3D &amp; confort
            </p>
            <h3 className="mt-0.5 text-xl font-black text-white sm:text-2xl">
              Paramètres d’affichage
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#dfe5ff]">
              Par défaut, la scène détecte automatiquement la puissance du processeur graphique et
              ajuste la portée 3D comme la finesse des pixels. Tu peux ajuster chaque réglage
              ci-dessous à tout moment.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <DiagnosticCard
            label="Carte graphique détectée"
            value={gpuLabel}
            hint={`Recommandé : ${TIER_LABELS[recommendedTier]}`}
          />
          <DiagnosticCard
            label="Profil actif"
            value={`${graphicsSettings.preset === "auto" ? "Auto" : "Manuel"} · ${TIER_LABELS[activeTier]}`}
            hint={hasCustomOverrides ? "Réglages affinés à la main" : graphicsSettings.adaptiveFps ? "Suivi FPS actif" : "FPS figés"}
          />
          <DiagnosticCard
            label="Portée 3D"
            value={`${fogFar} m`}
            hint={optionLabel(DRAW_DISTANCE_OPTIONS, resolvedProfile.drawDistance)}
          />
          <DiagnosticCard
            label="Finesse pixels"
            value={`${Number(currentDpr.toFixed(2))}x`}
            hint={optionLabel(PIXEL_QUALITY_OPTIONS, resolvedProfile.pixelQuality)}
          />
        </dl>
      </section>

      {/* Section 1 : Qualité globale */}
      <section className="bus-case-elevated rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-base font-black text-white sm:text-lg">
            Qualité globale
          </h4>
          <span className="text-xs font-bold text-[#c4b5fd]">
            {graphicsSettings.preset === "auto"
              ? `Auto (recommandé : ${TIER_LABELS[recommendedTier]})`
              : `Mode ${TIER_LABELS[graphicsSettings.preset]}`}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRESET_OPTIONS.map((option) => {
            const selected = graphicsSettings.preset === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectPreset(option.value)}
                className={`min-h-11 cursor-pointer rounded-2xl px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438] sm:text-sm ${
                  selected ? "bus-btn-active" : "bus-btn-secondary"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#a3aed9] sm:text-sm">
          {PRESET_DESCRIPTIONS[graphicsSettings.preset]}
          {hasCustomOverrides && " Des options détaillées personnalisées restent prioritaires ci-dessous."}
        </p>
      </section>

      {/* Section 2 : Réglages détaillés 3D */}
      <section className="bus-case-elevated rounded-2xl p-4 sm:p-6">
        <h4 className="text-base font-black text-white sm:text-lg">
          Réglages détaillés 3D
        </h4>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingGroup
            title="Distance d’affichage"
            description="Ajuste la limite du brouillard et l’apparition des îles au loin."
            activeAutoLabel={optionLabel(DRAW_DISTANCE_OPTIONS, resolvedProfile.drawDistance)}
            value={graphicsSettings.drawDistance}
            options={DRAW_DISTANCE_OPTIONS}
            onChange={(drawDistance) => onUpdateGraphics({ drawDistance })}
          />
          <SettingGroup
            title="Finesse des pixels"
            description="Contrôle la résolution interne de rendu (DPR) pour la netteté."
            activeAutoLabel={optionLabel(PIXEL_QUALITY_OPTIONS, resolvedProfile.pixelQuality)}
            value={graphicsSettings.pixelQuality}
            options={PIXEL_QUALITY_OPTIONS}
            onChange={(pixelQuality) => onUpdateGraphics({ pixelQuality })}
          />
          <SettingGroup
            title="Ombres dynamiques"
            description="Active des ombres standard ou adoucies sur le bus et les décors."
            activeAutoLabel={optionLabel(SHADOW_OPTIONS, resolvedProfile.shadows)}
            value={graphicsSettings.shadows}
            options={SHADOW_OPTIONS}
            onChange={(shadows) => onUpdateGraphics({ shadows })}
          />
          <SettingGroup
            title="Densité des décors & passagers"
            description="Règle le nombre de monuments, passagers détaillés, étoiles et météo."
            activeAutoLabel={optionLabel(WORLD_DENSITY_OPTIONS, resolvedProfile.worldDensity)}
            value={graphicsSettings.worldDensity}
            options={WORLD_DENSITY_OPTIONS}
            onChange={(worldDensity) => onUpdateGraphics({ worldDensity })}
          />
        </div>
      </section>

      {/* Section 3 : Fluidité & Confort */}
      <section className="bus-case-elevated rounded-2xl p-4 sm:p-6">
        <h4 className="text-base font-black text-white sm:text-lg">
          Fluidité &amp; confort
        </h4>
        <div className="mt-3 space-y-3">
          <label className="bus-case-inset flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-3.5 text-sm leading-relaxed transition-colors hover:border-[#947eef]/55">
            <input
              type="checkbox"
              checked={graphicsSettings.adaptiveFps}
              onChange={(event) => onUpdateGraphics({ adaptiveFps: event.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#7a3aec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04071c]"
            />
            <span className="min-w-0">
              <span className="block font-bold text-white">
                Ajustement automatique selon les FPS
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-[#dfe5ff] sm:text-sm">
                Baisse progressivement la finesse des pixels — puis le palier 3D en mode Automatique — si l’ordinateur ralentit sous 46 FPS.
              </span>
            </span>
          </label>

          {setLetterShortcutsEnabled && (
            <label className="bus-case-inset flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-3.5 text-sm leading-relaxed transition-colors hover:border-[#947eef]/55">
              <input
                type="checkbox"
                checked={letterShortcutsEnabled}
                onChange={(event) => setLetterShortcutsEnabled(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#7a3aec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04071c]"
              />
              <span className="min-w-0">
                <span className="block font-bold text-white">
                  Activer les raccourcis clavier à une lettre
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#dfe5ff] sm:text-sm">
                  Touches rapides : H (klaxon), L (phares), B (boost), Q/A et D (regarder à gauche et à droite à ta place).
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#947eef]/20 pt-4">
          <p className="text-xs text-[#a3aed9]">
            Tes préférences d’affichage sont conservées automatiquement dans ce navigateur.
          </p>
          <button
            type="button"
            disabled={isDefault}
            onClick={onResetGraphics}
            className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1438] sm:text-sm ${
              isDefault
                ? "cursor-not-allowed border border-white/15 bg-[#04071c]/75 text-[#9aa6d6]"
                : "bus-btn-tonal cursor-pointer"
            }`}
          >
            Réinitialiser par défaut (Auto)
          </button>
        </div>
      </section>
    </div>
  );
}

function DiagnosticCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bus-case-inset rounded-xl px-3.5 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-[#a3aed9]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-black text-white" title={value}>{value}</dd>
      <dd className="mt-0.5 text-xs font-medium text-[#c4b5fd]">{hint}</dd>
    </div>
  );
}

function SettingGroup<T extends string>({
  title,
  description,
  activeAutoLabel,
  value,
  options,
  onChange,
}: {
  title: string;
  description: string;
  activeAutoLabel: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  const headingId = useId();
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="bus-case-inset rounded-xl p-3.5 sm:p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h5 id={headingId} className="text-sm font-black text-white">
          {title}
        </h5>
        <span className="text-xs font-semibold text-[#c4b5fd]">
          {value === "auto" ? `Auto · ${activeAutoLabel}` : optionLabel(options, value)}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#a3aed9]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-11 flex-1 cursor-pointer rounded-[0.875rem] px-2.5 py-2 text-xs font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04071c] ${
                selected ? "bus-btn-active" : "bus-btn-secondary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
