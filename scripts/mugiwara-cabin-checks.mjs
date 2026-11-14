import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Mounted production scene; API and media remain isolated by the caller. */
export async function runMugiwaraCabinChecks({ send, evaluate, waitForPageCondition, open, frames,
  pose, screenshot, click, enter, freeView, resourceSnapshot, layout, roster, directory }) {
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 60_000);
  const results = { fixtures: [], televisions: [], requests: [] };
  const occupancy = async (count, aboard = false) => {
    const snapshot = await run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle'),people=[],synthetic=[];
      s.scene.updateMatrixWorld(true);
      const visible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
      s.scene.traverse(object=>{
        if(object.name.startsWith('crew-nakama-'))synthetic.push(object.name);
        if(/^nakama-.*-\\d+$/.test(object.name)&&object.userData.passengerKind==='visitor'&&visible(object))
          people.push({name:object.name,...object.userData,position:bus.worldToLocal(object.getWorldPosition(s.camera.position.clone())).toArray()});
        if(object.name==='bus-distant-passenger-bodies'&&visible(object))for(let i=0;i<object.count;i++){
          const matrix=object.matrixWorld.clone();object.getMatrixAt(i,matrix);
          const point=s.camera.position.clone().setFromMatrixPosition(matrix);object.localToWorld(point);bus.worldToLocal(point);
          const metadata=object.userData.occupants[i],ids=${JSON.stringify(roster.map(actor => actor.id))};
          point.z-=ids[metadata.seatIndex%ids.length]==='chopper'?.045:.12;
          people.push({name:'simplified-'+i,...metadata,position:point.toArray()});
        }
      });
      const avatar=s.scene.getObjectByName('bus-boarding-avatar');
      const avatarVisible=Boolean(avatar&&visible(avatar));
      if(avatarVisible)people.push({name:avatar.name,...avatar.userData,
        position:bus.worldToLocal(avatar.getWorldPosition(s.camera.position.clone())).toArray()});
      return {people,synthetic,avatarVisible,hosts:['bus-crew-kamal','bus-crew-kyta','bus-entry-passenger'].filter(name=>Boolean(s.scene.getObjectByName(name)))};
    })()`);
    assert.deepEqual(snapshot.synthetic, [], "No permanent One Piece passengers are mounted, including hidden models.");
    assert.equal(snapshot.people.length, count, "Each registered visitor is represented once; no synthetic visitors are added.");
    assert.equal(snapshot.avatarVisible, aboard, "An exterior visit must not render a phantom boarding avatar.");
    assert.equal(snapshot.hosts.length, 3, "The three human hosts remain aboard.");
    const occupied = new Set(), benches = new Map();
    for (const person of snapshot.people) {
      assert.equal(person.passengerKind, "visitor", "Every passenger seat belongs to a registered visitor.");
      assert(Number.isInteger(person.physicalSeatIndex), "Rendered visitors expose their actual physical seat.");
      assert(!occupied.has(person.physicalSeatIndex), "No two visitors may share a physical seat.");
      const seat = layout.getPhysicalSeat(person.physicalSeatIndex);
      assert(Math.abs(person.position[0] - seat.x) < .005 && Math.abs(person.position[2] - seat.z) < .02,
        "The mounted visitor position agrees with its actual physical seat metadata.");
      occupied.add(person.physicalSeatIndex);
      const bench = Math.floor(person.physicalSeatIndex / 2);
      benches.set(bench, (benches.get(bench) ?? 0) + 1);
    }
    assert(Math.max(0, ...benches.values()) <= 2, "Every bench contains at most two visitors.");
    return snapshot;
  };
  const manifest = async count => {
    await run("document.querySelector('.bus-top-stats button').click()");
    await wait(`document.getElementById('passenger-list-title')?.textContent===${JSON.stringify(`${count + 3} passagers`)}&&[...document.querySelectorAll('.bus-passenger-list span')].filter(span=>/^Place \\d/.test(span.textContent)).length===${count}`,
      "The isolated visitor manifest finishes loading");
    const snapshot = await run(`(()=>{const dialog=document.querySelector('.bus-passenger-list');return {
      title:document.getElementById('passenger-list-title').textContent,
      hosts:[...dialog.querySelector('[aria-label="Équipage permanent"]').children].map(row=>row.querySelector('span.block.font-black').textContent),
      names:[...dialog.querySelectorAll('button span.block.font-black')].map(span=>span.textContent)
    };})()`);
    assert.equal(snapshot.title, `${count + 3} passagers`, "The total counts only real visitors and three human hosts.");
    assert.deepEqual(snapshot.hosts, ["Kamal", "Kyta", "FoudubusTV"], "The manifest must not invent a twenty-person permanent crew.");
    assert.deepEqual(snapshot.names, count >= 2 ? ["Epic Games", "Kirito"] : [], "Only named visitors supplied by the fixture appear in the manifest.");
    await click("Fermer la fenêtre");
    await wait("!document.querySelector('[role=dialog]')", "The manifest closes");
    return snapshot;
  };
  for (const mobile of [false, true]) {
    const viewport = mobile ? "mobile" : "desktop";
    for (const count of [0, 2, 4, 60]) {
      await open(count, 0, mobile);
      const before = await occupancy(count);
      const entry = { viewport, count, before, manifest: await manifest(count), resources: await resourceSnapshot() };
      results.fixtures.push(entry);
      if (count === 2) {
        await enter();
        await freeView();
        entry.inside = await occupancy(count, true);
        await pose([0, 2.65, layout.getSeatRowZ(4) + .6], [0, 1.95, -3.5]);
        await screenshot(`deux-visiteurs-anneaux-${viewport}.png`);
      }
      if (count !== 60) {
        results.requests.push(...await run("window.crewSeatRequests"));
        continue;
      }
      await enter();
      entry.beforeMove = await occupancy(count, true);
      await click("Rangée suivante");
      await wait(`Math.abs(window.busJourneyTestState().position.z-(${layout.getSeatRowZ(1)}))<.01`,
        "The registered visitor moves to the next row");
      entry.afterMove = await occupancy(count, true);
      const avatar = entry.afterMove.people.find(person => person.name === "bus-boarding-avatar");
      const displaced = entry.afterMove.people.find(person => person.seatIndex === 4 && person.name !== "bus-boarding-avatar");
      assert.equal(avatar.physicalSeatIndex, 4, "The same visitor avatar occupies its selected row.");
      assert.equal(displaced.physicalSeatIndex, 0, "The previous occupant moves into the avatar's original seat without disappearing.");
      await freeView();
      const televisionChecks = await run(`(()=>{
        const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');s.scene.updateMatrixWorld(true);
        const inverse=bus.matrixWorld.clone().invert(),rings=s.scene.getObjectsByProperty('name','bus-grab-handle-ring'),
          handles=s.scene.getObjectsByProperty('name','bus-grab-handle'),rails=s.scene.getObjectsByProperty('name','bus-grab-rail');
        const blockers=[...handles.flatMap(handle=>handle.children.filter(child=>child.isMesh)),...rails];
        const bounds=mesh=>{mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));return {min:box.min.toArray(),max:box.max.toArray()};};
        const handleBounds=blockers.map(bounds),railBounds=rails.map(bounds);
        const frames=s.scene.getObjectsByProperty('name','bus-tv-frame').filter(frame=>frame.userData.index<2);
        return {ringX:rings.map(ring=>bus.worldToLocal(ring.getWorldPosition(s.camera.position.clone())).x),
          rings:rings.length,rails:rails.length,handleBounds,railBounds,screens:frames.map(frame=>{
            const display=frame.getObjectByName('bus-tv-display');let rays=0,blocked=0;
            for(const eyeX of [-.94,-.5,.5,.94])for(const eyeY of [1.57,1.84])for(const offset of [1.4,3.0]){
              const eye=bus.localToWorld(s.camera.position.clone().set(eyeX,eyeY,frame.position.z+offset));
              for(let gx=0;gx<9;gx++)for(let gy=0;gy<7;gy++){
                const target=display.localToWorld(s.camera.position.clone().set(-.63+gx*.1575,-.354375+gy*.118125,0)),direction=target.clone().sub(eye),distance=direction.length();
                const ray=new s.raycaster.constructor(eye,direction.normalize(),0,distance-.002);rays++;
                if(ray.intersectObjects(blockers,false).length)blocked++;
              }
            }
            return {index:frame.userData.index,position:frame.position.toArray(),rays,blocked};
          })};
      })()`);
      assert(televisionChecks.rings > 0 && televisionChecks.rails >= 2, "The original central grab rings and rails remain mounted.");
      assert(televisionChecks.ringX.every(x => Math.abs(Math.abs(x) - .35) < .001), "The rings return to their original central aisle position.");
      assert.equal(televisionChecks.screens.length, 2, "The longer fixture includes the front TV and a repeat screen.");
      for (const screen of televisionChecks.screens) {
        assert(screen.rays > 900 && screen.blocked === 0, "Every screen stays clear from the nearby viewing area, while rings remain elsewhere.");
        const [,,z] = screen.position;
        for (const bounds of televisionChecks.handleBounds) assert(bounds.max[2] <= z - .149 || bounds.min[2] >= z + 3.199,
          "No real ring, strap or rail crosses the free zone directly in front of the screen.");
        await pose([0, 1.84, z + 1.4], [0, screen.position[1], z]);
        await screenshot(`television-${screen.index + 1}-zone-libre-${viewport}.png`);
      }
      results.televisions.push({ viewport, ...televisionChecks });
      results.requests.push(...await run("window.crewSeatRequests"));
      assert(results.requests.every(request => request.fixture && ["GET", "HEAD", "POST"].includes(request.method)),
        "Every API interaction uses the isolated fixture; no passenger database receives writes.");
    }
    console.log(`Real visitors and restored grab handles checked: ${viewport}.`);
  }
  if (directory) {
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "verification-visiteurs-anneaux.json"), JSON.stringify(results, null, 2));
  }
  return results;
}
