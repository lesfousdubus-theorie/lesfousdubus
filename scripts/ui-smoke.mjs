import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { runMediaPlaybackChecks } from "./media-playback-checks.mjs";
import { runHudLayoutChecks } from "./hud-layout-checks.mjs";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const chromePath = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const debugPort = Number(process.env.CDP_PORT ?? 9222);

for (const method of ["POST", "DELETE"]) {
  const body = JSON.stringify({ visitorId: "invalid" });
  const unsupported = await fetch(`${baseUrl}/api/bus-entries`, {
    method,
    headers: { "Content-Type": "text/plain" },
    body,
  });
  assert.equal(unsupported.status, 415, `${method} must reject browser-simple text requests.`);
  const validMediaType = await fetch(`${baseUrl}/api/bus-entries`, {
    method,
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body,
  });
  assert.equal(validMediaType.status, 400, `${method} must still parse JSON requests.`);
}

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
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`Chrome did not respond to ${method} within 30 seconds.`));
    }, 30_000);
    pending.set(requestId, {
      resolve: result => { clearTimeout(timeout); resolve(result); },
      reject: error => { clearTimeout(timeout); reject(error); },
    });
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
let testVisitorId = null;
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
    { width: 480, height: 800, mobile: true },
    { width: 639, height: 900, mobile: true },
    { width: 640, height: 900, mobile: true },
    { width: 667, height: 900, mobile: true },
    { width: 720, height: 900, mobile: false },
    { width: 767, height: 1024, mobile: false },
    { width: 568, height: 320, mobile: true },
    { width: 667, height: 375, mobile: true },
    { width: 740, height: 360, mobile: true },
    { width: 844, height: 390, mobile: true },
    { width: 768, height: 1024, mobile: false },
    { width: 900, height: 720, mobile: false },
    { width: 1023, height: 768, mobile: false },
    { width: 1024, height: 768, mobile: false },
    { width: 1152, height: 720, mobile: false },
    { width: 1240, height: 720, mobile: false },
    { width: 1279, height: 720, mobile: false },
    { width: 1280, height: 720, mobile: false },
    { width: 1366, height: 768, mobile: false },
    { width: 1440, height: 900, mobile: false },
    { width: 1920, height: 1080, mobile: false },
  ];

  let firstViewport = true;
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
    if (firstViewport) {
      await send("Page.navigate", { url: `${baseUrl}/?count=12` });
      firstViewport = false;
    } else {
      await sleep(200);
    }
    await waitForPageCondition(
      send,
      `(() => {
        const root = document.querySelector("[data-phase]");
        const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("Entrer dans le bus"));
        return root?.getAttribute("data-phase") === "outside" && root.getAttribute("data-scene-available") === "true" && Boolean(button);
      })()`,
      `Bus UI at ${viewport.width}x${viewport.height}`,
      30_000,
    );

    // Inspect the completed responsive frame, including ResizeObserver updates.
    await evaluate(send, `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);

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
        const tooSmall = buttons
          .map((button) => ({ text: button.textContent?.trim() ?? "", rect: button.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width < 42 || rect.height < 42)
          .map(({ text, rect }) => ({ text, width: rect.width, height: rect.height }));
        const collisions = [];
        for (let i = 0; i < buttons.length; i += 1) {
          const a = buttons[i].getBoundingClientRect();
          for (let j = i + 1; j < buttons.length; j += 1) {
            const b = buttons[j].getBoundingClientRect();
            const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (overlapX > 3 && overlapY > 3) {
              collisions.push([buttons[i].textContent?.trim() ?? "", buttons[j].textContent?.trim() ?? ""]);
            }
          }
        }
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          hasEnter: buttons.some((button) => button.textContent?.includes("Entrer dans le bus")),
          controlHeights: {
            speed: document.querySelector(".bus-speed")?.getBoundingClientRect().height ?? 0,
            dayNight: document.querySelector(".bus-day-night")?.getBoundingClientRect().height ?? 0,
            exterior: document.querySelector(".bus-exterior-controls button")?.getBoundingClientRect().height ?? 0,
            speedButtons: [...document.querySelectorAll(".bus-speed button")].map((button) => button.getBoundingClientRect().height),
            speedFillGaps: [...document.querySelectorAll(".bus-speed button")].map((button) => {
              const buttonRect = button.getBoundingClientRect();
              const fillRect = button.querySelector('[aria-hidden="true"]')?.getBoundingClientRect();
              return fillRect ? [fillRect.top - buttonRect.top, buttonRect.bottom - fillRect.bottom] : [0, 0];
            }),
          },
          outside: outside.map(({ text, rect }) => ({ text, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })),
          tooSmall,
          collisions,
          hudLayout: document.querySelector('.bus-title-panel').parentElement.dataset.bottomLayout,
          hudStyle: document.querySelector('.bus-title-panel').parentElement.getAttribute('style'),
        };
      })()
    `);
    assert(layout.hasEnter, `Enter button missing at ${viewport.width}x${viewport.height}`);
    assert(layout.overflow <= 2, `Horizontal overflow at ${viewport.width}x${viewport.height}: ${layout.overflow}px`);
    assert.equal(layout.outside.length, 0, `Visible controls leave viewport at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout)}`);
    assert.equal(layout.tooSmall.length, 0, `Touch targets are too small at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout.tooSmall)}`);
    assert(Math.abs(layout.controlHeights.speed - layout.controlHeights.dayNight) <= 1, `Speed and day/night controls have different heights at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout.controlHeights)}`);
    assert(Math.abs(layout.controlHeights.speed - layout.controlHeights.exterior) <= 1, `Speed and exterior controls have different heights at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout.controlHeights)}`);
    assert(layout.controlHeights.speedButtons.every((height) => height >= 44), `Speed buttons are too short at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout.controlHeights)}`);
    assert(layout.controlHeights.speedFillGaps.every(([top, bottom]) => top >= 3 && bottom >= 3), `Speed button backgrounds touch the top or bottom edge at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout.controlHeights)}`);
    assert.equal(layout.collisions.length, 0, `Visible controls overlap at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout.collisions)}`);

    await evaluate(send, `
      (() => {
        const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("La Théorie"));
        button?.click();
      })()
    `);
    await waitForPageCondition(send, `Boolean(document.querySelector('[role="tablist"]'))`, "Theory dialog opens");
    const theoryLayout = await evaluate(send, `
      (() => {
        const dialog = document.querySelector('.theory-modal-window').getBoundingClientRect();
        const tabs = [...document.querySelectorAll('[role="tab"]')].map(el => el.getBoundingClientRect());
        return { top: dialog.top, bottom: dialog.bottom, tabs: tabs.map(rect => ({left: rect.left, right: rect.right, height: rect.height})) };
      })()
    `);
    assert(theoryLayout.top >= -1 && theoryLayout.bottom <= viewport.height + 1,
      `Theory dialog leaves the visible screen at ${viewport.width}x${viewport.height}: ${JSON.stringify(theoryLayout)}`);
    assert(theoryLayout.tabs.every(rect => rect.left >= 0 && rect.right <= viewport.width && rect.height >= 44),
      `Theory tabs are clipped at ${viewport.width}x${viewport.height}: ${JSON.stringify(theoryLayout)}`);
    await evaluate(send, `document.getElementById('theory-tab-thesis').click()`);
    await waitForPageCondition(send, `document.getElementById('theory-tab-thesis').getAttribute('aria-selected') === 'true'`, "Thesis selected before reading");
    // La lecture et les cartes ouvertes survivent au passage par un autre onglet.
    const readingPosition = await evaluate(send, `
      (() => {
        const content = document.getElementById('theory-panel-thesis').parentElement;
        content.scrollTop = 240;
        document.querySelector('#theory-panel-thesis details').open = true;
        const position = content.scrollTop;
        document.getElementById('theory-tab-faq').click();
        return position;
      })()
    `);
    await waitForPageCondition(send, `document.getElementById('theory-tab-faq').getAttribute('aria-selected') === 'true'`, "FAQ selected");
    await evaluate(send, `document.getElementById('theory-tab-thesis').click()`);
    await waitForPageCondition(send, `document.getElementById('theory-tab-thesis').getAttribute('aria-selected') === 'true'`, "Thesis selected again");
    const restoredReading = await evaluate(send, `({position: document.getElementById('theory-panel-thesis').parentElement.scrollTop, open: document.querySelector('#theory-panel-thesis details').open})`);
    assert(Math.abs(restoredReading.position - readingPosition) <= 1 && restoredReading.open, `Reading position or open card was lost at ${viewport.width}x${viewport.height}: saved=${readingPosition}, restored=${JSON.stringify(restoredReading)}`);
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
    await waitForPageCondition(
      send,
      `(() => {
        if (document.querySelector('[role="dialog"]')) return false;
        const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("Entrer dans le bus"));
        return Boolean(button) && getComputedStyle(button).visibility !== "hidden";
      })()`,
      `Theory modal close at ${viewport.width}x${viewport.height}`,
    );
  }

  // Le responsive est désormais testé en redimensionnant une seule page.
  // On conserve donc volontairement ce même contexte WebGL pour le parcours
  // d'interaction, comme le ferait un visiteur réel, au lieu d'en créer un second.
  const interactionSend = send;
  await interactionSend("Emulation.setDeviceMetricsOverride", {
    width: 393, height: 852, deviceScaleFactor: 2, mobile: true,
    screenOrientation: { type: "portraitPrimary", angle: 0 },
  });
  await waitForPageCondition(
    interactionSend,
    `Boolean(document.querySelector("canvas")) && !document.body.innerText.includes("Le bus reste au dépôt")`,
    "Healthy WebGL scene before interaction",
  );
  await interactionSend("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await waitForPageCondition(
    interactionSend,
    `document.querySelector("[data-phase]")?.getAttribute("data-phase") === "outside"`,
    "Phone bus UI",
  );
  const startingSpeed = await evaluate(interactionSend,
    `document.querySelector('.bus-speed-value')?.textContent?.trim()`,
  );
  await evaluate(interactionSend,
    `document.querySelector('button[aria-label="Accélérer le bus"]')?.click()`,
  );
  await waitForPageCondition(interactionSend,
    `document.querySelector('.bus-speed-value')?.textContent?.trim() !== ${JSON.stringify(startingSpeed)}`,
    "Bus acceleration control",
  );
  await evaluate(interactionSend,
    `document.querySelector('button[aria-label="Ralentir le bus"]')?.click()`,
  );
  await waitForPageCondition(interactionSend,
    `document.querySelector('.bus-speed-value')?.textContent?.trim() === ${JSON.stringify(startingSpeed)}`,
    "Bus deceleration control",
  );
  await evaluate(interactionSend, `
    (() => {
      const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("Entrer dans le bus"));
      button?.click();
    })()
  `);
  testVisitorId = await evaluate(interactionSend, `localStorage.getItem("fdb-visitor")`);
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
  await waitForPageCondition(
    interactionSend,
    `Boolean(document.getElementById("youtube-iframe-api"))
      || Boolean(window.YT?.Player)
      || Boolean(document.getElementById("tv-primary-iframe"))
      || Boolean(document.querySelector('#tv-frame a[href*="youtube.com/watch"]'))`,
    "TV playback initialization or recovery",
    4_000,
  );

  const inside = await evaluate(interactionSend, `
    (() => ({
      phase: document.querySelector("[data-phase]")?.getAttribute("data-phase"),
      youtubeIframes: document.querySelectorAll('#tv-frame iframe[src*="youtube.com"], #tv-frame iframe[src*="youtube-nocookie.com"]').length,
      hasTvFrame: Boolean(document.getElementById("tv-frame")),
      hasPrimaryIframe: Boolean(document.getElementById("tv-primary-iframe")),
      hasPlayerMount: Boolean(document.querySelector("[data-bus-youtube-player]")),
      hasZoomBadge: [...document.querySelectorAll('#tv-frame button')].some((el) => /zoom/i.test(el.textContent ?? "")),
      hasVideoFallback: Boolean(document.querySelector('#tv-frame a[href*="youtube.com/watch"]')),
      hasPlayPrompt: Boolean(document.querySelector('#tv-frame button[aria-label="Lancer la vidéo"]')),
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
  assert(!inside.hasZoomBadge, "The TV player must not show a zoom badge over the video.");
  assert(inside.youtubeIframes <= 1, `More than one bus YouTube iframe is mounted: ${inside.youtubeIframes}`);
  assert(inside.overflow <= 2, "Interior mobile UI overflows horizontally.");

  for (const viewport of [
    { width: 393, height: 852, mobile: true },
    { width: 1366, height: 768, mobile: false },
  ]) {
    await interactionSend("Emulation.setDeviceMetricsOverride", {
      width: viewport.width, height: viewport.height,
      deviceScaleFactor: viewport.mobile ? 2 : 1, mobile: viewport.mobile,
      screenOrientation: { type: "portraitPrimary", angle: 0 },
    });
    const rowControl = await evaluate(interactionSend, `
      (() => {
        const nav = document.querySelector('.bus-row-nav > div');
        const label = nav?.querySelector(':scope > span');
        const buttons = [...(nav?.querySelectorAll('button') ?? [])];
        if (!nav || !label || buttons.length !== 2) return null;
        const outer = nav.getBoundingClientRect();
        return {
          outerHeight: outer.height,
          interiorButtonHeight: document.querySelector('.bus-interior-controls button')?.getBoundingClientRect().height ?? 0,
          labelOffset: (label.getBoundingClientRect().top + label.getBoundingClientRect().bottom - outer.top - outer.bottom) / 2,
          buttons: buttons.map((button) => {
            const rect = button.getBoundingClientRect();
            const fill = button.querySelector('span[aria-hidden="true"]')?.getBoundingClientRect();
            const icon = button.querySelector('svg')?.getBoundingClientRect();
            return {
              height: rect.height,
              fillGaps: fill ? [fill.top - rect.top, rect.bottom - fill.bottom] : [0, 0],
              iconOffset: icon ? (icon.top + icon.bottom - rect.top - rect.bottom) / 2 : 100,
            };
          }),
        };
      })()
    `);
    assert(rowControl, `Row selector missing at ${viewport.width}x${viewport.height}`);
    assert(Math.abs(rowControl.outerHeight - rowControl.interiorButtonHeight) <= 1,
      `Row selector has a different height at ${viewport.width}x${viewport.height}: ${JSON.stringify(rowControl)}`);
    assert(rowControl.buttons.every(({ height }) => height >= 44),
      `Row arrow targets are too short at ${viewport.width}x${viewport.height}: ${JSON.stringify(rowControl)}`);
    assert(rowControl.buttons.every(({ fillGaps }) => fillGaps.every((gap) => gap >= 3)),
      `Row arrow backgrounds touch an edge at ${viewport.width}x${viewport.height}: ${JSON.stringify(rowControl)}`);
    assert(Math.abs(rowControl.labelOffset) <= 1 && rowControl.buttons.every(({ iconOffset }) => Math.abs(iconOffset) <= 1),
      `Row label or arrows are off center at ${viewport.width}x${viewport.height}: ${JSON.stringify(rowControl)}`);
  }

  const initialRow = await evaluate(interactionSend,
    `document.querySelector('.bus-row-nav > div > span')?.textContent?.replace(/\\s+/g, '')`,
  );
  await evaluate(interactionSend,
    `document.querySelector('button[aria-label="Rangée suivante"]')?.click()`,
  );
  await waitForPageCondition(interactionSend,
    `document.querySelector('.bus-row-nav > div > span')?.textContent?.replace(/\\s+/g, '') !== ${JSON.stringify(initialRow)}`,
    "Row selector changes the displayed row",
  );

  // Les libellés des quatre commandes doivent rester dans leurs boutons.
  const clippedLabels = await evaluate(interactionSend, `
    [...document.querySelectorAll('.bus-interior-controls button')].flatMap(button => {
      const outer = button.getBoundingClientRect();
      return [...button.querySelectorAll('span')].filter(span => span.getClientRects().length).filter(span => {
        const rect = span.getBoundingClientRect();
        return rect.left < outer.left || rect.right > outer.right || rect.top < outer.top || rect.bottom > outer.bottom;
      }).map(span => span.textContent.trim());
    })
  `);
  assert.equal(clippedLabels.length, 0, `Interior labels exceed their controls: ${JSON.stringify(clippedLabels)}`);
  await evaluate(interactionSend, `(() => { const button = document.querySelector('button[aria-label="Ajouter un prénom"]'); button.focus(); button.click(); })()`);
  await waitForPageCondition(interactionSend, `Boolean(document.querySelector('#join-bus-title'))`, "Profile dialog opens");
  assert.equal(await evaluate(interactionSend, `document.body.innerText.includes('Retirer mon prénom')`), false, "Anonymous visitors should not be offered an empty name deletion.");
  await evaluate(interactionSend, `document.querySelector('[role="dialog"] form').requestSubmit()`);
  await waitForPageCondition(interactionSend, `Boolean(document.getElementById('join-bus-error'))`, "Empty name validation");
  assert.equal(await evaluate(interactionSend, `document.querySelector('[role="dialog"] input').getAttribute('aria-invalid')`), "true");
  await evaluate(interactionSend, `document.querySelector('[role="dialog"] input').focus()`);
  await waitForPageCondition(interactionSend, `document.activeElement === document.querySelector('[role="dialog"] input')`, "Profile input takes keyboard focus");
  await interactionSend("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await interactionSend("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await waitForPageCondition(interactionSend, `!document.querySelector('[role="dialog"]') && !document.getElementById('site-content').inert`, "Profile closes and unlocks the page");
  await waitForPageCondition(interactionSend, `document.activeElement?.getAttribute('aria-label') === 'Ajouter un prénom'`, "Profile trigger regains keyboard focus");
  await evaluate(interactionSend, `document.querySelector('button[aria-label="Ajouter un prénom"]').click()`);
  await waitForPageCondition(interactionSend, `document.activeElement === document.querySelector('[role="dialog"] input')`, "Input focus before saving");
  await interactionSend("Input.insertText", { text: "Test interface" });
  await waitForPageCondition(interactionSend, `document.querySelector('[role="dialog"] input')?.value === 'Test interface'`, "Profile name typed");
  await evaluate(interactionSend, `document.querySelector('[role="dialog"] form').requestSubmit()`);
  await waitForPageCondition(interactionSend, `!document.querySelector('[role="dialog"]')`, "Profile saved locally");
  await evaluate(interactionSend, `document.querySelector('button[aria-label="Ajouter un prénom"]').click()`);
  await waitForPageCondition(interactionSend, `document.body.innerText.includes('Retirer mon prénom')`, "Saved name can be edited or removed");
  assert.equal(await evaluate(interactionSend, `document.querySelector('[role="dialog"] input').value`), "Test interface");
  await evaluate(interactionSend, `document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
  await evaluate(interactionSend, `document.querySelector('.bus-top-stats button').click()`);
  await waitForPageCondition(interactionSend, `Boolean([...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('Test interface')))`, "Saved passenger appears in list");
  await evaluate(interactionSend, `[...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('Test interface')).click()`);
  await waitForPageCondition(interactionSend, `Boolean(document.getElementById('passenger-name'))`, "Passenger card opens");
  await evaluate(interactionSend, `[...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('Retour aux passagers')).click()`);
  await waitForPageCondition(interactionSend, `Boolean(document.getElementById('passenger-list-title')) && document.getElementById('site-content').inert`, "Back to passenger list keeps background locked");
  await evaluate(interactionSend, `document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
  await waitForPageCondition(interactionSend, `!document.querySelector('[role="dialog"]') && !document.getElementById('site-content').inert`, "Passenger list unlocks the page");

  await runMediaPlaybackChecks({ send: interactionSend, evaluate, waitForPageCondition, baseUrl });
  await runHudLayoutChecks({ send: interactionSend, evaluate, waitForPageCondition, viewports });

  // Un appareil sans WebGL doit garder une vraie voie de lecture.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (/^(webgl2?|experimental-webgl)$/.test(type)) return null;
      return originalGetContext.call(this, type, ...args);
    };
  ` });
  await send("Page.navigate", { url: baseUrl });
  await waitForPageCondition(send, `document.querySelector('.bus-app')?.getAttribute('data-scene-available') === 'false' && document.body.innerText.includes('Le bus reste au dépôt')`, "WebGL fallback is available", 30_000);
  const fallbackControls = await evaluate(send, `
    [...document.querySelectorAll('.bus-exterior-controls, .bus-interior-controls, .bus-day-night, .bus-speed, .bus-row-nav')]
      .filter(el => getComputedStyle(el).display !== 'none').length
  `);
  assert.equal(fallbackControls, 0, "Unavailable 3D controls should be hidden.");
  await evaluate(send, `[...document.querySelectorAll('button')].find(button => button.textContent === 'Lire la théorie').click()`);
  await waitForPageCondition(send, `Boolean(document.querySelector('[role="tablist"]'))`, "Theory works without WebGL");
  await evaluate(send, `document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
  await waitForPageCondition(send, `!document.querySelector('[role="dialog"]') && !document.getElementById('site-content').inert`, "Fallback reading closes correctly");

  // Le rendu est cadencé par requestAnimationFrame natif. Le runner
  // headless utilise SwiftShader : prolonger artificiellement ce scénario jusqu'à
  // un cycle extinction/rallumage de TV finit par épuiser son contexte WebGL.
  // Le contrat TV est couvert par les régressions statiques ; ici on valide le
  // vrai parcours utilisateur critique : chargement, entrée et player unique.
  ws.close();
  console.log("Responsive/UI smoke checks passed.");
} finally {
  if (chrome.exitCode === null) chrome.kill("SIGTERM");
  try {
    if (typeof testVisitorId === "string" && /^[a-zA-Z0-9-]{8,128}$/.test(testVisitorId)) {
      const cleanup = await fetch(`${baseUrl}/api/bus-entries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: testVisitorId }),
      });
      assert(cleanup.ok, `Could not remove the UI test passenger: ${cleanup.status}`);
    }
  } finally {
    try {
      rmSync(chromeProfileDir, { recursive: true, force: true });
    } catch {
      // Le runner est éphémère et Chrome peut encore écrire quelques fichiers
      // pendant son extinction. Ce nettoyage ne doit jamais invalider les tests.
    }
  }
}
