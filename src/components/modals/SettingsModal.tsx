"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import TheorySettingsPanel from "../theory/TheorySettingsPanel";
import { ModalCloseButton } from "./ModalCloseButton";
import { useModalAccessibility } from "./useModalAccessibility";
import { SlidersIcon } from "../ui/BusIcons";
import {
  DEFAULT_GRAPHICS_SETTINGS,
  type GraphicsPresetPreference,
  type GraphicsSettings,
  type SceneGraphicsTelemetry,
} from "@/lib/scene-performance";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphicsSettings?: GraphicsSettings;
  graphicsTelemetry?: SceneGraphicsTelemetry | null;
  onSelectGraphicsPreset?: (preset: GraphicsPresetPreference) => void;
  onUpdateGraphicsSettings?: (patch: Partial<GraphicsSettings>) => void;
  onResetGraphicsSettings?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  graphicsSettings = DEFAULT_GRAPHICS_SETTINGS,
  graphicsTelemetry = null,
  onSelectGraphicsPreset,
  onUpdateGraphicsSettings,
  onResetGraphicsSettings,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const handleKeyDown = useModalAccessibility(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="presentation"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#030617]/85"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="bus-modal-card bus-case-solid my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl text-white shadow-[0_24px_64px_rgba(2,4,18,0.7)] focus:outline-none"
      >
        <header className="bus-case-header flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="bus-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <SlidersIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">
                Rendu 3D &amp; confort
              </p>
              <h2 id="settings-modal-title" className="mt-0.5 text-xl font-black leading-tight sm:text-2xl">
                Paramètres
              </h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
          <TheorySettingsPanel
            graphicsSettings={graphicsSettings}
            telemetry={graphicsTelemetry}
            onSelectPreset={(preset) => onSelectGraphicsPreset?.(preset)}
            onUpdateGraphics={(patch) => onUpdateGraphicsSettings?.(patch)}
            onResetGraphics={() => onResetGraphicsSettings?.()}
          />
        </div>
      </section>
    </div>,
    document.body,
  );
}
