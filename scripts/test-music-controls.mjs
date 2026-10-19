import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createCdp, evaluate, waitForJson, waitForPageCondition } from "./browser-helpers.mjs";
import { installTestYouTube } from "./media-playback-checks.mjs";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const output = resolve(process.env.BUS_VISUAL_OUTPUT ?? "/tmp/lesfousdubus-music-controls");
const profile = `/tmp/bus-music-controls-${process.pid}`;
const port = Number(process.env.CDP_PORT ?? 9456);
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH ?? "/usr/bin/google-chrome", [
  "--headless=new", `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--no-sandbox",
  "--disable-dev-shm-usage", "--disable-background-networking", "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader", "--mute-audio", "about:blank",
], { stdio: "ignore" });
let ws, send;
const report = { checks: [], samples: [], errors: [], media: "Controlled YouTube API; silent warmup and native seek interactions." };
try {
  const tabs = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  ws = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  send = createCdp(ws);
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 45_000);
  const nativeClick = async selector => {
    const point = await run(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>!b.disabled&&!b.closest('[aria-hidden="true"]')&&b.getBoundingClientRect().width>0); if (!b) throw new Error('Unavailable control: ' + ${JSON.stringify(selector)}); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
  };
  const capture = async filename => {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(`${output}/${filename}`, Buffer.from(shot.data, "base64"));
  };
  await send("Page.enable"); await send("Runtime.enable");
  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") report.errors.push(message.params.exceptionDetails.text);
  });
  await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 4 });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    window.musicSnapshots = [];
    window.addEventListener('bus-music-playback', event => { window.musicSnapshots.push(event.detail); if(musicSnapshots.length>80)musicSnapshots.shift(); });
    const nativeFetch=fetch.bind(window); window.fetch=(input,init)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.href);
      if(url.origin===location.origin&&url.pathname.startsWith('/api/bus-entries'))return Promise.resolve(new Response(JSON.stringify({count:0,seatCapacity:0,profileRevision:1,vacantSeatRanges:[],passengers:[],nextFrom:0,hasMore:false}),{headers:{'Content-Type':'application/json'}}));
      return nativeFetch(input,init);
    };
  ` });
  await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=0` });
  await wait("document.querySelector('.bus-app')?.dataset.sceneAvailable==='true'&&Boolean(mediaTestPlayers.background)&&Boolean(mediaTestPlayers.party)&&Boolean(document.querySelector('.bus-music-playback button'))", "Scene and both independent song players ready");
  await wait("[mediaTestPlayers.background,mediaTestPlayers.party].every(p=>p.state===2&&p.muted&&p.getCurrentTime()===0)", "Both songs warm silently and park at zero");
  const warmup = await run("[mediaTestPlayers.background,mediaTestPlayers.party].map(p=>({videoId:p.videoId,commands:p.commands}))");
  for (const slot of warmup) {
    assert(slot.commands.find(command => command.command === 'play')?.muted, 'Every pre-click warmup must be muted.');
    assert(!slot.commands.some(command => ['load','cue'].includes(command.command)), 'A song must be mounted at its final ID.');
  }
  report.checks.push("Both persistent song players prepare a muted buffer and return to zero before any click.");
  await nativeClick('button[aria-label^="Activer la musique de fond"]');
  await wait("mediaTestPlayers.background.state===1&&!mediaTestPlayers.background.muted&&mediaTestPlayers.background.volume===85", "Background starts from native click");
  await nativeClick('.bus-music-playback button');
  await wait("Boolean(document.querySelector('[aria-label=\"Position dans Life in Pieces\"]'))", "Current title and progress panel opens");
  for (const viewport of [{ width: 1440, height: 900, mobile: false }, { width: 320, height: 568, mobile: true }, { width: 568, height: 320, mobile: true }]) {
    await send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1 });
    await wait(`(()=>{const p=document.querySelector('[aria-label="Progression de la musique"]');if(!p)return false;const r=p.getBoundingClientRect();return innerWidth===${viewport.width}&&innerHeight===${viewport.height}&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()`, `Music details settle inside ${viewport.width}×${viewport.height}`);
    await run("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    const bounds = await run("(()=>{const p=document.querySelector('[aria-label=\"Progression de la musique\"]'),r=p.getBoundingClientRect(),input=p.querySelector('input');return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,disabled:input.disabled,rangeHeight:input.getBoundingClientRect().height}})()");
    const sample = { viewport, bounds };
    report.samples.push(sample);
    assert(bounds.left >= 0 && bounds.right <= viewport.width && bounds.top >= 0 && bounds.bottom <= viewport.height, `Music details fit ${viewport.width}×${viewport.height}.`);
    assert(bounds.rangeHeight >= 44 && !bounds.disabled, 'The seek control has a usable touch target.');
    const point = await run("(()=>{const r=document.querySelector('[aria-label=\"Position dans Life in Pieces\"]').getBoundingClientRect();return {x:r.left+r.width*.35,y:r.top+r.height/2}})()");
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
    await wait("mediaTestPlayers.background.getCurrentTime()>150&&mediaTestPlayers.background.getCurrentTime()<260", "Native seek changes actual player position");
    await wait("Number(document.querySelector('[aria-label=\"Position dans Life in Pieces\"]').value)>150", "Seek position persists through progress polls");
    sample.time = await run("mediaTestPlayers.background.getCurrentTime()");
    await capture(`music-${viewport.width}.png`);
  }
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape" });
  await wait("!document.querySelector('[aria-label=\"Progression de la musique\"]')", "Escape closes music details");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await run("window.dispatchEvent(new CustomEvent('bus-music-seek',{detail:{track:'background',seconds:42}}))");
  await wait("mediaTestPlayers.background.getCurrentTime()>=42&&mediaTestPlayers.background.getCurrentTime()<44", "Typed seek channel changes background position");
  await nativeClick('button[aria-label="Lancer la fête"]');
  await wait("document.querySelector('.bus-app').dataset.party==='true'&&mediaTestPlayers.party.state===1&&!mediaTestPlayers.party.muted&&mediaTestPlayers.background.state===2&&mediaTestPlayers.background.muted", "Preloaded party takes audio without overlap");
  await wait("musicSnapshots.at(-1)?.track==='party'&&musicSnapshots.at(-1)?.title==='Party At Baratie'", "Party title replaces background title");
  const backgroundTime = await run("mediaTestPlayers.background.getCurrentTime()");
  await run("window.dispatchEvent(new CustomEvent('bus-music-seek',{detail:{track:'background',seconds:100}}))");
  assert.equal(await run("mediaTestPlayers.background.getCurrentTime()"), backgroundTime, 'A stale seek cannot affect the previous song.');
  await run("window.dispatchEvent(new CustomEvent('bus-music-seek',{detail:{track:'party',seconds:9}}))");
  await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "Party seek samples actual dance timing");
  await run("window.dispatchEvent(new CustomEvent('bus-tv-audio-focus',{detail:true}))");
  await wait("mediaTestPlayers.party.state===2&&mediaTestPlayers.party.muted&&musicSnapshots.at(-1)?.state==='suspended'", "Video focus suspends party music and progress state");
  await run("window.dispatchEvent(new CustomEvent('bus-music-seek',{detail:{track:'party',seconds:4}}))");
  assert.equal(await run("mediaTestPlayers.party.state===2&&mediaTestPlayers.party.muted"), true, 'Seeking a suspended song cannot acquire audio.');
  await run("window.dispatchEvent(new CustomEvent('bus-tv-audio-focus',{detail:false}))");
  await wait("mediaTestPlayers.party.state===1&&!mediaTestPlayers.party.muted", "Video releases music");
  await nativeClick('button[aria-label="Arrêter la fête"]');
  await wait("document.querySelector('.bus-app').dataset.party==='false'&&mediaTestPlayers.background.state===1&&mediaTestPlayers.party.state===2&&mediaTestPlayers.party.muted", "Background resumes after party");
  assert((await run("mediaTestPlayers.background.getCurrentTime()")) >= backgroundTime, 'Background keeps its own position through the party.');
  await run("mediaTestPlayers.party.options.events.onError({target:mediaTestPlayers.party,data:150})");
  assert.equal(await run("mediaTestPlayers.background.state===1&&!mediaTestPlayers.background.muted"), true, 'An inactive song error cannot stop the active song.');
  assert.equal(await run("[mediaTestPlayers.background,mediaTestPlayers.party].flatMap(p=>p.commands).some(c=>['load','cue'].includes(c.command))"), false, 'No click switches a video ID or starts a new load.');
  report.checks.push("Desktop/mobile title, elapsed/duration and native seek; stale-track isolation; party intro; video priority; background position and inactive errors.");
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/music-controls.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = String(error.stack ?? error);
  if (send) {
    report.failureState = await evaluate(send, `(()=>{const p=document.querySelector('[aria-label="Progression de la musique"]');return {viewport:[innerWidth,innerHeight],panel:p?.getBoundingClientRect().toJSON(),panelStyle:p?.getAttribute('style'),hud:document.querySelector('[data-bottom-layout]')?.getAttribute('style'),partyControls:[...document.querySelectorAll('button[aria-label*="la fête"]')].map(b=>({label:b.getAttribute('aria-label'),disabled:b.disabled,hidden:Boolean(b.closest('[aria-hidden="true"]')),rect:b.getBoundingClientRect().toJSON()}))}})()`).catch(() => null);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).catch(() => null);
    if (shot) await writeFile(`${output}/music-failure.png`, Buffer.from(shot.data, "base64"));
  }
  await writeFile(`${output}/music-controls.json`, JSON.stringify(report, null, 2) + "\n");
  throw error;
} finally {
  ws?.close(); chrome.kill("SIGTERM");
  await rm(profile, { recursive: true, force: true }).catch(() => undefined);
}
