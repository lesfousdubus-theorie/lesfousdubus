import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const chromePath = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const debugPort = 9222;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 120) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error(`Unable to reach ${url}`);
}

function createCdp(ws) {
  let id = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (!data.id) return;
    const waiter = pending.get(data.id);
    if (!waiter) return;
    pending.delete(data.id);
    if (data.error) waiter.reject(new Error(data.error.message ?? JSON.stringify(data.error)));
    else waiter.resolve(data.result);
  });
  return (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = id++;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed.");
  return result.result?.value;
}

async function waitForPageCondition(send, expression, label, timeoutMs = 8_000) {
  const startedAt = Date.now();
  let lastValue = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await evaluate(send, expression);
    if (lastValue) return lastValue;
    await sleep(150);
  }
  const diagnostics = await evaluate(send, `
    (() => ({
      readyState: document.readyState,
      phase: document.querySelector("[data-phase]")?.getAttribute("data-phase") ?? null,
      bodyText: document.body.innerText.slice(0, 600),
      buttons: [...document.querySelectorAll("button")].map((button) => button.textContent?.trim() ?? ""),
    }))()
  `);
  throw new Error(`${label} timed out after ${timeoutMs}ms: ${JSON.stringify(diagnostics)}`);
}

const chromeProfileDir = `/tmp/lesfousdubus-chrome-${process.pid}`;
let chromeStderr = "";
const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${debugPort}`,
  "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${chromeProfileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-background-networking",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--window-size=1920,1080",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

chrome.stderr?.on("data", (chunk) => {
  chromeStderr = (chromeStderr + chunk.toString()).slice(-12_000);
});

try {
  let targets;
  try {
    targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  } catch (error) {
    throw new Error(
      `Chrome DevTools did not become ready. Chrome exited=${chrome.exitCode !== null}. stderr: ${chromeStderr || "(empty)"}`,
      { cause: error },
    );
  }
  const target = targets.find((item) => item.type === "page");
  assert(target?.webSocketDebuggerUrl, "Chrome page target is unavailable.");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const send = createCdp(ws);
  await send("Page.enable");
  await send("Runtime.enable");

  const viewports = [
    { width: 320, height: 568, mobile: true },
    { width: 393, height: 852, mobile: true },
    { width: 844, height: 390, mobile: true },
    { width: 768, height: 1024, mobile: false },
    { width: 1366, height: 768, mobile: false },
    { width: 1920, height: 1080, mobile: false },
  ];

  for (const viewport of viewports) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.mobile ? 2 : 1,
      mobile: viewport.mobile,
      screenOrientation: viewport.width > viewport.height
        ? { type: "landscapePrimary", angle: 90 }
        : { type: "portraitPrimary", angle: 0 },
    });
    await send("Page.navigate", { url: `${baseUrl}/?count=12` });
    await waitForPageCondition(
      send,
      `(() => {
        const root = document.querySelector("[data-phase]");
        const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("Entrer dans le bus"));
        return root?.getAttribute("data-phase") === "outside" && Boolean(button);
      })()`,
      `Bus UI at ${viewport.width}x${viewport.height}`,
    );

    const layout = await evaluate(send, `
      (() => {
        const visible = (el) => {
          if (el.closest('[aria-hidden="true"]')) return false;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.01 && rect.width > 0 && rect.height > 0;
        };
        const buttons = [...document.querySelectorAll("button")].filter(visible);
        const outside = buttons
          .map((button) => ({ text: button.textContent?.trim() ?? "", rect: button.getBoundingClientRect() }))
          .filter(({ rect }) => rect.left < -2 || rect.right > innerWidth + 2 || rect.top < -2 || rect.bottom > innerHeight + 2);
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          hasEnter: buttons.some((button) => button.textContent?.includes("Entrer dans le bus")),
          outside: outside.map(({ text, rect }) => ({ text, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })),
        };
      })()
    `);
    assert(layout.hasEnter, `Enter button missing at ${viewport.width}x${viewport.height}`);
    assert(layout.overflow <= 2, `Horizontal overflow at ${viewport.width}x${viewport.height}: ${layout.overflow}px`);
    assert.equal(layout.outside.length, 0, `Visible controls leave viewport at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout.outside)}`);

    await evaluate(send, `
      (() => {
        const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("La Théorie"));
        button?.click();
      })()
    `);
    await sleep(150);
    await evaluate(send, `
      (() => {
        const button = [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes("Vidéo"));
        button?.click();
      })()
    `);
    await waitForPageCondition(
      send,
      `Boolean(document.querySelector("[data-theory-video]"))`,
      `Theory video at ${viewport.width}x${viewport.height}`,
    );
    const theoryVideo = await evaluate(send, `
      (() => {
        const video = document.querySelector("[data-theory-video]");
        if (!video) return null;
        const rect = video.getBoundingClientRect();
        return { height: rect.height, left: rect.left, right: rect.right };
      })()
    `);
    assert(theoryVideo, `Theory video missing at ${viewport.width}x${viewport.height}`);
    assert(theoryVideo.height >= 199, `Theory video is too short at ${viewport.width}x${viewport.height}: ${theoryVideo.height}px`);
    assert(theoryVideo.left >= -2 && theoryVideo.right <= viewport.width + 2, "Theory video exceeds viewport width.");

    await evaluate(send, `
      (() => {
        const button = document.querySelector('button[aria-label="Fermer la fenêtre"]');
        button?.click();
      })()
    `);
  }

  // Use a fresh tab for the interaction flow. Repeated WebGL reloads from the
  // viewport matrix can exhaust SwiftShader resources in headless Chrome even
  // though a real visitor only has one active page.
  const interactionResponse = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?about:blank`,
    { method: "PUT" },
  );
  assert(interactionResponse.ok, "Unable to create a fresh Chrome target for the interaction flow.");
  const interactionTarget = await interactionResponse.json();
  assert(interactionTarget?.webSocketDebuggerUrl, "Fresh Chrome target is unavailable.");

  const interactionWs = new WebSocket(interactionTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    interactionWs.addEventListener("open", resolve, { once: true });
    interactionWs.addEventListener("error", reject, { once: true });
  });
  const interactionSend = createCdp(interactionWs);
  await interactionSend("Page.enable");
  await interactionSend("Runtime.enable");
  await interactionSend("Emulation.setDeviceMetricsOverride", {
    width: 393, height: 852, deviceScaleFactor: 2, mobile: true,
    screenOrientation: { type: "portraitPrimary", angle: 0 },
  });
  await interactionSend("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await interactionSend("Page.navigate", { url: `${baseUrl}/?count=12` });
  await waitForPageCondition(
    interactionSend,
    `document.querySelector("[data-phase]")?.getAttribute("data-phase") === "outside"`,
    "Phone bus UI",
  );
  await evaluate(interactionSend, `
    (() => {
      const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("Entrer dans le bus"));
      button?.click();
    })()
  `);
  await sleep(250);
  const phaseDuringEntry = await evaluate(
    interactionSend,
    `document.querySelector("[data-phase]")?.getAttribute("data-phase")`,
  );
  assert.equal(
    phaseDuringEntry,
    "entering",
    "Reduced-motion mode skipped the bus entry animation.",
  );
  await waitForPageCondition(
    interactionSend,
    `document.querySelector("[data-phase]")?.getAttribute("data-phase") === "inside"`,
    "Bus entering transition",
    7_000,
  );

  await waitForPageCondition(
    interactionSend,
    `Boolean(document.getElementById("tv-frame"))`,
    "TV frame after entering",
    4_000,
  );

  const inside = await evaluate(interactionSend, `
    (() => ({
      phase: document.querySelector("[data-phase]")?.getAttribute("data-phase"),
      youtubeIframes: document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]').length,
      hasTvFrame: Boolean(document.getElementById("tv-frame")),
      hasPrimaryIframe: Boolean(document.getElementById("tv-primary-iframe")),
      hasPlayerMount: Boolean(document.querySelector("[data-bus-youtube-player]")),
      hasExit: [...document.querySelectorAll("button")].some((el) => el.textContent?.includes("Sortir")),
      overflow: document.documentElement.scrollWidth - innerWidth,
    }))()
  `);
  assert.equal(inside.phase, "inside", "Bus did not finish entering.");
  assert(inside.hasExit, "Interior controls are unavailable after entering.");
  assert(inside.hasTvFrame, "The TV frame was unmounted after entering.");
  assert(
    inside.hasPrimaryIframe || inside.hasPlayerMount,
    "Neither the YouTube iframe nor its persistent preload mount is present.",
  );
  assert(inside.youtubeIframes <= 1, `More than one bus YouTube iframe is mounted: ${inside.youtubeIframes}`);
  await evaluate(interactionSend, `
    (() => {
      const player = document.getElementById("tv-primary-iframe")
        ?? document.querySelector("[data-bus-youtube-player]");
      if (player) player.dataset.smokePersistent = "yes";
    })()
  `);
  assert(inside.overflow <= 2, "Interior mobile UI overflows horizontally.");

  await evaluate(interactionSend, `
    (() => {
      const button = [...document.querySelectorAll("button")].find((el) => {
        const text = el.textContent?.trim() ?? "";
        return text === "TV" || text.includes("Éteindre la TV");
      });
      button?.click();
    })()
  `);
  await sleep(200);
  const tvOff = await evaluate(interactionSend, `
    (() => ({
      playerStillMounted: (
        document.getElementById("tv-primary-iframe")
        ?? document.querySelector("[data-bus-youtube-player]")
      )?.dataset.smokePersistent === "yes",
      phase: document.querySelector("[data-phase]")?.getAttribute("data-phase"),
    }))()
  `);
  assert(tvOff.playerStillMounted, "Turning the TV off destroyed the preloaded player.");
  assert.equal(tvOff.phase, "inside", "Turning the TV off changed the bus phase.");

  interactionWs.close();
  ws.close();
  console.log("Responsive/UI smoke checks passed.");
} finally {
  if (chrome.exitCode === null) chrome.kill("SIGTERM");
  try {
    rmSync(chromeProfileDir, { recursive: true, force: true });
  } catch {
    // Le runner est éphémère et Chrome peut encore écrire quelques fichiers
    // pendant son extinction. Ce nettoyage ne doit jamais invalider les tests.
  }
}
