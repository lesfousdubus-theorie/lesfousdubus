/**
 * Données structurées Schema.org (JSON-LD) pour le site officiel de la Théorie des Fous du Bus.
 * Conforme aux spécifications Google Rich Results.
 */

export const SITE_URL = "https://lesfousdubus.sbs";
export const SITE_NAME = "Les Fous du Bus — La Théorie One Piece";
export const THEORY_TITLE = "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent";
export const THEORY_DESCRIPTION =
  "La théorie One Piece ultime des Fous du Bus : Le Siècle Oublié n'a jamais eu lieu dans le passé, il se produit en direct depuis le chapitre 1. Laugh Tale est dans le futur, Joy Boy est Monkey D. Luffy, les Ponéglyphes sont la mémoire de l'avenir, et Davy Jones est Barbe Noire.";

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: [
    "Théorie des Fous du Bus",
    "Le Siècle Oublié est le Présent",
    "Les Fous du Bus",
    "Théorie One Piece Fous du Bus",
  ],
  url: SITE_URL,
  inLanguage: "fr-FR",
  description: THEORY_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Les Fous du Bus",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
  },
};

export const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: THEORY_TITLE,
  description: THEORY_DESCRIPTION,
  image: [`${SITE_URL}/og-image.jpg`, `${SITE_URL}/logo.png`],
  datePublished: "2024-01-01T00:00:00+01:00",
  dateModified: new Date().toISOString(),
  inLanguage: "fr-FR",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": SITE_URL,
  },
  author: {
    "@type": "Organization",
    name: "Les Fous du Bus",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "Les Fous du Bus",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
  },
  about: [
    { "@type": "Thing", name: "One Piece" },
    { "@type": "Person", name: "Eiichiro Oda" },
    { "@type": "Thing", name: "Joy Boy" },
    { "@type": "Thing", name: "Siècle Oublié" },
    { "@type": "Thing", name: "Laugh Tale" },
    { "@type": "Thing", name: "Ponéglyphes" },
    { "@type": "Thing", name: "All Blue" },
  ],
};

export const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "LA THÉORIE ULTIME DE ONE PIECE : LE SIÈCLE OUBLIÉ EST LE PRÉSENT",
  description:
    "Explication et démonstration vidéo complète de la théorie des Fous du Bus : comment le Siècle Oublié est en réalité le présent de One Piece, pourquoi Roger est arrivé trop tôt de 25 ans et pourquoi Joy Boy est Luffy.",
  thumbnailUrl: [
    "https://img.youtube.com/vi/SgJ25zjMJyo/maxresdefault.jpg",
    `${SITE_URL}/og-image.jpg`,
  ],
  uploadDate: "2024-01-01T12:00:00+01:00",
  contentUrl: "https://www.youtube.com/watch?v=SgJ25zjMJyo",
  embedUrl: "https://www.youtube-nocookie.com/embed/SgJ25zjMJyo",
  publisher: {
    "@type": "Organization",
    name: "Les Fous du Bus",
    url: SITE_URL,
  },
  inLanguage: "fr-FR",
};

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Qu'est-ce que la Théorie des Fous du Bus sur One Piece ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "La Théorie des Fous du Bus est une thèse globale sur l'œuvre d'Eiichiro Oda démontrant que le Siècle Oublié n'a jamais eu lieu dans le passé il y a 800 ans, mais qu'il se déroule en direct dans le manga depuis le chapitre 1. Les éléments historiques et les prophéties sont en réalité des fragments de mémoire envoyés depuis le futur.",
      },
    },
    {
      "@type": "Question",
      name: "Pourquoi Gol D. Roger est-il arrivé 'trop tôt' de 25 ans à Laugh Tale ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Selon la théorie, Laugh Tale n'est pas une île cachée dans l'espace mais un point précis dans le temps. C'est Lodestar dans le futur. Roger et son équipage sont arrivés au bon endroit mais 25 ans trop tôt, car Joy Boy (Monkey D. Luffy) n'était pas encore né pour accomplir le serment.",
      },
    },
    {
      "@type": "Question",
      name: "Pourquoi les Ponéglyphes sont-ils indestructibles ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Les Ponéglyphes sont 'la mémoire de l'avenir'. Ils sont inviolables et indestructibles depuis 800 ans car ils ont été taillés dans un matériau et avec une technologie qui n'existent pas encore à cette époque. Ils ont été rédigés par Nico Robin, taillés par le clan Kozuki (Momonosuke) et envoyés dans le passé par Nefertari Lili / Vivi.",
      },
    },
    {
      "@type": "Question",
      name: "Qui est véritablement Joy Boy selon la théorie ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Joy Boy n'a jamais existé il y a 800 ans : Joy Boy est le nom de règne que l'histoire donnera à Monkey D. Luffy après la libération des peuples et l'effondrement du Gouvernement Mondial. Nika est son nom divin et Luffy son nom de naissance.",
      },
    },
    {
      "@type": "Question",
      name: "Quel est le lien entre Barbe Noire (Marshall D. Teach) et Davy Jones ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Davy Jones n'est pas un ancêtre mythologique mais le titre historique maudit que le monde et Imu donneront à Marshall D. Teach après sa tentative d'usurpation du Trône Vacant.",
      },
    },
    {
      "@type": "Question",
      name: "Comment naîtra All Blue selon la théorie ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All Blue n'existe pas encore. Il sera créé lors de la guerre finale par la destruction de Red Line grâce aux Armes Antiques, réunissant North Blue, South Blue, East Blue et West Blue en un océan unique et sans barrières.",
      },
    },
  ],
};
