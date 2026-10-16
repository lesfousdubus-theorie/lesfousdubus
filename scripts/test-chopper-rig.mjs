import assert from "node:assert/strict";
import { build } from "esbuild";

// Mount the real JSX and execute its frame callbacks; no duplicate mannequin.
const frames=[],layoutEffects=[];globalThis.__chopperRigFrames=frames;globalThis.__chopperRigLayoutEffects=layoutEffects;
const compiled=await build({
  stdin:{contents:`export * as THREE from 'three';
    export { Passenger, SimplifiedPassengers } from './src/components/bus/Passengers';
    export { default as BoardingAvatar } from './src/components/bus/BoardingAvatar';
    export { NAKAMA_ROSTER } from './src/components/bus/passenger-archetypes';
    export { getPassengerProportions, getPassengerSkeleton } from './src/lib/passenger-proportions';
    export { getWalkingLegPose } from './src/lib/passenger-gait';
    export { createJourneyState } from './src/lib/bus-journey';`,resolveDir:process.cwd(),sourcefile:"chopper-rig-test.ts"},
  bundle:true,format:"esm",platform:"node",write:false,jsx:"automatic",logLevel:"silent",
  plugins:[{name:"real-rig-hooks",setup(builder){
    builder.onResolve({filter:/^(react|react\/jsx-runtime|@react-three\/fiber)$/},args=>({path:args.path,namespace:"real-rig-hooks"}));
    builder.onLoad({filter:/.*/,namespace:"real-rig-hooks"},({path})=>({contents:path==="react"
      ?`export const useRef=current=>({current});export const useMemo=fn=>fn();export const useCallback=fn=>fn;
        export const useEffect=()=>{};export const useLayoutEffect=fn=>globalThis.__chopperRigLayoutEffects.push(fn);export const memo=c=>c;`
      :path==="react/jsx-runtime"?`export const Fragment=Symbol.for('chopper-rig-fragment');export const jsx=(type,props)=>({type,props});export const jsxs=jsx;`
      :`export const useFrame=callback=>globalThis.__chopperRigFrames.push(callback);`}));
  }}],
});
const {THREE,Passenger,SimplifiedPassengers,BoardingAvatar,NAKAMA_ROSTER,getPassengerSkeleton,getPassengerProportions,getWalkingLegPose,createJourneyState}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
const material=new THREE.MeshStandardMaterial();
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const children=value=>Array.isArray(value)?value.flatMap(children):value==null||value===false?[]:[value];
function mount(element){
  if(!element)return new THREE.Group();
  if(typeof element.type==="function")return mount(element.type(element.props));
  if(typeof element.type==="symbol"){const group=new THREE.Group();for(const child of children(element.props.children))group.add(mount(child));return group;}
  const props=element.props,object=element.type==="instancedMesh"?new THREE.InstancedMesh(props.geometry??new THREE.BufferGeometry(),props.material??material,props.args[2]):element.type==="mesh"?new THREE.Mesh(props.geometry,props.material??material):new THREE.Group();
  object.name=props.name??"";
  if(props.count!==undefined)object.count=props.count;
  if(props.position)object.position.fromArray(props.position);if(props.rotation)object.rotation.fromArray(props.rotation);if(props.scale)object.scale.fromArray(props.scale);
  if(props.visible!==undefined)object.visible=props.visible;
  for(const child of children(props.children)){
    const geometries={sphereGeometry:THREE.SphereGeometry,cylinderGeometry:THREE.CylinderGeometry,coneGeometry:THREE.ConeGeometry,torusGeometry:THREE.TorusGeometry,planeGeometry:THREE.PlaneGeometry,boxGeometry:THREE.BoxGeometry};
    if(geometries[child.type])object.geometry=new geometries[child.type](...child.props.args);else object.add(mount(child));
  }
  if(typeof props.ref==="function")props.ref(object);else if(props.ref)props.ref.current=object;
  return object;
}
const box=object=>new THREE.Box3().setFromObject(object),point=new THREE.Vector3();
const chopperIndex=NAKAMA_ROSTER.findIndex(a=>a.id==="chopper"),chopper=NAKAMA_ROSTER[chopperIndex],rig=getPassengerSkeleton("chopper");
const camera=new THREE.PerspectiveCamera();camera.position.set(8,8,8);
const coreNames=["nakama-torso-body","nakama-pelvis","nakama-neck","nakama-face"];
function assertAttachments(root,label){
  const volumes=Object.fromEntries(coreNames.map(name=>[name,box(root.getObjectByName(name))]));
  assert(volumes["nakama-pelvis"].intersectsBox(volumes["nakama-torso-body"]),`${label}: compact pelvis stays attached to the torso.`);
  assert(volumes["nakama-neck"].intersectsBox(volumes["nakama-torso-body"]),`${label}: short neck joins the torso.`);
  assert(volumes["nakama-neck"].intersectsBox(volumes["nakama-face"]),`${label}: large closed head remains attached to the neck.`);
  for(const name of coreNames)assert(Object.values(volumes[name].min).every(Number.isFinite)&&Object.values(volumes[name].max).every(Number.isFinite),`${label}: no non-finite geometry.`);
}
const seated=mount({type:Passenger,props:{seat:{x:0,z:0,row:0,seatInRow:0},index:0,archetype:chopper,hornPulse:0,reducedMotion:true}});
seated.updateMatrixWorld(true);assertAttachments(seated,"Seated Chopper");
const pelvis=box(seated.getObjectByName("nakama-pelvis")),torso=box(seated.getObjectByName("nakama-torso-body")),face=box(seated.getObjectByName("nakama-face"));
const eyeCenterY=box(seated.getObjectByName("nakama-eye-base")).getCenter(new THREE.Vector3()).y;
assert(Math.abs(pelvis.min.y-1.12)<1e-6,"The small pelvis rests on the same cushion contact plane as the adults.");
assert(Math.abs(torso.getSize(point).y-.24)<1e-6&&face.getSize(point).y>.245,"Chopper has a short body and retains the recognisable large head.");
assert(Math.abs(eyeCenterY-1.57)<1e-6,"The compact seated eye line matches the 1.57 m first-person camera height.");
assert(box(seated.getObjectByName("nakama-shoes")).min.y>.93,"Seated hooves remain naturally suspended more than 30 cm above the cabin floor.");
assert(box(seated.getObjectByName("nakama-seated-legs")).min.z<-.14,"The short knees and hooves reach past the actual cushion's front edge.");
for(const calf of seated.getObjectsByProperty("name","nakama-chopper-calf"))assert(box(calf).max.z<-.06,"The complete lower leg is outside the cushion instead of penetrating its front.");
const costume=box(seated.getObjectByName("nakama-chopper-top"));
assert(Math.abs(costume.getSize(point).y-torso.getSize(point).y)<.004,"The costume surface follows the short torso rather than the old adult height.");

const standingHeights={};
for(const id of ["luffy","chopper"]){
  const index=NAKAMA_ROSTER.findIndex(a=>a.id===id),state=createJourneyState();
  state.avatarVisible=true;state.phase="entering";state.position.set(0,0,0);state.sitting=0;state.walking=false;
  const at=frames.length,avatar=mount({type:BoardingAvatar,props:{journey:{current:state},passengerIndex:index,physicalSeatIndex:0,partyOn:false,hornPulse:0,reducedMotion:true}});
  frames[at]({camera,clock:{elapsedTime:0}},1/60);avatar.updateMatrixWorld(true);
  assertAttachments(avatar,`${id} standing`);
  standingHeights[id]=box(avatar.getObjectByName("nakama-face")).max.y;
  if(id==="chopper"){
    const soles=box(avatar.getObjectByName("avatar-thigh-0")).min.y;
    assert(soles>=-.001&&soles<.012,"Standing hooves contact the floor without stretching the shins.");
    state.sitting=1;state.phase="inside";state.position.y=.63;
    frames[at]({camera,clock:{elapsedTime:1}},1/60);avatar.updateMatrixWorld(true);assertAttachments(avatar,"Seated boarding Chopper");
    for(const name of coreNames){const actual=box(avatar.getObjectByName(name)),expected=box(seated.getObjectByName(name));actual.translate(new THREE.Vector3(0,.01,0));assert(actual.min.distanceTo(expected.min)<.002&&actual.max.distanceTo(expected.max)<.002,`The boarding and seated ${name} match within 2 mm after the existing 1 cm floor offset.`);}
    assert(Math.abs(box(avatar.getObjectByName("avatar-thigh-0")).min.y+.01-box(seated.getObjectByName("nakama-shoes")).min.y)<.002,"Walking and seated short legs keep the same bone lengths and dangling feet.");
  }
}
assert(standingHeights.chopper<.90&&standingHeights.chopper<standingHeights.luffy*.58,"Chopper's standing head is below 90 cm and visibly smaller than an adult.");
let samples=0;
for(let cycle=0;cycle<Math.PI*2;cycle+=Math.PI/180)for(let sitting=0;sitting<=1;sitting+=.02){
  const hip=rig.standingHipHeight+(rig.seatedHipHeight-rig.standingHipHeight)*sitting,pose=getWalkingLegPose(cycle,hip,1,sitting,"chopper");
  assert(Object.values(pose).every(Number.isFinite),"The short rig produces finite angles through the whole walk-to-seat transition.");
  const y=hip-rig.thighLength*Math.cos(pose.upper)-rig.shinLength*Math.cos(pose.upper+pose.lower);
  assert(y>=.039,"Short hooves never go through the floor during the complete gait.");
  assert(Math.abs(pose.upper+pose.lower+pose.ankle)<1e-10,"Hooves remain level despite the changing knee pose.");
  samples++;
}
let animationSamples=0;
for(const mode of ["social","party","horn"])for(const reducedMotion of [false,true]){
  const at=frames.length,root=mount({type:Passenger,props:{seat:{x:0,z:0,row:0,seatInRow:0},index:chopperIndex,archetype:chopper,hornPulse:mode==="horn"?performance.now():0,partyOn:mode==="party",reducedMotion}});
  for(let time=0;time<60;time+=1/30){frames[at]({clock:{elapsedTime:time}},1/30);root.updateMatrixWorld(true);assertAttachments(root,`${mode} frame${time}`);animationSamples++;}
}
assert.deepEqual(getPassengerSkeleton("luffy"),getPassengerSkeleton("sanji"),"All adult rigs keep the original shared dimensions.");
assert.equal(getPassengerSkeleton("chopper"),rig,"Per-frame gait reuses the same immutable-sized skeleton object.");
// Inspect the actual bounded instance matrices as well: lowering only the
// detailed actor would otherwise let a distant visitor grow back into an adult.
const matrix=new THREE.Matrix4(),translation=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
const passengers=[{index:chopperIndex,physicalSeatIndex:0,passengerKind:"visitor",seat:{x:-.5,z:0,row:0,seatInRow:1}},
  {index:0,physicalSeatIndex:1,passengerKind:"visitor",seat:{x:.5,z:0,row:0,seatInRow:2}}];
for(const partyOn of [false,true]){
  const at=frames.length,effectAt=layoutEffects.length;
  const root=mount({type:SimplifiedPassengers,props:{passengers,partyOn,hornPulse:0,reducedMotion:false}});
  for(const effect of layoutEffects.slice(effectAt))effect();
  frames[at]({clock:{elapsedTime:2}},1/60);
  for(const name of ["bus-distant-passenger-bodies","bus-distant-passenger-heads"]){
    const mesh=root.getObjectByName(name);mesh.getMatrixAt(0,matrix);matrix.decompose(translation,rotation,scale);
    assert(Math.abs(translation.y-(name.includes("bodies")?1.295:1.55))<1e-6,"Distant Chopper retains its lowered torso and large head while resting and dancing.");
    assert(Math.abs(scale.y-(name.includes("bodies")?.24/.42:.25/.27))<1e-6,"Distant Chopper's actual instance keeps the compact dimensions.");
    mesh.getMatrixAt(1,matrix);matrix.decompose(translation,rotation,scale);
    assert(Math.abs(translation.y-(name.includes("bodies")?1.35:1.82))<1e-6&&Math.abs(scale.y-1)<1e-6,"The following adult's instance does not inherit Chopper's scale.");
  }
  root.getObjectByName("bus-distant-party-hands").getMatrixAt(0,matrix);matrix.decompose(translation,rotation,scale);
  assert(Math.abs(scale.y-.6)<1e-6&&Math.abs(scale.x-.8)<1e-6,"Distant hooves use the same shortened limb proportions.");
}
delete globalThis.__chopperRigFrames;
delete globalThis.__chopperRigLayoutEffects;
console.log("Chopper compact real rig passed:",JSON.stringify({standingHeadTop:standingHeights,seatedHeadCenter:face.getCenter(point).y,seatedEyeCenterY:eyeCenterY,seatedFootBottom:box(seated.getObjectByName("nakama-shoes")).min.y,gaitSamples:samples,animationSamples}));
