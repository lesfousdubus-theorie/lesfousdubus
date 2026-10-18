"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { computeNumRows } from "@/lib/bus-layout";
import { ApiError, fetchJson, getOrCreateVisitorId, type BusApiState } from "@/lib/client/bus-api";
import type { PassengerProfile } from "@/types/passenger";

interface PassengerProfileOptions {
  applyBusSnapshot: (data: BusApiState) => boolean;
  setCurrentPassengerSeatIndex: Dispatch<SetStateAction<number | null>>;
  setPassengerProfiles: Dispatch<SetStateAction<PassengerProfile[]>>;
  setSeatRow: Dispatch<SetStateAction<number>>;
  showToast: (text: string, sub?: string, badge?: string) => void;
}

/** Édition du profil : validation, requêtes, brouillons locaux et verrou de sauvegarde. */
export function usePassengerProfile({ applyBusSnapshot, setCurrentPassengerSeatIndex, setPassengerProfiles, setSeatRow, showToast }: PassengerProfileOptions) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<"name" | "comment">("name");
  const [joinName, setJoinName] = useState("");
  const [joinComment, setJoinComment] = useState("");
  const [joinError, setJoinError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState(() => {
    try { return { name: localStorage.getItem("fdb-display-name") ?? "", comment: localStorage.getItem("fdb-comment") ?? "" }; }
    catch { return { name: "", comment: "" }; }
  });
  const profileRequest = useRef<AbortController | null>(null);
  const profileMutationLock = useRef(false);
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
  }, [applyBusSnapshot, joinComment, joinName, profileModalMode, showToast, setCurrentPassengerSeatIndex, setPassengerProfiles, setSeatRow]);

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
  }, [applyBusSnapshot, profileModalMode, showToast, setPassengerProfiles]);

  const restoreSavedProfile = useCallback((passenger: PassengerProfile | null) => {
    const comment = passenger?.comment ?? "";
    setSavedProfile(previous => ({ name: passenger?.displayName ?? previous.name, comment: comment || previous.comment }));
    try {
      if (passenger?.displayName) localStorage.setItem("fdb-display-name", passenger.displayName);
      if (comment) localStorage.setItem("fdb-comment", comment);
    } catch { /* Le stockage local reste optionnel. */ }
  }, []);

  const clearProfile = useCallback(() => {
    profileRequest.current?.abort();
    try { localStorage.removeItem("fdb-display-name"); localStorage.removeItem("fdb-comment"); } catch { /* Profil déjà supprimé du serveur. */ }
    setJoinName(""); setJoinComment(""); setSavedProfile({ name: "", comment: "" });
    setShowJoinModal(false);
  }, []);

  const closeProfile = useCallback(() => {
    if (!profileMutationLock.current) setShowJoinModal(false);
  }, []);

  return { showJoinModal, profileModalMode, joinName, joinComment, joinError, profileSaving, savedProfile,
    openProfileModal, submitProfile, removeProfileField, restoreSavedProfile, clearProfile, closeProfile,
    changeName: (value: string) => { setJoinName(value); setJoinError(""); },
    changeComment: (value: string) => { setJoinComment(value); setJoinError(""); },
  };
}
