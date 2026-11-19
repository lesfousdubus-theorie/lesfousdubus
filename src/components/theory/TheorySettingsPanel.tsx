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
      <section className="rounded-2xl border border-[#ffd23f]/40 bg-gradient-to-br from-[#10265c]/90 to-[#0c1b3a] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="flex flex-wrap items-start gap-3.5 sm:gap-4">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/40 bg-[#ffd23f]/12 text-[#ffd23f]"
          >
            <SlidersIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#ffd23f]">
              Rendu 3D &amp; confort
            </p>
            <h3 className="mt-0.5 text-xl font-black text-white sm:text-2xl">
              Paramètres d’affichage
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#dce7ff]">
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
      <section className="rounded-2xl border border-white/15 bg-[#0c1b3a] p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-base font-black text-white sm:text-lg">
            Qualité globale
          </h4>
          <span className="text-xs font-bold text-[#ffd23f]">
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
                className={`min-h-11 cursor-pointer rounded-xl border px-3 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none sm:text-sm ${
                  selected
                    ? "border-[#ffd23f] bg-[#ffd23f] text-[#091c5c] shadow-md shadow-[#ffd23f]/20"
                    : "border-white/15 bg-[#040b18] text-[#dce7ff] hover:border-[#ffd23f]/50 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#b6c7eb] sm:text-sm">
          {PRESET_DESCRIPTIONS[graphicsSettings.preset]}
          {hasCustomOverrides && " Des options détaillées personnalisées restent prioritaires ci-dessous."}
        </p>
      </section>

      {/* Section 2 : Réglages détaillés 3D */}
      <section className="rounded-2xl border border-white/15 bg-[#0c1b3a] p-4 sm:p-6">
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
      <section className="rounded-2xl border border-white/15 bg-[#0c1b3a] p-4 sm:p-6">
        <h4 className="text-base font-black text-white sm:text-lg">
          Fluidité &amp; confort
        </h4>
        <div className="mt-3 space-y-3">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-[#040b18]/75 p-3.5 text-sm leading-relaxed transition hover:border-[#ffd23f]/45">
            <input
              type="checkbox"
              checked={graphicsSettings.adaptiveFps}
              onChange={(event) => onUpdateGraphics({ adaptiveFps: event.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040b18]"
            />
            <span className="min-w-0">
              <span className="block font-bold text-white">
                Ajustement automatique selon les FPS
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-[#dce7ff] sm:text-sm">
                Baisse progressivement la finesse des pixels — puis le palier 3D en mode Automatique — si l’ordinateur ralentit sous 46 FPS.
              </span>
            </span>
          </label>

          {setLetterShortcutsEnabled && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-[#040b18]/75 p-3.5 text-sm leading-relaxed transition hover:border-[#ffd23f]/45">
              <input
                type="checkbox"
                checked={letterShortcutsEnabled}
                onChange={(event) => setLetterShortcutsEnabled(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040b18]"
              />
              <span className="min-w-0">
                <span className="block font-bold text-white">
                  Activer les raccourcis clavier à une lettre
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#dce7ff] sm:text-sm">
                  Touches rapides : H (klaxon), L (phares), B (boost), Q/A et D (regarder à gauche et à droite à ta place).
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-[#b6c7eb]">
            Tes préférences d’affichage sont conservées automatiquement dans ce navigateur.
          </p>
          <button
            type="button"
            disabled={isDefault}
            onClick={onResetGraphics}
            className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] sm:text-sm ${
              isDefault
                ? "cursor-not-allowed border-white/10 bg-[#040b18]/50 text-[#b6c7eb]/50"
                : "cursor-pointer border-[#ffd23f]/45 bg-[#040b18] text-[#ffd23f] hover:border-[#ffd23f] hover:bg-[#ffd23f] hover:text-[#091c5c]"
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
    <div className="rounded-xl border border-white/12 bg-[#040b18]/80 px-3.5 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-[#b6c7eb]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-black text-white" title={value}>{value}</dd>
      <dd className="mt-0.5 text-xs font-medium text-[#ffd23f]">{hint}</dd>
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
      className="rounded-xl border border-white/12 bg-[#040b18]/75 p-3.5 sm:p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h5 id={headingId} className="text-sm font-black text-white">
          {title}
        </h5>
        <span className="text-xs font-semibold text-[#ffd23f]">
          {value === "auto" ? `Auto · ${activeAutoLabel}` : optionLabel(options, value)}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#b6c7eb]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-11 flex-1 cursor-pointer rounded-lg border px-2.5 py-2 text-xs font-bold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040b18] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${
                selected
                  ? "border-[#ffd23f] bg-[#ffd23f] font-black text-[#091c5c]"
                  : "border-white/15 bg-[#0c1b3a] text-[#dce7ff] hover:border-[#ffd23f]/50 hover:text-white"
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
