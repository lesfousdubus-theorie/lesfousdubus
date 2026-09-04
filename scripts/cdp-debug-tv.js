const { spawn } = require("child_process");

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

  await new Promise((r) => setTimeout(r, 2000));

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
    await new Promise((r) => setTimeout(r, 3000));

    // Click "Entrer dans le bus"
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

    const info = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const el = document.getElementById('tv-frame');
          if (!el) return { found: false };
          const r = el.getBoundingClientRect();
          const p = el.parentElement;
          const pr = p ? p.getBoundingClientRect() : null;
          const pp = p ? p.parentElement : null;
          const ppr = pp ? pp.getBoundingClientRect() : null;
          const iframe = el.querySelector('iframe');
          const ir = iframe ? iframe.getBoundingClientRect() : null;
          return {
            found: true,
            elRect: { x: r.x, y: r.y, w: r.width, h: r.height },
            parentStyle: p?.getAttribute('style'),
            grandParentStyle: pp?.getAttribute('style'),
            iframeRect: ir ? { x: ir.x, y: ir.y, w: ir.width, h: ir.height } : null,
            canvasZIndex: window.getComputedStyle(document.querySelector('canvas')).zIndex,
            canvasStyle: document.querySelector('canvas')?.getAttribute('style')
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TV FRAME DEBUG INFO:", JSON.stringify(info.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
