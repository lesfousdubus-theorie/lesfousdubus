"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./bus/Scene";
import { computeNumRows } from "./bus/Passengers";
import { type PassengerProfile, type Phase, type WorldState } from "./bus/constants";
import { playDing, playHorn, playStretch, playBoost, unlockAudio } from "@/lib/horn";
import { isValidVisitorId } from "@/lib/visitor-id";
import {
  JoinBusModal,
  PassengerCard,
  PassengerListModal,
  TheoryAgeModal,
  THEORY_START_DATE,
  type PassengerManifestEntry,
} from "./bus/PassengerOverlays";

const TheoryModal = dynamic(() => import("./TheoryModal"), { ssr: false });

interface ToastMessage {
  id: number;
  text: string;
  sub?: string;
  badge?: string;
}

interface BusApiState {
  count: number;
  seatCapacity: number;
  profileRevision: number;
  vacantSeatRanges: Array<[number, number, number]>;
}

const SPEED_STEPS = [0.3, 0.5, 1, 1.5, 2, 2.5, 3] as const;
const API_TIMEOUT_MS = 8_000;
const MAX_DEBUG_PASSENGERS = 10_000;
let memoryVisitorId: string | null = null;

function createVisitorId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const randomPart = Math.random().toString(36).slice(2, 14);
  return `fdb-${Date.now().toString(36)}-${randomPart}`;
}

function getOrCreateVisitorId(): string {
  if (memoryVisitorId && isValidVisitorId(memoryVisitorId)) return memoryVisitorId;
  try {
    const storedVisitorId = localStorage.getItem("fdb-visitor");
    const visitorId = isValidVisitorId(storedVisitorId) ? storedVisitorId : createVisitorId();
    localStorage.setItem("fdb-visitor", visitorId);
    memoryVisitorId = visitorId;
    return visitorId;
  } catch {
    memoryVisitorId = createVisitorId();
    return memoryVisitorId;
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

function getRetryAfterMs(response: Response): number | null {
  const value = response.headers.get("Retry-After");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function isRetryableRegistrationError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500 || [408, 425, 429].includes(error.status);
}

async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = API_TIMEOUT_MS,
): Promise<T> {
  const requestController = new AbortController();
  const externalSignal = init.signal;
  const abortFromExternal = () => requestController.abort();
  if (externalSignal?.aborted) {
    abortFromExternal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  }
  const timeout = window.setTimeout(() => requestController.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: requestController.signal });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Le serveur ne répond pas pour le moment.",
        response.status,
        getRetryAfterMs(response),
      );
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ApiError("Réponse du serveur invalide.", 502);
    }
    return data as T;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

function getTheoryAgeInDays(): number {
  const today = new Date();
  const todayAtMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.max(0, Math.floor((todayAtMidnight - THEORY_START_DATE) / 86_400_000));
}

export default function BusExperience() {
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("phase");
      if (p === "inside") return "inside";
    }
    return "outside";
  });
  const [headlights, setHeadlights] = useState(false);
  const [hornPulse, setHornPulse] = useState(0);
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
  const [passengerProfiles, setPassengerProfiles] = useState<PassengerProfile[]>([]);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerProfile | null>(null);
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

  // Contrôle de la vitesse du bus (vitesse de défilement du monde et rotation des roues)
  const [speedMultiplier, setSpeedMultiplier] = useState(() => {
    if (typeof window !== "undefined") {
      const b = new URLSearchParams(window.location.search).get("boost");
      if (b === "1" || b === "true") return 2.5;
      const s = new URLSearchParams(window.location.search).get("speed");
      if (s) {
        const parsed = parseFloat(s);
        if (!Number.isNaN(parsed) && parsed > 0) return Math.min(3.0, Math.max(0.3, parsed));
      }
    }
    return 1.0;
  });

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
  const [isNight, setIsNight] = useState(false);
  const [manualDayNight, setManualDayNight] = useState<"day" | "night" | null>(null);

  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passengerManifestButtonRef = useRef<HTMLButtonElement>(null);
  const passengerCardRequest = useRef<AbortController | null>(null);
  const manifestRequest = useRef<AbortController | null>(null);
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

  // Références pour les phares automatiques jour / nuit
  const prevIsNight = useRef(false);
  const manualHeadlightsRef = useRef<boolean | null>(null);

  const toggleDayNight = useCallback(() => {
    if (manualDayNight !== null) {
      setManualDayNight(null);
      return;
    }
    const nextMode = isNight ? "day" : "night";
    setManualDayNight(nextMode);
    setIsNight(nextMode === "night");
  }, [isNight, manualDayNight]);

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
    setVacantSeatRanges(data.vacantSeatRanges);
    updateSeatCapacity(data.seatCapacity);
    if (updateCount) setCount(data.count);
    return true;
  }, [updateSeatCapacity]);

  // Synchronise en continu la vitesse du bus avec le moteur 3D
  useEffect(() => {
    worldRef.current.speedMultiplier = speedMultiplier;
  }, [speedMultiplier]);

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
  }, []);

  // Détection du mode boost via l'URL (?boost=1), sans notification intrusive.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const b = new URLSearchParams(window.location.search).get("boost");
      if (b === "1" || b === "true") {
        const playOnInteraction = () => {
          window.removeEventListener("pointerdown", playOnInteraction);
          window.removeEventListener("keydown", playOnInteraction);
          playBoost();
        };
        window.addEventListener("pointerdown", playOnInteraction, { once: true });
        window.addEventListener("keydown", playOnInteraction, { once: true });
        return () => {
          window.removeEventListener("pointerdown", playOnInteraction);
          window.removeEventListener("keydown", playOnInteraction);
        };
      }
    }
  }, []);

  // Faire accélérer le bus (jusqu'à 3.0x max)
  const accelerateBus = useCallback(() => {
    setSpeedMultiplier((cur) => {
      const next = SPEED_STEPS.find((speed) => speed > cur + 0.001) ?? SPEED_STEPS.at(-1)!;
      if (next >= 2.5) {
        playBoost();
      } else {
        playDing();
      }
      return next;
    });
  }, []);

  // Faire ralentir le bus (jusqu'à 0.3x min)
  const decelerateBus = useCallback(() => {
    setSpeedMultiplier((cur) => {
      const next = SPEED_STEPS.findLast((speed) => speed < cur - 0.001) ?? SPEED_STEPS[0];
      playDing();
      return next;
    });
  }, []);

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
  }, [applyBusSnapshot, statsRetryToken]);

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
  }, [applyBusSnapshot, phase, profileRevision, seatRow]);

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
  }, [applyBusSnapshot, showToast]);

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
  }, [applyBusSnapshot, registrationPending, showToast]);

  // Ne remonte vers React que le changement jour/nuit, pas les valeurs 3D à chaque tick.
  useEffect(() => {
    const id = setInterval(() => {
      const curDaylight = worldRef.current.daylight;
      const curIsNight = curDaylight < 0.4;
      if (curIsNight !== prevIsNight.current) {
        setIsNight(curIsNight);
        if (curIsNight) {
          // Passage automatique en mode nuit : allumage des phares
          setHeadlights(true);
          manualHeadlightsRef.current = null;
        } else {
          // Retour du jour : extinction automatique des phares sauf si allumés manuellement le jour
          if (manualHeadlightsRef.current !== true) {
            setHeadlights(false);
          }
          manualHeadlightsRef.current = null;
        }
        prevIsNight.current = curIsNight;
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleHeadlights = useCallback(() => {
    setHeadlights((prev) => {
      const next = !prev;
      manualHeadlightsRef.current = next;
      return next;
    });
  }, []);

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
    if (phase !== "outside" || joining) return;
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
  }, [applyBusSnapshot, dismissToast, phase, joining, showToast]);

  const openProfileModal = useCallback((mode: "name" | "comment") => {
    try {
      setJoinName(localStorage.getItem("fdb-display-name") ?? "");
      setJoinComment(localStorage.getItem("fdb-comment") ?? "");
    } catch {
      setJoinName("");
      setJoinComment("");
    }
    setProfileModalMode(mode);
    setJoinError("");
    setShowJoinModal(true);
  }, []);

  const submitProfile = useCallback(async () => {
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

    setJoining(true);
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
      });
      const acceptedSnapshot = applyBusSnapshot(data);
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
      setJoinError(error instanceof ApiError ? error.message : "Impossible d’enregistrer pour le moment. Réessaie dans quelques instants.");
    } finally {
      setJoining(false);
    }
  }, [applyBusSnapshot, joinComment, joinName, profileModalMode, showToast]);

  const removeProfileField = useCallback(async () => {
    setJoining(true);
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
      });
      const acceptedSnapshot = applyBusSnapshot(data);
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
      setJoinError(error instanceof ApiError ? error.message : "Impossible de supprimer pour le moment. Réessaie dans quelques instants.");
    } finally {
      setJoining(false);
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

  const honk = useCallback(() => {
    playHorn();
    setHornPulse(performance.now());
  }, []);

  // Les commandes globales restent inactives pendant la saisie, dans les fenêtres
  // et à l'intérieur, où les flèches et +/- contrôlent exclusivement la caméra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.querySelector("[role='dialog']") ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "h" || e.key === "H") honk();
      if (e.key === "l" || e.key === "L") toggleHeadlights();
      if (phase !== "inside" && (e.key === "+" || e.key === "=" || e.key === "ArrowUp")) {
        e.preventDefault();
        accelerateBus();
      }
      if (phase !== "inside" && (e.key === "-" || e.key === "_" || e.key === "ArrowDown")) {
        e.preventDefault();
        decelerateBus();
      }
      if (e.key === "b" || e.key === "B") {
        setSpeedMultiplier((cur) => {
          if (cur < 2.0) {
            playBoost();
            return 2.5;
          } else {
            playDing();
            return 1.0;
          }
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, honk, toggleHeadlights, accelerateBus, decelerateBus]);

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

  return (
    <div data-phase={phase} data-tv-on={tvOn ? "true" : "false"} className="bus-app fixed inset-0 h-dvh w-screen overflow-hidden select-none bg-[#79c2ff] text-white">
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
        isMutedForFullscreen={showTheoryModal}
        uiPaused={showTheoryModal}
        hasEntered={hasEntered}
        passengerProfiles={passengerProfiles}
        currentPassengerSeatIndex={currentPassengerSeatIndex}
        onPassengerSelect={openPassengerCard}
        modeOverride={manualDayNight}
      />

      {/* ---------- HUD & INTERFACE UTILISATEUR (GARANTI TOUJOURS AU PREMIER PLAN Z-INDEX) ---------- */}
        <div
          className={`pointer-events-none fixed inset-0 isolate select-none ${showTheoryModal || showJoinModal || showPassengerList || showTheoryAge || selectedPassenger ? "invisible" : ""}`}
          style={{ zIndex: 2147483647 }}
        >
        {/* Toast notification dynamique (allongement du bus) */}
        {toast && (
          <div aria-hidden="true" className="pointer-events-none absolute left-3 right-3 top-[12rem] z-50 min-[480px]:left-auto min-[480px]:top-[4.75rem] min-[480px]:max-w-[calc(100vw-14rem)] sm:right-4 sm:top-20 sm:max-w-sm lg:left-1/2 lg:right-auto lg:top-24 lg:w-96 lg:max-w-[calc(100vw-2rem)] lg:-translate-x-1/2 xl:top-4">
            <div className="bus-glass flex animate-[toast-in_300ms_cubic-bezier(0.25,1,0.5,1)_both] items-center gap-3 rounded-2xl border border-[#ffd23f] bg-black/80 px-4 py-3 shadow-[0_0_30px_rgba(255,210,63,0.35)] backdrop-blur-md sm:px-5">
              {toast.badge && (
                <span className="rounded-md bg-[#ffd23f] px-2 py-0.5 text-xs font-black text-[#0d2190]">
                  {toast.badge}
                </span>
              )}
              <div>
                <div className="text-base font-black text-white">{toast.text}</div>
                {toast.sub && <div className="text-xs text-[#ffd23f] font-semibold">{toast.sub}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Titre + zone (Responsive mobile) */}
        <div className={`bus-title-panel pointer-events-none absolute left-3 max-w-[calc(100vw-1.5rem)] sm:left-4 sm:right-[25rem] sm:top-4 sm:max-w-none lg:right-auto lg:max-w-[60vw] ${phase === "inside" ? "top-[8.25rem]" : "top-[4.75rem]"}`}>
          <h1 className={`break-words font-black uppercase leading-[1.08] tracking-tight drop-shadow-[0_3px_0_rgba(0,0,0,0.55)] text-sm sm:text-xl md:text-2xl lg:text-3xl ${phase === "inside" ? "hidden sm:block" : ""}`}>
            <span className="text-[#ffd23f]">La Théorie</span> <br className="sm:hidden" />
            <span className="text-white">des Fous du Bus</span>
          </h1>
          <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffd23f] drop-shadow sm:mt-1 sm:text-xs md:text-sm ${phase === "inside" ? "hidden sm:block" : ""}`}>
            LE SIÈCLE OUBLIÉ EST LE PRÉSENT !!!
          </p>
          <div className="mt-2 sm:mt-3">
            <button
              type="button"
              onClick={() => setShowTheoryModal(true)}
              className="bus-glass pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#ffd23f]/50 bg-black/60 px-4 text-xs font-black uppercase text-[#ffd23f] shadow-lg backdrop-blur-md transition hover:border-white hover:bg-[#ffd23f] hover:text-[#0d2190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 cursor-pointer"
              title="Découvrir la théorie des Fous du Bus"
            >
              <span>📜</span>
              <span>La Théorie</span>
            </button>
          </div>
        </div>

        {/* Compteurs des passagers et des jours écoulés depuis la naissance de la théorie */}
        <div className="bus-top-stats bus-glass pointer-events-auto absolute left-3 right-3 top-3 flex h-[3.5rem] items-stretch justify-end gap-1 rounded-2xl border border-[#ffd23f]/40 bg-black/60 p-1 shadow-lg backdrop-blur-md sm:left-auto sm:right-4 sm:top-4 sm:h-auto">
          <button ref={passengerManifestButtonRef} type="button" onClick={statsLoadError && count === null ? () => {
            setStatsLoadError(false);
            setStatsRetryToken((value) => value + 1);
          } : openPassengerManifest} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-left leading-tight transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-px hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_rgba(255,210,63,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] motion-reduce:transform-none motion-reduce:transition-none sm:gap-2.5 sm:px-3 sm:py-2">
            <span className="text-lg transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 motion-reduce:transform-none sm:text-2xl">🚌</span>
            <span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ffd23f]">
                  Passagers
                </span>
                <span className="rounded-full bg-white/15 px-1.5 text-[10px] font-bold text-white/90">
                  {numRows} r.
                </span>
              </span>
              <span className="block text-base font-black tabular-nums text-white sm:text-xl">
                {count === null ? (statsLoadError ? "Réessayer" : "…") : count.toLocaleString("fr-FR")}
              </span>
            </span>
          </button>
          <div className="my-1 w-px bg-white/20" aria-hidden="true" />
          <button type="button" onClick={() => setShowTheoryAge(true)} className="rounded-xl px-2 py-1.5 text-left leading-tight transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-px hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_rgba(255,210,63,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] motion-reduce:transform-none motion-reduce:transition-none sm:px-3 sm:py-2" title="Voir le compteur précis depuis le 26 mai 2024">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ffd23f] sm:text-[10px] sm:tracking-[0.12em]">
              La théorie existe depuis
            </span>
            <span className="block text-base font-black tabular-nums text-white sm:text-xl">
              {theoryAgeInDays.toLocaleString("fr-FR")}
              <span className="ml-1 text-[10px] font-bold uppercase text-white/70 sm:text-xs">jours</span>
            </span>
          </button>
        </div>

        {/* Bouton interactif Jour / Nuit */}
        <button
          type="button"
          onClick={toggleDayNight}
          title={manualDayNight === null ? `Forcer le mode ${isNight ? "Jour" : "Nuit"}` : "Revenir au cycle automatique"}
          aria-label={manualDayNight === null
            ? `Cycle automatique, actuellement ${isNight ? "nuit" : "jour"}. Forcer le mode ${isNight ? "jour" : "nuit"}`
            : `Mode ${isNight ? "nuit" : "jour"} forcé. Revenir au cycle automatique`}
          className="bus-day-night bus-glass pointer-events-auto absolute bottom-[4.5rem] left-3 flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-black/65 px-3 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:border-[#ffd23f]/60 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 cursor-pointer sm:bottom-4 sm:left-4 sm:gap-2 sm:px-3.5 sm:text-sm"
        >
          {isNight ? (
            <svg className="h-4 w-4 text-[#ffd23f]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-[#ffd23f]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span>{manualDayNight === null ? "Auto" : isNight ? "Nuit" : "Jour"}</span>
          <span className="bus-day-night-detail text-white/60 text-[10px] sm:text-xs">· {manualDayNight === null ? (isNight ? "Nuit" : "Jour") : "Auto"}</span>
        </button>

        {/* Contrôleur de vitesse du bus : Boutons interactifs Ralentir & Accélérer */}
        <div className="bus-speed bus-glass pointer-events-auto absolute bottom-3 left-3 right-3 flex min-h-11 items-center gap-1 rounded-full border border-white/25 bg-black/65 px-1.5 text-xs shadow-lg backdrop-blur-md sm:left-auto sm:right-4 sm:bottom-4 sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-sm">
          <button
            type="button"
            onClick={decelerateBus}
            disabled={speedMultiplier <= 0.3}
            aria-label="Ralentir le bus"
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-white/10 px-2 text-xs font-bold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-default disabled:opacity-30 sm:w-[90px] sm:flex-none sm:px-2.5"
            title="Ralentir le bus (Touche - ou Flèche Bas)"
          >
            <span>🐢</span>
            <span className="bus-speed-label">Ralentir</span>
          </button>

          <div className="bus-speed-value flex w-[62px] shrink-0 items-center justify-center gap-1 px-1 font-black tabular-nums sm:w-[76px] sm:px-1.5">
            <span
              className={
                speedMultiplier >= 2.0
                  ? "text-[#ffd23f]"
                  : speedMultiplier <= 0.5
                    ? "text-[#38bdf8]"
                    : "text-white"
              }
            >
              {speedMultiplier.toFixed(1)}x
            </span>
            {speedMultiplier >= 2.0 && (
              <span className="rounded bg-[#ffd23f] px-1 py-0.5 text-[10px] font-black uppercase text-[#0d2190]">
                Boost
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={accelerateBus}
            disabled={speedMultiplier >= 3.0}
            aria-label="Accélérer le bus"
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-[#ffd23f]/25 px-2 text-xs font-black text-[#ffd23f] transition hover:bg-[#ffd23f]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] active:scale-95 disabled:cursor-default disabled:opacity-30 sm:w-[90px] sm:flex-none sm:px-2.5"
            title="Accélérer le bus (Touche + ou Flèche Haut / Boost)"
          >
            <span>⚡</span>
            <span className="bus-speed-label">Accélérer</span>
          </button>
        </div>

        {/* Navigation entre les rangées quand on est à l'intérieur */}
        {phase === "inside" && (
          <div className="bus-row-nav pointer-events-auto absolute right-3 top-[4.75rem] flex flex-col items-end gap-1.5 sm:right-4 sm:top-[6.25rem] sm:gap-2">
            {/* Déplacement dans l'allée */}
            <div className="bus-glass flex min-h-11 items-center gap-1 rounded-2xl border border-white/20 bg-black/65 px-1.5 shadow-lg backdrop-blur-md sm:px-3">
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.max(0, r - 1))}
                disabled={seatRow <= 0}
                aria-label="Rangée précédente"
                className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 p-0 text-xs font-bold leading-none text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-30 active:scale-95 cursor-pointer"
                title="Rangée précédente"
              >
                ◀
              </button>
              <span className="flex h-7 items-center px-1.5 text-xs font-bold leading-none whitespace-nowrap sm:px-2">
                <span>Rangée</span>
                <span className="ml-1 text-[#ffd23f]">{seatRow + 1}</span>
                <span className="mx-0.5 text-white/55">/</span>
                <span>{numRows}</span>
              </span>
              <button
                type="button"
                onClick={() => setSeatRow((r) => Math.min(numRows - 1, r + 1))}
                disabled={seatRow >= numRows - 1}
                aria-label="Rangée suivante"
                className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 p-0 text-xs font-bold leading-none text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] disabled:opacity-30 active:scale-95 cursor-pointer"
                title="Rangée suivante"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* Barres persistantes : aucune commande ne se téléporte sous le pointeur. */}
        <div
          aria-hidden={!exteriorControlsVisible}
          className={`bus-exterior-controls pointer-events-none absolute bottom-[7.75rem] left-1/2 z-30 flex w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 px-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:bottom-20 sm:max-w-[42rem] sm:gap-2 xl:bottom-4 xl:left-[calc(50%-4.75rem)] ${
            exteriorControlsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          <HudButton className="min-w-[96px] flex-1 sm:w-[108px] sm:flex-none" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={!exteriorControlsVisible}>
            {headlights ? "Éteindre" : "Phares"}
          </HudButton>
          <HudButton className="min-w-[104px] flex-1 sm:w-[112px] sm:flex-none" onClick={honk} icon="📯" disabled={!exteriorControlsVisible}>
            Klaxonner
          </HudButton>
          {hasEntered && phase === "outside" && (
            <div className="animate-[hud-control-in-flow_220ms_cubic-bezier(0.25,1,0.5,1)_both] motion-reduce:animate-none">
              <HudButton
                className="w-[124px] sm:w-[132px]"
                onClick={() => setTvOn((value) => !value)}
                active={tvOn}
                ariaLabel="Télévision"
                icon="📺"
              >
                {tvOn ? "Éteindre la TV" : "Allumer la TV"}
              </HudButton>
            </div>
          )}
          <HudButton className="w-full sm:w-[190px]" onClick={() => void enterBus()} primary icon="🚪" disabled={joining || phase !== "outside"}>
            {joining || phase === "entering" ? "Installation…" : "Entrer dans le bus"}
          </HudButton>
        </div>

        <div
          aria-hidden={!interiorControlsVisible}
          className={`bus-interior-controls pointer-events-none absolute bottom-[7.75rem] left-1/2 flex w-[512px] max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col items-center justify-center gap-1.5 px-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:bottom-20 sm:gap-2 xl:bottom-4 ${
            interiorControlsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 [&_*]:!pointer-events-none"
          }`}
        >
          <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2">
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("name")} icon="🏷️" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">Prénom</span><span className="hud-label-long hidden sm:inline">Ajouter un prénom</span>
            </HudButton>
            <HudButton className="min-w-0 flex-1" onClick={() => openProfileModal("comment")} icon="💬" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">Commenter</span><span className="hud-label-long hidden sm:inline">Mettre un commentaire</span>
            </HudButton>
          </div>
          <div className="grid w-full grid-cols-4 items-center gap-1.5 sm:grid-cols-[1.25fr_1fr_0.82fr_1.08fr] sm:gap-2">
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={() => setTvOn((v) => !v)} active={tvOn} ariaLabel="Télévision" icon="📺" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">TV</span><span className="hud-label-long hidden sm:inline">{tvOn ? "Éteindre la TV" : "Allumer la TV"}</span>
            </HudButton>
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={toggleHeadlights} active={headlights} ariaLabel="Phares" icon="💡" disabled={busy || !interiorControlsVisible}>
              {headlights ? "Éteindre" : "Phares"}
            </HudButton>
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={honk} icon="📯" disabled={busy || !interiorControlsVisible}>
              Klaxon
            </HudButton>
            <HudButton className="min-w-0 w-full px-1 sm:px-2" onClick={exitBus} primary icon="🏝️" disabled={busy || !interiorControlsVisible}>
              <span className="hud-label-short sm:hidden">{phase === "exiting" ? "Descente…" : "Sortir"}</span><span className="hud-label-long hidden sm:inline">{phase === "exiting" ? "Descente…" : "Sortir du bus"}</span>
            </HudButton>
          </div>
        </div>
        </div>

      {/* Modal interactif complet de la théorie des Fous du Bus */}
      <TheoryModal
        isOpen={showTheoryModal}
        onClose={() => setShowTheoryModal(false)}
        onLeaveBusPermanently={leaveBusPermanently}
      />
      <JoinBusModal
        isOpen={showJoinModal}
        mode={profileModalMode}
        name={joinName}
        comment={joinComment}
        error={joinError}
        joining={joining}
        onNameChange={setJoinName}
        onCommentChange={setJoinComment}
        onClose={() => setShowJoinModal(false)}
        onSubmit={() => void submitProfile()}
        onRemove={() => void removeProfileField()}
      />
      <PassengerCard
        passenger={selectedPassenger}
        loading={passengerCardLoading}
        error={passengerCardError}
        returnFocusRef={passengerManifestButtonRef}
        onRetry={() => selectedPassenger && void openPassengerCard(selectedPassenger)}
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

function HudButton({
  children,
  onClick,
  icon,
  primary,
  active,
  ariaLabel,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: string;
  primary?: boolean;
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "pointer-events-auto inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs md:text-sm font-bold shadow-lg backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
  const look = primary
    ? "bg-[#ffd23f] text-[#0d2190] hover:bg-[#ffe066] shadow-[0_5px_0_#b8860b] active:shadow-none active:translate-y-1"
    : active
      ? "bg-[#1636c9] text-white ring-2 ring-[#ffd23f] hover:bg-[#1d44e6]"
      : "bg-black/55 text-white border border-white/25 hover:bg-black/75 hover:border-[#ffd23f]/50";
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      /* Quand le bouton est désactivé, on force pointer-events: none en inline
         pour empêcher les boutons désactivés des barres de contrôles masquées
         (interiorControls) d'intercepter les clics destinés aux barres visibles
         (exteriorControls) qui se chevauchent sur mobile. */
      style={disabled ? { pointerEvents: "none" } : undefined}
      className={`${base} relative z-10 touch-manipulation ${look} ${className}`}
    >
      {icon && <span className="pointer-events-none text-sm leading-none">{icon}</span>}
      <span className="pointer-events-none contents">{children}</span>
    </button>
  );
}
