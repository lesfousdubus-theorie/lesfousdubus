/**
 * Nettoie un texte saisi par un visiteur : retire les caractères de contrôle,
 * condense les espaces puis tronque par caractères Unicode (et non par unités
 * UTF-16) pour ne jamais couper un emoji en deux.
 */
export function cleanText(value: unknown, maxLength: number, multiline = false) {
  if (typeof value !== "string") return "";
  if (!multiline) {
    const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
    return Array.from(normalized).slice(0, maxLength).join("");
  }
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/[^\S\n]*\n[^\S\n]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return Array.from(normalized).slice(0, maxLength).join("");
}
