import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import Passengers from "../../src/components/bus/Passengers";
import { getSeatRowZ } from "../../src/lib/bus-layout";
import { NAKAMA_ROSTER } from "../../src/components/bus/passenger-archetypes";

function Population({view,angle,party,lowPower,reduced,time,running}:{view:string;angle:number;party:boolean;lowPower:boolean;reduced:boolean;time:number;running:boolean}){
  const timing=useRef({view:"",angle:-1,time:-1,running:false,at:0});
  useFrame(state=>{
    const previous=timing.current;
    if(previous.view!==view||previous.angle!==angle){
      const row=view==="rear"?3:0,x=view==="right"?.72:-.72,z=getSeatRowZ(row);
      if(view==="arrival"){state.camera.position.set(7.5,3.2,-10.5);state.camera.lookAt(0,1.9,-2.5);}
      else {const turn=angle*Math.PI/180;state.camera.position.set(x+Math.sin(turn)*1.65,1.65,z-Math.cos(turn)*1.65);state.camera.lookAt(x,1.45,z+.1);}
      previous.view=view;previous.angle=angle;
    }
    if(previous.time!==time||previous.running!==running){previous.time=time;previous.running=running;previous.at=performance.now();}
    state.clock.elapsedTime=time+(running?(performance.now()-previous.at)/1000:0);
  },-100);
  const profiles=useMemo(()=>Array.from({length:16},(_,seatIndex)=>{
    const avatarId=(["nami","usopp","zoro","mihawk"] as const)[seatIndex%4];
    return {seatIndex,avatarId,displayName:NAKAMA_ROSTER.find(a=>a.id===avatarId)!.name,comment:null};
  }),[]);
  return <>
    <ambientLight intensity={1.6}/><directionalLight position={[-3,8,-6]} intensity={2.5}/>
    <Passengers passengerCount={16} seatCapacity={16} numRows={6} reservedRow={3} passengerProfiles={profiles}
      lowPower={lowPower} reducedMotion={reduced} partyOn={party} hornPulse={0} avatarAboard={false}/>
    {[0,1,2,3].flatMap(row=>[-.94,-.5,.5,.94].map(x=><group key={`${row}:${x}`} position={[x,0,getSeatRowZ(row)]}>
      <mesh position={[0,1.075,.21]}><boxGeometry args={[.40,.09,.34]}/><meshStandardMaterial color="#9c263e"/></mesh>
      <mesh position={[0,1.38,.39]}><boxGeometry args={[.40,.58,.08]}/><meshStandardMaterial color="#9c263e"/></mesh>
    </group>))}
  </>;
}
function Lab(){
  const [view,setView]=useState("arrival"),[angle,setAngle]=useState(0),[party,setParty]=useState(false),[lowPower,setLowPower]=useState(false),[reduced,setReduced]=useState(false),[time,setTime]=useState(0),[running,setRunning]=useState(true);
  return <main><header><b>Voisins · modèles de production avant embarquement</b><span>Aucune API, aucun profil enregistré</span></header>
    <nav>
      <label>Caméra <select value={view} onChange={e=>setView(e.target.value)}><option value="arrival">Vue d’arrivée</option><option value="left">Nami et Usopp</option><option value="right">Zoro et Mihawk</option><option value="rear">Rangée 4</option></select></label>
      <label>Rotation <input aria-label="Rotation" type="range" min="0" max="360" step="15" value={angle} onChange={e=>setAngle(Number(e.target.value))}/>{angle}°</label>
      <label><input type="checkbox" checked={party} onChange={e=>setParty(e.target.checked)}/>Danse</label>
      <label><input type="checkbox" checked={lowPower} onChange={e=>setLowPower(e.target.checked)}/>Mode économe</label>
      <label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>Mouvements réduits</label>
      <button onClick={()=>setRunning(!running)}>{running?"Pause":"Reprendre"}</button>
      <label>Temps <input aria-label="Temps" type="range" min="0" max="26" step=".1" value={time} onChange={e=>{setTime(Number(e.target.value));setRunning(false);}}/>{time.toFixed(1)} s</label>
    </nav>
    <section><Canvas dpr={1} camera={{position:[7.5,3.2,-10.5],fov:50,near:.05,far:100}}><color attach="background" args={["#142632"]}/><Population view={view} angle={angle} party={party} lowPower={lowPower} reduced={reduced} time={time} running={running}/></Canvas></section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Lab/>);
