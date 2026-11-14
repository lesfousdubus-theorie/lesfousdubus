import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { installTestYouTube } from "./media-playback-checks.mjs";
import { build } from "esbuild";

export async function runDoorConfettiChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const layoutBuild = await build({ entryPoints: ["src/lib/bus-layout.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  const { getBusRearWallZ, getSeatRowZ } = await import(`data:text/javascript;base64,${Buffer.from(layoutBuild.outputFiles[0].text).toString("base64")}`);
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 30_000);
  const directory = process.env.BUS_VISUAL_OUTPUT;
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    window.doorConfettiMutationRequests=[];
    const fetchNative=fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.href);
      const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
      if(url.origin===location.origin&&url.pathname.startsWith('/api/bus-entries')){
        if(method!=='GET'&&method!=='HEAD'){
          window.doorConfettiMutationRequests.push({method,path:url.pathname});
          return Promise.resolve(new Response(JSON.stringify({error:'The visual fixture cannot modify visitors.'}),{status:503,headers:{'Content-Type':'application/json'}}));
        }
        if(url.pathname==='/api/bus-entries'){
          const count=new URLSearchParams(location.search).get('count')==='800'?800:16;
          return Promise.resolve(new Response(JSON.stringify({count,seatCapacity:count,profileRevision:1,vacantSeatRanges:[],passengers:[]}),{headers:{'Content-Type':'application/json'}}));
        }
      }
      return fetchNative(input,init);
    };` });
  const click = label => run(`document.querySelector('button[aria-label=${JSON.stringify(label)}]:not(:disabled)').click()`);
  const music = "window.mediaTestPlayers.music";
  const nextFrames = async (count = 3) => {
    const frame = await run("window.busCameraTestState().gl.info.render.frame");
    await wait(`window.busCameraTestState().gl.info.render.frame>=${frame + count}`, "The scene renders the requested pose");
  };
  const poseCamera = async (position, target) => {
    await run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');
      bus.updateMatrixWorld(true);
      const position=s.camera.position.clone().fromArray(${JSON.stringify(position)});
      const target=s.controls.target.clone().fromArray(${JSON.stringify(target)});
      bus.localToWorld(position);bus.localToWorld(target);
      s.controls.enableDamping=false;s.controls.enabled=false;
      s.camera.position.copy(position);s.controls.target.copy(target);
      s.controls.update();s.camera.updateMatrixWorld();
    })()`);
    await nextFrames();
  };
  const screenshot = async name => {
    if (!directory) return;
    await mkdir(directory, { recursive: true });
    const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(resolve(directory, name), Buffer.from(image.data, "base64"));
  };
  const openScene = async (count, row, hardwareConcurrency) => {
    await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency });
    await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=${count}&row=${row}` });
    await wait(`Boolean(window.busCameraTestState()?.scene.getObjectByName('bus-door-front-leaf'))&&Boolean(${music})&&document.querySelector('.bus-app')?.dataset.phase==='inside'`, "Inside scene and controlled media are ready");
    const rearZ = getBusRearWallZ(Math.max(6, Math.ceil(count / 4)));
    await wait(`Math.abs(window.busCameraTestState().scene.getObjectByName('bus-rear-face').position.z-${rearZ})<.001`, "Fixture capacity produces the expected cabin length");
    await click("Explorer en vue libre");
    await wait("window.busCameraTestState().controls.enabled", "Free view allows the test to inspect the cabin");
    await nextFrames(5);
    assert.deepEqual(await run("window.doorConfettiMutationRequests"), [], "Visual checks must never modify registered visitors.");
    return { from: -4.25, to: rearZ - 0.35, rearZ, focusZ: getSeatRowZ(row) };
  };
  const startParty = async () => {
    await click("Lancer la fête");
    await wait(`${music}.state===1&&${music}.videoId==='RbZMoeHdR3I'&&Boolean(window.busCameraTestState().scene.getObjectByName('bus-party-confetti'))`, "Party music and confetti begin");
    await run(`${music}.seekTo(9,true)`);
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "The real party gate starts dancing after the intro");
    await nextFrames();
  };
  const stopParty = async () => {
    await click("Arrêter la fête");
    await wait("document.querySelector('.bus-app').dataset.party==='false'&&!window.busCameraTestState().scene.getObjectByName('bus-party-confetti')", "Stopping the party removes its particles");
  };
  const confettiSnapshot = () => run(`(()=>{
    const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle'),mesh=s.scene.getObjectByName('bus-party-confetti');
    const positions=[];for(let i=0;i<mesh.count;i++)positions.push(Array.from(mesh.instanceMatrix.array.slice(i*16+12,i*16+15)));
    const colors=new Set();for(let i=0;i<mesh.count;i++)colors.add(Array.from(mesh.instanceColor.array.slice(i*3,i*3+3)).join(','));
    const camera=bus.worldToLocal(s.camera.getWorldPosition(s.camera.position.clone())).toArray();
    return {count:mesh.count,positions,colors:colors.size,instanced:mesh.isInstancedMesh,version:mesh.instanceMatrix.version,camera};
  })()`);
  const checkCoverage = (snapshot, cabin, expectedCount) => {
    assert(snapshot.instanced && snapshot.count === expectedCount, "Confetti retain one fixed-budget instanced mesh.");
    assert.equal(snapshot.colors, 10, "The ten confetti colors remain present.");
    assert(snapshot.positions.every(([x, y, z]) => [x, y, z].every(Number.isFinite) && Math.abs(x) <= 1.11 && y >= 0.71 && y <= 3.06 && z >= cabin.from - 0.13 && z <= cabin.to + 0.13), "Every particle stays inside the usable cabin volume.");
    const globalCount = cabin.to - cabin.from > 14 ? Math.ceil(expectedCount * 0.6) : expectedCount;
    const globalZ = snapshot.positions.slice(0, globalCount).map(position => position[2]);
    const zones = [0, 0, 0];
    for (const z of globalZ) zones[Math.max(0, Math.min(2, Math.floor((z - cabin.from) / (cabin.to - cabin.from) * 3)))]++;
    assert(zones.every(count => count >= globalCount * 0.3), "The front, middle and rear must all receive confetti.");
    assert(Math.min(...globalZ) < cabin.from + (cabin.to - cabin.from) * 0.03 && Math.max(...globalZ) > cabin.to - (cabin.to - cabin.from) * 0.03, "Particles must reach both ends of the cabin.");
    return { count: snapshot.count, colors: snapshot.colors, zones, globalCount, minimumZ: Math.min(...globalZ), maximumZ: Math.max(...globalZ), camera: snapshot.camera };
  };
  const results = {};
  try {
    await send("Emulation.setDeviceMetricsOverride", { width: 1240, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setEmulatedMedia", { features: [] });
    const normalCabin = await openScene(16, 0, 8);
    results.door = await run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');bus.updateMatrixWorld(true);
      const result={body:[],structural:[],trim:[],rails:[]},inverse=bus.matrixWorld.clone().invert();
      s.scene.traverse(o=>{
        if(!o.geometry)return;
        o.geometry.computeBoundingBox();const matrix=inverse.clone().multiply(o.matrixWorld),box=o.geometry.boundingBox.clone().applyMatrix4(matrix);
        if(/^bus-body-side-1-/.test(o.name))result.body.push({inside:box.min.x});
        if(o.name==='bus-door-structural-jamb')result.structural.push({inside:box.min.x,z:(box.min.z+box.max.z)/2});
        if(o.name==='bus-door-inner-jamb')result.trim.push({inside:box.min.x,z:(box.min.z+box.max.z)/2,halfZ:(box.max.z-box.min.z)/2});
        if(o.name.startsWith('bus-interior-window-')&&box.min.x>0){
          const positions=o.geometry.getAttribute('position'),point=s.camera.position.clone();
          // Each fused BoxGeometry retains its twenty-four face vertices.
          for(let start=0;start<positions.count;start+=24){
            const span=box.clone().makeEmpty();for(let i=start;i<Math.min(start+24,positions.count);i++)span.expandByPoint(point.fromBufferAttribute(positions,i).applyMatrix4(matrix));
            result.rails.push({inside:span.min.x,from:span.min.z,to:span.max.z});
          }
        }
      });return result;
    })()`);
    assert.equal(results.door.structural.length, 2);
    assert.equal(results.door.trim.length, 2);
    assert.equal(results.door.rails.length, 4);
    assert(results.door.structural.every(jamb => results.door.body.every(body => body.inside - jamb.inside > 0.01)), "The actual blue body and structural jamb meshes need separate planes.");
    const [frontTrim, rearTrim] = results.door.trim.sort((a, b) => a.z - b.z);
    assert(results.door.rails.every(rail => rail.to <= frontTrim.z - frontTrim.halfZ - 0.011 || rail.from >= rearTrim.z + rearTrim.halfZ + 0.011), "The actual rails must stop before the door trims with physical clearance.");
    assert(results.door.rails.every(rail => rail.inside - frontTrim.inside > 0.01), "The visible trim and rail faces need distinct depths.");
    await poseCamera([0, 1.85, -1.4], [1.24, 1.7, -2.93]);
    await screenshot("porte-interieur-jambages.png");
    await poseCamera([0.38, 1.72, -3.86], [1.24, 1.67, -2.84]);
    await screenshot("porte-interieur-angle-avant.png");
    if(process.env.BUS_DIAGONAL_DIAGNOSTIC){
      const { runBusDiagonalDiagnostic }=await import(resolve(process.env.BUS_DIAGONAL_DIAGNOSTIC));
      await runBusDiagonalDiagnostic({send,evaluate,waitForPageCondition,directory});
      return;
    }
    await startParty();
    await poseCamera([0, 2.32, -3.3], [0, 1.8, normalCabin.rearZ - 0.6]);
    results.normal = checkCoverage(await confettiSnapshot(), normalCabin, 420);
    await screenshot("confettis-toute-cabine.png");
    await stopParty();

    const longCabin = await openScene(800, 99, 8);
    await startParty();
    const cameraZ = longCabin.focusZ + 22;
    await poseCamera([0, 2.3, cameraZ], [0, 1.85, cameraZ + 10]);
    const longSnapshot = await confettiSnapshot();
    results.long = checkCoverage(longSnapshot, longCabin, 420);
    const denseZ = longSnapshot.positions.slice(results.long.globalCount).map(position => position[2]);
    assert(denseZ.length === 168 && denseZ.every(z => Math.abs(z - longSnapshot.camera[2]) <= 5.13), "The dense layer must follow an interior camera moved away from the reserved row.");
    assert(Math.abs(longSnapshot.camera[2] - longCabin.focusZ) > 20, "The dense-layer test must actually leave the initial focus row.");
    results.long.denseCount = denseZ.length;
    results.long.denseMinimumZ = Math.min(...denseZ);
    results.long.denseMaximumZ = Math.max(...denseZ);
    await screenshot("confettis-grand-bus.png");
    await stopParty();

    const modestCabin = await openScene(16, 0, 4);
    await startParty();
    results.lowPower = checkCoverage(await confettiSnapshot(), modestCabin, 120);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await wait("window.busDestinationTestReducedMotion()===true", "Reduced motion reaches the scene");
    await nextFrames(4);
    const staticBefore = await confettiSnapshot();
    await nextFrames(8);
    const staticAfter = await confettiSnapshot();
    assert.equal(staticAfter.version, staticBefore.version, "Reduced-motion confetti must keep fixed instance matrices.");
    assert.deepEqual(staticAfter.positions, staticBefore.positions, "Reduced motion must leave every confetti position unchanged.");
    results.reducedMotion = { count: staticAfter.count, version: staticAfter.version, fixed: true };
    assert.deepEqual(await run("window.doorConfettiMutationRequests"), [], "No visitor mutation may occur during these checks.");
    await stopParty();
    if (directory) await writeFile(resolve(directory, "verification-porte-confettis.json"), JSON.stringify(results, null, 2));
    console.log("Door/confetti checks passed: real jamb and rail clearances, four inspection views, whole-cabin rainbow coverage, large-bus camera density, fixed GPU budgets and reduced motion.");
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
    await send("Emulation.setEmulatedMedia", { features: [] });
  }
}
