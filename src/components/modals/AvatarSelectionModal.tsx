"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import { getNakamaArchetype, NAKAMA_ROSTER } from "../bus/passenger-archetypes";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";

const AvatarPreview = dynamic(() => import("../bus/AvatarPreview"), {
  ssr: false,
  loading: () => <p role="status" className="grid h-full place-items-center text-sm text-[#d8e3ff]">Chargement du personnage…</p>,
});

/** Montée uniquement à l'ouverture pour toujours commencer sur le choix actuel. */
export function AvatarSelectionModal({ avatarId, seatIndex, hasRegisteredPlace, saving, error, onClose, onChoose }: {
  avatarId: PassengerAvatarId | null;
  seatIndex: number | null;
  hasRegisteredPlace: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onChoose: (avatarId: PassengerAvatarId) => void;
}) {
  const [index, setIndex] = useState(() => NAKAMA_ROSTER.indexOf(getNakamaArchetype(seatIndex, avatarId)));
  const [rotation, setRotation] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ x: number; rotation: number } | null>(null);
  const close = () => { if (!saving) onClose(); };
  const handleKeyDown = useModalAccessibility(true, close, dialogRef);
  const character = NAKAMA_ROSTER[index];
  const changeCharacter = (direction: number) => {
    if (saving) return;
    setIndex(current => (current + direction + NAKAMA_ROSTER.length) % NAKAMA_ROSTER.length);
    setRotation(0);
  };

  return createPortal(<div role="presentation"
    className="bus-modal-backdrop fixed inset-0 z-[2147483647] grid place-items-center overflow-y-auto bg-[#020617]/80 backdrop-blur-sm"
    onKeyDown={event => {
      handleKeyDown(event);
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); changeCharacter(event.key === "ArrowLeft" ? -1 : 1);
      }
    }}
    onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="avatar-selection-title"
      aria-describedby="avatar-selection-description" aria-busy={saving}
      className="bus-modal-card my-auto w-full max-w-[32rem] overflow-y-auto rounded-2xl border border-[#ffd23f]/60 bg-[#081127] text-white shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
        <div>
          <h2 id="avatar-selection-title" className="text-xl font-black leading-tight sm:text-2xl">{hasRegisteredPlace ? "Changer de personnage" : "Choisir mon personnage"}</h2>
          <p id="avatar-selection-description" className="mt-2 text-sm leading-relaxed text-[#d8e3ff]">{hasRegisteredPlace ? "Choisis qui prendra ta place dans le bus." : "Prépare ton personnage avant de monter. Ce choix ne réserve pas encore de place."}</p>
        </div>
        <ModalCloseButton onClick={close} disabled={saving} />
      </div>
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        <div className="relative rounded-xl bg-[#10234a]">
          <div data-avatar-id={character.id} data-avatar-rotation={rotation.toFixed(3)}
            aria-hidden="true" className="h-[min(38dvh,19rem)] min-h-40 w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
            onPointerDown={event => {
              if (event.button !== 0) return;
              dragRef.current = { x: event.clientX, rotation };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              const drag = dragRef.current;
              if (drag) setRotation(drag.rotation + (event.clientX - drag.x) * 0.015);
            }}
            onPointerUp={event => {
              dragRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => { dragRef.current = null; }}>
            <AvatarPreview avatarId={character.id} rotation={rotation} />
          </div>
          {[-1, 1].map(direction => <button key={direction} type="button" onClick={() => changeCharacter(direction)} disabled={saving}
            aria-label={direction < 0 ? "Personnage précédent" : "Personnage suivant"}
            className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-[#081127]/95 text-[#ffd23f] shadow-lg transition-colors hover:bg-[#1c3871] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-60 ${direction < 0 ? "left-2" : "right-2"}`}>
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={direction < 0 ? "m14 5-7 7 7 7" : "m10 5 7 7-7 7"} /></svg>
          </button>)}
        </div>
        <div className="mt-4 text-center" aria-live="polite" aria-atomic="true">
          <h3 className="text-xl font-black text-[#ffd23f]">{character.name}</h3>
          <p className="mt-1 text-xs font-semibold tabular-nums text-[#d8e3ff]">{index + 1} / {NAKAMA_ROSTER.length}</p>
        </div>
        <label className="mt-4 flex items-center gap-3 text-xs font-semibold text-[#d8e3ff]">
          <span>Faire tourner</span>
          <input type="range" min={-180} max={180} step={5} value={Math.round(((rotation * 180 / Math.PI + 180) % 360 + 360) % 360 - 180)}
            onChange={event => setRotation(Number(event.target.value) * Math.PI / 180)}
            aria-label="Rotation du personnage" aria-valuetext={`${Math.round(rotation * 180 / Math.PI)} degrés`}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f]" />
        </label>
        <p className="mt-2 text-center text-xs leading-relaxed text-[#c2cee8]">Glisse sur le personnage pour le voir sous tous les angles.</p>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/50 bg-red-950/60 px-3 py-2 text-sm font-bold text-red-100">{error}</p>}
        <button type="button" onClick={() => onChoose(character.id)} disabled={saving}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#ffd23f] px-4 py-3 text-base font-black text-[#09216d] transition-colors hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-80">
          {saving ? "Enregistrement…" : "Choisir ce personnage"}
        </button>
        <p className="mt-2 text-center text-xs leading-relaxed text-[#c2cee8]">{hasRegisteredPlace ? "Ton choix sera conservé pour tes prochaines visites sur ce navigateur." : "Ton choix est gardé sur ce navigateur. Tu monteras à bord avec ce personnage."}</p>
      </div>
    </section>
  </div>, document.body);
}
