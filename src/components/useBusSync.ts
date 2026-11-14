"use client";

import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { playStretch } from "@/lib/horn";
import { ApiError, fetchJson, getExistingVisitorId, getOrCreateVisitorId, isRetryableRegistrationError, type BusApiState } from "@/lib/client/bus-api";
import type { PassengerProfile } from "@/types/passenger";
import type { Phase } from "./bus/constants";
import { computeNumRows } from "@/lib/bus-layout";
import { countPeopleOnBoard } from "@/lib/bus-crew";
import { getBusPhysicalRows } from "@/lib/bus-occupancy";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import type { OnboardingReason } from "./modals/OnboardingModal";
import type { OnboardingSeed } from "./usePassengerProfile";

export interface PendingRegistrationProfile {
  displayName?: string;
  comment?: string;
  avatarId?: PassengerAvatarId | null;
}

export interface VisitorLookupResult {
  seatIndex: number | null;
  entryNumber?: number | null;
  hasDisplayName: boolean;
  displayName: string;
}

interface BusSyncOptions {
  pendingAvatarId: PassengerAvatarId | null;
  pendingRegistrationProfileRef: RefObject<PendingRegistrationProfile | null>;
  visitorLookupPromiseRef: RefObject<Promise<VisitorLookupResult | null> | null>;
  latestRegistrationRef: RefObject<{ seatIndex: number | null; displayName: string }>;
  applyBusSnapshot: (data: BusApiState, updateCount?: boolean) => boolean;
  statsRetryToken: number;
  setStatsLoadError: Dispatch<SetStateAction<boolean>>;
  phase: Phase;
  seatRow: number;
  setSeatRow: Dispatch<SetStateAction<number>>;
  profileRevision: number;
  setPassengerProfiles: Dispatch<SetStateAction<PassengerProfile[]>>;
  seatCapacityRef: RefObject<number>;
  count: number | null;
  setCount: Dispatch<SetStateAction<number | null>>;
  showToast: (text: string, sub?: string, badge?: string) => void;
  registrationPending: boolean;
  registrationRetryDelayRef: RefObject<number>;
  setCurrentPassengerSeatIndex: Dispatch<SetStateAction<number | null>>;
  setCurrentPassengerEntryNumber: Dispatch<SetStateAction<number | null>>;
  setRegistrationPending: Dispatch<SetStateAction<boolean>>;
  restoreSavedProfile: (passenger: PassengerProfile | null) => void;
  clearLocalRegistrationOnly: () => void;
  openOnboardingModal: (reason: OnboardingReason, initialError?: string, seed?: OnboardingSeed) => void;
}

export function useBusSync({
  applyBusSnapshot, statsRetryToken, setStatsLoadError, phase, seatRow, setSeatRow,
  profileRevision, setPassengerProfiles, seatCapacityRef, count, setCount, showToast,
  registrationPending, registrationRetryDelayRef, setCurrentPassengerSeatIndex,
  setCurrentPassengerEntryNumber, setRegistrationPending, restoreSavedProfile, clearLocalRegistrationOnly,
  openOnboardingModal, pendingAvatarId, pendingRegistrationProfileRef,
  visitorLookupPromiseRef, latestRegistrationRef,
}: BusSyncOptions) {
  const countRef = useRef(count);
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const registrationPendingRef = useRef(registrationPending);
  useEffect(() => {
    registrationPendingRef.current = registrationPending;
  }, [registrationPending]);

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

  // Vérification initiale de la fiche du visiteur en base :
  // - inscrit sans pseudo -> ouvre immédiatement la fenêtre d'identification ;
  // - inscrit avec pseudo -> restaure le profil sans ouvrir la fenêtre ;
  // - non inscrit -> efface le cache d'inscription obsolète sans ouvrir la fenêtre.
  useEffect(() => {
    const visitorId = getExistingVisitorId();
    if (!visitorId) {
      visitorLookupPromiseRef.current = null;
      return;
    }

    const controller = new AbortController();
    const lookupPromise: Promise<VisitorLookupResult | null> = fetchJson<BusApiState & {
      registered?: boolean;
      hasDisplayName?: boolean;
      seatIndex?: number | null;
      entryNumber?: number | null;
      passenger?: PassengerProfile | null;
    }>(`/api/bus-entries?visitorId=${encodeURIComponent(visitorId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((data): VisitorLookupResult | null => {
        if (controller.signal.aborted || registrationPendingRef.current) return null;
        applyBusSnapshot(data);

        const registered = typeof data.registered === "boolean"
          ? data.registered
          : (data.seatIndex !== null && data.seatIndex !== undefined && data.passenger !== null);
        if (!registered) {
          latestRegistrationRef.current = { seatIndex: null, displayName: "" };
          setCurrentPassengerSeatIndex(null);
          setCurrentPassengerEntryNumber(null);
          clearLocalRegistrationOnly();
          return { seatIndex: null, entryNumber: null, hasDisplayName: false, displayName: "" };
        }

        const seatIndex = data.seatIndex ?? data.passenger?.seatIndex ?? null;
        const entryNumber = data.entryNumber ?? data.passenger?.entryNumber ?? (seatIndex !== null ? seatIndex + 1 : null);
        const rawName = (data.passenger?.displayName ?? "").trim();
        const hasDisplayName = typeof data.hasDisplayName === "boolean"
          ? data.hasDisplayName
          : Boolean(rawName && rawName !== "Anonyme");
        const normalizedName = hasDisplayName ? rawName : "";
        const normalizedPassenger: PassengerProfile | null = data.passenger
          ? { ...data.passenger, displayName: normalizedName }
          : seatIndex !== null
            ? { seatIndex, entryNumber: entryNumber ?? undefined, displayName: "", comment: null, avatarId: null }
            : null;

        latestRegistrationRef.current = { seatIndex, displayName: normalizedName };
        setCurrentPassengerSeatIndex(seatIndex);
        setCurrentPassengerEntryNumber(entryNumber);
        restoreSavedProfile(normalizedPassenger);
        if (normalizedPassenger) {
          const hasPublicData = Boolean(
            normalizedPassenger.displayName
            || normalizedPassenger.comment
            || normalizedPassenger.avatarId,
          );
          setPassengerProfiles((profiles) =>
            hasPublicData
              ? [...profiles.filter((profile) => profile.seatIndex !== normalizedPassenger.seatIndex), normalizedPassenger]
              : profiles.filter((profile) => profile.seatIndex !== normalizedPassenger.seatIndex),
          );
        }
        if (!hasDisplayName) {
          openOnboardingModal("missing-name", "", {
            displayName: "",
            comment: normalizedPassenger?.comment ?? "",
            avatarId: normalizedPassenger?.avatarId ?? null,
            hasLockedDbAvatar: Boolean(normalizedPassenger?.avatarId),
          });
        }
        return { seatIndex, entryNumber, hasDisplayName, displayName: normalizedName };
      })
      .catch(() => null)
      .finally(() => {
        if (visitorLookupPromiseRef.current === lookupPromise) {
          visitorLookupPromiseRef.current = null;
        }
      });

    visitorLookupPromiseRef.current = lookupPromise;
    return () => {
      controller.abort();
      if (visitorLookupPromiseRef.current === lookupPromise) {
        visitorLookupPromiseRef.current = null;
      }
    };
  }, [
    applyBusSnapshot,
    clearLocalRegistrationOnly,
    latestRegistrationRef,
    openOnboardingModal,
    restoreSavedProfile,
    setCurrentPassengerEntryNumber,
    setCurrentPassengerSeatIndex,
    setPassengerProfiles,
    statsRetryToken,
    visitorLookupPromiseRef,
  ]);

  // Seuls les profils proches de la caméra sont chargés : le compteur peut ainsi
  // grandir sans télécharger des milliers de commentaires à chaque actualisation.
  useEffect(() => {
    const focusRow = phase === "inside" ? seatRow : 0;
    const from = Math.max(0, (focusRow - 4) * 4);
    const controller = new AbortController();

    void fetchJson<BusApiState & { passengers?: PassengerProfile[] }>(
      `/api/bus-entries?profiles=1&from=${from}&limit=48&rev=${profileRevision}`, {
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
        const previousCount = countRef.current;
        if (!applyBusSnapshot(d, false)) return;
        countRef.current = d.count;
        setCount(d.count);

        const activeSeat = latestRegistrationRef.current.seatIndex;
        const shrunk = (previousCount !== null && d.count < previousCount)
          || d.seatCapacity < previousSeatCapacity
          || (activeSeat !== null && activeSeat >= d.seatCapacity);
        if (shrunk && activeSeat !== null && !registrationPendingRef.current) {
          const visitorId = getExistingVisitorId();
          if (visitorId) {
            try {
              const refreshed = await fetchJson<BusApiState & {
                registered?: boolean;
                seatIndex?: number | null;
                entryNumber?: number | null;
                passenger?: PassengerProfile | null;
              }>(`/api/bus-entries?visitorId=${encodeURIComponent(visitorId)}`, { cache: "no-store" });
              if (!stopped) {
                applyBusSnapshot(refreshed);
                if (refreshed.registered === false || refreshed.seatIndex === null || refreshed.seatIndex === undefined) {
                  latestRegistrationRef.current = { seatIndex: null, displayName: "" };
                  setCurrentPassengerSeatIndex(null);
                  setCurrentPassengerEntryNumber(null);
                  clearLocalRegistrationOnly();
                } else {
                  const nextSeat = refreshed.seatIndex;
                  const nextEntry = refreshed.entryNumber ?? refreshed.passenger?.entryNumber ?? nextSeat + 1;
                  if (nextSeat !== latestRegistrationRef.current.seatIndex) {
                    latestRegistrationRef.current = {
                      seatIndex: nextSeat,
                      displayName: refreshed.passenger?.displayName?.trim() || latestRegistrationRef.current.displayName,
                    };
                    setCurrentPassengerSeatIndex(nextSeat);
                    setSeatRow(Math.min(computeNumRows(refreshed.seatCapacity) - 1, Math.floor(nextSeat / 4)));
                  }
                  setCurrentPassengerEntryNumber(nextEntry);
                }
              }
            } catch {
              // ignore transient poll lookup failure
            }
          }
        }

        if (previousCount !== null && d.count > previousCount) {
          const prevRows = getBusPhysicalRows(previousSeatCapacity);
          const nextRows = getBusPhysicalRows(d.seatCapacity);
          if (nextRows > prevRows) {
            const addedRows = nextRows - prevRows;
            playStretch();
            showToast(
              "Le bus s’allonge !",
              `Nouveaux nakamas à bord ! +${addedRows} ${addedRows > 1 ? "rangées créées" : "rangée créée"}`,
              "NOUVELLE RANGÉE",
            );
          } else {
            const arrivals = d.count - previousCount;
            const totalPeople = countPeopleOnBoard(d.count);
            showToast(
              arrivals > 1 ? `+${arrivals} Nakamas à bord !` : "+1 Nakama à bord !",
              `${totalPeople.toLocaleString("fr-FR")} ${totalPeople > 1 ? "passagers voyagent" : "passager voyage"} vers Laugh Tale`,
              "À BORD",
            );
          }
        }
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
  }, [applyBusSnapshot, clearLocalRegistrationOnly, latestRegistrationRef, seatCapacityRef, setCount, setCurrentPassengerEntryNumber, setCurrentPassengerSeatIndex, setSeatRow, showToast]);

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
        const retryProfile = pendingRegistrationProfileRef.current;
        const retryAvatarId = retryProfile?.avatarId ?? pendingAvatarId ?? null;
        const retryPayload: {
          visitorId: string;
          displayName?: string;
          comment?: string;
          avatarId?: PassengerAvatarId;
        } = { visitorId: getOrCreateVisitorId() };
        if (retryProfile?.displayName) retryPayload.displayName = retryProfile.displayName;
        if (
          retryProfile
          && retryProfile.comment !== undefined
          && (retryProfile.comment || latestRegistrationRef.current.seatIndex !== null)
        ) {
          retryPayload.comment = retryProfile.comment;
        }
        if (retryAvatarId) retryPayload.avatarId = retryAvatarId;

        const data = await fetchJson<BusApiState & {
          seatIndex: number | null;
          entryNumber?: number | null;
          passenger: PassengerProfile | null;
        }>("/api/bus-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(retryPayload),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (retryAvatarId && data.passenger?.avatarId !== retryAvatarId) {
          throw new ApiError("Le personnage choisi n’a pas pu être enregistré.", 502);
        }
        pendingRegistrationProfileRef.current = null;
        applyBusSnapshot(data);
        setCurrentPassengerSeatIndex(data.seatIndex);
        setCurrentPassengerEntryNumber((previous) =>
          data.seatIndex === null
            ? null
            : (data.entryNumber ?? data.passenger?.entryNumber ?? previous ?? data.seatIndex + 1),
        );
        const resolvedPassenger = data.passenger ?? (
          data.seatIndex !== null && retryProfile?.displayName
            ? {
                seatIndex: data.seatIndex,
                entryNumber: data.entryNumber ?? data.seatIndex + 1,
                displayName: retryProfile.displayName,
                comment: retryProfile.comment || null,
                avatarId: retryAvatarId,
              }
            : null
        );
        latestRegistrationRef.current = {
          seatIndex: data.seatIndex,
          displayName: resolvedPassenger?.displayName?.trim() || retryProfile?.displayName || "",
        };
        restoreSavedProfile(resolvedPassenger);
        if (data.seatIndex !== null) {
          setSeatRow(Math.min(computeNumRows(data.seatCapacity) - 1, Math.floor(data.seatIndex / 4)));
        }
        if (resolvedPassenger) {
          setPassengerProfiles((profiles) => [
            ...profiles.filter((profile) => profile.seatIndex !== resolvedPassenger.seatIndex),
            resolvedPassenger,
          ]);
        }
        registrationRetryDelayRef.current = 10_000;
        setRegistrationPending(false);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!isRetryableRegistrationError(error)) {
          pendingRegistrationProfileRef.current = null;
          setRegistrationPending(false);
          showToast("Inscription refusée", "Recharge la page avant de réessayer.", "ERREUR");
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
  }, [applyBusSnapshot, latestRegistrationRef, pendingAvatarId, pendingRegistrationProfileRef, registrationPending, registrationRetryDelayRef, restoreSavedProfile, setCurrentPassengerEntryNumber, setCurrentPassengerSeatIndex, setPassengerProfiles, setRegistrationPending, setSeatRow, showToast]);

}
