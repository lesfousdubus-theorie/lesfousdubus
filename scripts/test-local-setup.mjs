import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setupLocalSecrets } from "./setup-local.mjs";

const directory = mkdtempSync(join(tmpdir(), "fdb-local-setup-"));
try {
  const path = join(directory, ".dev.vars");
  const parse = () => Object.fromEntries(readFileSync(path, "utf8").trim().split(/\r?\n/).filter(line => !line.startsWith("#")).map(line => line.split("=")));
  assert.equal(setupLocalSecrets(path).changed, true);
  const initial = readFileSync(path, "utf8");
  assert.equal(parse().RATE_LIMIT_SECRET.length, 64);
  assert.equal(parse().MODERATION_TOKEN.length, 64);
  assert.notEqual(parse().MODERATION_TOKEN, parse().RATE_LIMIT_SECRET);
  assert.equal(setupLocalSecrets(path).changed, false);
  assert.equal(readFileSync(path, "utf8"), initial);
  writeFileSync(path, `# Keep this setting\nUNRELATED=unchanged\nRATE_LIMIT_SECRET='${parse().RATE_LIMIT_SECRET}'\nMODERATION_TOKEN=short\n`);
  const quota = parse().RATE_LIMIT_SECRET;
  setupLocalSecrets(path);
  assert.equal(parse().UNRELATED, "unchanged");
  assert.equal(parse().RATE_LIMIT_SECRET, quota);
  assert.equal(parse().MODERATION_TOKEN.length, 64);
  assert(readFileSync(path, "utf8").includes("# Keep this setting"));
  const reused = "a".repeat(64);
  writeFileSync(path, `RATE_LIMIT_SECRET=${reused}\nMODERATION_TOKEN=${reused}\n`);
  setupLocalSecrets(path);
  assert.equal(parse().RATE_LIMIT_SECRET, reused);
  assert.notEqual(parse().MODERATION_TOKEN, reused);
  writeFileSync(path, `RATE_LIMIT_SECRET=\r\nMODERATION_TOKEN=${reused}\r\n`);
  setupLocalSecrets(path);
  assert.equal(parse().RATE_LIMIT_SECRET.length, 64, "An empty quota line must not consume the following moderation setting.");
  assert.equal(parse().MODERATION_TOKEN, reused);
  if (process.platform !== "win32") assert.equal(statSync(path).mode & 0o777, 0o600);
  console.log("Local setup passed: distinct secrets, preserved settings, idempotency and private permissions in a temporary file.");
} finally { rmSync(directory, { recursive: true, force: true }); }
