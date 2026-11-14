import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createCdp, evaluate, waitForJson, waitForPageCondition } from "./browser-helpers.mjs";
import { installTestYouTube } from "./media-playback-checks.mjs";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const output = resolve(process.env.BUS_VISUAL_OUTPUT ?? "/tmp/lesfousdubus-immersive-place");
const profile = `/tmp/bus-immersive-place-${process.pid}`;
const port = Number(process.env.CDP_PORT ?? 9480);
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH ?? "/usr/bin/google-chrome", [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--no-sandbox", "--disable-dev-shm-usage",
  "--disable-background-networking", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio", "about:blank",
], { stdio: "ignore" });
let ws, send;
const report = { checks: [], viewports: [], errors: [], fixture: true };
try {
  const tabs = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  ws = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  send = createCdp(ws);
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 45_000);
  const clickText = text => run(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().endsWith(${JSON.stringify(text)})&&!b.disabled&&!b.closest('[inert]'));if(!b)throw new Error('Missing button '+${JSON.stringify(text)});b.click();})()`);
  const click = selector => run(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const escape = async () => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape" }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape" }); };
  const capture = async name => { const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(`${output}/${name}.png`, Buffer.from(shot.data, "base64")); };
  await send("Page.enable"); await send("Runtime.enable");
  ws.addEventListener("message", event => { const message = JSON.parse(event.data); if(message.method==="Runtime.exceptionThrown")report.errors.push(message.params.exceptionDetails.text); });
  await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 4 });
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.setEmulatedMedia", { features: [{name:"prefers-reduced-motion",value:"reduce"}] });
  await send("Emulation.setDeviceMetricsOverride", { width:1240,height:900,deviceScaleFactor:1,mobile:false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    localStorage.setItem('fdb-visitor','immersive-place-fixture');
    window.placeFixture={count:2,revision:1,calls:[],deleteAttempts:0};
    const nativeFetch=fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.href);
      if(url.origin!==location.origin||!url.pathname.startsWith('/api/bus-entries'))return nativeFetch(input,init);
      const f=window.placeFixture,method=(init?.method??'GET').toUpperCase();f.calls.push(method);
      if(method==='DELETE'&&++f.deleteAttempts===1)return new Promise(resolve=>setTimeout(()=>resolve(new Response('{}',{status:503})),350));
      if(method==='DELETE'){f.count=1;f.revision++;}
      const mine=f.count===2?{seatIndex:0,displayName:'Test immersion',comment:'Profil de test',avatarId:'zoro'}:null;
      return Promise.resolve(new Response(JSON.stringify({count:f.count,seatCapacity:2,profileRevision:f.revision,vacantSeatRanges:f.count===1?[[0,1,1]]:[],passengers:mine?[mine]:[],passenger:mine,seatIndex:mine?0:null,added:false,removed:method==='DELETE',nextFrom:2,hasMore:false}),{headers:{'Content-Type':'application/json'}}));
    };
  ` });
  await send("Page.navigate", { url: baseUrl });
  await wait("document.querySelector('.bus-app')?.dataset.sceneAvailable==='true'&&Boolean(mediaTestPlayers.background)", "Scene and music ready");
  await click('button[aria-label^="Activer la musique de fond"]');
  await wait("mediaTestPlayers.background.state===1&&!mediaTestPlayers.background.muted", "Music active before immersion");
  const checkImmersion = async (width, height) => {
    const before = await run("({phase:document.querySelector('.bus-app').dataset.phase,time:mediaTestPlayers.music.getCurrentTime(),tvOn:document.querySelector('.bus-app').dataset.tvOn==='true',tv:mediaTestPlayers.bus?.state})");
    await click('button[aria-label="Activer le mode immersif"]');
    await wait("Boolean(document.querySelector('[data-immersive=true][inert][aria-hidden=true]'))", "HUD hidden from pointer and keyboard");
    const bounds = await run(`(()=>{const b=document.querySelector('button[aria-label^="Quitter le mode immersif"]'),r=b.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,focused:document.activeElement===b,phase:document.querySelector('.bus-app').dataset.phase,tv:mediaTestPlayers.bus?.state};})()`);
    assert(bounds.focused&&bounds.left>=0&&bounds.right<=width&&bounds.top>=0&&bounds.bottom<=height, "Restore control stays visible, touch sized and focused");
    assert.equal(bounds.phase,before.phase);
    if(before.tvOn) assert.equal(bounds.tv,before.tv);
    else assert.equal(await run("mediaTestPlayers.music.state===1&&!mediaTestPlayers.music.muted"),true,"Immersion preserves active music");
    await capture(`immersif-${before.phase}-${width}x${height}`);
    await escape();
    await wait("Boolean(document.querySelector('[data-immersive=false]:not([inert])'))", "Escape restores controls");
    await wait("document.activeElement?.getAttribute('aria-label')==='Activer le mode immersif'", "Focus returns after the restored HUD is painted");
    await click('button[aria-label="Activer le mode immersif"]');
    await click('button[aria-label^="Quitter le mode immersif"]');
    await wait("Boolean(document.querySelector('[data-immersive=false]'))", "Touch/click also restores controls");
    report.viewports.push({width,height,...bounds});
  };
  await click('.bus-music-playback button');
  await checkImmersion(1240,900);
  if(await run("Boolean(document.querySelector('[aria-label=\"Progression de la musique\"]'))")) await escape();
  await clickText("Entrer dans le bus");
  await wait("document.querySelector('.bus-app').dataset.phase==='inside'", "Returning visitor boards");
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Ma place')", "Saved place is directly discoverable");
  for (const viewport of [{width:1240,height:900,mobile:false},{width:320,height:568,mobile:true},{width:568,height:320,mobile:true}]) {
    await send("Emulation.setDeviceMetricsOverride", {...viewport,deviceScaleFactor:1});
    await wait(`innerWidth===${viewport.width}&&innerHeight===${viewport.height}`, "Viewport changes");
    await run("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    assert.equal(await run("document.documentElement.scrollWidth>innerWidth"),false);
    const layout = await run(`(()=>{const buttons=[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return !b.closest('[inert],[aria-hidden=true]')&&r.width>0&&s.visibility!=='hidden'&&Number(s.opacity)>.01;});return {small:buttons.filter(b=>b.getBoundingClientRect().width<42||b.getBoundingClientRect().height<42).map(b=>b.textContent.trim()),overlap:buttons.flatMap((a,i)=>buttons.slice(i+1).filter(b=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2;}).map(b=>[a.textContent.trim(),b.textContent.trim()]))};})()`);
    assert.deepEqual(layout,{small:[],overlap:[]},"Visible controls keep usable targets without collisions");
    await capture(`commandes-${viewport.width}x${viewport.height}`);
    await checkImmersion(viewport.width,viewport.height);
    await clickText("Ma place");
    await wait("document.activeElement?.id==='manage-place-title'", "Place dialog focuses title");
    assert((await run("document.querySelector('[role=dialog]').innerText")).includes("Le compteur ne change pas"));
    const fit = await run("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()");assert(fit,"Place dialog fits viewport");
    await clickText("Supprimer ma place");
    await wait("Boolean(document.querySelector('[role=alertdialog]'))", "Deletion requires a distinct confirmation");
    await capture(`suppression-${viewport.width}x${viewport.height}`);
    await escape();await wait("Boolean(document.querySelector('[role=dialog]'))", "Escape cancels deletion");
    await escape();await wait("!document.querySelector('[aria-modal=true]')", "Escape closes place management");
  }
  assert.equal(await run("placeFixture.deleteAttempts"),0,"Inspecting and canceling never deletes the profile");
  await clickText("Ma place");await clickText("Sortir en gardant ma place");
  await wait("document.querySelector('.bus-app').dataset.phase==='outside'", "Ordinary exit finishes");
  assert.equal(await run("placeFixture.count"),2);assert.equal(await run("placeFixture.deleteAttempts"),0);
  await clickText("Ma place");await clickText("Supprimer ma place");
  await clickText("Confirmer la suppression");
  await wait("Boolean(document.querySelector('[role=alert]'))", "Delete failure is recoverable");
  assert.equal(await run("placeFixture.count"),2);
  await clickText("Confirmer la suppression");
  await wait("!document.querySelector('[aria-modal=true]')&&placeFixture.count===1", "Retry deletes fixture place and closes dialog");
  assert.equal(await run("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Ma place')"),false);
  assert.deepEqual(report.errors,[]);
  report.checks.push("Immersion outside/inside preserves media and camera phase; Escape and touch restore focus on desktop, narrow mobile and landscape.","Place management explains retention; canceled deletion and ordinary exit keep registration; deletion errors retry safely.");
  report.apiCalls=await run("placeFixture.calls");
  await writeFile(`${output}/immersive-place.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} catch(error) {
  report.error=String(error.stack??error);
  await writeFile(`${output}/immersive-place.json`,JSON.stringify(report,null,2));
  throw error;
} finally {ws?.close();chrome.kill("SIGTERM");await rm(profile,{recursive:true,force:true}).catch(()=>{});}
