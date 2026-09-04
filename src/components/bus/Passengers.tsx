"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export interface NakamaArchetype {
  id: string;
  name: string;
  skinColor: string;
  hairColor: string;
  hairStyle: "spiky" | "crop" | "flowing" | "swoop" | "afro" | "pompadour" | "topknot" | "wavy" | "shaggy";
  shirtColor: string;
  pantsColor: string;
  accessory?:
    | "straw_hat"
    | "earrings"
    | "goggles"
    | "reindeer_hat"
    | "top_hat"
    | "sunglasses"
    | "white_cap"
    | "cowboy_hat"
    | "horns"
    | "clown_nose"
    | "none";
  accessoryColor?: string;
  accessorySubColor?: string;
  prop?: "meat" | "swords" | "book" | "violin" | "slingshot" | "sake" | "cane" | "tangerine";
  expression?: "grin" | "cool" | "smile" | "funny" | "stoic" | "singing";
}

export const NAKAMA_ROSTER: NakamaArchetype[] = [
  {
    id: "luffy",
    name: "Monkey D. Luffy",
    skinColor: "#fcd5b5",
    hairColor: "#171717",
    hairStyle: "spiky",
    shirtColor: "#dc2626", // Gilet rouge écarlate
    pantsColor: "#2563eb", // Short bleu jean
    accessory: "straw_hat",
    accessoryColor: "#ffc94a",
    accessorySubColor: "#dc1824",
    prop: "meat",
    expression: "grin",
  },
  {
    id: "zoro",
    name: "Roronoa Zoro",
    skinColor: "#f8cb9c",
    hairColor: "#16a34a", // Cheveux vert marimo
    hairStyle: "crop",
    shirtColor: "#14532d", // Manteau vert foncé & haramaki
    pantsColor: "#166534",
    accessory: "earrings",
    accessoryColor: "#fbbf24",
    prop: "swords",
    expression: "cool",
  },
  {
    id: "nami",
    name: "Nami",
    skinColor: "#ffdfba",
    hairColor: "#ea580c", // Cheveux mandarine flamboyants
    hairStyle: "flowing",
    shirtColor: "#0284c7", // Haut rayé bleu & blanc
    pantsColor: "#1d4ed8",
    accessory: "none",
    prop: "tangerine",
    expression: "smile",
  },
  {
    id: "usopp",
    name: "Usopp",
    skinColor: "#d97706",
    hairColor: "#18181b",
    hairStyle: "afro",
    shirtColor: "#92400e", // Salopette marron
    pantsColor: "#78350f",
    accessory: "goggles",
    accessoryColor: "#eab308",
    prop: "slingshot",
    expression: "funny",
  },
  {
    id: "sanji",
    name: "Sanji",
    skinColor: "#fcd5b5",
    hairColor: "#eab308", // Mèche blonde tombante
    hairStyle: "swoop",
    shirtColor: "#18181b", // Costume noir avec chemise bleue
    pantsColor: "#18181b",
    accessory: "none",
    expression: "cool",
  },
  {
    id: "chopper",
    name: "Tony Tony Chopper",
    skinColor: "#b45309", // Pelage renne
    hairColor: "#78350f",
    hairStyle: "crop",
    shirtColor: "#be185d", // Short bordeaux
    pantsColor: "#9d174d",
    accessory: "reindeer_hat",
    accessoryColor: "#ec4899",
    accessorySubColor: "#ffffff",
    expression: "smile",
  },
  {
    id: "robin",
    name: "Nico Robin",
    skinColor: "#fed7aa",
    hairColor: "#09090b", // Longs cheveux sombres soyeux
    hairStyle: "flowing",
    shirtColor: "#6b21a8", // Robe violette noble
    pantsColor: "#581c87",
    accessory: "sunglasses",
    accessoryColor: "#ea580c",
    prop: "book",
    expression: "smile",
  },
  {
    id: "franky",
    name: "Franky",
    skinColor: "#fcd5b5",
    hairColor: "#06b6d4", // Banane pompadour cyan
    hairStyle: "pompadour",
    shirtColor: "#dc2626", // Chemise hawaïenne rouge
    pantsColor: "#0891b2",
    accessory: "sunglasses",
    accessoryColor: "#18181b",
    expression: "grin",
  },
  {
    id: "brook",
    name: "Brook",
    skinColor: "#f5f5f4", // Os de squelette blanc ivoire !
    hairColor: "#09090b", // Immense afro noir
    hairStyle: "afro",
    shirtColor: "#312e81", // Costume dandy et jabot orange
    pantsColor: "#1e1b4b",
    accessory: "top_hat",
    accessoryColor: "#18181b",
    accessorySubColor: "#f59e0b",
    prop: "violin",
    expression: "singing",
  },
  {
    id: "jinbe",
    name: "Jinbe",
    skinColor: "#38bdf8", // Homme-poisson bleu azur
    hairColor: "#09090b",
    hairStyle: "topknot",
    shirtColor: "#f59e0b", // Gi traditionnel soleil doré
    pantsColor: "#d97706",
    accessory: "none",
    prop: "sake",
    expression: "stoic",
  },
  {
    id: "law",
    name: "Trafalgar Law",
    skinColor: "#fed7aa",
    hairColor: "#18181b",
    hairStyle: "shaggy",
    shirtColor: "#eab308", // Sweat jaune Jolly Roger
    pantsColor: "#1e293b",
    accessory: "white_cap",
    accessoryColor: "#f8fafc",
    accessorySubColor: "#1e293b",
    prop: "swords",
    expression: "cool",
  },
  {
    id: "ace",
    name: "Portgas D. Ace",
    skinColor: "#f8cb9c",
    hairColor: "#18181b",
    hairStyle: "wavy",
    shirtColor: "#ea580c", // Torse d'acier & collier de perles
    pantsColor: "#1e293b",
    accessory: "cowboy_hat",
    accessoryColor: "#ea580c",
    accessorySubColor: "#dc2626",
    expression: "grin",
  },
  {
    id: "sabo",
    name: "Sabo",
    skinColor: "#fed7aa",
    hairColor: "#fde047", // Cheveux blonds ondulés
    hairStyle: "wavy",
    shirtColor: "#1e3a8a", // Manteau noble bleu roi
    pantsColor: "#172554",
    accessory: "top_hat",
    accessoryColor: "#1e293b",
    accessorySubColor: "#0284c7",
    prop: "cane",
    expression: "smile",
  },
  {
    id: "yamato",
    name: "Yamato",
    skinColor: "#ffedd5",
    hairColor: "#f1f5f9", // Blanc avec dégradé vert turquoise
    hairStyle: "flowing",
    shirtColor: "#ffffff", // Robe miko blanche immaculée
    pantsColor: "#dc2626",
    accessory: "horns",
    accessoryColor: "#dc2626",
    accessorySubColor: "#f97316",
    expression: "grin",
  },
  {
    id: "shanks",
    name: "Shanks le Roux",
    skinColor: "#f8cb9c",
    hairColor: "#b91c1c", // Cheveux rouge sang
    hairStyle: "flowing",
    shirtColor: "#1c1917", // Cape de pirate & chemise blanche
    pantsColor: "#9a3412",
    accessory: "none",
    prop: "swords",
    expression: "smile",
  },
  {
    id: "buggy",
    name: "Buggy le Clown",
    skinColor: "#fed7aa",
    hairColor: "#0284c7", // Nattes bleues
    hairStyle: "flowing",
    shirtColor: "#dc2626", // Rayures de clown
    pantsColor: "#1e3a8a",
    accessory: "clown_nose",
    accessoryColor: "#ef4444",
    expression: "funny",
  },
];

export const BASE_ROWS = 6;

/**
 * Calcule le nombre de rangées nécessaires pour asseoir `passengerCount` personnes.
 * Les 6 rangées de base disposent de 22 places assises (+ 1 place réservée pour le joueur).
 * Chaque rangée supplémentaire au-delà de 6 ajoute 4 places assises.
 */
export function computeNumRows(passengerCount: number): number {
  if (passengerCount <= 22) return BASE_ROWS;
  return BASE_ROWS + Math.ceil((passengerCount - 22) / 4);
}

export interface SeatInfo {
  x: number;
  z: number;
  row: number;
  seatInRow: number;
}

/**
 * Calcule toutes les places assises disponibles pour `numRows` rangées.
 * La place occupée par le joueur (`reservedRow`, par défaut 3) côté droit
 * est réservée afin d'éviter tout clipping avec la caméra SEAT_EYE.
 */
export function getSeatPositions(
  numRows: number,
  reservedRow = 3,
  firstRowZ = -2.6,
  rowSpacing = 1.2,
): SeatInfo[] {
  const seats: SeatInfo[] = [];

  for (let r = 0; r < numRows; r++) {
    const z = firstRowZ + r * rowSpacing;

    // Côté gauche : place fenêtre & place couloir
    seats.push({ x: -0.94, z, row: r, seatInRow: 0 });
    seats.push({ x: -0.50, z, row: r, seatInRow: 1 });

    // Côté droit : réservé dans la rangée active du joueur
    if (r !== reservedRow) {
      seats.push({ x: 0.50, z, row: r, seatInRow: 2 });
      seats.push({ x: 0.94, z, row: r, seatInRow: 3 });
    }
  }

  return seats;
}

const ARCHETYPE_MATS_CACHE = new Map<string, Record<string, THREE.Material>>();

function getArchetypeMaterials(archetype: NakamaArchetype): Record<string, THREE.Material> {
  const existing = ARCHETYPE_MATS_CACHE.get(archetype.id);
  if (existing) return existing;

  const mats: Record<string, THREE.Material> = {
    skin: new THREE.MeshStandardMaterial({
      color: archetype.skinColor,
      roughness: 0.6,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: archetype.hairColor,
      roughness: 0.7,
    }),
    shirt: new THREE.MeshStandardMaterial({
      color: archetype.shirtColor,
      roughness: 0.55,
    }),
    pants: new THREE.MeshStandardMaterial({
      color: archetype.pantsColor,
      roughness: 0.65,
    }),
    shoes: new THREE.MeshStandardMaterial({
      color: "#18181c",
      roughness: 0.85,
    }),
    accessory: new THREE.MeshStandardMaterial({
      color: archetype.accessoryColor ?? "#ffd23f",
      roughness: 0.4,
    }),
    accessorySub: new THREE.MeshStandardMaterial({
      color: archetype.accessorySubColor ?? "#dc1824",
      roughness: 0.4,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: "#ffd23f",
      metalness: 0.85,
      roughness: 0.25,
    }),
    eyes: new THREE.MeshBasicMaterial({ color: "#111113" }),
    teeth: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    dark: new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8, roughness: 0.2 }),
    red: new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.5 }),
  };

  ARCHETYPE_MATS_CACHE.set(archetype.id, mats);
  return mats;
}

interface PassengersProps {
  passengerCount: number;
  numRows: number;
  hornPulse: number;
  reservedRow?: number;
}

export default function Passengers({
  passengerCount,
  numRows,
  hornPulse,
  reservedRow = 3,
}: PassengersProps) {
  const seats = useMemo(() => getSeatPositions(numRows, reservedRow), [numRows, reservedRow]);

  // Nombre de passagers visibles à bord
  const visibleCount = Math.min(Math.max(0, passengerCount), seats.length);

  return (
    <group>
      {seats.slice(0, visibleCount).map((seat, i) => {
        const archetype = NAKAMA_ROSTER[i % NAKAMA_ROSTER.length];
        return (
          <Passenger
            key={`p-${i}-${archetype.id}`}
            seat={seat}
            index={i}
            archetype={archetype}
            hornPulse={hornPulse}
          />
        );
      })}
    </group>
  );
}

function Passenger({
  seat,
  index,
  archetype,
  hornPulse,
}: {
  seat: SeatInfo;
  index: number;
  archetype: NakamaArchetype;
  hornPulse: number;
}) {
  const group = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const torsoGroup = useRef<THREE.Group>(null);

  // Matériaux partagés et mis en cache par archetype
  const mats = useMemo(() => getArchetypeMaterials(archetype), [archetype]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const seed = index * 0.73;

    // Réaction au klaxon : bond de joie synchronisé
    const sinceHorn = (performance.now() - hornPulse) / 1000;
    const isHonking = sinceHorn < 0.85;
    const cheerBounce = isHonking ? Math.sin(sinceHorn * 24) * (0.85 - sinceHorn) * 0.14 : 0;
    const cheerLean = isHonking ? Math.sin(sinceHorn * 16) * 0.12 : 0;

    if (group.current) {
      group.current.position.y = cheerBounce;
    }

    // Balancement naturel de la tête (respiration & regard par la fenêtre ou voisin)
    if (headGroup.current) {
      const bob = Math.sin(t * 3.2 + seed) * 0.025;
      const sway = Math.sin(t * 1.1 + seed * 1.5) * 0.07;
      headGroup.current.rotation.x = bob + (isHonking ? -0.15 : 0);
      headGroup.current.rotation.y = sway + (seat.x < 0 ? -0.05 : 0.05) + cheerLean;
    }

    // Mouvement subtil de respiration du torse
    if (torsoGroup.current) {
      const breath = 1 + Math.sin(t * 2.2 + seed) * 0.015;
      torsoGroup.current.scale.set(breath, 1, breath);
    }
  });

  return (
    <group ref={group} position={[seat.x, 0, seat.z]}>
      {/* ---------- JAMBES ASSISES & PIEDS ---------- */}
      {/* Bassin posé sur le coussin du siège */}
      <mesh material={mats.pants} position={[0, 1.15, 0.12]} castShadow>
        <boxGeometry args={[0.34, 0.14, 0.28]} />
      </mesh>

      {/* Cuisses horizontales allant vers l'avant */}
      {[-0.09, 0.09].map((lx) => (
        <mesh key={lx} material={mats.pants} position={[lx, 1.15, -0.06]} castShadow>
          <boxGeometry args={[0.13, 0.12, 0.32]} />
        </mesh>
      ))}

      {/* Mollets verticaux descendant vers le sol */}
      {[-0.09, 0.09].map((lx) => (
        <mesh key={lx} material={mats.pants} position={[lx, 0.88, -0.21]} castShadow>
          <boxGeometry args={[0.12, 0.42, 0.12]} />
        </mesh>
      ))}

      {/* Chaussures posées au sol */}
      {[-0.09, 0.09].map((lx) => (
        <mesh key={lx} material={mats.shoes} position={[lx, 0.65, -0.24]} castShadow>
          <boxGeometry args={[0.13, 0.08, 0.2]} />
        </mesh>
      ))}

      {/* ---------- TORSE & BRAS ---------- */}
      <group ref={torsoGroup} position={[0, 1.42, 0.14]}>
        {/* Buste adossé au dossier */}
        <mesh material={mats.shirt} rotation={[-0.05, 0, 0]} castShadow>
          <boxGeometry args={[0.34, 0.4, 0.22]} />
        </mesh>

        {/* Détail torse Luffy : croix cicatrice ou torse ouvert */}
        {archetype.id === "luffy" && (
          <mesh position={[0, 0.02, -0.115]}>
            <planeGeometry args={[0.12, 0.24]} />
            <meshStandardMaterial color={archetype.skinColor} />
          </mesh>
        )}

        {/* Épaules & bras */}
        {[-0.2, 0.2].map((ax, ai) => (
          <group key={ai} position={[ax, 0.14, 0]}>
            {/* Bras supérieur */}
            <mesh
              material={mats.shirt}
              position={[0, -0.1, 0]}
              rotation={[0.25, 0, ai === 0 ? -0.15 : 0.15]}
              castShadow
            >
              <cylinderGeometry args={[0.05, 0.045, 0.24, 8]} />
            </mesh>
            {/* Avant-bras reposant sur les genoux */}
            <mesh
              material={mats.skin}
              position={[0, -0.22, -0.12]}
              rotation={[-0.8, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.045, 0.04, 0.24, 8]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Cou */}
      <mesh material={mats.skin} position={[0, 1.66, 0.14]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
      </mesh>

      {/* ---------- TÊTE & VISAGE ANIMÉ ---------- */}
      <group ref={headGroup} position={[0, 1.82, 0.14]}>
        {/* Tête */}
        <mesh material={mats.skin} castShadow>
          <boxGeometry args={[0.22, 0.24, 0.2]} />
        </mesh>

        {/* Yeux stylisés animés */}
        {[-0.055, 0.055].map((ex) => (
          <mesh key={ex} material={mats.eyes} position={[ex, 0.02, -0.104]}>
            <boxGeometry args={[0.035, 0.035, 0.01]} />
          </mesh>
        ))}

        {/* Expressions du visage */}
        {archetype.expression === "grin" ? (
          // Grand sourire éclatant avec dents (Luffy, Franky, Ace)
          <mesh material={mats.teeth} position={[0, -0.05, -0.104]}>
            <boxGeometry args={[0.11, 0.035, 0.01]} />
          </mesh>
        ) : archetype.expression === "smile" ? (
          // Sourire bienveillant (Nami, Robin, Chopper)
          <mesh material={mats.dark} position={[0, -0.05, -0.104]}>
            <boxGeometry args={[0.08, 0.015, 0.01]} />
          </mesh>
        ) : archetype.expression === "funny" ? (
          // Expression drôle (Usopp, Buggy)
          <mesh material={mats.dark} position={[0, -0.05, -0.104]}>
            <boxGeometry args={[0.09, 0.03, 0.01]} />
          </mesh>
        ) : null}

        {/* Nez long d'Usopp */}
        {archetype.id === "usopp" && (
          <mesh material={mats.skin} position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.16, 8]} />
          </mesh>
        )}

        {/* Nez rouge de Buggy */}
        {archetype.accessory === "clown_nose" && (
          <mesh material={mats.red} position={[0, 0, -0.12]}>
            <sphereGeometry args={[0.045, 12, 12]} />
          </mesh>
        )}

        {/* ---------- CHEVEUX SELON ARCHETYPE ---------- */}
        <HairStyle style={archetype.hairStyle} mats={mats} />

        {/* ---------- ACCESSOIRES DISTINCTIFS ---------- */}
        <Accessory archetype={archetype} mats={mats} />
      </group>

      {/* ---------- PROPS & OBJETS TENUS ---------- */}
      <NakamaProp prop={archetype.prop} mats={mats} />
    </group>
  );
}

/** Styles de cheveux 3D manga */
function HairStyle({
  style,
  mats,
}: {
  style: NakamaArchetype["hairStyle"];
  mats: Record<string, THREE.Material>;
}) {
  switch (style) {
    case "spiky":
      // Cheveux hérissés (Luffy)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          {[-0.08, 0, 0.08].map((hx, hi) => (
            <mesh
              key={hi}
              material={mats.hair}
              position={[hx, 0.16, -0.04]}
              rotation={[-0.2, 0, (hi - 1) * 0.3]}
            >
              <coneGeometry args={[0.045, 0.12, 4]} />
            </mesh>
          ))}
        </group>
      );

    case "crop":
      // Cheveux courts marimo (Zoro, Chopper)
      return (
        <mesh material={mats.hair} position={[0, 0.08, 0.01]}>
          <boxGeometry args={[0.24, 0.16, 0.22]} />
        </mesh>
      );

    case "flowing":
      // Longs cheveux (Nami, Robin, Yamato, Shanks, Buggy)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          {/* Mèches longues tombant sur les épaules */}
          {[-0.12, 0.12].map((lx) => (
            <mesh key={lx} material={mats.hair} position={[lx, -0.06, 0.04]} rotation={[0.1, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.045, 0.28, 6]} />
            </mesh>
          ))}
          <mesh material={mats.hair} position={[0, -0.08, 0.11]}>
            <boxGeometry args={[0.22, 0.26, 0.04]} />
          </mesh>
        </group>
      );

    case "swoop":
      // Mèche asymétrique tombante (Sanji)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          <mesh material={mats.hair} position={[0.06, 0.02, -0.11]} rotation={[0, 0, -0.45]}>
            <boxGeometry args={[0.1, 0.18, 0.03]} />
          </mesh>
        </group>
      );

    case "afro":
      // Afro volumineux (Brook, Usopp)
      return (
        <mesh material={mats.hair} position={[0, 0.1, 0.04]}>
          <sphereGeometry args={[0.22, 14, 14]} />
        </mesh>
      );

    case "pompadour":
      // Banane rockeur Franky
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          <mesh
            material={mats.hair}
            position={[0, 0.18, -0.06]}
            rotation={[-0.4, 0, 0]}
          >
            <cylinderGeometry args={[0.08, 0.09, 0.24, 8]} />
          </mesh>
        </group>
      );

    case "topknot":
      // Chignon samouraï (Jinbe)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          <mesh material={mats.hair} position={[0, 0.2, 0.05]}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
        </group>
      );

    case "wavy":
    case "shaggy":
    default:
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          {[-0.11, 0.11].map((wx) => (
            <mesh key={wx} material={mats.hair} position={[wx, -0.02, 0.02]}>
              <cylinderGeometry args={[0.03, 0.04, 0.16, 6]} />
            </mesh>
          ))}
        </group>
      );
  }
}

/** Chapeaux et accessoires fidèles de l'univers One Piece */
function Accessory({
  archetype,
  mats,
}: {
  archetype: NakamaArchetype;
  mats: Record<string, THREE.Material>;
}) {
  switch (archetype.accessory) {
    case "straw_hat":
      // Chapeau de paille de Luffy (accroché dans le dos ou sur la tête)
      return (
        <group position={[0, 0.18, 0.04]} rotation={[-0.2, 0, 0]}>
          {/* Bord large */}
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
          </mesh>
          {/* Calotte */}
          <mesh material={mats.accessory} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.08, 20]} />
          </mesh>
          {/* Ruban rouge */}
          <mesh material={mats.accessorySub} position={[0, 0.025, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.03, 20]} />
          </mesh>
        </group>
      );

    case "earrings":
      // 3 anneaux dorés de Zoro à l'oreille gauche
      return (
        <group position={[-0.12, -0.02, 0]}>
          {[0, 0.025, 0.05].map((ez) => (
            <mesh key={ez} material={mats.gold} position={[0, 0, ez]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.015, 0.004, 6, 12]} />
            </mesh>
          ))}
        </group>
      );

    case "goggles":
      // Lunettes de tireur d'élite d'Usopp
      return (
        <group position={[0, 0.12, -0.09]}>
          {[-0.05, 0.05].map((gx) => (
            <mesh key={gx} material={mats.gold} position={[gx, 0, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            </mesh>
          ))}
          <mesh material={mats.dark} position={[0, 0, 0.02]}>
            <boxGeometry args={[0.2, 0.02, 0.02]} />
          </mesh>
        </group>
      );

    case "reindeer_hat":
      // Chapeau rose à cornes de renne de Chopper
      return (
        <group position={[0, 0.14, 0]}>
          {/* Dôme rose */}
          <mesh material={mats.accessory}>
            <sphereGeometry args={[0.18, 16, 16]} />
          </mesh>
          {/* Croix médicale blanche */}
          <mesh material={mats.accessorySub} position={[0, 0.04, -0.16]}>
            <boxGeometry args={[0.08, 0.025, 0.01]} />
          </mesh>
          <mesh material={mats.accessorySub} position={[0, 0.04, -0.16]}>
            <boxGeometry args={[0.025, 0.08, 0.01]} />
          </mesh>
          {/* Bois de renne */}
          {[-0.15, 0.15].map((bx, bi) => (
            <group key={bi} position={[bx, 0.12, 0]} rotation={[0, 0, bi === 0 ? 0.4 : -0.4]}>
              <mesh material={mats.dark}>
                <cylinderGeometry args={[0.02, 0.03, 0.16, 6]} />
              </mesh>
              <mesh material={mats.dark} position={[0.03, 0.04, 0]} rotation={[0, 0, 0.6]}>
                <cylinderGeometry args={[0.015, 0.02, 0.08, 6]} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case "top_hat":
      // Haut-de-forme (Brook, Sabo)
      return (
        <group position={[0, 0.22, 0.02]}>
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 20]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.22, 20]} />
          </mesh>
          {/* Ruban coloré */}
          <mesh material={mats.accessorySub} position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.04, 20]} />
          </mesh>
        </group>
      );

    case "sunglasses":
      // Lunettes de soleil (Robin, Franky)
      return (
        <group position={[0, 0.1, -0.1]}>
          <mesh material={mats.accessory}>
            <boxGeometry args={[0.18, 0.035, 0.03]} />
          </mesh>
        </group>
      );

    case "white_cap":
      // Béret moucheté de Law
      return (
        <group position={[0, 0.14, 0]}>
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.15, 0.13, 0.1, 16]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.03, -0.08]}>
            <boxGeometry args={[0.16, 0.02, 0.06]} />
          </mesh>
        </group>
      );

    case "cowboy_hat":
      // Chapeau de cowboy d'Ace
      return (
        <group position={[0, 0.18, 0.02]}>
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.1, 20]} />
          </mesh>
          {/* Collier de perles rouges */}
          <mesh material={mats.accessorySub} position={[0, 0.02, 0]}>
            <torusGeometry args={[0.12, 0.012, 6, 16]} />
          </mesh>
        </group>
      );

    case "horns":
      // Cornes oni de Yamato
      return (
        <group position={[0, 0.12, -0.04]}>
          {[-0.08, 0.08].map((hx, hi) => (
            <mesh
              key={hi}
              material={mats.accessory}
              position={[hx, 0.06, 0]}
              rotation={[0.2, 0, hi === 0 ? 0.35 : -0.35]}
            >
              <coneGeometry args={[0.025, 0.14, 8]} />
            </mesh>
          ))}
        </group>
      );

    default:
      return null;
  }
}

/** Objets emblématiques tenus par les nakama */
function NakamaProp({
  prop,
  mats,
}: {
  prop?: NakamaArchetype["prop"];
  mats: Record<string, THREE.Material>;
}) {
  switch (prop) {
    case "meat":
      // Gigot d'anime légendaire de Luffy
      return (
        <group position={[0.12, 1.25, -0.16]} rotation={[0.4, 0.3, -0.2]}>
          {/* Os traversant */}
          <mesh material={mats.skin}>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
          </mesh>
          {/* Viande rôtie appétissante */}
          <mesh material={mats.accessorySub} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 10]} />
          </mesh>
        </group>
      );

    case "swords":
      // Katanas de Zoro / Law
      return (
        <group position={[0.22, 1.05, 0.05]} rotation={[-0.3, 0.1, 0.2]}>
          {[-0.03, 0, 0.03].map((sx, si) => (
            <mesh key={si} material={si === 0 ? mats.skin : si === 1 ? mats.red : mats.dark} position={[sx, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.75, 6]} />
            </mesh>
          ))}
        </group>
      );

    case "book":
      // Livre d'histoire ancienne de Robin
      return (
        <group position={[0, 1.22, -0.1]} rotation={[-0.3, 0, 0]}>
          <mesh material={mats.shirt}>
            <boxGeometry args={[0.2, 0.03, 0.15]} />
          </mesh>
        </group>
      );

    case "violin":
      // Violon de Brook
      return (
        <group position={[-0.05, 1.25, -0.12]} rotation={[0.3, 0.2, 0.4]}>
          <mesh material={mats.accessory}>
            <boxGeometry args={[0.09, 0.18, 0.04]} />
          </mesh>
          <mesh material={mats.dark} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.14, 6]} />
          </mesh>
        </group>
      );

    case "tangerine":
      // Mandarine de Nami
      return (
        <mesh material={mats.accessory} position={[0.15, 1.2, -0.12]}>
          <sphereGeometry args={[0.04, 10, 10]} />
        </mesh>
      );

    case "sake":
      // Gourde de saké de Jinbe
      return (
        <group position={[0.18, 1.15, -0.1]}>
          <mesh material={mats.skin}>
            <sphereGeometry args={[0.06, 10, 10]} />
          </mesh>
          <mesh material={mats.skin} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.05, 8]} />
          </mesh>
        </group>
      );

    case "slingshot":
    case "cane":
    default:
      return null;
  }
}
