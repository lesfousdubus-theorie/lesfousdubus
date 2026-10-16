import assert from "node:assert/strict";
import { runCharacterVisualChecks } from "./character-visual-checks.mjs";
import { runScenePerformanceChecks } from "./scene-performance-checks.mjs";
import { runBusPlaybackZoomChecks } from "./bus-playback-zoom-checks.mjs";
import { runDoorMusicChecks } from "./door-music-checks.mjs";
import { runLiveMusicCheck } from "./live-music-checks.mjs";
import { runDoorConfettiChecks } from "./bus-door-confetti-checks.mjs";
import { runBusPartyChecks } from "./bus-party-checks.mjs";
import { runLedItineraryChecks } from "./led-itinerary-checks.mjs";
import { runDriverVisualChecks } from "./driver-visual-checks.mjs";
import { runExpandingBusChecks } from "./expanding-bus-checks.mjs";
import { runCrewSeatDesignChecks } from "./crew-seat-design-checks.mjs";

// Capture the two React renderer roots in this isolated test page. No debug
// handle is added to the application source or retained on subsequent pages.
export async function runBusCameraChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  let boardingVisitor = null;
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    const roots = new Map();
    let rendererId = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(),
      inject(renderer) { const id = ++rendererId; this.renderers.set(id, renderer); return id; },
      onCommitFiberRoot(id, root) { roots.set(id, root); },
      onCommitFiberUnmount() {},
    };
    window.busCameraTestState = () => {
      for (const root of roots.values()) {
        const queue = [root.current];
        while (queue.length) {
          const fiber = queue.pop();
          if (!fiber) continue;
          const store = fiber.memoizedProps?.store ?? fiber.memoizedProps?.value;
          if (typeof store?.getState === 'function') {
            const state = store.getState();
            if (state.camera?.isCamera && state.scene?.isScene) return state;
          }
          queue.push(fiber.child, fiber.sibling);
        }
      }
      return null;
    };
    window.busDestinationTestReducedMotion = () => {
      for (const root of roots.values()) {
        const queue = [root.current];
        while (queue.length) {
          const fiber = queue.pop();
          if (!fiber) continue;
          if (fiber.memoizedProps?.name === 'bus-led-destination') return fiber.return?.memoizedProps?.reducedMotion;
          queue.push(fiber.child, fiber.sibling);
        }
      }
      return null;
    };
    window.busJourneyTestState = () => {
      for(const root of roots.values()){
        const queue=[root.current];
        while(queue.length){
          const fiber=queue.pop();if(!fiber)continue;
          const state=fiber.memoizedProps?.journey?.current;
          if(state?.position?.isVector3&&typeof state.elapsed==='number')return state;
          queue.push(fiber.child,fiber.sibling);
        }
      }
      return null;
    };
    window.busYoutubeTestPlayer = (iframeId) => {
      for(const root of roots.values()){
        const queue=[root.current];
        while(queue.length){
          const fiber=queue.pop();if(!fiber)continue;
          let hook=fiber.memoizedState;
          while(hook){
            const player=hook.memoizedState?.current;
            if(typeof player?.getIframe==='function'&&player.getIframe()?.id===iframeId)return player;
            hook=hook.next;
          }
          queue.push(fiber.child,fiber.sibling);
        }
      }
      return null;
    };
  ` });
  const run = expression => evaluate(send, expression);
  const viewport = (width, height) => send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: true,
  });
  const distance = () => run(`(() => { const s = window.busCameraTestState(); return s.camera.position.distanceTo(s.controls.target); })()`);
  const reset = async () => {
    const point = await run(`(() => { const r = document.querySelector('button[aria-label="Recentrer la vue"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
  };
  const settled = async () => {
    try {
      await waitForPageCondition(send,
        `window.busCameraTestState()?.controls?.enabled === true`, "Camera recentring finishes", 15_000);
    } catch (error) {
      console.error("Camera diagnostics:", await run(`(() => { const s = window.busCameraTestState(); return {
        active:s?.internal.active, enabled:s?.controls?.enabled, elapsed:s?.clock.elapsedTime,
        frame:s?.gl.info.render.frame, position:s?.camera.position.toArray(),
        visibility:document.visibilityState, dataset:document.querySelector('.bus-app')?.dataset,
      }; })()`));
      throw error;
    }
  };
  try {
    if (process.env.BUS_CAMERA_CHECKS === "crew-seats") {
      await runCrewSeatDesignChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "extensions") {
      await runExpandingBusChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "hands") {
      await runDriverVisualChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "door-confetti") {
      await runDoorConfettiChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "party") {
      await runBusPartyChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "led") {
      await runLedItineraryChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "music-live") {
      await runLiveMusicCheck({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "door-music") {
      await runDoorMusicChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (["playback", "playback-zoom"].includes(process.env.BUS_CAMERA_CHECKS)) {
      await runBusPlaybackZoomChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "performance") {
      await runScenePerformanceChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    if (process.env.BUS_CAMERA_CHECKS === "characters") {
      await runCharacterVisualChecks({send,evaluate,waitForPageCondition,baseUrl});
      return;
    }
    await viewport(393, 852);
    await send("Page.navigate", { url: `${baseUrl}/?cam=front&count=12` });
    await waitForPageCondition(send, `Boolean(window.busCameraTestState()?.controls) && document.querySelector('.bus-app')?.dataset.sceneAvailable === 'true'`, "Camera test scene loads", 30_000);
    const gestures = process.env.BUS_CAMERA_CHECKS !== "door";
    if (gestures) {
    const initial = await distance();
    assert(initial > 15, "The optional front view must also fit a portrait screen.");

    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 60, y: 430, id: 0 }, { x: 333, y: 430, id: 1 }] });
    for (let step = 1; step <= 8; step++) {
      await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [
        { x: 60 + step * 13, y: 430, id: 0 }, { x: 333 - step * 13, y: 430, id: 1 },
      ] });
    }
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitForPageCondition(send, `(() => { const s = window.busCameraTestState(); return s.camera.position.distanceTo(s.controls.target) > ${initial * 2.5}; })()`, "Pinch retreats beyond the old camera limit");

    await viewport(1240, 900);
    await reset();
    await waitForPageCondition(send, `window.busCameraTestState()?.controls?.enabled === false`, "Desktop recentring starts");
    await settled();
    const desktop = await distance();
    for (let i = 0; i < 55; i++) await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 620, y: 450, deltaX: 0, deltaY: 200 });
    await waitForPageCondition(send, `(() => { const s = window.busCameraTestState(); return s.camera.position.distanceTo(s.controls.target) > 130; })()`, "Wheel reaches the extended camera range");
    assert(await distance() <= 140.01, "Exterior zoom must stop at its configured limit.");

    await reset();
    await waitForPageCondition(send, `window.busCameraTestState()?.controls?.enabled === false`, "Recentre starts before resizing");
    await viewport(393, 852);
    await settled();
    const portrait = await distance();
    const expected = desktop * (0.85 / (393 / 852));
    assert(Math.abs(portrait - expected) < 0.3, `Resizing during recentring must preserve portrait framing: ${portrait} vs ${expected}.`);

    // A cancelled gesture must release the controls for the next one.
    const before = await run(`window.busCameraTestState().camera.quaternion.toArray()`);
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 500, id: 0 }] });
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 250, y: 460, id: 0 }] });
    await send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 500, id: 1 }] });
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 120, y: 510, id: 1 }] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitForPageCondition(send, `window.busCameraTestState().camera.quaternion.toArray().some((v,i) => Math.abs(v - ${JSON.stringify(before)}[i]) > 0.02)`, "Orbit remains usable after touch cancellation");

    const wheels = await run(`window.busCameraTestState().scene.getObjectByName('bus-wheels').children.map(support => {
      const wheel = support.children[0], e = wheel.matrixWorld.elements;
      return {axis: [e[4],e[5],e[6]], angle: wheel.rotation.y};
    })`);
    assert(wheels.length >= 4, "The rendered vehicle must have all its wheels.");
    for (const wheel of wheels) {
      assert(Math.abs(wheel.axis[0]) > 0.99 && Math.abs(wheel.axis[2]) < 0.01, "Rendered wheels must roll about the axle, without horizontal swivelling.");
    }
    const cadence = await run(`new Promise(resolve => {
      const s = window.busCameraTestState(), start = performance.now(), frames = s.gl.info.render.frame;
      setTimeout(() => resolve({frames: s.gl.info.render.frame - frames, elapsed: performance.now() - start}), 2000);
    })`);
    assert(cadence.frames > 0, "The 3D scene must keep rendering after gestures.");
    assert(cadence.frames / (cadence.elapsed / 1000) <= 61, "Actual rendering must respect the 60 FPS cap.");
    }

    console.log(`${gestures ? "Bus camera gestures checked; checking" : "Checking"} the passenger door and LED display.`);
    const rendered = () => run(`new Promise(resolve => { const s=window.busCameraTestState(), frame=s.gl.info.render.frame; const check=()=>s.gl.info.render.frame>frame+1?resolve(true):requestAnimationFrame(check); requestAnimationFrame(check); })`);
    await viewport(1240, 900);
    await waitForPageCondition(send, `window.busCameraTestState().size.width === 1240`, "Door viewport settles");
    await rendered();
    await reset();
    await waitForPageCondition(send, `window.busCameraTestState()?.controls?.enabled === false`, "Door view recentring starts");
    await settled();
    await rendered();
    const projectDoorLeaf = () => run(`(() => { const s = window.busCameraTestState(); const leaf=s.scene.getObjectByName('bus-door-front-leaf'); const v=leaf.children[0].children[1].getWorldPosition(s.camera.position.clone()).project(s.camera); const r=s.gl.domElement.getBoundingClientRect(); return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2}; })()`);
    const closedGeometry = await run(`(() => {
      const s=window.busCameraTestState(), bus=s.scene.getObjectByName('bus-vehicle'), leaf=s.scene.getObjectByName('bus-door-front-leaf');
      let bottom=Infinity; leaf.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox(); const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);bottom=Math.min(bottom,b.min.y-bus.position.y);}});
      return {bottom, steps:[0,1,2].map(i=>s.scene.getObjectByName('bus-entry-step-'+i).visible)};
    })()`);
    assert(closedGeometry.bottom >= 0.499, "The entire door must stay above the body sill.");
    assert(closedGeometry.steps.every(value=>!value), "Closed doors must have retracted, hidden steps.");
    assert.equal(await run(`window.busCameraTestState().scene.getObjectByName('bus-entry-landing').visible`), true, "The stairwell must be covered while the doors are closed.");
    const doorPoint = await projectDoorLeaf();
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...doorPoint });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...doorPoint });
    await waitForPageCondition(send, `Math.abs(window.busCameraTestState().scene.getObjectByName('bus-door-front-leaf').rotation.y) > 1.6`, "Door opens on its hinges", 15_000);
    const entrance = await run(`(() => {
      const s = window.busCameraTestState(), ray = new s.raycaster.constructor();
      ray.camera = s.camera;
      const blocked=[];
      for(const z of [-3.44,-2.93,-2.42])for(const y of [0.8,1.32,1.6,2.3]){
        ray.set(s.camera.position.clone().set(2,y,z),s.camera.position.clone().set(-1,0,0));
        blocked.push(...ray.intersectObject(s.scene.getObjectByName('bus-vehicle'),true).filter(hit=>hit.distance<1.7).map(hit=>({z,y,object:hit.object.name||hit.object.type})));
      }
      const seat = s.scene.getObjectByName('bus-seat-cushions'), matrix = seat.matrix.clone();
      seat.getMatrixAt(0, matrix);
      const rear = s.scene.getObjectByName('bus-rear-face'), bus = s.scene.getObjectByName('bus-vehicle');
      return {blocked, firstSeatZ:matrix.elements[14], rearTilt:rear.rotation.toArray().slice(0,3), busTilt:bus.rotation.toArray().slice(0,3), leaves:[s.scene.getObjectByName('bus-door-front-leaf').rotation.y,s.scene.getObjectByName('bus-door-rear-leaf').rotation.y]};
    })()`);
    assert.deepEqual(entrance.blocked, [], "The opened doorway must have no wall, trim or seat across the pedestrian passage.");
    assert.equal(await run(`window.busCameraTestState().scene.getObjectByName('bus-entry-landing').visible`), false, "The landing cover must retract before boarding.");
    assert(entrance.firstSeatZ - 0.35 > -2, "The first passenger seats must leave a clear vestibule.");
    assert(entrance.leaves[0] > 1.6 && entrance.leaves[1] < -1.6, "Both door leaves must open outward from their own hinges.");
    assert(entrance.rearTilt.every(value => Math.abs(value) < 1e-8) && entrance.busTilt.every(value => Math.abs(value) < 1e-8), "The rear face and body must stay upright.");
    const deployedSteps=await run(`[0,1,2].map(i=>{const step=window.busCameraTestState().scene.getObjectByName('bus-entry-step-'+i);return {position:step.position.toArray(),rotation:step.rotation.toArray().slice(0,3),visible:step.visible};})`);
    assert(deployedSteps.every((step,i)=>step.visible&&step.rotation.every(value=>value===0)&&Math.abs(step.position[1]-[0.29,0.46,0.63][i])<0.025), "The deployed steps must stay horizontal at their walking heights.");
    const led = await run(`(() => { const group=window.busCameraTestState().scene.getObjectByName('bus-led-destination'); const texture=group.children[1].material.map; return {version:texture.version,width:texture.image.width,height:texture.image.height}; })()`);
    assert(led.width <= 600 && led.height <= 80, "The full itinerary must use a small display texture.");
    await waitForPageCondition(send, `window.busCameraTestState().scene.getObjectByName('bus-led-destination').children[1].material.map.version > ${led.version}`, "LED itinerary advances");
    await send("Emulation.setEmulatedMedia", { features: [{ name:"prefers-reduced-motion", value:"reduce" }] });
    await waitForPageCondition(send, `window.busDestinationTestReducedMotion() === true`, "LED reduced-motion setting reaches the scene");
    await rendered();
    const still = await run(`window.busCameraTestState().scene.getObjectByName('bus-led-destination').children[1].material.map.version`);
    await rendered();
    const stillAfter = await run(`window.busCameraTestState().scene.getObjectByName('bus-led-destination').children[1].material.map.version`);
    assert.equal(stillAfter, still, "Reduced-motion mode must leave the LED board still.");
    await send("Emulation.setEmulatedMedia", { features: [] });
    await waitForPageCondition(send, `window.busDestinationTestReducedMotion() === false`, "LED animation resumes");
    await rendered();
    const closePoint = await projectDoorLeaf();
    await send("Input.dispatchMouseEvent", { type:"mousePressed",button:"left",clickCount:1,...closePoint });
    await send("Input.dispatchMouseEvent", { type:"mouseReleased",button:"left",clickCount:1,...closePoint });
    try {
      await waitForPageCondition(send, `Math.abs(window.busCameraTestState().scene.getObjectByName('bus-door-front-leaf').rotation.y) < 0.03`, "Door preview closes before boarding", 15_000);
    } catch(error) {
      console.error("Door closing diagnostics:", await run(`(() => {const s=window.busCameraTestState();return {point:${JSON.stringify(closePoint)},angle:s.scene.getObjectByName('bus-door-front-leaf').rotation.y,frame:s.gl.info.render.frame,element:document.elementFromPoint(${closePoint.x},${closePoint.y})?.outerHTML.slice(0,300),camera:s.camera.position.toArray()};})()`));
      throw error;
    }
    const exteriorView=await run(`(()=>{const s=window.busCameraTestState();return {position:s.camera.position.toArray(),target:s.controls.target.toArray()};})()`);
    await run(`(() => {
      window.busBoardingSamples=[];
      const sample=()=>{
        const s=window.busCameraTestState(), phase=document.querySelector('.bus-app')?.dataset.phase;
        const trip=window.busJourneyTestState();
        if(phase==='entering'&&trip?.phase===phase)window.busBoardingSamples.push({position:trip.position.toArray(),camera:s.camera.position.toArray(),elapsed:trip.elapsed,drive:trip.drive,sitting:trip.sitting,blend:trip.cameraBlend,knee:s.scene.getObjectByName('avatar-shin-0').rotation.x,step:s.scene.getObjectByName('bus-entry-step-0').position.toArray(),headVisible:s.scene.getObjectByName('bus-boarding-avatar-head').visible,angle:s.scene.getObjectByName('bus-door-front-leaf').rotation.y});
        if(phase!=='inside')requestAnimationFrame(sample);
      };requestAnimationFrame(sample);
      [...document.querySelectorAll('button')].find(button=>button.textContent?.includes('Entrer dans le bus')).click();
    })()`);
    boardingVisitor = await run(`localStorage.getItem('fdb-visitor')`);
    await waitForPageCondition(send, `document.querySelector('.bus-app')?.dataset.phase === 'inside'`, "Boarding through the open door finishes", 90_000);
    const samples = await run(`window.busBoardingSamples`);
    const crossing=samples.filter((sample,index)=>index>0&&sample.position[0]<=1.32&&samples[index-1].position[0]>1.32);
    assert(crossing.length > 0, "Actual animated passenger boarding must cross the door.");
    assert(crossing.every(sample=>sample.angle>1.6&&Math.abs(sample.position[2]+2.93)<0.05&&sample.drive===0),"The bus must be stopped with its door fully open when the passenger enters.");
    assert(samples.some(sample=>sample.elapsed<2&&sample.position[2]<-12),"The passenger must wait ahead of the approaching bus.");
    const approach=samples.filter(sample=>sample.blend>0.02&&sample.blend<0.98);
    assert(approach.length>3,"The camera must glide to the head after sitting.");
    assert(approach.every(sample=>sample.sitting===1),"The camera must wait for the seated pose.");
    const eye=await run(`window.busCameraTestState().camera.position.toArray()`);
    const origin=approach[0].camera.map((value,i)=>(value-approach[0].blend*eye[i])/(1-approach[0].blend));
    assert(approach.every(sample=>sample.camera.every((value,i)=>Math.abs(value-(origin[i]+(eye[i]-origin[i])*sample.blend))<0.03)),"The camera must follow one direct segment to the eyes, without another doorway journey.");
    assert(new Set(samples.filter(sample=>sample.elapsed>4&&sample.elapsed<7).map(sample=>sample.knee.toFixed(2))).size>4,"Walking must animate the knees.");
    assert(crossing.every(sample=>Math.abs(sample.step[1]-0.29)<0.015),"Steps must be fully deployed before the avatar crosses.");
    const eyes=await run(`window.busCameraTestState().camera.position.toArray()`);
    assert(Math.abs(eyes[1]-1.84)<0.01,"First-person view must arrive at the passenger's eye height.");
    assert.equal(await run(`window.busCameraTestState().scene.getObjectByName('bus-boarding-avatar-head').visible`),false,"Inside view must hide the avatar's head.");
    await waitForPageCondition(send, `Math.abs(window.busCameraTestState().scene.getObjectByName('bus-door-front-leaf').rotation.y) < 0.03`, "Door closes after boarding",15_000);
    // Le déplacement de la caméra ne doit ni faire descendre ni déplacer le passager.
    const seatedAvatar = await run(`window.busJourneyTestState().position.toArray()`);
    for (const [width, height] of [[1240,900],[393,852]]) {
      await viewport(width,height);
      await waitForPageCondition(send, `window.busCameraTestState().size.width===${width}`, "Free-view viewport settles");
      await run(`document.querySelector('button[aria-label="Explorer en vue libre"]').click()`);
      await waitForPageCondition(send, `document.querySelector('.bus-app').dataset.view==='free' && window.busCameraTestState().controls.enabled && window.busCameraTestState().scene.getObjectByName('bus-boarding-avatar-head').visible`, "Free view shows the seated avatar", 15_000);
      assert.equal(await run(`document.querySelector('.bus-app').dataset.phase`), "inside", "Exploration must keep the passenger aboard.");
      assert.equal(await run(`window.busCameraTestState().controls.enablePan`), true, "Free view must allow moving the orbit target.");
      assert.deepEqual(await run(`window.busJourneyTestState().position.toArray()`), seatedAvatar, "The seated character must stay at the same position.");
      const beforePan = await run(`window.busCameraTestState().controls.target.toArray()`);
      await send("Input.dispatchMouseEvent", {type:"mousePressed",button:"right",buttons:2,clickCount:1,x:width*.5,y:height*.5});
      await send("Input.dispatchMouseEvent", {type:"mouseMoved",button:"right",buttons:2,x:width*.6,y:height*.45});
      await send("Input.dispatchMouseEvent", {type:"mouseReleased",button:"right",buttons:0,clickCount:1,x:width*.6,y:height*.45});
      await waitForPageCondition(send, `window.busCameraTestState().controls.target.toArray().some((v,i)=>Math.abs(v-${JSON.stringify(beforePan)}[i])>.05)`, "Free camera pans with the mouse");
      if (width === 393) {
        const beforeTouch = await run(`window.busCameraTestState().controls.target.toArray()`);
        await send("Emulation.setTouchEmulationEnabled", {enabled:true,maxTouchPoints:2});
        await send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[{x:130,y:450,id:0},{x:240,y:450,id:1}]});
        await send("Input.dispatchTouchEvent", {type:"touchMove",touchPoints:[{x:160,y:425,id:0},{x:270,y:425,id:1}]});
        await send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
        await waitForPageCondition(send, `window.busCameraTestState().controls.target.toArray().some((v,i)=>Math.abs(v-${JSON.stringify(beforeTouch)}[i])>.05)`, "Free camera pans with two fingers");
      }
      await run(`document.querySelector('button[aria-label="Revenir à ma place"]').click()`);
      await waitForPageCondition(send, `document.querySelector('.bus-app').dataset.view==='seat' && !window.busCameraTestState().controls.enabled && window.busCameraTestState().camera.position.distanceTo(window.busCameraTestState().camera.position.clone().fromArray(${JSON.stringify(eyes)}))<.02`, "Camera returns directly to the same eyes", 15_000);
      await rendered();
      assert.equal(await run(`window.busCameraTestState().scene.getObjectByName('bus-boarding-avatar-head').visible`), false, "Returning to first person must hide the head.");
      assert.deepEqual(await run(`window.busJourneyTestState().position.toArray()`), seatedAvatar, "Returning to the eyes must not replay boarding.");
    }
    console.log("Free view checked on desktop and portrait mobile (pan, stationary passenger and direct return to eyes).");
    await viewport(393,852);
    await waitForPageCondition(send, `window.busCameraTestState().size.width===393`,"Resize seated before exiting");
    await rendered();
    await run(`(()=>{window.busExitSamples=[];const sample=()=>{const s=window.busCameraTestState(),trip=window.busJourneyTestState(),phase=document.querySelector('.bus-app')?.dataset.phase;if(phase==='exiting'&&trip.phase===phase)window.busExitSamples.push({position:trip.position.toArray(),camera:s.camera.position.toArray(),drive:trip.drive,elapsed:trip.elapsed,angle:s.scene.getObjectByName('bus-door-front-leaf').rotation.y});if(phase!=='outside')requestAnimationFrame(sample);};requestAnimationFrame(sample);document.querySelector('button[aria-label="Sortir du bus"]').click();})()`);
    await waitForPageCondition(send, `document.querySelector('.bus-app')?.dataset.phase === 'outside'`, "Exit follows the door route", 90_000);
    const exits=await run(`window.busExitSamples`);
    const exitCrossing=exits.filter((sample,index)=>index>0&&sample.position[0]>=1.32&&exits[index-1].position[0]<1.32);
    assert(exitCrossing.length>0&&exitCrossing.every(sample=>sample.drive===0&&sample.angle>1.6),"The avatar must leave through the open door of the stopped bus.");
    assert(exits.some(sample=>sample.elapsed>6&&sample.elapsed<10&&sample.camera[0]>2),"The exit walk must be observed from outside.");
    await waitForPageCondition(send, `Math.abs(window.busCameraTestState().scene.getObjectByName('bus-door-front-leaf').rotation.y) < 0.03`, "Door closes after exiting");
    await rendered();
    const returned=await run(`(()=>{const s=window.busCameraTestState();return {position:s.camera.position.toArray(),target:s.controls.target.toArray(),corners:[[-1.34,0,-4.6],[1.34,3.3,-4.6],[-1.34,0,5.65],[1.34,3.3,5.65]].map(([x,y,z])=>s.camera.position.clone().set(x,y,z).project(s.camera).toArray())};})()`);
    const scale=0.85/(393/852);
    const expected=exteriorView.position.map((value,index)=>exteriorView.target[index]+(value-exteriorView.target[index])*scale);
    assert(returned.position.every((value,index)=>Math.abs(value-expected[index])<0.05),"Exiting after a resize must restore the saved exterior camera with portrait framing.");
    assert(returned.target.every((value,index)=>Math.abs(value-exteriorView.target[index])<0.05),`The camera must restore its exterior orbit target after the cinematic: ${JSON.stringify(returned.target)} vs ${JSON.stringify(exteriorView.target)}.`);
    assert(returned.corners.every(([x,y])=>Math.abs(x)<0.98&&Math.abs(y)<0.98),"The whole bus must fit after returning to exterior portrait view.");
    console.log("Bus door, avatar journey and LED checks passed (braking, stopped boarding, seated avatar before first person, visible exit, clear passage, upright rear and 59-stop display).");
    if (gestures) console.log("Bus camera checks passed (portrait framing, pinch, wheel zoom, resize during recentring, touch cancellation, wheel axes and 60 FPS cap).");
    await runCharacterVisualChecks({send,evaluate,waitForPageCondition,baseUrl});
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
    if (boardingVisitor) {
      const cleanup = await fetch(`${baseUrl}/api/bus-entries`, {method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorId:boardingVisitor})});
      assert(cleanup.ok, "The boarding test passenger must be removed.");
      await run(`localStorage.removeItem('fdb-visitor')`);
    }
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  }
}
