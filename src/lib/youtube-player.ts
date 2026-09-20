"use client";

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer;
  data?: number;
}

interface YouTubePlayerOptions {
  width?: string | number;
  height?: string | number;
  videoId: string;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: YouTubePlayerEvent) => void;
    onAutoplayBlocked?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubeNamespace {
  Player: new (element: HTMLElement | string, options: YouTubePlayerOptions) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is only available in the browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    let settled = false;
    let pollTimer = 0;
    let timeoutTimer = 0;
    let script = document.getElementById("youtube-iframe-api") as HTMLScriptElement | null;

    function cleanup() {
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      script?.removeEventListener("error", onScriptError);
      if (window.onYouTubeIframeAPIReady === readyHandler) {
        window.onYouTubeIframeAPIReady = previousReady;
      }
    }

    function finish() {
      if (settled || !window.YT?.Player) return;
      settled = true;
      cleanup();
      resolve(window.YT);
    }

    function fail(message: string) {
      if (settled) return;
      settled = true;
      cleanup();
      if (!window.YT?.Player && script?.id === "youtube-iframe-api") {
        script.remove();
      }
      apiPromise = null;
      reject(new Error(message));
    }

    function onScriptError() {
      fail("Impossible de charger l’API YouTube.");
    }

    function readyHandler() {
      previousReady?.();
      finish();
    }

    window.onYouTubeIframeAPIReady = readyHandler;

    if (!script) {
      script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("error", onScriptError, { once: true });

    pollTimer = window.setInterval(finish, 50);
    timeoutTimer = window.setTimeout(
      () => fail("Le chargement de l’API YouTube a expiré."),
      15_000,
    );
  });

  return apiPromise;
}
