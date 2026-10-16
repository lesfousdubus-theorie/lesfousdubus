import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { installTestYouTube, runMediaPlaybackChecks } from "./media-playback-checks.mjs";

// Real controls, animation and React player; only the remote YouTube API is
// replaced so we can observe commands and repeat buffering/autoplay failures.
export async function runBusPlaybackZoomChecks({send, evaluate, waitForPageCondition, baseUrl, checkZoom = process.env.BUS_CAMERA_CHECKS !== "playback"}) {
  const run = expression => evaluate(send, expression);
  const wait = (expression, label, timeout = 30_000) => waitForPageCondition(send, expression, label, timeout);
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", {source:`(${installTestYouTube.toString()})()`});
  const directory = process.env.BUS_VISUAL_OUTPUT;
  if (directory) await mkdir(directory, {recursive:true});
  let visitor;
  const distance = () => run(`(() => {const s=window.busCameraTestState();return s.camera.position.distanceTo(s.controls.target);})()`);
  const reset = async () => {
    await run(`document.querySelector('button[aria-label="Recentrer la vue"]').click()`);
    await wait(`window.busCameraTestState()?.controls?.enabled === false`, "Recentre starts");
    await wait(`window.busCameraTestState()?.controls?.enabled === true`, "Recentre finishes");
  };
  const screenshot = async name => {
    if (!directory) return;
    const shot = await send("Page.captureScreenshot", {format:"png",captureBeyondViewport:false});
    await writeFile(resolve(directory,name),Buffer.from(shot.data,"base64"));
  };
  try {
    await send("Emulation.setDeviceMetricsOverride", {width:1240,height:900,deviceScaleFactor:1,mobile:false});
    await send("Page.navigate", {url:`${baseUrl}/?count=2`});
    await wait(`Boolean(window.busCameraTestState()?.controls) && window.mediaTestPlayers?.bus?.state === 2`, "Scene and paused bus player ready");
    if (checkZoom) {
    const initial = await distance();
    const target = await run(`window.busCameraTestState().controls.target.toArray()`);
    for (let i=0;i<55;i++) await send("Input.dispatchMouseEvent",{type:"mouseWheel",x:870,y:430,deltaX:0,deltaY:200});
    await wait(`window.busCameraTestState().camera.position.distanceTo(window.busCameraTestState().controls.target)>139`, "Large off-centre zoom out reaches maximum");
    for (let i=0;i<110;i++) await send("Input.dispatchMouseEvent",{type:"mouseWheel",x:440,y:430,deltaX:0,deltaY:-200});
    await wait(`window.busCameraTestState().camera.position.distanceTo(window.busCameraTestState().controls.target)<1.1`, "Zoom returns close to the bus");
    assert((await distance())<initial/4,"After the maximum retreat, zoom must reach beyond the initial close view.");
    const returnedTarget=await run(`window.busCameraTestState().controls.target.toArray()`);
    assert(returnedTarget.every((value,i)=>Math.abs(value-target[i])<0.001),"Off-centre wheel zoom must keep its anchor on the bus.");
    console.log("Desktop: maximum 140-unit retreat returns to within 1.1 units, with a fixed bus anchor.");

    await send("Emulation.setDeviceMetricsOverride",{width:393,height:852,deviceScaleFactor:1,mobile:true});
    await reset();
    const portrait = await distance();
    const portraitTarget=await run(`window.busCameraTestState().controls.target.toArray()`);
    await send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:2});
    await send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:60,y:430,id:0},{x:333,y:430,id:1}]});
    for(let i=1;i<=8;i++)await send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:60+13*i,y:430,id:0},{x:333-13*i,y:430,id:1}]});
    await send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await wait(`window.busCameraTestState().camera.position.distanceTo(window.busCameraTestState().controls.target)>${portrait*2.5}`,"Mobile pinch retreats far from the bus");
    await send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:195,y:430,id:0},{x:260,y:430,id:1}]});
    for(let i=1;i<=8;i++)await send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:195-13*i,y:430,id:0},{x:260+13*i,y:430,id:1}]});
    await send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await wait(`window.busCameraTestState().camera.position.distanceTo(window.busCameraTestState().controls.target)<${portrait*1.05}`,"Mobile pinch returns to the original framing");
    const mobileTarget=await run(`window.busCameraTestState().controls.target.toArray()`);
    assert(mobileTarget.every((value,i)=>Math.abs(value-portraitTarget[i])<0.001),"Changing the pinch centre must not drift away from the bus.");
    await send("Emulation.setTouchEmulationEnabled",{enabled:false});
    await send("Emulation.setDeviceMetricsOverride",{width:1240,height:900,deviceScaleFactor:1,mobile:false});
    await reset();
    console.log("Mobile: pinch out and back preserves the framing and bus anchor.");
    }

    const paint = await run(`(() => {
      const s=window.busCameraTestState(),mesh=s.scene.getObjectByName('bus-side-slogan-luffy');
      const canvas=mesh.material.map.image, data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const bus=s.scene.getObjectByName('bus-vehicle'), wheel=s.scene.getObjectByName('bus-wheels').children.filter(w=>w.position.x<0).at(-1);
      let overlap=0, cyan=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const i=(y*canvas.width+x)*4;
        if(data[i+3]<160||Math.abs(data[i]-34)>15||Math.abs(data[i+1]-211)>15||Math.abs(data[i+2]-238)>15)continue;
        cyan++;
        const point=bus.worldToLocal(mesh.localToWorld(s.camera.position.clone().set((x/canvas.width-.5)*2.7,(.5-y/canvas.height)*.675,0)));
        if(Math.hypot(point.y-wheel.position.y,point.z-wheel.position.z)<.66)overlap++;
      }
      return {cyan,overlap};
    })()`);
    assert(paint.cyan>500,"The cyan paint must remain visible on Luffy's slogan.");
    assert.equal(paint.overlap,0,"No cyan paint may spill into the rear wheel opening.");
    await run(`(() => {const s=window.busCameraTestState();s.controls.enableDamping=false;s.controls.update();s.camera.position.set(-10,2.1,1.8);s.controls.target.set(0,1.45,1.8);s.controls.update();s.camera.updateMatrixWorld();})()`);
    await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const tick=()=>s.gl.info.render.frame>frame+2?resolve(true):requestAnimationFrame(tick);requestAnimationFrame(tick);})`);
    await screenshot("luffy-trait-roue.png");
    await reset();

    await run(`(() => {
      window.busMediaSamples=[];
      const tick=()=>{
        const trip=window.busJourneyTestState(),player=window.mediaTestPlayers.bus,phase=document.querySelector('.bus-app').dataset.phase;
        window.busMediaSamples.push({phase,elapsed:trip.elapsed,blend:trip.cameraBlend,state:player.state,volume:player.volume,muted:player.muted,time:player.getCurrentTime()});
        if(!window.stopBusMediaSamples)requestAnimationFrame(tick);
      };requestAnimationFrame(tick);
      [...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Entrer dans le bus')).click();
    })()`);
    visitor=await run(`localStorage.getItem('fdb-visitor')`);
    await wait(`document.querySelector('.bus-app')?.dataset.phase==='inside' && window.mediaTestPlayers.bus.state===1 && window.mediaTestPlayers.bus.volume===100`,"First-person arrival starts audible playback",90_000);
    const boarding=await run(`window.busMediaSamples.filter(s=>s.phase==='entering')`);
    assert(boarding.length>15&&boarding.some(s=>s.blend>.1&&s.blend<.9),"Playback must be checked throughout the real camera approach.");
    assert(boarding.every(s=>s.state===2&&s.time<.02),"The first video must remain paused at zero throughout boarding.");
    const premature=await run(`window.mediaTestPlayers.bus.commands.filter(c=>c.command==='play'&&!c.muted&&c.phase!=='inside')`);
    assert.deepEqual(premature,[],"There must be no audible playback request before first-person arrival.");
    await screenshot("arrivee-premiere-personne.png");
    await run(`window.mediaTestPlayers.bus.captionsVisible=true`);
    await run(`document.querySelector('button[aria-label="Sortir du bus"]').click()`);
    await wait(`document.querySelector('.bus-app')?.dataset.phase==='outside' && window.mediaTestPlayers.bus.volume===25`,"Exit reaches exterior volume",90_000);
    const exiting=await run(`window.busMediaSamples.filter(s=>s.phase==='exiting'&&s.elapsed>0&&s.elapsed<12.6)`);
    const early=exiting.filter(s=>s.elapsed>.3&&s.elapsed<3.1);
    assert(early.length>5&&early.every(s=>s.volume===100),"Clicking exit must preserve full volume while the camera is still at the eyes.");
    const fading=exiting.filter(s=>s.elapsed>3.4&&s.elapsed<5.5);
    assert(fading.length>5&&fading.some(s=>s.volume<90&&s.volume>35),"Sound must fade during the camera's movement outside.");
    assert(fading.every(s=>Math.abs(s.volume-(25+75*s.blend))<6),"The exit fade must follow camera progress, including slow frames.");
    assert(exiting.filter(s=>s.elapsed>5.8).every(s=>s.volume===25),"The outside camera hears the distant volume while the avatar disembarks.");
    const beforeReturn=await run(`window.mediaTestPlayers.bus.getCurrentTime()`);
    await run(`[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Entrer dans le bus')).click()`);
    await wait(`document.querySelector('.bus-app')?.dataset.phase==='entering' && window.mediaTestPlayers.bus.state===2`,"Reboarding pauses the existing timeline");
    assert(Math.abs(await run(`window.mediaTestPlayers.bus.getCurrentTime()`)-beforeReturn)<.3,"Reboarding must preserve the video position.");
    await wait(`document.querySelector('.bus-app')?.dataset.phase==='inside' && window.mediaTestPlayers.bus.state===1 && window.mediaTestPlayers.bus.volume===100`,"Reboarding resumes at the eyes",90_000);
    assert.equal(await run(`window.mediaTestPlayers.bus.captionsVisible`),true,"Reboarding must preserve the viewer's caption choice.");
    await run(`(() => {const player=window.mediaTestPlayers.bus;player.emitState(2);player.options.events.onAutoplayBlocked();})()`);
    await wait(`Boolean(document.querySelector('button[aria-label="Lancer la vidéo"]'))`,"Autoplay fallback appears in first person");
    await run(`document.querySelector('button[aria-label="Lancer la vidéo"]').click()`);
    await wait(`window.mediaTestPlayers.bus.state===1 && !document.querySelector('button[aria-label="Lancer la vidéo"]')`,"Explicit play works after delayed autoplay is blocked");
    await run(`window.stopBusMediaSamples=true`);
    const commands=await run(`window.mediaTestPlayers.bus.commands`);
    if(directory)await writeFile(resolve(directory,"lecture-et-sortie.json"),JSON.stringify({paint,boarding,exiting,commands},null,2));
    console.log("Playback stays paused during boarding/reboarding; exit holds 100 until the camera moves, then follows its progress to 25.");
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument",{identifier:injection.identifier});
    await send("Emulation.setTouchEmulationEnabled",{enabled:false});
    if(visitor){
      const response=await fetch(`${baseUrl}/api/bus-entries`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorId:visitor})});
      assert(response.ok,"Remove only the boarding test visitor.");
      await run(`localStorage.removeItem('fdb-visitor')`);
    }
  }
  await runMediaPlaybackChecks({send,evaluate,waitForPageCondition,baseUrl});
}
