// Shared Chrome DevTools transport and bounded browser assertions for isolated test profiles.
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForJson(url, attempts = 120) {
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

export function createCdp(ws) {
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

export async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Runtime evaluation failed.");
  return result.result?.value;
}

export async function waitForPageCondition(send, expression, label, timeoutMs = 8_000) {
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
