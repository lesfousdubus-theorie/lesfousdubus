import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents: 'export * from "./src/lib/bus-shortcuts"; export { getPassengerReportHref } from "./src/components/modals/PassengerCard";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { shouldIgnoreBusShortcut, isBrowserZoomWheel, getPassengerReportHref } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`,
);

const key = { key: "+", ctrlKey: false, metaKey: false, altKey: false, repeat: false, isComposing: false, defaultPrevented: false };
assert.equal(shouldIgnoreBusShortcut(key, null, false), false);
for (const flag of ["ctrlKey", "metaKey", "altKey", "repeat", "isComposing", "defaultPrevented"]) {
  for (const command of ["+", "-", "ArrowLeft", "h", "b", "q"]) {
    assert.equal(shouldIgnoreBusShortcut({ ...key, key: command, [flag]: true }, null, false), true,
      `${flag} must leave ${command} to the browser or focused control.`);
  }
}
for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
  assert.equal(shouldIgnoreBusShortcut(key, { tagName }, false), true);
}
assert.equal(shouldIgnoreBusShortcut(key, { tagName: "SPAN", isContentEditable: true }, false), true);
assert.equal(shouldIgnoreBusShortcut(key, null, true), true);
assert.equal(shouldIgnoreBusShortcut(key, { tagName: "BUTTON" }, false), false);
for (const letter of ["h", "H", "l", "L", "b", "B", "q", "Q", "a", "A", "d", "D"]) {
  assert.equal(shouldIgnoreBusShortcut({ ...key, key: letter }, null, false, false), true,
    `The disabled letter-shortcut preference must block ${letter}.`);
  assert.equal(shouldIgnoreBusShortcut({ ...key, key: letter }, null, false, true), false);
}
for (const command of ["+", "-", "=", "_", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
  assert.equal(shouldIgnoreBusShortcut({ ...key, key: command }, null, false, false), false,
    `Disabling letters must preserve ${command}.`);
}
assert.equal(isBrowserZoomWheel({ ctrlKey: false, metaKey: false }), false);
assert.equal(isBrowserZoomWheel({ ctrlKey: true, metaKey: false }), true);
assert.equal(isBrowserZoomWheel({ ctrlKey: false, metaKey: true }), true);

const report = new URL(getPassengerReportHref({ seatIndex: 7, displayName: "Kirito & ami #1", comment: "Salut ! Équipage" }));
assert.equal(report.searchParams.get("subject"), "Signalement passager #7");
const body = report.searchParams.get("body");
assert(body.includes("Bonjour,\r\n\r\nJe souhaite signaler"));
assert(body.includes("Nom : Kirito & ami #1\r\nMessage : Salut ! Équipage"));
assert(body.endsWith("Motif du signalement :\r\n"));
assert(!body.includes("\\n"), "The message must contain real line breaks, never escaped text.");
assert.equal(new URL(getPassengerReportHref({ seatIndex: 0, displayName: "Anonyme", comment: null })).searchParams.get("body").includes("Message : aucun"), true);

console.log("Bus shortcut boundaries, letter preference and report email line breaks passed.");
