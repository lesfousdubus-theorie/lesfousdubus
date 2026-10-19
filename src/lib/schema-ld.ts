import { THEORY_VIDEO_URL, THEORY_VIDEO_EMBED_URL, THEORY_VIDEO_THUMBNAIL_URL } from "@/lib/theory-video";
import { THEORY_FAQ } from "@/lib/theory-data";

/**
 * Données structurées Schema.org (JSON-LD) pour le site officiel de la Théorie des Fous du Bus.
 * Conforme aux spécifications Google Rich Results.
 */

export const SITE_URL = "https://lesfousdubus.sbs";
export const SITE_NAME = "Les Fous du Bus — La Théorie One Piece";
export const THEORY_TITLE = "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent";
export const THEORY_DESCRIPTION =
  "La théorie One Piece des Fous du Bus : le Siècle Oublié serait le présent, Laugh Tale se situerait dans le futur, Joy Boy serait Monkey D. Luffy, les Ponéglyphes porteraient la mémoire de l'avenir et Barbe Noire deviendrait Davy D. Jones.";

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
  datePublished: "2024-05-26T00:00:00+02:00",
  dateModified: "2026-10-19T16:40:00+02:00",
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
  ],
};

export const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "La théorie One Piece qui explique tout. (Théorie des fous du bus)",
  description:
    "La théorie des Fous du Bus expliquée par le Mont Corvo : le Siècle Oublié serait le présent de One Piece, Laugh Tale serait Roadstar à une autre époque et Joy Boy serait Luffy.",
  thumbnailUrl: [
    THEORY_VIDEO_THUMBNAIL_URL,
    `${SITE_URL}/og-image.jpg`,
  ],
  uploadDate: "2026-04-10",
  contentUrl: THEORY_VIDEO_URL,
  embedUrl: THEORY_VIDEO_EMBED_URL,
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
  mainEntity: THEORY_FAQ.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};
