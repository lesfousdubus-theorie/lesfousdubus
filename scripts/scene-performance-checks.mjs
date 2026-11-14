import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** Même vue et même population avant/après, dans une page isolée sans écriture en base. */
export async function runScenePerformanceChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", {source: `
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(url.origin===location.origin && url.pathname==='/api/bus-entries' && (!init?.method || init.method==='GET'))
        return Promise.resolve(new Response(JSON.stringify({count:16,seatCapacity:16,profileRevision:1,vacantSeatRanges:[],passengers:[]}),{headers:{'Content-Type':'application/json'}}));
      return nativeFetch(input,init);
    };
  `});
  try {
    await send("Emulation.setHardwareConcurrencyOverride", {hardwareConcurrency:8});
    await send("Emulation.setDeviceMetricsOverride", {width:1000,height:700,deviceScaleFactor:1,mobile:false});
    await send("Page.navigate", {url:`${baseUrl}/?count=16`});
    await waitForPageCondition(send, `Boolean(window.busCameraTestState()?.scene.getObjectByName('nakama-buggy-15'))`, "Performance scene loads", 30_000);
    await evaluate(send, `new Promise(resolve=>setTimeout(resolve,6000))`);
    const report=await evaluate(send, `new Promise(resolve=>{
      const s=window.busCameraTestState(), start=performance.now(), frame=s.gl.info.render.frame;
      const gaps=[], calls=[], triangles=[], tasks=[];let last=start,lastFrame=frame;
      const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(entry=>entry.duration)));
      observer.observe({type:'longtask'});
      const tick=now=>{
        gaps.push(now-last);last=now;
        if(s.gl.info.render.frame!==lastFrame){lastFrame=s.gl.info.render.frame;calls.push(s.gl.info.render.calls);triangles.push(s.gl.info.render.triangles);}
        if(now-start<8000){requestAnimationFrame(tick);return;}
        observer.disconnect();gaps.sort((a,b)=>a-b);
        const context=s.gl.getContext(), debug=context.getExtension('WEBGL_debug_renderer_info');
        const average=values=>values.reduce((a,b)=>a+b,0)/Math.max(values.length,1);
        resolve({viewport:[s.size.width,s.size.height],frames:lastFrame-frame,elapsedMs:now-start,
          fps:(lastFrame-frame)*1000/(now-start),drawCalls:average(calls),triangles:average(triangles),
          p95FrameGapMs:gaps[Math.floor(gaps.length*.95)],maxFrameGapMs:gaps.at(-1),longTasks:tasks.length,
          maxLongTaskMs:Math.max(0,...tasks),dpr:s.viewport.dpr,geometries:s.gl.info.memory.geometries,
          textures:s.gl.info.memory.textures,renderer:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unknown'});
      };requestAnimationFrame(tick);
    })`);
    assert(report.frames>0,"The scene must keep rendering throughout the performance sample.");
    const frame=await evaluate(send, `window.busCameraTestState().gl.info.render.frame`);
    await evaluate(send, `document.querySelector('button[aria-label="Klaxonner"]:not([disabled])').click()`);
    await waitForPageCondition(send, `window.busCameraTestState().gl.info.render.frame>${frame+1}`, "Rendering continues after a HUD update", 15_000);
    report.dprAfterInteraction=await evaluate(send, `window.busCameraTestState().viewport.dpr`);
    assert(report.dprAfterInteraction<=report.dpr+.02,"HUD updates must preserve the adaptive pixel density.");
    console.log("Scene performance:",JSON.stringify(report));
    if(process.env.SCENE_PERFORMANCE_OUTPUT){
      const path=resolve(process.env.SCENE_PERFORMANCE_OUTPUT);await mkdir(dirname(path),{recursive:true});
      await writeFile(path,JSON.stringify(report,null,2)+"\n");
    }
  } finally { await send("Page.removeScriptToEvaluateOnNewDocument", {identifier:injection.identifier}); }
}
