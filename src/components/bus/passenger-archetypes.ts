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
    shirtColor: "#399f4e", // Haut vert et blanc, jean et ceinture
    pantsColor: "#1d4ed8",
    accessory: "none",
    prop: "tangerine",
    expression: "smile",
  },
  {
    id: "usopp",
    name: "Usopp",
    skinColor: "#c68b50",
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
    hairColor: "#f2cd60", // Blond chaud, lisible sur les petites mèches
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
    shirtColor: "#b97739", // Fourrure, petit sac de médecin
    pantsColor: "#ed8d2c", // Short orange
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
    shirtColor: "#24549a", // Boléro bleu à fermeture dorée
    pantsColor: "#de83af", // Jupe rose
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
    pantsColor: "#1956a0", // Slip bleu et jambes nues de cyborg
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
    shirtColor: "#f8cb9c", // Torse découvert & collier de perles
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
  {
    id: "doflamingo",
    name: "Donquixote Doflamingo",
    skinColor: "#f3ca9f", hairColor: "#f6d657", hairStyle: "crop",
    shirtColor: "#edc461", pantsColor: "#f4f1ed",
    accessory: "sunglasses", accessoryColor: "#c52659", accessorySubColor: "#f38bb9",
    expression: "grin",
  },
  {
    id: "boa_hancock",
    name: "Boa Hancock",
    skinColor: "#f8d5ba", hairColor: "#15151c", hairStyle: "flowing",
    shirtColor: "#b52c40", pantsColor: "#b52c40",
    accessory: "earrings", accessoryColor: "#f7ca52",
    expression: "smile",
  },
  {
    id: "vivi",
    name: "Nefertari Vivi",
    skinColor: "#f8d8bc", hairColor: "#51afdf", hairStyle: "flowing",
    shirtColor: "#ee98af", pantsColor: "#f1e8dc",
    accessory: "none", accessoryColor: "#deba48",
    expression: "smile",
  },
  {
    id: "mihawk",
    name: "Dracule Mihawk",
    skinColor: "#e8be9b", hairColor: "#151719", hairStyle: "crop",
    shirtColor: "#351e2b", pantsColor: "#29242c",
    accessory: "cowboy_hat", accessoryColor: "#17151b", accessorySubColor: "#8f233b",
    expression: "stoic",
  },
];
