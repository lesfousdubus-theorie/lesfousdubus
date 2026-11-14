import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

/** Uses the isolated React/media fixtures installed by expanding-bus-checks. */
export async function runExpressionVisualChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const run = expression => evaluate(send, expression);
  const rosterBuild = await build({ entryPoints: ["src/components/bus/passenger-archetypes.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  const { NAKAMA_ROSTER } = await import(`data:text/javascript;base64,${Buffer.from(rosterBuild.outputFiles[0].text).toString("base64")}`);
  const permanentNames = NAKAMA_ROSTER.map((character, index) => `crew-nakama-${character.id}-${index}`);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 30_000);
  const click = label => run(`document.querySelector('button[aria-label=${JSON.stringify(label)}]:not(:disabled)').click()`);
  const music = "window.mediaTestPlayers.music";
  const directory = process.env.BUS_VISUAL_OUTPUT;
  const frames = async (count = 2) => {
    const frame = await run("window.busCameraTestState().gl.info.render.frame");
    await wait(`window.busCameraTestState().gl.info.render.frame>=${frame + count}`, "The facial expression reaches the rendered meshes");
  };
  const snapshot = () => run(`window.busExpressionSnapshot()`);
  const screenshot = async name => {
    if (!directory) return;
    await mkdir(directory, { recursive: true });
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(resolve(directory, name), Buffer.from(shot.data, "base64"));
  };
  const sampleFrames = async () => {
    const samples = [];
    for (let sample = 0; sample < 3; sample++) { await frames(); samples.push(await snapshot()); }
    return samples;
  };
  const mood = expected => `window.busExpressionSnapshot().faces.every(face=>face.mood${expected ? `===${JSON.stringify(expected)}` : "!=='laugh'"})`;
  const results = {};

  await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 8 });
  await send("Emulation.setDeviceMetricsOverride", { width: 1240, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [] });
  await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=0&row=0` });
  await wait(`${JSON.stringify(permanentNames)}.every(name=>Boolean(window.busCameraTestState()?.scene.getObjectByName(name)))&&Boolean(${music})`, "All character faces and the controlled music player are ready");
  await click("Explorer en vue libre");
  await wait("window.busCameraTestState().controls.enabled===true", "Free view permits the bounded facial inspection");
  // A software renderer may take several seconds per frame. The media fixture
  // stays at the explicit seek point instead of crossing 8s during screenshot work.
  await run(`${music}.getCurrentTime=function(){return this.currentTime;};
    window.busExpressionSnapshot=()=>{
      const s=window.busCameraTestState(),faces=[];
      for(const name of [...${JSON.stringify(permanentNames)},'bus-crew-kamal','bus-crew-kyta']){
        const actor=s.scene.getObjectByName(name),expression=actor?.getObjectByName('character-expression');
        if(!expression)continue;
        const cavity=expression.getObjectByName('character-mouth-cavity'),teeth=expression.getObjectByName('character-mouth-teeth'),lower=expression.getObjectByName('character-mouth-lower-teeth'),jaw=expression.getObjectByName('character-skull-jaw');
        faces.push({name,activity:actor.userData.activity,mood:expression.userData.facialMood,opening:expression.userData.mouthOpening,width:expression.userData.mouthWidth,
          mouth:cavity.scale.toArray(),cavityGeometry:cavity.geometry.uuid,teethGeometry:teeth.geometry.uuid,teethVertices:teeth.geometry.attributes.position.count,
          lowerTeethGeometry:lower?.geometry.uuid,jawY:jaw?.position.y,teethY:teeth.position.y,lowerTeethY:lower?.position.y});
      }
      let count=0;s.scene.traverse(object=>{if(object.name==='character-expression')count++;});
      return {frame:s.gl.info.render.frame,time:s.clock.elapsedTime,count,faces};
    };`);

  try {
    await frames();
    results.social = await sampleFrames();
    assert.equal(results.social[0].faces.length, NAKAMA_ROSTER.length + 2, "Every permanent character and both guides have expressive faces.");
    assert(results.social.every(sample => sample.count <= NAKAMA_ROSTER.length + 8 + 3), "Only the bounded detailed characters, guides and current avatar mount facial animation.");
    assert(results.social.some(sample => sample.faces.some(face => face.activity === "chat" && face.mood === "speaking") && sample.faces.some(face => face.activity === "chat" && face.mood === "listening")),
      "The mounted scene shows speaking and listening faces during neighbour conversations.");

    await click("Lancer la fête");
    await wait(`${music}.state===1&&${music}.videoId==='RbZMoeHdR3I'`, "The chosen party song starts in the media fixture");
    await run(`${music}.seekTo(0,true)`);
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='false'", "The first eight seconds retain ordinary faces");
    await frames(); await wait(mood(), "The intro does not trigger laughing faces");
    results.intro = await snapshot();
    await run(`${music}.seekTo(9,true)`);
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "Actual player time releases party expressions after eight seconds");
    await wait(mood("laugh"), "All detailed characters and guides join the laughter");
    results.party = await sampleFrames();
    const changing = results.party[0].faces.filter((face, index) => results.party.slice(1).some(sample => Math.abs(sample.faces[index].mouth[1] - face.mouth[1]) > .0001));
    assert(changing.length >= 8, "Several distinct mounted mouths must change shape across the sampled rendered frames.");
    for (const sample of results.party) for (const face of sample.faces) {
      assert(face.mood === "laugh" && face.activity === "party", `${face.name} must use its party facial expression.`);
      assert(face.opening >= 0 && face.opening <= 1 && face.mouth.every(Number.isFinite) && face.mouth[0] > 0 && face.mouth[0] < .23,
        "Every animated mouth keeps finite dimensions inside its face.");
      const baseline = results.party[0].faces.find(first => first.name === face.name);
      assert(face.cavityGeometry === baseline.cavityGeometry && face.teethGeometry === baseline.teethGeometry,
        "Expression changes must reuse their original geometries.");
      if (face.name === "crew-nakama-brook-8") {
        assert(face.teethGeometry === face.lowerTeethGeometry && face.teethVertices > results.party[0].faces[0].teethVertices * 6,
          "Brook shares one merged seven-tooth geometry between the upper and lower rows.");
        assert(Math.abs(face.jawY + .0225 + face.mouth[1] / 2) < .00001,
          "Brook's moving lower jaw stays attached to the lower edge of his mouth.");
        assert(face.teethY > face.lowerTeethY, "Brook's teeth preserve a readable dark mouth gap.");
      }
    }

    await run(`${music}.emitState(0)`);
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='false'", "A fresh song loop restores the quiet intro");
    await frames(); await wait(mood(), "Looped intro releases the party facial mood");
    results.loopIntro = await snapshot();
    await run(`${music}.seekTo(9,true)`);
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "A loop starts laughing again only after eight seconds");
    await run(`${music}.emitState(3)`);
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='false'", "Buffering suspends party expressions");
    await frames(); await wait(mood(), "Buffered audio leaves ordinary facial activity");
    results.buffering = await snapshot();
    await run(`${music}.emitState(1)`);
    await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "Playback after buffering restores the correct expression");

    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await wait("window.busDestinationTestReducedMotion()===true", "Reduced motion reaches the mounted character scene");
    await frames();
    const reducedFirst = await snapshot(); await frames(3); const reducedSecond = await snapshot();
    assert.deepEqual(reducedFirst.faces, reducedSecond.faces, "Reduced motion uses fixed meaningful smiles and jaw positions.");
    results.reducedMotion = reducedSecond;

    if (directory) {
      // Save original visibility, then inspect faces without bus walls obscuring them.
      await run(`(()=>{const s=window.busCameraTestState();s.controls.enabled=false;s.controls.enableDamping=false;
        window.expressionVisibility=[];s.scene.traverse(object=>window.expressionVisibility.push([object,object.visible]));
        document.querySelector('.bus-title-panel').parentElement.style.visibility='hidden';})()`);
      const portraits = async suffix => {
        for (const [id, index] of [["luffy", 0], ["zoro", 1], ["nami", 2], ["brook", 8]]) {
          await run(`(()=>{
            const s=window.busCameraTestState(),actor=s.scene.getObjectByName('crew-nakama-${id}-${index}'),keep=new Set();
            let parent=actor;while(parent){keep.add(parent);parent=parent.parent;}
            s.scene.traverse(object=>{if(object.isLight){let parent=object;while(parent){keep.add(parent);parent=parent.parent;}}});
            for(const [object,visible] of window.expressionVisibility){let parent=object,belongs=false;while(parent){if(parent===actor){belongs=true;break;}parent=parent.parent;}object.visible=visible&&(belongs||keep.has(object));}
            actor.updateMatrixWorld(true);const center=actor.getObjectByName('nakama-face').getWorldPosition(s.camera.position.clone());
            s.camera.position.set(center.x+.23,center.y+.10,center.z-1.0);s.controls.target.copy(center);s.controls.target.y+=.05;
            s.controls.update();s.camera.updateMatrixWorld();
          })()`);
          await frames(); await screenshot(`expression-${id}-${suffix}.png`);
        }
      };
      await portraits("fete");
      await click("Arrêter la fête");
      await wait("document.querySelector('.bus-app').dataset.party==='false'", "The party stops for the quiet comparison portraits");
      await frames(); await wait(mood(), "Quiet portraits restore each resting expression");
      await portraits("repos");
      await run(`(()=>{for(const [object,visible] of window.expressionVisibility)object.visible=visible;
        document.querySelector('.bus-title-panel').parentElement.style.visibility='';
        const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');
        const point=s.camera.position.clone().set(5.5,3.6,-5.8),target=s.controls.target.clone().set(0,1.7,.3);
        bus.localToWorld(point);bus.localToWorld(target);s.camera.position.copy(point);s.controls.target.copy(target);s.controls.update();s.camera.updateMatrixWorld();})()`);
      await click("Lancer la fête"); await wait(`${music}.state===1`, "The group portrait starts its party song");
      await run(`${music}.seekTo(9,true)`); await wait("document.querySelector('.bus-app').dataset.partyDancing==='true'", "The group photo keeps the same eight-second gate");
      await frames(); await screenshot("expressions-fete-bus.png");
      await writeFile(resolve(directory, "verification-expressions.json"), JSON.stringify(results, null, 2));
    }
    assert.deepEqual(await run("window.busExtensionBlockedMutations??[]"), [], "Expression checks never attempt a database mutation.");
    console.log("Mounted expressions checked: social turns, all detailed faces and guides, reused seven-tooth Brook rows, moving jaw, 8s intro/loop, buffering and reduced motion.");
    return results;
  } finally {
    await run(`(()=>{document.querySelector('button[aria-label="Arrêter la fête"]:not(:disabled)')?.click();
      for(const [object,visible] of window.expressionVisibility??[])object.visible=visible;
      const title=document.querySelector('.bus-title-panel');if(title)title.parentElement.style.visibility='';
      delete window.expressionVisibility;delete window.busExpressionSnapshot;})()`);
    await send("Emulation.setEmulatedMedia", { features: [] });
  }
}
