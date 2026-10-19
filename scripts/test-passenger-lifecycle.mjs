import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createCdp, evaluate, waitForJson, waitForPageCondition } from "./browser-helpers.mjs";
import { installTestYouTube } from "./media-playback-checks.mjs";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const baseline = process.env.BUS_LIFECYCLE_BASELINE === "1";
const output = resolve(process.env.BUS_VISUAL_OUTPUT ?? "/tmp/lesfousdubus-passenger-lifecycle");
const port = Number(process.env.CDP_PORT ?? 9478);
const profile = `/tmp/bus-passenger-lifecycle-${process.pid}`;
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH ?? "/usr/bin/google-chrome", [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--no-sandbox", "--disable-dev-shm-usage",
  "--disable-background-networking", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio", "about:blank",
], { stdio: "ignore" });
let ws;
const report = { baseUrl, baseline, scenarios: [], failures: [] };
const check = (condition, message) => {
  if (!condition) report.failures.push(message);
  if (!baseline) assert(condition, message);
};
try {
  const tabs = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  ws = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  const send = createCdp(ws), run = expression => evaluate(send, expression);
  const wait = (expression, message) => waitForPageCondition(send, expression, message, 60_000);
  const capture = async name => { const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(`${output}/${name}.png`, Buffer.from(shot.data, "base64")); };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 4 });
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  // Only this isolated page gets renderer access and fixture visitor responses.
  // No join, leave, or profile request can reach the real passenger database.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    const roots = new Map(); let rendererId = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {supportsFiber:true,renderers:new Map(),
      inject(renderer){const id=++rendererId;this.renderers.set(id,renderer);return id;},
      onCommitFiberRoot(id,root){roots.set(id,root);},onCommitFiberUnmount(){}};
    const find = predicate => {for(const root of roots.values()){const queue=[root.current];while(queue.length){const f=queue.pop();if(!f)continue;const result=predicate(f);if(result)return result;queue.push(f.child,f.sibling);}}return null;};
    let store, journey;
    window.lifecycleScene=()=>{store??=find(f=>{const s=f.memoizedProps?.store??f.memoizedProps?.value;if(typeof s?.getState==='function'&&s.getState().scene?.getObjectByName('bus-vehicle'))return s;});return store?.getState();};
    window.lifecycleJourney=()=>{journey??=find(f=>{const j=f.memoizedProps?.journey;if(j?.current?.position?.isVector3)return j;});return journey?.current;};
    const scenario=new URLSearchParams(location.search).get('lifecycle');
    const existing=scenario!=='new', mine=existing?0:2;
    const visitorId='lifecycle-fixture-'+scenario;
    localStorage.setItem('fdb-visitor',visitorId);localStorage.setItem('fdb-avatar-id','zoro');
    window.lifecycleFixture={joined:existing,mine,calls:[]};
    const mineProfile={seatIndex:mine,displayName:'Visiteur test',comment:null,avatarId:'zoro'};
    const nativeFetch=fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.href);
      if(url.origin!==location.origin||!url.pathname.startsWith('/api/bus-entries'))return nativeFetch(input,init);
      const fixture=window.lifecycleFixture,method=(init?.method??'GET').toUpperCase();fixture.calls.push(method);
      if(!['GET','HEAD','POST'].includes(method))throw new Error('Lifecycle fixture blocks this write');
      const response=added=>{const count=existing?2:fixture.joined?3:2;const passengers=[{seatIndex:1,displayName:'Voisin',comment:null,avatarId:'nami'},...(fixture.joined?[mineProfile]:[])];return new Response(JSON.stringify({count,seatCapacity:count,profileRevision:fixture.joined?2:1,vacantSeatRanges:[],passengers,passenger:fixture.joined?mineProfile:null,seatIndex:fixture.joined?mine:null,added}),{headers:{'Content-Type':'application/json'}});};
      if(method==='POST'){const added=!fixture.joined;return new Promise(resolve=>setTimeout(()=>{fixture.joined=true;resolve(response(added));},650));}
      return Promise.resolve(response(false));
    };
    window.lifecycleRead=()=>{
      const s=lifecycleScene(),j=lifecycleJourney();if(!s||!j)return null;
      const visible=n=>{for(let p=n;p;p=p.parent)if(!p.visible)return false;return true;};
      const seated=s.scene.getObjectByName('bus-seated-passengers'),avatar=s.scene.getObjectByName('bus-boarding-avatar');
      let staticOwn=0;
      for(const n of seated?.children??[]){
        if(visible(n)&&n.userData.passengerKind==='visitor'&&n.userData.seatIndex===mine)staticOwn++;
        if(visible(n)&&n.name==='bus-distant-passenger-bodies')staticOwn+=(n.userData.occupants??[]).filter(o=>o.seatIndex===mine).length;
      }
      const animatedOwn=avatar?.userData.seatIndex===mine&&visible(avatar)?1:0;
      return {phase:document.querySelector('.bus-app')?.dataset.phase,journeyPhase:j.phase,frame:s.gl.info.render.frame,staticOwn,animatedOwn,totalOwn:staticOwn+animatedOwn,waiting:j.waitingForSeat,entryFromSeat:j.entryFromSeat??false,walking:j.walking,sitting:j.sitting,elapsed:j.elapsed,position:j.position.toArray(),seat:[j.seatX,.64,j.seatZ]};
    };
    window.lifecycleSamples=[];
    let previousFrame=-1;
    const sample=()=>{const s=lifecycleRead();if(s&&s.frame!==previousFrame){previousFrame=s.frame;window.lifecycleSamples.push(s);}requestAnimationFrame(sample);};requestAnimationFrame(sample);
  ` });
  const selected = process.env.BUS_LIFECYCLE_SCENARIOS?.split(",");
  const scenarios = baseline ? [{id:"returning",width:1240,height:900,reduced:false}] : [
    {id:"returning",width:1240,height:900,reduced:false},
    {id:"new",width:393,height:852,reduced:false},
    {id:"reduced",width:393,height:852,reduced:true},
  ].filter(scenario => !selected || selected.includes(scenario.id));
  assert(scenarios.length>0,"Select at least one lifecycle scenario: returning, new, reduced.");
  for (const scenario of scenarios) {
    await send("Emulation.setDeviceMetricsOverride", { width:scenario.width,height:scenario.height,deviceScaleFactor:1,mobile:scenario.width<600 });
    await send("Emulation.setEmulatedMedia", { features:[{name:"prefers-reduced-motion",value:scenario.reduced?"reduce":"no-preference"}] });
    await send("Page.navigate", { url:`${baseUrl}/?lifecycle=${scenario.id}` });
    await wait("document.querySelector('.bus-app')?.dataset.sceneAvailable==='true'&&Boolean(lifecycleRead())", "Actual scene and lifecycle fixture ready");
    if (scenario.id!=="new") await wait("lifecycleRead().staticOwn===1", "Existing registered visitor is seated before boarding");
    await capture(`${scenario.id}-before`);
    const enter = async fromSeat => {
      await run("window.lifecycleSamples=[];document.querySelector('button[title=\"Découvrir la théorie des Fous du Bus\"]').blur();[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.textContent.includes('Entrer dans le bus')).click()");
      await wait("lifecycleRead().waiting", "Registration waits without moving existing visitors");
      if(fromSeat) check((await run("lifecycleRead().staticOwn"))===1, "An existing visitor must stay seated while registration is pending.");
      await wait("document.querySelector('.bus-app').dataset.phase==='inside'", "Boarding finishes");
      const samples=await run("lifecycleSamples.filter(s=>s.phase==='entering'&&s.journeyPhase==='entering'&&!s.waiting)");
      check(samples.length>0, "The real renderer must capture boarding frames.");
      if(fromSeat){
        check(samples.every(s=>s.entryFromSeat&&!s.walking&&s.sitting===1&&s.totalOwn===1&&s.position.every((v,i)=>Math.abs(v-s.seat[i])<.001)), "A returning visitor must stay visible in the same seat throughout camera boarding.");
      }else if(!scenario.reduced){check(samples.some(s=>s.walking&&s.position[0]>1.3), "A new or departed visitor must walk back through the door.");}
      check(samples.every(s=>s.totalOwn<=1), "The local visitor must never have two rendered representations.");
      return {frames:samples.length,fromSeat:samples.every(s=>s.entryFromSeat),walked:samples.some(s=>s.walking)};
    };
    const leave = async () => {
      await run("window.lifecycleSamples=[];document.querySelector('button[aria-label=\"Sortir du bus\"]').click()");
      await wait("document.querySelector('.bus-app').dataset.phase==='outside'", "Walking exit completes");
      // Wait for the actual rendered departure, whose capped clock can take
      // longer than 2.5 wall seconds on a slow software WebGL renderer.
      await wait("lifecycleRead().animatedOwn===0", "The departing animated visitor leaves the rendered scene");
      const frame=await run("lifecycleRead().frame");
      await wait(`lifecycleRead().frame>=${frame+3}`, "The outside scene remains stable after departure");
      const samples=await run("lifecycleSamples.filter(s=>s.phase==='outside'&&s.journeyPhase==='outside')");
      const after=await run("lifecycleRead()");
      check(samples.every(s=>s.staticOwn===0), "A departed visitor must never respawn in the seated roster, even during the departure tail.");
      check(samples.every(s=>s.totalOwn<=1), "The exit must never render an animated visitor beside their seated duplicate.");
      check(after.totalOwn===0, "The visitor must stay absent after the departure animation ends.");
      return {frames:samples.length,maximumRepresentations:Math.max(...samples.map(s=>s.totalOwn)),after};
    };
    const result={...scenario,firstEntry:await enter(scenario.id!=="new"),firstExit:await leave()};
    await capture(`${scenario.id}-after-exit`);
    if(scenario.id==="returning"&&!baseline){result.reentry=await enter(false);result.secondExit=await leave();}
    report.scenarios.push(result);
    console.log(`Lifecycle: ${scenario.id} ${scenario.width}x${scenario.height} finished.`);
  }
  if(baseline) assert(report.failures.length>=2,"The baseline must reproduce both reported defects.");
  await writeFile(`${output}/lifecycle.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({baseline,scenarios:report.scenarios.map(s=>({id:s.id,firstEntry:s.firstEntry,afterExit:s.firstExit.after.totalOwn,reentry:s.reentry})),failures:report.failures}));
} catch(error) {report.error=String(error.stack??error);await writeFile(`${output}/lifecycle.json`,JSON.stringify(report,null,2));throw error;}
finally {ws?.close();chrome.kill('SIGTERM');await rm(profile,{recursive:true,force:true}).catch(()=>{});}
