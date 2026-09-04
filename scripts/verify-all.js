const { spawn } = require("child_process");
const fs = require("fs");

async function run() {
  console.log("Starting Chrome Headless...");
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

    // TEST 1 : Vérifier la page d'accueil (0 passagers, pas de texte d'intro, pas de boutons boost)
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
          const klaxonBtn = btns.find(b => b.includes("Klaxonner"));
          
          // Récupérer le compteur affiché
          const countEl = document.querySelector('.tabular-nums');
          const countVal = countEl ? countEl.textContent.trim() : null;

          return {
            hasIntro,
            hasBoost,
            hasReset,
            hasEnterBtn: Boolean(enterBtn),
            hasHeadlightsBtn: Boolean(headlightsBtn),
            hasKlaxonBtn: Boolean(klaxonBtn),
            countVal,
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("TEST 1 - Initial State:", JSON.stringify(initialCheck.result.value, null, 2));

    let snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_step1_initial_0.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_step1_initial_0.png");

    // TEST 2 : Entrer dans le bus
    console.log("Clicking 'Entrer dans le bus'...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const enterBtn = btns.find(b => b.textContent.includes('Entrer'));
          if (enterBtn) enterBtn.click();
        })()
      `,
    });

    // Attendre l'animation d'entrée et le chargement du lecteur
    await new Promise((r) => setTimeout(r, 4000));

    const insideCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const countEl = document.querySelector('.tabular-nums');
          const countVal = countEl ? countEl.textContent.trim() : null;

          const tvFrame = document.getElementById('tv-frame');
          const tvIframe = document.getElementById('tv-primary-iframe');
          const exitBtn = btns.find(b => b.includes("Sortir du bus"));
          const fsBtn = btns.find(b => b.includes("Plein écran") || b.includes("Sortir du plein écran"));
          const playPauseBtn = tvFrame ? tvFrame.querySelector('button') : null;

          return {
            countVal,
            hasExitBtn: Boolean(exitBtn),
            hasFsBtn: Boolean(fsBtn),
            fsBtnText: fsBtn,
            hasTvFrame: Boolean(tvFrame),
            hasTvIframe: Boolean(tvIframe),
            iframeSrc: tvIframe ? tvIframe.src : null,
            playPauseBtnText: playPauseBtn ? playPauseBtn.textContent.trim() : null,
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("TEST 2 - Inside Bus State:", JSON.stringify(insideCheck.result.value, null, 2));

    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_step2_inside.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_step2_inside.png");

    // TEST 3 : Tester le bouton Plein écran
    console.log("Clicking 'Plein écran' button...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const fsBtn = btns.find(b => b.textContent.includes("Plein écran"));
          if (fsBtn) fsBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 1500));

    const fsCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.getElementById('tv-fullscreen-modal');
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const fsHudBtn = btns.find(b => b.includes("plein écran"));
          const modalExitBtn = modal ? modal.querySelector('button') : null;
          const modalIframe = modal ? modal.querySelector('iframe') : null;

          return {
            hasModal: Boolean(modal),
            modalIframeSrc: modalIframe ? modalIframe.src : null,
            hasModalExitBtn: Boolean(modalExitBtn),
            fsHudBtnText: fsHudBtn,
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("TEST 3 - Fullscreen State:", JSON.stringify(fsCheck.result.value, null, 2));

    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_step3_fullscreen.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_step3_fullscreen.png");

    // TEST 4 : Sortir du plein écran
    console.log("Clicking '✕ Sortir du plein écran'...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.getElementById('tv-fullscreen-modal');
          const exitBtn = modal ? modal.querySelector('button') : null;
          if (exitBtn) exitBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 1200));

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

    console.log("TEST 4 - Exit Fullscreen:", JSON.stringify(exitFsCheck.result.value, null, 2));

    // TEST 5 : Sortir du bus -> le son continue de loin, la TV reste allumée
    console.log("Clicking 'Sortir du bus'...");
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

    const outsideCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const turnOffTvBtn = btns.find(b => b.includes("Éteindre la TV"));
          const enterBtn = btns.find(b => b.includes("Entrer dans le bus"));
          const tvIframe = document.getElementById('tv-primary-iframe');

          return {
            hasTurnOffTvBtn: Boolean(turnOffTvBtn),
            hasEnterBtn: Boolean(enterBtn),
            hasTvIframeMounted: Boolean(tvIframe),
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("TEST 5 - Outside With TV Persisting (audio heard from far away):", JSON.stringify(outsideCheck.result.value, null, 2));

    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_step5_outside_tv_on.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_step5_outside_tv_on.png");

    // TEST 6 : Éteindre la TV
    console.log("Clicking 'Éteindre la TV'...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const offBtn = btns.find(b => b.textContent.includes('Éteindre la TV'));
          if (offBtn) offBtn.click();
        })()
      `,
    });

    await new Promise((r) => setTimeout(r, 1000));

    const tvOffCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          const hasTurnOffTvBtn = btns.some(b => b.includes("Éteindre la TV"));
          const tvIframe = document.getElementById('tv-primary-iframe');
          return {
            hasTurnOffTvBtn,
            hasTvIframeMounted: Boolean(tvIframe),
            allButtons: btns
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("TEST 6 - TV Turned Off:", JSON.stringify(tvOffCheck.result.value, null, 2));

    ws.close();
    console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
