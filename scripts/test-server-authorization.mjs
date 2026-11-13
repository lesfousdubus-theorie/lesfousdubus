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
      if (configuration.name === "enabled") {
        const invalidVisitorLookup = await worker.fetch("http://isolated.test/api/bus-entries?visitorId=bad");
        assert.equal(invalidVisitorLookup.status, 400, "Invalid visitorId query must return 400.");
        assert.equal(invalidVisitorLookup.headers.get("cache-control"), "no-store, max-age=0");

        const missingVisitorLookup = await worker.fetch("http://isolated.test/api/bus-entries?visitorId=unregistered-visitor-12345");
        assert.equal(missingVisitorLookup.status, 200);
        assert.equal(missingVisitorLookup.headers.get("cache-control"), "no-store, max-age=0");
        const missingData = await missingVisitorLookup.json();
        assert.equal(missingData.registered, false);
        assert.equal(missingData.hasDisplayName, false);
        assert.equal(missingData.seatIndex, null);
        assert.equal(missingData.passenger, null);

        const anonymousLookup = await worker.fetch(`http://isolated.test/api/bus-entries?visitorId=${encodeURIComponent(ownId)}`);
        assert.equal(anonymousLookup.status, 200);
        assert.equal(anonymousLookup.headers.get("cache-control"), "no-store, max-age=0");
        const anonymousLookupData = await anonymousLookup.json();
        assert.equal(anonymousLookupData.registered, true);
        assert.equal(anonymousLookupData.hasDisplayName, false);
        assert.equal(anonymousLookupData.seatIndex, own.data.seatIndex);
        assert.deepEqual(anonymousLookupData.passenger, {
          seatIndex: own.data.seatIndex,
          displayName: "",
          comment: null,
          avatarId: null,
        });

        const named = await request("POST", { visitorId: ownId, displayName: "Nakama Test", comment: "Vive le bus !" });
        assert.equal(named.status, 200);
        const chosen = await request("POST", { visitorId: ownId, avatarId: "chopper" });
        assert.equal(chosen.status, 200);
        assert.equal(chosen.data.added, false, "Changing avatar must never add a visitor.");
        assert.equal(chosen.data.count, own.data.count + 1);
        assert.equal(chosen.data.seatIndex, own.data.seatIndex);
        assert.equal(chosen.data.passenger.avatarId, "chopper");
        assert.equal(chosen.data.passenger.displayName, "Nakama Test");
        assert.equal(chosen.data.passenger.comment, "Vive le bus !");
        assert(chosen.data.profileRevision > named.data.profileRevision, "Avatar changes invalidate nearby public profiles.");
        const namedLookup = await worker.fetch(`http://isolated.test/api/bus-entries?visitorId=${encodeURIComponent(ownId)}`);
        assert.equal(namedLookup.status, 200);
        const namedLookupData = await namedLookup.json();
        assert.equal(namedLookupData.registered, true);
        assert.equal(namedLookupData.hasDisplayName, true);
        assert.equal(namedLookupData.seatIndex, own.data.seatIndex);
        assert.deepEqual(namedLookupData.passenger, chosen.data.passenger);
        const revisited = await request("POST", { visitorId: ownId });
        assert.equal(revisited.data.added, false);
        assert.deepEqual(revisited.data.passenger, chosen.data.passenger, "The same browser identity restores its DB avatar on boarding.");
        const repeated = await request("POST", { visitorId: ownId, avatarId: "chopper" });
        assert.equal(repeated.data.profileRevision, chosen.data.profileRevision, "Saving the same avatar must not churn the revision.");
        for (const avatarId of ["unknown-avatar", "", null, 0, { id: "luffy" }]) {
          assert.equal((await request("POST", { visitorId: ownId, avatarId })).status, 400);
        }
        const unchanged = await request("POST", { visitorId: ownId });
        assert.deepEqual(unchanged.data.passenger, chosen.data.passenger);
        assert.equal(unchanged.data.profileRevision, chosen.data.profileRevision, "Invalid choices never mutate the DB.");
        for (const updateOnly of ["true", 1, null, {}]) {
          assert.equal((await request("POST", { visitorId: ownId, avatarId: "sanji", updateOnly })).status, 400);
        }
        const preboardUpdated = await request("POST", { visitorId: ownId, avatarId: "sanji", updateOnly: true });
        assert.equal(preboardUpdated.status, 200);
        assert.equal(preboardUpdated.data.added, false);
        assert.equal(preboardUpdated.data.count, own.data.count + 1);
        assert.equal(preboardUpdated.data.seatIndex, own.data.seatIndex);
        assert.equal(preboardUpdated.data.passenger.avatarId, "sanji");
        assert.equal(preboardUpdated.data.passenger.displayName, "Nakama Test");
        assert.equal(preboardUpdated.data.passenger.comment, "Vive le bus !");
        assert(preboardUpdated.data.profileRevision > chosen.data.profileRevision, "updateOnly avatar change advances public profile revision.");
        const ghostId = `auth-${configuration.name}-ghost`;
        const ghostUpdateOnly = await request("POST", { visitorId: ghostId, avatarId: "zoro", updateOnly: true });
        assert.equal(ghostUpdateOnly.status, 200);
        assert.equal(ghostUpdateOnly.data.added, false);
        assert.equal(ghostUpdateOnly.data.seatIndex, null);
        assert.equal(ghostUpdateOnly.data.passenger, null);
        assert.equal(ghostUpdateOnly.data.count, preboardUpdated.data.count);
        assert.equal(ghostUpdateOnly.data.profileRevision, preboardUpdated.data.profileRevision);
        assert.equal((await database.prepare("SELECT COUNT(*) AS count FROM bus_entries WHERE visitor_id = ?").bind(ghostId).first()).count, 0,
          "updateOnly must never insert an unregistered visitor.");
        const restoredChopper = await request("POST", { visitorId: ownId, avatarId: "chopper", updateOnly: true });
        assert.equal(restoredChopper.status, 200);
        assert.equal(restoredChopper.data.passenger.avatarId, "chopper");
        const anonymous = await request("POST", { visitorId: ownId, displayName: "", comment: "" });
        assert.equal(anonymous.data.passenger.avatarId, "chopper", "Removing text must preserve the chosen avatar.");
        const clearedLookup = await worker.fetch(`http://isolated.test/api/bus-entries?visitorId=${encodeURIComponent(ownId)}`);
        const clearedLookupData = await clearedLookup.json();
        assert.equal(clearedLookupData.registered, true);
        assert.equal(clearedLookupData.hasDisplayName, false);
        assert.equal(clearedLookupData.passenger.displayName, "");
        assert.equal(clearedLookupData.passenger.avatarId, "chopper");
        const profiles = await worker.fetch("http://isolated.test/api/bus-entries?profiles=1&from=0&limit=48");
        const ownProfile = (await profiles.json()).passengers.find(profile => profile.seatIndex === own.data.seatIndex);
        assert.equal(ownProfile.avatarId, "chopper", "An avatar-only profile must reach other visitors' renderers.");
        assert.equal(ownProfile.displayName, "", "An avatar choice must not add an anonymous name label.");
        await assert.rejects(database.prepare("UPDATE bus_entries SET avatar_id = 'not-in-roster' WHERE seat_index = ?").bind(own.data.seatIndex).run());
        const multilineComment = "Ligne 1 : pirate\n\nLigne 2 : nakama 🏴‍☠️";
        const multilinePost = await request("POST", {
          visitorId: ownId,
          comment: "  Ligne 1 : pirate  \r\n\r\n\r\n  Ligne 2 : nakama 🏴‍☠️  ",
        });
        assert.equal(multilinePost.status, 200);
        assert.equal(multilinePost.data.passenger.comment, multilineComment);
        const seatFetch = await worker.fetch(`http://isolated.test/api/bus-entries?seat=${own.data.seatIndex}`);
        assert.equal(seatFetch.status, 200);
        assert.equal((await seatFetch.json()).passenger.comment, multilineComment, "Multiline comment must persist and roundtrip through the database intact.");
      }
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
        const postDeleteLookup = await worker.fetch(`http://isolated.test/api/bus-entries?visitorId=${encodeURIComponent(ownId)}`);
        const postDeleteData = await postDeleteLookup.json();
        assert.equal(postDeleteData.registered, false);
        assert.equal(postDeleteData.hasDisplayName, false);
        assert.equal(postDeleteData.seatIndex, null);
        assert.equal(postDeleteData.passenger, null);
        const deletedPreboard = await request("POST", { visitorId: ownId, avatarId: "zoro", updateOnly: true });
        assert.equal(deletedPreboard.status, 200);
        assert.equal(deletedPreboard.data.added, false);
        assert.equal(deletedPreboard.data.seatIndex, null);
        assert.equal(deletedPreboard.data.passenger, null);
        assert.equal((await database.prepare("SELECT COUNT(*) AS count FROM bus_entries WHERE visitor_id = ?").bind(ownId).first()).count, 0,
          "Deleted visitor using updateOnly must not recreate a seat.");
        for (let attempt = 0; attempt < 11; attempt++) assert.equal((await request("DELETE", { visitorId: ownId })).status, 200);
        const throttled = await request("DELETE", { visitorId: ownId });
        assert.equal(throttled.status, 429, "Personal deletion quota must remain twelve per hour.");
        assert(Number(throttled.retryAfter) > 0);
        const concurrentCount = 10;
        const concurrentJoins = await Promise.all(
          Array.from({ length: concurrentCount }, (_, index) =>
            request(
              "POST",
              {
                visitorId: `auth-concurrent-${index}`,
                displayName: `Nakama ${index}`,
                comment: `Ligne A ${index}\n\nLigne B ${index}`,
              },
              undefined,
              "198.51.100.99",
            ),
          ),
        );
        assert.equal(concurrentJoins.length, concurrentCount);
        for (const res of concurrentJoins) {
          assert.equal(res.status, 200);
          assert.equal(res.data.added, true);
          assert(typeof res.data.seatIndex === "number");
        }
        const assignedSeats = concurrentJoins.map((res) => res.data.seatIndex).sort((a, b) => a - b);
        const uniqueSeats = new Set(assignedSeats);
        assert.equal(uniqueSeats.size, concurrentCount, "Concurrent joins must all receive distinct seats.");
        for (let i = 0; i < concurrentCount; i++) {
          assert.equal(assignedSeats[i], i, `Seat at index ${i} must be ${i} (reusing vacant then sequential)`);
        }
        const concurrentSeatFetch = await worker.fetch(`http://isolated.test/api/bus-entries?seat=${assignedSeats[0]}`);
        assert.equal(concurrentSeatFetch.status, 200);
        assert.match((await concurrentSeatFetch.json()).passenger.comment, /\n\nLigne B 0$/, "Concurrent passenger multiline comment must persist cleanly.");
        const quotaGhost = `auth-${configuration.name}-quota-ghost`;
        for (let attempt = 0; attempt < 7; attempt++) {
          const res = await request("POST", { visitorId: quotaGhost, avatarId: attempt % 2 ? "zoro" : "nami", updateOnly: true }, undefined, "198.51.100.77");
          assert.equal(res.status, 200, "Repeated updateOnly checks use the profile quota instead of burning the 6/h join quota.");
          assert.equal(res.data.seatIndex, null);
        }
        const quotaGhostJoin = await request("POST", { visitorId: quotaGhost, avatarId: "zoro" }, undefined, "198.51.100.77");
        assert.equal(quotaGhostJoin.status, 200);
        assert.equal(quotaGhostJoin.data.added, true);
        assert.equal(quotaGhostJoin.data.passenger.avatarId, "zoro");
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
    console.log("Server authorization integration passed: moderation, quotas, deletion, health, avatar persistence, stable seats, preserved text, anonymous avatars and rejected invalid choices (workerd + four isolated D1 databases).");
  } finally {
    await runtime?.dispose();
    rmSync(directory, { recursive: true, force: true });
  }
}
