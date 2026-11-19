"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import { getNakamaArchetype, NAKAMA_ROSTER } from "../bus/passenger-archetypes";
import { useModalAccessibility } from "./useModalAccessibility";
import { ModalCloseButton } from "./ModalCloseButton";
import { ChevronLeftIcon, ChevronRightIcon, PersonIcon } from "../ui/BusIcons";

const AvatarPreview = dynamic(() => import("../bus/AvatarPreview"), {
  ssr: false,
  loading: () => <p role="status" className="grid h-full place-items-center text-sm text-[#dce7ff]">Chargement du personnage…</p>,
});

function normalizeRotationDegrees(rotation: number): number {
  const raw = Math.round((rotation * 180) / Math.PI);
  if (raw >= -180 && raw <= 180) return raw;
  const wrapped = ((((raw + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && raw > 0 ? 180 : wrapped;
}

/** Montée uniquement à l'ouverture pour toujours commencer sur le choix actuel. */
export function AvatarSelectionModal({
  avatarId,
  seatIndex,
  hasRegisteredPlace,
  saving,
  error,
  onClose,
  onChoose,
  onClear,
}: {
  avatarId: PassengerAvatarId | null;
  seatIndex: number | null;
  hasRegisteredPlace: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onChoose: (avatarId: PassengerAvatarId | null) => void;
  onClear?: () => void;
}) {
  const [index, setIndex] = useState(() => NAKAMA_ROSTER.indexOf(getNakamaArchetype(seatIndex, avatarId)));
  const [rotation, setRotation] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const activeRosterButtonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; rotation: number } | null>(null);
  const hasMountedRef = useRef(false);
  const close = () => { if (!saving) onClose(); };
  const handleKeyDown = useModalAccessibility(true, close, dialogRef);
  const character = NAKAMA_ROSTER[index];
  const rotationDegrees = normalizeRotationDegrees(rotation);

  const changeCharacter = (direction: number) => {
    if (saving) return;
    setIndex(current => (current + direction + NAKAMA_ROSTER.length) % NAKAMA_ROSTER.length);
    setRotation(0);
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const behavior = !hasMountedRef.current || reducedMotion ? "auto" : "smooth";
    hasMountedRef.current = true;
    activeRosterButtonRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior,
    });
  }, [index]);

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
      aria-busy={saving}
      className="bus-modal-card my-auto flex w-full max-w-[32rem] flex-col overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[#07142b] text-white shadow-[0_28px_80px_rgba(0,0,0,0.7)] focus:outline-none">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#10265c] to-[#07142b] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffd23f]/35 bg-[#ffd23f]/12 text-[#ffd23f]">
            <PersonIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ffd23f]">
              Personnage
            </p>
            <h2 id="avatar-selection-title" className="mt-0.5 text-xl font-black leading-tight sm:text-2xl">{hasRegisteredPlace ? "Changer de personnage" : "Choisir mon personnage"}</h2>
          </div>
        </div>
        <ModalCloseButton onClick={close} disabled={saving} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        <div className="relative rounded-xl border border-white/15 bg-[#0c1b3a]">
          <div data-avatar-id={character.id} data-avatar-rotation={rotation.toFixed(3)}
            aria-hidden="true" className="h-[min(38dvh,19rem)] min-h-40 w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
            onPointerDown={event => {
              if (saving || dragRef.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
              dragRef.current = { pointerId: event.pointerId, x: event.clientX, rotation };
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {}
            }}
            onPointerMove={event => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              setRotation(drag.rotation + (event.clientX - drag.x) * 0.015);
            }}
            onPointerUp={event => {
              if (dragRef.current?.pointerId !== event.pointerId) return;
              dragRef.current = null;
              try {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              } catch {}
            }}
            onPointerCancel={event => {
              if (dragRef.current?.pointerId !== event.pointerId) return;
              dragRef.current = null;
              try {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              } catch {}
            }}
            onLostPointerCapture={event => {
              if (dragRef.current?.pointerId !== event.pointerId) return;
              dragRef.current = null;
            }}>
            <AvatarPreview avatarId={character.id} rotation={rotation} />
          </div>
          {[-1, 1].map(direction => <button key={direction} type="button" onClick={() => changeCharacter(direction)} aria-disabled={saving}
            aria-label={direction < 0 ? "Personnage précédent" : "Personnage suivant"}
            className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/30 bg-[#07142b]/90 text-[#ffd23f] shadow-lg transition-colors hover:border-[#ffd23f]/70 hover:bg-[#0c1b3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${direction < 0 ? "left-2" : "right-2"}`}>
            {direction < 0 ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
          </button>)}
        </div>
        <div className="mt-4 text-center" aria-live="polite" aria-atomic="true">
          <h3 className="text-xl font-black text-[#ffd23f]">{character.name}</h3>
          <p className="mt-1 text-xs font-semibold tabular-nums text-[#b6c7eb]">{index + 1} / {NAKAMA_ROSTER.length}</p>
        </div>
        <div
          role="group"
          aria-label="Sélection rapide du personnage"
          className="mt-3 flex w-full min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 py-1"
        >
          {NAKAMA_ROSTER.map((item, itemIndex) => {
            const selected = itemIndex === index;
            return (
              <button
                key={item.id}
                ref={selected ? activeRosterButtonRef : undefined}
                type="button"
                aria-pressed={selected}
                aria-disabled={saving}
                onClick={() => {
                  if (saving) return;
                  setIndex(itemIndex);
                  setRotation(0);
                }}
                className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${
                  selected
                    ? "border-[#ffd23f] bg-[#ffd23f] text-[#091c5c]"
                    : "border-white/20 bg-[#0c1b3a] text-[#dce7ff] hover:border-[#ffd23f]/65 hover:text-white"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/25"
                  style={{ backgroundColor: item.shirtColor }}
                />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-[#dce7ff]">
          <span>Faire tourner</span>
          <input type="range" min={-180} max={180} step={5} disabled={saving} value={rotationDegrees}
            onChange={event => setRotation(Number(event.target.value) * Math.PI / 180)}
            aria-label="Rotation du personnage" aria-valuetext={`${rotationDegrees} degrés`}
            className="h-6 min-w-0 flex-1 cursor-pointer accent-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] disabled:cursor-not-allowed disabled:opacity-60" />
        </label>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5 text-sm font-bold text-red-100">{error}</p>}
        <button type="button" aria-disabled={saving} onClick={() => { if (!saving) onChoose(character.id); }}
          className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-base font-black text-[#091c5c] shadow-[0_5px_0_#b8860b] transition hover:bg-[#ffe271] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] active:translate-y-1 active:shadow-none aria-disabled:cursor-wait aria-disabled:opacity-80">
          {saving ? "Enregistrement…" : "Choisir ce personnage"}
        </button>
        {!hasRegisteredPlace && avatarId !== null && (
          <button
            type="button"
            aria-disabled={saving}
            onClick={() => {
              if (saving) return;
              if (onClear) onClear();
              else onChoose(null);
            }}
            className="mt-2.5 min-h-11 w-full cursor-pointer rounded-xl border border-white/30 bg-[#0c1b3a] px-3 text-xs font-bold text-white transition-colors hover:border-[#ffd23f]/70 hover:text-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1b3a] aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
          >
            Laisser le choix automatique
          </button>
        )}
      </div>
    </section>
  </div>, document.body);
}
