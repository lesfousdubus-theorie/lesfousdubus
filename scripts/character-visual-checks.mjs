import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { installTestYouTube } from "./media-playback-checks.mjs";

/** Contrôle le raccord des cous sur chaque modèle réellement rendu, sans modifier la base. */
export async function runCharacterVisualChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const run = expression => evaluate(send, expression);
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", {source:`
    (${installTestYouTube.toString()})();
    const nativeFetch=window.fetch.bind(window);window.characterMutationRequests=[];
    window.characterFixtureRequests=[];
    window.fetch=(input,init)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.href);
      const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
      if(url.origin!==location.origin||!url.pathname.startsWith('/api/bus-entries'))return nativeFetch(input,init);
      window.characterFixtureRequests.push({method,path:url.pathname,fixture:true});
      const snapshot={count:20,seatCapacity:20,profileRevision:1,vacantSeatRanges:[],passengers:[]};
      if(url.searchParams.has('manifest')){
        snapshot.passengers=Array.from({length:20},(_,seatIndex)=>({seatIndex,displayName:['Epic Games','Kirito'][seatIndex]??null,hasComment:false}));
        snapshot.nextFrom=20;snapshot.hasMore=false;
      }
      if(method==='POST')return Promise.resolve(new Response(JSON.stringify({...snapshot,seatIndex:0,added:false,passenger:null}),{headers:{'Content-Type':'application/json'}}));
      if(method!=='GET'&&method!=='HEAD'){
        window.characterMutationRequests.push({method,path:url.pathname});
        return Promise.resolve(new Response(JSON.stringify({error:'The character fixture cannot change visitor records.'}),{status:405,headers:{'Content-Type':'application/json'}}));
      }
      return Promise.resolve(new Response(JSON.stringify(snapshot),{headers:{'Content-Type':'application/json'}}));
    };
  `});
  try {
    // Inspect the visitors actually selected by the production detail budget.
    // Pure geometry tests cover the full archetype catalog separately.
    await send("Emulation.setHardwareConcurrencyOverride", {hardwareConcurrency:8});
    await send("Emulation.setDeviceMetricsOverride", {width:1240,height:900,deviceScaleFactor:1,mobile:false});
    await send("Page.navigate", {url:`${baseUrl}/?count=20&seat=0&row=0`});
    await waitForPageCondition(send, `window.busCameraTestState()?.scene.getObjectByName('bus-seated-passengers')?.userData.detailedCount>0 && document.querySelector('.bus-app').dataset.sceneAvailable==='true'&&Boolean(window.mediaTestPlayers?.bus)`, "The isolated registered visitors load", 30_000);
    await run(`[...document.querySelectorAll('button')].find(button=>!button.disabled&&button.textContent.includes('Entrer dans le bus')).click()`);
    await waitForPageCondition(send, `document.querySelector('.bus-app').dataset.phase==='inside'`, "Fixture visitor zero boards without a database write", 30_000);
    await run(`document.querySelector('button[aria-label="Explorer en vue libre"]').click()`);
    await waitForPageCondition(send, `window.busCameraTestState().controls.enabled`, "Character inspection starts in free view", 15_000);
    await run(`new Promise(resolve=>{
      const s=window.busCameraTestState();let frame=s.gl.info.render.frame,last=s.camera.position.clone(),stable=0;
      const check=()=>{if(s.gl.info.render.frame!==frame){frame=s.gl.info.render.frame;stable=s.camera.position.distanceTo(last)<.000001?stable+1:0;last.copy(s.camera.position);if(stable>=3&&s.camera.position.distanceTo(s.controls.target)>5){resolve(true);return;}}requestAnimationFrame(check);};requestAnimationFrame(check);
    })`);
    const mounted = await run(`(()=>{const scene=window.busCameraTestState().scene,passengers=scene.getObjectByName('bus-seated-passengers'),synthetic=[];
      scene.traverse(object=>{if(object.name.startsWith('crew-nakama-'))synthetic.push(object.name);});
      return {...passengers.userData,synthetic};})()`);
    assert.deepEqual(mounted.synthetic,[],"No synthetic permanent passengers are added to the visitor fixture.");
    assert.equal(mounted.detailedCount+mounted.simplifiedCount,19,"The seated visitors and the current visitor avatar represent the same twenty registrations.");
    const characters = await run(`(() => {
      const scene=window.busCameraTestState().scene, characters=[];
      scene.updateMatrixWorld(true);
      scene.traverse(object=>{
        if(!/^nakama-.*-[0-9]+$/.test(object.name)||object.userData.passengerKind!=='visitor'||!Number.isInteger(object.userData.physicalSeatIndex))return;
        const neck=object.getObjectByName('nakama-neck'), face=object.getObjectByName('nakama-face'), torso=object.getObjectByName('nakama-torso').children[0];
        const box=object=>{let bounds;object.traverse(mesh=>{if(!mesh.geometry)return;mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);if(bounds)bounds.union(b);else bounds=b;});return bounds;};
        const n=box(neck), f=box(face), t=box(torso);
        const p=box(object.getObjectByName('nakama-pelvis')), legs=box(object.getObjectByName('nakama-seated-legs')), shoes=box(object.getObjectByName('nakama-shoes'));
        const pelvisCenter=p.getCenter(object.position.clone()), torsoCenter=t.getCenter(object.position.clone());
        const rootY=object.getWorldPosition(object.position.clone()).y;
        const hat=object.getObjectByName('nakama-hat-base'), hair=object.getObjectByName('nakama-hair');
        const hairBounds=box(hair.children[0]);hair.traverse(part=>{if(part.isMesh)hairBounds.union(box(part));});
        characters.push({name:object.name,neckToHead:n.intersectsBox(f),neckToBody:n.intersectsBox(t),hatJoined:hat?box(hat).intersectsBox(hairBounds):true,
          hipJoined:p.intersectsBox(t)&&p.intersectsBox(legs),feetJoined:legs.intersectsBox(shoes),
          hipCentered:Math.abs(pelvisCenter.x-torsoCenter.x)<.01&&Math.abs(pelvisCenter.z-torsoCenter.z)<.04,
          feetY:shoes.min.y-rootY,archetypeId:object.userData.archetypeId});
      });
      return characters;
    })()`);
    assert(mounted.detailedCount>0,"The production detail budget must mount visible visitor models.");
    assert.equal(characters.length,mounted.detailedCount,"Every actually detailed registered visitor must be inspected.");
    for(const character of characters) {
      assert(character.neckToHead && character.neckToBody, `${character.name}: the neck must join the animated head and shoulders.`);
      assert(character.hatJoined, `${character.name}: the hat must sit on the hair without a gap.`);
      assert(character.hipJoined && character.hipCentered, `${character.name}: the pelvis must join the torso and thighs without a lateral offset.`);
      const expectedFeetY=character.archetypeId==='chopper'?.945:.63;
      assert(character.feetJoined && Math.abs(character.feetY-expectedFeetY)<.005, `${character.name}: ankles must join shoes, with Chopper's short legs dangling and adult shoes resting on the cabin floor.`);
    }
    const crew=await run(`['kamal','kyta'].map(name=>{
      const s=window.busCameraTestState(), root=s.scene.getObjectByName('bus-crew-'+name);
      const box=mesh=>{mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);};
      const pelvis=box(root.getObjectByName('nakama-pelvis')), shoes=box(root.getObjectByName('nakama-shoes'));
      const neck=root.getObjectByName('crew-neck-'+name), torso=root.children.find(group=>group.position.y===1.48).children[0];
      let shirtBounds=null;torso.traverse(mesh=>{if(mesh.isMesh){if(shirtBounds)shirtBounds.union(box(mesh));else shirtBounds=box(mesh);}});
      return {name,joined:pelvis.intersectsBox(shirtBounds),neckJoined:box(neck).intersectsBox(shirtBounds),feetY:shoes.min.y-s.scene.getObjectByName('bus-vehicle').position.y};
    })`);
    assert(crew.every(driver=>driver.joined&&driver.neckJoined&&Math.abs(driver.feetY-.63)<.005),"Both guides must have their pelvis and neck connected to the torso and shoes on the floor.");
    await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
    await waitForPageCondition(send, `window.busDestinationTestReducedMotion()===true`, "Reduced-motion preference reaches the character scene");
    await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const check=()=>s.gl.info.render.frame>frame+1?resolve(true):requestAnimationFrame(check);requestAnimationFrame(check);})`);
    const still=await run(`(() => {const scene=window.busCameraTestState().scene, poses=[];scene.traverse(object=>{
      if(!/^nakama-.*-[0-9]+$/.test(object.name)||object.userData.passengerKind!=='visitor'||!Number.isInteger(object.userData.physicalSeatIndex))return;
      poses.push({breath:object.getObjectByName('nakama-torso').parent.scale.x,bob:object.getObjectByName('nakama-neck').parent.rotation.x});
    });return poses;})()`);
    assert(still.length===characters.length&&still.every(pose=>pose.breath===1&&pose.bob===0),"Reduced-motion mode must suspend decorative body and head motion on every mounted visitor.");
    await send("Emulation.setEmulatedMedia",{features:[]});
    const details=await run(`(() => {
      const scene=window.busCameraTestState().scene, bus=scene.getObjectByName('bus-vehicle'), slogans=[];
      scene.traverse(object=>{if(object.name.startsWith('bus-side-slogan-'))slogans.push({y:object.getWorldPosition(bus.position.clone()).y-bus.position.y,height:object.geometry.parameters.height,aspect:object.geometry.parameters.width/object.geometry.parameters.height,textureAspect:object.material.map.image.width/object.material.map.image.height});});
      return {slogans,glazing:[...scene.getObjectByName('bus-door-front-leaf').children[0].children,...scene.getObjectByName('bus-door-rear-leaf').children[0].children].filter(object=>object.name==='bus-door-glazing').map(mesh=>({type:mesh.geometry.type,singlePass:mesh.material.forceSinglePass}))};
    })()`);
    assert.equal(details.slogans.length,5,"All five side inscriptions must be rendered.");
    assert(details.slogans.every(s=>Math.abs(s.y-1.125)<.001),"Side inscriptions must be vertically centered on the blue body panel.");
    assert(details.slogans.every(s=>s.height>=.675&&Math.abs(s.aspect-s.textureAspect)<.001),"Enlarged slogans must preserve the texture aspect ratio without vertical squashing.");
    assert(details.glazing.length===2 && details.glazing.every(glass=>glass.type==='PlaneGeometry'&&glass.singlePass),"Door glazing must have one surface per leaf to avoid overlapping transparent faces.");
    const chair=await run(`(() => {
      const s=window.busCameraTestState(), seat=s.scene.getObjectByName('bus-entry-seat');
      const mesh=seat.getObjectByName('bus-entry-seat-cushion');mesh.geometry.computeBoundingBox();
      const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld), bus=s.scene.getObjectByName('bus-vehicle');
      const occupant=s.scene.getObjectByName('bus-entry-passenger'),hips=occupant.getObjectByName('nakama-hips').getWorldPosition(occupant.position.clone());
      const shoes=occupant.getObjectByName('nakama-shoes');shoes.geometry.computeBoundingBox();
      const feet=shoes.geometry.boundingBox.clone().applyMatrix4(shoes.matrixWorld);
      const neck=occupant.getObjectByName('nakama-neck'),face=occupant.getObjectByName('nakama-face');
      neck.geometry.computeBoundingBox();face.geometry.computeBoundingBox();
      const neckJoined=neck.geometry.boundingBox.clone().applyMatrix4(neck.matrixWorld).intersectsBox(face.geometry.boundingBox.clone().applyMatrix4(face.matrixWorld));
      const cushions=s.scene.getObjectByName('bus-seat-cushions'), matrix=seat.matrix.clone();cushions.getMatrixAt(0,matrix);
      return {right:box.max.x-bus.position.x,front:box.min.z-bus.position.z,rear:box.max.z-bus.position.z,doorZ:s.scene.getObjectByName('bus-entry-landing').position.z,
        occupied:occupant.visible,neckJoined,relay:!!occupant.getObjectByName('bus-relay-puzzle-head')&&!!occupant.getObjectByName('bus-relay-phone'),
        feetY:feet.min.y-bus.position.y,calfClearance:box.min.z-(hips.z-.28+.06),
        benchDepth:cushions.geometry.parameters.depth,benchFront:matrix.elements[14]-cushions.geometry.parameters.depth/2};
    })()`);
    assert(chair.right<-.45&&chair.front>-3.5&&chair.rear<-2.4,"The extra armchair must sit opposite the entrance with the aisle and existing seats clear.");
    assert(chair.occupied&&Math.abs(chair.feetY-.63)<.005,"The entry chair must have a seated companion with feet resting on the floor.");
    assert(chair.relay&&chair.neckJoined,"FoudubusTV must occupy the chair with his own joined puzzle avatar and phone.");
    await run(`[...document.querySelectorAll('.bus-top-stats button')].find(button=>/passagers/i.test(button.textContent)).click()`);
    await waitForPageCondition(send,`Boolean(document.querySelector('[aria-label="Équipage permanent"]'))`,"The permanent crew list opens");
    const relayLink=await run(`(() => {const link=document.querySelector('[aria-label="Équipage permanent"] a');return {url:link?.href,text:link?.textContent,role:link?.parentElement.textContent};})()`);
    assert(relayLink.url==='https://x.com/FoudubusTV_'&&relayLink.text.includes('@FoudubusTV_')&&relayLink.role.includes('Relais de la théorie'),"The relay's identity, role and public profile must appear in the crew list.");
    for(const width of [320,640,1240]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
      const bounds=await run(`(()=>{const link=document.querySelector('[aria-label="Équipage permanent"] a'),rect=link.getBoundingClientRect();return {left:rect.left,right:rect.right,width:innerWidth};})()`);
      assert(bounds.left>=0&&bounds.right<=bounds.width,"The crew profile link must stay inside mobile and desktop viewports.");
    }
    if(process.env.BUS_VISUAL_OUTPUT){
      await mkdir(resolve(process.env.BUS_VISUAL_OUTPUT),{recursive:true});
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(resolve(process.env.BUS_VISUAL_OUTPUT,'equipage-permanent.png'),Buffer.from(shot.data,'base64'));
    }
    await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
    assert(chair.calfClearance>.02&&chair.benchDepth<=.4&&chair.benchFront>-1.65,"Shortened chair and bench cushions must leave the lower legs visible.");
    if (process.env.BUS_VISUAL_OUTPUT) {
      const directory=resolve(process.env.BUS_VISUAL_OUTPUT);
      await mkdir(directory,{recursive:true});
      await run(`(() => {
        const state=window.busCameraTestState();state.controls.enabled=false;
        state.controls.enableDamping=false;state.controls.update();
        window.characterInspectionVisibility=[];
        state.scene.traverse(object=>window.characterInspectionVisibility.push([object,object.visible]));
        document.querySelector('.bus-title-panel').parentElement.style.visibility='hidden';
      })()`);
      const portraits=process.env.BUS_VISUAL_FOCUS==='entry' ? [{name:'bus-entry-passenger'}] : [...characters,{name:'bus-crew-kamal'},{name:'bus-crew-kyta'},{name:'bus-entry-passenger'}];
      for (const {name} of portraits) {
        await run(`(() => {
          const state=window.busCameraTestState(), character=state.scene.getObjectByName(${JSON.stringify(name)});
          const keep=new Set();let ancestor=character;while(ancestor){keep.add(ancestor);ancestor=ancestor.parent;}
          state.scene.traverse(object=>{if(object.isLight){let parent=object;while(parent){keep.add(parent);parent=parent.parent;}}});
          for(const [object,visible] of window.characterInspectionVisibility){let parent=object,belongs=false;while(parent){if(parent===character){belongs=true;break;}parent=parent.parent;}object.visible=visible&&(belongs||keep.has(object));}
          const center=character.getWorldPosition(state.camera.position.clone());
          state.camera.position.set(center.x+0.65,center.y+1.7,center.z-2.3);
          state.controls.target.set(center.x,center.y+1.48,center.z+0.1);state.controls.update();
          state.camera.updateMatrixWorld();
        })()`);
        await run(`new Promise(resolve=>{const state=window.busCameraTestState(), frame=state.gl.info.render.frame;const check=()=>state.gl.info.render.frame>frame+1?resolve(true):requestAnimationFrame(check);requestAnimationFrame(check);})`);
        const screenshot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,clip:{x:360,y:130,width:520,height:670,scale:1}});
        await writeFile(resolve(directory,`${name}.png`),Buffer.from(screenshot.data,"base64"));
      }
      await run(`for(const [mesh,visible] of window.characterInspectionVisibility)mesh.visible=visible;`);
      await run(`(() => {const s=window.busCameraTestState();s.camera.position.set(.65,1.52,-3.65);s.controls.target.set(-.84,1.4,-2.93);s.controls.update();s.camera.updateMatrixWorld();})()`);
      await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const check=()=>s.gl.info.render.frame>frame+2?resolve(true):requestAnimationFrame(check);requestAnimationFrame(check);})`);
      const chairScreenshot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
      await writeFile(resolve(directory,"bus-fauteuil-entree.png"),Buffer.from(chairScreenshot.data,"base64"));
      for (const [side,label] of [[1,"droite"],[-1,"gauche"]]) {
        await run(`(() => {const s=window.busCameraTestState();s.camera.position.set(${side*11},2.3,0.5);s.controls.target.set(0,1.6,0.5);s.controls.update();s.camera.updateMatrixWorld();})()`);
        await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const check=()=>s.gl.info.render.frame>frame+2?resolve(true):requestAnimationFrame(check);requestAnimationFrame(check);})`);
        const screenshot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
        await writeFile(resolve(directory,`bus-inscriptions-${label}.png`),Buffer.from(screenshot.data,"base64"));
      }
      await run(`(() => {const s=window.busCameraTestState();document.querySelector('.bus-title-panel').parentElement.style.visibility='';s.camera.position.set(10,4,-9);s.controls.target.set(0,1.7,.5);s.controls.update();})()`);
      await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const check=()=>s.gl.info.render.frame>frame+2?resolve(true):requestAnimationFrame(check);requestAnimationFrame(check);})`);
      const freeView=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
      await writeFile(resolve(directory,"bus-vue-libre.png"),Buffer.from(freeView.data,"base64"));
      await run(`document.querySelector('button[aria-label="Revenir à ma place"]').click()`);
      await waitForPageCondition(send, `document.querySelector('.bus-app').dataset.view==='seat' && !window.busCameraTestState().controls.enabled && Math.abs(window.busCameraTestState().camera.position.y-1.84)<.01`, "Door inspection returns to seated eyes", 15_000);
      await run(`document.querySelector('.bus-title-panel').parentElement.style.visibility='hidden'`);
      for (const [key,label] of [["ArrowRight","droite"],["ArrowLeft","gauche"]]) {
        await run(`document.querySelector('button[aria-label="Recentrer la vue"]').click()`);
        await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const check=()=>s.gl.info.render.frame>frame+8?resolve(true):requestAnimationFrame(check);requestAnimationFrame(check);})`);
        for(let press=0;press<4;press++) {
          await send("Input.dispatchKeyEvent",{type:"keyDown",key,code:key});
          await send("Input.dispatchKeyEvent",{type:"keyUp",key,code:key});
        }
        await run(`new Promise(resolve=>{const s=window.busCameraTestState(),frame=s.gl.info.render.frame;const check=()=>s.gl.info.render.frame>frame+8?resolve(true):requestAnimationFrame(check);requestAnimationFrame(check);})`);
        const seated=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
        await writeFile(resolve(directory,`bus-entree-assis-${label}.png`),Buffer.from(seated.data,"base64"));
      }
    }
    assert.deepEqual(await run("window.characterMutationRequests"), [], "Character inspection must never mutate visitor records.");
    assert((await run("window.characterFixtureRequests")).every(request=>request.fixture),"All passenger API interactions stay inside the isolated twenty-visitor fixture.");
    console.log(`${characters.length} detailed registered visitors checked: necks, hats, centered pelvis, connected legs and appropriate foot heights; enlarged slogans and the human hosts' entry chair checked.`);
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument",{identifier:injection.identifier});
    if (process.env.UI_LOW_POWER === "1") {
      await send("Emulation.setHardwareConcurrencyOverride", {hardwareConcurrency:4});
    }
  }
}
