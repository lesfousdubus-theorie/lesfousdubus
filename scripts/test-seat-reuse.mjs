import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const persistTo = mkdtempSync(join(tmpdir(), "fdb-d1-test-"));

function wrangler(args, { json = false } = {}) {
  const result = spawnSync(executable, ["wrangler", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || result.stdout || "Wrangler a échoué.");
  }
  if (!json) return null;
  const parsed = JSON.parse(result.stdout);
  return Array.isArray(parsed) ? parsed.flatMap((entry) => entry.results ?? []) : [];
}

function execute(sql) {
  return wrangler([
    "d1",
    "execute",
    "DB_BUS",
    "--local",
    "--persist-to",
    persistTo,
    "--command",
    sql,
    "--json",
  ], { json: true });
}

function addPassenger(visitorId) {
  execute(`INSERT INTO bus_entries (visitor_id, seat_index)
    VALUES ('${visitorId}', COALESCE(
      (SELECT start_index FROM bus_vacant_seat_ranges ORDER BY start_index ASC LIMIT 1),
      (SELECT COALESCE(MAX(seat_index) + 1, 0) FROM bus_entries)
    ))`);
}

try {
  wrangler([
    "d1",
    "migrations",
    "apply",
    "DB_BUS",
    "--local",
    "--persist-to",
    persistTo,
  ]);

  addPassenger("visitor-a");
  addPassenger("visitor-b");
  addPassenger("visitor-c");

  assert.deepEqual(execute("SELECT visitor_id, seat_index FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-a", seat_index: 0 },
    { visitor_id: "visitor-b", seat_index: 1 },
    { visitor_id: "visitor-c", seat_index: 2 },
  ]);

  execute("DELETE FROM bus_entries WHERE visitor_id = 'visitor-b'");
  assert.deepEqual(execute("SELECT start_index, end_index FROM bus_vacant_seat_ranges ORDER BY start_index"), [
    { start_index: 1, end_index: 1 },
  ]);

  addPassenger("visitor-d");
  assert.deepEqual(execute("SELECT visitor_id, seat_index FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-a", seat_index: 0 },
    { visitor_id: "visitor-d", seat_index: 1 },
    { visitor_id: "visitor-c", seat_index: 2 },
  ]);
  assert.deepEqual(execute("SELECT passenger_count, seat_capacity FROM bus_stats WHERE id = 1"), [
    { passenger_count: 3, seat_capacity: 3 },
  ]);
  assert.deepEqual(execute("SELECT start_index, end_index FROM bus_vacant_seat_ranges ORDER BY start_index"), []);

  console.log("D1 seat reuse test passed.");
} finally {
  rmSync(persistTo, { recursive: true, force: true });
}
