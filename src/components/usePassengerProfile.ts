"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { computeNumRows } from "@/lib/bus-layout";
import { ApiError, fetchJson, getExistingVisitorId, getOrCreateVisitorId, type BusApiState } from "@/lib/client/bus-api";
import type { PassengerProfile } from "@/types/passenger";
import { isPassengerAvatarId, type PassengerAvatarId } from "@/lib/passenger-avatar";
import { cleanText } from "@/lib/server/text";
import { findModerationIssue, MODERATION_MESSAGES } from "@/lib/server/moderation";
import type { OnboardingReason, OnboardingSubmission } from "./modals/OnboardingModal";

interface PassengerProfileOptions {
  hasRegisteredPlace: boolean;
  applyBusSnapshot: (data: BusApiState) => boolean;
  setCurrentPassengerSeatIndex: Dispatch<SetStateAction<number | null>>;
  setPassengerProfiles: Dispatch<SetStateAction<PassengerProfile[]>>;
  setSeatRow: Dispatch<SetStateAction<number>>;
  showToast: (text: string, sub?: string, badge?: string) => void;
}

export interface OnboardingSeed extends Partial<OnboardingSubmission> {
  hasLockedDbAvatar?: boolean;
}

/** Édition du profil : validation, requêtes, brouillons locaux et verrou de sauvegarde. */
export function usePassengerProfile({ hasRegisteredPlace, applyBusSnapshot, setCurrentPassengerSeatIndex, setPassengerProfiles, setSeatRow, showToast }: PassengerProfileOptions) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<"name" | "comment">("name");
  const [joinName, setJoinName] = useState("");
  const [joinComment, setJoinComment] = useState("");
  const [joinError, setJoinError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [pendingAvatarId, setPendingAvatarId] = useState<PassengerAvatarId | null>(() => {
    try { const value = localStorage.getItem("fdb-avatar-draft"); return isPassengerAvatarId(value) ? value : null; }
    catch { return null; }
  });
  const [savedAvatarId, setSavedAvatarId] = useState<PassengerAvatarId | null>(() => {
    if (pendingAvatarId) return pendingAvatarId;
    try { const value = localStorage.getItem("fdb-avatar-id"); return isPassengerAvatarId(value) ? value : null; }
    catch { return null; }
  });
  const [savedProfile, setSavedProfile] = useState(() => {
    if (!getExistingVisitorId()) return { name: "", comment: "" };
    try { return { name: localStorage.getItem("fdb-display-name") ?? "", comment: localStorage.getItem("fdb-comment") ?? "" }; }
    catch { return { name: "", comment: "" }; }
  });
  const [onboardingReason, setOnboardingReason] = useState<OnboardingReason | null>(null);
  const [onboardingError, setOnboardingError] = useState("");
  const [onboardingSeed, setOnboardingSeed] = useState<OnboardingSubmission & { hasLockedDbAvatar: boolean }>({
    displayName: "",
    comment: "",
    avatarId: null,
    hasLockedDbAvatar: false,
  });
  const [onboardingInstanceKey, setOnboardingInstanceKey] = useState(0);

  const profileRequest = useRef<AbortController | null>(null);
  const profileMutationLock = useRef(false);
  const savedProfileRef = useRef(savedProfile);
  const savedAvatarIdRef = useRef(savedAvatarId);
  const pendingAvatarIdRef = useRef(pendingAvatarId);
  useEffect(() => {
    savedProfileRef.current = savedProfile;
  }, [savedProfile]);
  useEffect(() => {
    savedAvatarIdRef.current = savedAvatarId;
  }, [savedAvatarId]);
  useEffect(() => {
    pendingAvatarIdRef.current = pendingAvatarId;
  }, [pendingAvatarId]);
  useEffect(() => () => profileRequest.current?.abort(), []);

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
    const name = cleanText(joinName, 24);
    const comment = cleanText(joinComment, 180, true);
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
        profileModalMode === "name" ? "Pseudo enregistré !" : "Message enregistré !",
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
  }, [applyBusSnapshot, joinComment, joinName, profileModalMode, showToast, setCurrentPassengerSeatIndex, setPassengerProfiles, setSeatRow]);

  const removeProfileField = useCallback(async () => {
    if (profileMutationLock.current || profileModalMode !== "comment") return;
    profileMutationLock.current = true;
    const controller = new AbortController();
    profileRequest.current = controller;
    setProfileSaving(true);
    setJoinError("");
    try {
      const visitorId = getOrCreateVisitorId();
      const data = await fetchJson<BusApiState & {
        passenger: PassengerProfile | null;
        seatIndex: number | null;
      }>("/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ visitorId, comment: "" }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const acceptedSnapshot = applyBusSnapshot(data);
      setSavedProfile((previous) => ({ ...previous, comment: "" }));
      try {
        localStorage.removeItem("fdb-comment");
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
      setJoinComment("");
      setShowJoinModal(false);
      showToast(
        "Commentaire retiré",
        "Ton pseudo reste affiché, mais ton message a été supprimé.",
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
  }, [applyBusSnapshot, profileModalMode, showToast, setPassengerProfiles]);

  const restoreSavedProfile = useCallback((passenger: PassengerProfile | null) => {
    if (passenger === null) {
      setSavedAvatarId(null);
      setPendingAvatarId(null);
      setSavedProfile({ name: "", comment: "" });
      try {
        localStorage.removeItem("fdb-display-name");
        localStorage.removeItem("fdb-comment");
        localStorage.removeItem("fdb-avatar-id");
        localStorage.removeItem("fdb-avatar-draft");
      } catch {
        /* Le stockage local reste optionnel. */
      }
      return;
    }

    const name = passenger.displayName ?? "";
    const comment = passenger.comment ?? "";
    const avatarId = isPassengerAvatarId(passenger.avatarId) ? passenger.avatarId : null;
    setSavedAvatarId(avatarId);
    setPendingAvatarId(null);
    setSavedProfile({ name, comment });
    try {
      if (name) localStorage.setItem("fdb-display-name", name);
      else localStorage.removeItem("fdb-display-name");
      if (comment) localStorage.setItem("fdb-comment", comment);
      else localStorage.removeItem("fdb-comment");
      if (avatarId) localStorage.setItem("fdb-avatar-id", avatarId);
      else localStorage.removeItem("fdb-avatar-id");
      localStorage.removeItem("fdb-avatar-draft");
    } catch {
      /* Le stockage local reste optionnel. */
    }
  }, []);

  const clearLocalRegistrationOnly = useCallback(() => {
    try {
      localStorage.removeItem("fdb-display-name");
      localStorage.removeItem("fdb-comment");
      localStorage.removeItem("fdb-avatar-id");
    } catch {
      /* Le stockage local reste optionnel. */
    }
    setJoinName("");
    setJoinComment("");
    setSavedProfile({ name: "", comment: "" });
    setSavedAvatarId(pendingAvatarIdRef.current);
  }, []);

  const clearProfile = useCallback(() => {
    profileRequest.current?.abort();
    try { localStorage.removeItem("fdb-display-name"); localStorage.removeItem("fdb-comment"); localStorage.removeItem("fdb-avatar-id"); localStorage.removeItem("fdb-avatar-draft"); } catch { /* Profil déjà supprimé du serveur. */ }
    setJoinName(""); setJoinComment(""); setSavedProfile({ name: "", comment: "" });
    setShowJoinModal(false);
    setOnboardingReason(null);
    setOnboardingError("");
    setSavedAvatarId(null); setShowAvatarModal(false); setAvatarError("");
    setPendingAvatarId(null);
  }, []);

  const openOnboardingModal = useCallback((reason: OnboardingReason, initialError = "", seed?: OnboardingSeed) => {
    if (reason === "boarding" && profileMutationLock.current) return;
    if (reason === "missing-name") {
      setShowJoinModal(false);
      setShowAvatarModal(false);
    }
    const avatarSeed = seed && "avatarId" in seed
      ? (seed.avatarId ?? null)
      : (savedAvatarIdRef.current ?? pendingAvatarIdRef.current ?? null);
    setOnboardingSeed({
      displayName: seed?.displayName ?? savedProfileRef.current.name,
      comment: seed?.comment ?? savedProfileRef.current.comment,
      avatarId: avatarSeed,
      hasLockedDbAvatar: Boolean(seed?.hasLockedDbAvatar),
    });
    setOnboardingInstanceKey((k) => k + 1);
    setOnboardingError(initialError);
    setOnboardingReason(reason);
  }, []);

  const closeOnboardingModal = useCallback(() => {
    setOnboardingReason(null);
    setOnboardingError("");
  }, []);

  const clearOnboardingError = useCallback(() => {
    setOnboardingError("");
  }, []);

  const validateOnboarding = useCallback((submission: OnboardingSubmission): OnboardingSubmission | null => {
    const displayName = cleanText(submission.displayName, 24);
    const comment = cleanText(submission.comment, 180, true);
    const avatarId = isPassengerAvatarId(submission.avatarId) ? submission.avatarId : null;
    if (!displayName) {
      setOnboardingError("Choisis un nom ou pseudo avant de continuer.");
      return null;
    }
    const nameIssue = findModerationIssue(displayName);
    if (nameIssue) {
      setOnboardingError(MODERATION_MESSAGES[nameIssue]);
      return null;
    }
    if (comment) {
      const commentIssue = findModerationIssue(comment);
      if (commentIssue) {
        setOnboardingError(MODERATION_MESSAGES[commentIssue]);
        return null;
      }
    }
    setOnboardingError("");
    return { displayName, comment, avatarId };
  }, []);

  const syncBoardingDraftAvatar = useCallback((avatarId: PassengerAvatarId | null) => {
    if (avatarId) {
      setPendingAvatarId(avatarId);
      setSavedAvatarId(avatarId);
      try {
        localStorage.setItem("fdb-avatar-draft", avatarId);
        localStorage.setItem("fdb-avatar-id", avatarId);
      } catch {
        // Ignorer
      }
    } else {
      setPendingAvatarId(null);
      setSavedAvatarId(null);
      try {
        localStorage.removeItem("fdb-avatar-draft");
        localStorage.removeItem("fdb-avatar-id");
      } catch {
        // Ignorer
      }
    }
  }, []);

  const submitMissingNameOnboarding = useCallback(async (submission: OnboardingSubmission) => {
    if (profileMutationLock.current) return;
    profileMutationLock.current = true;
    const controller = new AbortController();
    profileRequest.current = controller;
    setProfileSaving(true);
    setOnboardingError("");
    try {
      const visitorId = getOrCreateVisitorId();
      const payload: {
        visitorId: string;
        displayName: string;
        comment: string;
        updateOnly: true;
        avatarId?: PassengerAvatarId;
      } = {
        visitorId,
        displayName: submission.displayName,
        comment: submission.comment,
        updateOnly: true,
      };
      if (submission.avatarId) payload.avatarId = submission.avatarId;
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
      if (data.seatIndex === null || !data.passenger) {
        setCurrentPassengerSeatIndex(null);
        clearLocalRegistrationOnly();
        setOnboardingReason(null);
        setOnboardingError("");
        showToast(
          "Place introuvable",
          "Entre dans le bus pour obtenir une nouvelle place.",
          "⚠ PLACE",
        );
        return;
      }
      if (submission.avatarId && data.passenger.avatarId !== submission.avatarId) {
        throw new ApiError("Le personnage choisi n’a pas été enregistré.", 502);
      }
      setCurrentPassengerSeatIndex(data.seatIndex);
      restoreSavedProfile(data.passenger);
      if (acceptedSnapshot) {
        setPassengerProfiles((profiles) => [
          ...profiles.filter((profile) => profile.seatIndex !== data.passenger!.seatIndex),
          data.passenger!,
        ]);
        setSeatRow(
          Math.min(computeNumRows(data.seatCapacity) - 1, Math.floor(data.passenger.seatIndex / 4)),
        );
      }
      setOnboardingReason(null);
      setOnboardingError("");
      showToast(
        "Identifiant enregistré !",
        "Tu peux maintenant monter dans le bus à tout moment.",
        "✅ PROFIL",
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setOnboardingError(error instanceof ApiError ? error.message : "Impossible d’enregistrer pour le moment. Réessaie dans quelques instants.");
    } finally {
      profileMutationLock.current = false;
      profileRequest.current = null;
      setProfileSaving(false);
    }
  }, [applyBusSnapshot, clearLocalRegistrationOnly, restoreSavedProfile, setCurrentPassengerSeatIndex, setPassengerProfiles, setSeatRow, showToast]);

  const closeProfile = useCallback(() => {
    if (!profileMutationLock.current) setShowJoinModal(false);
  }, []);

  const [hasExistingVisitor, setHasExistingVisitor] = useState(false);

  const openAvatarModal = useCallback(() => {
    if (profileMutationLock.current) return;
    setHasExistingVisitor(Boolean(getExistingVisitorId()));
    setAvatarError("");
    setShowAvatarModal(true);
  }, []);

  const closeAvatarModal = useCallback(() => {
    if (!profileMutationLock.current) setShowAvatarModal(false);
  }, []);

  const saveAvatarDraft = useCallback((avatarId: PassengerAvatarId) => {
    setPendingAvatarId(avatarId);
    setSavedAvatarId(avatarId);
    try {
      localStorage.setItem("fdb-avatar-draft", avatarId);
      localStorage.setItem("fdb-avatar-id", avatarId);
    } catch { /* Le choix reste disponible pendant cette visite. */ }
    setShowAvatarModal(false);
    showToast("Personnage choisi !", "Il sera utilisé quand tu monteras dans le bus.", "✓ PERSONNAGE");
  }, [showToast]);

  const submitAvatar = useCallback(async (avatarId: PassengerAvatarId) => {
    if (profileMutationLock.current || !isPassengerAvatarId(avatarId)) return;
    const visitorId = hasRegisteredPlace ? getOrCreateVisitorId() : getExistingVisitorId();
    if (!visitorId) {
      saveAvatarDraft(avatarId);
      return;
    }
    profileMutationLock.current = true;
    const controller = new AbortController();
    profileRequest.current = controller;
    setProfileSaving(true);
    setAvatarError("");
    try {
      const data = await fetchJson<BusApiState & { passenger: PassengerProfile | null; seatIndex: number | null }>("/api/bus-entries", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ visitorId, avatarId, updateOnly: true }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (data.seatIndex === null) {
        applyBusSnapshot(data);
        setCurrentPassengerSeatIndex(null);
        clearLocalRegistrationOnly();
        saveAvatarDraft(avatarId);
        return;
      }
      if (data.passenger?.avatarId !== avatarId) throw new ApiError("Le personnage n’a pas été enregistré. Réessaie.", 502);
      const accepted = applyBusSnapshot(data);
      setCurrentPassengerSeatIndex(data.seatIndex);
      restoreSavedProfile(data.passenger);
      if (accepted) {
        setPassengerProfiles(profiles => [...profiles.filter(profile => profile.seatIndex !== data.passenger!.seatIndex), data.passenger!]);
      }
      setShowAvatarModal(false);
      showToast("Personnage enregistré !", "Tu le retrouveras lors de ta prochaine visite.", "✓ PROFIL");
    } catch (error) {
      if (!controller.signal.aborted) setAvatarError(error instanceof ApiError ? error.message : "Impossible d’enregistrer ton personnage. Réessaie dans quelques instants.");
    } finally {
      profileMutationLock.current = false;
      profileRequest.current = null;
      setProfileSaving(false);
    }
  }, [hasRegisteredPlace, applyBusSnapshot, clearLocalRegistrationOnly, restoreSavedProfile, saveAvatarDraft, setCurrentPassengerSeatIndex, setPassengerProfiles, showToast]);

  return { showJoinModal, profileModalMode, joinName, joinComment, joinError, profileSaving, savedProfile,
    showAvatarModal, avatarError, savedAvatarId, pendingAvatarId, hasExistingVisitor, openAvatarModal, closeAvatarModal, submitAvatar,
    openProfileModal, submitProfile, removeProfileField, restoreSavedProfile, clearLocalRegistrationOnly, clearProfile, closeProfile,
    onboardingReason, onboardingError, onboardingSeed, onboardingInstanceKey,
    openOnboardingModal, closeOnboardingModal, clearOnboardingError, validateOnboarding, syncBoardingDraftAvatar, submitMissingNameOnboarding,
    changeName: (value: string) => {
      const chars = Array.from(value);
      setJoinName(chars.length > 24 ? chars.slice(0, 24).join("") : value);
      setJoinError("");
    },
    changeComment: (value: string) => {
      const chars = Array.from(value);
      setJoinComment(chars.length > 180 ? chars.slice(0, 180).join("") : value);
      setJoinError("");
    },
  };
}
