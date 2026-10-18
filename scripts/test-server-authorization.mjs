import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { convertV4MiniflareOptions, Log, LogLevel, Miniflare } from "miniflare";
import { unstable_splitSqlQuery as splitSqlQuery } from "wrangler";

/** Actual route handlers and D1 migrations; no production URL or environment files. */
export async function runServerAuthorizationChecks() {
  const directory = mkdtempSync(join(tmpdir(), "fdb-auth-test-"));
  const quotaSecret = randomUUID() + randomUUID();
  const moderationToken = randomUUID() + randomUUID();
  const configurations = [
    { name: "enabled", token: moderationToken },
    { name: "missing" },
    { name: "weak", token: "short-token" },
    { name: "reused", token: quotaSecret },
  ];
  let runtime;
  try {
    const compiled = await build({
      stdin: {
        contents: `import * as entries from './src/app/api/bus-entries/route.ts';
          import {GET as health} from './src/app/api/health/route.ts';
          export default {fetch(request,env) {
            globalThis.__authorizationTestEnv=env;
            const path=new URL(request.url).pathname;
            if(path==='/api/health')return health(request);
            if(path!=='/api/bus-entries')return new Response('Not found',{status:404});
            const handler=entries[request.method];
            return handler?handler(request):new Response('Method not allowed',{status:405});
          }};`,
        resolveDir: process.cwd(), sourcefile: "isolated-authorization-worker.mjs",
      },
      bundle: true, format: "esm", platform: "browser", target: "es2022", write: false, logLevel: "silent",
      plugins: [{ name: "isolated-authorization-context", setup(builder) {
        builder.onResolve({ filter: /^@opennextjs\/cloudflare$/ }, () => ({ path: "context", namespace: "authorization-test" }));
        builder.onLoad({ filter: /.*/, namespace: "authorization-test" }, () => ({ contents: "export const getCloudflareContext=()=>({env:globalThis.__authorizationTestEnv});" }));
      } }],
    });
    runtime = new Miniflare(convertV4MiniflareOptions({
      host: "127.0.0.1", port: 0, cf: false, telemetry: { enabled: false },
      resourcePersistencePath: join(directory, "state"), log: new Log(LogLevel.ERROR),
      workers: configurations.map(({ name, token }) => ({
        name, script: compiled.outputFiles[0].text, modules: true,
        compatibilityDate: "2026-09-03", compatibilityFlags: ["nodejs_compat"],
        bindings: { RATE_LIMIT_SECRET: quotaSecret, ...(token === undefined ? {} : { MODERATION_TOKEN: token }) },
        d1Databases: { DB_BUS: `auth-${name}-${randomUUID()}` },
        outboundService() { throw new Error("External network is disabled in authorization tests."); },
      })),
    }));
    await runtime.ready;
    const migrationFiles = readdirSync("migrations").filter(name => name.endsWith(".sql")).sort();
    for (const configuration of configurations) {
      const database = await runtime.getD1Database("DB_BUS", configuration.name);
      for (const file of migrationFiles) {
        for (const sql of splitSqlQuery(readFileSync(join("migrations", file), "utf8"))) await database.prepare(sql).run();
      }
      const worker = await runtime.getWorker(configuration.name);
      const request = async (method, body, token, address = "198.51.100.10") => {
        const response = await worker.fetch("http://isolated.test/api/bus-entries", {
          method,
          headers: { "Content-Type": "application/json", "CF-Connecting-IP": address, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
        return { status: response.status, data: await response.json(), retryAfter: response.headers.get("retry-after") };
      };
      const health = await worker.fetch("http://isolated.test/api/health");
      assert.equal(health.status, 200, `${configuration.name}: optional moderation must not break health`);
      const ownId = `auth-${configuration.name}-owner`;
      const targetId = `auth-${configuration.name}-target`;
      const own = await request("POST", { visitorId: ownId });
      const target = await request("POST", { visitorId: targetId });
      assert.equal(own.status, 200);
      assert.equal(target.status, 200);
      const targetSeat = target.data.seatIndex;
      for (const token of [undefined, quotaSecret, randomUUID() + randomUUID()]) {
        const result = await request("DELETE", { seatIndex: targetSeat, visitorId: ownId }, token);
        assert.equal(result.status, 403, `${configuration.name}: missing/wrong/quota credentials must never delete by seat`);
        assert.equal((await database.prepare("SELECT COUNT(*) AS count FROM bus_entries").first()).count, 2,
          "A rejected admin request must not fall back to its visitorId or delete the target.");
      }
      if (configuration.name === "enabled") {
        for (const seatIndex of ["1", null, false, -1, 0.5]) {
          assert.equal((await request("DELETE", { seatIndex }, moderationToken)).status, 400,
            "An authorized admin still needs a numeric, nonnegative integer seat.");
        }
        const removed = await request("DELETE", { seatIndex: targetSeat }, moderationToken);
        assert.equal(removed.status, 200);
        assert.equal(removed.data.removed, true);
        assert.equal(removed.data.seatIndex, targetSeat);
        const absent = await request("DELETE", { seatIndex: targetSeat }, moderationToken);
        assert.equal(absent.status, 200);
        assert.equal(absent.data.removed, false);
      } else {
        assert.equal((await request("DELETE", { seatIndex: targetSeat }, configuration.token ?? moderationToken)).status, 403,
          `${configuration.name}: missing/short/reused configuration disables administration`);
      }
      const removedOwn = await request("DELETE", { visitorId: ownId });
      assert.equal(removedOwn.status, 200, `${configuration.name}: personal deletion stays available`);
      assert.equal(removedOwn.data.removed, true);
      assert.equal(removedOwn.data.seatIndex, own.data.seatIndex);
      assert.equal((await database.prepare("SELECT COUNT(*) AS count FROM bus_entries").first()).count,
        configuration.name === "enabled" ? 0 : 1);
      if (configuration.name === "enabled") {
        for (let attempt = 0; attempt < 11; attempt++) assert.equal((await request("DELETE", { visitorId: ownId })).status, 200);
        const throttled = await request("DELETE", { visitorId: ownId });
        assert.equal(throttled.status, 429, "Personal deletion quota must remain twelve per hour.");
        assert(Number(throttled.retryAfter) > 0);
      }
      if (configuration.name === "missing") {
        const results = await Promise.all(Array.from({ length: 130 }, (_, index) => request("POST",
          { visitorId: `auth-quota-${index}` }, undefined, "198.51.100.240")));
        assert.equal(results.filter(result => result.status === 200).length, 120);
        const refusals = results.filter(result => result.status === 429);
        assert.equal(refusals.length, 10, "The shared-IP join quota must remain 120 per hour.");
        assert(refusals.every(result => Number(result.retryAfter) > 0));
      }
    }
    console.log("Server authorization integration passed: separate optional moderation token, denied quota key, personal deletion, health and unchanged quotas (workerd + four isolated D1 databases).");
  } finally {
    await runtime?.dispose();
    rmSync(directory, { recursive: true, force: true });
  }
}
