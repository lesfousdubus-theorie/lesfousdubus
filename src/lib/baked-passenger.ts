import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type IdentityRole = "body"|"head"|"neck"|"legs"|"upperLeft"|"upperRight"|"foreLeft"|"foreRight"|"signatureLeft"|"signatureRight"|"rest";
export interface IdentityPart { role: IdentityRole; geometry: THREE.BufferGeometry; material: THREE.Material }
export const bakedPassengerIdentities = new Map<string, IdentityPart[]>();
const solidMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72 });

/** Regroupe les vrais volumes du modèle, en conservant les textures de costume.
 * Les couleurs unies partagent un matériau par sommets, donc un seul draw par rôle. */
export function bakePassengerIdentity(root: THREE.Group): IdentityPart[] {
  root.updateMatrixWorld(true);
  const arm = (side: string) => root.getObjectByName(`nakama-arm-${side}`)?.children[0];
  const fore = (side: string) => root.getObjectByName(`nakama-elbow-${side}`)?.children[0];
  const sources: Array<[IdentityRole,THREE.Object3D|undefined]> = [
    ["body",root.getObjectByName("nakama-torso")],["head",root.getObjectByName("nakama-head")],
    ["neck",root.getObjectByName("nakama-neck")],["legs",root.getObjectByName("nakama-hips")],
    ["upperLeft",arm("left")],["upperRight",arm("right")],["foreLeft",fore("left")],["foreRight",fore("right")],
    ["signatureLeft",root.getObjectByName("nakama-signature-left")],["signatureRight",root.getObjectByName("nakama-signature-right")],
    ["rest",root.getObjectByName("nakama-resting-props")],
  ];
  const result: IdentityPart[] = [], relative = new THREE.Matrix4();
  for (const [role,source] of sources) {
    if (!source) continue;
    const inverse = source.matrixWorld.clone().invert();
    const batches = new Map<THREE.Material,{geometries:THREE.BufferGeometry[];names:Set<string>}>();
    const visit = (object: THREE.Object3D) => {
      if(role==="legs"&&object.name==="nakama-upper-body")return;
      if(object instanceof THREE.Mesh && object.geometry){
        const material = object.material as THREE.MeshStandardMaterial;
        const mapped = Boolean(material.map || material.transparent);
        const target = mapped ? material : solidMaterial;
        let batch = batches.get(target);
        if (!batch) { batch = { geometries:[],names:new Set() }; batches.set(target,batch); }
        let geometry = object.geometry.clone();
        if (geometry.index) { const flat=geometry.toNonIndexed();geometry.dispose();geometry=flat; }
        relative.multiplyMatrices(inverse,object.matrixWorld);geometry.applyMatrix4(relative);
        for (const key of Object.keys(geometry.attributes)) if(!["position","normal","uv"].includes(key))geometry.deleteAttribute(key);
        if(!geometry.attributes.normal)geometry.computeVertexNormals();
        if(!geometry.attributes.uv)geometry.setAttribute("uv",new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
        if(!mapped){
          const color = material.color ?? new THREE.Color("white"), colors = new Float32Array(geometry.attributes.position.count*3);
          for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
          geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
        }
        batch.geometries.push(geometry);
        let parent:THREE.Object3D|null=object;
        while(parent&&parent!==source.parent){if(parent.name)batch.names.add(parent.name);parent=parent.parent;}
      }
      object.children.forEach(visit);
    };
    visit(source);
    for(const [material,batch] of batches){
      const geometry=mergeGeometries(batch.geometries)!;
      batch.geometries.forEach(part=>part.dispose());
      geometry.computeBoundingSphere();geometry.userData.sourceNames=[...batch.names];
      result.push({role,geometry,material});
    }
  }
  return result;
}
