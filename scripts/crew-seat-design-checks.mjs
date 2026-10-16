import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import * as THREE from "three";
import { installTestYouTube } from "./media-playback-checks.mjs";
import { runDriverVisualChecks } from "./driver-visual-checks.mjs";
import { runHudLayoutChecks } from "./hud-layout-checks.mjs";
import { runMugiwaraCabinChecks } from "./mugiwara-cabin-checks.mjs";

/** Real scene meshes and actions; visitor registration and YouTube stay isolated. */
export async function runCrewSeatDesignChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const compiled = await build({ stdin: { contents: "export * from './src/lib/bus-layout'; export * from './src/lib/bus-occupancy'; export { NAKAMA_ROSTER } from './src/components/bus/passenger-archetypes';", resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
  const layout = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
  const roster = layout.NAKAMA_ROSTER;
  const requestedPortraits = process.env.BUS_PORTRAIT_IDS?.split(",").filter(Boolean);
  const portraitRoster = requestedPortraits ? roster.filter(({ id }) => requestedPortraits.includes(id)) : roster;
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 60_000);
  const directory = process.env.BUS_VISUAL_OUTPUT;
  const capturePortraits = process.env.BUS_CAPTURE_PORTRAITS !== "0";
  const portraitOnly = process.env.BUS_REVIEW_STAGE === "portrait";
  const resumeGuides = process.env.BUS_REVIEW_STAGE === "guides";
  const results = resumeGuides && directory ? JSON.parse(await readFile(resolve(directory, "verification-places-design.json"), "utf8")) : {};
  const checkpoint = async stage => {
    console.log(`Crew review: ${stage}.`);
    if (directory) {
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, "verification-places-design.json"), JSON.stringify({ ...results, completedStage: stage }, null, 2));
    }
  };
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (()=>{
    (${installTestYouTube.toString()})();
    const nativeFetch = fetch.bind(window);
    window.crewSeatRequests = [];
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/api/bus-entries')) return nativeFetch(input, init);
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const count = Number(new URLSearchParams(location.search).get('count') ?? '4');
      const seatIndex = Number(new URLSearchParams(location.search).get('seat') ?? '0');
      window.crewSeatRequests.push({ method, fixture: true });
      const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      const snapshot = { count: Math.max(count, window.crewSeatJoined ? seatIndex + 1 : 0),
        seatCapacity: Math.max(count, window.crewSeatJoined ? seatIndex + 1 : 0),
        profileRevision: 1, vacantSeatRanges: [], passengers: [] };
      if(url.searchParams.has('manifest')) {
        snapshot.passengers=Array.from({length:Math.min(snapshot.count,100)},(_,seatIndex)=>({seatIndex,displayName:null,hasComment:false}));
        snapshot.nextFrom=snapshot.passengers.length;snapshot.hasMore=snapshot.count>100;
      }
      if (method === 'GET' || method === 'HEAD') return Promise.resolve(response(snapshot));
      if (method === 'POST') {
        window.crewSeatJoined = true;
        window.crewSeatPending = true;
        return new Promise(resolve => {
          const finish = () => { window.crewSeatPending = false; resolve(response({ ...snapshot,
            count: Math.max(count, seatIndex + 1), seatCapacity: Math.max(count, seatIndex + 1),
            seatIndex, added: seatIndex >= count, passenger: null })); };
          if(window.crewSeatHoldRegistration)window.crewSeatReleaseRegistration = finish;
          else finish();
        });
      }
      throw new Error('This fixture cannot write to the passenger database.');
    };
    })();
  ` });
  const click = label => run(`document.querySelector('button[aria-label=${JSON.stringify(label)}]:not(:disabled)').click()`);
  const frames = async (count = 2) => {
    const frame = await run("window.busCameraTestState().gl.info.render.frame");
    await wait(`window.busCameraTestState().gl.info.render.frame>=${frame + count}`, "Requested scene frames render");
  };
  const screenshot = async name => {
    if (!directory) return;
    await mkdir(directory, { recursive: true });
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(resolve(directory, name), Buffer.from(shot.data, "base64"));
  };
  const resourceSnapshot = () => run(`(()=>{
    const s=window.busCameraTestState(),passengers=s.scene.getObjectByName('bus-seated-passengers');
    return {drawCalls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,
      geometries:s.gl.info.memory.geometries,textures:s.gl.info.memory.textures,dpr:s.viewport.dpr,
      detailed:passengers.userData.detailedCount,simplified:passengers.userData.simplifiedCount,
      tvPlayers:document.querySelectorAll('#tv-primary-iframe').length};
  })()`);
  const open = async (count, seat = 0, mobile = false, inside = false) => {
    await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: mobile ? 4 : 8 });
    await send("Emulation.setDeviceMetricsOverride", { width: mobile ? 393 : 1240, height: mobile ? 852 : 900, deviceScaleFactor: 1, mobile });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await send("Page.navigate", { url: `${baseUrl}/?count=${count}&seat=${seat}&row=0${inside ? "&phase=inside" : ""}` });
    await wait("document.querySelector('.bus-app')?.dataset.sceneAvailable==='true'&&Boolean(window.mediaTestPlayers.music)&&Boolean(window.mediaTestPlayers.bus)", "The isolated bus scene and players are ready");
    await wait("window.busDestinationTestReducedMotion()===true", "Reduced motion reaches the real scene");
    await frames();
  };
  const occupancy = async (count, includeAvatar) => {
    const occupants = await run(`(() => {
      const s=window.busCameraTestState(), bus=s.scene.getObjectByName('bus-vehicle'), people=[];
      bus.updateMatrixWorld(true);
      const visible=object=>{let parent=object;while(parent){if(!parent.visible)return false;parent=parent.parent;}return true;};
      s.scene.traverse(object=>{
        if(/^(crew-)?nakama-.*-\\d+$/.test(object.name)&&visible(object)) {
          const p=object.getWorldPosition(s.camera.position.clone());bus.worldToLocal(p);
          people.push({name:object.name,position:p.toArray(),metadata:object.userData});
        }
        if(object.name==='bus-distant-passenger-bodies'&&visible(object)) {
          const matrix=object.matrixWorld.clone(), point=s.camera.position.clone();
          for(let index=0;index<object.count;index++){
            object.getMatrixAt(index,matrix);point.setFromMatrixPosition(matrix);object.localToWorld(point);bus.worldToLocal(point);
            const metadata=object.userData.occupants[index];
            const id=${JSON.stringify(roster.map(({ id }) => id))}[metadata.seatIndex%${roster.length}];
            // Compact Chopper's torso follows his shorter hip/torso rig.
            point.z-=id==='chopper'?.045:.12;
            people.push({name:'simplified-'+index,position:point.toArray(),metadata});
          }
        }
      });
      const avatar=s.scene.getObjectByName('bus-boarding-avatar');
      if(${Boolean(includeAvatar)}&&visible(avatar)){
        const p=avatar.getWorldPosition(s.camera.position.clone());bus.worldToLocal(p);
        people.push({name:avatar.name,position:p.toArray(),metadata:avatar.userData});
      }
      return people;
    })()`);
    const rows = layout.getBusPhysicalRows(count);
    const seats = new Map(), benches = new Map();
    for (const actor of occupants) {
      assert(Number.isInteger(actor.metadata?.physicalSeatIndex), `${actor.name} must expose its real physical place.`);
      const row = Math.floor(actor.metadata.physicalSeatIndex / 4), columnIndex = actor.metadata.physicalSeatIndex % 4;
      assert(row >= 0 && row < rows && columnIndex >= 0, `${actor.name} must stay inside the actual bus seat capacity.`);
      const column = { x: [-.94, -.5, .5, .94][columnIndex], index: columnIndex };
      assert(Math.abs(column.x - actor.position[0]) < .005 && Math.abs(layout.getSeatRowZ(row) - actor.position[2]) < .02,
        `${actor.name} must sit in one actual seat column and row.`);
      const key = row * 4 + column.index;
      assert(!seats.has(key), `${actor.name} and ${seats.get(key)} cannot share one place.`);
      seats.set(key, actor.name);
      const bench = `${row}-${column.index < 2 ? 'left' : 'right'}`;
      benches.set(bench, (benches.get(bench) ?? 0) + 1);
    }
    assert([...benches.values()].every(count => count <= 2), "Every real bench holds at most two people.");
    return { people: occupants, maxPerBench: Math.max(0, ...benches.values()), rows };
  };
  const enter = async (checkPending = false) => {
    if (checkPending) {
      results.beforeRegistration = await occupancy(4, false);
      await run("window.crewSeatHoldRegistration=true");
    }
    await run("[...document.querySelectorAll('button')].find(button=>!button.disabled&&button.textContent.includes('Entrer dans le bus')).click()");
    if (checkPending) {
      await wait("window.crewSeatPending&&window.busJourneyTestState().waitingForSeat", "The real scene waits for seat assignment");
      results.pendingRegistration = await occupancy(4, false);
      const positions = snapshot => snapshot.people.map(person=>({name:person.name,x:person.position[0],z:person.position[2]})).sort((a,b)=>a.name.localeCompare(b.name));
      assert.deepEqual(positions(results.pendingRegistration),positions(results.beforeRegistration), "No occupant may change places before the pending registration resolves.");
      assert.equal(await run("window.busJourneyTestState().avatarVisible"),false);
      await run("window.crewSeatReleaseRegistration();window.crewSeatHoldRegistration=false");
    }
    await wait("document.querySelector('.bus-app').dataset.phase==='inside'", "The real boarding controller reaches seated first person");
    await frames();
  };
  const freeView = async () => {
    await click("Explorer en vue libre");
    await wait("document.querySelector('.bus-app').dataset.view==='free'", "Existing free exploration remains available");
    await frames(4); // Reduced-motion transition takes one rendered frame.
    await run("const s=window.busCameraTestState();s.controls.enabled=false;s.controls.enableDamping=false");
  };
  const pose = async (position, target) => {
    await run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');
      const p=s.camera.position.clone().fromArray(${JSON.stringify(position)}),t=s.controls.target.clone().fromArray(${JSON.stringify(target)});
      bus.localToWorld(p);bus.localToWorld(t);s.camera.position.copy(p);s.controls.target.copy(t);s.controls.update();s.camera.updateMatrixWorld();
    })()`);
    await frames();
  };
  try {
    if (process.env.BUS_REVIEW_STAGE === "corrections") {
      return await runMugiwaraCabinChecks({ send, evaluate, waitForPageCondition, baseUrl, open, frames,
        pose, screenshot, click, freeView, resourceSnapshot, layout, roster, directory });
    }
    if (portraitOnly) {
      assert(directory, "Targeted portraits require BUS_VISUAL_OUTPUT.");
      assert(portraitRoster.length > 0, "BUS_PORTRAIT_IDS must select an existing character.");
      results.portraits = [];
      results.apiRequests = [];
      for (const mobile of [false, true]) {
        const viewport = mobile ? "mobile" : "desktop";
        // Starting inside avoids registration and the boarding animation; the
        // actual scene, models, materials, camera and party gate remain active.
        await open(0, 0, mobile, true);
        await freeView();
        await run(`(()=>{
          const s=window.busCameraTestState(),app=document.querySelector('.bus-app');
          window.crewSeatVisibility=[];s.scene.traverse(object=>window.crewSeatVisibility.push([object,object.visible]));
          window.crewPortraitDomVisibility=[];
          for(const element of app.children)if(!element.contains(s.gl.domElement)){
            window.crewPortraitDomVisibility.push([element,element.style.visibility]);element.style.visibility='hidden';
          }
        })()`);
        for (const state of ["repos", "fete"]) {
          if (state === "fete") {
            await click("Lancer la fête");
            await wait("window.mediaTestPlayers.music.state===1", "Targeted portrait party playback starts");
            await run("window.mediaTestPlayers.music.getCurrentTime=function(){return this.currentTime};window.mediaTestPlayers.music.seekTo(9,true)");
            await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "The eight-second party gate reaches the portrait");
            await frames();
          }
          for (const { id } of portraitRoster) {
            const actorName = `crew-nakama-${id}-${roster.findIndex(character=>character.id===id)}`;
            const geometry = await run(`(()=>{
              const s=window.busCameraTestState(),actor=s.scene.getObjectByName(${JSON.stringify(actorName)});
              const head=actor.getObjectByName('nakama-head'),face=actor.getObjectByName('nakama-face'),hair=actor.getObjectByName('nakama-hair');
              if(!head||!face||!hair)return {available:false,name:actor.name};
              s.scene.updateMatrixWorld(true);
              const bounds=object=>{const box=face.geometry.boundingBox?.clone();
                if(box)return box.setFromObject(object);face.geometry.computeBoundingBox();return face.geometry.boundingBox.clone().setFromObject(object);};
              const faceBox=bounds(face),hairBox=bounds(hair),pieces=[];
              hair.traverse(mesh=>{if(mesh.isMesh)pieces.push({mesh,box:bounds(mesh)});});
              const reached=new Set(pieces.filter(part=>part.box.intersectsBox(faceBox)));
              for(let pass=0;pass<pieces.length;pass++)for(const part of pieces)if(!reached.has(part)
                &&[...reached].some(other=>part.box.intersectsBox(other.box)))reached.add(part);
              const front=s.camera.position.clone().set(0,0,-1).applyQuaternion(face.getWorldQuaternion(s.camera.quaternion.clone()));
              const eyes=actor.getObjectsByProperty('name','nakama-eye-base').map(eye=>{
                const center=eye.getWorldPosition(s.camera.position.clone());
                const ray=new s.raycaster.constructor(center.clone().addScaledVector(front,.5),front.clone().negate(),0,.5);
                return {position:center.toArray(),hairInFront:ray.intersectObject(hair,true).some(hit=>hit.distance<.5)};
              });
              return {available:true,name:actor.name,headBounds:[bounds(head).min.toArray(),bounds(head).max.toArray()],
                faceBounds:[faceBox.min.toArray(),faceBox.max.toArray()],hairBounds:[hairBox.min.toArray(),hairBox.max.toArray()],
                hairMeshes:pieces.length,hairTouchesFace:hairBox.intersectsBox(faceBox),connectedHairMeshes:reached.size,
                eyes,method:'actual mounted world-space geometry bounds; raycasts record hair coverage of eye centres'};
            })()`);
            assert(geometry.available && geometry.hairMeshes > 0 && geometry.hairTouchesFace,
              `${id}: the real hair and face must be available and joined.`);
            assert.equal(geometry.connectedHairMeshes,geometry.hairMeshes,
              `${id}: every real hair volume must remain joined to the face or another hair volume.`);
            assert(geometry.eyes.length > 0 && geometry.eyes.some(eye=>!eye.hairInFront),
              `${id}: at least one named eye must remain uncovered by the actual hair raycasts.`);
            for (const [angle, direction] of [["face",[0,.04,-1]],["trois-quarts",[-.72,.06,-.69]]]) {
              const focus = await run(`(()=>{
                const s=window.busCameraTestState(),actor=s.scene.getObjectByName(${JSON.stringify(actorName)}),head=actor.getObjectByName('nakama-head');
                for(const [object,descriptor] of window.crewPortraitVisibilityLocks??[])Object.defineProperty(object,'visible',descriptor);
                window.crewPortraitVisibilityLocks=[];
                const keep=new Set();let parent=actor;while(parent){keep.add(parent);parent=parent.parent;}
                s.scene.traverse(object=>{if(object.isLight){let parent=object;while(parent){keep.add(parent);parent=parent.parent;}}});
                for(const [object,visible] of window.crewSeatVisibility){let parent=object,belongs=false;while(parent){if(parent===actor){belongs=true;break;}parent=parent.parent;}
                  if(!belongs&&!keep.has(object)){
                    window.crewPortraitVisibilityLocks.push([object,Object.getOwnPropertyDescriptor(object,'visible')]);
                    // Confetti and avatar frame callbacks cannot undo isolation.
                    Object.defineProperty(object,'visible',{configurable:true,get:()=>false,set:()=>{}});
                  }else if(!belongs)object.visible=visible;
                }
                s.scene.updateMatrixWorld(true);
                const face=actor.getObjectByName('nakama-face');face.geometry.computeBoundingBox();
                const box=face.geometry.boundingBox.clone().setFromObject(head);
                const center=head.getWorldPosition(s.camera.position.clone());center.y-=.012;
                const halfHeight=Math.max(box.max.y-center.y,center.y-box.min.y),halfWidth=(box.max.x-box.min.x)/2;
                const tangent=Math.tan(s.camera.fov*Math.PI/360);
                const distance=Math.max(halfHeight/tangent,halfWidth/(tangent*s.camera.aspect)) * 1.55;
                const direction=s.camera.position.clone().fromArray(${JSON.stringify(direction)}).normalize()
                  .applyQuaternion(head.getWorldQuaternion(s.camera.quaternion.clone()));
                s.camera.position.copy(center).addScaledVector(direction,distance);s.controls.target.copy(center);
                s.controls.update();s.camera.updateMatrixWorld();
                return {distance,target:center.toArray(),position:s.camera.position.toArray(),viewport:{width:s.size.width,height:s.size.height}};
              })()`);
              await frames();
              const filename = `${id}-${state}-${viewport}${angle === "face" ? "" : "-trois-quarts"}.png`;
              await screenshot(filename);
              results.portraits.push({id,state,viewport,angle,filename,focus,geometry});
              console.log(`Head portrait checked: ${id}, ${state}, ${viewport}, ${angle}.`);
            }
          }
        }
        await click("Arrêter la fête");
        await wait("document.querySelector('.bus-app').dataset.party==='false'", "Targeted portrait party stops");
        const requests = await run("window.crewSeatRequests");
        assert(requests.every(request=>request.fixture&&['GET','HEAD'].includes(request.method)),
          "Targeted portraits must never register a visitor or send a database mutation.");
        results.apiRequests.push({viewport,requests});
      }
      await writeFile(resolve(directory,"verification-portraits.json"),JSON.stringify(results,null,2));
      console.log(`Targeted head portraits passed for ${portraitRoster.length} character(s), desktop/mobile and resting/party.`);
      return results;
    }
    if (!resumeGuides) {
    await open(0);
    results.empty = await occupancy(0, false);
    results.emptyResources = await resourceSnapshot();
    assert.equal(results.empty.people.filter(person => person.name.startsWith("crew-nakama-")).length, roster.length, "Every One Piece model remains visible with no visitors.");
    results.anatomy = await run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');s.scene.updateMatrixWorld(true);
      const bounds=object=>{let result=null;object.traverse(mesh=>{if(!mesh.geometry)return;mesh.geometry.computeBoundingBox();
        const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);if(result)result.union(box);else result=box;});return result;};
      return ${JSON.stringify(roster.map(({id},index)=>`crew-nakama-${id}-${index}`))}.map(name=>{
        const actor=s.scene.getObjectByName(name),neck=bounds(actor.getObjectByName('nakama-neck')),
          face=bounds(actor.getObjectByName('nakama-face')),body=bounds(actor.getObjectByName('nakama-torso-body')),
          hips=bounds(actor.getObjectByName('nakama-pelvis')),legs=bounds(actor.getObjectByName('nakama-seated-legs')),
          feet=bounds(actor.getObjectByName('nakama-shoes'));
        return {name,neckJoined:neck.intersectsBox(face)&&neck.intersectsBox(body),hipsJoined:hips.intersectsBox(body)&&hips.intersectsBox(legs),
          feetJoined:legs.intersectsBox(feet),floorHeight:feet.min.y-bus.position.y,archetypeId:actor.userData.archetypeId};
      });
    })()`);
    for(const character of results.anatomy)assert(character.neckJoined&&character.hipsJoined&&character.feetJoined&&Math.abs(character.floorHeight-(character.archetypeId==='chopper'?.945:.63))<.005,
      `${character.name} must keep its neck, hips and feet connected, with Chopper's short legs dangling and adult shoes on the floor.`);
    await checkpoint("all twenty mounted bodies checked");

    await open(4, 0);
    await enter(true);
    results.seated = await occupancy(4, true);
    assert.equal(results.seated.people.length, roster.length + 4, "Every visitor and named character uses a distinct seat.");
    const initial = await run("window.busJourneyTestState().position.toArray()");
    assert(Math.abs(initial[0] + .94) < .005, "The registered visitor in place zero must use its real left seat.");
    await click("Rangée suivante");
    await wait(`Math.abs(window.busJourneyTestState().position.z - (${layout.getSeatRowZ(1)}))<.01`, "Changing rows moves the same visitor");
    results.changedRow = await occupancy(4, true);
    assert.equal(results.changedRow.people.length, roster.length + 4);
    for (let row = 2; row <= layout.getVisitorRows(4); row++) {
      await click("Rangée suivante");
      await wait(`Math.abs(window.busJourneyTestState().position.z - (${layout.getSeatRowZ(row)}))<.01`, "Row navigation reaches the character section");
    }
    results.characterRow = await occupancy(4, true);
    assert.equal(results.characterRow.people.length, roster.length + 4, "Visiting an occupied character row keeps its displaced occupant in the bus.");
    const clothing = await run(`(()=>{
      const s=window.busCameraTestState();s.scene.updateMatrixWorld(true);
      return [['zoro',1],['nami',2],['usopp',3]].map(([id,index])=>{
        const actor=s.scene.getObjectByName('crew-nakama-'+id+'-'+index),skin=actor.getObjectByName('nakama-torso-body'),top=actor.getObjectByName('nakama-'+id+'-top');
        return {id,skin:Array.from(skin.geometry.attributes.position.array),indices:skin.geometry.index?Array.from(skin.geometry.index.array):null,
          garment:Array.from(top.geometry.attributes.position.array),matrix:skin.matrixWorld.clone().invert().multiply(top.matrixWorld).elements.slice()};
      });
    })()`);
    results.clothing = [];
    for (const outfit of clothing) {
      const matrix = new THREE.Matrix4().fromArray(outfit.matrix), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      const point = new THREE.Vector3(), closest = new THREE.Vector3(), triangle = new THREE.Triangle();
      let maxGap = 0, minGap = Infinity;
      for (let vertex = 0; vertex < outfit.garment.length; vertex += 3) {
        point.fromArray(outfit.garment, vertex).applyMatrix4(matrix);
        let distance = Infinity;
        for (let face = 0; face < (outfit.indices?.length ?? outfit.skin.length / 3); face += 3) {
          a.fromArray(outfit.skin, (outfit.indices?.[face] ?? face) * 3);
          b.fromArray(outfit.skin, (outfit.indices?.[face + 1] ?? face + 1) * 3);
          c.fromArray(outfit.skin, (outfit.indices?.[face + 2] ?? face + 2) * 3);
          triangle.set(a, b, c).closestPointToPoint(point, closest);
          distance = Math.min(distance, point.distanceTo(closest));
        }
        maxGap = Math.max(maxGap, distance); minGap = Math.min(minGap, distance);
      }
      assert(minGap > .0005 && maxGap < .003, `${outfit.id}'s actual costume must remain against the skin without a floating panel.`);
      results.clothing.push({ id: outfit.id, minGap, maxGap });
    }
    await checkpoint("desktop seats, registration and clothing checked");
    await freeView();
    const rearZ = layout.getBusRearWallZ(layout.getBusPhysicalRows(4));
    await pose([8, 4.4, rearZ + 1], [0, 1.5, rearZ - 7]);
    await screenshot("equipage-places-deux-par-banquette.png");

    // Portraits inspect the actual newly built meshes with their normal materials.
    await run(`(()=>{
      const s=window.busCameraTestState();window.crewSeatVisibility=[];
      s.scene.traverse(object=>window.crewSeatVisibility.push([object,object.visible]));
      document.querySelector('.bus-title-panel').parentElement.style.visibility='hidden';
    })()`);
    const portrait = async (id, suffix) => {
      await run(`(()=>{
        const s=window.busCameraTestState(),actor=s.scene.getObjectByName('crew-nakama-${id}-${roster.findIndex(character=>character.id===id)}'),keep=new Set();
        let parent=actor;while(parent){keep.add(parent);parent=parent.parent;}
        s.scene.traverse(object=>{if(object.isLight){let parent=object;while(parent){keep.add(parent);parent=parent.parent;}}});
        for(const [object,visible] of window.crewSeatVisibility){let parent=object,belongs=false;while(parent){if(parent===actor){belongs=true;break;}parent=parent.parent;}object.visible=visible&&(belongs||keep.has(object));}
        const center=actor.getWorldPosition(s.camera.position.clone());
        s.camera.position.set(center.x+.45,center.y+1.72,center.z-1.85);s.controls.target.set(center.x,center.y+1.45,center.z);s.controls.update();s.camera.updateMatrixWorld();
      })()`);
      await frames(); await screenshot(`${id}-${suffix}.png`);
    };
    if (capturePortraits) for (const {id} of portraitRoster) { await portrait(id, "repos"); console.log(`Portrait checked: ${id}, resting.`); }
    await click("Lancer la fête");
    await wait("window.mediaTestPlayers.music.state===1", "The requested party song starts");
    await run("window.mediaTestPlayers.music.getCurrentTime=function(){return this.currentTime};window.mediaTestPlayers.music.seekTo(9,true)");
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "The real eight-second gate releases dancing");
    await frames();
    if (capturePortraits) for (const {id} of portraitRoster) { await portrait(id, "fete"); console.log(`Portrait checked: ${id}, party.`); }
    await run(`for(const [object,visible] of window.crewSeatVisibility)object.visible=visible;
      document.querySelector('.bus-title-panel').parentElement.style.visibility='';`);
    await pose([.05, 2.3, -2.7], [.84, 1.65, -4.03]);
    await screenshot("kita-fete.png");
    await click("Arrêter la fête");
    await wait("document.querySelector('.bus-app').dataset.party==='false'", "The party returns to normal activity");

    await open(1000, 999, true); await enter();
    results.mobile = await occupancy(1000, true);
    results.mobileResources = await resourceSnapshot();
    assert.equal(results.mobileResources.tvPlayers,1,"The expanded bus retains exactly one real TV player.");
    assert(results.mobileResources.detailed<=roster.length+2&&results.mobileResources.simplified<=160,
      "Mobile rendering budgets remain independent of the visitor population.");
    assert(results.mobile.people.length <= roster.length + 163, "Detailed and instanced passengers stay bounded in the long mobile bus.");
    await freeView();
    const mobileRear = layout.getBusRearWallZ(layout.getBusPhysicalRows(1000));
    await pose([9, 4.6, mobileRear + 3], [0, 1.6, mobileRear - 6]);
    await screenshot("equipage-bus-1000-mobile.png");
    await checkpoint("bounded mobile scene with one thousand visitors checked");
    await run("window.busCameraTestState().controls.enabled=true");
    const orbitBefore=await run("window.busCameraTestState().camera.position.toArray()");
    await send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:190,y:350,id:1}]});
    await send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:245,y:330,id:1}]});
    await send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await frames(3);
    const orbitAfter=await run("window.busCameraTestState().camera.position.toArray()");
    assert(new THREE.Vector3(...orbitBefore).distanceTo(new THREE.Vector3(...orbitAfter))>.03,"A synthesized one-finger drag must actually orbit the mobile free-view camera.");
    const distanceBefore=await run("window.busCameraTestState().camera.position.distanceTo(window.busCameraTestState().controls.target)");
    await send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:150,y:350,id:1},{x:230,y:350,id:2}]});
    await send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:120,y:350,id:1},{x:260,y:350,id:2}]});
    await send("Input.dispatchTouchEvent",{type:"touchCancel",touchPoints:[]});
    await frames(3);
    const distanceAfter=await run("window.busCameraTestState().camera.position.distanceTo(window.busCameraTestState().controls.target)");
    assert(distanceAfter<distanceBefore-.03,"A synthesized two-finger pinch must actually zoom in and release cleanly on cancel.");
    results.mobileTouch={orbitDistance:new THREE.Vector3(...orbitBefore).distanceTo(new THREE.Vector3(...orbitAfter)),distanceBefore,distanceAfter};
    await checkpoint("real mobile drag and pinch checked");
    assert((await run("window.crewSeatRequests")).every(request => request.fixture), "The harness never registers a real visitor.");
    }
    console.log("Real seat meshes checked on desktop and mobile; checking the mounted guide joints and reactions.");
    await runDriverVisualChecks({ send, evaluate, waitForPageCondition, baseUrl });
    await run("document.querySelector('button[title=\"Découvrir la théorie des Fous du Bus\"]').click()");
    await wait("Boolean(document.querySelector('[role=dialog]'))", "The reading dialog pauses the 3D scene");
    await run("new Promise(resolve=>setTimeout(resolve,300))");
    const pausedFrame=await run("window.busCameraTestState().gl.info.render.frame");
    await run("new Promise(resolve=>setTimeout(resolve,700))");
    assert.equal(await run("window.busCameraTestState().gl.info.render.frame"),pausedFrame,"The scene must stop rendering while a reading dialog covers it.");
    results.pausedWhileReading=true;
    await run("document.querySelector('button[aria-label=\"Fermer la fenêtre\"]').click()");
    await wait(`window.busCameraTestState().gl.info.render.frame>${pausedFrame}`,"3D rendering resumes after closing the reading dialog");
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await runHudLayoutChecks({ send, evaluate, waitForPageCondition, viewports: [
      {width:320,height:568,mobile:true}, {width:393,height:852,mobile:true},
      {width:768,height:1024,mobile:false}, {width:1000,height:700,mobile:false}, {width:1440,height:900,mobile:false},
    ] });
    await checkpoint("complete");
    console.log(`Crew seating passed: all ${roster.length} models without visitors, two occupants maximum per bench, actual assigned camera column, delayed registration, local row exchange, retained exploration, bounded 1000-visitor mobile scene and responsive title/HUD.`);
    return results;
  } finally {
    try {
      await run(`(()=>{for(const [object,descriptor] of window.crewPortraitVisibilityLocks??[])Object.defineProperty(object,'visible',descriptor);
        for(const [element,visibility] of window.crewPortraitDomVisibility??[])element.style.visibility=visibility;
        delete window.crewPortraitVisibilityLocks;delete window.crewPortraitDomVisibility;
        for(const [object,visible] of window.crewSeatVisibility??[])object.visible=visible;
        const title=document.querySelector('.bus-title-panel');if(title)title.parentElement.style.visibility='';
        delete window.crewSeatVisibility;})()`);
    } catch { /* The diagnostic page may have navigated after a failure. */ }
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
    await send("Emulation.setEmulatedMedia", { features: [] });
  }
}
