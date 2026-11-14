import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { installTestYouTube } from "./media-playback-checks.mjs";

export async function runBusPartyChecks({send,evaluate,waitForPageCondition,baseUrl}) {
  const run=expression=>evaluate(send,expression);
  const wait=(expression,label)=>waitForPageCondition(send,expression,label,30_000);
  const rosterBuild=await build({entryPoints:["src/components/bus/passenger-archetypes.ts"],bundle:true,format:"esm",platform:"node",write:false,logLevel:"silent"});
  const {NAKAMA_ROSTER}=await import(`data:text/javascript;base64,${Buffer.from(rosterBuild.outputFiles[0].text).toString("base64")}`);
  const partyActorNames=[...NAKAMA_ROSTER.map((character,index)=>`crew-nakama-${character.id}-${index}`),'bus-entry-passenger'];
  const injection=await send('Page.addScriptToEvaluateOnNewDocument',{source:`(${installTestYouTube.toString()})();
    const fetchNative=fetch.bind(window);window.fetch=(input,init)=>{
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(url.origin===location.origin&&url.pathname==='/api/bus-entries'&&(!init?.method||init.method==='GET'))return Promise.resolve(new Response(JSON.stringify({count:16,seatCapacity:16,profileRevision:1,vacantSeatRanges:[],passengers:[]}),{headers:{'Content-Type':'application/json'}}));return fetchNative(input,init);
    };`});
  const click=label=>run(`document.querySelector('button[aria-label=${JSON.stringify(label)}]:not(:disabled)').click()`);
  const music="window.mediaTestPlayers.music",tv="window.mediaTestPlayers.bus";
  const start=async()=>{
    await click('Lancer la fête');
    await wait(`${music}.state===1&&${music}.videoId==='RbZMoeHdR3I'&&document.querySelector('.bus-app').dataset.party==='true'`,'Party music starts from its intro');
    assert.equal(await run(`document.querySelector('.bus-app').dataset.partyDancing`),'false','The first eight seconds must not start the party dance.');
    await run(`${music}.seekTo(6,true)`);
    assert.equal(await run(`document.querySelector('.bus-app').dataset.partyDancing`),'false','Seeking inside the intro keeps normal seated activity.');
    await run(`${music}.seekTo(8.02,true)`);
    await wait(`document.querySelector('.bus-app').dataset.partyDancing==='true'`,'Dancing starts at eight seconds of actual playback');
  };
  const stop=async()=>{await click('Arrêter la fête');await wait(`document.querySelector('.bus-app').dataset.party==='false'&&!window.busCameraTestState().scene.getObjectByName('bus-party-confetti')`,'Party stops and removes confetti');};
  const directory=process.env.BUS_VISUAL_OUTPUT;
  const screenshot=async name=>{if(!directory)return;await mkdir(directory,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(directory,name),Buffer.from(shot.data,'base64'));};
  const poses=()=>run(`(()=>{const scene=window.busCameraTestState().scene,result=[];for(const name of ${JSON.stringify(partyActorNames)}){const object=scene.getObjectByName(name);result.push({name:object.name,activity:object.userData.activity,gesture:object.userData.gesture,bob:object.position.y,left:object.getObjectByName('nakama-arm-left').rotation.toArray(),right:object.getObjectByName('nakama-arm-right').rotation.toArray()});}return result;})()`);
  try {
    await send('Emulation.setHardwareConcurrencyOverride',{hardwareConcurrency:8});
    await send('Emulation.setDeviceMetricsOverride',{width:1240,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:`${baseUrl}/?phase=inside&count=16&row=0`});
    await wait(`${JSON.stringify(partyActorNames)}.every(name=>Boolean(window.busCameraTestState()?.scene.getObjectByName(name)))&&Boolean(${music})&&Boolean(${tv})`,'Party scene and players ready');
    await wait(`window.busCameraTestState().gl.info.render.frame>15`,'Warm up the software-rendered scene');
    await click('Klaxonner');
    await wait(`${JSON.stringify(partyActorNames)}.every(name=>window.busCameraTestState().scene.getObjectByName(name)?.userData.activity==='horn')`,'Every permanent character reacts to the horn together');
    await start();
    await wait(`${JSON.stringify(partyActorNames)}.every(name=>window.busCameraTestState().scene.getObjectByName(name)?.userData.activity==='party')`,'Party gestures begin');
    const first=await poses();
    assert.equal(first.length,partyActorNames.length);assert(first.every(pose=>pose.activity==='party'),'Every permanent character and FoudubusTV must join the party.');
    assert.equal(new Set(first.map(pose=>pose.gesture)).size,partyActorNames.length,'Every permanent character and FoudubusTV must use a distinct signature.');
    const effects=await run(`(()=>{const scene=window.busCameraTestState().scene,confetti=scene.getObjectByName('bus-party-confetti'),colors=new Set();for(let i=0;i<confetti.instanceColor.array.length;i+=3)colors.add(Array.from(confetti.instanceColor.array.slice(i,i+3)).join(','));return {count:confetti.count,colors:colors.size,instanced:confetti.isInstancedMesh,crew:['kamal','kyta'].map(name=>scene.getObjectByName('bus-crew-'+name).userData.activity)};})()`);
    assert(effects.instanced&&effects.count===420&&effects.crew.every(activity=>activity==='party'),'Confetti use one bounded instanced mesh and both guides join.');
    assert.equal(effects.colors,10,'Confetti cover the full rainbow, pink and white.');
    assert.equal(await run(`${tv}.state`),2,'The party must pause TV playback.');
    await click('Explorer en vue libre');
    await wait(`window.busCameraTestState().controls.enabled`,'Party can be explored without stopping it');
    await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const tick=()=>s.gl.info.render.frame>frame+20?resolve(true):requestAnimationFrame(tick);requestAnimationFrame(tick);})`);
    const later=await poses();assert(first.some((pose,index)=>Math.abs(pose.left[0]-later[index].left[0])>.03),'Arms keep dancing instead of freezing after the initial gesture.');
    await run(`(()=>{const s=window.busCameraTestState();s.controls.enableDamping=false;s.controls.enabled=false;s.camera.position.set(0,2.24,-2.25);s.controls.target.set(0,1.55,2.3);s.controls.update();s.camera.updateMatrixWorld();})()`);
    await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const tick=()=>s.gl.info.render.frame>frame+3?resolve(true):requestAnimationFrame(tick);requestAnimationFrame(tick);})`);
    await screenshot('fete-dans-le-bus.png');
    await run(`${music}.emitState(0)`);
    await wait(`document.querySelector('.bus-app').dataset.partyDancing==='false'&&${music}.getCurrentTime()<8`,'Loop restart stops dancing during the next intro');
    await wait(`(()=>{let active=0;window.busCameraTestState().scene.traverse(o=>{if(o.userData.activity==='party')active++;});return active===0;})()`,'All characters return to their normal activity during the loop intro');
    await run(`${music}.seekTo(8.05,true)`);
    await wait(`document.querySelector('.bus-app').dataset.partyDancing==='true'`,'Dance restarts after the next eight-second intro');
    await run(`${music}.emitState(3)`);
    await wait(`document.querySelector('.bus-app').dataset.partyDancing==='false'`,'Buffering pauses dancing');
    await run(`${music}.emitState(1)`);
    await wait(`document.querySelector('.bus-app').dataset.partyDancing==='true'`,'Actual playback resumes the dance');
    await stop();
    assert.equal(await run(`${music}.state`),2,'Stopping a party must preserve the previous music OFF choice.');
    assert.equal(await run(`${music}.videoId`),'63RzVcR1qHg','The original background track must be restored.');

    await click('Activer la musique de fond (Life in Pieces — Le Mont Corvo)');await wait(`${music}.state===1`,'Background music begins');
    await run(`${music}.seekTo(42,true)`);
    await start();await stop();
    await wait(`${music}.state===1&&${music}.volume===85`,'Background music resumes at its saved volume');
    assert((await run(`${music}.getCurrentTime()`))>=42,'Party mode must preserve the background playback position.');
    await click('Allumer la télévision');await wait(`${tv}.state===1&&${music}.state===2`,'TV owns the audio channel');
    const tvTime=await run(`${tv}.getCurrentTime()`);await start();
    assert.equal(await run(`${tv}.state`),2);
    const partyPlay=await run(`${music}.commands.filter(command=>command.command==='play'&&command.videoId==='RbZMoeHdR3I').at(-1)`);
    assert.equal(partyPlay.tvState,2,'The TV must be paused before the party track starts.');
    await stop();await wait(`${tv}.state===1&&${music}.state===2&&${music}.muted`,'Stopping the party restores TV without overlapping music');
    assert((await run(`${tv}.getCurrentTime()`))>=tvTime,'The party must not rewind the TV.');
    await run(`${tv}.emitState(2)`);await wait(`${music}.state===1`,'Manual TV pause restores background music');
    await start();await stop();
    assert.equal(await run(`${tv}.state`),2,'A TV paused before the party must stay paused afterward.');

    // A delayed end event while the theory owns audio must reset the intro too.
    await start();
    await run(`document.querySelector('button[title="Découvrir la théorie des Fous du Bus"]').click()`);
    await wait(`Boolean(document.getElementById('theory-tab-video'))`,'Theory opens for suspended-loop checks');
    await run(`document.getElementById('theory-tab-video').click()`);
    await wait(`Boolean(window.mediaTestPlayers.theory)`,'Theory player becomes available');
    await run(`window.mediaTestPlayers.theory.emitState(1)`);
    await wait(`${music}.state===2&&document.querySelector('.bus-app').dataset.partyDancing==='false'`,'Another video suspends party dancing');
    await run(`${music}.emitState(0)`);
    await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
    await wait(`${music}.state===1`,'Closing the theory restores the party track');
    assert.equal(await run(`document.querySelector('.bus-app').dataset.partyDancing`),'false','A stale end time after a suspended loop cannot skip the intro.');
    await run(`${music}.seekTo(0,true);${music}.emitState(1)`);
    await run(`${music}.seekTo(8.03,true)`);
    await wait(`document.querySelector('.bus-app').dataset.partyDancing==='true'`,'The next intro arms the resumed dance');
    await stop();

    await start();
    for(const [width,height] of [[320,568],[393,852],[568,320],[640,900],[1240,900]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<640});
      const button=await run(`(()=>{const buttons=[...document.querySelectorAll('button[aria-label="Arrêter la fête"]')];const b=buttons.find(b=>b.getBoundingClientRect().width>0&&!b.closest('[aria-hidden="true"]'));const r=b.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,disabled:b.disabled};})()`);
      assert(!button.disabled&&button.left>=0&&button.right<=width&&button.top>=0&&button.bottom<=height,`The party stop control must remain reachable at ${width}×${height}.`);
    }
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await wait(`window.busDestinationTestReducedMotion()===true`,'Reduced motion reaches the party');
    await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const tick=()=>s.gl.info.render.frame>frame+3?resolve(true):requestAnimationFrame(tick);requestAnimationFrame(tick);})`);
    const staticPose=await poses();assert(staticPose.every(pose=>pose.bob===0),'Reduced motion keeps seated feet on the floor.');
    const version=await run(`window.busCameraTestState().scene.getObjectByName('bus-party-confetti').instanceMatrix.version`);
    await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const tick=()=>s.gl.info.render.frame>frame+8?resolve(true):requestAnimationFrame(tick);requestAnimationFrame(tick);})`);
    assert.equal(await run(`window.busCameraTestState().scene.getObjectByName('bus-party-confetti').instanceMatrix.version`),version,'Reduced-motion confetti must remain static.');
    assert.deepEqual(await poses(),staticPose,'Each reduced-motion signature remains fixed over time.');
    await stop();await send('Emulation.setEmulatedMedia',{features:[]});
    await start();await run(`${music}.options.events.onError({target:${music},data:150})`);
    await wait(`document.querySelector('.bus-app').dataset.party==='false'`,'An unavailable party track clears party mode');

    await send('Emulation.setHardwareConcurrencyOverride',{hardwareConcurrency:4});
    await send('Page.navigate',{url:`${baseUrl}/?phase=inside&count=16&row=0`});await wait(`Boolean(window.busCameraTestState()?.scene.getObjectByName('bus-entry-passenger'))&&Boolean(${music})`,'Low-power party scene ready');
    await start();await wait(`window.busCameraTestState().scene.getObjectByName('bus-distant-party-arms')?.visible`,'Distant passengers also raise their hands');
    assert.equal(await run(`window.busCameraTestState().scene.getObjectByName('bus-party-confetti').count`),120,'Constrained devices use fewer confetti.');
    if(directory)await writeFile(resolve(directory,'verification-fete.json'),JSON.stringify({effects,first,later,partyPlay,staticPose,confettiReducedVersion:version},null,2));
    await stop();
    console.log('Party checks passed: horn hands, ongoing dance, crew, bounded confetti, audio handoffs and saved choices, paused TV, reduced motion, mobile controls, errors and distant low-power passengers.');
  } finally {
    await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});
    await send('Emulation.setEmulatedMedia',{features:[]});
  }
}
