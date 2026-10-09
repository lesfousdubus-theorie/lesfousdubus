"use client";

import type * as THREE from "three";

type Driver = "kamal" | "kyta";
type Vec3 = [number, number, number];
type Materials = Record<string, THREE.Material>;

function Block({ material, size, position, rotation }: {
  material: THREE.Material;
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
}) {
  return <mesh material={material} position={position} rotation={rotation}>
    <boxGeometry args={size} />
  </mesh>;
}

/** Photo references and the intended simple silhouette are recorded in docs/driver-design.md. */
export function DriverHead({ driver, mats }: { driver: Driver; mats: Materials }) {
  const kamal = driver === "kamal";
  const hair = kamal ? mats.hairKamal : mats.hairKyta;
  const halfWidth = kamal ? 0.122 : 0.116;

  return <group>
    <Block material={mats.skin} size={[halfWidth * 2, 0.27, 0.215]} />
    {/* Small square ears keep the profile readable when orbiting the bus. */}
    {[-1, 1].map(side => <Block key={`ear-${side}`} material={mats.skin}
      position={[side * (halfWidth + 0.013), -0.006, 0.015]} size={[0.035, 0.061, 0.046]} />)}
    <Block material={mats.skin} position={[0, -0.005, -0.124]} size={[0.027, 0.043, 0.033]} />

    {/* The face points towards -Z: every eye layer must be further forward,
        with real depth separation rather than polygon-offset tricks. */}
    {[-0.056, 0.056].map((x, index) => <group key={`eye-${x}`} position={[x, 0.021, -0.112]}>
      <Block material={mats.eyeHighlight} size={[0.049, 0.026, 0.008]} />
      <Block material={mats.eyesIris} position={[0, 0, -0.007]} size={[0.024, 0.026, 0.005]} />
      <Block material={mats.eyesPupil} position={[0, 0, -0.012]} size={[0.011, 0.020, 0.004]} />
      <Block material={mats.eyeHighlight} position={[-0.005, 0.006, -0.017]} size={[0.006, 0.006, 0.003]} />
      <Block material={mats.eyebrow} position={[0, 0.039, -0.003]} size={[0.055, 0.011, 0.008]}
        rotation={[0, 0, index === 0 ? 0.08 : -0.08]} />
    </group>)}
    <Block material={mats.smile} position={[0, -0.073, -0.114]} size={[kamal ? 0.079 : 0.068, 0.012, 0.008]} />
    {[-1, 1].map(side => <Block key={`smile-${side}`} material={mats.smile}
      position={[side * (kamal ? 0.037 : 0.032), -0.066, -0.114]} size={[0.009, 0.017, 0.008]} />)}

    {/* Short sides, a low back and a few broad locks instead of a cubic helmet. */}
    <Block material={hair} position={[0, 0.129, 0.009]} size={[halfWidth * 2 + 0.012, 0.066, 0.228]} />
    <Block material={hair} position={[0, 0.047, 0.113]} size={[halfWidth * 2, 0.18, 0.021]} />
    {[-1, 1].map(side => <Block key={`hair-side-${side}`} material={hair}
      position={[side * (halfWidth + 0.002), 0.067, 0.038]} size={[0.019, 0.12, 0.155]} />)}

    {kamal ? <group>
      {/* Raised asymmetric quiff, recognisable from the striped-shirt photos. */}
      <Block material={hair} position={[-0.064, 0.158, -0.029]} size={[0.093, 0.079, 0.15]} rotation={[-0.16, 0, -0.25]} />
      <Block material={hair} position={[0.019, 0.18, -0.015]} size={[0.112, 0.085, 0.166]} rotation={[-0.22, 0, -0.15]} />
      <Block material={hair} position={[0.083, 0.146, -0.016]} size={[0.061, 0.071, 0.16]} rotation={[-0.08, 0, -0.27]} />
      <Block material={mats.hairHighlight} position={[0.014, 0.215, -0.04]} size={[0.093, 0.009, 0.067]} rotation={[-0.22, 0, -0.15]} />
    </group> : <group>
      {/* Flatter side part, with a clear forehead. */}
      <Block material={hair} position={[-0.046, 0.166, -0.008]} size={[0.134, 0.073, 0.20]} rotation={[-0.09, 0, 0.16]} />
      <Block material={hair} position={[0.08, 0.142, 0.007]} size={[0.075, 0.066, 0.196]} rotation={[0, 0, -0.16]} />
      <Block material={mats.hairHighlight} position={[-0.059, 0.195, -0.041]} size={[0.092, 0.008, 0.071]} rotation={[-0.09, 0, 0.16]} />
    </group>}
  </group>;
}

export function DriverShirt({ driver, mats }: { driver: Driver; mats: Materials }) {
  if (driver === "kamal") {
    return <group>
      {[-2, -1, 0, 1, 2].map(band => <Block key={band}
        material={Math.abs(band) === 1 ? mats.shirtStripe : mats.kamalShirt}
        position={[0, band * 0.104, 0]} size={[0.36, 0.104, 0.24]} />)}
      <Block material={mats.kamalShirt} position={[0, 0.265, -0.004]} size={[0.14, 0.02, 0.14]} />
    </group>;
  }
  return <group>
    <Block material={mats.kytaShirt} size={[0.36, 0.52, 0.24]} />
    {/* White tee between the two open blue panels; no overlapping fabric faces. */}
    <Block material={mats.kamalShirt} position={[0, 0.012, -0.124]} size={[0.107, 0.46, 0.009]} />
    {[-1, 1].map(side => <group key={`shirt-${side}`}>
      <Block material={mats.kytaShirt} position={[side * 0.073, 0.216, -0.134]}
        size={[0.061, 0.087, 0.022]} rotation={[0, 0, side * 0.28]} />
      <Block material={mats.kytaShirt} position={[side * 0.128, 0.056, -0.127]}
        size={[0.061, 0.062, 0.01]} />
    </group>)}
  </group>;
}
