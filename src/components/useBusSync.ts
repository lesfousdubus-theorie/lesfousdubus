"use client";

import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { playStretch } from "@/lib/horn";
import { getLocale, pickLocale } from "@/lib/i18n";
import { ApiError, fetchJson, getExistingVisitorId, getOrCreateVisitorId, isRetryableRegistrationError, type BusApiState } from "@/lib/client/bus-api";
import { clampLocalSeat, clearSavedLocalSeat, readSavedLocalSeat } from "@/lib/client/local-seat";
import type { PassengerProfile } from "@/types/passenger";
import type { Phase } from "./bus/constants";
import { countPeopleOnBoard } from "@/lib/bus-crew";
import { getBusPhysicalRows, getRegisteredSeat, getRegisteredSeatIndex } from "@/lib/bus-occupancy";
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
  setSeatColumn?: Dispatch<SetStateAction<number | null>>;
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
  applyBusSnapshot, statsRetryToken, setStatsLoadError, phase, seatRow, setSeatRow, setSeatColumn,
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

  const latestProfileRefreshAtRef = useRef(0);
  const lastFetchedProfileRevisionRef = useRef<number | null>(null);
  const lastFetchedProfilesFromRef = useRef<number | null>(null);

  // Récupération initiale en 1 seule requête (stats + 48 premiers profils) avec reprise étalée si D1 est saturé.
  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const loadInitialStats = async () => {
      try {
        const data = await fetchJson<BusApiState & { passengers?: PassengerProfile[] }>(
          "/api/bus-entries?profiles=1&from=0&limit=48",
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const accepted = applyBusSnapshot(data);
        if (accepted && Array.isArray(data.passengers)) {
          const ownSeat = latestRegistrationRef.current.seatIndex;
          const incoming = data.passengers;
          setPassengerProfiles((prev) => {
            if (ownSeat === null) return incoming;
            const ownLocal = prev.find((p) => p.seatIndex === ownSeat);
            return ownLocal ? [...incoming.filter((p) => p.seatIndex !== ownSeat), ownLocal] : incoming;
          });
        }
        lastFetchedProfilesFromRef.current = 0;
        latestProfileRefreshAtRef.current = Date.now();
        lastFetchedProfileRevisionRef.current = data.profileRevision;
        setStatsLoadError(false);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatsLoadError(true);
        attempt += 1;
        const delayMs = Math.min(60_000, 15_000 * attempt) + Math.floor(Math.random() * 5_000);
        if (!document.hidden) {
          retryTimer = setTimeout(() => void loadInitialStats(), delayMs);
        }
      }
    };

    void loadInitialStats();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [applyBusSnapshot, latestRegistrationRef, setPassengerProfiles, setStatsLoadError, statsRetryToken]);

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
          clearSavedLocalSeat();
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
        if (seatIndex !== null && new URLSearchParams(window.location.search).get("row") === null) {
          const savedLocalSeat = readSavedLocalSeat();
          if (savedLocalSeat) {
            const clamped = clampLocalSeat(savedLocalSeat, data.seatCapacity);
            setSeatRow(clamped.row);
            setSeatColumn?.(clamped.column);
          } else {
            const seat = getRegisteredSeat(seatIndex);
            setSeatRow(seat.row);
            setSeatColumn?.(seat.column);
          }
        }
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
    setSeatColumn,
    setSeatRow,
    statsRetryToken,
    visitorLookupPromiseRef,
  ]);

  // Seuls les profils proches de la caméra sont chargés (URL canonique mise en cache Cloudflare,
  // débounced au changement de rangée et plafonnée à 1 rafraîchissement / 45s sur profileRevision).
  useEffect(() => {
    const focusRow = phase === "inside" ? seatRow : 0;
    const blockRow = Math.floor(Math.max(0, focusRow - 4) / 8) * 8;
    const from = getRegisteredSeatIndex(blockRow);
    if (
      lastFetchedProfilesFromRef.current === from
      && lastFetchedProfileRevisionRef.current === profileRevision
    ) {
      return;
    }
    const controller = new AbortController();
    const now = Date.now();
    const revOnlyChange = lastFetchedProfileRevisionRef.current !== null && lastFetchedProfileRevisionRef.current !== profileRevision;
    const delayMs = revOnlyChange
      ? Math.max(250, 45_000 - (now - latestProfileRefreshAtRef.current))
      : 160;

    const timer = setTimeout(() => {
      lastFetchedProfilesFromRef.current = from;
      latestProfileRefreshAtRef.current = Date.now();
      lastFetchedProfileRevisionRef.current = profileRevision;
      void fetchJson<BusApiState & { passengers?: PassengerProfile[] }>(
        `/api/bus-entries?profiles=1&from=${from}&limit=48`,
        { signal: controller.signal },
      )
        .then((data) => {
          const accepted = applyBusSnapshot(data);
          setPassengerProfiles((prev) => {
            const incoming = data.passengers ?? [];
            if (accepted) return incoming;
            const ownSeat = latestRegistrationRef.current.seatIndex;
            if (ownSeat === null) return incoming;
            const ownLocal = prev.find((p) => p.seatIndex === ownSeat);
            return ownLocal ? [...incoming.filter((p) => p.seatIndex !== ownSeat), ownLocal] : incoming;
          });
        })
        .catch(() => undefined);
    }, delayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [applyBusSnapshot, latestRegistrationRef, phase, profileRevision, seatRow, setPassengerProfiles]);

  // Synchronisation en direct avec jitter aléatoire (3–4 min) et reprise étalée
  // pour éviter les vagues simultanées lors des pics de trafic.
  useEffect(() => {
    const getJitteredPollIntervalMs = () => 180_000 + Math.floor(Math.random() * 60_000);
    let currentIntervalMs = getJitteredPollIntervalMs();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let lastPollAt = Date.now();

    const poll = async () => {
      if (stopped || document.hidden) return;
      lastPollAt = Date.now();
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
                  clearSavedLocalSeat();
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
                    const savedLocalSeat = readSavedLocalSeat();
                    if (savedLocalSeat) {
                      const clamped = clampLocalSeat(savedLocalSeat, refreshed.seatCapacity);
                      setSeatRow(clamped.row);
                      setSeatColumn?.(clamped.column);
                    } else {
                      const seat = getRegisteredSeat(nextSeat);
                      setSeatRow(seat.row);
                      setSeatColumn?.(seat.column);
                    }
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
            const locale = getLocale();
            playStretch();
            showToast(
              pickLocale(locale, "Le bus s’allonge !", "The bus gets longer!"),
              pickLocale(
                locale,
                `Nouveaux nakamas à bord ! +${addedRows} ${addedRows > 1 ? "rangées créées" : "rangée créée"}`,
                `New nakama on board! +${addedRows} ${addedRows > 1 ? "rows added" : "row added"}`,
              ),
              pickLocale(locale, "NOUVELLE RANGÉE", "NEW ROW"),
            );
          } else {
            const arrivals = d.count - previousCount;
            const totalPeople = countPeopleOnBoard(d.count);
            const locale = getLocale();
            showToast(
              pickLocale(
                locale,
                arrivals > 1 ? `+${arrivals} Nakamas à bord !` : "+1 Nakama à bord !",
                arrivals > 1 ? `+${arrivals} Nakama on board!` : "+1 Nakama on board!",
              ),
              pickLocale(
                locale,
                `${totalPeople.toLocaleString("fr-FR")} ${totalPeople > 1 ? "passagers voyagent" : "passager voyage"} vers Laugh Tale`,
                `${totalPeople.toLocaleString("en-US")} ${totalPeople > 1 ? "passengers riding" : "passenger riding"} to Laugh Tale`,
              ),
              pickLocale(locale, "À BORD", "ON BOARD"),
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
        const remaining = Math.max(0, currentIntervalMs - (Date.now() - lastPollAt));
        timeout = setTimeout(async () => {
          currentIntervalMs = getJitteredPollIntervalMs();
          await poll();
          schedule();
        }, remaining || currentIntervalMs);
      }
    };
    const refresh = () => {
      if (!document.hidden && Date.now() - lastPollAt >= currentIntervalMs) {
        if (timeout) clearTimeout(timeout);
        const resumeJitter = 1_000 + Math.floor(Math.random() * 14_000);
        timeout = setTimeout(async () => {
          currentIntervalMs = getJitteredPollIntervalMs();
          await poll();
          schedule();
        }, resumeJitter);
        return;
      }
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
  }, [applyBusSnapshot, clearLocalRegistrationOnly, latestRegistrationRef, seatCapacityRef, setCount, setCurrentPassengerEntryNumber, setCurrentPassengerSeatIndex, setSeatColumn, setSeatRow, showToast]);

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
          added?: boolean;
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
          throw new ApiError(
            pickLocale(getLocale(), "Le personnage choisi n’a pas pu être enregistré.", "The chosen character could not be saved."),
            502,
          );
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
          const savedLocalSeat = !data.added ? readSavedLocalSeat() : null;
          if (savedLocalSeat) {
            const clamped = clampLocalSeat(savedLocalSeat, data.seatCapacity);
            setSeatRow(clamped.row);
            setSeatColumn?.(clamped.column);
          } else {
            const seat = getRegisteredSeat(data.seatIndex);
            setSeatRow(seat.row);
            setSeatColumn?.(seat.column);
          }
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
          const locale = getLocale();
          showToast(
            pickLocale(locale, "Inscription refusée", "Registration declined"),
            pickLocale(locale, "Recharge la page avant de réessayer.", "Reload the page before trying again."),
            pickLocale(locale, "ERREUR", "ERROR"),
          );
          return;
        }
        attempt += 1;
        const retryAfter = error instanceof ApiError ? error.retryAfterMs : null;
        const backoff = Math.min(8_000 * 2 ** (attempt - 1), 5 * 60_000);
        const base = Math.max(2_000, retryAfter ?? 0, backoff);
        const jitter = Math.floor(Math.random() * Math.min(30_000, Math.round(base * 0.5)));
        schedule(Math.min(5 * 60_000, base + jitter));
      } finally {
        running = false;
      }
    };

    const resume = () => {
      if (!document.hidden) schedule(1_500 + Math.floor(Math.random() * 5_500));
      else if (timeout) clearTimeout(timeout);
    };

    schedule(registrationRetryDelayRef.current);
    document.addEventListener("visibilitychange", resume);
    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", resume);
      controller.abort();
    };
  }, [applyBusSnapshot, latestRegistrationRef, pendingAvatarId, pendingRegistrationProfileRef, registrationPending, registrationRetryDelayRef, restoreSavedProfile, setCurrentPassengerEntryNumber, setCurrentPassengerSeatIndex, setPassengerProfiles, setRegistrationPending, setSeatColumn, setSeatRow, showToast]);

}
