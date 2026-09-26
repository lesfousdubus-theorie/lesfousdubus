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
