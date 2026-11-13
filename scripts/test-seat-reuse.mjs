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
    VALUES ('${visitorId}', (SELECT COALESCE(MAX(seat_index) + 1, 0) FROM bus_entries))`);
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

  assert.deepEqual(execute("SELECT visitor_id, seat_index, entry_number FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-a", seat_index: 0, entry_number: 1 },
    { visitor_id: "visitor-b", seat_index: 1, entry_number: 2 },
    { visitor_id: "visitor-c", seat_index: 2, entry_number: 3 },
  ]);

  // Le même UPSERT que l'API ne doit ignorer que le doublon visitor_id.
  execute(`INSERT INTO bus_entries (visitor_id, seat_index)
    VALUES ('visitor-a', 99)
    ON CONFLICT(visitor_id) DO NOTHING`);
  assert.throws(() => execute(`INSERT INTO bus_entries (visitor_id, seat_index)
    VALUES ('visitor-seat-collision', 0)
    ON CONFLICT(visitor_id) DO NOTHING`));

  // Suppression d'un passager : les suivants se décalent d'un siège, mais gardent leur numéro d'entrée.
  execute("DELETE FROM bus_entries WHERE visitor_id = 'visitor-b'");
  assert.deepEqual(execute("SELECT visitor_id, seat_index, entry_number FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-a", seat_index: 0, entry_number: 1 },
    { visitor_id: "visitor-c", seat_index: 1, entry_number: 3 },
  ]);
  assert.deepEqual(execute("SELECT passenger_count, seat_capacity, last_entry_number FROM bus_stats WHERE id = 1"), [
    { passenger_count: 2, seat_capacity: 2, last_entry_number: 3 },
  ]);

  // Un nouveau passager s'assoit au bout (siège 2) et reçoit le numéro suivant (4).
  addPassenger("visitor-d");
  assert.deepEqual(execute("SELECT visitor_id, seat_index, entry_number FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-a", seat_index: 0, entry_number: 1 },
    { visitor_id: "visitor-c", seat_index: 1, entry_number: 3 },
    { visitor_id: "visitor-d", seat_index: 2, entry_number: 4 },
  ]);
  assert.deepEqual(execute("SELECT passenger_count, seat_capacity, last_entry_number FROM bus_stats WHERE id = 1"), [
    { passenger_count: 3, seat_capacity: 3, last_entry_number: 4 },
  ]);

  // Suppression multiple : tous les sièges restants doivent rester contigus (0..count-1)
  // tout en conservant le numéro d'arrivée permanent de chaque passager restant.
  addPassenger("visitor-e");
  addPassenger("visitor-f");
  execute("DELETE FROM bus_entries WHERE visitor_id IN ('visitor-c', 'visitor-d', 'visitor-e')");
  assert.deepEqual(execute("SELECT visitor_id, seat_index, entry_number FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-a", seat_index: 0, entry_number: 1 },
    { visitor_id: "visitor-f", seat_index: 1, entry_number: 6 },
  ]);
  assert.deepEqual(execute("SELECT passenger_count, seat_capacity, last_entry_number FROM bus_stats WHERE id = 1"), [
    { passenger_count: 2, seat_capacity: 2, last_entry_number: 6 },
  ]);

  // Revenir après une suppression définitive attribue un nouveau numéro d'entrée.
  addPassenger("visitor-b");
  assert.deepEqual(execute("SELECT visitor_id, seat_index, entry_number FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-a", seat_index: 0, entry_number: 1 },
    { visitor_id: "visitor-f", seat_index: 1, entry_number: 6 },
    { visitor_id: "visitor-b", seat_index: 2, entry_number: 7 },
  ]);

  // Suppression multiple non contiguë par seat_index.
  addPassenger("visitor-g");
  addPassenger("visitor-h");
  // État actuel : (a,0,1), (f,1,6), (b,2,7), (g,3,8), (h,4,9)
  execute("DELETE FROM bus_entries WHERE seat_index IN (0, 2)");
  assert.deepEqual(execute("SELECT visitor_id, seat_index, entry_number FROM bus_entries ORDER BY seat_index"), [
    { visitor_id: "visitor-f", seat_index: 0, entry_number: 6 },
    { visitor_id: "visitor-g", seat_index: 1, entry_number: 8 },
    { visitor_id: "visitor-h", seat_index: 2, entry_number: 9 },
  ]);
  assert.deepEqual(execute("SELECT passenger_count, seat_capacity, last_entry_number FROM bus_stats WHERE id = 1"), [
    { passenger_count: 3, seat_capacity: 3, last_entry_number: 9 },
  ]);

  // Teste la migration progressive 0007 -> 0008 avec des trous existants et un
  // ordre de cle primaire (visitor_id) inverse par rapport a seat_index.
  const upgradePersistTo = mkdtempSync(join(tmpdir(), "fdb-d1-upgrade-"));
  const upgradeSqlDir = mkdtempSync(join(tmpdir(), "fdb-d1-migrations-"));
  try {
    const fs = await import("node:fs");
    for (const file of fs.readdirSync("migrations").filter((name) => name <= "0007_passenger_avatar.sql").sort()) {
      fs.copyFileSync(join("migrations", file), join(upgradeSqlDir, file));
    }
    const execUpgrade = (sql) => wrangler([
      "d1", "execute", "DB_BUS", "--local", "--persist-to", upgradePersistTo, "--command", sql, "--json",
    ], { json: true });

    const preFiles = fs.readdirSync(upgradeSqlDir).sort();
    for (const file of preFiles) {
      wrangler(["d1", "execute", "DB_BUS", "--local", "--persist-to", upgradePersistTo, "--file", join(upgradeSqlDir, file)]);
    }

    execUpgrade("INSERT INTO bus_entries (visitor_id, seat_index, display_name) VALUES ('visitor-z', 0, 'Zed')");
    execUpgrade("INSERT INTO bus_entries (visitor_id, seat_index, display_name) VALUES ('visitor-a', 2, 'Alpha')");
    execUpgrade("INSERT INTO bus_entries (visitor_id, seat_index, display_name) VALUES ('visitor-b', 5, 'Beta')");
    execUpgrade("UPDATE bus_stats SET seat_capacity = 6 WHERE id = 1");

    wrangler(["d1", "execute", "DB_BUS", "--local", "--persist-to", upgradePersistTo, "--file", "migrations/0008_compact_seats_and_entry_number.sql"]);

    assert.deepEqual(execUpgrade("SELECT visitor_id, seat_index, entry_number FROM bus_entries ORDER BY seat_index"), [
      { visitor_id: "visitor-z", seat_index: 0, entry_number: 1 },
      { visitor_id: "visitor-a", seat_index: 1, entry_number: 3 },
      { visitor_id: "visitor-b", seat_index: 2, entry_number: 6 },
    ]);
    assert.deepEqual(execUpgrade("SELECT passenger_count, seat_capacity, last_entry_number FROM bus_stats WHERE id = 1"), [
      { passenger_count: 3, seat_capacity: 3, last_entry_number: 6 },
    ]);
  } finally {
    rmSync(upgradePersistTo, { recursive: true, force: true });
    rmSync(upgradeSqlDir, { recursive: true, force: true });
  }

  console.log("D1 seat compaction and entry number test passed.");
} finally {
  rmSync(persistTo, { recursive: true, force: true });
}
