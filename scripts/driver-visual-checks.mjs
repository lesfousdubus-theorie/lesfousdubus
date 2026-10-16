import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";
import { installTestYouTube } from "./media-playback-checks.mjs";

/** Inspecte les articulations et volumes réels, dans la même page isolée que les autres contrôles. */
export async function runDriverVisualChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 30_000);
  const directory = process.env.BUS_VISUAL_OUTPUT;
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    const nativeFetch=fetch.bind(window);window.driverMutationRequests=[];
    window.fetch=(input,init)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.href);
      const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
      if(url.origin===location.origin&&url.pathname.startsWith('/api/bus-entries')){
        if(method!=='GET'&&method!=='HEAD'){
          window.driverMutationRequests.push({method,path:url.pathname});
          return Promise.resolve(new Response(JSON.stringify({error:'Visual fixture cannot modify visitors.'}),{status:503,headers:{'Content-Type':'application/json'}}));
        }
        if(url.pathname==='/api/bus-entries')return Promise.resolve(new Response(JSON.stringify({count:16,seatCapacity:16,profileRevision:1,vacantSeatRanges:[],passengers:[]}),{headers:{'Content-Type':'application/json'}}));
      }
      return nativeFetch(input,init);
    };` });
  const click = label => run(`document.querySelector('button[aria-label=${JSON.stringify(label)}]:not(:disabled)').click()`);
  const nextFrames = async (count = 3) => {
    const frame = await run("window.busCameraTestState().gl.info.render.frame");
    await wait(`window.busCameraTestState().gl.info.render.frame>=${frame + count}`, "Guide joints finish their frame updates");
  };
  const snapshotSource = `function(includeGeometry=false){
    const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');bus.updateMatrixWorld(true);
    const inverse=bus.matrixWorld.clone().invert(),geometries={},parts=[],guides=[],body=[],wheelParts=[];
    const save=(mesh,name)=>{
      mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;
      if(includeGeometry&&!geometries[mesh.geometry.uuid])geometries[mesh.geometry.uuid]={positions:Array.from(mesh.geometry.getAttribute('position').array),index:mesh.geometry.index?Array.from(mesh.geometry.index.array):null};
      return {name,geometry:mesh.geometry.uuid,bounds:[bounds.min.toArray(),bounds.max.toArray()],matrix:inverse.clone().multiply(mesh.matrixWorld).elements.slice()};
    };
    for(const name of ['kamal','kyta']){
      const root=s.scene.getObjectByName('bus-crew-'+name),hands=[];
      for(const side of ['left','right']){
        const arm=root.getObjectByName('crew-arm-'+name+'-'+side),elbow=root.getObjectByName('crew-elbow-'+name+'-'+side),wrist=root.getObjectByName('crew-hand-'+name+'-'+side),palm=root.getObjectByName('crew-palm-'+name+'-'+side);
        const a=bus.worldToLocal(arm.getWorldPosition(arm.position.clone())),e=bus.worldToLocal(elbow.getWorldPosition(elbow.position.clone())),w=bus.worldToLocal(wrist.getWorldPosition(wrist.position.clone()));
        palm.geometry.computeBoundingBox();
        hands.push({side,position:w.toArray(),upperLength:a.distanceTo(e),foreLength:e.distanceTo(w),visible:palm.visible,vertexCount:palm.geometry.getAttribute('position').count,geometry:palm.geometry.uuid,size:palm.geometry.boundingBox.getSize(w.clone()).toArray(),simpleParts:[arm,elbow,wrist].map(joint=>joint.children.filter(child=>child.isMesh).length),shoulder:arm.quaternion.toArray(),elbow:elbow.quaternion.toArray()});
        for(const mesh of arm.children.filter(o=>o.isMesh))parts.push(save(mesh,name+'-'+side+'-upper'));
        for(const mesh of elbow.children.filter(o=>o.isMesh))parts.push(save(mesh,name+'-'+side+'-fore'));
        parts.push(save(palm,name+'-'+side+'-skin'));
      }
      root.getObjectByName('crew-torso-'+name).traverse(mesh=>{if(!mesh.isMesh)return;let parent=mesh;while(parent&&parent!==root){if(parent.name.startsWith('crew-arm-'))return;parent=parent.parent;}body.push({...save(mesh,name+'-torso-'+body.length),region:'torso'});});
      root.getObjectByName('crew-hips').traverse(mesh=>{if(mesh.isMesh)body.push({...save(mesh,name+'-legs-'+body.length),region:'legs'});});
      guides.push({name,activity:root.userData.activity,hands});
    }
    const panels=[],dashboard=s.scene.getObjectByName('bus-dashboard');
    dashboard.traverse(mesh=>{if(!mesh.isMesh||mesh.name==='bus-navigator-bar')return;let parent=mesh;while(parent){if(parent.name==='bus-steering-wheel')return;parent=parent.parent;}panels.push(save(mesh,mesh.name||'dashboard-fitting-'+panels.length));});
    const wheel=s.scene.getObjectByName('bus-steering-wheel');
    wheel.traverse(mesh=>{if(mesh.isMesh)wheelParts.push(save(mesh,'steering-part-'+wheelParts.length));});
    return {time:performance.now(),frame:s.gl.info.render.frame,guides,parts,body,wheelParts,bar:save(s.scene.getObjectByName('bus-navigator-bar'),'navigator-bar'),panels,geometries,seats:{kamal:s.scene.getObjectByName('bus-driver-seat').position.toArray(),kyta:s.scene.getObjectByName('bus-guide-seat').position.toArray()},wheel:inverse.clone().multiply(wheel.matrixWorld).elements.slice()};
  }`;
  const sample = () => run(`window.driverRenderedSnapshot()`);
  const series = duration => run(`new Promise(resolve=>{
    const result=[],start=performance.now();let previous=-1;
    const inspect=()=>{const frame=window.busCameraTestState().gl.info.render.frame;if(frame!==previous){previous=frame;result.push(window.driverRenderedSnapshot());}
      if(performance.now()-start>${duration}&&result.length>=3){resolve(result);return;}requestAnimationFrame(inspect);};requestAnimationFrame(inspect);
  })`);
  const results = { resting: null, hornFrames: 0, partyFrames: 0, returnFrames: 0, contacts: [], wheelBodyContacts: [], minimumWheelTorsoGap: Infinity, minimumWheelKneeGap: Infinity };
  try {
    await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 8 });
    await send("Emulation.setDeviceMetricsOverride", { width: 1240, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=16&row=0` });
    await wait("Boolean(window.busCameraTestState()?.scene.getObjectByName('crew-palm-kyta-right'))&&Boolean(window.mediaTestPlayers.music)", "Rendered guide hands and controlled media load");
    await wait("window.busDestinationTestReducedMotion()===true", "Still poses reach both guides");
    await click("Explorer en vue libre"); await wait("window.busCameraTestState().controls.enabled", "The dashboard can be inspected");
    await nextFrames(5);
    await run(`window.driverRenderedSnapshot=${snapshotSource};`);
    const rest = await run("window.driverRenderedSnapshot(true)");
    const sourceGeometry = rest.geometries;
    const wheelInverse = new THREE.Matrix4().fromArray(rest.wheel).invert();
    assert.equal(new Set(rest.guides.flatMap(guide => guide.hands.map(hand => hand.geometry))).size, 1, "All four square hands share one simple closed shape.");
    assert(Math.abs(rest.seats.kamal[2] + 3.81) < .001 && Math.abs(rest.seats.kyta[2] + 4.03) < .001,
      "The actual driver and seat move back together, while Kyta's seat preserves the entrance.");
    const barMatrix = new THREE.Matrix4().fromArray(rest.bar.matrix), barCentre = new THREE.Vector3().setFromMatrixPosition(barMatrix);
    const localBounds = part => new THREE.Box3(new THREE.Vector3(...part.bounds[0]), new THREE.Vector3(...part.bounds[1])).applyMatrix4(new THREE.Matrix4().fromArray(part.matrix));
    const barBounds = localBounds(rest.bar);
    for (const guide of rest.guides) for (const hand of guide.hands) {
      assert(hand.visible && hand.vertexCount > 0 && hand.vertexCount <= 400 && hand.size.every((size, index) => Math.abs(size - [.10,.08,.105][index]) < .001),
        "Each guide has a visible square hand of normal size, without fingers or miniature palms.");
      assert.deepEqual(hand.simpleParts, [1,1,1], "The rendered arm has one sleeve, one forearm and one square hand, without white cuffs or finger pieces.");
      assert(Math.abs(hand.upperLength - .20) < .001 && Math.abs(hand.foreLength - .22) < .001, "Each guide keeps the connected upper-arm and forearm lengths.");
      if (guide.name === "kamal") {
        const grip = new THREE.Vector3(...hand.position).applyMatrix4(wheelInverse);
        assert(Math.abs(Math.hypot(grip.x, grip.y) - .23) < .002 && Math.abs(grip.z) < .002, "Both actual Kamal wrists meet the tilted steering rim.");
      } else {
        assert(Math.abs(hand.position[0] - (barCentre.x + (hand.side === 'left' ? -.20 : .20))) < .002 && Math.abs(hand.position[2] - barCentre.z) < .002,
          "Kyta's hands rest at distinct reachable points on the real yellow bar.");
        const palm = rest.parts.find(part => part.name === 'kyta-'+hand.side+'-skin');
        assert(Math.abs(localBounds(palm).min.y - barBounds.max.y) < .003 && localBounds(palm).min.y >= barBounds.max.y,
          "The actual square hand rests above the rail, without passing through it.");
      }
    }
    const check = snapshots => {
      for (const state of snapshots) {
        const wheelBounds = new THREE.Box3(); for (const part of state.wheelParts) wheelBounds.union(localBounds(part));
        const torsoBounds = new THREE.Box3(), legsBounds = new THREE.Box3();
        for (const part of state.body.filter(part => part.name.startsWith('kamal-'))) (part.region === 'torso' ? torsoBounds : legsBounds).union(localBounds(part));
        results.minimumWheelTorsoGap = Math.min(results.minimumWheelTorsoGap, torsoBounds.min.z - wheelBounds.max.z);
        results.minimumWheelKneeGap = Math.min(results.minimumWheelKneeGap, wheelBounds.min.y - legsBounds.max.y);
        // Use the actual wheel triangles, including its hub and spokes, against the torso and legs.
        for (const part of state.wheelParts) for (const bodyPart of state.body.filter(bodyPart => bodyPart.name.startsWith('kamal-'))) {
          const wheelMatrix = new THREE.Matrix4().fromArray(part.matrix), bodyMatrix = new THREE.Matrix4().fromArray(bodyPart.matrix);
          const bodyBox = new THREE.Box3(new THREE.Vector3(...bodyPart.bounds[0]), new THREE.Vector3(...bodyPart.bounds[1]));
          const wheelVolume = new OBB().fromBox3(new THREE.Box3(new THREE.Vector3(...part.bounds[0]), new THREE.Vector3(...part.bounds[1]))).applyMatrix4(wheelMatrix);
          if (!wheelVolume.intersectsOBB(new OBB().fromBox3(bodyBox).applyMatrix4(bodyMatrix))) continue;
          const geometry = sourceGeometry[part.geometry], intoBody = bodyMatrix.clone().invert().multiply(wheelMatrix), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
          for (let offset = 0; offset < (geometry.index?.length ?? geometry.positions.length / 3); offset += 3) {
            a.fromArray(geometry.positions, (geometry.index?.[offset] ?? offset) * 3).applyMatrix4(intoBody);
            b.fromArray(geometry.positions, (geometry.index?.[offset+1] ?? offset+1) * 3).applyMatrix4(intoBody);
            c.fromArray(geometry.positions, (geometry.index?.[offset+2] ?? offset+2) * 3).applyMatrix4(intoBody);
            if (bodyBox.intersectsTriangle(new THREE.Triangle(a,b,c))) { results.wheelBodyContacts.push({wheel:part.name,body:bodyPart.name,frame:state.frame});break; }
          }
        }
      }
      for (const state of snapshots) for (const part of state.parts) {
        const matrix = new THREE.Matrix4().fromArray(part.matrix);
        const partBox = new THREE.Box3(new THREE.Vector3(...part.bounds[0]), new THREE.Vector3(...part.bounds[1]));
        const volume = new OBB().fromBox3(partBox).applyMatrix4(matrix);
        for (const panel of state.panels) {
          const panelMatrix = new THREE.Matrix4().fromArray(panel.matrix);
          const panelBox = new THREE.Box3(new THREE.Vector3(...panel.bounds[0]), new THREE.Vector3(...panel.bounds[1]));
          if (!volume.intersectsOBB(new OBB().fromBox3(panelBox).applyMatrix4(panelMatrix))) continue;
          // Check actual rounded edges before reporting a physical contact.
          const geometry = sourceGeometry[part.geometry], intoPanel = panelMatrix.clone().invert().multiply(matrix);
          const positions = geometry.positions, indices = geometry.index;
          const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), triangle = new THREE.Triangle(a, b, c);
          let touched = false;
          for (let offset = 0; offset < (indices?.length ?? positions.length / 3); offset += 3) {
            a.fromArray(positions, (indices?.[offset] ?? offset) * 3).applyMatrix4(intoPanel);
            b.fromArray(positions, (indices?.[offset + 1] ?? offset + 1) * 3).applyMatrix4(intoPanel);
            c.fromArray(positions, (indices?.[offset + 2] ?? offset + 2) * 3).applyMatrix4(intoPanel);
            if (panelBox.intersectsTriangle(triangle)) { touched = true; break; }
          }
          if (touched) results.contacts.push({ part: part.name, panel: panel.name, frame: state.frame, activity: state.guides.find(guide => part.name.startsWith(guide.name)).activity });
        }
      }
    };
    check([rest]); results.resting = rest.guides;
    if (directory) {
      await mkdir(directory, { recursive: true });
      for (const [name, position, target] of [
        ["kamal-mains-volant.png", [.05, 2.10, -4.25], [-.84, 1.55, -4.10]],
        ["kyta-mains-carte.png", [-.05, 2.15, -4.23], [.84, 1.50, -4.10]],
      ]) {
        await run(`(()=>{const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');s.controls.enableDamping=false;s.controls.enabled=false;
          const position=s.camera.position.clone().fromArray(${JSON.stringify(position)}),target=s.controls.target.clone().fromArray(${JSON.stringify(target)});
          bus.localToWorld(position);bus.localToWorld(target);s.camera.position.copy(position);s.controls.target.copy(target);s.controls.update();s.camera.updateMatrixWorld();})()`);
        await nextFrames(); const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        await writeFile(resolve(directory, name), Buffer.from(shot.data, "base64"));
      }
    }
    await send("Emulation.setEmulatedMedia", { features: [] }); await wait("window.busDestinationTestReducedMotion()===false", "Animated guide reactions resume");
    await click("Klaxonner"); const horn = await series(2400); check(horn); results.hornFrames = horn.length;
    assert(horn.some(state => state.guides.every(guide => guide.activity === "horn")), "Both guides must be observed reacting to the real horn event.");
    await click("Lancer la fête"); await wait("window.mediaTestPlayers.music.state===1", "Party playback starts");
    await run("window.mediaTestPlayers.music.seekTo(8.2,true)"); await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "The real eight-second gate reaches the guide models");
    const party = await series(1800); check(party); results.partyFrames = party.length;
    assert(party.every(state => state.guides.every(guide => guide.activity === "party")), "Both rendered guides dance during the playback interval.");
    await click("Arrêter la fête"); const returns = await series(1500); check(returns); results.returnFrames = returns.length;
    const final = await sample();
    for (let index = 0; index < final.guides.length; index++) for (let side = 0; side < 2; side++) {
      assert(new THREE.Vector3(...final.guides[index].hands[side].position).distanceTo(new THREE.Vector3(...rest.guides[index].hands[side].position)) < .008,
        "Stopping the dance must return each actual hand to the steering wheel, map or lap.");
    }
    assert.deepEqual(await run("window.driverMutationRequests"), [], "Guide checks never modify registered visitors.");
    if (directory) await writeFile(resolve(directory, "verification-mains-conducteurs.json"), JSON.stringify(results, null, 2));
    assert.deepEqual(results.contacts, [], "Actual guide skin and sleeve triangles must clear the dashboard throughout the observed reactions.");
    assert.deepEqual(results.wheelBodyContacts, [], "The real steering rim, hub and spokes must stay outside Kamal's torso and thighs.");
    assert(results.minimumWheelTorsoGap > .035 && results.minimumWheelKneeGap > .08, "The actual driver must keep a visible gap from the wheel while moving.");
    console.log(`Rendered driver checks passed: simple square hands, Kyta on the yellow bar, wheel clear of Kamal torso/knees, ${results.hornFrames} horn frames, ${results.partyFrames} dance frames and ${results.returnFrames} return frames without dashboard contacts.`);
    return results;
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
    await send("Emulation.setEmulatedMedia", { features: [] });
  }
}
