const HTML_EDGE_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

function parseNonNegativeInteger(value, fallback, maximum = 10_000_000) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : fallback;
}

function getEdgeCache() {
  try {
    if (typeof caches !== "undefined" && "default" in caches) {
      return caches.default;
    }
  } catch {
    /* Cache API indisponible hors workerd. */
  }
  return null;
}

function isNextRouterSubrequest(request) {
  return Boolean(
    request.headers.get("rsc")
    || request.headers.get("next-router-state-tree")
    || request.headers.get("next-router-prefetch")
    || request.headers.get("next-action"),
  );
}

function withHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Calcule exactement la clé canonique de cache partagée avec src/app/api/bus-entries/route.ts.
 * Retourne null pour toute requête privée (visitorId) ou invalide.
 */
export function getPublicBusApiCacheKey(url) {
  if (url.pathname !== "/api/bus-entries") return null;

  const seatParam = url.searchParams.get("seat");
  if (seatParam !== null) {
    const seatIndex = parseNonNegativeInteger(seatParam, -1);
    return seatIndex >= 0 ? `${url.origin}/api/bus-entries?seat=${seatIndex}` : null;
  }

  if (url.searchParams.get("visitorId") !== null) {
    return null;
  }

  if (url.searchParams.get("messages") === "1") {
    const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
    const limit = 100;
    if (url.searchParams.get("random") === "1") {
      const slot = parseNonNegativeInteger(url.searchParams.get("slot"), 0, 7);
      return `${url.origin}/api/bus-entries?messages=1&random=1&limit=${limit}&slot=${slot}`;
    }
    return `${url.origin}/api/bus-entries?messages=1&from=${from}&limit=${limit}`;
  }

  if (url.searchParams.get("names") === "1") {
    if (url.searchParams.get("from") !== null) {
      const from = Math.floor(parseNonNegativeInteger(url.searchParams.get("from"), 0) / 80) * 80;
      const limit = 80;
      return `${url.origin}/api/bus-entries?names=1&from=${from}&limit=${limit}`;
    }
    const rawSeats = url.searchParams.get("seats");
    const values = rawSeats?.split(",") ?? [];
    const seats = values.map((value) => (/^\d+$/.test(value) ? Number(value) : NaN));
    if (!seats.length || seats.length > 20 || seats.some((seat) => !Number.isSafeInteger(seat))) {
      return null;
    }
    const normalizedSeats = [...new Set(seats)].sort((a, b) => a - b);
    return `${url.origin}/api/bus-entries?names=1&seats=${normalizedSeats.join(",")}`;
  }

  if (url.searchParams.get("manifest") === "1") {
    const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
    const limit = 60;
    return `${url.origin}/api/bus-entries?manifest=1&from=${from}&limit=${limit}`;
  }

  if (url.searchParams.get("profiles") === "1") {
    const from = Math.floor(parseNonNegativeInteger(url.searchParams.get("from"), 0) / 32) * 32;
    const limit = 48;
    return `${url.origin}/api/bus-entries?profiles=1&from=${from}&limit=${limit}`;
  }

  return `${url.origin}/api/bus-entries`;
}

/**
 * Court-circuit edge Cloudflare avant Next.js/OpenNext pour absorber les pics 50k–100k visiteurs.
 */
export function createEdgeCachedFetch(upstreamFetch) {
  return async function edgeCachedFetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.protocol === "http:" && url.hostname === "lesfousdubus.sbs") {
      url.protocol = "https:";
      // 308 conserve aussi la méthode des requêtes API et leur corps.
      return Response.redirect(url.href, 308);
    }

    const edgeCache = request.method === "GET" && request.headers.get("cf-connecting-ip")
      ? getEdgeCache()
      : null;
    if (!edgeCache) {
      return upstreamFetch(request, env, ctx);
    }

    if (url.pathname === "/" && !isNextRouterSubrequest(request)) {
      const canonicalHtmlReq = new Request(`${url.origin}/`, { method: "GET" });
      try {
        const cachedHtml = await edgeCache.match(canonicalHtmlReq);
        if (cachedHtml) {
          return withHeader(cachedHtml, "X-Bus-Edge-Cache", "hit");
        }
      } catch {
        /* Repli sur l'upstream si Cache API échoue ponctuellement. */
      }

      const response = await upstreamFetch(request, env, ctx);
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status === 200 && contentType.includes("text/html") && !response.headers.has("set-cookie")) {
        const headers = new Headers(response.headers);
        headers.delete("vary");
        headers.set("Cache-Control", HTML_EDGE_CACHE_CONTROL);
        headers.set("X-Bus-Edge-Cache", "miss");
        const cacheable = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
        const putPromise = edgeCache.put(canonicalHtmlReq, cacheable.clone()).catch(() => undefined);
        if (ctx?.waitUntil) ctx.waitUntil(putPromise);
        else void putPromise;
        return cacheable;
      }
      return response;
    }

    const apiKey = getPublicBusApiCacheKey(url);
    if (apiKey) {
      const apiCacheReq = new Request(apiKey, { method: "GET" });
      try {
        const cachedApi = await edgeCache.match(apiCacheReq);
        if (cachedApi) {
          return withHeader(cachedApi, "X-Bus-Edge-Cache", "hit");
        }
      } catch {
        /* Repli sur l'upstream si Cache API échoue ponctuellement. */
      }
    }

    return upstreamFetch(request, env, ctx);
  };
}
