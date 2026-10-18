"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";
import { PARTY_YOUTUBE_ID, PARTY_TITLE, createPartyDanceGate, samplePartyDanceGate } from "@/lib/bus-party";
import { emitBusAudioEvent, onBusAudioEvent } from "@/lib/bus-audio";

export const BGM_YOUTUBE_ID = "63RzVcR1qHg"; // "Life in Pieces" - Howard Harper-Barnes (Thème Le Mont Corvo)
export { PARTY_YOUTUBE_ID } from "@/lib/bus-party";
const MUSIC_RESUME_MS = 1800;

interface BackgroundMusicPlayerProps {
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onPlaybackError?: (message: string) => void;
  suspendedForVideo?: boolean;
  volume?: number;
  partyOn?: boolean;
  onPartyPlaybackError?: () => void;
}

export default function BackgroundMusicPlayer({
  playing,
  onPlayingChange,
  onPlaybackError,
  suspendedForVideo = false,
  volume = 85,
  partyOn = false,
  onPartyPlaybackError,
}: BackgroundMusicPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const desiredPlayingRef = useRef(playing);
  const desiredPartyRef = useRef(partyOn);
  const loadedIdRef = useRef(BGM_YOUTUBE_ID);
  const sourceNeedsLoadRef = useRef(false);
  const backgroundPositionRef = useRef(0);
  const desiredSuspendedRef = useRef(suspendedForVideo);
  const desiredVolumeRef = useRef(volume);
  const busAudioFocusRef = useRef(false);
  const resumeAfterVideoRef = useRef(false);
  const fadePendingRef = useRef(false);
  const fadeStartedRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const apiFailedRef = useRef(false);
  const danceGateRef = useRef(createPartyDanceGate());
  const dancingRef = useRef(false);
  const reportDance = useCallback((dancing: boolean) => {
    if(dancingRef.current===dancing)return;
    dancingRef.current=dancing;
    emitBusAudioEvent("partyDance", dancing);
  },[]);
  const updateDance = useCallback(() => {
    if(!desiredPartyRef.current){reportDance(false);return;}
    const player=playerRef.current;
    try {
      reportDance(Boolean(player && readyRef.current && samplePartyDanceGate(danceGateRef.current,
        desiredPartyRef.current && !desiredSuspendedRef.current && !busAudioFocusRef.current,
        player.getPlayerState(),player.getCurrentTime(),player.getVideoUrl())));
    } catch { reportDance(false); }
  },[reportDance]);
  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
    startTimerRef.current = null;
  }, []);
  const clearFade = useCallback(() => {
    if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = null;
    fadeStartedRef.current = null;
    fadePendingRef.current = false;
  }, []);
  const startFade = useCallback(() => {
    if (!fadePendingRef.current || fadeStartedRef.current !== null) return;
    fadePendingRef.current = false;
    fadeStartedRef.current = performance.now();
    const tick = () => {
      const player = playerRef.current;
      if (!player || !(desiredPlayingRef.current || desiredPartyRef.current) || desiredSuspendedRef.current || busAudioFocusRef.current) {
        clearFade();
        return;
      }
      const progress = Math.min(1, (performance.now() - fadeStartedRef.current!) / MUSIC_RESUME_MS);
      const gain = progress * progress * (3 - 2 * progress);
      try { player.setVolume(Math.round(desiredVolumeRef.current * gain)); }
      catch { clearFade(); return; }
      if (progress < 1) fadeTimerRef.current = window.setTimeout(tick, 60);
      else clearFade();
    };
    fadeTimerRef.current = window.setTimeout(tick, 60);
  }, [clearFade]);
  const reportFailure = useCallback((message: string) => {
    clearStartTimer();
    clearFade();
    reportDance(false);
    const wasParty = desiredPartyRef.current;
    const playbackMessage = wasParty ? message.replace("bouton Musique", "bouton Fête").replace("sur Musique", "sur Fête") : message;
    const requested = desiredPlayingRef.current || wasParty;
    if (wasParty) desiredPartyRef.current = false;
    else desiredPlayingRef.current = false;
    queueMicrotask(() => {
      if (wasParty) onPartyPlaybackError?.();
      else onPlayingChange(false);
      if (requested) onPlaybackError?.(playbackMessage);
    });
  }, [clearStartTimer, clearFade, onPlayingChange, onPlaybackError, onPartyPlaybackError, reportDance]);

  const applyDesiredPlayback = useCallback(() => {
    clearStartTimer();
    if (!readyRef.current || !playerRef.current) return;
    const player = playerRef.current;
    try {
      const suspended = desiredSuspendedRef.current || busAudioFocusRef.current;
      const requested = desiredPlayingRef.current || desiredPartyRef.current;
      const nextId = desiredPartyRef.current ? PARTY_YOUTUBE_ID : BGM_YOUTUBE_ID;
      const sourceChanged = nextId !== loadedIdRef.current;
      if (sourceChanged) {
        danceGateRef.current.waitingForIntro=true;
        reportDance(false);
        if (loadedIdRef.current === BGM_YOUTUBE_ID) backgroundPositionRef.current = player.getCurrentTime();
        player.mute();
        player.pauseVideo();
        clearFade();
        loadedIdRef.current = nextId;
        sourceNeedsLoadRef.current = true;
        resumeAfterVideoRef.current = !desiredPartyRef.current;
        player.getIframe().title = desiredPartyRef.current ? `Musique de fête — ${PARTY_TITLE}` : "Musique de fond — Life in Pieces (Le Mont Corvo)";
      }
      if (requested && !suspended) {
        startTimerRef.current = window.setTimeout(() => {
          startTimerRef.current = null;
          const state = player.getPlayerState();
          if ((desiredPlayingRef.current || desiredPartyRef.current) && !desiredSuspendedRef.current && !busAudioFocusRef.current && (state === -1 || state === 5)) {
            player.mute();
            player.pauseVideo();
            reportFailure("YouTube n’a pas démarré la lecture. Réessayez avec le bouton Musique.");
          }
        }, 12000);
        if (resumeAfterVideoRef.current) {
          resumeAfterVideoRef.current = false;
          clearFade();
          fadePendingRef.current = true;
          player.setVolume(0);
        } else if (!fadePendingRef.current && fadeStartedRef.current === null) {
          player.setVolume(desiredVolumeRef.current);
        }
        if (sourceNeedsLoadRef.current) {
          if (!player.loadVideoById) throw new Error("Le lecteur ne peut pas changer de piste.");
          sourceNeedsLoadRef.current = false;
          // Une seule commande charge ET joue la nouvelle piste. Un playVideo
          // envoyé avant l'accusé de cueVideoById peut jouer l'ancienne vidéo.
          player.loadVideoById({ videoId: nextId, startSeconds: desiredPartyRef.current ? 0 : backgroundPositionRef.current });
          player.unMute();
        } else {
          player.unMute();
          player.playVideo();
          if (player.getPlayerState() === 1) startFade();
        }
      } else {
        if (suspended && requested) resumeAfterVideoRef.current = true;
        reportDance(false);
        if (!requested) resumeAfterVideoRef.current = false;
        clearFade();
        player.mute();
        if (sourceChanged) {
          if (!player.cueVideoById) throw new Error("Le lecteur ne peut pas changer de piste.");
          player.cueVideoById({ videoId: nextId, startSeconds: backgroundPositionRef.current });
        }
        player.pauseVideo();
      }
    } catch {
      reportFailure("Le lecteur YouTube n’est pas prêt. Réessayez dans un instant.");
    }
  }, [clearStartTimer, clearFade, startFade, reportFailure, reportDance]);

  useEffect(() => {
    let cancelled = false;

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;

        const player = new YT.Player(mountRef.current, {
          width: 200,
          height: 200,
          videoId: BGM_YOUTUBE_ID,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              readyRef.current = true;
              playerRef.current = event.target;
              event.target.setVolume(desiredVolumeRef.current);

              const iframe = event.target.getIframe();
              iframe.title = "Musique de fond — Life in Pieces (Le Mont Corvo)";
              iframe.setAttribute("allow", "autoplay; encrypted-media");
              iframe.id = "bgm-iframe";
              iframe.style.display = "block";
              iframe.style.width = "200px";
              iframe.style.height = "200px";
              applyDesiredPlayback();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if(event.data===0 && desiredPartyRef.current) danceGateRef.current.waitingForIntro=true;
              // `playing` is the user's choice. A temporary pause for a video
              // must not switch the music button off or prevent its resumption.
              const shouldPlay = (desiredPlayingRef.current || desiredPartyRef.current) && !desiredSuspendedRef.current && !busAudioFocusRef.current;
              if (event.data === 1) {
                clearStartTimer();
                if (shouldPlay) startFade();
              }
              if(event.data!==1)reportDance(false);
              else updateDance();
              if (event.data === 1 && !shouldPlay) {
                event.target.mute();
                event.target.pauseVideo();
              } else if (event.data === 0) {
                if (shouldPlay) {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                }
              }
            },
            onAutoplayBlocked: () => {
              if (!cancelled && (desiredPlayingRef.current || desiredPartyRef.current) && !desiredSuspendedRef.current && !busAudioFocusRef.current) {
                reportFailure("La lecture a été bloquée par le navigateur. Cliquez à nouveau sur Musique.");
              }
            },
            onError: () => {
              if (!cancelled) reportFailure("YouTube ne peut pas lire la musique pour le moment.");
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) {
          apiFailedRef.current = true;
          reportFailure("Le lecteur YouTube n’a pas pu être chargé.");
        }
      });

    return () => {
      cancelled = true;
      clearStartTimer();
      clearFade();
      reportDance(false);
      readyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // Nettoyage silencieux
      }
      playerRef.current = null;
    };
  }, [applyDesiredPlayback, clearStartTimer, clearFade, startFade, reportFailure, reportDance, updateDance]);

  useEffect(()=>{
    const timer=window.setInterval(updateDance,100);
    return()=>window.clearInterval(timer);
  },[updateDance]);

  useEffect(() => onBusAudioEvent("musicToggle", detail => {
    if (desiredPartyRef.current) return;
    desiredPlayingRef.current = detail.playing;
    desiredSuspendedRef.current = detail.suspendedForVideo;
    if (apiFailedRef.current) reportFailure("Le lecteur YouTube n’a pas pu être chargé. Actualisez la page pour réessayer.");
    else applyDesiredPlayback();
  }), [applyDesiredPlayback, reportFailure]);

  useEffect(() => onBusAudioEvent("partyToggle", detail => {
    desiredPartyRef.current = detail.enabled;
    desiredSuspendedRef.current = detail.suspendedForVideo;
    if (apiFailedRef.current) reportFailure("Le lecteur YouTube n’a pas pu être chargé. Actualisez la page pour réessayer.");
    else applyDesiredPlayback();
  }), [applyDesiredPlayback, reportFailure]);

  // Les deux lecteurs vivent dans des racines React différentes. Couper le son
  // dans la même commande, avant que la télévision ne devienne audible.
  useEffect(() => onBusAudioEvent("tvFocus", active => {
    busAudioFocusRef.current = active;
    applyDesiredPlayback();
  }), [applyDesiredPlayback]);

  // Synchronisation de l'état lecture / pause selon les props
  useLayoutEffect(() => {
    desiredPlayingRef.current = playing;
    desiredPartyRef.current = partyOn;
    desiredSuspendedRef.current = suspendedForVideo;

    applyDesiredPlayback();
  }, [playing, partyOn, suspendedForVideo, applyDesiredPlayback]);

  // Synchronisation dynamique du volume sonore (0 - 100)
  useEffect(() => {
    desiredVolumeRef.current = volume;
    if (!readyRef.current || !playerRef.current) return;
    try {
      if (fadePendingRef.current) playerRef.current.setVolume(0);
      else if (fadeStartedRef.current === null) playerRef.current.setVolume(volume);
    } catch {
      // Ignorer si le lecteur n'est pas encore prêt
    }
  }, [volume]);

  return (
    <div
      className="fixed -left-[9999px] top-0 h-[200px] w-[200px] pointer-events-none"
      aria-hidden="true"
    >
      <div ref={mountRef} />
    </div>
  );
}
