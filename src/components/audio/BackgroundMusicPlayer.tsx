"use client";

import { useEffect, useRef } from "react";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";

export const BGM_YOUTUBE_ID = "63RzVcR1qHg"; // "Life in Pieces" - Howard Harper-Barnes (Thème Le Mont Corvo)

interface BackgroundMusicPlayerProps {
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  mutedForOverlay?: boolean;
}

export default function BackgroundMusicPlayer({
  playing,
  onPlayingChange,
  mutedForOverlay = false,
}: BackgroundMusicPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const desiredPlayingRef = useRef(playing);
  const desiredMutedRef = useRef(mutedForOverlay);

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
              event.target.setVolume(50); // Volume d'ambiance agréable à 50%

              const iframe = event.target.getIframe();
              iframe.title = "Musique de fond — Life in Pieces (Le Mont Corvo)";
              iframe.setAttribute("allow", "autoplay; encrypted-media");
              iframe.style.display = "none";

              if (desiredPlayingRef.current && !desiredMutedRef.current) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                onPlayingChange(true);
              } else if (event.data === 2) {
                onPlayingChange(false);
              } else if (event.data === 0) {
                // Relance en boucle continue
                event.target.seekTo(0, true);
                event.target.playVideo();
              }
            },
            onError: () => {
              onPlayingChange(false);
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => undefined);

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
    desiredMutedRef.current = mutedForOverlay;

    if (!readyRef.current || !playerRef.current) return;
    try {
      if (playing && !mutedForOverlay) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // Ignorer si le lecteur est en cours d'initialisation
    }
  }, [playing, mutedForOverlay]);

  return (
    <div
      ref={mountRef}
      className="fixed -left-[9999px] -top-[9999px] h-px w-px opacity-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
