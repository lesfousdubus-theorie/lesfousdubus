import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Targeted mounted-scene confirmation; the caller supplies isolated API/media fixtures. */
export async function runMugiwaraCabinChecks({ send, evaluate, waitForPageCondition, open, frames,
  pose, screenshot, freeView, resourceSnapshot, roster, layout, directory }) {
  const run = expression => evaluate(send, expression);
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 60_000);
  const results = { viewports: [], portraits: [], cards: [], televisions: [] };
  const actorName = id => `crew-nakama-${id}-${roster.findIndex(actor => actor.id === id)}`;
  const restore = () => run(`(()=>{
    for(const [object,descriptor] of window.mugiwaraVisibility??[])Object.defineProperty(object,'visible',descriptor);
    for(const [element,value] of window.mugiwaraDomVisibility??[])element.style.visibility=value;
    window.mugiwaraVisibility=[];window.mugiwaraDomVisibility=[];
  })()`);
  const isolate = async names => {
    await restore();
    await run(`(()=>{
      const s=window.busCameraTestState(),actors=${JSON.stringify(names)}.map(name=>s.scene.getObjectByName(name));
      if(actors.some(actor=>!actor))throw new Error('Missing portrait actor');
      const keep=new Set();for(const actor of actors){let p=actor;while(p){keep.add(p);p=p.parent;}}
      s.scene.traverse(object=>{if(object.isLight){let p=object;while(p){keep.add(p);p=p.parent;}}});
      window.mugiwaraVisibility=[];s.scene.traverse(object=>{
        let p=object,belongs=false;while(p){if(actors.includes(p)){belongs=true;break;}p=p.parent;}
        if(!belongs&&!keep.has(object)){
          window.mugiwaraVisibility.push([object,Object.getOwnPropertyDescriptor(object,'visible')]);
          Object.defineProperty(object,'visible',{configurable:true,get:()=>false,set:()=>{}});
        }
      });
      window.mugiwaraDomVisibility=[];for(const element of document.querySelector('.bus-app').children)
        if(!element.contains(s.gl.domElement)){window.mugiwaraDomVisibility.push([element,element.style.visibility]);element.style.visibility='hidden';}
    })()`);
  };
  const focus = async (names, headsOnly = false) => {
    await run(`(()=>{
      const s=window.busCameraTestState(),actors=${JSON.stringify(names)}.map(name=>s.scene.getObjectByName(name));s.scene.updateMatrixWorld(true);
      const first=actors[0].getObjectByName('nakama-face');first.geometry.computeBoundingBox();
      const box=first.geometry.boundingBox.clone().makeEmpty();
      for(const actor of actors)( ${headsOnly} ? actor.getObjectByName('nakama-head') : actor ).traverse(object=>{
        if(!object.isMesh||!object.geometry)return;object.geometry.computeBoundingBox();box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
      });
      const center=box.getCenter(s.camera.position.clone()),size=box.getSize(s.camera.position.clone()),tan=Math.tan(s.camera.fov*Math.PI/360);
      const distance=Math.max(size.y/2/tan,size.x/2/tan/s.camera.aspect)*1.4;
      const direction=s.camera.position.clone().set(0,.04,-1).normalize();
      direction.applyQuaternion(actors[0].getWorldQuaternion(s.camera.quaternion.clone()));
      s.camera.position.copy(center).addScaledVector(direction,distance);s.controls.target.copy(center);s.controls.update();s.camera.updateMatrixWorld();
    })()`);
    await frames(3);
  };
  const occupancy = async includeAvatar => {
    const snapshot = await run(`(()=>{
      const s=window.busCameraTestState(),people=[];s.scene.updateMatrixWorld(true);
      const visible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
      s.scene.traverse(object=>{
        if(/^(crew-)?nakama-.*-\\d+$/.test(object.name)&&visible(object))people.push({name:object.name,seat:object.userData.physicalSeatIndex});
        if(object.name==='bus-distant-passenger-bodies'&&visible(object)){
          for(let index=0;index<object.count;index++)people.push({name:'simplified-'+index,
            seat:object.userData.occupants[index]?.physicalSeatIndex});
        }
      });
      const avatar=s.scene.getObjectByName('bus-boarding-avatar');
      if(${includeAvatar}&&visible(avatar))people.push({name:avatar.name,seat:avatar.userData.physicalSeatIndex});
      return people;
    })()`);
    assert.equal(snapshot.length, 24, "Four visitors and twenty permanent characters remain present.");
    assert(snapshot.every(actor=>Number.isInteger(actor.seat)), "Mounted actors expose their physical seat.");
    const places=snapshot.map(actor=>actor.seat).sort((a,b)=>a-b);
    assert.deepEqual(places,Array.from({length:24},(_,index)=>index), "The first six rows are filled without an empty second row.");
    const benches=new Map();for(const {seat} of snapshot)benches.set(Math.floor(seat/2),(benches.get(Math.floor(seat/2))??0)+1);
    assert(Math.max(...benches.values())<=2,"Each real bench has at most two occupants, including the visitor avatar.");
    return {actors:snapshot,maxPerBench:Math.max(...benches.values()),occupiedSeats:places};
  };
  try {
    for(const mobile of [false,true]){
      const viewport=mobile?"mobile":"desktop";
      await open(4,0,mobile,false);
      const before=await occupancy(false);
      await run("[...document.querySelectorAll('button')].find(button=>!button.disabled&&button.textContent.includes('Entrer dans le bus')).click()");
      await wait("document.querySelector('.bus-app').dataset.phase==='inside'", "The fixture assigns visitor zero and boarding finishes");
      await frames(3);
      const after=await occupancy(true);
      await freeView();
      const anatomy=await run(`(()=>{
        const s=window.busCameraTestState();s.scene.updateMatrixWorld(true);
        return ['sanji','chopper'].map(id=>{
          const actor=s.scene.getObjectByName(id==='sanji'?${JSON.stringify(actorName("sanji"))}:${JSON.stringify(actorName("chopper"))});
          const face=actor.getObjectByName('nakama-face'),torso=actor.getObjectByName('nakama-torso-body');
          face.geometry.computeBoundingBox();const box=face.geometry.boundingBox.clone().makeEmpty();
          actor.traverse(object=>{if(object.isMesh&&object.geometry){object.geometry.computeBoundingBox();box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));}});
          const head=face.getWorldPosition(s.camera.position.clone());
          torso.geometry.computeBoundingBox();return {id,headY:head.y,bodyHeight:box.max.y-box.min.y,torsoHeight:torso.geometry.boundingBox.max.y-torso.geometry.boundingBox.min.y};
        });
      })()`);
      const [adult,chopper]=anatomy;
      assert(chopper.headY<adult.headY-.25&&chopper.torsoHeight<adult.torsoHeight*.7,
        "Chopper is visibly smaller than the adult and uses a short real torso.");
      await pose([0,2.65,layout.getSeatRowZ(5)+.7],[0,1.55,layout.getSeatRowZ(1)]);
      await screenshot(`rangees-compactes-${viewport}.png`);
      await isolate([actorName("sanji"),actorName("chopper")]);
      await focus([actorName("sanji"),actorName("chopper")]);
      await screenshot(`chopper-taille-comparee-${viewport}.png`);
      const ids=mobile?["zoro","luffy","chopper"]:["zoro","luffy","chopper","nami","sanji","shanks"];
      for(const id of ids){
        await isolate([actorName(id)]);await focus([actorName(id)],true);
        const orientation=await run(`(()=>{
          const s=window.busCameraTestState(),actor=s.scene.getObjectByName(${JSON.stringify(actorName(id))}),head=actor.getObjectByName('nakama-head');
          const point=object=>head.worldToLocal(object.getWorldPosition(s.camera.position.clone())).toArray();
          return {closedEye:actor.getObjectByName('nakama-zoro-closed-eye')?point(actor.getObjectByName('nakama-zoro-closed-eye')):null,
            eyes:actor.getObjectsByProperty('name','nakama-eye-base').map(point),
            earrings:actor.getObjectsByProperty('name','nakama-zoro-earring-stud').map(point)};
        })()`);
        if(id==="zoro")assert(orientation.closedEye[0]<0&&orientation.eyes.every(point=>point[0]>0)&&orientation.earrings.every(point=>point[0]<0),
          "Mounted Zoro has the scarred eye and earrings on his anatomical left.");
        if(id==="sanji")assert(orientation.eyes.length===1&&orientation.eyes[0][0]<0,"Post-timeskip Sanji exposes his anatomical left eye.");
        await screenshot(`${id}-correction-${viewport}.png`);results.portraits.push({id,viewport,orientation});
      }
      await restore();
      results.viewports.push({viewport,before,after,anatomy,resources:await resourceSnapshot()});

      // Drive the real R3F clock; the mounted bones and cards settle together.
      await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"no-preference"}]});
      await wait("window.busDestinationTestReducedMotion()===false", "Card interactions use the actual animated scene");
      const pair=await run(`(()=>{const s=window.busCameraTestState();let pair=null;s.scene.traverse(object=>{
        if(!pair&&object.name.startsWith('nakama-card-pair-')&&object.userData.firstSeat>=4)pair=object.userData;
      });return pair;})()`);
      assert(pair,"A real occupied bench has a card-game pair.");
      await run(`(()=>{const s=window.busCameraTestState();window.mugiwaraClock={clock:s.clock,descriptor:Object.getOwnPropertyDescriptor(s.clock,'elapsedTime'),time:s.clock.elapsedTime};
        window.mugiwaraClockTarget=0;Object.defineProperty(s.clock,'elapsedTime',{configurable:true,get:()=>window.mugiwaraClockTarget,set:()=>{}});})()`);
      const transfers=[];
      for(const cycle of [17.7,18.1,21.2,21.6]){
        await run(`window.mugiwaraClockTarget=(${cycle}-${pair.pairIndex}*5.1+260)%26`);
        await frames(24);
        const state=await run(`(()=>{
          const s=window.busCameraTestState(),group=s.scene.getObjectByName('nakama-card-pair-${pair.pairIndex}'),card=group.getObjectByName('card-exchange-${pair.pairIndex}');
          s.scene.updateMatrixWorld(true);const position=card.getWorldPosition(s.camera.position.clone());
          let body;card.traverse(object=>{if(!body&&object.isMesh)body=object;});body.geometry.computeBoundingBox();const cardBox=body.geometry.boundingBox.clone().applyMatrix4(body.matrixWorld);
          const actors=[];s.scene.traverse(object=>{if(/^(crew-)?nakama-.*-\\d+$/.test(object.name)&&[${pair.firstSeat},${pair.secondSeat}].includes(object.userData.physicalSeatIndex))actors.push(object);});
          const palmGaps=actors.map(actor=>{
            const hand=actor.getObjectByName(actor.userData.physicalSeatIndex===${pair.firstSeat}?'nakama-hand-right':'nakama-hand-left');
            hand.geometry.computeBoundingBox();const box=hand.geometry.boundingBox.clone().applyMatrix4(hand.matrixWorld);
            return Math.hypot(Math.max(0,cardBox.min.x-box.max.x,box.min.x-cardBox.max.x),
              Math.max(0,cardBox.min.y-box.max.y,box.min.y-cardBox.max.y),Math.max(0,cardBox.min.z-box.max.z,box.min.z-cardBox.max.z));
          });
          return {...group.userData,visible:group.visible,cardPosition:position.toArray(),palmGaps};
        })()`);
        assert(state.visible&&state.transfer>0&&Number.isFinite(state.palmDistance),"A visible real card moves between a valid pair of palms.");
        assert(state.palmGaps.length===2&&state.palmGaps.every(gap=>gap<.012),"The actual exchanged card remains in contact with both rendered palms during handoff.");
        transfers.push(state);
        if(cycle===18.1||cycle===21.6){
          const names=await run(`(()=>{const s=window.busCameraTestState(),names=[];s.scene.traverse(object=>{
            if(/^(crew-)?nakama-.*-\\d+$/.test(object.name)&&[${pair.firstSeat},${pair.secondSeat}].includes(object.userData.physicalSeatIndex))names.push(object.name);
          });return names;})()`);
          assert.equal(names.length,2,"Both card players correspond to distinct real seated actors.");
          // Isolate the actual two players and their shared card group: nearby
          // seats and actors must not sit between this proof camera and the deal.
          await isolate([...names,`nakama-card-pair-${pair.pairIndex}`]);
          const framing=await run(`(()=>{
            const s=window.busCameraTestState(),players=${JSON.stringify(names)}.map(name=>s.scene.getObjectByName(name)),
              game=s.scene.getObjectByName('nakama-card-pair-${pair.pairIndex}'),card=game.getObjectByName('card-exchange-${pair.pairIndex}');
            s.scene.updateMatrixWorld(true);
            const cardCenter=card.getWorldPosition(s.camera.position.clone()),first=players[0].getObjectByName('nakama-face');
            first.geometry.computeBoundingBox();const box=first.geometry.boundingBox.clone().makeEmpty();
            for(const actor of players)actor.traverse(object=>{
              if(!object.isMesh||!object.geometry)return;object.geometry.computeBoundingBox();box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
            });
            // Keep heads, both torsos and both hands; cropped lower legs allow
            // the small cards to remain legible in desktop and mobile captures.
            box.min.y=Math.max(box.min.y,cardCenter.y-.38);
            const center=box.getCenter(s.camera.position.clone()),size=box.getSize(s.camera.position.clone()),tan=Math.tan(s.camera.fov*Math.PI/360);
            const distance=Math.max(size.y/2/tan,size.x/2/tan/s.camera.aspect)*1.45+size.z*.45;
            const direction=s.camera.position.clone().set(.32,.14,-1).normalize();
            direction.applyQuaternion(players[0].getWorldQuaternion(s.camera.quaternion.clone()));
            s.controls.enabled=false;s.controls.enableDamping=false;s.controls.minDistance=.05;s.controls.maxDistance=Math.max(s.controls.maxDistance,distance*3);
            s.camera.position.copy(center).addScaledVector(direction,distance);s.controls.target.copy(center);s.controls.update();s.camera.lookAt(center);s.camera.updateMatrixWorld(true);
            return {distance,target:center.toArray(),position:s.camera.position.toArray()};
          })()`);
          await frames(3);
          const visibleCard=await run(`(()=>{
            const s=window.busCameraTestState(),card=s.scene.getObjectByName('card-exchange-${pair.pairIndex}');
            const point=card.getWorldPosition(s.camera.position.clone()).project(s.camera);
            return {position:point.toArray(),distance:s.camera.position.distanceTo(s.controls.target)};
          })()`);
          assert(visibleCard.position.slice(0,2).every(value=>Math.abs(value)<.85)&&visibleCard.position[2]>-1&&visibleCard.position[2]<1,
            "The actual exchanged card stays inside the usable screenshot frame.");
          assert(visibleCard.distance>=framing.distance*.95,"The proof camera remains far enough back to show both players and the deal.");
          state.capture={framing,visibleCard};
          await screenshot(`cartes-${cycle<20?"aller":"retour"}-${viewport}.png`);
        }
      }
      assert.equal(transfers[0].ownerSeatIndex,pair.firstSeat);assert.equal(transfers[1].ownerSeatIndex,pair.secondSeat);
      assert.equal(transfers[2].ownerSeatIndex,pair.secondSeat);assert.equal(transfers[3].ownerSeatIndex,pair.firstSeat);
      results.cards.push({viewport,pair,transfers});
      await restore();
      await run(`(()=>{const saved=window.mugiwaraClock;Object.defineProperty(saved.clock,'elapsedTime',saved.descriptor);saved.clock.elapsedTime=saved.time;window.mugiwaraClock=null;})()`);

      // A longer bus renders the second TV; rays cover its actual display surface.
      await open(60,0,mobile,true);await freeView();
      const tv=await run(`(()=>{
        const s=window.busCameraTestState(),bus=s.scene.getObjectByName('bus-vehicle');s.scene.updateMatrixWorld(true);
        const all=s.scene.getObjectsByProperty('name','bus-tv-frame'),frame=all.find(object=>object.userData.index===1);
        if(!frame)return null;const display=frame.getObjectByName('bus-tv-display'),rings=s.scene.getObjectsByProperty('name','bus-grab-handle-ring'),rails=s.scene.getObjectsByProperty('name','bus-grab-rail');
        const obstructions=[...rings,...rails];
        let blocked=0,rays=0;const eye=bus.localToWorld(s.camera.position.clone().set(0,1.84,frame.position.z+1.4));
        for(let x=-.6;x<=.6001;x+=.1)for(let y=-.33;y<=.3301;y+=.11){
          const target=display.localToWorld(s.camera.position.clone().set(x,y,0)),direction=target.clone().sub(eye),distance=direction.length();
          const ray=new s.raycaster.constructor(eye,direction.normalize(),0,distance-.002);rays++;if(ray.intersectObjects(obstructions,false).length)blocked++;
        }
        return {index:frame.userData.index,position:frame.position.toArray(),rings:rings.length,rails:rails.length,rays,blocked};
      })()`);
      assert(tv&&tv.rings>0&&tv.rails===2&&tv.rays>50&&tv.blocked===0,"No real grab-handle ring or rail blocks the second television.");
      await pose([0,1.84,tv.position[2]+1.4],[0,tv.position[1],tv.position[2]]);
      await screenshot(`television-2-degagee-${viewport}.png`);results.televisions.push({viewport,...tv});
      console.log(`Mugiwara cabin corrections checked: ${viewport}.`);
    }
    if(directory){await mkdir(directory,{recursive:true});await writeFile(resolve(directory,"verification-mugiwara-cabine-cartes.json"),JSON.stringify(results,null,2));}
    return results;
  }finally{
    await restore().catch(()=>{});
    await run(`(()=>{const saved=window.mugiwaraClock;if(saved){Object.defineProperty(saved.clock,'elapsedTime',saved.descriptor);saved.clock.elapsedTime=saved.time;window.mugiwaraClock=null;}})()`).catch(()=>{});
  }
}
