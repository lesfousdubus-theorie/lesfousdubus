/**
 * Nettoie un texte saisi par un visiteur : retire les caractères de contrôle,
 * condense les espaces puis tronque par caractères Unicode (et non par unités
 * UTF-16) pour ne jamais couper un emoji en deux.
 */
export function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(normalized).slice(0, maxLength).join("");
}
