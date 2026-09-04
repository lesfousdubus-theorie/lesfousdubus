const { spawn } = require("child_process");
const fs = require("fs");

async function run() {
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

    // 1. Outside Front 3/4 View (Day)
    await new Promise((r) => setTimeout(r, 3500));
    let snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/outside-front-day.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/outside-front-day.png");

    // 2. Toggle Headlights
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const hlBtn = btns.find(b => b.textContent.includes('phares') || b.textContent.includes('Phares'));
          if (hlBtn) hlBtn.click();
        })()
      `,
    });
    await new Promise((r) => setTimeout(r, 1000));
    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/outside-headlights.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/outside-headlights.png");

    // 3. Enter Bus
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const enterBtn = btns.find(b => b.textContent.includes('Entrer'));
          if (enterBtn) enterBtn.click();
        })()
      `,
    });
    await new Promise((r) => setTimeout(r, 3500));
    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/inside-bus-tv.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/inside-bus-tv.png");

    // 4. Click Plein écran TV
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const fsBtn = btns.find(b => b.textContent.includes('Plein') || b.textContent.includes('plein'));
          if (fsBtn) fsBtn.click();
        })()
      `,
    });
    await new Promise((r) => setTimeout(r, 1500));
    snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/fullscreen-tv.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/fullscreen-tv.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
