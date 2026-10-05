"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./bus/Scene";
import { BusHud, type ToastMessage } from "./BusHud";
import { computeNumRows } from "@/lib/bus-layout";
import { type Phase, type WorldState } from "./bus/constants";
import type { PassengerManifestEntry, PassengerProfile } from "@/types/passenger";
import { playDing, playStretch, unlockAudio } from "@/lib/horn";
import { useBusControls } from "./useBusControls";
import { getOrCreateVisitorId, isRetryableRegistrationError, fetchJson, ApiError, type BusApiState } from "@/lib/client/bus-api";
import { JoinBusModal } from "./modals/JoinBusModal";
import { PassengerCard } from "./modals/PassengerCard";
import { PassengerListModal } from "./modals/PassengerListModal";
import { TheoryAgeModal } from "./modals/TheoryAgeModal";
import { getTheoryAgeInDays } from "@/lib/theory-age";
import { useBusSync } from "./useBusSync";
import { useVisualViewport } from "./useVisualViewport";

const TheoryModal = dynamic(() => import("./theory/TheoryModal"), { ssr: false });

const MAX_DEBUG_PASSENGERS = 10_000;

export default function BusExperience() {
  useVisualViewport();
  const [resetViewToken, setResetViewToken] = useState(0);
  const [sceneAvailable, setSceneAvailable] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("phase");
      if (p === "inside") return "inside";
    }
    return "outside";
  });
  const [tvOn, setTvOn] = useState(false);

  // Le lecteur est préchargé dès l'arrivée, mais reste en pause et invisible avant l'entrée.
  const [hasEntered, setHasEntered] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("phase");
      if (p === "inside") return true;
    }
    return false;
  });
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [showPassengerList, setShowPassengerList] = useState(false);
  const [showTheoryAge, setShowTheoryAge] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<"name" | "comment">("name");
  const [joinName, setJoinName] = useState("");
  const [joinComment, setJoinComment] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState(() => {
    try { return { name: localStorage.getItem("fdb-display-name") ?? "", comment: localStorage.getItem("fdb-comment") ?? "" }; }
    catch { return { name: "", comment: "" }; }
  });
  const [passengerProfiles, setPassengerProfiles] = useState<PassengerProfile[]>([]);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerProfile | null>(null);
  const [passengerOpenedFromList, setPassengerOpenedFromList] = useState(false);
  const [passengerCardLoading, setPassengerCardLoading] = useState(false);
  const [passengerCardError, setPassengerCardError] = useState("");
  const [currentPassengerSeatIndex, setCurrentPassengerSeatIndex] = useState<number | null>(null);
  const [passengerManifest, setPassengerManifest] = useState<PassengerManifestEntry[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestError, setManifestError] = useState("");
  const [manifestNextFrom, setManifestNextFrom] = useState(0);
  const [manifestHasMore, setManifestHasMore] = useState(false);
  const [seatCapacity, setSeatCapacity] = useState(() => {
    if (typeof window === "undefined") return 0;
    const value = Number(new URLSearchParams(window.location.search).get("count"));
    return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, MAX_DEBUG_PASSENGERS) : 0;
  });
  const [profileRevision, setProfileRevision] = useState(0);
  const [vacantSeatRanges, setVacantSeatRanges] = useState<Array<[number, number, number]>>([]);
  const [registrationPending, setRegistrationPending] = useState(false);
  const [statsLoadError, setStatsLoadError] = useState(false);
  const [statsRetryToken, setStatsRetryToken] = useState(0);
  const [theoryAgeInDays, setTheoryAgeInDays] = useState(getTheoryAgeInDays);

  // Compteur initial démarre à 0 si la base est vide (le bus est vide au début)
  const [count, setCount] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const c = new URLSearchParams(window.location.search).get("count");
      if (c !== null) {
        const parsed = parseInt(c, 10);
        if (Number.isSafeInteger(parsed) && parsed >= 0) return Math.min(parsed, MAX_DEBUG_PASSENGERS);
      }
    }
    return null;
  });

  const [seatRow, setSeatRow] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("row");
      if (r !== null) {
        const parsed = parseInt(r, 10);
        const debugCount = Number(params.get("count"));
        const debugCapacity = Number.isSafeInteger(debugCount) && debugCount >= 0
          ? Math.min(debugCount, MAX_DEBUG_PASSENGERS)
          : 0;
        if (Number.isSafeInteger(parsed) && parsed >= 0) {
          return Math.min(parsed, computeNumRows(debugCapacity) - 1);
        }
      }
    }
    return 3;
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passengerManifestButtonRef = useRef<HTMLButtonElement>(null);
  const passengerCardRequest = useRef<AbortController | null>(null);
  const manifestRequest = useRef<AbortController | null>(null);
  const profileRequest = useRef<AbortController | null>(null);
  const profileMutationLock = useRef(false);
  const registrationRetryDelayRef = useRef(10_000);
  const seatCapacityRef = useRef(seatCapacity);
  const profileRevisionRef = useRef(profileRevision);
  const worldRef = useRef<WorldState>({
    daylight: 1,
    timeOfDay: 0.2,
    zone: 0,
    scroll: 0,
    speedMultiplier: 1.0,
    weather: "clear",
    weatherIntensity: 0,
  });

  const {
    headlights, hornPulse, speedMultiplier, isNight, manualDayNight,
    toggleDayNight, accelerateBus, decelerateBus, toggleHeadlights, honk,
  } = useBusControls(phase, worldRef);

  // Affiche une notification festive
  const showToast = useCallback((text: string, sub?: string, badge?: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    const id = Date.now();
    setToast({ id, text, sub, badge });
    toastTimeout.current = setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 2800);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = null;
    setToast(null);
  }, []);

  const updateSeatCapacity = useCallback((capacity: number) => {
    seatCapacityRef.current = capacity;
    setSeatCapacity(capacity);
    setSeatRow((row) => Math.min(row, computeNumRows(capacity) - 1));
  }, [setSeatRow]);

  const applyBusSnapshot = useCallback((data: BusApiState, updateCount = true) => {
    if (
      !Number.isSafeInteger(data.count) || data.count < 0
      || !Number.isSafeInteger(data.seatCapacity) || data.seatCapacity < data.count
      || !Number.isSafeInteger(data.profileRevision) || data.profileRevision < 0
      || !Array.isArray(data.vacantSeatRanges)
      || !data.vacantSeatRanges.every((range) => Array.isArray(range)
        && range.length === 3
        && range.every((value) => Number.isSafeInteger(value) && value >= 0))
    ) {
      throw new ApiError("Réponse du serveur invalide.", 502);
    }
    if (data.profileRevision < profileRevisionRef.current) return false;
    profileRevisionRef.current = data.profileRevision;
    setProfileRevision(data.profileRevision);
    setVacantSeatRanges((previous) =>
      previous.length === data.vacantSeatRanges.length
      && previous.every((range, index) => range.every((value, part) => value === data.vacantSeatRanges[index][part]))
        ? previous
        : data.vacantSeatRanges,
    );
    updateSeatCapacity(data.seatCapacity);
    if (updateCount) setCount(data.count);
    return true;
  }, [updateSeatCapacity]);

  // Actualise le compteur d'âge exactement au prochain minuit local.
  useEffect(() => {
    let timer = 0;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(() => {
        setTheoryAgeInDays(getTheoryAgeInDays());
        scheduleNextMidnight();
      }, Math.max(1_000, nextMidnight.getTime() - now.getTime() + 250));
    };
    scheduleNextMidnight();
    return () => window.clearTimeout(timer);
  }, []);


  useEffect(() => () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    passengerCardRequest.current?.abort();
    manifestRequest.current?.abort();
    profileRequest.current?.abort();
  }, []);

  useBusSync({
    applyBusSnapshot,
    statsRetryToken,
    setStatsLoadError,
    phase,
    seatRow,
    profileRevision,
    setPassengerProfiles,
    seatCapacityRef,
    count,
    setCount,
    showToast,
    registrationPending,
    registrationRetryDelayRef,
    setCurrentPassengerSeatIndex,
    setRegistrationPending,
  });

  // Empêche tout scroll de la page
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  // L'entrée et la lecture vidéo partent pendant le geste utilisateur, sans
  // attendre Cloudflare. L'inscription se synchronise ensuite en arrière-plan.
  const enterBus = useCallback(async () => {
    if (phase !== "outside" || joining || !sceneAvailable) return;
    dismissToast();
    unlockAudio();
    window.dispatchEvent(new Event("bus-tv-user-play"));
    setJoining(true);
    setHasEntered(true);
    setTvOn(true);
    setPhase("entering");
    playDing();

    const visitorId = getOrCreateVisitorId();

    try {
      const d = await fetchJson<BusApiState & {
        added: boolean;
        passenger: PassengerProfile | null;
        seatIndex: number | null;
      }>("/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ visitorId }),
      });
      const prevRows = computeNumRows(seatCapacityRef.current);
      const nextRows = computeNumRows(d.seatCapacity);

      if (d.added && nextRows > prevRows) {
        playStretch();
      }
      applyBusSnapshot(d);
      setRegistrationPending(false);
      setCurrentPassengerSeatIndex(d.seatIndex);
      // Synchronise le profil depuis la base : restaure le commentaire existant
      // même si le visiteur a vidé ses cookies ou changé d'onglet.
      const restoredComment = d.passenger?.comment ?? "";
      setSavedProfile((previous) => ({
        name: d.passenger?.displayName ?? previous.name,
        comment: restoredComment || previous.comment,
      }));
      try {
        if (d.passenger?.displayName) localStorage.setItem("fdb-display-name", d.passenger.displayName);
        if (restoredComment) localStorage.setItem("fdb-comment", restoredComment);
      } catch {
        // Le stockage local reste optionnel.
      }
      if (d.seatIndex !== null) {
        setSeatRow(Math.min(computeNumRows(d.seatCapacity) - 1, Math.floor(d.seatIndex / 4)));
      }
      if (d.passenger) {
        setPassengerProfiles((profiles) => [
          ...profiles.filter((profile) => profile.seatIndex !== d.passenger!.seatIndex),
          d.passenger!,
        ]);
      }
    } catch (error) {
      if (!isRetryableRegistrationError(error)) {
        setRegistrationPending(false);
        showToast(
          "Mode visiteur",
          error instanceof ApiError ? error.message : "Le bus reste accessible sans inscription.",
          "⚠ SYNCHRO",
        );
        return;
      }
      registrationRetryDelayRef.current = Math.max(
        1_000,
        error instanceof ApiError && error.retryAfterMs !== null ? error.retryAfterMs : 10_000,
      );
      setRegistrationPending(true);
    } finally {
      setJoining(false);
    }
  }, [applyBusSnapshot, dismissToast, phase, joining, sceneAvailable, showToast]);

  const openProfileModal = useCallback((mode: "name" | "comment") => {
    if (profileMutationLock.current) return;
    setJoinName(savedProfile.name);
    setJoinComment(savedProfile.comment);
    setProfileModalMode(mode);
    setJoinError("");
    setShowJoinModal(true);
  }, [savedProfile]);

  const submitProfile = useCallback(async () => {
    if (profileMutationLock.current) return;
    const name = joinName.replace(/\s+/g, " ").trim();
    const comment = joinComment.replace(/\s+/g, " ").trim();
    if (profileModalMode === "name" && !name) {
      setJoinError("Choisis un nom à afficher au-dessus de ton personnage.");
      return;
    }
    if (profileModalMode === "comment" && !comment) {
      setJoinError("Écris un petit message avant de l’enregistrer.");
      return;
    }

    profileMutationLock.current = true;
    const controller = new AbortController();
    profileRequest.current = controller;
    setProfileSaving(true);
    setJoinError("");
    try {
      const visitorId = getOrCreateVisitorId();
      const payload =
        profileModalMode === "name"
          ? { visitorId, displayName: name }
          : { visitorId, comment };
      const data = await fetchJson<BusApiState & {
        passenger: PassengerProfile | null;
        seatIndex: number | null;
      }>("/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const acceptedSnapshot = applyBusSnapshot(data);
      setCurrentPassengerSeatIndex(data.seatIndex);
      setSavedProfile((previous) => profileModalMode === "name" ? { ...previous, name } : { ...previous, comment });
      try {
        if (profileModalMode === "name") localStorage.setItem("fdb-display-name", name);
        if (profileModalMode === "comment") localStorage.setItem("fdb-comment", comment);
      } catch {
        // L'enregistrement D1 reste valide même si le stockage local est bloqué.
      }
      if (acceptedSnapshot && data.passenger) {
        setPassengerProfiles((profiles) => [
          ...profiles.filter((profile) => profile.seatIndex !== data.passenger!.seatIndex),
          data.passenger!,
        ]);
        if (profileModalMode === "name") {
          setSeatRow(
            Math.min(computeNumRows(data.seatCapacity) - 1, Math.floor(data.passenger.seatIndex / 4)),
          );
        }
      }
      setShowJoinModal(false);
      showToast(
        profileModalMode === "name" ? "Prénom ajouté !" : "Message enregistré !",
        profileModalMode === "name"
          ? "Il apparaît maintenant au-dessus de ton personnage."
          : "Il sera visible lorsqu’on cliquera sur ton personnage.",
        "✅ PROFIL",
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setJoinError(error instanceof ApiError ? error.message : "Impossible d’enregistrer pour le moment. Réessaie dans quelques instants.");
    } finally {
      profileMutationLock.current = false;
      profileRequest.current = null;
      setProfileSaving(false);
    }
  }, [applyBusSnapshot, joinComment, joinName, profileModalMode, showToast]);

  const removeProfileField = useCallback(async () => {
    if (profileMutationLock.current) return;
    profileMutationLock.current = true;
    const controller = new AbortController();
    profileRequest.current = controller;
    setProfileSaving(true);
    setJoinError("");
    try {
      const visitorId = getOrCreateVisitorId();
      const payload =
        profileModalMode === "name"
          ? { visitorId, displayName: "" }
          : { visitorId, comment: "" };
      const data = await fetchJson<BusApiState & {
        passenger: PassengerProfile | null;
        seatIndex: number | null;
      }>("/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const acceptedSnapshot = applyBusSnapshot(data);
      setSavedProfile((previous) => profileModalMode === "name" ? { ...previous, name: "" } : { ...previous, comment: "" });
      try {
        localStorage.removeItem(profileModalMode === "name" ? "fdb-display-name" : "fdb-comment");
      } catch {
        // La suppression D1 reste valide même si le stockage local est bloqué.
      }

      if (acceptedSnapshot) {
        setPassengerProfiles((profiles) => {
          if (data.seatIndex === null) return profiles;
          const others = profiles.filter((profile) => profile.seatIndex !== data.seatIndex);
          return data.passenger ? [...others, data.passenger] : others;
        });
      }
      if (profileModalMode === "name") setJoinName("");
      else setJoinComment("");
      setShowJoinModal(false);
      showToast(
        profileModalMode === "name" ? "Prénom retiré" : "Commentaire retiré",
        profileModalMode === "name"
          ? "Tu gardes ta place dans le bus, sans étiquette publique."
          : "Ton prénom reste affiché, mais ton message a été supprimé.",
        "✓ PROFIL",
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setJoinError(error instanceof ApiError ? error.message : "Impossible de supprimer pour le moment. Réessaie dans quelques instants.");
    } finally {
      profileMutationLock.current = false;
      profileRequest.current = null;
      setProfileSaving(false);
    }
  }, [applyBusSnapshot, profileModalMode, showToast]);

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

  const leaveBusPermanently = useCallback(async () => {
    try {
      const visitorId = getOrCreateVisitorId();
      const data = await fetchJson<BusApiState & { removed: boolean }>("/api/bus-entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ visitorId }),
      });
      try {
        localStorage.removeItem("fdb-display-name");
        localStorage.removeItem("fdb-comment");
      } catch {
        // La suppression D1 est déjà effective.
      }
      applyBusSnapshot(data);
      setRegistrationPending(false);
      setPassengerProfiles([]);
      setPassengerManifest([]);
      setSelectedPassenger(null);
      setJoinName("");
      setJoinComment("");
      setSavedProfile({ name: "", comment: "" });
      setTvOn(false);
      setHasEntered(false);
      setCurrentPassengerSeatIndex(null);
      setShowTheoryModal(false);
      setPhase((current) => current === "inside" ? "exiting" : "outside");
      dismissToast();
      return true;
    } catch {
      return false;
    }
  }, [applyBusSnapshot, dismissToast]);

  // Sortir du bus : le son reste audible de loin (25%), la TV reste allumée
  const exitBus = useCallback(() => {
    if (phase !== "inside") return;
    dismissToast();
    setPhase("exiting");
    playDing();
  }, [dismissToast, phase]);

  const onArrived = useCallback((p: "inside" | "outside") => {
    setPhase(p);
  }, []);

  // Filet de sécurité : si la phase reste bloquée à "entering" ou "exiting"
  // (par exemple si le planificateur d'images du Canvas est suspendu parce que
  // l'onglet est masqué), on force la transition vers la phase finale après un
  // délai raisonnable. Cela évite que tous les boutons restent désactivés
  // indéfiniment à cause de `busy = true`.
  useEffect(() => {
    if (phase !== "entering" && phase !== "exiting") return;
    const timer = setTimeout(() => {
      setPhase((current) => {
        if (current === "entering") return "inside";
        if (current === "exiting") return "outside";
        return current;
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [phase]);

  const effectiveCount = count ?? 0;
  const numRows = computeNumRows(seatCapacity);
  const busy = phase === "entering" || phase === "exiting";
  const exteriorControlsVisible = phase === "outside" || phase === "entering";
  const interiorControlsVisible = phase === "inside" || phase === "exiting";
  const overlayOpen = showTheoryModal || showJoinModal || showPassengerList || showTheoryAge || Boolean(selectedPassenger);

  return (
    <div data-phase={phase} data-scene-available={sceneAvailable} data-tv-on={tvOn ? "true" : "false"} className="bus-app fixed inset-0 h-dvh w-screen overflow-hidden select-none bg-[#79c2ff] text-white">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {toast ? [toast.badge, toast.text, toast.sub].filter(Boolean).join(". ") : ""}
      </div>
      <Scene
        phase={phase}
        headlights={headlights}
        hornPulse={hornPulse}
        tvOn={tvOn}
        worldRef={worldRef}
        onArrived={onArrived}
        passengerCount={effectiveCount}
        seatCapacity={seatCapacity}
        vacantSeatRanges={vacantSeatRanges}
        currentSeatRow={seatRow}
        isMutedForFullscreen={overlayOpen}
        uiPaused={overlayOpen}
        hasEntered={hasEntered}
        passengerProfiles={passengerProfiles}
        currentPassengerSeatIndex={currentPassengerSeatIndex}
        onPassengerSelect={(passenger) => { setPassengerOpenedFromList(false); void openPassengerCard(passenger); }}
        modeOverride={manualDayNight}
        resetViewToken={resetViewToken}
        onAvailabilityChange={setSceneAvailable}
        onReadTheory={() => setShowTheoryModal(true)}
      />

      <BusHud
        phase={phase}
        hidden={overlayOpen}
        toast={toast}
        passengerManifestButtonRef={passengerManifestButtonRef}
        statsLoadError={statsLoadError}
        count={count}
        numRows={numRows}
        theoryAgeInDays={theoryAgeInDays}
        isNight={isNight}
        manualDayNight={manualDayNight}
        speedMultiplier={speedMultiplier}
        seatRow={seatRow}
        exteriorControlsVisible={exteriorControlsVisible}
        interiorControlsVisible={interiorControlsVisible}
        headlights={headlights}
        hasEntered={hasEntered}
        tvOn={tvOn}
        joining={joining}
        busy={busy}
        setShowTheoryModal={setShowTheoryModal}
        setShowTheoryAge={setShowTheoryAge}
        setStatsLoadError={setStatsLoadError}
        setStatsRetryToken={setStatsRetryToken}
        setSeatRow={setSeatRow}
        setTvOn={setTvOn}
        openPassengerManifest={openPassengerManifest}
        toggleDayNight={toggleDayNight}
        decelerateBus={decelerateBus}
        accelerateBus={accelerateBus}
        toggleHeadlights={toggleHeadlights}
        honk={honk}
        enterBus={enterBus}
        openProfileModal={openProfileModal}
        exitBus={exitBus}
        resetView={() => setResetViewToken((token) => token + 1)}
      />

      {/* Modal interactif complet de la théorie des Fous du Bus */}
      <TheoryModal
        isOpen={showTheoryModal}
        onClose={() => setShowTheoryModal(false)}
        onLeaveBusPermanently={currentPassengerSeatIndex !== null ? leaveBusPermanently : undefined}
      />
      <JoinBusModal
        isOpen={showJoinModal}
        mode={profileModalMode}
        name={joinName}
        comment={joinComment}
        error={joinError}
        joining={profileSaving}
        hasSavedValue={Boolean(profileModalMode === "name" ? savedProfile.name : savedProfile.comment)}
        onNameChange={(value) => { setJoinName(value); setJoinError(""); }}
        onCommentChange={(value) => { setJoinComment(value); setJoinError(""); }}
        onClose={() => { if (!profileMutationLock.current) setShowJoinModal(false); }}
        onSubmit={() => void submitProfile()}
        onRemove={() => void removeProfileField()}
      />
      <PassengerCard
        passenger={selectedPassenger}
        loading={passengerCardLoading}
        error={passengerCardError}
        returnFocusRef={passengerManifestButtonRef}
        onRetry={() => selectedPassenger && void openPassengerCard(selectedPassenger)}
        onBack={passengerOpenedFromList ? () => {
          passengerCardRequest.current?.abort();
          passengerCardRequest.current = null;
          setSelectedPassenger(null);
          setShowPassengerList(true);
        } : undefined}
        onClose={() => {
          passengerCardRequest.current?.abort();
          passengerCardRequest.current = null;
          setSelectedPassenger(null);
          window.requestAnimationFrame(() => passengerManifestButtonRef.current?.focus({ preventScroll: true }));
        }}
      />
      <PassengerListModal
        isOpen={showPassengerList}
        count={count}
        passengers={passengerManifest}
        loading={manifestLoading}
        error={manifestError}
        hasMore={manifestHasMore}
        returnFocusRef={passengerManifestButtonRef}
        onLoadMore={() => void loadPassengerManifest(manifestNextFrom)}
        onRetry={() => void loadPassengerManifest(passengerManifest.length === 0 ? 0 : manifestNextFrom)}
        onPassengerClick={(passenger) => {
          closePassengerManifest();
          setPassengerOpenedFromList(true);
          void openPassengerCard({
            seatIndex: passenger.seatIndex,
            displayName: passenger.displayName ?? "Anonyme",
            comment: null,
          });
        }}
        onClose={closePassengerManifest}
      />
      <TheoryAgeModal isOpen={showTheoryAge} onClose={() => setShowTheoryAge(false)} />
    </div>
  );
}
