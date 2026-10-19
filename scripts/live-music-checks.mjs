import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Optional diagnostic against YouTube itself. Kept separate from repeatable
// regression tests because remote availability is outside the application's control.
export async function runLiveMusicCheck({send,evaluate,waitForPageCondition,baseUrl}) {
  const run=expression=>evaluate(send,expression);
  await send("Emulation.setDeviceMetricsOverride",{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url:`${baseUrl}/?count=2`});
  const playerState=`(()=>{
    const root=document.querySelector('.bus-app');if(!root)return null;
    const key=Object.keys(root).find(k=>k.startsWith('__reactFiber')),queue=[root[key]];
    while(queue.length){const f=queue.pop();if(!f)continue;let h=f.memoizedState;
      while(h){const value=h.memoizedState?.current;
        for(const p of [value,value?.background?.player,value?.party?.player]){
        if(typeof p?.getIframe==='function'&&p.getIframe().id==='bgm-iframe')return {state:p.getPlayerState(),volume:p.getVolume(),muted:p.isMuted?.(),time:p.getCurrentTime(),loaded:p.getVideoLoadedFraction?.(),error:p.getVideoData?.().errorCode,title:p.getVideoData?.().title};
        }
        h=h.next;
      }queue.push(f.child,f.sibling);
    }return null;
  })()`;
  await waitForPageCondition(send,`${playerState}!==null&&Boolean(document.querySelector('button[aria-label^="Activer la musique de fond"]'))`,"Real music player ready",30_000);
  let preloaded = false;
  try {
    await waitForPageCondition(send,`(()=>{const p=${playerState};return p?.state===2&&p.loaded>0&&p.muted;})()`,"Real music buffer prepared before clicking",25_000);
    preloaded = true;
  } catch { /* Report remote preload restrictions separately from playback. */ }
  const before=await run(playerState);
  const point=await run(`(()=>{const r=document.querySelector('button[aria-label^="Activer la musique de fond"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  const clickedAt=Date.now();
  await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...point});
  await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...point});
  let after;
  try {
    await waitForPageCondition(send,`(()=>{const state=${playerState};return state?.state===1&&state.time>0&&state.loaded>0&&!state.muted;})()`,"Real music playback begins",15_000);
    after=await run(playerState);
  } catch {
    after=await run(playerState);
  }
  const startLatencyMs=Date.now()-clickedAt;
  const tvState=`(()=>{const p=window.busYoutubeTestPlayer?.('tv-primary-iframe');return p&&{state:p.getPlayerState(),time:p.getCurrentTime(),loaded:p.getVideoLoadedFraction(),duration:p.getDuration(),muted:p.isMuted(),volume:p.getVolume(),error:p.getVideoData?.().errorCode};})()`;
  try {
    await waitForPageCondition(send,`(()=>{const p=${tvState};return p?.state===2&&p.loaded>0&&p.muted;})()`,"Real bus TV preloads silently and pauses",25_000);
  } catch { /* Record remote loading failures without treating them as local regressions. */ }
  const result={before,after,preloaded,startLatencyMs,played:after?.state===1&&after?.time>0&&after?.loaded>0&&!after?.muted,tvPreloaded:await run(tvState)};
  const directory=process.env.BUS_VISUAL_OUTPUT;
  if(directory){
    await mkdir(directory,{recursive:true});
    await writeFile(resolve(directory,"musique-youtube-reelle.json"),JSON.stringify(result,null,2));
  }
  console.log("Real YouTube music diagnostic:",JSON.stringify(result));
  if(result.played){
    const stop=await run(`(()=>{const b=document.querySelector('button[aria-label="Couper la musique de fond"]');return b&&(()=>{const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})();})()`);
    if(stop){
      await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...stop});
      await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...stop});
    }
  }
}
