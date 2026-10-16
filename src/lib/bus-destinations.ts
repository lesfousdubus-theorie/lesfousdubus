/** Les 28 étapes choisies pour la girouette du Grand Line Express. */
export const GRAND_LINE_STOPS = [
  "Shells Town", "Orange Town", "Île de Gaimon", "Syrup Village", "Baratie",
  "Arlong Park", "Loguetown", "Cactus Island", "Little Garden", "Drum Island",
  "Alabasta", "Jaya", "Skypiea", "Long Ring Long Land", "Water 7", "Enies Lobby",
  "Thriller Bark", "Archipel Sabaody", "Île des Hommes-Poissons", "Punk Hazard",
  "Dressrosa", "Zou", "Whole Cake Island", "Wano", "Egghead", "Elbaf",
  "Lodestar", "Laugh Tale",
] as const;

// Police bitmap 5×7 : chaque bit représente une LED, sans texte lissé.
const FONT: Record<string, number[]> = {
  A: [14,17,17,31,17,17,17], B: [30,17,17,30,17,17,30], C: [14,17,16,16,16,17,14],
  D: [30,17,17,17,17,17,30], E: [31,16,16,30,16,16,31], F: [31,16,16,30,16,16,16],
  G: [14,17,16,23,17,17,15], H: [17,17,17,31,17,17,17], I: [14,4,4,4,4,4,14],
  J: [7,2,2,2,18,18,12], K: [17,18,20,24,20,18,17], L: [16,16,16,16,16,16,31],
  M: [17,27,21,21,17,17,17], N: [17,25,21,19,17,17,17], O: [14,17,17,17,17,17,14],
  P: [30,17,17,30,16,16,16], Q: [14,17,17,17,21,18,13], R: [30,17,17,30,20,18,17],
  S: [15,16,16,14,1,1,30], T: [31,4,4,4,4,4,4], U: [17,17,17,17,17,17,14],
  V: [17,17,17,17,17,10,4], W: [17,17,17,21,21,21,10], X: [17,17,10,4,10,17,17],
  Y: [17,17,10,4,4,4,4], Z: [31,1,2,4,8,16,31],
  "7": [31,1,2,4,8,8,8],
  " ": [0,0,0,0,0,0,0], "-": [0,0,0,31,0,0,0], ">": [16,8,4,2,4,8,16],
  "'": [4,4,8,0,0,0,0], "(": [2,4,8,8,8,4,2], ")": [8,4,2,2,2,4,8],
};

export const LED_COLUMNS = 72;
export const LED_ROWS = 9;
export const LED_COLUMNS_PER_SECOND = 18;
export const DESTINATION_MESSAGE = `GRAND LINE > ${GRAND_LINE_STOPS.join(" > ")}    `;

export function encodeLedText(text: string): Uint8Array {
  const columns: number[] = [];
  for (const character of text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()) {
    const rows = FONT[character];
    if (!rows) throw new Error(`Unsupported LED character: ${character}`);
    for (let x = 0; x < 5; x++) {
      let column = 0;
      for (let y = 0; y < 7; y++) if (rows[y] & (1 << (4 - x))) column |= 1 << (y + 1);
      columns.push(column);
    }
    columns.push(0);
  }
  return Uint8Array.from(columns);
}

export function getRandomDestinationStart(random: () => number = Math.random): number {
  return Math.floor(random() * GRAND_LINE_STOPS.length);
}

/** Commencer au premier caractère d'une étape, puis conserver l'ordre de la boucle. */
export function getDestinationStartOffset(index: number): number {
  const stop = GRAND_LINE_STOPS[index];
  if (!stop) throw new RangeError("Invalid destination index");
  return encodeLedText(DESTINATION_MESSAGE.slice(0, DESTINATION_MESSAGE.indexOf(stop))).length;
}

export function getLedOffset(seconds: number, messageWidth: number, startOffset = 0): number {
  return (startOffset + Math.floor(Math.max(0, seconds) * LED_COLUMNS_PER_SECOND)) % messageWidth;
}
