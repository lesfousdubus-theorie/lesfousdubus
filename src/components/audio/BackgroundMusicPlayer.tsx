"use client";

import { useEffect, useRef } from "react";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";

export const BGM_YOUTUBE_ID = "63RzVcR1qHg"; // "Life in Pieces" - Howard Harper-Barnes (Thème Le Mont Corvo)

interface BackgroundMusicPlayerProps {
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  suspendedForVideo?: boolean;
  volume?: number;
}

export default function BackgroundMusicPlayer({
  playing,
  onPlayingChange,
  suspendedForVideo = false,
  volume = 50,
}: BackgroundMusicPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const desiredPlayingRef = useRef(playing);
  const desiredSuspendedRef = useRef(suspendedForVideo);
  const desiredVolumeRef = useRef(volume);

  useEffect(() => {
    let cancelled = false;

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;

        const player = new YT.Player(mountRef.current, {
          width: 200,
          height: 150,
          videoId: BGM_YOUTUBE_ID,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            loop: 1,
            playlist: BGM_YOUTUBE_ID,
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
              iframe.style.display = "none";

              if (desiredPlayingRef.current && !desiredSuspendedRef.current) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              // `playing` is the user's choice. A temporary pause for a video
              // must not switch the music button off or prevent its resumption.
              const shouldPlay = desiredPlayingRef.current && !desiredSuspendedRef.current;
              if (event.data === 1 && !shouldPlay) {
                event.target.pauseVideo();
              } else if (event.data === 0) {
                if (shouldPlay) {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                }
              }
            },
            onAutoplayBlocked: () => {
              if (!cancelled && desiredPlayingRef.current && !desiredSuspendedRef.current) {
                onPlayingChange(false);
              }
            },
            onError: () => {
              if (!cancelled) onPlayingChange(false);
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => { if (!cancelled) onPlayingChange(false); });

    return () => {
      cancelled = true;
      readyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // Nettoyage silencieux
      }
      playerRef.current = null;
    };
  }, [onPlayingChange]);

  // Synchronisation de l'état lecture / pause selon les props
  useEffect(() => {
    desiredPlayingRef.current = playing;
    desiredSuspendedRef.current = suspendedForVideo;

    if (!readyRef.current || !playerRef.current) return;
    try {
      if (playing && !suspendedForVideo) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // Ignorer si le lecteur est en cours d'initialisation
    }
  }, [playing, suspendedForVideo]);

  // Synchronisation dynamique du volume sonore (0 - 100)
  useEffect(() => {
    desiredVolumeRef.current = volume;
    if (!readyRef.current || !playerRef.current) return;
    try {
      playerRef.current.setVolume(volume);
    } catch {
      // Ignorer si le lecteur n'est pas encore prêt
    }
  }, [volume]);

  return (
    <div
      ref={mountRef}
      className="fixed -left-[9999px] -top-[9999px] h-px w-px opacity-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
