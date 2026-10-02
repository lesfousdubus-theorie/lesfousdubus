import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

// Monter les vrais composants et leurs hooks ; remplacer seulement le moteur
// WebGL, le chargement Next et le service YouTube. Aucun réseau ni passager D1.
const dom = new JSDOM('<main id="site-content"><div id="root"></div></main>', {
  url: "https://bus.test/?phase=inside&count=12",
  pretendToBeVisual: true,
});
for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "DOMException", "localStorage", "getComputedStyle"]) {
  globalThis[key] = key === "getComputedStyle" ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.HTMLElement.prototype.scrollIntoView = function () {};
// jsdom ne fait pas de mise en page. Cette géométrie minimale sert seulement à
// distinguer les panneaux masqués pour les tests de piège de focus.
window.HTMLElement.prototype.getClientRects = function () {
  return this.closest("[hidden]") ? [] : [{ width: 100, height: 44 }];
};
localStorage.setItem("fdb-help-seen", "true");
localStorage.setItem("fdb-seat-index", "2");

const sourceRoot = resolve("src");
const compiled = await build({
  stdin: {
    contents: `export {default as BusExperience} from "${sourceRoot}/components/BusExperience.tsx";
      export {default as Scene} from "${sourceRoot}/components/bus/Scene.tsx";
      export {players} from "@/lib/youtube-player";`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true, platform: "node", format: "cjs", write: false, jsx: "automatic",
  external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
  plugins: [{
    name: "ui-services",
    setup(plugin) {
      plugin.onResolve({ filter: /^\.\/bus\/Scene$/ }, () => ({ path: "scene-ready", namespace: "mock" }));
      plugin.onResolve({ filter: /^next\/dynamic$/ }, () => ({ path: "dynamic", namespace: "mock" }));
      plugin.onResolve({ filter: /youtube-player$/ }, () => ({ path: "youtube", namespace: "mock" }));
      plugin.onResolve({ filter: /^@react-three\/fiber$/ }, () => ({ path: "fiber", namespace: "mock" }));
      plugin.onResolve({ filter: /^\.\/(Bus|World|DayNight|Weather|CameraRig)$/ }, (args) => args.importer.endsWith("/Scene.tsx") ? { path: "empty", namespace: "mock" } : null);
      plugin.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
        loader: "tsx", resolveDir: process.cwd(),
        contents: path === "scene-ready" ? `import {useEffect} from 'react';
          export default function Scene(props) {
            useEffect(() => { props.onAvailabilityChange(true); }, [props.onAvailabilityChange]);
            return <div data-scene-paused={props.uiPaused} data-reset-view={props.resetViewToken} />;
          }` : path === "dynamic" ? `import TheoryModal from '${sourceRoot}/components/theory/TheoryModal.tsx'; export default () => TheoryModal;`
          : path === "youtube" ? `export const players = [];
            export const loadYouTubeIframeApi = async () => ({Player: class {
              constructor(mount, options) { this.options = options; this.pauses = 0; this.plays = 0; this.seeks = 0; this.destroyed = false; this.iframe = document.createElement('iframe'); mount.replaceWith(this.iframe); players.push(this); queueMicrotask(() => options.events.onReady({target: this})); }
              getIframe() { return this.iframe; } pauseVideo() { this.pauses++; } playVideo() { this.plays++; } seekTo() { this.seeks++; } destroy() { this.destroyed = true; }
            }});`
          : path === "fiber" ? `export function Canvas() { throw new Error('WebGL must not mount without support'); } export const useFrame = () => {}; export const useThree = () => ({});`
          : "export default () => null;",
      }));
    },
  }],
});
const require = createRequire(import.meta.url);
const appModule = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(require, appModule, appModule.exports);
const { BusExperience, Scene, players } = appModule.exports;
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const root = createRoot(document.getElementById("root"));
const settle = () => act(async () => { await new Promise((done) => setTimeout(done, 25)); });
const findButton = (text, scope = document) => [...scope.querySelectorAll("button")].find((button) => button.textContent.includes(text));
const click = async (button) => { assert(button, "Expected button is present"); await act(async () => button.click()); await settle(); };
const closeDialog = () => click(document.querySelector('[role="dialog"] button[aria-label="Fermer"]'));
const dialog = () => document.querySelector('[role="dialog"], [role="alertdialog"]');
const input = async (value) => {
  const field = document.querySelector("input, textarea");
  const prototype = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, value);
    field.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};
let snapshot = { count: 12, seatCapacity: 12, profileRevision: 1, vacantSeatRanges: [] };
let pendingMutation = null;
let writes = 0;
let failReads = false;
let mutationSignal = null;
globalThis.fetch = async (url, options = {}) => {
  if (options.method === "POST" || options.method === "DELETE") {
    writes++;
    mutationSignal = options.signal;
    return new Promise((done) => { pendingMutation = (status, body) => done(Response.json(body, { status })); });
  }
  if (failReads) return Response.json({ error: "Hors connexion" }, { status: 503 });
  return Response.json({ ...snapshot, passengers: [], hasMore: false, nextFrom: 0 });
};

try {
  await act(async () => root.render(createElement(BusExperience)));
  await settle();
  await click(findButton("Mon pseudo"));
  assert.equal(document.getElementById("join-bus-title").textContent, "Ajoute ton pseudo");
  assert(!findButton("Retirer mon pseudo"));
  await input("Nakama test");
  assert.equal(document.getElementById("join-bus-title").textContent, "Ajoute ton pseudo", "Typing must not switch add/edit mode");
  const form = dialog().querySelector("form");
  await act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  assert.equal(writes, 1, "Duplicate submissions must produce one request");
  assert.equal(dialog().getAttribute("aria-busy"), "true");
  assert(dialog().querySelector("input").disabled);
  await act(async () => dialog().dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  assert(dialog(), "Escape must not close a profile during save");
  await act(async () => dialog().parentElement.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true })));
  assert(dialog(), "Backdrop must not close a profile during save");
  await act(async () => {
    snapshot = { ...snapshot, profileRevision: 2 };
    pendingMutation(200, { ...snapshot, seatIndex: 2, passenger: { seatIndex: 2, displayName: "Nakama test", comment: null } });
  });
  await settle();
  assert.equal(dialog(), null);
  assert.equal(localStorage.getItem("fdb-display-name"), "Nakama test");
  await click(findButton("Mon pseudo"));
  assert.equal(document.getElementById("join-bus-title").textContent, "Modifie ton pseudo");
  assert(findButton("Retirer mon pseudo"));
  await input("Nouveau pseudo");
  await click(findButton("Enregistrer", dialog()));
  await act(async () => pendingMutation(503, { error: "Réessaie plus tard" }));
  assert.equal(dialog().querySelector("input").value, "Nouveau pseudo", "A failed save retains the draft");
  assert(!dialog().querySelector("input").disabled);
  assert.equal(dialog().querySelector('[role="alert"]').textContent, "Réessaie plus tard");
  assert.equal(localStorage.getItem("fdb-display-name"), "Nakama test");
  await closeDialog();
  await click(findButton("Mon pseudo"));
  await click(findButton("Retirer mon pseudo", dialog()));
  await act(async () => dialog().dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  assert(dialog(), "Removing a profile field must also block closing while pending");
  await act(async () => {
    snapshot = { ...snapshot, profileRevision: 3 };
    pendingMutation(200, { ...snapshot, seatIndex: 2, passenger: null });
  });
  assert.equal(localStorage.getItem("fdb-display-name"), null);
  assert.equal(localStorage.getItem("fdb-seat-index"), "2", "Removing a field keeps the seat");

  await click(findButton("La Théorie"));
  const panel = document.getElementById("theory-panel-thesis");
  const card = panel.querySelector('details[id]');
  card.open = true;
  panel.scrollTop = 720;
  await click(document.getElementById("theory-tab-faq"));
  await click(document.getElementById("theory-tab-thesis"));
  assert.equal(document.getElementById("theory-panel-thesis"), panel);
  assert.equal(panel.scrollTop, 720);
  assert(card.open, "Changing tabs preserves expanded cards");
  await closeDialog();
  assert.equal(document.querySelector('[data-scene-paused]').getAttribute("data-scene-paused"), "false");
  await click(findButton("La Théorie"));
  assert.equal(panel.scrollTop, 720);
  assert(card.open, "Reopening preserves expanded cards");
  await click(document.getElementById("theory-tab-video"));
  assert.equal(players.length, 1);
  const player = players[0];
  assert.equal(player.options.playerVars.autoplay, 0);
  assert.equal(player.plays, 0);
  assert.equal(player.seeks, 0);
  await click(document.getElementById("theory-tab-thesis"));
  assert(player.pauses > 0, "Leaving the video pauses playback");
  await click(document.getElementById("theory-tab-video"));
  assert.equal(players[0], player);
  assert.equal(players.length, 1, "Reopening does not recreate the player");
  const footerClose = findButton("Fermer", dialog());
  footerClose.focus();
  await act(async () => footerClose.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
  assert.equal(document.activeElement, dialog().querySelector('button[aria-label="Fermer"]'), "Tab wraps without visiting hidden panels");
  await closeDialog();
  assert(!player.destroyed, "Closing retains the independent video timeline");

  await click(findButton("Commandes"));
  await click(findButton("Nuit", dialog()));
  assert.equal(findButton("Nuit", dialog()).getAttribute("aria-pressed"), "true");
  await click(findButton("Auto", dialog()));
  assert.equal(findButton("Auto", dialog()).getAttribute("aria-pressed"), "true");
  await click(findButton("Couper le son", dialog()));
  assert.equal(localStorage.getItem("fdb-sound-muted"), "true");
  assert(findButton("Klaxonner", dialog()).disabled);
  await click(findButton("Supprimer ma place et mon profil", dialog()));
  assert.equal(dialog().getAttribute("role"), "alertdialog");
  assert.equal(document.activeElement, dialog(), "Confirmation receives focus");
  await click(findButton("Annuler", dialog()));
  assert.equal(dialog().getAttribute("role"), "dialog");
  await click(findButton("Recentrer la vue", dialog()));
  assert.equal(dialog(), null);
  assert.equal(document.querySelector('[data-reset-view]').getAttribute("data-reset-view"), "1");
  await click(findButton("Aide"));
  await click(findButton("C’est parti !", dialog()));

  failReads = true;
  await act(async () => window.dispatchEvent(new window.Event("focus")));
  await settle();
  assert(findButton("Réessayer"), "Polling failure must be visible");
  failReads = false;
  await click(findButton("Réessayer"));
  assert(!document.querySelector('button[title="Le compteur n’est plus à jour. Réessayer la synchronisation"]'));

  await click(findButton("Mon pseudo"));
  await input("Profil interrompu");
  await click(findButton("Enregistrer", dialog()));
  const interrupted = pendingMutation;

  // Tester la vraie détection WebGL et son secours, pas le stub de scène.
  window.HTMLCanvasElement.prototype.getContext = () => null;
  await act(async () => root.render(createElement(Scene, { phase: "outside", worldRef: { current: {} }, onArrived() {}, onReadTheory() {}, onReadVideo() {} })));
  assert(mutationSignal.aborted, "Unmounting cancels an in-flight profile request");
  await act(async () => interrupted(200, { ...snapshot, seatIndex: 2, passenger: null }));
  assert.equal(localStorage.getItem("fdb-display-name"), null, "A stale response must not update a closed profile");
  await settle();
  assert(findButton("Lire la théorie"));
  assert(findButton("Voir la vidéo"));
  assert(!document.querySelector("canvas"), "Unsupported WebGL must not mount the renderer");
  console.log("UI state regression checks passed (profile requests, reading, video, settings, sync, WebGL fallback).");
} finally {
  await act(async () => root.unmount());
  dom.window.close();
}
