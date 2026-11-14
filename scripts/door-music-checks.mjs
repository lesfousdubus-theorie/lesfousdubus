import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { installTestYouTube } from "./media-playback-checks.mjs";
import { runBusPlaybackZoomChecks } from "./bus-playback-zoom-checks.mjs";

export async function runDoorMusicChecks(options) {
  const {send,evaluate,waitForPageCondition,baseUrl}=options;
  const run=expression=>evaluate(send,expression);
  const wait=(expression,label)=>waitForPageCondition(send,expression,label,30_000);
  const directory=process.env.BUS_VISUAL_OUTPUT;
  if(directory)await mkdir(directory,{recursive:true});
  const injection=await send("Page.addScriptToEvaluateOnNewDocument",{
    source:`window.mediaTestBufferDelay=1800;(${installTestYouTube.toString()})()`,
  });
  const click=async selector=>{
    await wait(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b)return false;const r=b.getBoundingClientRect();return !b.disabled&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b;})()`,"Music button is visible and ready for a native click");
    const point=await run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...point});
    await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...point});
  };
  const screenshot=async name=>{
    if(!directory)return;
    await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const tick=()=>s.gl.info.render.frame>frame+1?resolve(true):requestAnimationFrame(tick);requestAnimationFrame(tick);})`);
    const shot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    await writeFile(resolve(directory,name),Buffer.from(shot.data,"base64"));
  };
  try {
    await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await send("Page.navigate",{url:`${baseUrl}/?count=2`});
    await wait(`Boolean(window.busCameraTestState()?.controls)&&Boolean(window.mediaTestPlayers?.bus)`,"Scene and preloading video ready");
    await wait(`window.mediaTestPlayers.bus.state===2`,"Buffered video returns to pause");
    const warm=await run(`window.mediaTestPlayers.bus.commands`);
    const firstPlay=warm.find(c=>c.command==='play');
    const firstPause=warm.find(c=>c.command==='pause');
    assert(firstPlay?.muted,"Video preloading must be silent.");
    assert(firstPause.time-firstPlay.time>=1750,"Preloading must wait for data beyond the former 900 ms timer.");
    assert.equal(await run(`window.mediaTestPlayers.bus.getCurrentTime()`),0,"The buffered video must wait at its beginning.");
    assert.equal(await run(`Number(document.querySelector('.bus-volume-inline input').value)`),85,"Fresh visitors must get 85% music volume.");
    assert.equal(await run(`window.mediaTestPlayers.music.volume`),85,"The actual music player must receive the initial volume.");
    const musicFrame=await run(`(()=>{const frame=document.getElementById('bgm-iframe'),r=frame.getBoundingClientRect();return {display:getComputedStyle(frame).display,width:r.width,height:r.height,right:r.right};})()`);
    assert(musicFrame.display!=='none'&&musicFrame.width>=200&&musicFrame.height>=200&&musicFrame.right<0,"Background playback must retain a live player viewport outside the visible layout.");
    await click('button[aria-label^="Activer la musique de fond"]');
    await wait(`window.mediaTestPlayers.music.state===1&&!window.mediaTestPlayers.music.muted`,"Music starts from its button");
    assert.equal(await run(`window.mediaTestPlayers.music.volume`),85,"Music starts audibly at 85%.");
    await screenshot("musique-volume-85.png");
    const sliderPoint=await run(`(()=>{const r=document.querySelector('.bus-volume-inline input').getBoundingClientRect();return {x:r.left+r.width*.37,y:r.top+r.height/2};})()`);
    await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...sliderPoint});
    await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...sliderPoint});
    await wait(`Number(localStorage.getItem('fdb-bgm-volume'))>5&&Number(localStorage.getItem('fdb-bgm-volume'))<80`,"Volume slider stores the user's choice");
    const chosen=await run(`Number(localStorage.getItem('fdb-bgm-volume'))`);
    await wait(`window.mediaTestPlayers.music.volume===${chosen}`,"The selected volume reaches the player");
    await send("Page.reload");
    await wait(`document.querySelector('.bus-app')?.dataset.sceneAvailable==='true'&&window.mediaTestPlayers?.music?.volume===${chosen}&&Number(document.querySelector('.bus-volume-inline input')?.value)===${chosen}`,"Reload preserves the chosen volume");
    await click('button[aria-label^="Activer la musique de fond"]');
    await wait(`window.mediaTestPlayers.music.state===1&&!window.mediaTestPlayers.music.muted`,"Music restarts after reload");
    await run(`window.mediaTestPlayers.music.options.events.onAutoplayBlocked()`);
    await wait(`Boolean(document.querySelector('button[aria-label^="Activer la musique de fond"]'))&&document.body.innerText.includes('Musique indisponible')`,"A blocked player must not leave a silent ON button");
    await click('button[aria-label^="Activer la musique de fond"]');
    await wait(`window.mediaTestPlayers.music.state===1&&!window.mediaTestPlayers.music.muted`,"The user can retry blocked playback");
    await run(`window.mediaTestPlayers.music.options.events.onError({target:window.mediaTestPlayers.music,data:153})`);
    await wait(`Boolean(document.querySelector('button[aria-label^="Activer la musique de fond"]'))`,"YouTube failures switch off the music button");

    // An explicit zero is a stored preference, never replaced with the default.
    await run(`document.querySelector('.bus-volume-inline input').focus()`);
    await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Home",code:"Home",windowsVirtualKeyCode:36});
    await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Home",code:"Home",windowsVirtualKeyCode:36});
    await wait(`localStorage.getItem('fdb-bgm-volume')==='0'`,"Muted volume is stored");
    await send("Page.reload");
    await wait(`Boolean(window.busCameraTestState()?.controls)&&window.mediaTestPlayers?.music?.volume===0&&document.querySelector('.bus-volume-inline input')?.value==='0'`,"Reload preserves an explicit zero");
    await wait(`Boolean(window.busCameraTestState()?.scene.getObjectByName('bus-coach-details'))`,"Vehicle finishes loading after reload");
    const flaps=await run(`(()=>{const list=[];window.busCameraTestState().scene.traverse(o=>{if(o.name.startsWith('bus-mudflap-'))list.push(o.name);});return list;})()`);
    assert.equal(flaps.length,3,"Other wheel mudflaps must remain in place.");
    assert(!flaps.includes('bus-mudflap-1--4.3'),"The flap aligned under the front door post must be removed.");
    await run(`(()=>{const s=window.busCameraTestState();s.controls.enableDamping=false;s.controls.update();s.camera.position.set(10,2.15,-2.5);s.controls.target.set(0,1.5,-2.7);s.controls.update();s.camera.updateMatrixWorld();})()`);
    await screenshot("porte-cote-droit-corrige.png");
    const doorPoint=await run(`(()=>{const s=window.busCameraTestState(),leaf=s.scene.getObjectByName('bus-door-front-leaf'),v=leaf.children[0].children[1].getWorldPosition(s.camera.position.clone()).project(s.camera),r=s.gl.domElement.getBoundingClientRect();return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};})()`);
    await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...doorPoint});
    await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...doorPoint});
    await wait(`window.busCameraTestState().scene.getObjectByName('bus-door-front-leaf').rotation.y>1.6`,"The corrected doorway still opens normally");
    await screenshot("porte-ouverte-corrige.png");
    if(directory)await writeFile(resolve(directory,"prechargement-musique.json"),JSON.stringify({warm,musicFrame,chosenVolume:chosen,flaps},null,2));
    console.log(`Silent video preloading waits for actual data; music starts at 85%, remembers ${chosen}% and 0%; the door-adjacent mudflap is removed.`);
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument",{identifier:injection.identifier});
  }
  // La suite vérifie un crescendo audible ; le scénario précédent vient de
  // mémoriser explicitement zéro dans ce profil de navigateur jetable.
  await run(`localStorage.removeItem('fdb-bgm-volume')`);
  await runBusPlaybackZoomChecks({...options,checkZoom:false});
}
