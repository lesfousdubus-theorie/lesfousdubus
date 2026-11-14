"use client";

import type * as THREE from "three";
import { CREW_SEATS, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z } from "@/lib/bus-layout";
import { DRIVER_DASHBOARD, DRIVER_SEAT_POSITIONS, NAVIGATOR_BAR, STEERING_WHEEL } from "@/lib/driver-arms";
import BusDrivers from "./BusDrivers";
import type { BusMaterials } from "./useBusResources";

interface Props {
  mats: BusMaterials;
  dashTex: THREE.Texture;
  hornPulse: number;
  partyOn: boolean;
  reducedMotion: boolean;
}

/** Static cockpit geometry and its two guides share the parent's original materials. */
export default function BusCockpit({ mats, dashTex, hornPulse, partyOn, reducedMotion }: Props) {
  return <>
      {/* Siège conducteur ergonomique avec appuie-tête et embase (Kamal) */}
      <group name="bus-driver-seat" position={DRIVER_SEAT_POSITIONS.kamal}>
        {/* Embase métallique fixée au plancher */}
        <mesh material={mats.dark} position={[0, 0.77, 0]}>
          <boxGeometry args={[0.22, 0.30, 0.22]} />
        </mesh>
        {/* Coussin d'assise abaissé */}
        <mesh material={mats.seat} position={[0, 1.05, SEAT_CUSHION_Z]}>
          <boxGeometry args={[0.76, 0.12, SEAT_CUSHION_DEPTH]} />
        </mesh>
        {/* Dossier du siège aux proportions harmonieuses */}
        <mesh material={mats.seat} position={[0, 1.32, 0.32]}>
          <boxGeometry args={[0.74, 0.62, 0.12]} />
        </mesh>
        {/* Appuie-tête ajusté */}
        <mesh material={mats.seat} position={[0, 1.70, 0.32]}>
          <boxGeometry args={[0.32, 0.14, 0.10]} />
        </mesh>
        {/* Accoudoir côté fenêtre */}
        <mesh material={mats.dark} position={[-0.40, 1.14, 0.05]}>
          <boxGeometry args={[0.08, 0.08, 0.42]} />
        </mesh>
      </group>

      {/* Les deux navigateurs sont côte à côte, devant le vestibule. */}
      <group name="bus-guide-seat" position={DRIVER_SEAT_POSITIONS.kyta}>
        {/* Embase métallique fixée au plancher */}
        <mesh material={mats.dark} position={[0, 0.77, 0]}>
          <boxGeometry args={[0.22, 0.30, 0.22]} />
        </mesh>
        {/* Coussin d'assise abaissé */}
        <mesh material={mats.seat} position={[0, 1.05, SEAT_CUSHION_Z]}>
          <boxGeometry args={[0.76, 0.12, SEAT_CUSHION_DEPTH]} />
        </mesh>
        {/* Dossier du siège aux proportions harmonieuses */}
        <mesh material={mats.seat} position={[0, 1.32, 0.32]}>
          <boxGeometry args={[0.74, 0.62, 0.12]} />
        </mesh>
        {/* Appuie-tête ajusté */}
        <mesh material={mats.seat} position={[0, 1.70, 0.32]}>
          <boxGeometry args={[0.32, 0.14, 0.10]} />
        </mesh>
        {/* Accoudoir côté fenêtre droite */}
        <mesh material={mats.dark} position={[0.40, 1.14, 0.05]}>
          <boxGeometry args={[0.08, 0.08, 0.42]} />
        </mesh>
      </group>

      {/* CONDUCTEURS DU MONT CORVO : KAMAL AU VOLANT ET KYTA EN CO-PILOTE */}
      <BusDrivers
        hornPulse={hornPulse}
        partyOn={partyOn}
        reducedMotion={reducedMotion}
      />

      {/* Planche de bord complète du bus (jointement continu avec le pare-brise) */}
      <group name="bus-dashboard" position={[0, 0, 0]}>
        {/* Table supérieure de la planche de bord (Deck) : comble l'espace jusqu'au pare-brise */}
        <mesh name="bus-dashboard-deck" material={mats.dark} position={DRIVER_DASHBOARD.deck.position}>
          <boxGeometry args={DRIVER_DASHBOARD.deck.size} />
        </mesh>
        {/* Relevé avant sous la baie de pare-brise */}
        <mesh material={mats.bodyDark} position={[0, 1.62, -4.54]}>
          <boxGeometry args={[2.42, 0.06, 0.10]} />
        </mesh>
        {/* Façade courte ; la paroi basse recule pour laisser les pieds sous le tableau. */}
        <mesh name="bus-dashboard-fascia" material={mats.dark} position={DRIVER_DASHBOARD.fascia.position}>
          <boxGeometry args={DRIVER_DASHBOARD.fascia.size} />
        </mesh>
        <mesh name="bus-dashboard-footwell" material={mats.dark} position={DRIVER_DASHBOARD.footwell.position}>
          <boxGeometry args={DRIVER_DASHBOARD.footwell.size} />
        </mesh>
        {/* Flancs d'habillage latéraux */}
        {[-1.20, 1.20].map((lx) => (
          <mesh key={`dash-cheek-${lx}`} material={mats.dark} position={[lx, 1.10, -4.47]}>
            <boxGeometry args={[0.06, 0.92, 0.26]} />
          </mesh>
        ))}

        {/* Combiné d'instruments avec casquette biseautée face au conducteur */}
        <group name="bus-dashboard-instruments" position={[CREW_SEATS.kamal[0], 1.60, -4.48]}>
          {/* Casquette protectrice de compteur (pare-soleil du combiné) */}
          <mesh material={mats.dark} position={[0, 0.16, -0.02]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.72, 0.04, 0.20]} />
          </mesh>
          <mesh material={mats.dark} position={[-0.35, 0.05, -0.02]}>
            <boxGeometry args={[0.03, 0.22, 0.20]} />
          </mesh>
          <mesh material={mats.dark} position={[0.35, 0.05, -0.02]}>
            <boxGeometry args={[0.03, 0.22, 0.20]} />
          </mesh>
          {/* Cadre de fond encastré du compteur */}
          <mesh material={mats.dark} position={[0, 0.02, -0.01]} rotation={[-0.32, 0, 0]}>
            <boxGeometry args={[0.70, 0.26, 0.03]} />
          </mesh>
          {/* Affichage des instruments rétroéclairés */}
          <mesh position={[0, 0.02, 0.01]} rotation={[-0.32, 0, 0]}>
            <planeGeometry args={[0.68, 0.24]} />
            <meshStandardMaterial
              map={dashTex}
              emissive="#ffffff"
              emissiveMap={dashTex}
              emissiveIntensity={0.85}
              roughness={0.25}
            />
          </mesh>
        </group>

        {/* Colonne de direction et volant réaliste à 3 branches */}
        <group position={[CREW_SEATS.kamal[0], 0, -0.15]}>
          {/* Colonne de direction inclinée sortant du tableau de bord vers le conducteur */}
          <mesh material={mats.dark} position={[0, 1.465, -4.125]} rotation={[0.873, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.483, 12]} />
          </mesh>
          <mesh material={mats.chrome} position={[0, 1.58, -3.985]} rotation={[0.873, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.04, 12]} />
          </mesh>
          {/* Commodos de commande (clignotants / essuie-glaces) */}
          <mesh material={mats.dark} position={[-0.09, 1.58, -3.985]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.12, 0.018, 0.018]} />
          </mesh>
          <mesh material={mats.dark} position={[0.09, 1.58, -3.985]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[0.12, 0.018, 0.018]} />
          </mesh>

          {/* Volant 3 branches complet */}
          <group name="bus-steering-wheel" position={[0, STEERING_WHEEL.y, STEERING_WHEEL.z + .15]} rotation={[STEERING_WHEEL.tilt, 0, 0]}>
            {/* Jante torique du volant */}
            <mesh material={mats.dark}>
              <torusGeometry args={[STEERING_WHEEL.radius, 0.024, 14, 36]} />
            </mesh>
            {/* Moyeu central du volant */}
            <mesh material={mats.dark} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.032, 18]} />
            </mesh>
            {/* Bouton de klaxon One Piece doré au centre du volant */}
            <mesh material={mats.yellow} position={[0, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.042, 0.042, 0.015, 18]} />
            </mesh>
            {/* 3 branches reliant le moyeu à la jante */}
            <mesh material={mats.dark} position={[-0.11, 0, 0]}>
              <boxGeometry args={[0.13, 0.028, 0.016]} />
            </mesh>
            <mesh material={mats.dark} position={[0.11, 0, 0]}>
              <boxGeometry args={[0.13, 0.028, 0.016]} />
            </mesh>
            <mesh material={mats.dark} position={[0, -0.11, 0]}>
              <boxGeometry args={[0.028, 0.13, 0.016]} />
            </mesh>
          </group>
        </group>

        {/* Console centrale du bus */}
        <group position={[0, 0, -.30]}>
          {/* Bloc de console avancé vers l'habitacle */}
          <mesh material={mats.dark} position={[0, 1.34, -4.04]}>
            <boxGeometry args={[0.54, 0.58, 0.18]} />
          </mesh>
          {/* Écran multimédia / GPS Laugh Tale */}
          <mesh material={mats.dark} position={[0, 1.50, -3.94]}>
            <boxGeometry args={[0.42, 0.22, 0.02]} />
          </mesh>
          <mesh position={[0, 1.50, -3.928]}>
            <planeGeometry args={[0.38, 0.18]} />
            <meshStandardMaterial
              color="#072214"
              emissive="#10b981"
              emissiveIntensity={0.65}
              roughness={0.25}
            />
          </mesh>
          {/* Double grille d'aération supérieure de climatisation */}
          {[-0.13, 0.13].map((vx) => (
            <group key={`vent-${vx}`} position={[vx, 1.59, -4.08]}>
              <mesh material={mats.dark}>
                <boxGeometry args={[0.16, 0.06, 0.02]} />
              </mesh>
              <mesh material={mats.chrome} position={[0, 0, 0.005]}>
                <boxGeometry args={[0.14, 0.012, 0.01]} />
              </mesh>
            </group>
          ))}
          {/* Bouton d'arrêt d'urgence rouge "STOP" (champignon d'arrêt du bus) */}
          <group position={[0, 1.32, -3.94]}>
            <mesh material={mats.yellow}>
              <boxGeometry args={[0.09, 0.09, 0.018]} />
            </mesh>
            <mesh material={mats.red} position={[0, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.032, 0.026, 0.024, 16]} />
            </mesh>
          </group>
          {/* Rangée d'interrupteurs de bord à témoins lumineux */}
          {[-0.15, -0.05, 0.05, 0.15].map((sx, idx) => (
            <group key={`switch-${idx}`} position={[sx, 1.20, -3.94]}>
              <mesh material={mats.dark}>
                <boxGeometry args={[0.045, 0.06, 0.015]} />
              </mesh>
              <mesh
                material={idx === 0 ? mats.yellow : idx === 1 ? mats.seat : mats.red}
                position={[0, 0.015, 0.01]}
              >
                <boxGeometry args={[0.025, 0.015, 0.01]} />
              </mesh>
            </group>
          ))}
          {/* Levier de boîte de vitesses automatique */}
          <group position={[-0.18, 1.14, -3.96]}>
            <mesh material={mats.dark}>
              <boxGeometry args={[0.10, 0.04, 0.14]} />
            </mesh>
            <mesh material={mats.chrome} position={[0, 0.08, 0]} rotation={[0.2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            </mesh>
            <mesh material={mats.dark} position={[0, 0.15, 0.02]}>
              <sphereGeometry args={[0.026, 12, 12]} />
            </mesh>
          </group>
        </group>

        {/* Côté passager avant : boîte à gants et barre de maintien */}
        <group position={[CREW_SEATS.kyta[0], 0, 0]}>
          <mesh material={mats.dark} position={[0, 1.48, -4.42]}>
            <boxGeometry args={[0.68, 0.18, 0.14]} />
          </mesh>
          {/* Liseré chromé de boîte à gants */}
          <mesh material={mats.chrome} position={[0, 1.48, -4.34]}>
            <boxGeometry args={[0.64, 0.012, 0.01]} />
          </mesh>
          {/* Barre de maintien passager avant jaune */}
          <mesh name="bus-navigator-bar" material={mats.yellow} position={[0, NAVIGATOR_BAR.y, NAVIGATOR_BAR.z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[NAVIGATOR_BAR.radius, NAVIGATOR_BAR.radius, NAVIGATOR_BAR.width, 10]} />
          </mesh>
        </group>

        {/* Rétroviseur intérieur panoramique fixé sous le pare-brise */}
        <group position={[0, 2.76, -4.50]} rotation={[0.15, 0, 0]}>
          <mesh material={mats.dark}>
            <boxGeometry args={[0.55, 0.16, 0.03]} />
          </mesh>
          <mesh material={mats.chrome} position={[0, 0, 0.016]}>
            <planeGeometry args={[0.52, 0.13]} />
          </mesh>
        </group>
      </group>

  </>;
}
