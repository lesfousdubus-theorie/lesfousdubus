import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { convertV4MiniflareOptions, Log, LogLevel, Miniflare } from "miniflare";
import { unstable_splitSqlQuery as splitSqlQuery } from "wrangler";

/** Tests de montée en charge : plans d'index SQL, places O(1), bouclier anti-tempête, edge fast-path, 0-D1 bots & mode dégradé. */
const directory = mkdtempSync(join(tmpdir(), "fdb-load-test-"));
const quotaSecret = randomUUID() + randomUUID();
const moderationToken = randomUUID() + randomUUID();
let runtime;

try {
  const [compiled, compiledEdge] = await Promise.all([
    build({
      stdin: {
        contents: `import * as entries from './src/app/api/bus-entries/route.ts';
          import { invalidatePublicReadCache, resetPublicReadCacheForTests } from './src/lib/server/edge-cache.ts';
          function wrapDb(db) {
            return {
              prepare(sql) {
                globalThis.__dbQueryCount = (globalThis.__dbQueryCount || 0) + 1;
                return db.prepare(sql);
              },
              async batch(stmts) {
                globalThis.__dbQueryCount = (globalThis.__dbQueryCount || 0) + 1;
                return db.batch(stmts);
              },
              withSession(mode) {
                return wrapDb(db.withSession ? db.withSession(mode) : db);
              },
            };
          }
          export default {async fetch(request, env, ctx) {
            globalThis.__loadTestEnv = { ...env, DB_BUS: wrapDb(env.DB_BUS) };
            globalThis.__loadTestCtx = ctx;
            const url = new URL(request.url);
            if (url.pathname === '/__reset-cache') {
              resetPublicReadCacheForTests();
              return new Response('ok');
            }
            if (url.pathname === '/__expire-cache') {
              invalidatePublicReadCache({ expireAll: true });
              return new Response('ok');
            }
            if (url.pathname === '/__reset-db-count') {
              globalThis.__dbQueryCount = 0;
              return new Response('ok');
            }
            if (url.pathname === '/__get-db-count') {
              return Response.json({ count: globalThis.__dbQueryCount || 0 });
            }
            if (url.pathname === '/__fail-db-stats') {
              globalThis.__failDb = true;
              return new Response('ok');
            }
            if (url.pathname === '/__restore-db') {
              globalThis.__failDb = false;
              return new Response('ok');
            }
            if (url.pathname !== '/api/bus-entries') return new Response('Not found', { status: 404 });
            if (globalThis.__failDb) {
              globalThis.__loadTestEnv = {
                ...env,
                DB_BUS: {
                  prepare() { throw new Error('Simulated D1 outage'); },
                  async batch() { throw new Error('Simulated D1 outage'); },
                  withSession() { return this; },
                },
              };
            }
            const handler = entries[request.method];
            return handler ? handler(request) : new Response('Method not allowed', { status: 405 });
          }};`,
        resolveDir: process.cwd(),
        sourcefile: "isolated-load-resilience-worker.mjs",
      },
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      write: false,
      logLevel: "silent",
      plugins: [{
        name: "isolated-load-context",
        setup(builder) {
          builder.onResolve({ filter: /^@opennextjs\/cloudflare$/ }, () => ({
            path: "context",
            namespace: "load-test",
          }));
          builder.onLoad({ filter: /.*/, namespace: "load-test" }, () => ({
            contents: "export const getCloudflareContext = async () => ({ env: globalThis.__loadTestEnv, ctx: globalThis.__loadTestCtx });",
          }));
        },
      }],
    }),
    build({
      stdin: {
        contents: `import { createEdgeCachedFetch } from './src/lib/server/worker-edge-cache.mjs';
          let upstreamCalls = 0;
          const handler = createEdgeCachedFetch(async (request) => {
            const url = new URL(request.url);
            if (url.pathname === '/__upstream-count') {
              return Response.json({ count: upstreamCalls });
            }
            upstreamCalls += 1;
            if (url.pathname === '/') {
              return new Response('<!doctype html><html><body>Bus</body></html>', {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            }
            if (url.pathname === '/api/bus-entries' && url.searchParams.has('visitorId')) {
              return Response.json({ registered: false }, {
                status: 200,
                headers: { 'Cache-Control': 'no-store, max-age=0' },
              });
            }
            if (url.pathname === '/api/bus-entries') {
              const res = Response.json({ count: 123 }, {
                status: 200,
                headers: { 'Cache-Control': 'public, max-age=15, s-maxage=20, stale-while-revalidate=40' },
              });
              if (typeof caches !== 'undefined' && 'default' in caches && request.headers.get('cf-connecting-ip')) {
                await caches.default.put(new Request(url.origin + '/api/bus-entries', { method: 'GET' }), res.clone());
              }
              return res;
            }
            return new Response('Not found', { status: 404 });
          });
          export default {
            fetch(request, env, ctx) {
              const url = new URL(request.url);
              if (url.pathname === '/__upstream-count') {
                return Response.json({ count: upstreamCalls });
              }
              return handler(request, env, ctx);
            }
          };`,
        resolveDir: process.cwd(),
        sourcefile: "isolated-edge-fastpath-worker.mjs",
      },
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      write: false,
      logLevel: "silent",
    }),
  ]);

  runtime = new Miniflare(convertV4MiniflareOptions({
    host: "127.0.0.1",
    port: 0,
    cf: false,
    telemetry: { enabled: false },
    resourcePersistencePath: join(directory, "state"),
    log: new Log(LogLevel.ERROR),
    workers: [
      {
        name: "load",
        script: compiled.outputFiles[0].text,
        modules: true,
        compatibilityDate: "2026-09-03",
        compatibilityFlags: ["nodejs_compat"],
        bindings: { RATE_LIMIT_SECRET: quotaSecret, MODERATION_TOKEN: moderationToken },
        d1Databases: { DB_BUS: `load-db-${randomUUID()}` },
        outboundService() { throw new Error("External network disabled in load tests."); },
      },
      {
        name: "edge",
        script: compiledEdge.outputFiles[0].text,
        modules: true,
        compatibilityDate: "2026-09-03",
        compatibilityFlags: ["nodejs_compat"],
        outboundService() { throw new Error("External network disabled in edge tests."); },
      },
      {
        name: "pre0010",
        script: compiled.outputFiles[0].text,
        modules: true,
        compatibilityDate: "2026-09-03",
        compatibilityFlags: ["nodejs_compat"],
        bindings: { RATE_LIMIT_SECRET: quotaSecret, MODERATION_TOKEN: moderationToken },
        d1Databases: { DB_BUS: `pre0010-db-${randomUUID()}` },
        outboundService() { throw new Error("External network disabled in load tests."); },
      },
    ],
  }));

  await runtime.ready;
  const database = await runtime.getD1Database("DB_BUS", "load");
  const migrationFiles = readdirSync("migrations").filter((name) => name.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    for (const sql of splitSqlQuery(readFileSync(join("migrations", file), "utf8"))) {
      await database.prepare(sql).run();
    }
  }

  // 1. Vérifier les plans d'exécution SQLite (aucun SCAN bus_entries).
  const dupPlan = await database.prepare(
    `EXPLAIN QUERY PLAN
     SELECT visitor_id FROM bus_entries
     WHERE display_name IS NOT NULL AND TRIM(display_name) != ''
       AND LOWER(TRIM(display_name)) = LOWER('TestUser')
       AND visitor_id != 'x'
     LIMIT 1`,
  ).all();
  assert(
    dupPlan.results.some((r) => String(r.detail).includes("USING INDEX bus_entries_unique_display_name")),
    `Expected display_name index lookup, got: ${JSON.stringify(dupPlan.results)}`,
  );

  const msgPlan = await database.prepare(
    `EXPLAIN QUERY PLAN
     SELECT seat_index, entry_number, display_name, comment FROM bus_entries
     WHERE seat_index >= 0 AND comment IS NOT NULL AND comment != ''
     ORDER BY seat_index ASC LIMIT 24`,
  ).all();
  assert(
    msgPlan.results.some((r) => String(r.detail).includes("USING INDEX bus_entries_with_comment_seat")),
    `Expected partial comment index lookup, got: ${JSON.stringify(msgPlan.results)}`,
  );

  const vacantEndPlan = await database.prepare(
    `EXPLAIN QUERY PLAN
     SELECT start_index FROM bus_vacant_seat_ranges WHERE end_index = 42`,
  ).all();
  assert(
    vacantEndPlan.results.some((r) => {
      const detail = String(r.detail);
      return detail.includes("bus_vacant_seat_ranges_end_index") && detail.includes("USING ");
    }),
    `Expected end_index lookup on bus_vacant_seat_ranges, got: ${JSON.stringify(vacantEndPlan.results)}`,
  );

  // 2. Peupler 500 passagers avec commentaires en batch, vérifier suppression O(1) et réutilisation.
  const insertSql = "INSERT INTO bus_entries (visitor_id, display_name, comment, seat_index, entry_number) VALUES (?, ?, ?, ?, ?)";
  const statements = [];
  for (let i = 0; i < 500; i++) {
    statements.push(database.prepare(insertSql).bind(`load-visitor-${i}`, `Pirate_${i}`, `Message du pirate ${i}`, i, i + 1));
  }
  await database.batch(statements);
  await database.prepare(
    "UPDATE bus_stats SET passenger_count = 500, seat_capacity = 500, last_entry_number = 500, profile_revision = 500 WHERE id = 1",
  ).run();

  const worker = await runtime.getWorker("load");

  const delRes = await worker.fetch("http://load.test/api/bus-entries", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${moderationToken}`,
      "CF-Connecting-IP": "198.51.100.1",
    },
    body: JSON.stringify({ seatIndex: 0 }),
  });
  assert.equal(delRes.status, 200);
  const delData = await delRes.json();
  assert.equal(delData.count, 499);
  assert.equal(delData.seatCapacity, 500, "Seat capacity stays 500 without shifting 499 rows.");
  assert.deepEqual(delData.vacantSeatRanges, [[0, 0, 0]]);
  const unchangedSeat = await database.prepare("SELECT seat_index FROM bus_entries WHERE visitor_id = 'load-visitor-499'").first();
  assert.equal(unchangedSeat.seat_index, 499, "Passenger #499 did not move on O(1) deletion.");

  // Le prochain passager reçoit bien la toute dernière place (500), après tous les autres.
  const joinRes = await worker.fetch("http://load.test/api/bus-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.2" },
    body: JSON.stringify({ visitorId: "load-visitor-rejoin", displayName: "NewNakama" }),
  });
  assert.equal(joinRes.status, 200);
  const joinData = await joinRes.json();
  assert.equal(joinData.seatIndex, 500, "Next join appends at the last seat behind everyone else.");
  assert.equal(joinData.seatCapacity, 501, "Appending at the back advances seat capacity to 501.");
  assert.equal(joinData.entryNumber, 501, "Entry number keeps incrementing monotonically.");
  assert.deepEqual(joinData.vacantSeatRanges, [[0, 0, 0]], "Earlier vacant seat ranges stay recorded.");

  // 3. Mur de messages aléatoires en lots indexés (sans ORDER BY RANDOM()) + cache par slot.
  const msgRes = await worker.fetch("http://load.test/api/bus-entries?messages=1&random=1&limit=100&slot=3");
  assert.equal(msgRes.status, 200);
  assert(msgRes.headers.get("cache-control")?.includes("s-maxage=90"));
  const msgData = await msgRes.json();
  assert.equal(msgData.messages.length, 100);
  assert.equal(new Set(msgData.messages.map((m) => m.seatIndex)).size, 100, "Sampled messages must be deduplicated.");

  // 4. Blocs canoniques de noms ?names=1&from=0&limit=80 (le siège 0 reste vacant -> 79 noms).
  const namesRes = await worker.fetch("http://load.test/api/bus-entries?names=1&from=0&limit=80");
  assert.equal(namesRes.status, 200);
  assert(namesRes.headers.get("cache-control")?.includes("s-maxage=20"));
  const namesData = await namesRes.json();
  assert.equal(namesData.names.length, 79);

  // Canonisation des clés de cache (from non aligné / limit différent -> hit sur le même bloc).
  const namesAliasRes = await worker.fetch("http://load.test/api/bus-entries?names=1&from=13&limit=25");
  assert.equal(namesAliasRes.status, 200);
  assert.equal(namesAliasRes.headers.get("x-bus-cache"), "hit", "Non-canonical names params must collapse to canonical block.");

  const profilesRes = await worker.fetch("http://load.test/api/bus-entries?profiles=1&from=0&limit=48");
  assert.equal(profilesRes.status, 200);
  const profilesAliasRes = await worker.fetch("http://load.test/api/bus-entries?profiles=1&from=7&limit=19");
  assert.equal(profilesAliasRes.status, 200);
  assert.equal(profilesAliasRes.headers.get("x-bus-cache"), "hit", "Non-canonical profiles params must collapse to canonical block.");

  const tooManySeats = Array.from({ length: 21 }, (_, i) => i).join(",");
  const tooManySeatsRes = await worker.fetch(`http://load.test/api/bus-entries?names=1&seats=${tooManySeats}`);
  assert.equal(tooManySeatsRes.status, 400, "Seat list > 20 must be rejected.");

  // 5. Coalescence de 50 GET concurrents + repli stale-on-error en cas de panne D1 simulée.
  await worker.fetch("http://load.test/__reset-cache");
  const burst = await Promise.all(
    Array.from({ length: 50 }, () => worker.fetch("http://load.test/api/bus-entries")),
  );
  assert(burst.every((res) => res.status === 200));
  const statsPayload = await burst[0].json();
  assert.equal(statsPayload.count, 500);

  // 5b. Bouclier anti-tempête en production (CF-Ray présent) : 15 inscriptions simultanées
  // ne doivent pas vider le cache global de lecture (GET stats reste X-Bus-Cache: hit),
  // tout en invalidant immédiatement ?seat=<supprimé> lors d'une suppression.
  const warmStats = await worker.fetch("http://load.test/api/bus-entries");
  assert.equal(warmStats.status, 200);
  assert.equal(warmStats.headers.get("x-bus-cache"), "hit");
  const warmSeat5 = await worker.fetch("http://load.test/api/bus-entries?seat=5");
  assert.equal(warmSeat5.status, 200);

  const stormSignups = await Promise.all(
    Array.from({ length: 15 }, (_, idx) =>
      worker.fetch("http://load.test/api/bus-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "198.51.100.123",
          "CF-Ray": `test-ray-${idx}`,
        },
        body: JSON.stringify({ visitorId: `storm-visitor-${idx}`, displayName: `StormNakama_${idx}` }),
      })),
  );
  assert(stormSignups.every((r) => r.status === 200));
  const afterStormStats = await worker.fetch("http://load.test/api/bus-entries");
  assert.equal(afterStormStats.status, 200);
  assert.equal(afterStormStats.headers.get("x-bus-cache"), "hit", "Production signups must not flush global read caches.");

  const edgeDelSeat5 = await worker.fetch("http://load.test/api/bus-entries", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${moderationToken}`,
      "CF-Connecting-IP": "198.51.100.1",
      "CF-Ray": "test-ray-delete-5",
    },
    body: JSON.stringify({ seatIndex: 5 }),
  });
  assert.equal(edgeDelSeat5.status, 200);
  const checkSeat5AfterDel = await worker.fetch("http://load.test/api/bus-entries?seat=5");
  assert.equal(checkSeat5AfterDel.status, 404, "Deleting a specific seat must immediately invalidate ?seat=N.");

  await worker.fetch("http://load.test/__expire-cache");
  await worker.fetch("http://load.test/__fail-db-stats");
  const resilientRes = await worker.fetch("http://load.test/api/bus-entries");
  assert.equal(resilientRes.status, 200, "Expired cache must fall back to stale-on-error instead of 503 if D1 fails.");
  assert.equal(resilientRes.headers.get("x-bus-cache"), "stale-on-error");
  await worker.fetch("http://load.test/__restore-db");

  // 6. Flood bot au-delà du quota visiteur -> 429 avec Retry-After ET court-circuit 0 requête D1.
  const floodResults = await Promise.all(
    Array.from({ length: 38 }, (_, idx) =>
      worker.fetch("http://load.test/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.9" },
        body: JSON.stringify({ visitorId: "bot-same-visitor", displayName: `BotUser_${idx}` }),
      })),
  );
  const blocked = floodResults.filter((r) => r.status === 429);
  assert(blocked.length >= 6, `Bot flood must hit 429 rate limiting cleanly, got ${blocked.length}.`);
  assert(blocked.every((r) => Number(r.headers.get("retry-after")) > 0));

  await worker.fetch("http://load.test/__reset-db-count");
  const zeroD1Spam = await Promise.all(
    Array.from({ length: 10 }, (_, idx) =>
      worker.fetch("http://load.test/api/bus-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.9" },
        body: JSON.stringify({ visitorId: "bot-same-visitor", displayName: `BotSpam_${idx}`, updateOnly: true }),
      })),
  );
  assert(zeroD1Spam.every((r) => r.status === 429), "Already-blocked bot updateOnly spam must stay 429.");
  const zeroD1Count = await (await worker.fetch("http://load.test/__get-db-count")).json();
  assert.equal(zeroD1Count.count, 0, `Blocked bots must execute 0 D1 queries, got ${zeroD1Count.count}.`);

  // 7. Edge fast-path (worker-edge-cache.mjs) avant SSR Next.js dans Miniflare.
  const edgeWorker = await runtime.getWorker("edge");
  const cfHeaders = { "CF-Connecting-IP": "203.0.113.10" };

  const htmlMiss = await edgeWorker.fetch("https://lesfousdubus.sbs/?utm_source=yt&row=42", { headers: cfHeaders });
  assert.equal(htmlMiss.status, 200);
  assert.equal(htmlMiss.headers.get("x-bus-edge-cache"), "miss");
  assert(htmlMiss.headers.get("cache-control")?.includes("s-maxage=300"));
  await htmlMiss.text();

  const htmlHit = await edgeWorker.fetch("https://lesfousdubus.sbs/", { headers: cfHeaders });
  assert.equal(htmlHit.status, 200);
  assert.equal(htmlHit.headers.get("x-bus-edge-cache"), "hit");
  await htmlHit.text();
  assert.equal((await (await edgeWorker.fetch("https://lesfousdubus.sbs/__upstream-count")).json()).count, 1);

  const rscBypass = await edgeWorker.fetch("https://lesfousdubus.sbs/", {
    headers: { ...cfHeaders, "RSC": "1" },
  });
  assert.equal(rscBypass.status, 200);
  await rscBypass.text();
  assert.equal((await (await edgeWorker.fetch("https://lesfousdubus.sbs/__upstream-count")).json()).count, 2);

  const visitorRes1 = await edgeWorker.fetch("https://lesfousdubus.sbs/api/bus-entries?visitorId=edge-visitor-12345", { headers: cfHeaders });
  assert.equal(visitorRes1.status, 200);
  const visitorRes2 = await edgeWorker.fetch("https://lesfousdubus.sbs/api/bus-entries?visitorId=edge-visitor-12345", { headers: cfHeaders });
  assert.equal(visitorRes2.status, 200);
  assert.equal((await (await edgeWorker.fetch("https://lesfousdubus.sbs/__upstream-count")).json()).count, 4, "Private visitorId requests must never hit shared edge cache.");

  const apiMiss = await edgeWorker.fetch("https://lesfousdubus.sbs/api/bus-entries", { headers: cfHeaders });
  assert.equal(apiMiss.status, 200);
  await apiMiss.json();
  const apiHit = await edgeWorker.fetch("https://lesfousdubus.sbs/api/bus-entries", { headers: cfHeaders });
  assert.equal(apiHit.status, 200);
  assert.equal(apiHit.headers.get("x-bus-edge-cache"), "hit");
  await apiHit.json();
  assert.equal((await (await edgeWorker.fetch("https://lesfousdubus.sbs/__upstream-count")).json()).count, 5);

  const redirectRes = await edgeWorker.fetch("http://lesfousdubus.sbs/api/bus-entries", { redirect: "manual" });
  assert.equal(redirectRes.status, 308);
  assert.equal(redirectRes.headers.get("location"), "https://lesfousdubus.sbs/api/bus-entries");

  // 8. Compatibilité D1 sans migration 0010 (sans table bus_vacant_seat_ranges) : POST réussit en 200.
  const pre0010Db = await runtime.getD1Database("DB_BUS", "pre0010");
  for (const file of migrationFiles.filter((name) => name < "0010_")) {
    for (const sql of splitSqlQuery(readFileSync(join("migrations", file), "utf8"))) {
      await pre0010Db.prepare(sql).run();
    }
  }
  const pre0010Worker = await runtime.getWorker("pre0010");
  await pre0010Worker.fetch("http://pre0010.test/__restore-db");
  const pre0010Join1 = await pre0010Worker.fetch("http://pre0010.test/api/bus-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.88" },
    body: JSON.stringify({ visitorId: "pre0010-visitor-1", displayName: "Pre0010_One" }),
  });
  assert.equal(pre0010Join1.status, 200, "POST must succeed without 503 even before migration 0010 is applied.");
  const pre0010Data1 = await pre0010Join1.json();
  assert.equal(pre0010Data1.seatIndex, 0);
  const pre0010Join2 = await pre0010Worker.fetch("http://pre0010.test/api/bus-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.88" },
    body: JSON.stringify({ visitorId: "pre0010-visitor-2", displayName: "Pre0010_Two" }),
  });
  assert.equal(pre0010Join2.status, 200, "Second POST must also succeed before migration 0010.");
  const pre0010Data2 = await pre0010Join2.json();
  assert.equal(pre0010Data2.seatIndex, 1);

  console.log("Load resilience & edge fast-path checks passed: SQL indexes, O(1) seats, write-storm shield, edge HTML/API cache, 0-D1 bot rejection, and stale fallback.");
} finally {
  await runtime?.dispose();
  rmSync(directory, { recursive: true, force: true });
}
