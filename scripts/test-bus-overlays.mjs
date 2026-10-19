import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createCdp, evaluate, waitForJson, waitForPageCondition } from "./browser-helpers.mjs";
import { installTestYouTube } from "./media-playback-checks.mjs";

// Real React/WebGL rendering, isolated visitor data and controlled external media.
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const output = resolve(process.env.BUS_VISUAL_OUTPUT ?? "/tmp/lesfousdubus-overlays");
const profile = `/tmp/bus-overlays-${process.pid}`;
const port = Number(process.env.CDP_PORT ?? 9455);
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH ?? "/usr/bin/google-chrome", [
  "--headless=new", `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--no-sandbox",
  "--disable-dev-shm-usage", "--disable-background-networking", "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader", "--mute-audio", "about:blank",
], { stdio: "ignore" });
let ws;
const report = { checks: [], samples: [], errors: [], media: "Controlled YouTube API; no real visitor writes." };
try {
  const tabs = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  ws = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const send = createCdp(ws);
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 45_000);
  const delay = milliseconds => run(`new Promise(resolve => setTimeout(resolve, ${milliseconds}))`);
  const click = selector => run(`(() => { const b = document.querySelector(${JSON.stringify(selector)}); if (!b || b.disabled) throw new Error('Unavailable control: ' + ${JSON.stringify(selector)}); b.click(); })()`);
  const escape = async () => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape" });
    await wait("!document.querySelector('[aria-modal=true]')", "Overlay closes");
  };
  const capture = async filename => {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(`${output}/${filename}`, Buffer.from(shot.data, "base64"));
  };
  await send("Page.enable");
  await send("Runtime.enable");
  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") report.errors.push(message.params.exceptionDetails.text);
  });
  await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 4 });
  await send("Emulation.setDeviceMetricsOverride", { width: 1240, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    const roots = new Map(); let rendererId = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(),
      inject(renderer) { const id = ++rendererId; this.renderers.set(id, renderer); return id; },
      onCommitFiberRoot(id, root) { roots.set(id, root); }, onCommitFiberUnmount() {},
    };
    window.overlayFind = predicate => {
      for (const root of roots.values()) {
        const stack = [root.current];
        while (stack.length) { const fiber = stack.pop(); if (!fiber) continue;
          const result = predicate(fiber); if (result) return result; stack.push(fiber.child, fiber.sibling); }
      } return null;
    };
    window.overlayScene = () => overlayFind(fiber => {
      const store = fiber.memoizedProps?.store ?? fiber.memoizedProps?.value;
      if (typeof store?.getState !== 'function') return;
      const state = store.getState(); if (state.scene?.isScene && state.scene.getObjectByName('bus-vehicle')) return state;
    });
    window.overlayWorld = () => overlayFind(fiber => fiber.memoizedProps?.worldRef?.current);
    const nativeFetch = fetch.bind(window); window.overlayApiCalls = [];
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/api/bus-entries')) return nativeFetch(input, init);
      const method = (init?.method ?? 'GET').toUpperCase();
      window.overlayApiCalls.push({ method, fixture: true });
      if (!['GET', 'HEAD', 'POST'].includes(method)) throw new Error('Fixture disallows this write');
      return Promise.resolve(new Response(JSON.stringify({ count: 2, seatCapacity: 2, profileRevision: 1,
        vacantSeatRanges: [], passengers: [], nextFrom: 2, hasMore: false, seatIndex: 0, added: false, passenger: null }),
        { headers: { 'Content-Type': 'application/json' } }));
    };
  ` });
  await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=2` });
  await wait("document.querySelector('.bus-app')?.dataset.sceneAvailable === 'true' && Boolean(overlayScene()) && Boolean(mediaTestPlayers.bus)", "Scene and preloaded TV ready");
  assert.equal(await run("Boolean(document.querySelector('button[aria-label=\"Aide et confort\"]'))"), false);
  await click('button[aria-label="Allumer la télévision"]');
  await wait("mediaTestPlayers.bus.state === 1", "TV plays");
  for (const viewport of [{ width: 1240, height: 900, mobile: false }, { width: 393, height: 852, mobile: true }]) {
    await send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1 });
    await delay(250);
    for (const selector of ['button[aria-label^="Afficher les passagers"]', 'button[aria-label^="La théorie existe depuis"]']) {
      // The manifest's visible label includes the current passenger count.
      const resolved = selector.includes("Afficher les passagers")
        ? await run(`(() => { const b = [...document.querySelectorAll('.bus-top-stats button')].find(b => b.textContent?.includes('Passagers')); if (!b) throw new Error('Manifest control absent'); b.dataset.overlayManifest = 'true'; return '[data-overlay-manifest]'; })()`)
        : selector;
      await click(resolved);
      await wait("Boolean(document.querySelector('[aria-modal=true]'))", "Metadata overlay opens");
      await delay(200);
      const sample = () => run("({ frame: overlayScene().gl.info.render.frame, scroll: overlayWorld().scroll, time: mediaTestPlayers.bus.getCurrentTime(), state: mediaTestPlayers.bus.state })");
      const before = await sample();
      await delay(1000);
      const after = await sample();
      assert.equal(after.frame, before.frame, "Covered 3D must not render frames.");
      assert.equal(after.scroll, before.scroll, "Covered scenery stays frozen.");
      assert.equal(after.state, 1, "Metadata must not pause television.");
      assert(after.time > before.time + 0.8, "Television timeline advances behind overlay.");
      assert.equal(await run("document.documentElement.scrollWidth > innerWidth"), false);
      await capture(`overlay-${viewport.width}-${selector.includes("Afficher") ? "passagers" : "age"}.png`);
      report.samples.push({ viewport, selector, before, after });
      await escape();
      await wait(`overlayScene().gl.info.render.frame > ${after.frame + 1}`, "3D resumes after close");
    }
  }
  report.checks.push("Passenger and theory-age windows freeze real WebGL frames and scenery while television advances, desktop and mobile.");
  // Theory reading keeps the TV channel until the visitor starts its separate video.
  await click('button[title="Découvrir la théorie des Fous du Bus"]');
  await wait("Boolean(document.getElementById('theory-tab-video'))", "Theory reading opens");
  assert.equal(await run("mediaTestPlayers.bus.state"), 1);
  await click('#theory-tab-video');
  await wait("Boolean(mediaTestPlayers.theory)", "Theory video ready");
  await run("mediaTestPlayers.theory.emitState(1)");
  await wait("mediaTestPlayers.bus.state === 2", "Theory video takes audio priority");
  await run("mediaTestPlayers.theory.emitState(2)");
  await wait("mediaTestPlayers.bus.state === 1", "Pausing theory restores TV");
  await escape();
  report.checks.push("Reading preserves television; theory playback pauses it and pause restores it.");
  assert.deepEqual(report.errors, []);
  report.apiCalls = await run("overlayApiCalls");
  await writeFile(`${output}/overlays.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = String(error.stack ?? error);
  await writeFile(`${output}/overlays.json`, JSON.stringify(report, null, 2) + "\n");
  throw error;
} finally {
  ws?.close(); chrome.kill("SIGTERM");
  await rm(profile, { recursive: true, force: true }).catch(() => undefined);
}
