const { spawn } = require("child_process");
const fs = require("fs");

async function run() {
  console.log("Starting Chrome Headless for comprehensive verification...");
  const chrome = spawn(
    "/usr/bin/google-chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--no-sandbox",
      "--window-size=1280,800",
      "http://localhost:3000",
    ],
    { stdio: "ignore" }
  );

  await new Promise((r) => setTimeout(r, 2500));

  try {
    const listRes = await fetch("http://localhost:9222/json/list");
    const tabs = await listRes.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    let id = 1;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const msgId = id++;
        const handler = (e) => {
          const data = JSON.parse(e.data);
          if (data.id === msgId) {
            ws.removeEventListener("message", handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

    await new Promise((r) => (ws.onopen = r));
    console.log("CDP WebSocket connected.");

    // Attendre le chargement complet de Three.js
    await new Promise((r) => setTimeout(r, 4000));

    // TEST 1 : État initial (aucun texte d'intro, aucun bouton boost, bus propre)
    const initialCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const hasIntro = text.includes("Bienvenue à bord, nakama !");
          const hasBoost = btns.some(b => b.includes("Boost"));
          const hasReset = btns.includes("↺");
          const enterBtn = btns.find(b => b.includes("Entrer dans le bus"));
          const headlightsBtn = btns.find(b => b.includes("Phares") || b.includes("Éteindre"));
          const countEl = document.querySelector('.tabular-nums');

          return {
            hasIntro,
            hasBoost,
            hasReset,
            hasEnterBtn: Boolean(enterBtn),
            headlightsBtn,
            countVal: countEl ? countEl.textContent.trim() : null,
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 1 - Initial State:", JSON.stringify(initialCheck.result.value, null, 2));

    let snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_fix_1_initial.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_fix_1_initial.png");

    // TEST 2 : Entrer dans le bus
    console.log("Entering bus...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const enterBtn = btns.find(b => b.textContent.includes('Entrer'));
          if (enterBtn) enterBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 4000));

    const insideCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const tvFrame = document.getElementById('tv-frame');
          const tvIframe = document.getElementById('tv-primary-iframe');
          const exitBtn = btns.find(b => b.includes("Sortir du bus"));
          const fsHudBtn = btns.find(b => b.includes("Plein écran"));
          const playBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Play") || b.textContent.includes("Pause")) : null;
          const stopBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Stop")) : null;
          const fsTvBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Plein écran")) : null;
          const countEl = document.querySelector('.tabular-nums');

          return {
            countVal: countEl ? countEl.textContent.trim() : null,
            hasExitBtn: Boolean(exitBtn),
            hasFsHudBtn: Boolean(fsHudBtn),
            hasTvFrame: Boolean(tvFrame),
            hasTvIframe: Boolean(tvIframe),
            playBtnText: playBtn ? playBtn.textContent.trim() : null,
            hasStopBtn: Boolean(stopBtn),
            hasFsTvBtn: Boolean(fsTvBtn),
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 2 - Inside Bus State:", JSON.stringify(insideCheck.result.value, null, 2));

    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_fix_2_inside.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_fix_2_inside.png");

    // TEST 3 : Tester le bouton Stop sur la petite TV
    console.log("Testing Stop button on small TV...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const tvFrame = document.getElementById('tv-frame');
          const stopBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Stop")) : null;
          if (stopBtn) stopBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 1500));

    const stopCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const tvFrame = document.getElementById('tv-frame');
          const playBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Play") || b.textContent.includes("Pause")) : null;
          return {
            playBtnTextAfterStop: playBtn ? playBtn.textContent.trim() : null
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 3 - After Stop:", JSON.stringify(stopCheck.result.value, null, 2));

    // TEST 4 : Tester le bouton Play sur la petite TV
    console.log("Testing Play button on small TV...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const tvFrame = document.getElementById('tv-frame');
          const playBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Play")) : null;
          if (playBtn) playBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 1500));

    const playCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const tvFrame = document.getElementById('tv-frame');
          const playBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Pause") || b.textContent.includes("Play")) : null;
          return {
            playBtnTextAfterPlay: playBtn ? playBtn.textContent.trim() : null
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 4 - After Play:", JSON.stringify(playCheck.result.value, null, 2));

    // TEST 5 : Plein écran déclenché depuis le bouton de la TV
    console.log("Triggering fullscreen from TV button...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const tvFrame = document.getElementById('tv-frame');
          const fsTvBtn = tvFrame ? Array.from(tvFrame.querySelectorAll('button')).find(b => b.textContent.includes("Plein écran")) : null;
          if (fsTvBtn) fsTvBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 2000));

    const fsFromTvCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.getElementById('tv-fullscreen-modal');
          const modalIframe = modal ? modal.querySelector('iframe') : null;
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const fsHudBtn = btns.find(b => b.includes("plein écran") || b.includes("Plein écran"));

          return {
            hasModal: Boolean(modal),
            modalIframeSrc: modalIframe ? modalIframe.src : null,
            fsHudBtnText: fsHudBtn
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 5 - Fullscreen from TV button:", JSON.stringify(fsFromTvCheck.result.value, null, 2));

    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_fix_5_fullscreen.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_fix_5_fullscreen.png");

    // TEST 6 : Sortir du plein écran via le bouton HUD (synchro bidirectionnelle)
    console.log("Exiting fullscreen via HUD button...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const exitFsBtn = btns.find(b => b.textContent.includes("Sortir du plein écran"));
          if (exitFsBtn) exitFsBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 1500));

    const exitFsCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.getElementById('tv-fullscreen-modal');
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const fsHudBtn = btns.find(b => b.includes("Plein écran"));
          return {
            hasModal: Boolean(modal),
            fsHudBtnText: fsHudBtn
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 6 - Exit Fullscreen:", JSON.stringify(exitFsCheck.result.value, null, 2));

    // TEST 7 : Sortir du bus -> le son reste audible (volume 25%), TV reste allumée
    console.log("Exiting bus...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const exitBtn = btns.find(b => b.textContent.includes('Sortir du bus'));
          if (exitBtn) exitBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 3500));

    const outsideWithTvCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const offTvBtn = btns.find(b => b.includes("Éteindre la TV"));
          const tvIframe = document.getElementById('tv-primary-iframe');
          return {
            hasOffTvBtn: Boolean(offTvBtn),
            hasTvIframeMounted: Boolean(tvIframe),
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 7 - Outside With TV Persisting:", JSON.stringify(outsideWithTvCheck.result.value, null, 2));

    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_fix_7_outside_tv_on.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_fix_7_outside_tv_on.png");

    // TEST 8 : Éteindre la TV depuis l'extérieur
    console.log("Turning off TV from outside...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const offTvBtn = btns.find(b => b.textContent.includes("Éteindre la TV"));
          if (offTvBtn) offTvBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 1200));

    const outsideTvOffCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const hasOffTvBtn = btns.some(b => b.includes("Éteindre la TV"));
          const tvIframe = document.getElementById('tv-primary-iframe');
          return {
            hasOffTvBtn,
            hasTvIframeMounted: Boolean(tvIframe),
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 8 - Outside TV Turned Off:", JSON.stringify(outsideTvOffCheck.result.value, null, 2));

    // TEST 9 : Tester l'allumage manuel des phares
    console.log("Testing headlights toggle...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const lightsBtn = btns.find(b => b.textContent.includes("Phares") || b.textContent.includes("Éteindre"));
          if (lightsBtn) lightsBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 800));

    const lightsOnCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const lightsBtn = btns.find(b => b.includes("💡"));
          return { lightsBtn };
        })()
      `,
      returnByValue: true,
    });
    console.log("TEST 9 - Headlights Manually Toggled ON:", JSON.stringify(lightsOnCheck.result.value, null, 2));

    ws.close();
    console.log("COMPREHENSIVE VERIFICATION COMPLETED SUCCESSFULLY!");
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
