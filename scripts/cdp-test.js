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

    // Listen for console logs
    ws.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);
      if (data.method === "Runtime.consoleAPICalled") {
        console.log("[PAGE CONSOLE]", data.params.type, data.params.args.map(a => a.value || a.description).join(" "));
      }
    });
    await send("Runtime.enable");

    // Wait 3s
    await new Promise((r) => setTimeout(r, 3000));

    // Click "Entrer dans le bus" button
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const enterBtn = btns.find(b => b.textContent.includes('Entrer'));
          if (enterBtn) enterBtn.click();
        })()
      `,
    });

    // Wait 4s for inside transition
    await new Promise((r) => setTimeout(r, 4000));

    // Inspect iframes
    const iframes = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const frames = Array.from(document.querySelectorAll('iframe'));
          return frames.map(f => ({
            src: f.src,
            width: f.offsetWidth,
            height: f.offsetHeight,
            visible: f.offsetParent !== null,
            rect: f.getBoundingClientRect()
          }));
        })()
      `,
      returnByValue: true,
    });
    console.log("IFRAMES IN DOM:", JSON.stringify(iframes.result.value, null, 2));

    // Check Html wrapper element
    const htmlWrappers = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const el = document.getElementById('tv-frame');
          if (!el) return { found: false };
          return {
            found: true,
            parentClass: el.parentElement?.className,
            parentStyle: el.parentElement?.getAttribute('style'),
            rect: el.getBoundingClientRect(),
            computedZIndex: window.getComputedStyle(el.parentElement || el).zIndex
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("TV FRAME ELEMENT:", JSON.stringify(htmlWrappers.result.value, null, 2));

    const snap = await send("Page.captureScreenshot", { format: "png" });
    require("fs").writeFileSync("/tmp/inside-view-2.png", Buffer.from(snap.data, "base64"));
    console.log("Saved /tmp/inside-view-2.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
