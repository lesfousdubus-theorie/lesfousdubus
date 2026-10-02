"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

const buttonStyle = "min-h-11 rounded-xl border border-white/25 bg-white/5 px-3 py-2 text-sm font-bold text-white transition hover:border-[#ffd23f] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:cursor-not-allowed disabled:opacity-50";

export function BusSettingsModal({
  isOpen, onClose, sceneAvailable, inside, headlights, tvOn, hasEntered,
  soundMuted, mode, hasSeat, canReturnToSeat, onModeChange, onHeadlights,
  onHonk, onTv, onSound, onResetView, onReturnToSeat, onHelp, onLeave,
}: {
  isOpen: boolean;
  onClose: () => void;
  sceneAvailable: boolean;
  inside: boolean;
  headlights: boolean;
  tvOn: boolean;
  hasEntered: boolean;
  soundMuted: boolean;
  mode: "day" | "night" | null;
  hasSeat: boolean;
  canReturnToSeat: boolean;
  onModeChange: (mode: "day" | "night" | null) => void;
  onHeadlights: () => void;
  onHonk: () => void;
  onTv: () => void;
  onSound: () => void;
  onResetView: () => void;
  onReturnToSeat: () => void;
  onHelp: () => void;
  onLeave: () => Promise<boolean>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const leaveLock = useRef(false);
  const close = useCallback(() => {
    if (leaveLock.current) return;
    if (confirmLeave) {
      setConfirmLeave(false);
      setLeaveError("");
    } else onClose();
  }, [confirmLeave, onClose]);
  const handleKeyDown = useModalAccessibility(isOpen, close, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [confirmLeave, isOpen]);

  const leave = async () => {
    if (leaveLock.current) return;
    leaveLock.current = true;
    setLeaving(true);
    setLeaveError("");
    try {
      if (await onLeave()) {
        setConfirmLeave(false);
        onClose();
      } else setLeaveError("Ta place n’a pas pu être supprimée. Réessaie dans un instant.");
    } catch {
      setLeaveError("Ta place n’a pas pu être supprimée. Réessaie dans un instant.");
    } finally {
      leaveLock.current = false;
      setLeaving(false);
    }
  };

  if (!isOpen) return null;
  return createPortal(
    <div className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 p-3 backdrop-blur-sm" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} tabIndex={-1} role={confirmLeave ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="bus-settings-title" aria-describedby={confirmLeave ? "bus-leave-description" : undefined} className="bus-modal-card my-auto w-full max-w-lg overflow-y-auto rounded-2xl border border-[#ffd23f]/40 bg-[#081127] p-5 text-white shadow-2xl sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <h2 id="bus-settings-title" className="text-xl font-black">{confirmLeave ? "Supprimer ta place du bus ?" : "Commandes du bus"}</h2>
          <ModalCloseButton onClick={close} disabled={leaving} />
        </header>
        {confirmLeave ? <>
          <p id="bus-leave-description" className="mt-4 text-sm leading-6 text-white/85">Ta place, ton pseudo et ton commentaire publics seront supprimés. Le compteur diminuera. Tu pourras rejoindre le bus à nouveau plus tard.</p>
          {leaveError && <p role="alert" className="mt-3 text-sm font-bold text-red-200">{leaveError}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" className={buttonStyle} disabled={leaving} onClick={close}>Annuler</button>
            <button type="button" disabled={leaving} onClick={() => void leave()} className={`${buttonStyle} border-red-400/50 bg-red-700 hover:bg-red-800`}>{leaving ? "Suppression…" : "Supprimer ma place"}</button>
          </div>
        </> : <div className="mt-5 space-y-5">
          <fieldset disabled={!sceneAvailable}>
            <legend className="mb-2 text-sm font-bold text-[#ffd23f]">Ambiance</legend>
            <div className="grid grid-cols-3 gap-2">
              {([ [null, "Auto"], ["day", "Jour"], ["night", "Nuit"] ] as const).map(([value, label]) => <button key={label} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)} className={`${buttonStyle} ${mode === value ? "border-[#ffd23f] bg-[#ffd23f]/15 text-[#ffd23f]" : ""}`}>{label}</button>)}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!sceneAvailable} aria-pressed={headlights} onClick={onHeadlights} className={buttonStyle}>💡 {headlights ? "Éteindre les phares" : "Allumer les phares"}</button>
            <button type="button" disabled={!sceneAvailable || soundMuted} onClick={onHonk} className={buttonStyle}>📯 Klaxonner</button>
            {hasEntered && <button type="button" disabled={!sceneAvailable} aria-pressed={tvOn} onClick={onTv} className={buttonStyle}>📺 {tvOn ? "Éteindre la TV" : "Allumer la TV"}</button>}
            <button type="button" aria-pressed={soundMuted} onClick={onSound} className={buttonStyle}>{soundMuted ? "🔇 Activer le son" : "🔊 Couper le son"}</button>
          </div>
          <p className="text-xs leading-5 text-white/75">Le réglage du son concerne les effets et la télévision du bus.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={!sceneAvailable} onClick={() => { onResetView(); onClose(); }} className={buttonStyle}>Recentrer la vue</button>
            {inside && <button type="button" disabled={!sceneAvailable || !canReturnToSeat} onClick={() => { onReturnToSeat(); onClose(); }} className={buttonStyle}>Revenir à ma place</button>}
            <button type="button" onClick={() => { onClose(); onHelp(); }} className={buttonStyle}>Comment naviguer ?</button>
          </div>
          {hasSeat && <div className="border-t border-white/15 pt-4">
            <button type="button" onClick={() => setConfirmLeave(true)} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-red-200 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200">Supprimer ma place et mon profil</button>
            <p className="mt-1 text-xs leading-5 text-white/75">Le bouton « Sortir » change seulement la vue et conserve ta place.</p>
          </div>}
        </div>}
      </section>
    </div>, document.body,
  );
}
