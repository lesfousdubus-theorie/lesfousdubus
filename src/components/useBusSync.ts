"use client";

import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import { playStretch } from "@/lib/horn";
import { ApiError, fetchJson, getOrCreateVisitorId, isRetryableRegistrationError, type BusApiState } from "@/lib/client/bus-api";
import type { PassengerProfile } from "@/types/passenger";
import type { Phase } from "./bus/constants";
import { computeNumRows } from "@/lib/bus-layout";

interface BusSyncOptions {
  applyBusSnapshot: (data: BusApiState, updateCount?: boolean) => boolean;
  statsRetryToken: number;
  setStatsLoadError: Dispatch<SetStateAction<boolean>>;
  phase: Phase;
  seatRow: number;
  profileRevision: number;
  setPassengerProfiles: Dispatch<SetStateAction<PassengerProfile[]>>;
  seatCapacityRef: RefObject<number>;
  setCount: Dispatch<SetStateAction<number | null>>;
  showToast: (text: string, sub?: string, badge?: string) => void;
  registrationPending: boolean;
  registrationRetryDelayRef: RefObject<number>;
  setCurrentPassengerSeatIndex: Dispatch<SetStateAction<number | null>>;
  setRegistrationPending: Dispatch<SetStateAction<boolean>>;
}

export function useBusSync({
  applyBusSnapshot, statsRetryToken, setStatsLoadError, phase, seatRow,
  profileRevision, setPassengerProfiles, seatCapacityRef, setCount, showToast,
  registrationPending, registrationRetryDelayRef, setCurrentPassengerSeatIndex,
  setRegistrationPending,
}: BusSyncOptions) {
  // Récupération initiale : une erreur conserve l'état "inconnu" et propose
  // explicitement une nouvelle tentative au lieu de laisser un simple tiret.
  useEffect(() => {
    const controller = new AbortController();
    void fetchJson<BusApiState>("/api/bus-entries", { signal: controller.signal })
      .then((data) => {
        applyBusSnapshot(data);
        setStatsLoadError(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatsLoadError(true);
      });
    return () => controller.abort();
  }, [applyBusSnapshot, setStatsLoadError, statsRetryToken]);

  // Seuls les profils proches de la caméra sont chargés : le compteur peut ainsi
  // grandir sans télécharger des milliers de commentaires à chaque actualisation.
  useEffect(() => {
    const focusRow = phase === "inside" ? seatRow : 0;
    const from = Math.max(0, (focusRow - 4) * 4);
    const controller = new AbortController();

    void fetchJson<BusApiState & { passengers?: PassengerProfile[] }>(
      `/api/bus-entries?profiles=1&from=${from}&limit=48`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((data) => {
        if (!applyBusSnapshot(data)) return;
        setPassengerProfiles(data.passengers ?? []);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [applyBusSnapshot, phase, profileRevision, seatRow, setPassengerProfiles]);

  // Synchronisation en direct, ralentie et suspendue quand l'onglet est masqué.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const poll = async () => {
      if (stopped || document.hidden) return;
      try {
        const d = await fetchJson<BusApiState>("/api/bus-entries");
        const previousSeatCapacity = seatCapacityRef.current;
        if (!applyBusSnapshot(d, false)) return;
        setCount((prev) => {
          if (prev === null) return d.count;
          if (d.count > prev) {
            const prevRows = computeNumRows(previousSeatCapacity);
            const nextRows = computeNumRows(d.seatCapacity);
            if (nextRows > prevRows) {
              playStretch();
              showToast(
                "Le bus s'allonge !",
                `Nouveaux nakamas à bord ! +${nextRows - prevRows} rangée(s) créée(s)`,
                "🚌 EXTENSION",
              );
            } else {
              showToast(
                "+1 Nakama à bord !",
                `${d.count} passagers voyagent vers Laugh Tale`,
                "⚡ REJOINT",
              );
            }
          }
          return d.count;
        });
      } catch {
        // ignore
      }
    };

    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      if (!document.hidden) {
        timeout = setTimeout(async () => {
          await poll();
          schedule();
        }, 10_000);
      }
    };
    const refresh = () => {
      if (!document.hidden) void poll();
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [applyBusSnapshot, seatCapacityRef, setCount, showToast]);

  // Si l'entrée a échoué temporairement, elle est rejouée avec un délai progressif.
  // Les refus permanents ne déclenchent pas une boucle de requêtes.
  useEffect(() => {
    if (!registrationPending) return;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let running = false;

    const schedule = (delay: number) => {
      if (timeout) clearTimeout(timeout);
      if (!document.hidden) timeout = setTimeout(() => void retryRegistration(), delay);
    };

    const retryRegistration = async () => {
      if (running || controller.signal.aborted || document.hidden) return;
      running = true;
      try {
        const data = await fetchJson<BusApiState & { seatIndex: number | null }>("/api/bus-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ visitorId: getOrCreateVisitorId() }),
          signal: controller.signal,
        });
        applyBusSnapshot(data);
        setCurrentPassengerSeatIndex(data.seatIndex);
        registrationRetryDelayRef.current = 10_000;
        setRegistrationPending(false);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!isRetryableRegistrationError(error)) {
          setRegistrationPending(false);
          showToast("Inscription refusée", "Recharge la page avant de réessayer.", "⚠ ERREUR");
          return;
        }
        attempt += 1;
        const retryAfter = error instanceof ApiError ? error.retryAfterMs : null;
        schedule(Math.max(1_000, retryAfter ?? Math.min(10_000 * 2 ** (attempt - 1), 5 * 60_000)));
      } finally {
        running = false;
      }
    };

    const resume = () => {
      if (!document.hidden) schedule(0);
      else if (timeout) clearTimeout(timeout);
    };

    schedule(registrationRetryDelayRef.current);
    document.addEventListener("visibilitychange", resume);
    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", resume);
      controller.abort();
    };
  }, [applyBusSnapshot, registrationPending, registrationRetryDelayRef, setCurrentPassengerSeatIndex, setRegistrationPending, showToast]);

}
