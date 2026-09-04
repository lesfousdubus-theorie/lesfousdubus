const { spawn } = require("child_process");
const fs = require("fs");

async function run() {
  console.log("Starting Chrome Headless to test Long Bus with Multiple TVs...");
  const chrome = spawn(
    "/usr/bin/google-chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--no-sandbox",
      "--window-size=1280,800",
      "http://localhost:3000?count=40&phase=inside&row=5",
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
    await new Promise((r) => setTimeout(r, 4500));

    const check = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const countEl = document.querySelector('.tabular-nums');
          const countVal = countEl ? countEl.textContent.trim() : null;
          const rowsBadge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('rangées'))?.textContent.trim();
          const iframes = document.querySelectorAll('iframe');
          return {
            countVal,
            rowsBadge,
            iframeCount: iframes.length,
            iframes: Array.from(iframes).map(f => ({ id: f.id, class: f.className, src: f.src }))
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("LONG BUS TEST RESULTS:", JSON.stringify(check.result.value, null, 2));

    let snap = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/tmp/verify_long_bus_row5.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/verify_long_bus_row5.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
