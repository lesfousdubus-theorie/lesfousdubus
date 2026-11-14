"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, type BusApiState } from "@/lib/client/bus-api";
import type { PassengerManifestEntry, PassengerProfile } from "@/types/passenger";

/** Liste paginée et fiches passagers : chaque réponse reste attachée à sa requête active. */
export function usePassengerDirectory(applyBusSnapshot: (data: BusApiState) => boolean, profileRevision = 0) {
  const [showPassengerList, setShowPassengerList] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerProfile | null>(null);
  const [passengerOpenedFromList, setPassengerOpenedFromList] = useState(false);
  const [passengerCardLoading, setPassengerCardLoading] = useState(false);
  const [passengerCardError, setPassengerCardError] = useState("");
  const [passengerManifest, setPassengerManifest] = useState<PassengerManifestEntry[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestError, setManifestError] = useState("");
  const [manifestNextFrom, setManifestNextFrom] = useState(0);
  const [manifestHasMore, setManifestHasMore] = useState(false);
  const [lastManifestSeatIndex, setLastManifestSeatIndex] = useState<number | null>(null);
  const [manifestSearchQuery, setManifestSearchQuery] = useState("");
  const [manifestOnlyWithComment, setManifestOnlyWithComment] = useState(false);
  const passengerManifestButtonRef = useRef<HTMLButtonElement>(null);
  const openedFromManifestRef = useRef(false);
  const selectedManifestSeatRef = useRef<number | null>(null);
  const loadedManifestRevisionRef = useRef<number | null>(null);
  const manifestScrollTopRef = useRef(0);
  const [manifestScrollTop, setManifestScrollTop] = useState(0);
  const passengerCardRequest = useRef<AbortController | null>(null);
  const manifestRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { passengerCardRequest.current?.abort(); manifestRequest.current?.abort(); }, []);

  const openPassengerCard = useCallback(async (summary: PassengerProfile) => {
    passengerCardRequest.current?.abort();
    const controller = new AbortController();
    passengerCardRequest.current = controller;
    setSelectedPassenger(summary);
    setPassengerCardError("");
    setPassengerCardLoading(true);

    try {
      const data = await fetchJson<{ passenger: PassengerProfile }>(`/api/bus-entries?seat=${summary.seatIndex}&rev=${profileRevision}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (passengerCardRequest.current !== controller) return;
      setSelectedPassenger(data.passenger);
    } catch {
      if (controller.signal.aborted) return;
      setPassengerCardError("Impossible de charger ce message pour le moment.");
    } finally {
      if (passengerCardRequest.current === controller) setPassengerCardLoading(false);
    }
  }, [profileRevision]);

  useEffect(() => {
    if (!selectedPassenger) passengerCardRequest.current?.abort();
  }, [selectedPassenger]);

  const loadPassengerManifest = useCallback(async (from = 0) => {
    if (from === 0) manifestRequest.current?.abort();
    const controller = new AbortController();
    manifestRequest.current = controller;
    setManifestLoading(true);
    setManifestError("");
    try {
      const data = await fetchJson<BusApiState & {
        passengers: PassengerManifestEntry[];
        nextFrom: number;
        hasMore: boolean;
      }>(`/api/bus-entries?manifest=1&from=${from}&limit=60&rev=${profileRevision}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (manifestRequest.current !== controller) return;
      if (!applyBusSnapshot(data)) return;
      if (from === 0) loadedManifestRevisionRef.current = profileRevision;
      setPassengerManifest((current) => from === 0 ? data.passengers : [...current, ...data.passengers]);
      setManifestNextFrom(data.nextFrom);
      setManifestHasMore(data.hasMore);
    } catch {
      if (controller.signal.aborted) return;
      setManifestError("Impossible de charger les passagers pour le moment.");
    } finally {
      if (manifestRequest.current === controller) setManifestLoading(false);
    }
  }, [applyBusSnapshot, profileRevision]);

  const saveManifestScrollTop = useCallback((scrollTop: number) => {
    manifestScrollTopRef.current = scrollTop;
  }, []);

  const refreshPassengerManifest = useCallback(() => {
    void loadPassengerManifest(0);
  }, [loadPassengerManifest]);

  const openPassengerManifest = useCallback(() => {
    openedFromManifestRef.current = false;
    selectedManifestSeatRef.current = null;
    setLastManifestSeatIndex(null);
    manifestScrollTopRef.current = 0;
    setManifestScrollTop(0);
    setManifestSearchQuery("");
    setManifestOnlyWithComment(false);
    setShowPassengerList(true);
    if (passengerManifest.length === 0 || Boolean(manifestError) || loadedManifestRevisionRef.current !== profileRevision) {
      setPassengerManifest([]);
      void loadPassengerManifest(0);
      return;
    }
    void loadPassengerManifest(0);
  }, [loadPassengerManifest, manifestError, passengerManifest.length, profileRevision]);

  const closePassengerManifest = useCallback(() => {
    manifestRequest.current?.abort();
    manifestRequest.current = null;
    setManifestLoading(false);
    setShowPassengerList(false);
  }, []);

  const selectPassenger = useCallback((passenger: PassengerProfile) => {
    openedFromManifestRef.current = false;
    selectedManifestSeatRef.current = null;
    setLastManifestSeatIndex(null);
    setPassengerOpenedFromList(false);
    void openPassengerCard(passenger);
  }, [openPassengerCard]);

  const selectFromManifest = useCallback((passenger: PassengerManifestEntry) => {
    openedFromManifestRef.current = true;
    selectedManifestSeatRef.current = passenger.seatIndex;
    setLastManifestSeatIndex(passenger.seatIndex);
    setManifestScrollTop(manifestScrollTopRef.current);
    closePassengerManifest();
    setPassengerOpenedFromList(true);
    void openPassengerCard({
      seatIndex: passenger.seatIndex,
      entryNumber: passenger.entryNumber,
      displayName: passenger.displayName ?? "Anonyme",
      comment: null,
    });
  }, [closePassengerManifest, openPassengerCard]);

  const closePassengerCard = useCallback(() => {
    passengerCardRequest.current?.abort(); passengerCardRequest.current = null;
    const fromManifest = openedFromManifestRef.current;
    openedFromManifestRef.current = false;
    selectedManifestSeatRef.current = null;
    setLastManifestSeatIndex(null);
    setPassengerOpenedFromList(false);
    setSelectedPassenger(null);
    if (fromManifest) {
      window.requestAnimationFrame(() => passengerManifestButtonRef.current?.focus({ preventScroll: true }));
    }
  }, []);

  const backToManifest = useCallback(() => {
    passengerCardRequest.current?.abort(); passengerCardRequest.current = null;
    setSelectedPassenger(null);
    setShowPassengerList(true);
    if (passengerManifest.length === 0 || Boolean(manifestError)) {
      void loadPassengerManifest(0);
    }
  }, [loadPassengerManifest, manifestError, passengerManifest.length]);

  const clearDirectory = useCallback(() => {
    passengerCardRequest.current?.abort(); manifestRequest.current?.abort();
    passengerCardRequest.current = null; manifestRequest.current = null;
    openedFromManifestRef.current = false;
    selectedManifestSeatRef.current = null;
    loadedManifestRevisionRef.current = null;
    manifestScrollTopRef.current = 0;
    setManifestScrollTop(0);
    setLastManifestSeatIndex(null);
    setPassengerOpenedFromList(false);
    setManifestSearchQuery("");
    setManifestOnlyWithComment(false);
    setPassengerManifest([]); setSelectedPassenger(null); setShowPassengerList(false); setManifestLoading(false);
  }, []);

  return { showMessages, setShowMessages, selectedPassenger, passengerOpenedFromList, passengerCardLoading, passengerCardError,
    passengerManifest, manifestLoading, manifestError, manifestNextFrom, manifestHasMore, showPassengerList,
    lastManifestSeatIndex, manifestScrollTop, saveManifestScrollTop, manifestSearchQuery, setManifestSearchQuery,
    manifestOnlyWithComment, setManifestOnlyWithComment, refreshPassengerManifest,
    passengerManifestButtonRef, openPassengerCard, loadPassengerManifest, openPassengerManifest, closePassengerManifest,
    selectPassenger, selectFromManifest, closePassengerCard, backToManifest, clearDirectory };
}
