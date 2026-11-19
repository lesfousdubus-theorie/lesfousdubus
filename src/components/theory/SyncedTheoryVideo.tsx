"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { YOUTUBE_ID } from "@/lib/theory-video";
import { isYouTubePlaybackActive, loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";
import { PlayIcon } from "@/components/ui/BusIcons";

export default function SyncedTheoryVideo({
  active = true,
  onPlaybackChange,
}: {
  active?: boolean;
  onPlaybackChange?: (active: boolean) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const activeRef = useRef(active);
  const playbackActiveRef = useRef(false);
  const onPlaybackChangeRef = useRef(onPlaybackChange);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    onPlaybackChangeRef.current = onPlaybackChange;
  }, [onPlaybackChange]);

  const reportPlayback = useCallback((playing: boolean) => {
    if (playbackActiveRef.current === playing) return;
    playbackActiveRef.current = playing;
    onPlaybackChangeRef.current?.(playing);
  }, []);

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      try {
        playerRef.current?.pauseVideo?.();
      } catch {
        // The iframe may be starting or already removed.
      }
      reportPlayback(false);
    }
  }, [active, reportPlayback]);

  useEffect(() => {
    let cancelled = false;
    let playbackFailed = false;
    let playbackTimer = 0;

    // Cross-frame state events can be delayed or missed. Read the same public
    // player state as a backup, only while this video tab is active.
    const observePlayback = () => {
      if (cancelled || playbackFailed || !playerRef.current || !activeRef.current) return;
      try {
        reportPlayback(
          isYouTubePlaybackActive(playerRef.current.getPlayerState(), playbackActiveRef.current),
        );
      } catch {
        // The iframe may be starting or being removed.
      }
    };

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        const target = document.createElement("div");
        target.className = "h-full w-full";
        mountRef.current.replaceChildren(target);

        try {
          const player = new YT.Player(target, {
            width: 960,
            height: 540,
            videoId: YOUTUBE_ID,
            host: "https://www.youtube-nocookie.com",
            playerVars: {
              autoplay: 0,
              controls: 1,
              rel: 0,
              playsinline: 1,
              cc_load_policy: 0,
              iv_load_policy: 3,
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                if (cancelled) return;
                playerRef.current = event.target;
                setReady(true);
                if (activeRef.current) {
                  observePlayback();
                } else {
                  try {
                    event.target.pauseVideo?.();
                  } catch {
                    // The iframe may not accept pause before becoming visible.
                  }
                  reportPlayback(false);
                }
                playbackTimer = window.setInterval(observePlayback, 250);
                const iframe = event.target.getIframe();
                iframe.title = "La Théorie des Fous du Bus — Vidéo officielle Le Mont Corvo";
                iframe.setAttribute(
                  "allow",
                  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
                );
                iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
                iframe.style.width = "100%";
                iframe.style.height = "100%";
                iframe.style.border = "0";
                iframe.style.display = "block";

                // Lecteur volontairement indépendant de la TV du bus.
                // Aucun play, pause ou seek n'est envoyé ici : YouTube reste simplement
                // affiché à 0:00 jusqu'au clic explicite de l'utilisateur.
              },
              onStateChange: (event) => {
                if (cancelled || playbackFailed) return;
                if (!activeRef.current) {
                  if (event.data === 1) {
                    try {
                      event.target.pauseVideo?.();
                    } catch {
                      // The iframe may be transitioning.
                    }
                  }
                  reportPlayback(false);
                  return;
                }
                reportPlayback(isYouTubePlaybackActive(event.data, playbackActiveRef.current));
                if (event.data === 1) setAutoplayBlocked(false);
              },
              onAutoplayBlocked: () => {
                if (cancelled) return;
                reportPlayback(false);
                setAutoplayBlocked(true);
              },
              onError: () => {
                if (cancelled) return;
                playbackFailed = true;
                window.clearInterval(playbackTimer);
                reportPlayback(false);
                setFailed(true);
              },
            },
          });
          playerRef.current = player;
        } catch {
          if (!cancelled) {
            playbackFailed = true;
            reportPlayback(false);
            setFailed(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          reportPlayback(false);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      window.clearInterval(playbackTimer);
      reportPlayback(false);
      try {
        playerRef.current?.destroy();
      } catch {
        // The iframe may already have failed or been removed.
      }
      playerRef.current = null;
    };
  }, [retryCount, reportPlayback]);

  const resume = () => {
    const player = playerRef.current;
    if (!player) return;
    player.playVideo();
    setAutoplayBlocked(false);
  };

  const retry = () => {
    setFailed(false);
    setAutoplayBlocked(false);
    setReady(false);
    setRetryCount((count) => count + 1);
  };

  return (
    <div
      data-theory-video
      className="relative mt-4 grid min-h-[200px] w-full place-items-center overflow-hidden rounded-xl border border-white/15 bg-[#070e26] sm:aspect-video"
    >
      <div ref={mountRef} className="aspect-video max-h-full w-full" />
      {!ready && !failed && !autoplayBlocked && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#070e26]/80 px-4 text-center"
        >
          <span
            aria-hidden="true"
            className="h-6 w-6 animate-spin rounded-full border-2 border-[#a78bfa]/30 border-t-[#a78bfa] motion-reduce:animate-none"
          />
          <span className="text-xs font-medium text-[#b6c1ee]">
            Chargement du lecteur YouTube…
          </span>
        </div>
      )}
      {failed && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050a1b]/90 p-4 text-center"
        >
          <p className="text-xs font-semibold text-[#e2e8ff] sm:text-sm">
            Le lecteur vidéo n’a pas pu se charger.
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bus-gradient px-4 py-2.5 text-xs font-black text-[#ffffff] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070e26] active:translate-y-1 active:shadow-none motion-reduce:transform-none motion-reduce:transition-none sm:px-5 sm:text-sm"
          >
            Réessayer le lecteur
          </button>
        </div>
      )}
      {!failed && autoplayBlocked && (
        <button
          type="button"
          onClick={resume}
          className="group absolute inset-0 grid cursor-pointer place-items-center bg-[#050a1b]/85 p-4 text-center transition-colors hover:bg-[#050a1b]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a78bfa] motion-reduce:transition-none"
        >
          <span className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl bus-gradient px-5 py-3 text-sm font-black text-[#ffffff] transition group- group-active:translate-y-1 group-active:shadow-none motion-reduce:transform-none motion-reduce:transition-none sm:text-base">
            <PlayIcon className="h-4 w-4 shrink-0" />
            <span>Reprendre la vidéo</span>
          </span>
        </button>
      )}
    </div>
  );
}
