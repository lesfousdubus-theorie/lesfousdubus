"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, type BusApiState } from "@/lib/client/bus-api";
import type { PassengerManifestEntry, PassengerProfile } from "@/types/passenger";

/** Liste paginée et fiches passagers : chaque réponse reste attachée à sa requête active. */
export function usePassengerDirectory(applyBusSnapshot: (data: BusApiState) => boolean) {
  const [showPassengerList, setShowPassengerList] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerProfile | null>(null);
  const [passengerOpenedFromList, setPassengerOpenedFromList] = useState(false);
  const [passengerCardLoading, setPassengerCardLoading] = useState(false);
  const [passengerCardError, setPassengerCardError] = useState("");
  const [passengerManifest, setPassengerManifest] = useState<PassengerManifestEntry[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestError, setManifestError] = useState("");
  const [manifestNextFrom, setManifestNextFrom] = useState(0);
  const [manifestHasMore, setManifestHasMore] = useState(false);
  const passengerManifestButtonRef = useRef<HTMLButtonElement>(null);
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
      const data = await fetchJson<{ passenger: PassengerProfile }>(`/api/bus-entries?seat=${summary.seatIndex}`, {
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
  }, []);

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
      }>(`/api/bus-entries?manifest=1&from=${from}&limit=100`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (manifestRequest.current !== controller) return;
      if (!applyBusSnapshot(data)) return;
      setPassengerManifest((current) => from === 0 ? data.passengers : [...current, ...data.passengers]);
      setManifestNextFrom(data.nextFrom);
      setManifestHasMore(data.hasMore);
    } catch {
      if (controller.signal.aborted) return;
      setManifestError("Impossible de charger les passagers pour le moment.");
    } finally {
      if (manifestRequest.current === controller) setManifestLoading(false);
    }
  }, [applyBusSnapshot]);

  const openPassengerManifest = useCallback(() => {
    setPassengerManifest([]);
    setShowPassengerList(true);
    void loadPassengerManifest(0);
  }, [loadPassengerManifest]);

  const closePassengerManifest = useCallback(() => {
    manifestRequest.current?.abort();
    manifestRequest.current = null;
    setManifestLoading(false);
    setShowPassengerList(false);
  }, []);

  const selectPassenger = useCallback((passenger: PassengerProfile) => {
    setPassengerOpenedFromList(false);
    void openPassengerCard(passenger);
  }, [openPassengerCard]);

  const selectFromManifest = useCallback((passenger: PassengerManifestEntry) => {
    closePassengerManifest();
    setPassengerOpenedFromList(true);
    void openPassengerCard({ seatIndex: passenger.seatIndex, displayName: passenger.displayName ?? "Anonyme", comment: null });
  }, [closePassengerManifest, openPassengerCard]);

  const closePassengerCard = useCallback(() => {
    passengerCardRequest.current?.abort(); passengerCardRequest.current = null;
    setSelectedPassenger(null);
    window.requestAnimationFrame(() => passengerManifestButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  const backToManifest = useCallback(() => {
    passengerCardRequest.current?.abort(); passengerCardRequest.current = null;
    setSelectedPassenger(null); setShowPassengerList(true);
  }, []);

  const clearDirectory = useCallback(() => {
    passengerCardRequest.current?.abort(); manifestRequest.current?.abort();
    passengerCardRequest.current = null; manifestRequest.current = null;
    setPassengerManifest([]); setSelectedPassenger(null); setShowPassengerList(false); setManifestLoading(false);
  }, []);

  return { selectedPassenger, passengerOpenedFromList, passengerCardLoading, passengerCardError,
    passengerManifest, manifestLoading, manifestError, manifestNextFrom, manifestHasMore, showPassengerList,
    passengerManifestButtonRef, openPassengerCard, loadPassengerManifest, openPassengerManifest, closePassengerManifest,
    selectPassenger, selectFromManifest, closePassengerCard, backToManifest, clearDirectory };
}
