import assert from "node:assert/strict";
import { installTestYouTube } from "./media-playback-checks.mjs";

export async function runMediaRecoveryChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 35_000);
  const click = async label => {
    const selector = 'button[aria-label=' + JSON.stringify(label) + ']:not(:disabled)';
    await wait(`Boolean(document.querySelector(${JSON.stringify(selector)}))`, label);
    await run(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const bgm = "Activer la musique de fond (Life in Pieces — Le Mont Corvo)";
  await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["*youtube.com/iframe_api*", "*youtube-nocookie.com/embed/*"] });
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.failedYouTubeRequests = 0;
    window.blockYouTubeScript = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.id === 'youtube-iframe-api') {
          window.failedYouTubeRequests++;
          node.dispatchEvent(new Event('error'));
        }
      }
    });
    window.blockYouTubeScript.observe(document, { childList: true, subtree: true });
  ` });
  let depthFixture;
  try {
    await send("Emulation.setDeviceMetricsOverride", { width: 1120, height: 760, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=20&row=0` });
    await wait(`Boolean(window.busCameraTestState()?.scene)&&window.failedYouTubeRequests>0`, "Shared API initially fails");
    await click("Allumer la télévision");
    await wait(`Boolean(document.querySelector('button[aria-label="Réessayer la vidéo"]'))`, "Failed TV has a direct retry");
    await run(`window.blockYouTubeScript.disconnect();(${installTestYouTube.toString()})();`);
    await click("Réessayer la vidéo");
    await wait("window.mediaTestPlayers.bus?.state===1", "TV recovers after the API becomes reachable");
    const policies = await run(`(()=>{const p=window.mediaTestPlayers.bus,u=new URL(p.originalSrc);return [p.originalAllow,p.originalReferrerPolicy,u.searchParams.get('enablejsapi'),u.searchParams.get('origin')===location.origin];})()`);
    assert(policies[0].includes("autoplay") && policies[1] === "strict-origin-when-cross-origin" && policies[2] === "1" && policies[3],
      "The first iframe navigation includes permissions, referrer policy and JS API identification");

    await click(bgm);
    await wait("window.mediaTestPlayers.background?.state===1&&window.mediaTestPlayers.bus.state===2", "A click switches directly from TV to recovered background music");
    await run("window.failedBackground=window.mediaTestPlayers.background;window.failedBackground.options.events.onError({data:153,target:window.failedBackground})");
    await wait("window.failedBackground.destroyed", "An error disposes only the broken music iframe");
    await click(bgm);
    await wait("window.mediaTestPlayers.background!==window.failedBackground&&window.mediaTestPlayers.background?.state===1", "The background track retries without a page reload");
    await click("Lancer la fête");
    await wait("window.mediaTestPlayers.party?.state===1", "The separate party track recovers after SDK failure");
    await run("window.failedParty=window.mediaTestPlayers.party;window.failedParty.options.events.onError({data:150,target:window.failedParty})");
    await wait("document.querySelector('.bus-app')?.dataset.party==='false'&&window.failedParty.destroyed", "A rejected party track stops the dance and releases audio");
    await click("Lancer la fête");
    await wait("window.mediaTestPlayers.party!==window.failedParty&&window.mediaTestPlayers.party?.state===1", "The party track can retry independently");
    await click("Arrêter la fête");

    await click("Allumer la télévision");
    await wait("window.mediaTestPlayers.bus?.state===1", "TV starts again");
    await run("window.failedTv=window.mediaTestPlayers.bus;window.failedTv.options.events.onError({data:5,target:window.failedTv})");
    await wait("window.failedTv.destroyed&&window.mediaTestPlayers.background?.state===1", "A broken TV releases the working music");
    await click("Réessayer la vidéo");
    await wait("window.mediaTestPlayers.bus!==window.failedTv&&window.mediaTestPlayers.bus?.state===1", "TV replaces the failed iframe and plays");

    depthFixture = await send("Page.addScriptToEvaluateOnNewDocument", { source: `(${installTestYouTube.toString()})();` });
    await send("Page.reload");
    await wait("Boolean(window.busCameraTestState()?.scene)&&Boolean(window.mediaTestPlayers?.bus)", "Fresh scene for the depth check");
    await click("Allumer la télévision");
    await wait("window.mediaTestPlayers.bus.state===1&&getComputedStyle(document.getElementById('tv-frame')).visibility==='visible'", "The TV is visible from the seat");
    const result = await run(`(() => {
      const { scene, gl, camera } = window.busCameraTestState();
      const screen = scene.getObjectByName('bus-tv-depth-aperture');
      const originalPosition = camera.position.clone(), originalRotation = camera.quaternion.clone();
      const vec = (x,y,z) => camera.position.clone().set(x,y,z);
      camera.position.copy(screen.localToWorld(vec(0,0,1.2)));
      camera.lookAt(screen.getWorldPosition(vec(0,0,0)));
      camera.updateMatrixWorld(true);
      const context = gl.getContext(), canvas = gl.domElement, rect = canvas.getBoundingClientRect();
      const project = x => screen.localToWorld(vec(x,0,0)).project(camera);
      const alphaAt = x => {
        const projected = project(x), pixel = new Uint8Array(4);
        context.readPixels(Math.floor((projected.x+1)/2*context.drawingBufferWidth),
          Math.floor((projected.y+1)/2*context.drawingBufferHeight), 1,1,context.RGBA,context.UNSIGNED_BYTE,pixel);
        return pixel[3];
      };
      gl.render(scene,camera);
      const clear = [-.30,.30].map(alphaAt);
      const cover = screen.clone(false);
      cover.material = scene.getObjectByName('bus-tv-display').material.clone();
      cover.material.map = null;
      cover.position.set(-.25,0,.18);
      cover.scale.set(.38,.8,1);
      cover.renderOrder = 0;
      screen.add(cover);
      gl.render(scene,camera);
      const covered = [-.30,.30].map(alphaAt);
      // Keep the pose and DOM pointer samples in a single frame. The regular
      // seat camera resumes as soon as this evaluation returns to the page.
      const hits = [-.30,.30].map(x => {
        const point = project(x);
        const clientX = rect.x + (point.x+1)*rect.width/2, clientY = rect.y + (1-point.y)*rect.height/2;
        canvas.parentElement.dispatchEvent(new PointerEvent('pointermove', {clientX,clientY,bubbles:true,pointerType:'mouse'}));
        return document.elementFromPoint(clientX,clientY)?.id === 'tv-primary-iframe';
      });
      cover.removeFromParent();
      cover.material.dispose();
      camera.position.copy(originalPosition);
      camera.quaternion.copy(originalRotation);
      camera.updateMatrixWorld(true);
      return {clear,covered,hits,canvasLayer:Number(getComputedStyle(canvas).zIndex),tvCount:document.querySelectorAll('#tv-primary-iframe').length};
    })()`);
    assert.deepEqual(result.clear, [0, 0], "The unoccluded display reveals its iframe through the WebGL canvas");
    assert.deepEqual(result.covered, [255, 0], "Foreground geometry covers only the matching TV pixels");
    assert.deepEqual(result.hits, [false, true], "Native controls receive the pointer only on the exposed part of the TV");
    assert(result.canvasLayer > 1 && result.tvCount === 1, "The canvas is above a single TV iframe");
    console.log("YouTube recovery passed: shared API failure, independent reloads, audio focus, initial iframe permissions and pixel-level TV occlusion.");
  } finally {
    if (depthFixture) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: depthFixture.identifier });
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
    await send("Network.setBlockedURLs", { urls: [] });
  }
}
