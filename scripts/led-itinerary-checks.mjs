import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function runLedItineraryChecks({send,evaluate,waitForPageCondition,baseUrl}) {
  const compiled=await build({entryPoints:["src/lib/bus-destinations.ts"],bundle:true,format:"esm",platform:"node",write:false,logLevel:"silent"});
  const {GRAND_LINE_STOPS,encodeLedText,LED_COLUMNS}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
  const run=expression=>evaluate(send,expression);
  const wait=(expression,label)=>waitForPageCondition(send,expression,label,30_000);
  const frame=()=>run(`new Promise(resolve=>{const s=window.busCameraTestState(),n=s.gl.info.render.frame;const tick=()=>s.gl.info.render.frame>n+1?resolve(true):requestAnimationFrame(tick);requestAnimationFrame(tick);})`);
  const board="window.busCameraTestState().scene.getObjectByName('bus-led-destination')";
  await send("Emulation.setDeviceMetricsOverride",{width:1240,height:900,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url:`${baseUrl}/?count=2`});
  await wait(`Boolean(window.busCameraTestState()?.scene.getObjectByName('bus-led-destination'))`,"Random-start LED board loads");
  const selected=await run(`${board}.userData`);
  assert.equal(GRAND_LINE_STOPS[selected.startingStop],selected.destination,"The selected departure must belong to the new itinerary.");
  const version=await run(`${board}.children[1].material.map.version`);
  await wait(`${board}.children[1].material.map.version>${version}`,"The random-start itinerary scrolls");
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await wait(`window.busDestinationTestReducedMotion()===true`,"The display receives the reduced-motion preference");
  await frame();
  const pixels=await run(`(()=>{const canvas=${board}.children[1].material.map.image,ctx=canvas.getContext('2d'),bits=[];for(let x=0;x<72;x++){let column=0;for(let y=0;y<9;y++){const p=ctx.getImageData(x*8+4,y*8+4,1,1).data;if(p[0]>200)column|=1<<y;}bits.push(column);}return bits;})()`);
  const expected=encodeLedText(selected.destination);
  assert.deepEqual(pixels,Array.from({length:LED_COLUMNS},(_,i)=>expected[i]??0),"The static board must show the selected island, rather than reset to a fixed destination.");
  const still=await run(`${board}.children[1].material.map.version`);
  await frame();
  assert.equal(await run(`${board}.children[1].material.map.version`),still,"Reduced-motion mode must keep its LED texture stationary.");
  const directory=process.env.BUS_VISUAL_OUTPUT;
  if(directory){
    await mkdir(directory,{recursive:true});
    await run(`(()=>{const s=window.busCameraTestState();s.controls.enableDamping=false;s.controls.update();s.camera.position.set(2.9,3.25,-10.8);s.controls.target.set(0,2.8,-4.6);s.controls.update();s.camera.updateMatrixWorld();})()`);
    await frame();
    const shot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    await writeFile(resolve(directory,"panneau-28-etapes.png"),Buffer.from(shot.data,"base64"));
    await writeFile(resolve(directory,"depart-aleatoire.json"),JSON.stringify(selected,null,2));
  }
  await send("Emulation.setEmulatedMedia",{features:[]});
  await wait(`window.busDestinationTestReducedMotion()===false`,"The itinerary resumes scrolling");
  assert.deepEqual(await run(`${board}.userData`),selected,"Changing motion preferences must preserve the chosen departure.");
  console.log(`LED board starts at ${selected.destination}, scrolls and preserves that choice in reduced-motion mode.`);
}
