import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  stdin: { contents: `export * as THREE from 'three';
    export { getFittedCostumeGeometry, FITTED_COSTUME_CLEARANCE } from './src/lib/passenger-costume-geometry';
    export { getPassengerProportions, getPassengerSkeleton } from './src/lib/passenger-proportions';
    export { TORSO_ABOVE_HIP, NECK_ABOVE_HIP } from './src/lib/passenger-gait';
    export { NAKAMA_ROSTER } from './src/components/bus/passenger-archetypes';
    export { PassengerTorso, PassengerNeck } from './src/components/bus/PassengerAnatomy';
    export { default as PassengerHead } from './src/components/bus/PassengerHead';
    export { GuestHair, GuestHeadAccessory } from './src/components/bus/GuestCharacterParts';
    export { NakamaProp } from './src/components/bus/PassengerAppearance';
    export { getCharacterShape } from './src/components/bus/CharacterShapes';
    export { PassengerUpperArm, PassengerForearm, NamiHair, ZoroEarrings } from './src/components/bus/PassengerIdentity';
    export { default as PassengerSignatureProp } from './src/components/bus/PassengerSignatureProp';`,
    resolveDir: process.cwd(), sourcefile: "passenger-design-test.ts" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { THREE, getFittedCostumeGeometry, FITTED_COSTUME_CLEARANCE, getPassengerProportions,
  getPassengerSkeleton, NAKAMA_ROSTER, PassengerTorso, PassengerNeck,
  PassengerHead, getCharacterShape, PassengerUpperArm, PassengerForearm, NamiHair, ZoroEarrings, PassengerSignatureProp, NakamaProp } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`,
);

const material = new THREE.MeshStandardMaterial();
const mats = Object.fromEntries(["skin", "shirt", "pants", "dark", "gold", "steel", "teeth", "accessory", "accessorySub", "turquoise", "hair", "eyes", "faceDark", "red", "shoes"].map(name => [name, material]));
// Canvas drawing is irrelevant to the closed-volume checks; textures are tested
// on the real mounted page. This stub lets the actual JSX create its materials.
globalThis.document = { createElement: () => {
  const strokes = []; let path = [];
  const state = { strokes,
    beginPath() { path = []; }, moveTo(x,y) { path.push([x,y]); }, lineTo(x,y) { path.push([x,y]); },
    stroke() { strokes.push({ color:state.strokeStyle, points:path.slice() }); },
  };
  const context=new Proxy(state,{get:(target,key)=>key in target?target[key]:()=>{}});
  return { width:256,height:256,getContext:()=>context };
} };
const children = value => Array.isArray(value) ? value.flatMap(children) : value == null || value === false ? [] : [value];
// Render the actual static React parts into Three objects, rather than duplicating
// their measurements in a second test implementation.
function mount(element) {
  if (!element) return new THREE.Group();
  if (element.type?.name === "AnimatedCharacterMouth") return new THREE.Group();
  if (typeof element.type === "function") return mount(element.type(element.props));
  if (typeof element.type === "symbol") {
    const fragment = new THREE.Group();
    for (const child of children(element.props.children)) fragment.add(mount(child));
    return fragment;
  }
  const props = element.props;
  const object = element.type === "mesh" ? new THREE.Mesh(props.geometry, props.material ?? material) : new THREE.Group();
  object.name = props.name ?? "";
  if (props.position) object.position.fromArray(props.position);
  if (props.rotation) object.rotation.fromArray(props.rotation);
  if (props.scale) object.scale.fromArray(props.scale);
  for (const child of children(props.children)) {
    if (child.type === "sphereGeometry") object.geometry = new THREE.SphereGeometry(...child.props.args);
    else if (child.type === "cylinderGeometry") object.geometry = new THREE.CylinderGeometry(...child.props.args);
    else if (child.type === "coneGeometry") object.geometry = new THREE.ConeGeometry(...child.props.args);
    else if (child.type === "torusGeometry") object.geometry = new THREE.TorusGeometry(...child.props.args);
    else if (child.type === "planeGeometry") object.geometry = new THREE.PlaneGeometry(...child.props.args);
    else object.add(mount(child));
  }
  return object;
}
const bounds = object => new THREE.Box3().setFromObject(object);
function meshList(root) { const result = []; root.traverse(object => { if (object.isMesh) result.push(object); }); return result; }
function assertConnected(root, label) {
  root.updateMatrixWorld(true);
  const parts = meshList(root), reached = new Set([parts[0]]);
  for (let pass = 0; pass < parts.length; pass++) for (const part of parts) {
    if (reached.has(part)) continue;
    if ([...reached].some(connected => bounds(part).intersectsBox(bounds(connected).expandByScalar(.0005)))) reached.add(part);
  }
  assert.equal(reached.size, parts.length, `${label}: every visible segment must connect to the complete accessory.`);
}

const costumeResults = [];
assert.equal(NAKAMA_ROSTER.length, 20);
assert.deepEqual(NAKAMA_ROSTER.map(character => character.id).slice(0, 16), ["luffy","zoro","nami","usopp","sanji","chopper","robin","franky","brook","jinbe","law","ace","sabo","yamato","shanks","buggy"], "All existing character indices are preserved.");
assert.equal(new Set(NAKAMA_ROSTER.map(character => character.id)).size, 20, "Law must remain one unique existing model.");
for (const { id } of NAKAMA_ROSTER) for (const face of [false, true]) {
  const proportions = getPassengerProportions(id);
  const width = face ? proportions.headWidth : proportions.torsoWidth;
  const height = face ? proportions.headHeight : proportions.torsoHeight;
  const depth = face ? proportions.headDepth : proportions.torsoDepth;
  const radius = face ? proportions.headRadius : proportions.torsoRadius;
  const cloth = getFittedCostumeGeometry(width, height, depth, radius);
  assert.equal(cloth, getFittedCostumeGeometry(width, height, depth, radius), "Each face and torso reuses its fitted decorative geometry.");
  const skin = getCharacterShape([width, height, depth], radius, 2);
  const skinPositions = skin.attributes.position, triangles = [];
  for (let vertex = 0; vertex < skinPositions.count; vertex += 3) triangles.push(new THREE.Triangle(
    new THREE.Vector3().fromBufferAttribute(skinPositions, vertex),
    new THREE.Vector3().fromBufferAttribute(skinPositions, vertex + 1),
    new THREE.Vector3().fromBufferAttribute(skinPositions, vertex + 2),
  ));
  const clothPositions = cloth.attributes.position, closest = new THREE.Vector3();
  let minimum = Infinity, maximum = 0;
  const inspect = point => {
    let distance = Infinity;
    for (const triangle of triangles) distance = Math.min(distance, triangle.closestPointToPoint(point, closest).distanceTo(point));
    minimum = Math.min(minimum, distance); maximum = Math.max(maximum, distance);
    assert(distance > .001 && distance <= FITTED_COSTUME_CLEARANCE + .00001,
      `${id}: fabric must stay 1–1.51 mm from actual skin triangles, including rounded edges, without floating or intersecting.`);
  };
  for (let vertex = 0; vertex < clothPositions.count; vertex += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(clothPositions, vertex);
    const b = new THREE.Vector3().fromBufferAttribute(clothPositions, vertex + 1);
    const c = new THREE.Vector3().fromBufferAttribute(clothPositions, vertex + 2);
    inspect(a); inspect(b); inspect(c); inspect(a.clone().add(b).add(c).divideScalar(3));
  }
  assert(clothPositions.count / 3 <= 200, "A fitted costume must keep a small fixed triangle budget.");
  costumeResults.push({ id, surface: face ? "face" : "torso", minimum, maximum, triangles: clothPositions.count / 3 });
}

let attachedWeapons = 0;
for (const [id, side] of [["nami", 1], ["zoro", -1], ["zoro", 1], ["usopp", -1], ["law",1], ["shanks",1], ["mihawk",1], ["sabo",1], ["yamato",1], ["vivi",-1], ["vivi",1]]) {
  const width = getPassengerProportions(id).armWidth;
  const forearm = mount({ type: PassengerForearm, props: { archetype: { id }, mats, side, width, handName: "actual-square-hand" } });
  const attachment = new THREE.Group(); attachment.position.y = -.22;
  const weapon = mount({ type: PassengerSignatureProp, props: { id, side, mats } });
  attachment.add(weapon); forearm.add(attachment); forearm.updateMatrixWorld(true);
  assertConnected(weapon, id);
  const hand = forearm.getObjectByName("actual-square-hand");
  const type = { nami: "staff", usopp: "slingshot", sabo: "pipe", yamato: "mace", vivi: "slasher" }[id] ?? "sword";
  const grip = weapon.getObjectByName(`nakama-${id}-${type}-grip`);
  assert(hand && grip && bounds(hand).intersectsBox(bounds(grip)), `${id}: the actual grip must intersect the square palm.`);
  attachedWeapons++;
  if (id === "nami") {
    const shaft = weapon.getObjectByName("nakama-nami-staff-shaft");
    const arm = meshList(forearm).find(mesh => mesh !== hand && !mesh.name && mesh.geometry.parameters.height === .22);
    assert(bounds(shaft).max.z < bounds(arm).min.z, "The complete Clima-Tact stays in front of the forearm instead of hiding inside it.");
    assert(bounds(shaft).min.x < bounds(hand).min.x - .2 && bounds(shaft).max.x > bounds(hand).max.x + .2,
      "Both visible staff halves extend beyond the hand.");
    assert.equal(weapon.getObjectsByProperty("name", "nakama-nami-staff-tip").length, 2, "The deployed staff retains both connected end caps.");
  }
}
for(const [id,side] of [["brook",-1],["brook",1],["doflamingo",-1],["doflamingo",1]]){
  const forearm=mount({type:PassengerForearm,props:{archetype:{id},mats,side,width:getPassengerProportions(id).armWidth,handName:"actual-square-hand"}});
  const attachment=new THREE.Group();attachment.position.y=-.22;
  const prop=mount({type:PassengerSignatureProp,props:{id,side,mats}});attachment.add(prop);forearm.add(attachment);forearm.updateMatrixWorld(true);
  if(id==="brook")assertConnected(prop,"Brook's instrument");
  const hand=bounds(forearm.getObjectByName("actual-square-hand"));
  assert(meshList(prop).some(part=>bounds(part).intersectsBox(hand)),`${id}: the signature accessory must remain held by its actual hand.`);
  attachedWeapons++;
}

const anatomy = [];
for (const archetype of NAKAMA_ROSTER) {
  const rig = getPassengerSkeleton(archetype.id);
  const body = mount({ type: PassengerTorso, props: { archetype, mats } }); body.position.y = rig.torsoAboveHip;
  const neck = mount({ type: PassengerNeck, props: { archetype, mats } }); neck.position.y = rig.neckAboveHip;
  const head = mount({ type: PassengerHead, props: { archetype, mats } }); head.position.y = rig.neckAboveHip + rig.headAboveNeck;
  body.updateMatrixWorld(true); neck.updateMatrixWorld(true); head.updateMatrixWorld(true);
  const face = head.getObjectByName("nakama-face"), torso = body.getObjectByName("nakama-torso-body");
  assert(bounds(neck).intersectsBox(bounds(face)) && bounds(neck).intersectsBox(bounds(torso)), `${archetype.id}: neck must attach to the real closed torso and face.`);
  for (const eye of head.getObjectsByProperty("name", "nakama-eye-base")) {
    assert(bounds(eye).intersectsBox(bounds(face)), `${archetype.id}: the simple eye volume must be inset into the face instead of floating in front.`);
  }
  if (archetype.id === "doflamingo") assert(bounds(body.getObjectByName("nakama-doflamingo-pink-coat")).getSize(new THREE.Vector3()).x <= .43, "Doflamingo's whole pink coat fits within the seat spacing.");
  if (archetype.id === "mihawk") assert(bounds(head.getObjectByName("nakama-mihawk-hat")).max.y < .97, "Mihawk's hat and feather remain below the seated name label and roof.");
  anatomy.push(archetype.id);
}
for (const [id, count] of [["zoro",3],["law",1],["shanks",1]]) {
  const swords=mount({type:NakamaProp,props:{id,prop:"swords",mats}});swords.updateMatrixWorld(true);
  assert.equal(swords.getObjectsByProperty("name",`nakama-${id}-sheathed-sword`).length,count,`${id} has its own correct number of sheathed swords.`);
  assert(bounds(swords).min.y>.63 && bounds(swords).max.y<1.4,"Shortened resting weapons stay above the floor and below the chest.");
}

for (const archetype of NAKAMA_ROSTER) for (const side of [-1,1]) {
  const props={archetype,mats,side,width:getPassengerProportions(archetype.id).armWidth,handName:"actual-square-hand"};
  const upper=mount({type:PassengerUpperArm,props}),forearm=mount({type:PassengerForearm,props});
  const missing=archetype.id==="shanks"&&side<0;
  assert.equal(meshList(upper).length===0,missing,`${archetype.id}: only Shanks's left upper arm is absent.`);
  assert.equal(Boolean(forearm.getObjectByName("actual-square-hand")),!missing,`${archetype.id}: keep all original hands except Shanks's missing left hand.`);
  if(missing){
    assert.equal(meshList(forearm).length,0,"Shanks has no left forearm or hand at rest or during animated gestures.");
    assert.equal(meshList(mount({type:PassengerSignatureProp,props:{id:archetype.id,side,mats}})).length,0,"No weapon can float on Shanks's missing arm.");
  }
}
const shanks=NAKAMA_ROSTER.find(character=>character.id==="shanks");
const shanksBody=mount({type:PassengerTorso,props:{archetype:shanks,mats}});shanksBody.updateMatrixWorld(true);
const emptySleeve=bounds(shanksBody.getObjectByName("nakama-shanks-empty-left-sleeve"));
assert(emptySleeve.intersectsBox(bounds(shanksBody.getObjectByName("nakama-torso-body")))&&emptySleeve.min.y>0,
  "Shanks's short empty sleeve remains joined to the torso above the missing elbow.");
// Check anatomical orientation with the actual front-facing geometry and the
// portrait camera, rather than relying on the animation joints' left/right names.
const shanksHead=mount({type:PassengerHead,props:{archetype:shanks,mats}});shanksHead.updateMatrixWorld(true);
assert(bounds(shanksHead.getObjectsByProperty("name","nakama-eye-base")[0]).getCenter(new THREE.Vector3()).z<0,
  "The character's face points toward negative Z.");
const portraitCamera=new THREE.PerspectiveCamera(50,1240/900,.1,100);
portraitCamera.position.set(.45,1.72,-1.85);portraitCamera.lookAt(0,1.45,0);portraitCamera.updateMatrixWorld(true);
const shanksRight=mount({type:PassengerForearm,props:{archetype:shanks,mats,side:1,width:getPassengerProportions("shanks").armWidth,handName:"actual-square-hand"}});
shanksRight.position.set(getPassengerProportions("shanks").torsoWidth/2-.018,1.55,0);shanksRight.updateMatrixWorld(true);
const rightHand=bounds(shanksRight.getObjectByName("actual-square-hand")).getCenter(new THREE.Vector3());
const middle=new THREE.Vector3(0,rightHand.y,rightHand.z),leftSide=new THREE.Vector3(-rightHand.x,rightHand.y,rightHand.z);
assert(rightHand.clone().project(portraitCamera).x<middle.clone().project(portraitCamera).x
  &&leftSide.project(portraitCamera).x>middle.project(portraitCamera).x,
  "The remaining positive-X hand is anatomically right (viewer-left); the absent negative-X arm is anatomically left (viewer-right).");

const hair = mount({ type: NamiHair, props: { material } }); assertConnected(hair, "Nami's hair");
const face = new THREE.Mesh(getCharacterShape([.24,.27,.23], .045, 2), material);
assert(meshList(hair).every(lock => bounds(lock).intersectsBox(bounds(face))), "Nami's locks must remain attached to her head.");
const earrings = mount({ type: ZoroEarrings, props: { material } }); earrings.updateMatrixWorld(true);
const ear = new THREE.Mesh(getCharacterShape([.043,.063,.053]), material); ear.position.set(-.123,-.007,.015); ear.updateMatrixWorld(true);
for (const stud of earrings.getObjectsByProperty("name", "nakama-zoro-earring-stud")) {
  assert(bounds(stud).intersectsBox(bounds(ear)) && stud.getWorldPosition(new THREE.Vector3()).x < 0,
    "Zoro's three simple pendants attach to the anatomical left ear.");
}
const zoro=NAKAMA_ROSTER.find(character=>character.id==="zoro");
const zoroHead=mount({type:PassengerHead,props:{archetype:zoro,mats}});zoroHead.updateMatrixWorld(true);
const closedEye=bounds(zoroHead.getObjectByName("nakama-zoro-closed-eye")).getCenter(new THREE.Vector3());
assert(closedEye.x<0,"Zoro's closed eye is anatomically left, on the viewer's right.");
assert(zoroHead.getObjectsByProperty("name","nakama-eye-base").every(open=>bounds(open).getCenter(new THREE.Vector3()).x>0),
  "Zoro's only open eye is anatomically right.");
for(const [id,color] of [["luffy","#a85440"],["zoro","#bd7f68"],["shanks","#a5453b"]]){
  const archetype=NAKAMA_ROSTER.find(character=>character.id===id);
  const head=mount({type:PassengerHead,props:{archetype,mats}});
  const canvas=head.getObjectByName("nakama-face-details").material.map.image;
  const points=canvas.getContext("2d").strokes.filter(stroke=>stroke.color===color).flatMap(stroke=>stroke.points);
  assert(points.length>0&&points.every(([u])=>u>canvas.width/2),`${id}: the actual drawn scar lies on the anatomical left side through the fitted UVs.`);
  if(id==="zoro"){
    const scarX=(.5-points[0][0]/canvas.width)*getPassengerProportions(id).headWidth;
    assert(Math.abs(scarX-closedEye.x)<.003,"Zoro's fitted scar passes through his actual closed eye.");
  }
}
for(const side of [-1,1]){
  const upper=mount({type:PassengerUpperArm,props:{archetype:NAKAMA_ROSTER.find(character=>character.id==="nami"),mats,side,width:getPassengerProportions("nami").armWidth}});
  const tattoo=upper.getObjectByName("nakama-nami-tattoo");
  assert.equal(Boolean(tattoo),side<0,"Nami's tattoo is present only on her anatomical left upper arm.");
  if(tattoo)assert(tattoo.position.x<0&&new THREE.Vector3(0,0,1).applyEuler(tattoo.rotation).x<-.99,
    "Nami's left-arm tattoo faces outward and remains readable.");
}
const luffy=NAKAMA_ROSTER.find(character=>character.id==="luffy");
const luffyHead=mount({type:PassengerHead,props:{archetype:luffy,mats}});luffyHead.updateMatrixWorld(true);
const hat=bounds(luffyHead.getObjectByName("nakama-hat-base"));
assert(hat.getSize(new THREE.Vector3()).x>=getPassengerProportions("luffy").headWidth*2.3,
  "Luffy's wide straw brim is visibly broader than his head.");
assert(hat.max.y<.32&&hat.min.y<.16,"Luffy's crown sits on his head and remains below the name label and bus roof.");
assert(luffyHead.getObjectByName("nakama-luffy-hat-ribbon")&&luffyHead.getObjectByName("nakama-luffy-hat-cord"),
  "Luffy's simple straw hat includes the red ribbon and connected neck cord.");
const repeatLuffy=mount({type:PassengerHead,props:{archetype:luffy,mats}});
assert.equal(luffyHead.getObjectByName("nakama-hat-base").geometry,repeatLuffy.getObjectByName("nakama-hat-base").geometry,
  "All copies of Luffy share the complete hat geometry.");
const sanji=NAKAMA_ROSTER.find(character=>character.id==="sanji");
const sanjiHead=mount({type:PassengerHead,props:{archetype:sanji,mats}});sanjiHead.updateMatrixWorld(true);
const sanjiHair=sanjiHead.getObjectByName("nakama-hair"),sanjiFace=sanjiHead.getObjectByName("nakama-face");
assertConnected(sanjiHair,"Sanji's closed swept hairstyle");
assert(meshList(sanjiHair).every(part=>bounds(part).intersectsBox(bounds(sanjiFace))),"Every Sanji hair volume contacts the actual head.");
assert.equal(sanjiHead.getObjectsByProperty("name","nakama-eye-base").length,1,"Sanji has one uncovered eye and no white eye peeking through the swept lock.");
const eye=bounds(sanjiHead.getObjectByName("nakama-eye-base")).getCenter(new THREE.Vector3());
assert(eye.x<0,"Post-timeskip Sanji has his anatomical left eye visible and right eye covered.");
const sanjiCanvas=sanjiHead.getObjectByName("nakama-face-details").material.map.image;
const spiral=sanjiCanvas.getContext("2d").strokes.find(stroke=>stroke.color==="#59462f"&&stroke.points.length>20);
const visibleEyeU=(.5-eye.x/getPassengerProportions("sanji").headWidth)*sanjiCanvas.width;
assert(spiral&&spiral.points.every(([u])=>u<visibleEyeU),
  "Post-timeskip Sanji's eyebrow spiral curls at the inner end, toward the nose rather than the temple.");
const frontRay=new THREE.Raycaster(),forward=new THREE.Vector3(0,0,1);
const faceFront=-getPassengerProportions("sanji").headDepth/2;
const hairInFront=(x,y)=>{frontRay.set(new THREE.Vector3(x,y,-1),forward);return frontRay.intersectObjects(meshList(sanjiHair),false).filter(hit=>hit.point.z<faceFront);};
assert.equal(hairInFront(eye.x,eye.y).length,0,"The visible eye remains unobstructed by the hair.");
assert(hairInFront(-eye.x,eye.y).some(hit=>hit.object.name==="nakama-sanji-fringe"),"The tapered lock still covers Sanji's other eye.");
assert.equal(hairInFront(0,-.006).length,0,"The swept fringe leaves Sanji's nose exposed.");
for(const x of [-.04,0,.04])for(const y of [-.038,-.066,-.097])assert.equal(hairInFront(x,y).length,0,
  "The swept fringe stays clear of the full animated-mouth region.");
const repeatedSanji=mount({type:PassengerHead,props:{archetype:sanji,mats}});
assert.equal(sanjiHead.getObjectByName("nakama-sanji-fringe").geometry,repeatedSanji.getObjectByName("nakama-sanji-fringe").geometry,
  "Sanji's closed fringe reuses one geometry for both the passenger and boarding avatar.");
console.log("Passenger design passed:", JSON.stringify({ costumes: costumeResults, attachedWeapons, anatomy, hairAndLeftEarrings: true }));
