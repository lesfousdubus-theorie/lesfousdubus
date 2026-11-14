import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { setMaxListeners } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { cpus, platform, release, tmpdir, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";
import { convertV4MiniflareOptions, Log, LogLevel, Miniflare } from "miniflare";
import { unstable_splitSqlQuery as splitSqlQuery } from "wrangler";

// This runner cannot target an existing server. It creates its own loopback
// Worker and D1, never reads wrangler.jsonc/.dev.vars, and denies outbound fetch.
const outputDirectory = resolve(process.env.BUS_LOAD_OUTPUT ?? join(tmpdir(), `fdb-api-load-report-${Date.now()}`));
const temporaryDirectory = mkdtempSync(join(tmpdir(), "fdb-api-load-isolated-"));
const abortController = new AbortController();
setMaxListeners(1_024, abortController.signal);
const report = {
  startedAt: new Date().toISOString(),
  runtime: "Miniflare/workerd local HTTP + isolated SQLite D1",
  node: process.version,
  miniflare: JSON.parse(readFileSync("node_modules/miniflare/package.json", "utf8")).version,
  machine: { platform: platform(), release: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryGiB: +(totalmem() / 1024 ** 3).toFixed(2) },
  gitCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  cache: "No CDN/browser cache: every request reaches the API and D1. Cache-Control response headers remain unchanged.",
  scenarios: [],
  assertions: [],
  cleanup: {},
};
let runtime;
let baseUrl;
let scenarioNumber = 0;
let failure;

function onInterrupt() { abortController.abort(new Error("Benchmark interrupted")); }
process.once("SIGINT", onInterrupt);
process.once("SIGTERM", onInterrupt);
const watchdog = setTimeout(() => abortController.abort(new Error("Benchmark exceeded five minutes")), 300_000);
watchdog.unref();

const percentile = (values, fraction) => values[Math.max(0, Math.ceil(values.length * fraction) - 1)] ?? 0;
const round = value => +value.toFixed(2);

function summary(samples) {
  const sorted = samples.map(sample => sample.durationMs).sort((a, b) => a - b);
  const statuses = {};
  for (const sample of samples) statuses[sample.status] = (statuses[sample.status] ?? 0) + 1;
  return {
    requests: samples.length,
    statuses,
    latencyMs: { p50: round(percentile(sorted, .5)), p95: round(percentile(sorted, .95)), p99: round(percentile(sorted, .99)), max: round(sorted.at(-1) ?? 0) },
    errorExamples: samples.filter(sample => sample.status === 0 || sample.status >= 500).slice(0, 5),
  };
}

async function request(path, { method = "GET", body, address = "198.51.100.1" } = {}) {
  abortController.signal.throwIfAborted();
  assert(baseUrl?.hostname === "127.0.0.1", "Only the isolated loopback Worker is allowed.");
  assert(path.startsWith("/") && !path.startsWith("//"), "A relative API path is required.");
  const started = performance.now();
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method,
      redirect: "error",
      headers: { "CF-Connecting-IP": address, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.any([abortController.signal, AbortSignal.timeout(30_000)]),
    });
    const data = await response.json();
    return { path, status: response.status, durationMs: performance.now() - started, data, cacheControl: response.headers.get("cache-control"), retryAfter: response.headers.get("retry-after") };
  } catch (error) {
    if (abortController.signal.aborted) throw error;
    return { path, status: 0, durationMs: performance.now() - started, error: String(error) };
  }
}

async function scenario(name, count, concurrency, action, expected = sample => sample.status === 200) {
  const index = ++scenarioNumber;
  const samples = new Array(count);
  let next = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: Math.min(count, concurrency) }, async () => {
    while (next < count) {
      const item = next++;
      abortController.signal.throwIfAborted();
      samples[item] = await action(item, index);
    }
  }));
  const elapsedMs = performance.now() - started;
  const routes = {};
  for (const sample of samples) {
    const route = sample.path.split("?", 1)[0];
    (routes[route] ??= []).push(sample);
  }
  const result = {
    name, concurrency, elapsedMs: round(elapsedMs), requestsPerSecond: round(count * 1000 / elapsedMs),
    ...summary(samples), byRoute: Object.fromEntries(Object.entries(routes).map(([key, value]) => [key, summary(value)])),
    unexpected: samples.filter(sample => !expected(sample)).slice(0, 10),
  };
  report.scenarios.push(result);
  console.log(`${name}: ${count} requests, ${round(elapsedMs)} ms, ${result.requestsPerSecond} req/s, p95 ${result.latencyMs.p95} ms, statuses ${JSON.stringify(result.statuses)}`);
  assert.equal(result.unexpected.length, 0, `${name}: unexpected API responses`);
  return samples;
}

function syntheticAddress(index, network = 203) {
  return `${network}.0.${Math.floor(index / 250)}.${index % 250 + 1}`;
}

async function integrity(database, label, expectedCount) {
  const row = await database.prepare(`SELECT COUNT(*) AS actual_count, COUNT(DISTINCT seat_index) AS unique_seats,
    MIN(seat_index) AS first_seat, MAX(seat_index) AS last_seat,
    (SELECT passenger_count FROM bus_stats WHERE id = 1) AS stats_count,
    (SELECT seat_capacity FROM bus_stats WHERE id = 1) AS capacity
    FROM bus_entries`).first();
  const vacant = await database.prepare("SELECT start_index, end_index FROM bus_vacant_seat_ranges ORDER BY start_index").all();
  assert.equal(row.actual_count, expectedCount);
  assert.equal(row.stats_count, expectedCount);
  assert.equal(row.unique_seats, expectedCount);
  assert(row.first_seat >= 0);
  assert.equal(row.capacity, row.last_seat + 1);
  let previousEnd = -1;
  let vacantCount = 0;
  for (const range of vacant.results) {
    assert(range.start_index > previousEnd && range.end_index >= range.start_index);
    assert(range.end_index < row.capacity);
    previousEnd = range.end_index;
    vacantCount += range.end_index - range.start_index + 1;
  }
  assert.equal(vacantCount, row.capacity - expectedCount, "Every unoccupied seat must be tracked exactly once.");
  const overlap = await database.prepare(`SELECT COUNT(*) AS occupied_vacancies FROM bus_entries AS entries
    JOIN bus_vacant_seat_ranges AS vacant ON entries.seat_index BETWEEN vacant.start_index AND vacant.end_index`).first();
  assert.equal(overlap.occupied_vacancies, 0);
  report.assertions.push({ label, ...row, vacantRanges: vacant.results });
}

try {
  const worker = await build({
    stdin: {
      contents: `import * as entries from './src/app/api/bus-entries/route.ts';
        import {GET as health} from './src/app/api/health/route.ts';
        export default { async fetch(request, env) {
          globalThis.__loadTestEnv = env;
          const path = new URL(request.url).pathname;
          if (path === '/__load-test/address') return Response.json({address: request.headers.get('cf-connecting-ip')});
          if (path === '/api/health') return health(request);
          if (path !== '/api/bus-entries') return new Response('Not found', {status:404});
          const handler = entries[request.method];
          return handler ? handler(request) : new Response('Method not allowed', {status:405});
        }};`,
      resolveDir: process.cwd(), sourcefile: "isolated-load-worker.mjs",
    },
    bundle: true, format: "esm", platform: "browser", target: "es2022", write: false, metafile: true,
    plugins: [{ name: "isolated-cloudflare-context", setup(builder) {
      builder.onResolve({ filter: /^@opennextjs\/cloudflare$/ }, () => ({ path: "context", namespace: "load-test" }));
      builder.onLoad({ filter: /.*/, namespace: "load-test" }, () => ({ contents: "export const getCloudflareContext = () => ({env: globalThis.__loadTestEnv});" }));
    } }],
    logLevel: "silent",
  });
  report.apiSourceSha256 = createHash("sha256").update(worker.outputFiles[0].text).digest("hex");
  report.bundledSources = Object.keys(worker.metafile.inputs).filter(path => path.startsWith("src/"));
  runtime = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: worker.outputFiles[0].text, host: "127.0.0.1", port: 0,
    compatibilityDate: "2026-09-03", compatibilityFlags: ["nodejs_compat"],
    bindings: { RATE_LIMIT_SECRET: randomUUID() + randomUUID() },
    d1Databases: { DB_BUS: `isolated-load-${randomUUID()}` },
    resourcePersistencePath: join(temporaryDirectory, "state"),
    cf: false, telemetry: { enabled: false },
    outboundService() { throw new Error("Outbound network is disabled for the isolated load test."); },
    log: new Log(LogLevel.ERROR),
  }));
  baseUrl = await runtime.ready;
  assert.equal(baseUrl.hostname, "127.0.0.1");
  const database = await runtime.getD1Database("DB_BUS");
  report.migrations = readdirSync("migrations").filter(name => name.endsWith(".sql")).sort();
  for (const migration of report.migrations) {
    for (const sql of splitSqlQuery(readFileSync(join("migrations", migration), "utf8"))) await database.prepare(sql).run();
  }
  const addressProbe = await request("/__load-test/address", { address: "198.51.100.99" });
  assert.equal(addressProbe.data.address, "198.51.100.99", "The HTTP runtime must preserve synthetic addresses so real rate limiting stays enabled.");
  const health = await request("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.data.ok, true);
  const initial = await request("/api/bus-entries");
  assert.equal(initial.data.count, 0, "The dedicated database must start empty.");
  report.readCacheControl = initial.cacheControl;

  const seedCount = 1_000;
  for (let offset = 0; offset < seedCount; offset += 100) {
    await database.batch(Array.from({ length: Math.min(100, seedCount - offset) }, (_, index) => {
      const seat = offset + index;
      return database.prepare("INSERT INTO bus_entries(visitor_id, seat_index, display_name, comment) VALUES (?, ?, ?, ?)")
        .bind(`load-seed-${seat}`, seat, `Nakama ${seat}`, `Message de test ${seat}`);
    }));
  }
  await integrity(database, "seeded-fixture", seedCount);
  await scenario("warmup", 30, 10, () => request("/api/bus-entries"));
  for (const concurrency of [50, 200, 500]) {
    await scenario(`reads-concurrency-${concurrency}`, 1_000, concurrency, index => {
      const paths = ["/api/bus-entries", "/api/bus-entries?profiles=1&from=0&limit=48", "/api/bus-entries", "/api/bus-entries?manifest=1&from=0&limit=60", `/api/bus-entries?seat=${index % seedCount}`];
      return request(paths[index % paths.length]);
    });
  }
  let expectedCount = seedCount;
  const joins = await scenario("new-passengers-500", 500, 200, index => request("/api/bus-entries", {
    method: "POST", address: syntheticAddress(index), body: { visitorId: `load-join-${index}`, displayName: `Nakama test ${index}` },
  }));
  expectedCount += joins.filter(sample => sample.data.added).length;
  assert.equal(expectedCount, seedCount + 500);
  assert.equal(new Set(joins.map(sample => sample.data.seatIndex)).size, 500, "Concurrent joins must allocate unique seats.");
  await integrity(database, "after-concurrent-joins", expectedCount);
  await scenario("same-visitor-concurrent-retries", 100, 100, index => request("/api/bus-entries", {
    method: "POST", address: syntheticAddress(index, 192), body: { visitorId: "load-idempotent-visitor" },
  }));
  expectedCount++;
  await integrity(database, "idempotent-retry-one-seat", expectedCount);

  let mixedJoins = 0;
  await scenario("mixed-reads-profiles-joins", 1_000, 200, async index => {
    if (index % 10 === 0) {
      const sample = await request("/api/bus-entries", { method: "POST", address: syntheticAddress(index, 198), body: { visitorId: `load-mixed-${index}` } });
      if (sample.data?.added) mixedJoins++;
      return sample;
    }
    if (index % 10 === 1) return request("/api/bus-entries", { method: "POST", address: syntheticAddress(index, 198), body: { visitorId: `load-seed-${index % seedCount}`, comment: `Message modifie ${index}` } });
    return request(index % 4 === 0 ? "/api/bus-entries?profiles=1&from=440&limit=48" : "/api/bus-entries");
  });
  expectedCount += mixedJoins;
  await integrity(database, "after-mixed-load", expectedCount);

  const pollStart = performance.now();
  const pollingSamples = await scenario("500-visitors-two-polls-10s", 1_000, 500, async index => {
    const due = pollStart + index * 20;
    const delay = Math.max(0, due - performance.now());
    if (delay) await new Promise((resolveDelay, rejectDelay) => {
      const timer = setTimeout(() => {
        abortController.signal.removeEventListener("abort", cancel);
        resolveDelay();
      }, delay);
      const cancel = () => { clearTimeout(timer); rejectDelay(abortController.signal.reason); };
      abortController.signal.addEventListener("abort", cancel, { once: true });
      timer.unref();
    });
    return request("/api/bus-entries");
  });
  report.polling = { visitors: 500, intervalSeconds: 10, scheduledRequestsPerSecond: 50, observedRequests: pollingSamples.length, includesWaitInLatency: false };

  const quota = await scenario("shared-ip-join-quota", 130, 50, index => request("/api/bus-entries", {
    method: "POST", address: "198.51.100.240", body: { visitorId: `load-quota-${index}` },
  }), sample => sample.status === 200 || sample.status === 429);
  const accepted = quota.filter(sample => sample.status === 200);
  const rejected = quota.filter(sample => sample.status === 429);
  assert.equal(accepted.length, 120);
  assert.equal(rejected.length, 10);
  assert(rejected.every(sample => Number(sample.retryAfter) > 0));
  expectedCount += accepted.length;
  await integrity(database, "quota-120-accepted-10-rejected", expectedCount);

  const departed = await scenario("leave-100-concurrent", 100, 100, index => request("/api/bus-entries", {
    method: "DELETE", address: syntheticAddress(index, 197), body: { visitorId: `load-seed-${index * 2}` },
  }));
  assert(departed.every(sample => sample.data.removed));
  expectedCount -= 100;
  await integrity(database, "after-concurrent-leaves", expectedCount);
  const reused = await scenario("reuse-100-vacancies-concurrent", 100, 100, index => request("/api/bus-entries", {
    method: "POST", address: syntheticAddress(index, 196), body: { visitorId: `load-reuse-${index}` },
  }));
  assert.deepEqual(reused.map(sample => sample.data.seatIndex).sort((a, b) => a - b), Array.from({ length: 100 }, (_, index) => index * 2));
  expectedCount += 100;
  await integrity(database, "vacancies-reused-without-collisions", expectedCount);
  const finalHealth = await request("/api/health");
  assert.equal(finalHealth.status, 200);
  report.ok = true;
} catch (error) {
  failure = error;
  report.ok = false;
  report.failure = String(error.stack ?? error);
} finally {
  clearTimeout(watchdog);
  process.removeListener("SIGINT", onInterrupt);
  process.removeListener("SIGTERM", onInterrupt);
  try {
    await runtime?.dispose();
    report.cleanup.runtimeDisposed = true;
  } catch (error) {
    report.cleanup.runtimeDisposeError = String(error);
    report.ok = false;
    failure ??= error;
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
  report.cleanup.temporaryDatabaseRemoved = !existsSync(temporaryDirectory);
  report.finishedAt = new Date().toISOString();
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "server-load.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`Report: ${join(outputDirectory, "server-load.json")}`);
}
if (failure) throw failure;
