import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createCdp, evaluate, waitForJson, waitForPageCondition } from "./browser-helpers.mjs";
import { installTestYouTube } from "./media-playback-checks.mjs";

// Browser integration uses only a local fixture. Real D1 persistence is covered
// separately by test-server-authorization.mjs with ephemeral workerd databases.
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const output = resolve(process.env.BUS_VISUAL_OUTPUT ?? "/tmp/lesfousdubus-avatars");
const profile = `/tmp/bus-avatars-${process.pid}`;
const port = Number(process.env.CDP_PORT ?? 9456);
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH ?? "/usr/bin/google-chrome", [
  "--headless=new", `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--no-sandbox",
  "--disable-dev-shm-usage", "--disable-background-networking", "--disable-gpu-watchdog", "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader", "--mute-audio", "about:blank",
], { stdio: "ignore" });
let ws;
const report = { checks: [], viewports: [], errors: [], media: "Controlled YouTube API; fixture visitor writes only." };
try {
  const tabs = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  ws = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true });
  });
  const send = createCdp(ws);
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 45_000);
  const delay = milliseconds => run(`new Promise(resolve => setTimeout(resolve, ${milliseconds}))`);
  const click = selector => run(`(() => { const b = document.querySelector(${JSON.stringify(selector)}); if (!b || b.disabled) throw new Error('Unavailable control: ' + ${JSON.stringify(selector)}); b.click(); })()`);
  const capture = async filename => {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(`${output}/${filename}`, Buffer.from(shot.data, "base64"));
  };
  const key = async key => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key });
  };
  const open = async () => {
    await run("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Changer de personnage')).click()");
    await wait("Boolean(document.getElementById('avatar-selection-title')) && Boolean(avatarPreview())", "Avatar dialog and real 3D preview");
  };
  await send("Page.enable"); await send("Runtime.enable");
  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") report.errors.push(message.params.exceptionDetails.text);
  });
  await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 4 });
  await send("Emulation.setDeviceMetricsOverride", { width: 1240, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (${installTestYouTube.toString()})();
    const roots = new Map(); let rendererId = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(),
      inject(renderer) { const id = ++rendererId; this.renderers.set(id, renderer); return id; },
      onCommitFiberRoot(id, root) { roots.set(id, root); }, onCommitFiberUnmount() {},
    };
    window.avatarFind = predicate => {
      for (const root of roots.values()) { const stack = [root.current];
        while (stack.length) { const fiber = stack.pop(); if (!fiber) continue;
          const result = predicate(fiber); if (result) return result; stack.push(fiber.child, fiber.sibling); }
      } return null;
    };
    window.avatarScene = () => avatarFind(fiber => {
      const store = fiber.memoizedProps?.store ?? fiber.memoizedProps?.value;
      if (typeof store?.getState !== 'function') return;
      const state = store.getState(); if (state.scene?.getObjectByName('bus-vehicle')) return state;
    });
    window.avatarPreview = () => avatarFind(fiber => {
      const store = fiber.memoizedProps?.store ?? fiber.memoizedProps?.value;
      if (typeof store?.getState !== 'function') return;
      const state = store.getState(); if (state.scene?.isScene && !state.scene.getObjectByName('bus-vehicle'))
        return state.scene.getObjectByName('bus-boarding-avatar');
    });
    const nativeFetch = fetch.bind(window); window.avatarApiCalls = [];
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/api/bus-entries')) return nativeFetch(input, init);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (!['GET','HEAD','POST'].includes(method)) throw new Error('Fixture disallows this write');
      let passenger = JSON.parse(localStorage.getItem('avatar-test-fixture') || 'null');
      const payload = init?.body ? JSON.parse(init.body) : {};
      window.avatarApiCalls.push({ method, payload, fixture: true });
      if (method === 'POST' && payload.avatarId) {
        passenger = { seatIndex: 0, displayName: 'Nakama Test', comment: 'Vive le bus !', avatarId: payload.avatarId };
        localStorage.setItem('avatar-test-fixture', JSON.stringify(passenger));
      }
      return Promise.resolve(new Response(JSON.stringify({ count: 2, seatCapacity: 2, profileRevision: passenger ? 2 : 1,
        vacantSeatRanges: [], passengers: passenger ? [passenger] : [], seatIndex: 0, added: false, passenger }),
        { headers: { 'Content-Type': 'application/json' } }));
    };
  ` });
  await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=2` });
  await wait("document.querySelector('.bus-app')?.dataset.sceneAvailable === 'true' && Boolean(avatarScene())", "Real bus scene ready");
  await delay(350);
  const adultEyeY = await run("avatarScene().camera.position.y");
  // The relay's only phone stays in the same palm through real animations.
  const phoneSample = () => run(`(() => {
    const scene = avatarScene().scene, actor = scene.getObjectByName('bus-entry-passenger');
    const phone = actor.getObjectByName('bus-relay-phone'), hand = actor.getObjectByName('nakama-hand-left');
    const grip = phone?.getObjectByName('nakama-foudubustv-phone-grip');
    if (!phone || !hand || !grip) throw new Error('Relay phone or hand missing');
    actor.updateWorldMatrix(true, true);
    hand.geometry.computeBoundingBox(); grip.geometry.computeBoundingBox();
    let visible = true;
    for (let parent = phone; parent; parent = parent.parent) if (!parent.visible) visible = false;
    return { count: scene.getObjectsByProperty('name', 'bus-relay-phone').length,
      parent: phone.parent.name, visible, activity: actor.userData.activity,
      inHand: hand.geometry.boundingBox.clone().applyMatrix4(hand.matrixWorld)
        .intersectsBox(grip.geometry.boundingBox.clone().applyMatrix4(grip.matrixWorld)),
      local: hand.worldToLocal(phone.getWorldPosition(hand.position.clone())).toArray(),
      world: phone.getWorldPosition(hand.position.clone()).toArray() };
  })()`);
  const phoneSamples = [await phoneSample()];
  await click('button[aria-label="Klaxonner"]:not(:disabled)');
  await wait("avatarScene().scene.getObjectByName('bus-entry-passenger').userData.activity === 'horn'", "Relay horn gesture");
  phoneSamples.push(await phoneSample());
  await click('button[aria-label="Lancer la fête"]:not(:disabled)');
  await wait("mediaTestPlayers.party?.state === 1", "Party music ready for relay check");
  await run("mediaTestPlayers.party.seekTo(9, true)");
  await wait("avatarScene().scene.getObjectByName('bus-entry-passenger').userData.activity === 'party'", "Relay party gesture");
  phoneSamples.push(await phoneSample());
  await delay(400);
  phoneSamples.push(await phoneSample());
  for (const sample of phoneSamples) {
    assert.equal(sample.count, 1, "The relay must not retain a second phone at the knee.");
    assert.equal(sample.parent, "nakama-signature-left", "The phone belongs to the animated left wrist.");
    assert(sample.visible && sample.inHand, "The visible phone grip stays in contact with the palm.");
    assert(sample.local.every((value, index) => Math.abs(value - phoneSamples[0].local[index]) < 0.00001), "The phone cannot slide relative to its hand.");
  }
  assert(phoneSamples.some(sample => sample.world.some((value, index) => Math.abs(value - phoneSamples[0].world[index]) > 0.02)), "The phone must actually travel with the animated hand.");
  await click('button[aria-label="Arrêter la fête"]:not(:disabled)');
  report.phone = phoneSamples;
  report.checks.push("One relay phone, always visible and fixed to the real palm through idle, horn and party poses.");
  // Freeze the scene through its real metadata modal, then render the shipped
  // actor once from the aisle for an inspectable close-up. Restore the UI after.
  await click('button[aria-label^="La théorie existe depuis"]');
  await wait("Boolean(document.getElementById('theory-age-title'))", "Freeze relay close-up");
  await delay(150);
  await run(`(() => {
    document.querySelector('.bus-modal-backdrop').style.visibility = 'hidden';
    document.querySelector('[data-bottom-layout]').style.visibility = 'hidden';
    const state = avatarScene(), actor = state.scene.getObjectByName('bus-entry-passenger');
    const camera = state.camera.clone(), target = actor.getWorldPosition(camera.position.clone());
    target.y += 1.43;
    camera.position.copy(target).add(new target.constructor(1.15, .2, -.85));
    camera.lookAt(target); camera.fov = 42; camera.updateProjectionMatrix();
    state.gl.render(state.scene, camera);
  })()`);
  await capture('foudubustv-phone.png');
  await run("document.querySelector('.bus-modal-backdrop').style.visibility = ''; document.querySelector('[data-bottom-layout]').style.visibility = ''");
  await click('button[aria-label="Fermer la fenêtre"]');
  await wait("!document.querySelector('[aria-modal=true]')", "Restore UI after close-up");
  await open();
  assert.equal(await run("document.querySelector('[data-avatar-id]').dataset.avatarId"), "luffy");
  assert.equal(await run("avatarPreview().userData.archetypeId"), "luffy");
  // Check the real face orientation, not just the slider's zero value. All
  // characters share a -Z face while the preview camera sits on the +Z side.
  const frontFacing = () => run(`(()=>{const actor=avatarPreview();actor.updateWorldMatrix(true,true);const face=actor.getObjectByName('nakama-face');return -face.getWorldDirection(face.position.clone()).z;})()`);
  const rosterSize = await run("Number(document.querySelector('[aria-live=polite] p').textContent.split('/')[1])");
  for(let index=0;index<rosterSize;index++) {
    const selected=await run("document.querySelector('[data-avatar-id]').dataset.avatarId");
    await wait("avatarPreview()?.visible===true", `Selected character ${selected} is rendered`);
    assert((await frontFacing())>.99,"Every character must face the preview camera at the default angle.");
    const current=await run("document.querySelector('[data-avatar-id]').dataset.avatarId");
    if(index===0) await capture('avatar-face-luffy.png');
    await click('button[aria-label="Personnage suivant"]');
    await wait(`Boolean(avatarPreview())&&avatarPreview().userData.archetypeId!==${JSON.stringify(current)}`, "Next real character renders");
    assert.equal(await run("Number(document.querySelector('[data-avatar-id]').dataset.avatarRotation)"),0,"Each selection resets to a front view.");
    await delay(150);
  }
  report.checks.push(`${rosterSize} actual character faces point toward the camera at the default angle.`);
  await click('button[aria-label="Personnage précédent"]');
  await wait("avatarPreview()?.userData.archetypeId === 'mihawk'", "Previous wraps roster");
  await click('button[aria-label="Personnage suivant"]');
  await wait("avatarPreview()?.userData.archetypeId === 'luffy'", "Next wraps roster");
  for (let index = 0; index < 5; index++) await click('button[aria-label="Personnage suivant"]');
  await wait("avatarPreview()?.userData.archetypeId === 'chopper'", "Preview uses chosen Chopper rig");
  assert((await frontFacing())>.99,"Chopper also opens facing the viewer.");
  await capture('avatar-face-chopper.png');
  const before = await run("Number(document.querySelector('[data-avatar-id]').dataset.avatarRotation)");
  const position = await run("(() => { const r = document.querySelector('[data-avatar-id]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()");
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...position, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: position.x + 75, y: position.y, button: "left", buttons: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: position.x + 75, y: position.y, button: "left", clickCount: 1 });
  await wait(`Number(document.querySelector('[data-avatar-id]').dataset.avatarRotation) > ${before + 0.5}`, "Pointer drag rotates 3D avatar");
  await run("document.querySelector('input[aria-label=\"Rotation du personnage\"]').focus()");
  const rangeBefore = await run("document.querySelector('input[aria-label=\"Rotation du personnage\"]').value");
  await key("ArrowRight");
  assert.notEqual(await run("document.querySelector('input[aria-label=\"Rotation du personnage\"]').value"), rangeBefore, "Keyboard range rotates the avatar.");
  assert.equal(await run("document.querySelector('[data-avatar-id]').dataset.avatarId"), "chopper", "Rotation keys do not change characters.");
  report.checks.push("Current character, roster wraparound, actual Chopper preview rig, pointer rotation and keyboard rotation.");
  await click('button[aria-label="Personnage suivant"]');
  await wait("avatarPreview()?.userData.archetypeId !== 'chopper'", "Leave the rotated character");
  await click('button[aria-label="Personnage précédent"]');
  await wait("avatarPreview()?.userData.archetypeId === 'chopper'", "Return to a front-facing Chopper");
  assert((await frontFacing())>.99,"Changing characters restores the front view after manual rotation.");
  for (const viewport of [
    { width: 1240, height: 900, mobile: false }, { width: 393, height: 852, mobile: true },
    { width: 320, height: 568, mobile: true }, { width: 667, height: 375, mobile: true },
  ]) {
    await send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1 }); await delay(200);
    const dimensions = await run("(() => { const r = document.querySelector('[aria-modal=true]').getBoundingClientRect(); const body = document.querySelector('[aria-modal=true]'); return {left:r.left,right:r.right,width:r.width,viewport:innerWidth,scroll:document.documentElement.scrollWidth,dialogScroll:body.scrollWidth,client:body.clientWidth}; })()");
    assert(dimensions.left >= 0 && dimensions.right <= dimensions.viewport + 1, "Dialog stays inside the viewport.");
    assert(dimensions.scroll <= dimensions.viewport && dimensions.dialogScroll <= dimensions.client + 1, "No horizontal overflow.");
    await capture(`avatar-${viewport.width}x${viewport.height}.png`);
    report.viewports.push({ viewport, dimensions });
  }
  // Save via the actual control and assert the main bus actor, profile and count.
  await run("[...document.querySelectorAll('[aria-modal=true] button')].find(button => button.textContent.includes('Choisir ce personnage')).click()");
  await wait("!document.querySelector('[aria-modal=true]') && avatarScene().scene.getObjectByName('bus-boarding-avatar')?.userData.archetypeId === 'chopper'", "Saved character appears in main scene");
  await wait(`avatarScene().camera.position.y < ${adultEyeY - 0.2}`, "First-person camera follows Chopper eye height");
  const chopperEyeY = await run("avatarScene().camera.position.y");
  assert.equal(await run("JSON.parse(localStorage.getItem('avatar-test-fixture')).displayName"), "Nakama Test");
  assert.equal(await run("JSON.parse(localStorage.getItem('avatar-test-fixture')).comment"), "Vive le bus !");
  // Discard the display cache; restoring on entry must use the API's persisted identity.
  await run("localStorage.removeItem('fdb-avatar-id')");
  await send("Emulation.setDeviceMetricsOverride", { width: 1240, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: baseUrl });
  await wait("document.querySelector('.bus-app')?.dataset.sceneAvailable === 'true'", "Reloaded scene ready");
  await run("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Entrer dans le bus')).click()");
  await wait("document.querySelector('.bus-app')?.dataset.phase === 'inside'", "Boarding completed on revisit");
  assert.equal(await run("avatarScene().scene.getObjectByName('bus-boarding-avatar').userData.archetypeId"), "chopper");
  const restoredEyeY = await run("avatarScene().camera.position.y");
  assert(restoredEyeY < adultEyeY - 0.2, "Restored character uses Chopper's eye height.");
  assert(Math.abs(restoredEyeY - chopperEyeY) < 0.08, "Character change and revisit use the same eye level.");
  report.camera = { adultEyeY, chopperEyeY, restoredEyeY };
  await open();
  assert.equal(await run("document.querySelector('[data-avatar-id]').dataset.avatarId"), "chopper", "Reopening begins on restored character.");
  assert((await frontFacing())>.99,"Reopening returns the saved character to a front view.");
  await key("Escape"); await wait("!document.querySelector('[aria-modal=true]')", "Escape closes avatar selection");
  report.checks.push("Save updates main actor; fixture restores through boarding API after local avatar cache removal; current selection reopens correctly.");
  assert.deepEqual(report.errors, []);
  report.apiCalls = await run("avatarApiCalls");
  await writeFile(`${output}/avatars.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = String(error.stack ?? error);
  await writeFile(`${output}/avatars.json`, JSON.stringify(report, null, 2) + "\n");
  throw error;
} finally {
  ws?.close(); chrome.kill("SIGTERM");
  await rm(profile, { recursive: true, force: true }).catch(() => undefined);
}
