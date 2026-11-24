export type Locale = "fr" | "en";

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_STORAGE_KEY = "fdb-locale";

export const SITE_PAGE_TITLE: Record<Locale, string> = {
  fr: "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent | One Piece",
  en: "The Bus Fools Theory — The Void Century is the Present | One Piece",
};

export function pickLocale<T>(locale: Locale, fr: T, en: T): T {
  return locale === "en" ? en : fr;
}

export function formatOrdinalRank(n: number, locale: Locale): string {
  if (locale === "en") {
    const mod100 = n % 100;
    const suffix = mod100 >= 11 && mod100 <= 13
      ? "th"
      : n % 10 === 1
        ? "st"
        : n % 10 === 2
          ? "nd"
          : n % 10 === 3
            ? "rd"
            : "th";
    return `${n.toLocaleString("en-US")}${suffix}`;
  }
  return n === 1 ? "1re" : `${n.toLocaleString("fr-FR")}e`;
}

const KNOWN_SERVER_ERRORS_EN: Record<string, string> = {
  "Les liens et adresses e-mail ne sont pas autorisés dans le bus.":
    "Links and e-mail addresses are not allowed on the bus.",
  "Ce texte contient un terme non autorisé. Reformule-le pour rejoindre les autres nakamas.":
    "This text contains a disallowed term. Please rephrase it to join the crew.",
  "Le serveur ne répond pas pour le moment.":
    "The server is unavailable right now.",
  "Réponse du serveur invalide.":
    "Invalid server response.",
  "Trop de demandes ont été envoyées. Réessaie un peu plus tard.":
    "Too many requests sent. Please try again shortly.",
  "Le corps de la requête doit être au format JSON.":
    "Request body must be JSON.",
  "Corps de requête invalide.":
    "Invalid request body.",
  "Action de modération non autorisée.":
    "Unauthorized moderation action.",
  "Impossible de quitter définitivement le bus pour le moment.":
    "Unable to permanently leave the bus right now.",
  "Passager invalide.":
    "Invalid passenger.",
  "Passager introuvable.":
    "Passenger not found.",
  "Identifiant visiteur invalide.":
    "Invalid visitor identifier.",
  "Liste de places invalide.":
    "Invalid seat list.",
  "Le compteur des passagers est temporairement indisponible.":
    "The passenger counter is temporarily unavailable.",
  "Profil invalide.":
    "Invalid profile.",
  "Impossible d'enregistrer ce passager pour le moment.":
    "Unable to register this passenger right now.",
  "Le personnage choisi n’a pas pu être enregistré.":
    "The chosen character could not be saved.",
  "Le personnage choisi n’a pas été enregistré.":
    "The chosen character was not saved.",
  "Le personnage n’a pas été enregistré. Réessaie.":
    "The character was not saved. Please try again.",
  "Choisis un nom avant de monter dans le bus.":
    "Choose a name before boarding the bus.",
  "Choisis un nom à afficher au-dessus de ton personnage.":
    "Choose a name to display above your character.",
  "Choisis un nom différent d’Anonyme.":
    "Please choose a name other than Anonymous.",
  "Ce nom est déjà pris par un autre passager. Choisis-en un autre.":
    "This name is already taken by another passenger. Please choose another one.",
};

export function localizeServerError(message: string, locale: Locale): string {
  if (locale !== "en") return message;
  return KNOWN_SERVER_ERRORS_EN[message] ?? message;
}

export function formatPassengerDisplayName(name: string | null | undefined, locale: Locale): string {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.toLowerCase() === "anonyme") {
    return pickLocale(locale, "Anonyme", "Anonymous");
  }
  return trimmed;
}
