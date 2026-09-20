"use client";

import { useEffect, useRef, useState } from "react";
import { YOUTUBE_ID } from "./bus/constants";
import { getBusVideoSnapshot, requestBusVideoSeek } from "@/lib/bus-video-state";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";

export default function SyncedTheoryVideo() {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const currentTimeRef = useRef(0);
  const initialSnapshotRef = useRef(getBusVideoSnapshot());
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initial = initialSnapshotRef.current;
    currentTimeRef.current = initial.currentTime;

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        const player = new YT.Player(mountRef.current, {
          width: 960,
          height: 540,
          videoId: YOUTUBE_ID,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              const iframe = event.target.getIframe();
              iframe.title = "La Théorie des Fous du Bus — Vidéo Officielle Le Mont Corvo";
              iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
              iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              iframe.style.border = "0";
              iframe.style.display = "block";
              if (initial.currentTime > 0.25) {
                event.target.seekTo(initial.currentTime, true);
              }
              if (initial.shouldBePlaying) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              currentTimeRef.current = event.target.getCurrentTime();
              if (event.data === 1) setAutoplayBlocked(false);
            },
            onAutoplayBlocked: () => setAutoplayBlocked(true),
            onError: () => setFailed(true),
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    const syncTimer = window.setInterval(() => {
      try {
        if (playerRef.current) currentTimeRef.current = playerRef.current.getCurrentTime();
      } catch {
        // Le lecteur peut être en train de se fermer.
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(syncTimer);
      try {
        if (playerRef.current) currentTimeRef.current = playerRef.current.getCurrentTime();
      } catch {
        // On conserve la dernière position connue.
      }
      requestBusVideoSeek(currentTimeRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const resume = () => {
    const player = playerRef.current;
    if (!player) return;
    if (currentTimeRef.current > 0.25) player.seekTo(currentTimeRef.current, true);
    player.playVideo();
    setAutoplayBlocked(false);
  };

  return (
    <div data-theory-video className="relative mt-4 aspect-video min-h-[200px] w-full overflow-hidden rounded-xl border border-white/20 bg-black">
      <div ref={mountRef} className="h-full w-full" />
      {(autoplayBlocked || failed) && (
        <button
          type="button"
          onClick={failed ? () => window.open(`https://www.youtube.com/watch?v=${YOUTUBE_ID}`, "_blank", "noopener,noreferrer") : resume}
          className="absolute inset-0 grid place-items-center bg-[#020617]/85 text-base font-black text-[#ffd23f] transition hover:bg-[#020617]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd23f]"
        >
          {failed ? "Ouvrir la vidéo sur YouTube" : "▶ Reprendre la vidéo"}
        </button>
      )}
    </div>
  );
}
