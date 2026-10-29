import { THEORY_VIDEO_URL, THEORY_VIDEO_EMBED_URL, THEORY_VIDEO_THUMBNAIL_URL, THEORY_VIDEO_UPLOAD_DATE } from "@/lib/theory-video";

/**
 * Données structurées de l’accueil ; la présence de balisage ne garantit pas
 * un résultat enrichi.
 */

export const SITE_URL = "https://lesfousdubus.sbs";
/** Dernière modification significative des pages et de leurs métadonnées. */
export const SITE_UPDATED_AT = "2026-10-29T16:04:48Z";
export const SITE_NAME = "Les Fous du Bus — La Théorie One Piece";
export const THEORY_TITLE = "La Théorie des Fous du Bus — Le Siècle Oublié est le Présent";
export const THEORY_DESCRIPTION =
  "Découvre la théorie One Piece du Mont Corvo : le Siècle Oublié serait le présent, Joy Boy serait Luffy et Laugh Tale se situerait dans le futur.";

export const SOCIAL_IMAGE = {
  url: `${SITE_URL}/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: THEORY_TITLE,
  type: "image/jpeg",
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
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

export const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "@id": `${SITE_URL}/#theory-video`,
  url: THEORY_VIDEO_URL,
  name: "La théorie One Piece qui explique tout. (Théorie des fous du bus)",
  description:
    "La théorie des Fous du Bus expliquée par le Mont Corvo : le Siècle Oublié serait le présent de One Piece, Laugh Tale serait Roadstar à une autre époque et Joy Boy serait Luffy.",
  thumbnailUrl: [
    THEORY_VIDEO_THUMBNAIL_URL,
    `${SITE_URL}/og-image.jpg`,
  ],
  uploadDate: THEORY_VIDEO_UPLOAD_DATE,
  embedUrl: THEORY_VIDEO_EMBED_URL,
  creator: {
    "@type": "Organization",
    name: "Mont Corvo",
    url: "https://www.youtube.com/@MontCorvo",
  },
  publisher: {
    "@type": "Organization",
    name: "Mont Corvo",
    url: "https://www.youtube.com/@MontCorvo",
  },
  inLanguage: "fr-FR",
};
