import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Passenger } from "../../src/components/bus/Passengers";
import { NAKAMA_ROSTER } from "../../src/components/bus/passenger-archetypes";

// Isolated visual fixture: actual production models and frame callbacks, no API.
function RigStage({ mode, time, paused, focus, reduced, horn }: { mode:string;time:number;paused:boolean;focus:string;reduced:boolean;horn:number }) {
  const origin=useRef({ time:-1, at:0, paused:false });
  useFrame(state=>{
    const {camera,size}=state;
    if(origin.current.time!==time||origin.current.paused!==paused)origin.current={time,at:performance.now(),paused};
    state.clock.elapsedTime=origin.current.time+(paused?0:(performance.now()-origin.current.at)/1000);
    if("zoom" in camera){camera.zoom=Math.min(size.width/(focus==="all"?8.2:2.4),size.height/(focus==="all"?8.4:2.8));camera.position.set(0,focus==="all"?4.05:1.4,-12);camera.lookAt(0,focus==="all"?4.05:1.4,0);camera.updateProjectionMatrix();}
  },-100);
  const roster=focus==="all"?NAKAMA_ROSTER:NAKAMA_ROSTER.filter(a=>a.id===focus||(mode==="check"&&a.id==="chopper"&&focus!=="chopper")||(mode==="check"&&a.id==="luffy"&&focus==="chopper"));
  return <>
    <ambientLight intensity={1.8}/><directionalLight position={[-3,8,-6]} intensity={2.5}/>
    {roster.map((archetype,i)=>{
      const index=NAKAMA_ROSTER.indexOf(archetype),pair=mode==="check"&&focus!=="all";
      const x=focus==="all"?(i%5-2)*1.5:pair?(i-.5)*.44:0,y=focus==="all"?(3-Math.floor(i/5))*2:0;
      return <group key={archetype.id} position={[x,y,0]}>
        <Passenger seat={{x:0,z:0,row:0,seatInRow:i%2}} index={index} physicalSeatIndex={i} archetype={archetype} label={archetype.name}
          partyOn={mode==="party"} hornPulse={mode==="horn"?horn:0} reducedMotion={reduced}
          peerSide={pair?(i===0?1:-1):0} peerCharacterId={pair?roster[1-i].id:undefined} interactionPairIndex={0}/>
        <mesh position={[0,1.075,.21]}><boxGeometry args={[.40,.09,.34]}/><meshStandardMaterial color="#334651"/></mesh>
        <mesh position={[0,1.38,.39]}><boxGeometry args={[.40,.58,.08]}/><meshStandardMaterial color="#334651"/></mesh>
        <mesh position={[0,.60,0]}><boxGeometry args={[pair?.44:1.1,.04,.9]}/><meshStandardMaterial color="#172731"/></mesh>
      </group>;
    })}
  </>;
}
function Lab(){
  const [mode,setMode]=useState("party"),[time,setTime]=useState(0),[paused,setPaused]=useState(false),[focus,setFocus]=useState("all"),[reduced,setReduced]=useState(false),[horn,setHorn]=useState(0);
  return <main>
    <header><b>Animations du bus · 20 personnages réels</b><span>Fixture locale, sans inscription</span></header>
    <nav>
      <label>Scène <select value={mode} onChange={e=>{setMode(e.target.value);if(e.target.value==="check"){setTime(11.5);setPaused(true);setFocus("chopper");}if(e.target.value==="horn")setHorn(performance.now());}}><option value="party">Danse</option><option value="social">Repos</option><option value="check">Check entre voisins</option><option value="horn">Klaxon</option></select></label>
      <label>Personnage <select value={focus} onChange={e=>setFocus(e.target.value)}><option value="all">Les vingt personnages</option>{NAKAMA_ROSTER.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <button onClick={()=>{setPaused(!paused);setTime(time+1);}}>{paused?"Reprendre":"Pause"}</button>
      <label>Temps <input aria-label="Temps" type="range" min="0" max="26" step=".1" value={time} onChange={e=>{setTime(Number(e.target.value));setPaused(true);}}/>{time.toFixed(1)} s</label>
      <label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>Mouvements réduits</label>
      <button onClick={()=>setHorn(performance.now())}>Klaxon</button>
    </nav>
    <section><Canvas orthographic dpr={1} camera={{position:[0,4,-12],near:.1,far:40}}><color attach="background" args={["#0a161e"]}/><RigStage mode={mode} time={time} paused={paused} focus={focus} reduced={reduced} horn={horn}/></Canvas></section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Lab/>);
