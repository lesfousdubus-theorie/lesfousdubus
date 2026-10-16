import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { installTestYouTube } from "./media-playback-checks.mjs";
import { auditMountedBusDoors } from "./mounted-bus-door-checks.mjs";
import { runExpressionVisualChecks } from "./expression-visual-checks.mjs";
import { build } from "esbuild";

/** Scènes et trajets réels ; seul le service de visiteurs et YouTube sont simulés. */
export async function runExpandingBusChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const run = expression => evaluate(send, expression);
  const wait = (expression, label, timeout = 60_000) => waitForPageCondition(send, expression, label, timeout);
  const directory = process.env.BUS_VISUAL_OUTPUT;
  const compile = async path => {
    const result = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
    return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  };
  const { getBusPhysicalRows, getAvatarSeat } = await compile("src/lib/bus-occupancy.ts");
  const { getNearestBusDoor } = await compile("src/lib/bus-layout.ts");
  const expectedDoor = getNearestBusDoor(getAvatarSeat(500, 124, 499).seat.z, getBusPhysicalRows(500));
  const expectedEye = getAvatarSeat(500, 124, 499).seat;
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    window.busExtensionRequests=[];
    window.busExtensionBlockedMutations=[];
    const fetchNative=fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.href);
      const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
      if(url.origin!==location.origin||!url.pathname.startsWith('/api/bus-entries'))return fetchNative(input,init);
      const rawCount=new URLSearchParams(location.search).get('count'),value=Number(rawCount);
      const count=rawCount!==null&&Number.isSafeInteger(value)&&value>=0?value:16;
      const snapshot={count,seatCapacity:count,profileRevision:1,vacantSeatRanges:[],passengers:[]};
      window.busExtensionRequests.push({method,path:url.pathname+url.search,fixture:true,time:performance.now()});
      const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
      if(method==='GET'||method==='HEAD')return Promise.resolve(response(snapshot));
      if(method==='POST'){
        window.busExtensionPending=true;
        return new Promise(resolve=>{
          let delayPassed=false,released=!window.busExtensionHoldRegistration;
          const finish=()=>{
            if(!delayPassed||!released)return;
            window.busExtensionPending=false;
            delete window.busExtensionReleaseRegistration;
            resolve(response({...snapshot,seatIndex:count-1,added:false,passenger:null}));
          };
          window.busExtensionReleaseRegistration=()=>{released=true;finish();};
          setTimeout(()=>{delayPassed=true;finish();},2000);
        });
      }
      window.busExtensionBlockedMutations.push({method,path:url.pathname});
      return Promise.resolve(new Response(JSON.stringify({error:'This fixture cannot modify registered visitors.'}),{status:405,headers:{'Content-Type':'application/json'}}));
    };
  ` });
  const click = label => run(`document.querySelector('button[aria-label=${JSON.stringify(label)}]:not(:disabled)').click()`);
  const nextFrames = async (count = 2) => {
    const frame = await run("window.busCameraTestState().gl.info.render.frame");
    await wait(`window.busCameraTestState().gl.info.render.frame>=${frame + count}`, "The actual renderer updates the requested scene");
  };
  const screenshot = async name => {
    if (!directory) return;
    await mkdir(directory, { recursive: true });
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(resolve(directory, name), Buffer.from(shot.data, "base64"));
  };
  const openScene = async (count, row, width, height, hardwareConcurrency) => {
    await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency });
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=${count}&row=${row}` });
    await wait("Boolean(window.busCameraTestState()?.scene.getObjectByName('bus-vehicle'))&&Boolean(window.mediaTestPlayers.music)&&Boolean(window.mediaTestPlayers.bus)&&document.querySelector('.bus-app')?.dataset.sceneAvailable==='true'", `The ${count}-visitor fixture and both players load`);
    await nextFrames();
    return run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle'),trip=window.busJourneyTestState();
      window.busExtensionOriginalPlayer=window.mediaTestPlayers.bus;
      return {seat:trip.position.toArray(),camera:s.camera.position.toArray(),rearZ:s.scene.getObjectByName('bus-rear-face').position.z,
        iframeCount:document.querySelectorAll('#tv-primary-iframe').length,
        requests:window.busExtensionRequests,blocked:window.busExtensionBlockedMutations};
    })()`);
  };
  const poseCamera = async (position, target) => {
    // OrbitControls becomes enabled before the 0.85s free-view transition ends.
    // Wait for the rendered camera to settle before posing a diagnostic photo.
    await run("window.busExtensionCameraSettle={started:performance.now(),frame:-1,stable:0,values:[]}");
    await wait(`(()=>{
      const s=window.busCameraTestState(),check=window.busExtensionCameraSettle;
      if(s.gl.info.render.frame===check.frame)return false;
      const values=[...s.camera.position.toArray(),...s.controls.target.toArray()];
      check.stable=values.every((value,index)=>Math.abs(value-check.values[index])<1e-5)?check.stable+1:0;
      check.values=values;check.frame=s.gl.info.render.frame;
      return performance.now()-check.started>1000&&check.stable>=3;
    })()`, "The free-view camera finishes its transition before the photo");
    await run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');bus.updateMatrixWorld(true);
      const p=s.camera.position.clone().fromArray(${JSON.stringify(position)}),t=s.controls.target.clone().fromArray(${JSON.stringify(target)});
      bus.localToWorld(p);bus.localToWorld(t);s.controls.enableDamping=false;s.controls.enabled=false;
      s.camera.position.copy(p);s.controls.target.copy(t);s.controls.update();s.camera.updateMatrixWorld();
    })()`);
    await nextFrames();
    const posed = await run(`(()=>{
      const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');
      const p=s.camera.position.clone(),t=s.controls.target.clone();bus.worldToLocal(p);bus.worldToLocal(t);
      return {position:p.toArray(),target:t.toArray()};
    })()`);
    assert(posed.position.every((value,index)=>Math.abs(value-position[index])<.025)
      &&posed.target.every((value,index)=>Math.abs(value-target[index])<.025), "The photograph keeps its requested camera pose.");
  };
  const tripSnapshot = () => run(`(()=>{
    const s=window.busCameraTestState(),trip=window.busJourneyTestState(),doors=[];
    s.scene.traverse(o=>{if(o.name!=='bus-passenger-door')return;doors.push({index:o.userData.doorIndex,z:o.userData.doorZ,
      front:o.getObjectByName('bus-door-front-leaf').rotation.y,rear:o.getObjectByName('bus-door-rear-leaf').rotation.y,
      landing:o.getObjectByName('bus-entry-landing').visible,
      steps:[0,1,2].map(i=>{const step=o.getObjectByName('bus-entry-step-'+i);return {position:step.position.toArray(),visible:step.visible};})});});
    return {phase:document.querySelector('.bus-app').dataset.phase,elapsed:trip.elapsed,position:trip.position.toArray(),
      camera:s.camera.position.toArray(),drive:trip.drive,walking:trip.walking,sitting:trip.sitting,blend:trip.cameraBlend,
      doorIndex:trip.doorIndex,doorZ:trip.doorZ,seatZ:trip.seatZ,timing:trip.timing,waiting:trip.waitingForSeat,
      avatarVisible:trip.avatarVisible,headVisible:s.scene.getObjectByName('bus-boarding-avatar-head').visible,doors};
  })()`);
  // SwiftShader may render a large scene slowly. Advance the real controller in
  // bounded dt steps, retaining its complete state machine and integration. The
  // actual camera, doors, avatar and player still update on the following frames.
  const advanceTo = async time => run(`(()=>{
    const s=window.busCameraTestState(),subscriber=s.internal.subscribers.find(item=>item.priority===-10);
    if(!subscriber)throw new Error('BoardingController frame subscription is missing.');
    let harness=window.busExtensionController;
    if(!harness||harness.subscriber.ref!==subscriber.ref){
      if(harness){Object.defineProperty(harness.subscriber.ref,'current',{...harness.descriptor,value:harness.original});}
      harness={subscriber,original:subscriber.ref.current,descriptor:Object.getOwnPropertyDescriptor(subscriber.ref,'current'),noop:()=>{}};
      window.busExtensionController=harness;
      // React refreshes the callback after asynchronous profile/phase updates.
      // Keep its newest closure, while leaving only this subscription paused.
      Object.defineProperty(subscriber.ref,'current',{configurable:true,enumerable:true,
        get(){return harness.noop;},set(value){if(value!==harness.noop)harness.original=value;}});
    }
    const samples=[];let iterations=0;
    while(window.busJourneyTestState().elapsed<${Number(time)}-0.000001){
      const trip=window.busJourneyTestState();
      harness.original(s,Math.min(.1,${Number(time)}-trip.elapsed));
      samples.push({elapsed:trip.elapsed,position:trip.position.toArray(),doorIndex:trip.doorIndex,doorZ:trip.doorZ,
        walking:trip.walking,sitting:trip.sitting,drive:trip.drive,open:trip.doorOpen});
      if(++iterations>500)throw new Error('The boarding timeline did not advance.');
    }
    return samples;
  })()`);
  const releaseController = () => run(`(()=>{
    const harness=window.busExtensionController;
    if(harness)Object.defineProperty(harness.subscriber.ref,'current',{...harness.descriptor,value:harness.original});
    delete window.busExtensionController;
  })()`);
  const checkOpenDoor = snapshot => {
    assert.equal(snapshot.doorIndex, expectedDoor.index, "The last visitor row must use its nearest physical door, including the permanent-model sections.");
    const selected = snapshot.doors.find(door => door.index === snapshot.doorIndex);
    assert(selected, "The selected door must be a mounted detailed door.");
    assert(Math.abs(selected.z - snapshot.doorZ) < 1e-6);
    assert(selected.front > 1.6 && selected.rear < -1.6, "The selected hinged leaves must actually open.");
    assert(!selected.landing, "The selected stairwell cover must retract.");
    assert(selected.steps.every((step, index) => step.visible && Math.abs(step.position[1] - [0.29, 0.46, 0.63][index]) < 0.015), "The selected steps must deploy before the visitor walks.");
    assert(snapshot.doors.filter(door => door.index !== selected.index).every(door => Math.abs(door.front) < 0.035 && Math.abs(door.rear) < 0.035 && door.steps.every(step => !step.visible)), "Every other door stays closed with its steps stowed.");
    return selected;
  };
  const checkCrossing = (samples, entering, doorZ) => {
    const crossing = samples.filter((sample, index) => index > 0 && (entering
      ? sample.position[0] <= 1.32 && samples[index - 1].position[0] > 1.32
      : sample.position[0] >= 1.32 && samples[index - 1].position[0] < 1.32));
    assert(crossing.length > 0, "The real controller path must cross the selected doorway.");
    assert(crossing.every(sample => Math.abs(sample.position[2] - doorZ) < 0.005 && sample.open && sample.drive === 0 && sample.position[1] >= 0.24), "Crossing must occur on deployed stairs, at the selected door, while the bus is stopped.");
    return crossing;
  };
  const results = {};
  try {
    await send("Emulation.setEmulatedMedia", { features: [] });
    const initial = await openScene(500, 124, 1240, 900, 8);
    assert.equal(initial.iframeCount, 1, "Large buses keep exactly one real TV iframe.");
    results.desktop500 = await auditMountedBusDoors({ send, evaluate, waitForPageCondition });
    console.log("500-visitor mounted door geometry checked; inspecting exploration and the rear-door journey.");
    await click("Explorer en vue libre");
    await wait("window.busCameraTestState().controls.enabled&&document.querySelector('.bus-app').dataset.view==='free'", "The existing free view remains available");
    await poseCamera([8.5, 4.7, initial.rearZ + 4], [0, 1.7, initial.rearZ - 9]);
    await screenshot("bus-500-portes-arriere.png");
    await poseCamera([0, 2.25, initial.seat[2] + 0.5], [0, 1.7, initial.seat[2] - 10]);
    await screenshot("bus-500-vue-libre-interieur.png");
    assert.deepEqual(await run("window.busJourneyTestState().position.toArray()"), initial.seat, "Free exploration leaves the visitor seated in the same place.");
    await click("Revenir à ma place");
    await wait("document.querySelector('.bus-app').dataset.view==='seat'&&!window.busCameraTestState().controls.enabled&&Math.abs(window.busCameraTestState().camera.position.y-1.84)<.01", "Free exploration returns to the same eyes");

    await click("Sortir du bus");
    await wait("window.busJourneyTestState()?.phase==='exiting'", "The existing exit action starts its real controller");
    const exitStart = await tripSnapshot();
    results.exit = { start: exitStart };
    assert.equal(exitStart.doorIndex, expectedDoor.index);
    await advanceTo(3.15);
    await nextFrames(5);
    checkOpenDoor(await tripSnapshot());
    const exitSamples = await advanceTo(exitStart.timing.exitWalkEnd + 0.05);
    await nextFrames();
    results.exit.crossing = checkCrossing(exitSamples, false, exitStart.doorZ);
    const exited = await tripSnapshot();
    assert.equal(exited.sitting, 0);
    assert(Math.abs(exited.position[0] - 3.3) < 0.01 && Math.abs(exited.position[2] - exitStart.doorZ) < 0.01, "The visitor finishes on the pavement beside its nearest door.");
    await screenshot("bus-500-sortie-porte-proche.png");
    await advanceTo(exitStart.timing.exitDuration + 0.05);
    await releaseController();
    await wait("document.querySelector('.bus-app').dataset.phase==='outside'", "Rear-door exit completes");
    await nextFrames();
    await wait(`(()=>{let closed=true;window.busCameraTestState().scene.traverse(o=>{
      if(o.name==='bus-passenger-door')closed=closed&&Math.abs(o.getObjectByName('bus-door-front-leaf').rotation.y)<.03&&
        [0,1,2].every(i=>!o.getObjectByName('bus-entry-step-'+i).visible);});return closed;})()`, "Every door finishes closing before the next entry");

    await run(`(()=>{window.busExtensionHoldRegistration=true;window.mediaTestPlayers.bus.commands=[];[...document.querySelectorAll('button')].find(button=>!button.disabled&&button.textContent.includes('Entrer dans le bus')).click();})()`);
    await wait("window.busExtensionPending===true&&window.busJourneyTestState().waitingForSeat===true", "The fixture delays seat assignment and the real scene waits");
    const pending = await tripSnapshot();
    assert.equal(pending.elapsed, 0);
    assert.equal(pending.avatarVisible, false, "No visitor may appear at a guessed door before seat assignment.");
    assert.equal(pending.drive, 1);
    assert(pending.doors.every(door => Math.abs(door.front) < 0.035 && door.steps.every(step => !step.visible)), "All doors stay closed while the server chooses the place.");
    results.entry = { pending };
    // Two seconds minimum, with explicit release after observing a rendered
    // pending frame: GPU speed must not decide whether this condition is tested.
    await run("window.busExtensionReleaseRegistration();window.busExtensionHoldRegistration=false");
    await wait("window.busExtensionPending===false&&window.busJourneyTestState().phase==='entering'&&!window.busJourneyTestState().waitingForSeat", "Seat assignment starts the correct-door cinematic");
    const entryStart = await tripSnapshot();
    assert.equal(entryStart.doorIndex, expectedDoor.index);
    assert(Math.abs(entryStart.seatZ - initial.seat[2]) < 0.001, "The fixture assignment restores the original last-row place.");
    await advanceTo(3.15);
    await nextFrames(5);
    results.entry.openDoor = checkOpenDoor(await tripSnapshot());
    const entrySamples = await advanceTo(entryStart.timing.entrySitStart + 0.01);
    await nextFrames();
    results.entry.crossing = checkCrossing(entrySamples, true, entryStart.doorZ);
    await advanceTo(entryStart.timing.entryCameraTime - 0.01);
    await nextFrames();
    const approach = [];
    for (const fraction of [0.08, 0.25, 0.5, 0.72, 0.9]) {
      await advanceTo(entryStart.timing.entryCameraTime + (entryStart.timing.entryDuration - entryStart.timing.entryCameraTime) * fraction);
      await nextFrames();
      approach.push(await tripSnapshot());
    }
    assert(approach.every(sample => sample.sitting === 1 && sample.blend > 0 && sample.blend < 1), "The camera joins the eyes only after the avatar has sat down.");
    await advanceTo(entryStart.timing.entryDuration + 0.05);
    await releaseController();
    await wait("document.querySelector('.bus-app').dataset.phase==='inside'", "Rear-door entry reaches first person");
    await nextFrames();
    const seated = await tripSnapshot();
    const origin = approach[0].camera.map((value, index) => (value - approach[0].blend * seated.camera[index]) / (1 - approach[0].blend));
    assert(approach.every(sample => sample.camera.every((value, index) => Math.abs(value - (origin[index] + (seated.camera[index] - origin[index]) * sample.blend)) < 0.04)), "The camera takes one direct segment to the eyes, without replaying the doorway walk.");
    assert(Math.abs(seated.camera[0] - expectedEye.x) < 0.01 && Math.abs(seated.camera[1] - 1.84) < 0.01 && Math.abs(seated.camera[2] - expectedEye.z - 0.03) < 0.01,
      "The final camera must match the actual assigned seat column and row.");
    assert.equal(seated.headVisible, false, "The first-person camera hides its own avatar head.");
    await wait("window.mediaTestPlayers.bus.state===1&&!window.mediaTestPlayers.bus.muted", "The already-prepared TV plays audibly after eye arrival");
    const media = await run(`({samePlayer:window.mediaTestPlayers.bus===window.busExtensionOriginalPlayer,iframes:document.querySelectorAll('#tv-primary-iframe').length,
      commands:window.mediaTestPlayers.bus.commands,requests:window.busExtensionRequests,blocked:window.busExtensionBlockedMutations})`);
    assert(media.samePlayer && media.iframes === 1, "Exit, re-entry and TV relocation must retain the same sole player.");
    assert(media.commands.filter(command => command.command === "play" && command.phase === "entering").every(command => command.muted || command.volume === 0), "The TV must stay inaudible throughout boarding.");
    assert.deepEqual(media.blocked, []);
    assert.equal(media.requests.filter(request => request.method === "POST").length, 1, "Only one simulated registration is needed.");
    results.entry.start = entryStart;
    results.entry.approach = approach.map(({ camera, blend, sitting }) => ({ camera, blend, sitting }));
    results.entry.seated = seated;
    results.media = media;
    await screenshot("bus-500-premiere-personne.png");
    console.log("Nearest rear-door entry and exit passed, including delayed seat assignment, stationary-bus crossing, direct eye transition and one retained TV player.");

    const mobile = await openScene(1000, 249, 393, 852, 4);
    results.mobile1000 = await auditMountedBusDoors({ send, evaluate, waitForPageCondition });
    assert.equal(mobile.iframeCount, 1);
    assert.deepEqual(mobile.blocked, []);
    assert(mobile.requests.every(request => request.method === "GET" || request.method === "HEAD"), "The 1000-visitor structural fixture uses reads only.");
    await click("Explorer en vue libre");
    await wait("window.busCameraTestState().controls.enabled", "Mobile free view stays available in the virtualized bus");
    await poseCamera([9, 4.6, mobile.rearZ + 3], [0, 1.6, mobile.rearZ - 8]);
    await screenshot("bus-1000-portes-mobile.png");
    console.log("1000-visitor mobile geometry and virtualization checked; checking rendered facial expressions.");
    results.expressions = await runExpressionVisualChecks({ send, evaluate, waitForPageCondition, baseUrl });
    assert.deepEqual(await run("window.busExtensionBlockedMutations"), []);
    if (directory) await writeFile(resolve(directory, "verification-extension-bus.json"), JSON.stringify(results, null, 2));
    console.log("Expanding bus checks passed: door sections, clear vestibules, nearest-door journeys, unchanged exploration, retained TV player, 1000-visitor mobile structure and facial expressions.");
    return results;
  } finally {
    try { await releaseController(); } catch { /* The test page may have been replaced. */ }
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
    await send("Emulation.setEmulatedMedia", { features: [] });
  }
}
