import { getCloudflareContext } from "@opennextjs/cloudflare";

interface IsolateCacheEntry {
  body: string;
  headers: Record<string, string>;
  expiresAt: number;
  staleUntil: number;
}

const MAX_ISOLATE_CACHE_ENTRIES = 1_024;
const STALE_ON_ERROR_MAX_MS = 10 * 60 * 1_000;

const isolateCache = new Map<string, IsolateCacheEntry>();
const inFlightRequests = new Map<string, Promise<IsolateCacheEntry>>();

function pruneIsolateCache() {
  while (isolateCache.size > MAX_ISOLATE_CACHE_ENTRIES) {
    const oldestKey = isolateCache.keys().next().value;
    if (oldestKey === undefined) break;
    isolateCache.delete(oldestKey);
  }
}

function getEdgeCacheStorage(): Cache | null {
  try {
    if (typeof caches !== "undefined" && "default" in caches) {
      return (caches as unknown as { default: Cache }).default;
    }
  } catch {
    /* Cache API indisponible dans cet environnement. */
  }
  return null;
}

function canUseEdgeCache(request: Request): boolean {
  return Boolean(request.headers.get("cf-connecting-ip")) && getEdgeCacheStorage() !== null;
}

export function scheduleBackgroundTask(promise: Promise<unknown>) {
  const safe = promise.catch(() => undefined);
  void getCloudflareContext({ async: true })
    .then((context) => {
      const ctx = (context as { ctx?: { waitUntil?: (task: Promise<unknown>) => void } }).ctx;
      ctx?.waitUntil?.(safe);
    })
    .catch(() => undefined);
}

export interface InvalidatePublicReadCacheOptions {
  origin?: string;
  seatIndex?: number | null;
  isEdgeRequest?: boolean;
  expireAll?: boolean;
}

/** Expire de manière ciblée les lectures publiques en cache tout en conservant le repli stale-on-error. */
export function invalidatePublicReadCache(options?: InvalidatePublicReadCacheOptions) {
  if (!options || options.expireAll) {
    for (const entry of isolateCache.values()) {
      entry.expiresAt = 0;
    }
    return;
  }

  const { origin, seatIndex, isEdgeRequest } = options;

  if (origin && typeof seatIndex === "number" && Number.isSafeInteger(seatIndex) && seatIndex >= 0) {
    const seatKey = `${origin}/api/bus-entries?seat=${seatIndex}`;
    const seatEntry = isolateCache.get(seatKey);
    if (seatEntry) seatEntry.expiresAt = 0;
    if (isEdgeRequest) {
      const edgeCache = getEdgeCacheStorage();
      if (edgeCache) {
        scheduleBackgroundTask(edgeCache.delete(new Request(seatKey, { method: "GET" })));
      }
    }
  }

  // En production Cloudflare (CF-Ray présent), ne jamais vider les caches globaux à chaque écriture :
  // leurs TTL de 20–90 s protègent D1 d'une tempête de lectures pendant un afflux massif d'inscriptions.
  if (isEdgeRequest) return;

  const statsPrefix = origin ? `${origin}/api/bus-entries` : "/api/bus-entries";
  for (const [key, entry] of isolateCache.entries()) {
    if (key.includes("?messages=1") || key.includes("&messages=1") || key.includes("?manifest=1") || key.includes("&manifest=1")) {
      continue;
    }
    if (
      key === statsPrefix
      || key.endsWith("/api/bus-entries")
      || key.includes("?profiles=1")
      || key.includes("?names=1")
    ) {
      entry.expiresAt = 0;
    }
  }
}

export function resetPublicReadCacheForTests() {
  isolateCache.clear();
  inFlightRequests.clear();
}

export async function cachedPublicJson<T>(
  request: Request,
  options: {
    ttlSeconds: number;
    swrSeconds: number;
    maxAgeSeconds?: number;
    cacheKey?: string;
    shouldFallbackToStale?: (error: unknown) => boolean;
  },
  loader: () => Promise<T>,
): Promise<Response> {
  const key = options.cacheKey ?? request.url;
  const maxAge = options.maxAgeSeconds ?? options.ttlSeconds;
  const cacheControl = `public, max-age=${maxAge}, s-maxage=${options.ttlSeconds}, stale-while-revalidate=${options.swrSeconds}`;
  const now = Date.now();
  const cached = isolateCache.get(key);

  if (cached && now < cached.expiresAt) {
    // Rafraîchit la position LRU.
    isolateCache.delete(key);
    isolateCache.set(key, cached);
    return new Response(cached.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cached.headers,
        "X-Bus-Cache": "hit",
      },
    });
  }

  const edgeCache = canUseEdgeCache(request) ? getEdgeCacheStorage() : null;
  const edgeCacheRequest = edgeCache ? new Request(new URL(key, request.url).toString(), { method: "GET" }) : null;

  if (edgeCache && edgeCacheRequest) {
    try {
      const matched = await edgeCache.match(edgeCacheRequest);
      if (matched) {
        const body = await matched.text();
        const headers = { "Cache-Control": cacheControl };
        isolateCache.set(key, {
          body,
          headers,
          expiresAt: now + options.ttlSeconds * 1_000,
          staleUntil: now + STALE_ON_ERROR_MAX_MS,
        });
        pruneIsolateCache();
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...headers,
            "X-Bus-Cache": "edge-hit",
          },
        });
      }
    } catch {
      /* Continuer vers le loader si l'API Cache échoue ponctuellement. */
    }
  }

  let promise = inFlightRequests.get(key);
  if (!promise) {
    promise = (async () => {
      const payload = await loader();
      const body = JSON.stringify(payload);
      const loadedAt = Date.now();
      const headers = { "Cache-Control": cacheControl };
      const entry: IsolateCacheEntry = {
        body,
        headers,
        expiresAt: loadedAt + options.ttlSeconds * 1_000,
        staleUntil: loadedAt + STALE_ON_ERROR_MAX_MS,
      };
      isolateCache.delete(key);
      isolateCache.set(key, entry);
      pruneIsolateCache();
      if (edgeCache && edgeCacheRequest) {
        scheduleBackgroundTask(
          edgeCache.put(
            edgeCacheRequest,
            new Response(body, {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": cacheControl,
              },
            }),
          ),
        );
      }
      return entry;
    })().finally(() => {
      inFlightRequests.delete(key);
    });
    inFlightRequests.set(key, promise);
  }

  try {
    const entry = await promise;
    return new Response(entry.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...entry.headers,
        "X-Bus-Cache": "miss",
      },
    });
  } catch (error) {
    const allowStale = options.shouldFallbackToStale ? options.shouldFallbackToStale(error) : true;
    if (allowStale && cached && Date.now() < cached.staleUntil) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...cached.headers,
          "X-Bus-Cache": "stale-on-error",
        },
      });
    }
    throw error;
  }
}
