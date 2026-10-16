"use client";

import * as THREE from "three";
import type { NakamaArchetype } from "./passenger-archetypes";
import { getPassengerProportions } from "@/lib/passenger-proportions";
import { getFittedCostumeGeometry } from "@/lib/passenger-costume-geometry";

// Les détails sont regroupés sur deux décalcomanies par personnage, pas en dizaines de meshes.
const materials = new Map<string, THREE.MeshStandardMaterial>();
function costumeMaterial(id: string, face: boolean) {
  const key = `${id}-${face ? "face" : "outfit"}`;
  const cached = materials.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
  const c = canvas.getContext("2d")!;
  c.lineCap = "round"; c.lineJoin = "round";
  const rect = (x:number,y:number,w:number,h:number,color:string) => {c.fillStyle=color;c.fillRect(x,y,w,h);};
  const line = (x:number,y:number,xx:number,yy:number,color:string,width=5) => {c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};
  const dot = (x:number,y:number,r:number,color:string) => {c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
  const poly = (points:number[][],color:string) => {c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  const star = (x:number,y:number,r:number,color:string) => poly(Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5;return [x+Math.cos(a)*r*(i%2?.45:1),y+Math.sin(a)*r*(i%2?.45:1)];}),color);
  const puzzle = (x:number,y:number,size:number,color:string) => {
    const s=size/100;c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=color;c.beginPath();
    c.moveTo(-42,-42);c.lineTo(-13,-42);c.bezierCurveTo(-25,-72,25,-72,13,-42);
    c.lineTo(42,-42);c.lineTo(42,-13);c.bezierCurveTo(72,-25,72,25,42,13);
    c.lineTo(42,42);c.lineTo(13,42);c.bezierCurveTo(25,12,-25,12,-13,42);
    c.lineTo(-42,42);c.lineTo(-42,13);c.bezierCurveTo(-12,25,-12,-25,-42,-13);c.closePath();c.fill();c.restore();
  };
  if(face) {
    switch(id) {
      // Face toward -Z: anatomical left is negative X and the right half of this canvas.
      case "luffy": line(167,150,194,150,"#a85440",3);line(182,144,182,156,"#a85440",3);break;
      case "zoro": line(187,56,187,157,"#bd7f68",4);break;
      case "nami": case "robin": line(48,89,59,83,"#442121",3);line(198,89,188,83,"#442121",3);dot(49,148,12,id==="nami"?"#f3a07c":"#f0b69b");dot(207,148,12,"#f0b69b");break;
      case "usopp": line(40,145,80,142,"#b3631a",3);line(178,142,217,145,"#b3631a",3);break;
      case "sanji":
        // Post-timeskip Sanji: right eye under the fringe, left eye/eyebrow visible.
        line(208,77,172,72,"#59462f",4.5);
        c.strokeStyle="#59462f";c.lineWidth=4.5;c.beginPath();
        for(let a=0;a<Math.PI*3.2;a+=.15){const r=11-a*.91;const x=171-Math.cos(a)*r,y=73+Math.sin(a)*r;a===0?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
        // Small goatee below the maximum party-mouth opening, fitted to the chin.
        poly([[115,230],[141,230],[137,241],[128,247],[119,241]],"#67513d");break;
      // Chopper's nose and animated mouth are already fitted to his 3D muzzle.
      case "chopper": break;
      case "franky": poly([[111,113],[144,113],[154,149],[101,149]],"#b5c4cf");line(111,128,145,128,"#edf6ff",3);break;
      case "brook": dot(73,105,23,"#201f29");dot(184,105,23,"#201f29");poly([[128,130],[116,155],[140,155]],"#201f29");rect(84,179,87,16,"#201f29");for(let x=87;x<170;x+=14)rect(x,179,9,16,"#ffffec");break;
      case "jinbe": line(46,73,91,62,"#16242e",7);line(165,62,208,73,"#16242e",7);poly([[91,184],[106,184],[99,160]],"#fffce7");poly([[151,184],[166,184],[159,160]],"#fffce7");break;
      case "law": poly([[103,197],[128,221],[153,197]],"#403023");line(95,177,107,178,"#403023",3);line(149,178,161,177,"#403023",3);break;
      case "ace": for(const [x,y] of [[48,140],[60,151],[73,140],[183,140],[196,151],[208,140]])dot(x,y,3,"#a36646");break;
      case "sabo": line(184,56,202,161,"#d39779",5);line(191,104,219,123,"#d39779",4);break;
      case "yamato": line(47,67,91,61,"#9f3782",4);line(163,61,208,67,"#9f3782",4);break;
      case "shanks": for(let x=171;x<=201;x+=15)line(x,53,x-6,154,"#a5453b",4);break;
      case "buggy": line(56,53,73,86,"#2254ab",7);line(184,86,200,53,"#2254ab",7);line(50,178,68,199,"#dc2626",5);line(188,199,206,178,"#dc2626",5);break;
      case "boa_hancock": case "vivi": line(47,88,62,84,"#402326",3);line(209,88,194,84,"#402326",3);break;
      case "mihawk":
        line(78,172,112,179,"#252021",4);line(178,172,144,179,"#252021",4);
        poly([[105,195],[128,226],[151,195]],"#252021");break;
    }
  } else {
    switch(id) {
      case "luffy": for(const y of [72,116,160])dot(188,y,6,"#ffe165");break;
      case "zoro": rect(5,207,246,48,"#54a851");for(const y of [218,230,242])line(5,y,251,y,"#256e39",2);break;
      case "nami":
        poly([[8,70],[104,44],[126,106],[14,109]],"#399f4e");poly([[248,70],[152,44],[130,106],[242,109]],"#399f4e");
        for(const y of [64,90]){line(15,y,109,y-12,"#eefbed",10);line(147,y-12,242,y,"#eefbed",10);}
        line(47,8,58,57,"#399f4e",7);line(209,8,198,57,"#399f4e",7);dot(128,107,8,"#fffbea");
        rect(0,225,256,22,"#eb9b27");rect(110,223,36,27,"#fff1b2");break;
      case "usopp":
        rect(0,140,256,116,"#78350f");rect(50,0,25,240,"#d9b47a");rect(181,0,25,240,"#d9b47a");
        dot(62,159,7,"#ffcf57");dot(193,159,7,"#ffcf57");rect(91,173,74,54,"#a96726");break;
      case "sanji": poly([[84,0],[128,66],[172,0]],"#6cadd2");poly([[115,24],[141,24],[133,147],[124,147]],"#152335");poly([[48,0],[98,85],[80,129]],"#343746");poly([[208,0],[158,85],[176,129]],"#343746");for(const y of [152,204]){dot(96,y,5,"#d1ab55");dot(160,y,5,"#d1ab55");}break;
      case "chopper":
        line(43,0,203,234,"#633d25",17);rect(147,144,92,86,"#925830");rect(171,165,43,12,"#fff7ed");rect(186,150,12,43,"#fff7ed");
        poly([[78,0],[128,23],[178,0],[149,40],[106,38]],"#d39852");break;
      case "robin":
        poly([[0,0],[71,0],[122,93],[112,235],[0,235]],"#24549a");poly([[256,0],[185,0],[134,93],[144,235],[256,235]],"#24549a");
        poly([[44,0],[111,88],[79,119]],"#79a6cf");poly([[212,0],[145,88],[177,119]],"#79a6cf");line(128,100,128,233,"#dcbd75",4);dot(128,116,6,"#eac967");rect(0,237,256,18,"#e5a0c4");break;
      case "franky":
        rect(67,0,123,255,"#fcd5b5");for(const [x,y] of [[32,39],[216,107],[27,183],[226,223]]){star(x,y,18,"#ffe983");dot(x,y,6,"#dc2626");}
        line(80,81,171,81,"#e2a086",3);line(128,85,128,180,"#e2a086",3);for(const y of [135,171])line(99,y,159,y,"#e2a086",3);break;
      case "brook": poly([[73,0],[128,92],[183,0]],"#fff3e2");poly([[79,35],[122,59],[82,82]],"#f3aa26");poly([[177,35],[134,59],[173,82]],"#f3aa26");dot(128,59,10,"#f3aa26");for(const y of [125,162,199])dot(128,y,5,"#dbc77e");break;
      case "jinbe":
        for(let x=25;x<256;x+=62)for(let y=35;y<200;y+=69)poly([[x,y-16],[x+16,y],[x,y+16],[x-16,y]],"#fff5cb");
        line(34,0,190,246,"#742c2c",18);line(224,0,118,139,"#742c2c",18);rect(0,204,256,30,"#3e2842");line(0,212,256,212,"#ca6976",3);break;
      case "law": dot(128,126,43,"#242127");dot(128,126,33,"#edca26");line(102,134,154,134,"#242127",5);dot(112,115,4,"#242127");dot(144,115,4,"#242127");for(const [x,y] of [[128,68],[128,184],[70,126],[186,126]])line(x-7,y,x+7,y,"#242127",5);line(83,0,83,56,"#343139",3);line(171,0,171,56,"#343139",3);break;
      case "ace": for(let x=59;x<=197;x+=17)dot(x,29+Math.sin((x-59)/138*Math.PI)*35,8,"#bc302b");rect(0,224,256,18,"#382d23");rect(110,220,36,27,"#b7bbc0");break;
      case "sabo": poly([[74,0],[128,79],[182,0]],"#f7efdc");poly([[94,19],[161,19],[150,49],[104,49]],"#eee7d4");poly([[109,44],[151,44],[142,158],[123,151]],"#e8deca");for(const y of [166,216])dot(173,y,5,"#c5a964");break;
      case "yamato": line(40,0,190,215,"#c32939",13);line(220,0,123,139,"#c32939",13);rect(0,210,256,38,"#943a92");line(0,217,256,217,"#d6a1ce",4);line(0,241,256,241,"#d6a1ce",4);break;
      case "shanks": rect(65,0,126,256,"#f7eddb");poly([[77,0],[128,91],[178,0]],"#f8cb9c");line(129,94,129,243,"#ac9880",3);for(const y of [119,157,195])dot(142,y,4,"#a69580");break;
      case "buggy": for(let y=0;y<256;y+=47)rect(0,y,256,20,"#ffefdf");rect(0,229,256,27,"#183673");dot(128,238,12,"#e8be49");break;
      case "doflamingo":
        poly([[87,0],[128,132],[169,0]],"#f3ca9f");line(86,0,123,127,"#bd8740",5);line(170,0,133,127,"#bd8740",5);
        for(const y of [111,155,199])dot(158,y,5,"#a37b36");break;
      case "boa_hancock":
        poly([[76,0],[128,73],[180,0]],"#f8d5ba");line(73,0,125,78,"#ecc553",5);line(183,0,131,78,"#ecc553",5);
        for(const [x,y] of [[56,127],[195,166],[71,210]]){dot(x,y,16,"#fff1c7");dot(x,y,8,"#b52c40");line(x-13,y+11,x+13,y-11,"#fff1c7",5);}
        rect(0,231,256,13,"#ecc553");break;
      case "vivi":
        poly([[75,0],[128,42],[181,0]],"#f8d8bc");line(74,0,125,46,"#e3c24d",5);line(182,0,131,46,"#e3c24d",5);
        dot(128,52,8,"#e3c24d");rect(0,230,256,15,"#eee8db");break;
      case "mihawk":
        poly([[53,0],[101,103],[77,211]],"#722d40");poly([[203,0],[155,103],[179,211]],"#722d40");
        for(const y of [193,221])dot(90,y,5,"#d7b559");break;
      case "foudubustv": rect(18,30,220,15,"#83d2f3");puzzle(128,132,76,"#f5faff");break;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
  const material = new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.05,roughness:.72,depthWrite:false});
  materials.set(key,material);return material;
}

export default function PassengerCostume({ archetype, face=false }: {
  archetype:NakamaArchetype; width?:number; front?:number; face?:boolean; height?:number;
}) {
  if(face&&archetype.id==="foudubustv")return null;
  const proportions = getPassengerProportions(archetype.id);
  return <mesh name={face?"nakama-face-details":`nakama-${archetype.id}-top`} material={costumeMaterial(archetype.id,face)}
    geometry={getFittedCostumeGeometry(face?proportions.headWidth:proportions.torsoWidth,
      face?proportions.headHeight:proportions.torsoHeight,face?proportions.headDepth:proportions.torsoDepth,
      face?proportions.headRadius:proportions.torsoRadius)} dispose={null}>
  </mesh>;
}
