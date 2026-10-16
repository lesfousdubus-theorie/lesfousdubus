import assert from "node:assert/strict";
import { build } from "esbuild";

/** Inspecte uniquement la scène déjà montée par le harness, sans navigation ni mutation. */
export async function auditMountedBusDoors({ send, evaluate, waitForPageCondition }) {
  const run = expression => evaluate(send, expression);
  await waitForPageCondition(send, `Boolean(window.busCameraTestState()?.scene.getObjectByName('bus-passenger-doors')) && Boolean(window.busCameraTestState()?.scene.getObjectByName('bus-seat-cushions'))`, "The extended door assemblies and seat instances are mounted", 30_000);
  const result = await run(`(() => {
    const state=window.busCameraTestState(),bus=state.scene.getObjectByName('bus-vehicle');
    bus.updateMatrixWorld(true);
    const inverse=bus.matrixWorld.clone().invert(),vector=state.camera.position.clone(),ray=new state.raycaster.constructor();
    ray.camera=state.camera;
    const toBusPosition=object=>vector.clone().setFromMatrixPosition(inverse.clone().multiply(object.matrixWorld)).toArray();
    const boundsOf=(object,instance)=>{
      object.geometry.computeBoundingBox();
      const matrix=inverse.clone().multiply(object.matrixWorld);
      if(instance)matrix.multiply(instance);
      const box=object.geometry.boundingBox.clone().applyMatrix4(matrix);
      return {min:box.min.toArray(),max:box.max.toArray()};
    };
    const root=state.scene.getObjectByName('bus-passenger-doors'),detailed=[],closed=[];
    root.traverse(object=>{
      if(object.name==='bus-passenger-door'){
        const jambs=object.children.flatMap(child=>child.children).filter(child=>child.name==='bus-door-structural-jamb');
        const jambZs=jambs.map(jamb=>toBusPosition(jamb)[2]).sort((a,b)=>a-b);
        const leaf=object.getObjectByName('bus-door-front-leaf'),rear=object.getObjectByName('bus-door-rear-leaf');
        const landing=object.getObjectByName('bus-entry-landing');
        detailed.push({index:object.userData.doorIndex,z:toBusPosition(object)[2],jambZs,angles:[leaf.rotation.y,rear.rotation.y],landingVisible:landing.visible,visibleSteps:[0,1,2].map(index=>object.getObjectByName('bus-entry-step-'+index).visible)});
      }
      if(object.name==='bus-closed-door-instances'){
        const positions=[];
        for(let index=0;index<object.count;index++){
          const instance=object.matrixWorld.clone().identity();object.getMatrixAt(index,instance);
          positions.push(vector.clone().setFromMatrixPosition(inverse.clone().multiply(object.matrixWorld).multiply(instance)).toArray());
        }
        closed.push({count:object.count,positions,geometryVertices:object.geometry.getAttribute('position').count});
      }
    });
    const physicalDoorZs=[...detailed.map(door=>door.z),...(closed[0]?.positions.map(position=>position[2])??[])].sort((a,b)=>a-b);
    const body=[],rails=[];
    bus.traverse(object=>{
      if(!object.isMesh||object.isInstancedMesh)return;
      if(/^bus-body-side-1-/.test(object.name))body.push(object);
      if(object.name==='bus-interior-window-top-rail'||object.name==='bus-interior-window-bottom-rail'){
        const bounds=boundsOf(object);if(bounds.min[0]>0)rails.push(object);
      }
    });
    const shoot=(objects,x,y,z,down=false)=>{
      const origin=vector.clone().set(x,y,z);bus.localToWorld(origin);
      const direction=vector.clone().set(down?0:-1,down?-1:0,0).transformDirection(bus.matrixWorld);
      ray.set(origin,direction);ray.far=10;
      return ray.intersectObjects(objects,false).map(hit=>({object:hit.object.name||'unnamed-mesh',distance:hit.distance}));
    };
    const bodyBlocked=[],railsBlocked=[],bodyGapCoverage=[],railGapCoverage=[];
    for(const z of physicalDoorZs)for(const offset of [-.51,0,.51]){
      const bodyHits=shoot(body,3,1.5,z+offset),railHits=[...shoot(rails,3,1.74,z+offset),...shoot(rails,3,2.74,z+offset)];
      if(bodyHits.length)bodyBlocked.push({z:z+offset,hits:bodyHits});
      if(railHits.length)railsBlocked.push({z:z+offset,hits:railHits});
    }
    const rightBodyBounds=body.map(object=>boundsOf(object));
    const frontBound=Math.min(...rightBodyBounds.map(bounds=>bounds.min[2])),rearBound=Math.max(...rightBodyBounds.map(bounds=>bounds.max[2]));
    const breaks=[frontBound,...physicalDoorZs.flatMap(z=>[z-.63,z+.63]),rearBound];
    for(let index=0;index<breaks.length-1;index+=2){
      const z=(breaks[index]+breaks[index+1])/2;
      bodyGapCoverage.push({z,hits:shoot(body,3,1.5,z).length});
      railGapCoverage.push({z,bottomHits:shoot(rails,3,1.74,z).length,topHits:shoot(rails,3,2.74,z).length});
    }
    const cushions=state.scene.getObjectByName('bus-seat-cushions'),cushionBounds=[],cushionOverlaps=[];
    for(let index=0;index<cushions.count;index++){
      const matrix=cushions.matrixWorld.clone().identity();cushions.getMatrixAt(index,matrix);
      const bounds=boundsOf(cushions,matrix);cushionBounds.push(bounds);
      for(const doorZ of physicalDoorZs)if(bounds.max[0]>.4&&bounds.min[0]<1.4&&bounds.max[2]>doorZ-.63&&bounds.min[2]<doorZ+.63)cushionOverlaps.push({index,doorZ,bounds});
    }
    const originalLanding=root.getObjectByName('bus-entry-landing'),staticFloor=[];
    bus.traverse(object=>{
      if(!object.isMesh||object.isInstancedMesh||object.material!==originalLanding.material)return;
      let parent=object;while(parent&&parent!==bus){if(parent.name==='bus-passenger-door'||parent.name==='bus-distant-doors')return;parent=parent.parent;}
      staticFloor.push(object);
    });
    const floorBlocked=physicalDoorZs.flatMap(z=>{
      const hits=shoot(staticFloor,.85,2,z,true);return hits.length?[{z,hits}]:[];
    });
    const rearFace=state.scene.getObjectByName('bus-rear-face');
    const connection=navigator.connection,memory=navigator.deviceMemory??8,coarse=matchMedia('(pointer: coarse)').matches;
    const lowPower=connection?.saveData===true||['slow-2g','2g'].includes(connection?.effectiveType)||navigator.hardwareConcurrency<=4||memory<=4||(coarse&&Math.min(innerWidth,innerHeight)<900)||innerWidth*innerHeight*Math.min(devicePixelRatio||1,2)**2>5000000;
    return {fixtureCount:Number(new URL(location.href).searchParams.get('count')??0),metadata:root.userData,lowPower,detailed,closed,physicalDoorZs,
      bodyBounds:rightBodyBounds,rearFaceZ:toBusPosition(rearFace)[2],bodyBlocked,railsBlocked,floorBlocked,bodyGapCoverage,railGapCoverage,cushionBounds,cushionOverlaps,
      bodyMeshCount:body.length,railMeshCount:rails.length,renderFrame:state.gl.info.render.frame};
  })()`);
  const compiled = await build({ entryPoints: ["src/lib/bus-layout.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  const { getBusDoors, getBusRearWallZ, BUS_FRONT_Z } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
  const occupancyBuild = await build({ entryPoints: ["src/lib/bus-occupancy.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  const { getBusPhysicalRows } = await import(`data:text/javascript;base64,${Buffer.from(occupancyBuild.outputFiles[0].text).toString("base64")}`);
  const rows = getBusPhysicalRows(result.fixtureCount), expectedDoors = getBusDoors(rows), rearWallZ = getBusRearWallZ(rows);
  assert.equal(result.metadata.totalDoors, expectedDoors.length, "The mounted cabin must expose every physical door required by its capacity.");
  assert.equal(result.detailed.length, result.metadata.detailedDoors, "Detailed door metadata must match the real mounted assemblies.");
  assert(result.detailed.length <= (result.lowPower ? 4 : 8), "Detailed articulated doors must stay within the device's rendering budget.");
  assert.equal(result.closed.length, 6, "All distant closed doors must share six instanced render meshes.");
  assert(result.closed.every(mesh => mesh.count === result.closed[0].count && mesh.geometryVertices > 0), "Each distant-door material must contain the same complete set of usable instances.");
  assert.equal(result.detailed.length + result.closed[0].count, expectedDoors.length, "Every door must exist exactly once across detailed and distant assemblies.");
  assert.equal(result.physicalDoorZs.length, expectedDoors.length);
  expectedDoors.forEach((door, index) => assert(Math.abs(result.physicalDoorZs[index] - door.z) < .002, `Mounted door ${index} must use its physical vestibule position.`));
  for (const mesh of result.closed) mesh.positions.forEach((position, index) => {
    assert(Math.abs(position[0]) < 1e-6 && Math.abs(position[1]) < 1e-6, "Distant doors must keep the cabin's upright local transform.");
    assert(Math.abs(position[2] - result.closed[0].positions[index][2]) < .002, "All materials of a closed door must align at the same vestibule.");
  });
  for (const door of result.detailed) {
    const expected = expectedDoors[door.index];
    assert(expected && Math.abs(expected.z - door.z) < .002);
    assert.equal(door.jambZs.length, 2, "Every detailed bay needs both structural jambs.");
    assert(Math.abs(door.jambZs[0] - (door.z - expected.width / 2)) < .002 && Math.abs(door.jambZs[1] - (door.z + expected.width / 2)) < .002, "The real jamb transforms must frame their own door rather than the original front opening.");
    assert(door.angles.every(angle => Math.abs(angle) < .03) && door.landingVisible && door.visibleSteps.every(visible => !visible), "A seated interior scene must have closed leaves, covered landings and hidden steps at every door.");
  }
  assert.equal(result.bodyMeshCount, 1, "All right body segments must be fused into one draw call.");
  assert.equal(result.railMeshCount, 2, "All right top and bottom rail runs must use two draw calls.");
  assert.deepEqual(result.bodyBlocked, [], "The actual side-body triangles must leave every door opening empty.");
  assert.deepEqual(result.railsBlocked, [], "Neither actual blue rail geometry may cross any door opening.");
  assert.deepEqual(result.floorBlocked, [], "Every stairwell must be cut through the actual static right-hand floor.");
  assert(result.bodyGapCoverage.every(probe => probe.hits > 0), "Body material must remain present in each interval between door openings.");
  assert(result.railGapCoverage.every(probe => probe.bottomHits > 0 && probe.topHits > 0), "Both rails must remain present in each interval between door openings.");
  assert.deepEqual(result.cushionOverlaps, [], "No mounted seat cushion instance may occupy any right-hand vestibule.");
  assert(result.cushionBounds.length > 0 && result.cushionBounds.length <= 360, "Actual rendered seat instances must retain their bounded GPU budget.");
  for (const bounds of result.bodyBounds) {
    assert(Math.abs(bounds.min[2] - BUS_FRONT_Z) < .04 && Math.abs(bounds.max[2] - rearWallZ) < .04, "The merged body must reach the actual front and rear while retaining the doors.");
  }
  assert(Math.abs(result.rearFaceZ - rearWallZ) < .002, "The rear face must follow the last seat without an unused vestibule.");
  return {
    count: result.fixtureCount, rows, totalDoors: expectedDoors.length, detailedDoors: result.detailed.length,
    closedDoors: result.closed[0].count, closedDrawCalls: result.closed.length, lowPower: result.lowPower,
    physicalDoorZs: result.physicalDoorZs, frontBounds: result.bodyBounds.map(bounds => bounds.min[2]),
    rearBounds: result.bodyBounds.map(bounds => bounds.max[2]), rearFaceZ: result.rearFaceZ,
    bodyRayProbes: result.physicalDoorZs.length * 3, railRayProbes: result.physicalDoorZs.length * 6,
    floorRayProbes: result.physicalDoorZs.length, filledIntervals: result.bodyGapCoverage.length,
    seatCushions: result.cushionBounds.length, firstCushionBounds: result.cushionBounds.slice(0, 2),
    lastCushionBounds: result.cushionBounds.slice(-2), renderFrame: result.renderFrame,
  };
}
