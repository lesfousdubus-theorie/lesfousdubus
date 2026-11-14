// A bounded desktop/mobile art inspection of the exact shipped scenery meshes.
// This isolated geometry fixture deliberately makes no claim about in-app HUD,
// cabin occlusion, weather, or the missing original reference images.
import { build } from "esbuild";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createCdp, evaluate, waitForJson } from "./browser-helpers.mjs";

const output = resolve(process.env.SCENERY_SCREENSHOTS ?? `/tmp/lesfousdubus-scenery-${process.pid}`);
await mkdir(output, { recursive: true });
const script = await build({
  stdin: {
    resolveDir: process.cwd(), loader: "js", sourcefile: "scenery-fixture.js",
    contents: `
import * as THREE from 'three';
import { createOnePieceScenery, createOnePieceForeground, SET_PIECE_OFFSET_X } from './src/lib/one-piece-scenery.ts';
const names = ['Alabasta · Alubarna', 'Water Seven · la grande fontaine', 'Skypiea · Shandora', 'Pays des Wa · capitale des fleurs', 'Drum · château dans les neiges'];
const ground = ['#e5bd6a', '#9ec5d4', '#f5f3ec', '#5da854', '#ebf2fa'];
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b8dbe9');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#e4f7ff', '#b7ac94', 2.4));
const light = new THREE.DirectionalLight('#fff0d3', 3.4);
light.position.set(-35, 80, 25);
light.castShadow = true;
light.shadow.mapSize.set(1024, 1024);
Object.assign(light.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 200 });
light.shadow.bias = -0.001;
scene.add(light);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
let island = null;
window.captureScenery = async (zone, width, height, lowPower) => {
  if (island) {
    scene.remove(island);
    island.traverse(object => { if (object.geometry) object.geometry.dispose(); });
  }
  island = new THREE.Group();
  scene.add(island);
  for (const batch of createOnePieceScenery(zone, lowPower)) {
    const mesh = new THREE.Mesh(batch.geometry, batch.material);
    mesh.position.x = SET_PIECE_OFFSET_X;
    mesh.castShadow = mesh.receiveShadow = true;
    island.add(mesh);
  }
  for (const side of [-1, 1]) for (const batch of createOnePieceForeground(zone, side, lowPower)) {
    const mesh = new THREE.Mesh(batch.geometry, batch.material);
    mesh.receiveShadow = true;
    island.add(mesh);
  }
  const terrain = new THREE.Mesh(new THREE.BoxGeometry(98, 0.5, 142), new THREE.MeshStandardMaterial({ color: ground[zone], roughness: 1 }));
  terrain.position.set(0, -0.3, 0);
  terrain.receiveShadow = true;
  island.add(terrain);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshStandardMaterial({ color: '#3b87ad', roughness: 0.5 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.6;
  island.add(sea);
  const road = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.07, 160), new THREE.MeshStandardMaterial({ color: '#39434c' }));
  road.position.y = 0.02;
  island.add(road);
  for (const x of [-3.5, 3.5]) {
    const marking = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 160), new THREE.MeshBasicMaterial({ color: '#ffcd55' }));
    marking.position.set(x, 0.07, 0);
    island.add(marking);
  }
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const target = new THREE.Vector3(29, 15, 0);
  // Same viewing direction at both sizes; portrait retreats to preserve the skyline.
  const distance = lowPower ? 112 : 84;
  camera.position.copy(target).add(new THREE.Vector3(-0.68, 0.26, 0.69).normalize().multiplyScalar(distance));
  camera.lookAt(target);
  document.querySelector('#title').textContent = names[zone];
  document.querySelector('#subtitle').textContent = lowPower ? 'Géométrie mobile · détails allégés' : 'Géométrie du décor · vue isolée';
  renderer.render(scene, camera);
  await new Promise(resolve => requestAnimationFrame(resolve));
  renderer.render(scene, camera);
  return { zone, lowPower, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, width, height };
};
window.sceneryReady = true;
`,
  }, bundle: true, format: "iife", platform: "browser", write: false, logLevel: "silent",
});
const javascript = script.outputFiles[0].text;
const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden;font-family:system-ui;color:#1e4350}canvas{display:block}#caption{position:fixed;left:24px;top:20px;z-index:2}h1{margin:0;font-size:22px;font-weight:650}p{font-size:12px;margin:6px 0 0;opacity:.8}@media(max-width:500px){#caption{left:16px;top:20px}h1{font-size:17px}p{font-size:11px}}</style></head><body><div id="caption"><h1 id="title"></h1><p id="subtitle"></p></div><script src="/scene.js"></script></body></html>';
const server = createServer((request, response) => {
  response.setHeader("Content-Type", request.url === "/scene.js" ? "text/javascript" : "text/html");
  response.end(request.url === "/scene.js" ? javascript : html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const debugPort = Number(process.env.SCENERY_CDP_PORT ?? 9357);
const profile = `/tmp/lesfousdubus-scenery-chrome-${process.pid}`;
const chrome = spawn(process.env.CHROME_PATH ?? "/usr/bin/google-chrome", ["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "--no-sandbox", "--disable-dev-shm-usage", "--disable-background-networking", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
let ws;
try {
  const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const page = targets.find(target => target.type === "page");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  const send = createCdp(ws);
  await send("Page.enable");
  await send("Page.navigate", { url: `http://127.0.0.1:${port}` });
  let ready = false;
  for (let attempt = 0; attempt < 100 && !ready; attempt++) {
    ready = await evaluate(send, "Boolean(window.sceneryReady)");
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Scenery fixture did not initialise WebGL.");
  const checks = [];
  for (const viewport of [{ width: 1200, height: 800, mobile: false }, { width: 390, height: 844, mobile: true }]) {
    await send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1 });
    for (let zone = 0; zone < 5; zone++) {
      const stats = await evaluate(send, `window.captureScenery(${zone}, ${viewport.width}, ${viewport.height}, ${viewport.mobile})`);
      const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const filename = `${zone}-${viewport.mobile ? "mobile" : "desktop"}.png`;
      await writeFile(resolve(output, filename), Buffer.from(screenshot.data, "base64"));
      checks.push({ ...stats, file: filename });
    }
  }
  await writeFile(resolve(output, "geometry-stats.json"), JSON.stringify(checks, null, 2));
  console.table(checks);
  console.log(`One batched desktop/mobile scenery inspection saved to ${output}`);
} finally {
  ws?.close();
  chrome.kill("SIGTERM");
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
