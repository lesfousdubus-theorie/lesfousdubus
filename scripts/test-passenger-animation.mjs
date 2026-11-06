import assert from "node:assert/strict";
import { build } from "esbuild";

// Mount the real JSX and execute its frame callbacks; no duplicate mannequin.
const frames=[],layoutEffects=[];globalThis.__animationRigFrames=frames;globalThis.__animationRigLayoutEffects=layoutEffects;
const compiled=await build({
  stdin:{contents:`export * as THREE from 'three';
    export { default as Passengers, Passenger, SimplifiedPassengers } from './src/components/bus/Passengers';
    export { default as BoardingAvatar } from './src/components/bus/BoardingAvatar';
    export { NAKAMA_ROSTER } from './src/components/bus/passenger-archetypes';
    export { getPassengerProportions, getPassengerSkeleton } from './src/lib/passenger-proportions';
    export { getWalkingLegPose } from './src/lib/passenger-gait';
    export { createPassengerPose, samplePassengerPose } from './src/lib/passenger-motion';
    export { bakePassengerIdentity, bakedPassengerIdentities } from './src/lib/baked-passenger';
    export { createJourneyState } from './src/lib/bus-journey';`,resolveDir:process.cwd(),sourcefile:"animation-rig-test.ts"},
  bundle:true,format:"esm",platform:"node",write:false,jsx:"automatic",logLevel:"silent",
  plugins:[{name:"real-rig-hooks",setup(builder){
    builder.onResolve({filter:/^(react|react\/jsx-runtime|@react-three\/fiber)$/},args=>({path:args.path,namespace:"real-rig-hooks"}));
    builder.onLoad({filter:/.*/,namespace:"real-rig-hooks"},({path})=>({contents:path==="react"
      ?`export const useRef=current=>({current});export const useState=initial=>[typeof initial==="function"?initial():initial,()=>{}];export const useMemo=fn=>fn();export const useCallback=fn=>fn;
        export const useEffect=()=>{};export const useLayoutEffect=fn=>globalThis.__animationRigLayoutEffects.push(fn);export const memo=c=>c;`
      :path==="react/jsx-runtime"?`export const Fragment=Symbol.for('animation-rig-fragment');export const jsx=(type,props)=>({type,props});export const jsxs=jsx;`
      :`export const useThree=selector=>selector({camera:{position:{x:7.5,z:-10.5}}});export const useFrame=(callback,priority=0)=>globalThis.__animationRigFrames.push({callback,priority});`}));
  }}],
});
const {THREE,Passengers,Passenger,SimplifiedPassengers,BoardingAvatar,NAKAMA_ROSTER,getPassengerSkeleton,getPassengerProportions,getWalkingLegPose,createJourneyState,createPassengerPose,samplePassengerPose,bakePassengerIdentity,bakedPassengerIdentities}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
const material=new THREE.MeshStandardMaterial();
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const children=value=>Array.isArray(value)?value.flatMap(children):value==null||value===false?[]:[value];
function mount(element){
  if(!element)return new THREE.Group();
  if(typeof element.type==="function")return mount(element.type(element.props));
  if(typeof element.type==="symbol"){const group=new THREE.Group();for(const child of children(element.props.children))group.add(mount(child));return group;}
  const props=element.props,object=element.type==="instancedMesh"?new THREE.InstancedMesh(props.geometry??new THREE.BufferGeometry(),props.material??material,props.args[2]):element.type==="mesh"?new THREE.Mesh(props.geometry,props.material??material):new THREE.Group();
  object.name=props.name??"";object.userData=props.userData??{};
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
const camera=new THREE.PerspectiveCamera();camera.position.set(8,8,8);
const box=object=>new THREE.Box3().setFromObject(object);
function actor(Component,props){
  const frameAt=frames.length,effectAt=layoutEffects.length,root=mount({type:Component,props});
  for(const effect of layoutEffects.slice(effectAt))effect();
  const callbacks=frames.slice(frameAt).sort((a,b)=>a.priority-b.priority);root.updateMatrixWorld(true);
  return {root,tick(time,dt=1/60){for(const {callback} of callbacks)callback({clock:{elapsedTime:time},camera},dt);root.updateMatrixWorld(true);}};
}
const seat={x:0,z:0,row:0,seatInRow:0};let samples=0,neighborFrames=0,maxHandFootprint=0,maxNeighborHandStep=0;
// Real mounted shoes must stay planted: angular bounds alone miss root bobbing.
for(const [index,archetype] of NAKAMA_ROSTER.entries()){
  const mounted=actor(Passenger,{seat,index,archetype,partyOn:true,hornPulse:0,reducedMotion:false});
  const identity=bakePassengerIdentity(mounted.root);bakedPassengerIdentities.set(archetype.id,identity);
  for(const role of ["head","body"]){const parts=identity.filter(part=>part.role===role);assert(parts.length>0);assert(parts.some(part=>part.geometry.userData.sourceNames.includes(role==="head"?"nakama-face":`nakama-${archetype.id}-top`)),`${archetype.id}: baked identity preserves its real face and costume.`);}
  const head=mounted.root.getObjectByName("nakama-head"),originalHead=new THREE.Box3().setFromObject(head,true),bakedHead=new THREE.Box3();
  for(const part of identity.filter(part=>part.role==="head")){part.geometry.computeBoundingBox();bakedHead.union(part.geometry.boundingBox.clone().applyMatrix4(head.matrixWorld));}
  assert(originalHead.min.distanceTo(bakedHead.min)<1e-5&&originalHead.max.distanceTo(bakedHead.max)<1e-5,`${archetype.id}: hair, face and hat retain the exact real silhouette when detail changes.`);
  const shoe=mounted.root.getObjectByName(archetype.id==="sanji"?"nakama-left-shoe":"nakama-shoes"),baseline=box(shoe);
  const pelvis=mounted.root.getObjectByName("nakama-pelvis"),pelvisBaseline=box(pelvis);
  for(let frame=0;frame<720;frame++){
    mounted.tick(frame/30,1/30);
    const actual=box(shoe);assert(actual.min.distanceTo(baseline.min)<1e-8&&actual.max.distanceTo(baseline.max)<1e-8,`${archetype.id}: dance keeps its planted shoes and pelvis anchored.`);
    const actualPelvis=box(pelvis);assert(actualPelvis.min.distanceTo(pelvisBaseline.min)<1e-8&&actualPelvis.max.distanceTo(pelvisBaseline.max)<1e-8,`${archetype.id}: all six sequences keep the pelvis on the cushion.`);
    for(const side of ["left","right"]){
      const shoulder=mounted.root.getObjectByName(`nakama-arm-${side}`),elbow=mounted.root.getObjectByName(`nakama-elbow-${side}`);
      assert(Math.abs(shoulder.getWorldPosition(new THREE.Vector3()).distanceTo(elbow.getWorldPosition(new THREE.Vector3()))-getPassengerSkeleton(archetype.id).upperArmLength)<1e-8,`${archetype.id}: real upper arm never stretches.`);
      if(frame%10===0){const hand=mounted.root.getObjectByName(`nakama-hand-${side}`);if(hand){const bounds=box(hand),footprint=Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x));maxHandFootprint=Math.max(maxHandFootprint,footprint);assert(footprint<.36,`${archetype.id}: actual hand stays inside the window line during every dance sequence (${footprint} m).`);}}
    }
    if(archetype.id==="sanji"){
      const calf=mounted.root.getObjectByName("nakama-kicking-calf"),center=box(calf).getCenter(new THREE.Vector3());
      assert(center.z<=-.16+1e-6,"Sanji's shin kicks forward, away from his own seat.");
      assert(box(mounted.root.getObjectByName("nakama-shoes")).min.y>=.63-1e-6,"Sanji's kick never penetrates the cabin floor.");
    }
    if(archetype.id==="nami"&&frame===150)assert(!mounted.root.getObjectByName("nakama-signature-right").visible,"Nami puts away the staff for the two-handed berry gesture instead of carrying it through her face.");
    if(archetype.id==="law"&&frame===465)assert(!mounted.root.getObjectByName("nakama-signature-right").visible,"Law's facepalm has an empty hand, with the sword put away.");
    samples++;
  }
  // A chosen avatar runs the same complete upper-body dance, including its head.
  const state=createJourneyState();state.phase="inside";state.sitting=1;state.avatarVisible=true;state.position.set(0,.64,0);
  const local=actor(BoardingAvatar,{journey:{current:state},passengerIndex:index,physicalSeatIndex:0,partyOn:true,hornPulse:0,reducedMotion:false});
  const companion=actor(Passenger,{seat,index,archetype,partyOn:true,hornPulse:0,reducedMotion:false});
  for(let frame=0;frame<180;frame++){
    const t=frame/60;local.tick(t);companion.tick(t);
    assert(local.root.getObjectByName("nakama-upper-body").quaternion.angleTo(companion.root.getObjectByName("nakama-upper-body").quaternion)<1e-7,`${archetype.id}: avatar receives every torso axis.`);
    for(const side of ["left","right"]){
      assert(local.root.getObjectByName(`nakama-elbow-${side}`).quaternion.angleTo(companion.root.getObjectByName(`nakama-elbow-${side}`).quaternion)<1e-7,`${archetype.id}: avatar receives both elbow axes.`);
    }
    const a=local.root.getObjectByName("bus-boarding-avatar-head"),b=companion.root.getObjectByName("nakama-neck").parent;
    assert(a.quaternion.angleTo(b.quaternion)<1e-7,`${archetype.id}: avatar receives head movement.`);
    samples++;
  }
}
// Use actual palm positions and independently selected silhouettes on the same bench.

for(const [leftId,rightId] of [["luffy","zoro"],["chopper","luffy"],["franky","chopper"],["chopper","chopper"],["shanks","chopper"]]){
  const left=NAKAMA_ROSTER.find(a=>a.id===leftId),right=NAKAMA_ROSTER.find(a=>a.id===rightId);
  const a=actor(Passenger,{seat,index:87,physicalSeatIndex:0,archetype:left,peerSide:1,interactionPairIndex:0,partyOn:false,hornPulse:0,reducedMotion:false});
  const b=actor(Passenger,{seat:{...seat,x:.44,seatInRow:1},index:12,physicalSeatIndex:1,archetype:right,peerSide:-1,interactionPairIndex:0,partyOn:false,hornPulse:0,reducedMotion:false});
  for(let frame=0;frame<240;frame++){a.tick(11.5);b.tick(11.5);}
  const handsA=["left","right"].map(side=>a.root.getObjectByName(`nakama-hand-${side}`)).filter(Boolean).map(box);
  const handsB=["left","right"].map(side=>b.root.getObjectByName(`nakama-hand-${side}`)).filter(Boolean).map(box);
  for(const first of handsA)for(const second of handsB)assert(!first.intersectsBox(second),`${leftId}/${rightId}: neighbors never hold hands during the former high-five interval.`);
  assert.notEqual(a.root.userData.activity,"check");assert.notEqual(b.root.userData.activity,"check");
  for(let time=2;time<6;time+=.05){
    a.tick(time);b.tick(time);
    const moods=[a,b].map(actor=>actor.root.getObjectByName("character-expression").userData.facialMood);
    assert.deepEqual(moods.sort(),["listening","speaking"],"Actual bench neighbors alternate speaking and listening even when their visitor IDs belong to different original pairs.");
  }
}
// Distant arms keep two rigid bones attached under a common moving torso.
const occupants=NAKAMA_ROSTER.map((a,index)=>({index,physicalSeatIndex:index,passengerKind:"visitor",seat:{x:index*.44,z:0,row:0,seatInRow:0}}));
const distant=actor(SimplifiedPassengers,{passengers:occupants,partyOn:true,hornPulse:0,reducedMotion:false});
assert(bakedPassengerIdentities.size===20,"The identity library stays bounded to the twenty actual avatar designs.");
const matrix=new THREE.Matrix4(),scale=new THREE.Vector3(),pos=new THREE.Vector3(),q=new THREE.Quaternion();
function endpoint(name,index,y){const mesh=distant.root.getObjectByName(name);mesh.getMatrixAt(index,matrix);return new THREE.Vector3(0,y,0).applyMatrix4(matrix);}
for(let frame=0;frame<240;frame++){
  distant.tick(frame/30,1/30);
  for(const [i,archetype] of NAKAMA_ROSTER.entries())for(let side=0;side<2;side++){
    const at=i*2+side;
    if(archetype.id==="shanks"&&side===0){for(const name of ["bus-distant-party-arms","bus-distant-passenger-forearms","bus-distant-party-hands"]){distant.root.getObjectByName(name).getMatrixAt(at,matrix);matrix.decompose(pos,q,scale);assert(matrix.elements.slice(0,12).every(value=>Math.abs(value)<1e-8),"Distant Shanks does not grow a second arm.");}continue;}
    assert(endpoint("bus-distant-party-arms",at,-.10).distanceTo(endpoint("bus-distant-passenger-forearms",at,.11))<2e-6,"Distant elbow remains attached.");
    assert(endpoint("bus-distant-passenger-forearms",at,-.11).distanceTo(endpoint("bus-distant-party-hands",at,0))<2e-6,"Distant wrist remains attached.");
    assert(!distant.root.getObjectByName("bus-distant-party-arms").visible,"Generic matrix drivers must never replace the real costume.");
    const model=distant.root.getObjectByName(`bus-distant-identity-${archetype.id}`);assert(model&&model.children.some(mesh=>mesh.userData.role==="head"&&mesh.visible),"Distant faces remain present at every viewing angle.");
    samples++;
  }
}
// The real population controller starts with the camera near the front, while
// its reserved seat is still in row 4. Both neighbors must already have faces,
// hair and costume meshes before entering or leaving the bus.
for(const lowPower of [false,true]){
  const population=actor(Passengers,{passengerCount:16,seatCapacity:16,numRows:6,reservedRow:3,lowPower,hornPulse:0,
    passengerProfiles:Array.from({length:16},(_,i)=>({seatIndex:i,displayName:"",avatarId:i%2?"usopp":"nami"}))});
  const visitors=population.root.children.filter(child=>child.userData.passengerKind==="visitor");
  for(const physical of [2,3]){
    const visitor=visitors.find(root=>root.userData.physicalSeatIndex===physical);
    assert(visitor?.getObjectByName("nakama-face")&&visitor.getObjectByName("nakama-hair")&&visitor.getObjectByName("nakama-torso-body"),"Both closest arrival neighbors start with complete models instead of a bare instance.");
  }
}
// Every archetype and every dance stays on its own side, including interpolation
// and the old low/high hand-contact intervals. This covers arbitrary bench mates.
for(const archetype of NAKAMA_ROSTER)for(const side of [0,1])for(const partyOn of [false,true]){
  const seated=actor(Passenger,{seat:{...seat,seatInRow:side},index:NAKAMA_ROSTER.indexOf(archetype),archetype,peerSide:side?-1:1,
    cardPairIndex:partyOn?null:0,interactionPairIndex:0,partyOn,hornPulse:0,reducedMotion:false});
  const previousHands=new Map();
  for(let frame=0;frame<26*30;frame++){
    seated.tick(frame/30,1/30);neighborFrames++;
    for(const handSide of ["left","right"]){
      const hand=seated.root.getObjectByName(`nakama-hand-${handSide}`);if(!hand)continue;
      const bounds=box(hand);
      assert(side?bounds.min.x>-.20-1e-6:bounds.max.x<.20+1e-6,`${archetype.id}: ${partyOn?"dance":"social/card"} hand crosses into its neighbor's space at ${frame/30}s.`);
      const center=bounds.getCenter(new THREE.Vector3()),previous=previousHands.get(handSide);
      // Entry easing raises the arms over 300 ms; subsequent dance frames must
      // remain continuous. The hand-space assertion above includes entry too.
      if(previous&&frame>9){const step=center.distanceTo(previous);maxNeighborHandStep=Math.max(maxNeighborHandStep,step);assert(step<.08,`${archetype.id} side ${side} ${partyOn?"party":"social"} ${handSide} at ${frame/30}: hand-space correction jumps ${step} m between frames.`);}
      previousHands.set(handSide,center);
    }
  }
}
const sharedPoses=new Map(),nami=NAKAMA_ROSTER.find(a=>a.id==="nami");
const close=actor(Passenger,{seat,index:2,archetype:nami,poses:sharedPoses,partyOn:true,hornPulse:0,reducedMotion:false});
for(let frame=0;frame<120;frame++)close.tick(frame/60);
const shared=sharedPoses.get(2),saved={...shared};
const far=actor(SimplifiedPassengers,{passengers:[{index:2,physicalSeatIndex:0,passengerKind:"visitor",seat}],poses:sharedPoses,partyOn:true,hornPulse:0,reducedMotion:false});
far.tick(2,0);assert.equal(sharedPoses.get(2),shared);assert.deepEqual(shared,saved,"Changing representation never resets a character's dance pose.");
const back=actor(Passenger,{seat,index:2,archetype:nami,poses:sharedPoses,partyOn:true,hornPulse:0,reducedMotion:false});
back.tick(2,0);assert.deepEqual(shared,saved,"Returning to the detailed model keeps the same pose too.");
console.log("Mounted animation regression passed:",JSON.stringify({characters:NAKAMA_ROSTER.length,samples,neighborFrames,maxHandFootprint,maxNeighborHandStep}));
