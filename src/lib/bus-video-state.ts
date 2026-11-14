"use client";

export interface BusVideoSnapshot {
  ready: boolean;
  state: number;
  currentTime: number;
  duration: number;
  autoplayBlocked: boolean;
  shouldBePlaying: boolean;
}

let snapshot: BusVideoSnapshot = {
  ready: false,
  state: -1,
  currentTime: 0,
  duration: 0,
  autoplayBlocked: false,
  shouldBePlaying: false,
};

export function getBusVideoSnapshot(): BusVideoSnapshot {
  return { ...snapshot };
}

export function updateBusVideoSnapshot(patch: Partial<BusVideoSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<BusVideoSnapshot>("bus-video-state", { detail: getBusVideoSnapshot() }));
  }
}

export function requestBusVideoSeek(currentTime: number) {
  if (typeof window === "undefined" || !Number.isFinite(currentTime)) return;
  window.dispatchEvent(new CustomEvent<{ currentTime: number }>("bus-video-seek", {
    detail: { currentTime: Math.max(0, currentTime) },
  }));
}
