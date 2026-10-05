/**
 * Filtre de premier niveau pour les pseudos et commentaires publics.
 * Il bloque les liens, adresses e-mail et insultes courantes, mais ne remplace
 * pas le signalement : les cas ambigus sont traités par la modération humaine.
 */

export type ModerationIssue = "link" | "language";

// Le point doit coller au domaine : « Trop bien. De plus » reste autorisé.
const LINK_PATTERN = new RegExp(
  [
    String.raw`https?:\/\/`,
    String.raw`www\.`,
    String.raw`[a-z0-9-]+\.(?:com|net|org|info|biz|fr|be|ch|ca|de|uk|us|ru|cn|io|gg|ly|me|tv|cc|co|to|ws|xyz|top|club|site|online|shop|store|link|click|app|dev|sbs|tk|ml|ga|cf|gq)\b`,
    String.raw`[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}`,
  ].join("|"),
  "i",
);

/** Mots courts : comparés uniquement en mot entier pour éviter les faux positifs. */
const BLOCKED_WORDS = new Set([
  "pute", "putes", "nique", "niquer", "niquez", "ntm", "fdp", "kys", "nazi", "nazis",
  "negro", "negre", "nigger", "nigga", "fuck", "fucker", "bitch", "slut", "whore",
]);

/** Radicaux longs et spécifiques, cherchés à l'intérieur des mots. */
const BLOCKED_FRAGMENTS = [
  "connard", "connasse", "salope", "salaud", "encule", "putain", "pedophile",
  "hitler", "faggot", "motherfucker", "tarlouze",
].map(collapseRepeats);

function collapseRepeats(value: string) {
  return value.replace(/(.)\1+/g, "$1");
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

export function findModerationIssue(text: string): ModerationIssue | null {
  if (!text) return null;
  if (LINK_PATTERN.test(text)) return "link";

  const normalized = normalize(text);
  const words = normalized.split(/[^a-z]+/).filter(Boolean);
  if (words.some((word) => BLOCKED_WORDS.has(word))) return "language";

  const collapsedWords = words.map(collapseRepeats);
  if (collapsedWords.some((word) => BLOCKED_FRAGMENTS.some((fragment) => word.includes(fragment)))) {
    return "language";
  }
  // Détecte aussi les mots séparés par des espaces ou des points (« c.o.n.n.a.r.d »).
  const joined = collapseRepeats(normalized.replace(/[^a-z]/g, ""));
  if (BLOCKED_FRAGMENTS.some((fragment) => fragment.length >= 6 && joined.includes(fragment))) {
    return "language";
  }
  return null;
}

export const MODERATION_MESSAGES: Record<ModerationIssue, string> = {
  link: "Les liens et adresses e-mail ne sont pas autorisés dans le bus.",
  language: "Ce texte contient un terme non autorisé. Reformule-le pour rejoindre les autres nakamas.",
};
