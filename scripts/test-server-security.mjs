import assert from "node:assert/strict";
import { build } from "esbuild";

async function loadTsModule(entryPoint) {
  const compiled = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`;
  return import(moduleUrl);
}

const { cleanText } = await loadTsModule("src/lib/server/text.ts");
const { normalizeRateAddress } = await loadTsModule("src/lib/server/rate-address.ts");
const { findModerationIssue } = await loadTsModule("src/lib/server/moderation.ts");

// 1. Text cleaning & surrogate preservation
assert.equal(cleanText("  hello   world  ", 20), "hello world");
assert.equal(cleanText("test\u0000control\u001Fchars", 20), "test control chars");
// Emoji test: multi-byte emoji must not split surrogate pairs
const emojiString = "🏴‍☠️👒🍖 bus pirate";
const sliced = cleanText(emojiString, 4);
assert.equal(Array.from(sliced).length, 4);
assert.doesNotMatch(sliced, /[\uD800-\uDBFF]$/); // No trailing lone high surrogate

// 2. IPv6 /64 normalization
assert.equal(normalizeRateAddress("192.168.1.1"), "192.168.1.1");
assert.equal(normalizeRateAddress("::ffff:192.0.2.1"), "192.0.2.1");
assert.equal(
  normalizeRateAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334"),
  "2001:0db8:85a3:0000::/64",
);
assert.equal(
  normalizeRateAddress("2a01:cb08:8a4:e500:99c2:d34:21:4"),
  "2a01:cb08:08a4:e500::/64",
);

// 3. Moderation filter
assert.equal(findModerationIssue("Super théorie, vive Luffy !"), null);
assert.equal(findModerationIssue("Regardez https://example.com"), "link");
assert.equal(findModerationIssue("mon site: test.sbs"), "link");
assert.equal(findModerationIssue("contact@evil.com"), "link");
assert.equal(findModerationIssue("gros fdp va"), "language");
assert.equal(findModerationIssue("c.o.n.n.a.r.d"), "language");
// False positives must be allowed
assert.equal(findModerationIssue("Le pays de Wa et Drum"), null);
assert.equal(findModerationIssue("C'est technique."), null);
assert.equal(findModerationIssue("Trop bien. De plus, vive Oda."), null);

console.log("Server security & moderation unit tests passed.");
